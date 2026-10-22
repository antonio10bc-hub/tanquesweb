import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LEVELS, THEMES, SURVIVAL, GOLD_SPARKS, getDef } from '../content/index.js';
import { RetroRenderer } from '../render/RetroRenderer.js';
import { CameraRig } from '../render/CameraRig.js';
import { Particles } from '../render/Particles.js';
import { Shockwaves } from '../render/Shockwaves.js';
import { Markers } from '../render/Markers.js';
import { PickupView } from '../render/PickupView.js';
import { NukeView } from '../render/NukeView.js';
import { BulletSystem, FIRE as FLAMES } from '../world/Bullets.js';
import { World } from '../world/World.js';
import { EventBus } from './EventBus.js';
import { Music } from './Music.js';
import { ReplayRecorder } from './Replay.js';
import { Settings } from './Settings.js';
import { Profile } from './Profile.js';
import { vibrate } from './Haptics.js';
import { approach, clamp, pick } from './math.js';

const CONFETTI = [0xffe03a, 0x23e0d6, 0xff3e8e, 0xb6ff5c, 0x7b5cff, 0xffffff];
const FIRE = [0xffe03a, 0xff9a1f, 0xffffff, 0xff3e3e];
const SPARKS = [0xff4fd8, 0xffffff, 0xffb3f0];
const TURBO = [0x00e5ff, 0xffffff, 0x8af6ff];
const NUKE = [0xffe600, 0x1b0b33, 0xffffff];
const REPLAY = { length: 2.2, speed: 0.45 };

// Orquesta todo: bucle, estados de partida, cámara, efectos, música y HUD.
// Estados: menu -> intro -> play -> outro -> replay -> end -> (intro...)
// Cada partida elige un arquetipo (content/levels.js) y uno de sus temas visuales.
export class Game {
    constructor({ canvas, hud, input, sfx }) {
        this.hud = hud;
        this.input = input;
        this.sfx = sfx;
        this.music = new Music(sfx);
        this.events = new EventBus();
        this.renderer = new RetroRenderer(canvas, CONFIG.render);
        this.scene = new THREE.Scene();
        this.rig = new CameraRig(CONFIG.camera);
        this.particles = new Particles(this.scene, 900);
        this.waves = new Shockwaves(this.scene);
        this.markers = new Markers(this.scene);
        this.pickupView = new PickupView(this.scene);
        this.nukeView = new NukeView(this.scene);
        this.bullets = new BulletSystem(this.scene, this.events, this.particles);
        this.recorder = new ReplayRecorder(3);

        this.sun = new THREE.DirectionalLight(0xffffff, 2);
        this.sun.position.set(-4, 10, 6);
        this.hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
        this.scene.add(this.sun, this.hemi);

        this.world = null;
        this.levelId = null;
        this.state = 'boot';
        this.stateTime = 0;
        this.time = 0;
        this.timeScale = 1;
        this.hitStop = 0;
        this.countdown = 0;
        this.result = false;
        this.paused = false;
        this.mode = 'quick';   // 'quick' (partida rápida) | 'survival'
        this.endToken = 0;     // invalida la ceremonia de la moneda si empieza otra partida
        this.dropping = [];    // enemigos de oleada cayendo del cielo

        Settings.load();
        this.applySettings();
        // Si la partida empezó antes de que el navegador dejara sonar el audio, la música
        // arranca en cuanto lo permite (antes había que apagarla y encenderla a mano).
        sfx.onStateChange = (state) => {
            if (state === 'running' && Settings.music && !this.music.playing && (this.state === 'intro' || this.state === 'play')) this.startMusic();
        };

        this.renderer.onResize = (w, h) => this.rig.resize(w / h);
        this.renderer.resize();
        this.bindEvents();
        this.bindUi();

        this.last = performance.now();
        this.frame = this.frame.bind(this);
        requestAnimationFrame(this.frame);
    }

    bindUi() {
        const hud = this.hud;
        hud.onPause = () => this.pause();
        hud.onResume = () => this.resume();
        hud.onQuit = () => {
            this.resume(true);
            this.music.stop();
            this.showMenu();
        };
        hud.settingsSource = Settings;
        hud.syncToggles(Settings);
        hud.onToggle = (key) => {
            Settings.toggle(key);
            this.applySettings();
            hud.syncToggles(Settings);
            if (key === 'vibration' && Settings.vibration) vibrate('pickup');
            this.sfx.unlock();
            this.sfx.play('ui');
        };
        this.input.onMove = () => hud.showHint(false);

        window.addEventListener('keydown', (e) => {
            if ((e.code === 'Enter' || e.code === 'Space') && (this.state === 'menu' || this.state === 'end')) {
                e.preventDefault();
                this.sfx.unlock();
                if (this.state === 'menu') this.startMatch(this.levelId, undefined, this.themeId);
                else this.again();
            } else if (e.code === 'Escape' || e.code === 'KeyP') {
                if (this.paused) this.resume();
                else this.pause();
            }
        });
        document.addEventListener('visibilitychange', () => document.hidden && this.pause());
        // Toca durante la repetición para saltarla
        window.addEventListener('pointerdown', () => {
            if (this.state === 'replay' && this.stateTime > 0.4) this.showEnd();
        });
    }

    applySettings() {
        this.sfx.enabled = Settings.sfx;
        this.music.enabled = Settings.music;
        if (!Settings.music) this.music.stop(0.2);
        else if (!this.music.playing && this.world && (this.state === 'intro' || this.state === 'play')) this.startMusic();
    }

    // ---------- Flujo ----------
    randomLevel() {
        const all = Object.keys(LEVELS).filter((id) => !LEVELS[id].survival);
        const ids = all.filter((id) => id !== this.levelId);
        return pick(ids.length ? ids : all);
    }

    // seed / themeId: opcionales, para repetir un mapa concreto (game.world.seed, game.themeId).
    load(levelId = this.randomLevel(), seed, themeId) {
        if (this.world) this.world.dispose();
        this.bullets.clear();
        this.particles.clear();
        this.waves.clear();
        this.markers.clear();
        this.nukeView.clear();

        const def = getDef(LEVELS, levelId, 'nivel');
        this.themeId = themeId || pick(def.themes || [def.theme]);
        const theme = getDef(THEMES, this.themeId, 'tema');
        this.theme = theme;
        this.def = def;
        this.scene.background = new THREE.Color(theme.sea);
        this.sun.color.setHex(theme.light.sun);
        this.sun.intensity = theme.light.sunIntensity;
        this.hemi.color.setHex(theme.light.sky);
        this.hemi.groundColor.setHex(theme.light.ground);
        this.hemi.intensity = theme.light.hemiIntensity;
        this.bullets.setOutline(theme.outline);

        this.world = new World(def, theme, { events: this.events, bullets: this.bullets, input: this.input, seed, skin: Profile.data.skin });
        this.scene.add(this.world.root);
        this.levelId = levelId;
        this.rig.setBounds(this.world.arena.cols, this.world.arena.rows);
        this.recorder.reset();

        const enemy = this.world.enemies()[0];
        this.hud.setNames(this.world.player.def.name, enemy ? enemy.def.name : '');
    }

    showMenu(levelId) {
        this.load(levelId);
        this.setState('menu');
        this.world.forceReveal = true;
        this.input.setEnabled(false);
        this.hud.screen('menu');
        this.hud.showReplay(false);
        this.hud.ready();
        this.rig.zoomTarget = 1.15;
        this.rig.focus(this.world.arena.cols / 2, this.world.arena.rows / 2);
        this.rig.snap();
    }

    // "Otra vez": repite el modo de la última partida.
    again() {
        if (this.mode === 'survival') this.startSurvival();
        else this.startMatch();
    }

    startSurvival(seed, themeId) {
        this.startMatch('supervivencia', seed, themeId);
    }

    startMatch(levelId, seed, themeId) {
        this.endToken++;
        this.load(levelId, seed, themeId);
        this.mode = this.def.survival ? 'survival' : 'quick';
        this.wave = 1;
        this.waveSize = this.world.enemies().length;
        this.waveClear = false;
        this.dropping = [];
        this.runCoins = 0;
        this.newRecord = false;
        if (this.mode === 'survival') this.hud.setNames(this.world.player.def.name, 'OLEADA 1');
        this.events.emit('matchStart', this.mode);
        this.setState('intro');
        this.fallen = null;
        this.timeScale = 1;
        this.countdown = 0;
        this.world.forceReveal = true;
        for (const t of this.world.tanks) t.model.dropY = 9;
        this.input.setEnabled(false, true);
        this.hud.screen('play');
        this.hud.showReplay(false);
        this.hud.showHint(true);
        this.hud.stage(this.def.name, `${this.theme.name} · ${this.def.tagline}`);
        this.rig.zoomTarget = 1.6;
        this.rig.yawTarget = 0.7;
        this.rig.focus(this.world.player.x, this.world.player.z);
        this.rig.snap();
        this.rig.zoomTarget = 1;
        this.rig.yawTarget = 0;
        this.startMusic();
    }

    startMusic() {
        this.music.intensity = 0;
        this.music.start(this.theme.music, (this.world.seed || 1) ^ this.levelId.length);
    }

    setState(s) {
        this.state = s;
        this.stateTime = 0;
    }

    pause() {
        if (this.paused || (this.state !== 'play' && this.state !== 'intro')) return;
        this.paused = true;
        this.input.setEnabled(false);
        this.hud.showPause(true, Settings);
        this.sfx.play('pause');
        this.sfx.hold(true);
    }

    resume(silent) {
        if (!this.paused) return;
        this.paused = false;
        this.hud.showPause(false);
        this.sfx.hold(false);
        if (!silent) this.input.setEnabled(this.state === 'play', true);
        this.last = performance.now();
    }

    endMatch(win) {
        // El impacto final puede caer entre dos fotogramas de la grabación: se graba siempre,
        // si no la repetición acabaría justo antes de que la bala llegue y sin explosión.
        this.recorder.record(0, this.world, this.bullets, true);
        this.result = win;
        this.setState('outro');
        this.timeScale = CONFIG.match.slowmo;
        this.input.setEnabled(false);
        this.music.stop(1);
    }

    // Tras la cámara lenta, la repetición del golpe final (si hay grabación).
    startReplay() {
        if (this.recorder.duration < 0.5) return this.showEnd();
        this.setState('replay');
        this.timeScale = 1;
        this.hud.showReplay(true);
        this.particles.clear();
        this.replayLen = Math.min(REPLAY.length, this.recorder.duration);
        this.replayFrom = this.recorder.duration - this.replayLen;
        this.replayAlive = this.world.tanks.map(() => true);
        this.replayNukes = new Map();
    }

    updateReplay() {
        const t = Math.min(this.stateTime * REPLAY.speed, this.replayLen);
        this.recorder.apply(this.replayFrom + t, this.world, this.bullets);
        const live = new Set(this.world.nukes.map((n) => n.id));
        for (const [id, n] of this.replayNukes) if (!live.has(id)) { this.nukeFx(n, false); this.replayNukes.delete(id); }
        for (const n of this.world.nukes) this.replayNukes.set(n.id, n);
        this.world.tanks.forEach((tank, i) => {
            if (this.replayAlive[i] && !tank.alive) this.deathFx(tank, false);
            this.replayAlive[i] = tank.alive;
        });
        // Se queda un poco más tras el golpe para ver la explosión entera
        if (this.stateTime * REPLAY.speed > this.replayLen + 0.8) this.showEnd();
    }

    showEnd() {
        const win = this.result;
        this.setState('end');
        this.timeScale = 1;
        this.hud.showReplay(false);
        this.hud.showHint(false);
        this.bullets.clear();
        this.world.nukes.length = 0;
        this.world.forceReveal = true;
        for (const t of this.world.tanks) t.alive = t.hp > 0;
        const p = this.world.player;
        const st = Profile.data.stats;
        if (this.mode === 'survival') {
            const reached = this.wave - (this.waveClear ? 0 : 1);
            const sub = this.newRecord ? '¡NUEVO RÉCORD!' : `RÉCORD: ${st.bestWave} OLEADAS`;
            const coins = this.runCoins ? ` · +${this.runCoins} MONEDA${this.runCoins > 1 ? 'S' : ''}` : '';
            this.hud.showEnd(false, sub + coins, `${reached} OLEADA${reached === 1 ? '' : 'S'}`);
        } else {
            st.streak = win ? st.streak + 1 : 0;
            if (win) st.wins++;
            Profile.save();
            if (win) {
                // Primero la ceremonia de la moneda y, después, con calma, el menú final
                const before = Profile.coins, token = ++this.endToken;
                Profile.addCoins(1);
                this.events.emit('coin', Profile.coins);
                this.sfx.play('coin');
                this.hud.coinReward(before, Profile.coins, {
                    onFly: () => this.sfx.play('itemSpawn'),
                    onLand: () => this.sfx.play('reloaded'),
                }).then(() => {
                    if (this.endToken === token && this.state === 'end') this.hud.showEnd(true, '');
                });
            } else {
                this.hud.showEnd(false, '¡A LA PRÓXIMA!');
            }
        }
        this.events.emit('matchEnd', { win, mode: this.mode, wave: this.wave });
        this.sfx.play(win ? 'win' : 'lose');
        if (win) this.particles.burst(p.x, 0.8, p.z, 90, CONFETTI, { speed: 4, up: 9, size: 0.14, ttl: 2.4, grav: 9 });
    }

    // ---------- Bucle ----------
    frame(now) {
        requestAnimationFrame(this.frame);
        const dt = Math.min((now - this.last) / 1000, CONFIG.sim.maxFrame);
        this.last = now;
        if (!this.world) return;
        if (this.paused) {
            this.renderer.render(this.scene, this.rig.camera, 0);
            return;
        }
        this.time += dt;
        let simDt = dt * this.timeScale;
        if (this.hitStop > 0) {
            this.hitStop -= dt;
            simDt = 0;
        }
        this.update(dt, simDt);
        this.draw(dt, simDt);
    }

    stepWorld(simDt, tanksActive) {
        const max = CONFIG.sim.maxStep;
        let left = simDt;
        while (left > 1e-6) {
            const h = Math.min(max, left);
            this.world.step(h, tanksActive);
            left -= h;
        }
    }

    update(dt, simDt) {
        const w = this.world;
        this.stateTime += dt;
        this.input.update();

        switch (this.state) {
            case 'intro':
                this.updateIntro();
                break;
            case 'play':
                this.stepWorld(simDt, true);
                this.recorder.record(simDt, w, this.bullets);
                this.updateDrops(dt);
                if (!w.player.alive) this.endMatch(false);
                else if (this.mode === 'survival') this.updateSurvival(dt);
                else if (w.aliveEnemies() === 0) this.endMatch(true);
                break;
            case 'outro':
                this.stepWorld(simDt, false);
                if (this.stateTime >= CONFIG.match.slowmoTime) this.startReplay();
                break;
            case 'replay':
                this.updateReplay();
                break;
            case 'end':
                this.stepWorld(simDt, false);
                break;
        }

        const p = w.player, e = w.enemies()[0];
        this.hud.setHp('p', p.hp, p.maxHp);
        // Supervivencia: el panel del rival cuenta los enemigos que quedan en la oleada
        if (this.mode === 'survival') this.hud.setHp('e', w.aliveEnemies(), this.waveSize);
        else if (e) this.hud.setHp('e', e.hp, e.maxHp);
        let stealth = 'hidden';
        if (w.forceReveal || p.exposed) stealth = 'visible';
        else if (p.cloak > 0) stealth = 'cloak';
        else if (p.inBush) stealth = 'bush';
        this.hud.setStealth(stealth);
        this.music.intensity = this.state === 'play' ? (p.hp <= 2 ? 1 : p.hp <= 3 ? 0.5 : 0) : 0;
    }

    // ---------- Supervivencia ----------
    updateSurvival(dt) {
        const w = this.world;
        if (!this.waveClear) {
            if (w.aliveEnemies() > 0 || this.dropping.length) return;
            // Oleada superada: respiro, curación y, cada pocas oleadas, una moneda
            this.waveClear = true;
            this.waveTimer = SURVIVAL.pause;
            this.hud.banner(`¡OLEADA ${this.wave}!`, 'go');
            this.sfx.play('win');
            const p = w.player;
            const healed = Math.min(p.maxHp, p.hp + SURVIVAL.heal);
            if (healed > p.hp) {
                p.hp = healed;
                this.markers.sprinkle(p.x, p.z, '+', 0x17d65a, this.theme.outline, 10);
            }
            if (this.wave % SURVIVAL.coinEvery === 0) this.giveCoin();
            if (this.wave > Profile.data.stats.bestWave) {
                Profile.data.stats.bestWave = this.wave;
                this.newRecord = true;
                Profile.save();
            }
            this.events.emit('waveCleared', this.wave);
            return;
        }
        this.waveTimer -= dt;
        if (this.waveTimer > 0) return;
        this.waveClear = false;
        this.wave++;
        const specs = SURVIVAL.wave(this.wave);
        this.waveSize = specs.length;
        this.hud.setNames(w.player.def.name, `OLEADA ${this.wave}`);
        this.hud.banner(`OLEADA ${this.wave}`);
        this.sfx.play('go');
        specs.forEach((spec, i) => {
            const tank = w.spawn(spec, 'enemy', spec.brain, w.farSpot(SURVIVAL.minSpawnDist));
            tank.model.dropY = 9;
            tank.frozen = true;
            tank.reveal = 1.5; // al aterrizar se les ve un momento
            this.dropping.push({ tank, t: -i * 0.25 });
        });
    }

    // Los enemigos de oleada caen del cielo; hasta aterrizar no se mueven.
    updateDrops(dt) {
        for (let i = this.dropping.length - 1; i >= 0; i--) {
            const d = this.dropping[i];
            d.t += dt;
            const k = clamp(d.t / CONFIG.match.dropTime, 0, 1);
            d.tank.model.dropY = 9 * (1 - k) * (1 - k);
            d.tank.cooldown = Math.max(d.tank.cooldown, 0.6);
            if (k >= 1) {
                d.tank.frozen = false;
                this.landed(d.tank);
                this.dropping.splice(i, 1);
            }
        }
    }

    giveCoin() {
        Profile.addCoins(1);
        this.runCoins++;
        this.sfx.play('coin');
        this.hud.toast('+1 MONEDA DE ORO', 'coin');
        this.events.emit('coin', Profile.coins);
    }

    updateIntro() {
        const m = CONFIG.match;
        const t = this.stateTime;
        this.world.tanks.forEach((tank, i) => {
            const start = 0.25 + i * 0.25;
            const k = clamp((t - start) / m.dropTime, 0, 1);
            const was = tank.model.dropY;
            tank.model.dropY = 9 * (1 - k) * (1 - k);
            if (was > 0 && tank.model.dropY === 0) this.landed(tank);
        });

        const labels = ['3', '2', '1'];
        const step = Math.floor((t - m.countdownStart) / m.countdownStep);
        if (t >= m.countdownStart && step >= this.countdown) {
            if (step < labels.length) {
                this.hud.banner(labels[step]);
                this.sfx.play('tick');
                this.countdown = step + 1;
            } else {
                this.hud.banner('¡FUEGO!', 'go');
                this.sfx.play('go');
                // Durante la cuenta atrás os veis: cada uno arranca sabiendo dónde está el otro.
                this.world.updateIntel(0);
                this.world.forceReveal = false;
                this.input.setEnabled(true);
                this.setState('play');
            }
        }
    }

    landed(tank) {
        this.particles.burst(tank.x, 0.1, tank.z, 16, [this.theme.dust, 0xffffff], { speed: 3.5, up: 1.5, size: 0.16, ttl: 0.5, grav: 4 });
        this.waves.spawn(tank.x, tank.z, 0xffffff, 1.6, 0.35);
        this.rig.shake(0.35);
        this.sfx.play('drop', this.panOf(tank.x));
    }

    // ---------- Vista ----------
    draw(dt, simDt) {
        const w = this.world;
        w.arena.update(dt, this.time);
        this.syncTanks(dt);
        const item = this.state === 'replay' ? null : w.pickups && w.pickups.current;
        this.pickupView.sync(item, w.pickups && w.pickups.rules, this.time);
        this.nukeView.sync(w.nukes, this.time);
        // El objeto de la bala de fuego también echa llamas
        if (item && item.kind === 'power' && (this.itemFireT = (this.itemFireT || 0) - dt) <= 0) {
            this.itemFireT = 0.05;
            this.particles.spawn(item.x + (Math.random() - 0.5) * 0.2, 0.35, item.z + 0.15, 0, 1.4 + Math.random(), 0,
                0.07 + Math.random() * 0.07, 0.35, FLAMES[(Math.random() * FLAMES.length) | 0], -2);
        }
        this.weather(dt);
        const fxDt = this.state === 'replay' ? dt * REPLAY.speed : simDt;
        this.particles.update(fxDt);
        this.particles.sync();
        this.bullets.sync(this.time);
        this.waves.update(fxDt);
        this.markers.update(dt, this.time);
        this.updateCamera();
        this.rig.update(dt);
        this.renderer.render(this.scene, this.rig.camera, dt);
    }

    // Clima del tema: nieve, hojas o destellos alrededor de la zona visible.
    weather(dt) {
        const amb = this.theme.ambient;
        if (!amb) return;
        this.weatherAcc = (this.weatherAcc || 0) + dt * amb.rate;
        const hw = this.rig.halfWidth || 6, hd = this.rig.halfDepth || 8;
        while (this.weatherAcc >= 1) {
            this.weatherAcc--;
            const x = this.rig.x + (Math.random() * 2 - 1) * (hw + 1);
            const z = this.rig.z + (Math.random() * 2 - 1) * (hd + 1);
            const color = amb.colors[(Math.random() * amb.colors.length) | 0];
            if (amb.kind === 'snow') {
                this.particles.spawn(x, 5 + Math.random() * 2, z, 0.3 + Math.random() * 0.3, -1.4 - Math.random(), 0.1, 0.07 + Math.random() * 0.05, 4.5, color, 0);
            } else if (amb.kind === 'leaves') {
                this.particles.spawn(x, 5 + Math.random() * 2, z, 0.8 + Math.random() * 0.6, -1 - Math.random() * 0.5, 0.2, 0.1 + Math.random() * 0.05, 5, color, 0);
            } else if (amb.kind === 'sparkle') {
                this.particles.spawn(x, 0.05, z, 0, 0.4, 0, 0.06, 0.8, color, 0);
            } else if (amb.kind === 'rain') {
                this.particles.spawn(x, 6 + Math.random() * 2, z, -0.4, -10, 0.3, 0.05, 0.75, color, 0);
            } else if (amb.kind === 'dust') {
                this.particles.spawn(x - 3, 0.15 + Math.random(), z, 2.5 + Math.random() * 1.5, 0.1, 0.4, 0.05 + Math.random() * 0.04, 1.8, color, 0);
            } else if (amb.kind === 'embers') {
                this.particles.spawn(x, 0.05, z, (Math.random() - 0.5) * 0.4, 1 + Math.random() * 1.2, (Math.random() - 0.5) * 0.4, 0.05 + Math.random() * 0.05, 1.8, color, -0.3);
            } else if (amb.kind === 'petals') {
                this.particles.spawn(x, 4 + Math.random() * 2, z, 0.6 + Math.random() * 0.4, -0.6 - Math.random() * 0.3, 0.2, 0.07, 6, color, 0);
            } else if (amb.kind === 'stars') {
                // Por debajo del suelo: solo se ven sobre el "mar" del espacio, alrededor del asteroide
                this.particles.spawn(x, -0.7, z, 0, 0, 0, 0.07 + Math.random() * 0.07, 1 + Math.random() * 1.5, color, 0);
            }
        }
    }

    updateCamera() {
        const w = this.world;
        if (this.state === 'menu') {
            this.rig.yawTarget = Math.sin(this.time * 0.25) * 0.35;
            this.rig.focus(w.arena.cols / 2, w.arena.rows / 2 + Math.sin(this.time * 0.18) * 3);
        } else if ((this.state === 'outro' || this.state === 'replay') && this.fallen) {
            this.rig.zoomTarget = this.state === 'replay' ? 0.7 : 0.8;
            this.rig.focus(this.fallen.x, this.fallen.z);
        } else {
            this.rig.zoomTarget = 1;
            this.rig.focus(w.player.x, w.player.z);
        }
    }

    // Visibilidad desde el punto de vista del jugador + animación de modelos y sus efectos.
    syncTanks(dt) {
        const w = this.world, player = w.player, stealth = CONFIG.stealth;
        const playing = this.state === 'play';
        for (const tank of w.tanks) {
            let target;
            if (!playing || w.forceReveal) target = 1;
            else if (tank === player) target = tank.exposed ? 1 : tank.cloak > 0 ? 0.22 : stealth.playerGhost;
            else target = player.intel.get(tank)?.visible ? 1 : 0;
            tank.viewFade = approach(tank.viewFade, target, stealth.fadeSpeed * dt);
            tank.model.sync(dt, tank, tank.viewFade, this.rig.camera);
            if (!tank.alive) {
                this.markers.hideGhost(tank.id);
                continue;
            }
            // Tanque dorado: chispas de oro a su alrededor
            if (tank.model.skin && tank.model.skin.gold && tank.viewFade > 0.4) {
                tank.goldT = (tank.goldT || 0) - dt;
                while (tank.goldT <= 0) {
                    tank.goldT += 0.025;
                    const a = Math.random() * Math.PI * 2, r = 0.35 + Math.random() * 0.45;
                    this.particles.spawn(tank.x + Math.sin(a) * r, 0.15 + Math.random() * 0.6, tank.z + Math.cos(a) * r, 0, 0.7 + Math.random() * 0.8, 0,
                        0.05 + Math.random() * 0.06, 0.7, GOLD_SPARKS[(Math.random() * GOLD_SPARKS.length) | 0], -0.5);
                }
            }
            const shown = tank.viewFade > 0.4;

            // La hierba se mueve al pasar: la tuya siempre, la del rival solo si está cerca.
            if (playing && tank.inBush && tank.moving && (tank === player || Math.hypot(tank.x - player.x, tank.z - player.z) < 4)) {
                w.arena.rustle(tank.x, tank.z);
            }

            if (tank.moving && shown && !tank.inBush) {
                tank.dustT = (tank.dustT || 0) - dt;
                if (tank.dustT <= 0) {
                    tank.dustT = tank.turbo > 0 ? 0.025 : 0.07;
                    const bx = tank.x - Math.sin(tank.yaw) * 0.4, bz = tank.z - Math.cos(tank.yaw) * 0.4;
                    if (tank.turbo > 0) {
                        this.particles.spawn(bx + (Math.random() - 0.5) * 0.4, 0.25, bz, -Math.sin(tank.yaw) * 2, 0.3, -Math.cos(tank.yaw) * 2,
                            0.1 + Math.random() * 0.08, 0.3, TURBO[(Math.random() * TURBO.length) | 0], 0);
                    } else {
                        this.particles.spawn(bx + (Math.random() - 0.5) * 0.5, 0.08, bz, 0, 0.6, 0, 0.14, 0.4, this.theme.dust, -0.5);
                    }
                }
            }

            // Siguiente bala cargada: fuego o chispas rosas en la boca del cañón
            const loaded = tank.nukeNext ? NUKE : tank.damageMult > 1 ? FLAMES : tank.bounceNext > 0 ? SPARKS : null;
            if (loaded && shown) {
                tank.fireT = (tank.fireT || 0) - dt;
                if (tank.fireT <= 0) {
                    tank.fireT = 0.018;
                    const mx = tank.x + Math.sin(tank.aimYaw) * 0.66, mz = tank.z + Math.cos(tank.aimYaw) * 0.66;
                    const j = () => (Math.random() - 0.5) * 0.22;
                    this.particles.spawn(mx + j(), 0.55 + j(), mz + j(), 0, 1.2 + Math.random(), 0,
                        0.12 + Math.random() * 0.1, 0.35, loaded[(Math.random() * loaded.length) | 0], loaded === FLAMES ? -3 : 1);
                }
            }

            // Radar activo: pulsos verdes desde tu tanque
            if (playing && tank === player && tank.radar > 0) {
                tank.pingT = (tank.pingT || 0) - dt;
                if (tank.pingT <= 0) {
                    tank.pingT = 0.6;
                    this.waves.spawn(tank.x, tank.z, 0x7dff4a, 9, 0.9);
                }
            }

            if (tank === player) continue;
            const info = player.intel.get(tank);
            const seen = !!info?.visible;
            if (playing && seen && !tank.wasSeen) {
                this.markers.pop(tank.x, 1.6, tank.z, '!', 0xffe03a, this.theme.outline);
                this.sfx.play('spot', this.panOf(tank.x));
            }
            tank.wasSeen = seen;
            if (playing && info && !seen && info.age < Infinity) {
                this.markers.ghost(tank.id, info.x, info.z, tank.def.palette.body, this.theme.outline, Math.max(0.35, 1 - info.age / 8));
            } else {
                this.markers.hideGhost(tank.id);
            }
        }
    }

    panOf(x) {
        return clamp((x - this.rig.x) / 7, -1, 1);
    }

    deathFx(tank, scorch = true) {
        const pal = tank.def.palette;
        this.particles.burst(tank.x, 0.4, tank.z, 46, [pal.body, pal.accent, pal.tread, pal.barrel], { speed: 6, up: 7, size: 0.2, ttl: 1.4, grav: 16 });
        this.particles.burst(tank.x, 0.5, tank.z, 30, FIRE, { speed: 3, up: 4, size: 0.24, ttl: 0.7, grav: -1 });
        this.waves.spawn(tank.x, tank.z, 0xffffff, 3.2, 0.5);
        this.waves.spawn(tank.x, tank.z, pal.accent, 2.2, 0.7);
        this.rig.shake(1);
        this.renderer.flash(0xffffff, 0.7);
        this.sfx.play('boom', this.panOf(tank.x));
        if (!scorch) return;
        const mark = new THREE.Mesh(
            new THREE.CircleGeometry(0.55, 8),
            new THREE.MeshBasicMaterial({ color: this.theme.scorch, transparent: true, opacity: 0.55, depthWrite: false })
        );
        mark.position.set(tank.x, 0.015, tank.z);
        mark.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI);
        this.world.root.add(mark);
        this.world.arena.trash.push(mark.material, mark.geometry);
    }

    // ---------- Efectos (reacciones a eventos de la simulación) ----------
    bindEvents() {
        const ev = this.events;
        const mine = (tank) => tank === this.world.player;

        ev.on('shot', (tank, x, z) => {
            const pal = tank.def.palette;
            if (tank.viewFade > 0.3) {
                this.particles.burst(x, 0.45, z, 7, [0xffffff, pal.accent, pal.bullet], { speed: 2.5, up: 0.8, size: 0.1, ttl: 0.18, grav: 0 });
            }
            this.sfx.play(mine(tank) ? 'shot' : 'shotEnemy', this.panOf(x));
            if (mine(tank)) this.rig.shake(0.06);
        });

        ev.on('reload', (tank) => mine(tank) && this.sfx.play('reload'));
        ev.on('reloaded', (tank) => mine(tank) && this.sfx.play('reloaded'));

        ev.on('pickupSpawn', (item) => {
            this.particles.burst(item.x, 0.5, item.z, 12, [item.def.color, item.def.accent, 0xffffff], { speed: 2.5, up: 3, size: 0.1, ttl: 0.5, grav: 8 });
            this.waves.spawn(item.x, item.z, item.def.color, 1.2, 0.35);
            this.sfx.play('itemSpawn', this.panOf(item.x));
        });

        ev.on('pickupExpired', (item) => {
            this.particles.burst(item.x, 0.55, item.z, 8, [item.def.color, 0xffffff], { speed: 1.5, up: 1.5, size: 0.08, ttl: 0.35, grav: 2 });
            this.sfx.play('itemGone', this.panOf(item.x));
        });

        ev.on('pickup', (tank, item) => {
            const me = mine(tank), d = item.def;
            this.particles.burst(item.x, 0.55, item.z, 18, [d.color, d.accent, 0xffffff], { speed: 3, up: 4, size: 0.12, ttl: 0.6, grav: 6 });
            this.waves.spawn(item.x, item.z, d.color, 1.6, 0.4);
            if (me || tank.viewFade > 0.5) this.pickupFx(tank, item);
            if (me) {
                const SOUNDS = { heal: 'heal', power: 'power', shield: 'shieldGet', turbo: 'turbo', cloak: 'cloak', bounce: 'bounceGet', radar: 'radar', nuke: 'nukeGet' };
                this.sfx.play(SOUNDS[item.kind] || 'heal');
                this.renderer.flash(d.color, 0.25);
                vibrate('pickup');
            } else {
                this.sfx.play('grabOther', this.panOf(item.x));
            }
        });

        ev.on('bulletWall', (x, z, color) => {
            this.particles.burst(x, 0.45, z, 6, [color, 0xffffff], { speed: 2.2, up: 1.5, size: 0.09, ttl: 0.3, grav: 9 });
            this.sfx.play('wall', this.panOf(x));
        });

        ev.on('bulletBounce', (x, z) => {
            this.particles.burst(x, 0.45, z, 8, SPARKS, { speed: 2.5, up: 1.5, size: 0.08, ttl: 0.3, grav: 4 });
            this.sfx.play('boing', this.panOf(x));
        });

        ev.on('tileHit', (c, r, res, color, style = 'crate') => {
            const st = this.theme.walls[style] || this.theme.walls.crate, x = c + 0.5, z = r + 0.5;
            if (res === 'broken') {
                this.particles.burst(x, 0.5, z, 34, [st.top, st.side, 0xffffff], { speed: 4, up: 5, size: 0.2, ttl: 1, grav: 14 });
                this.waves.spawn(x, z, st.top, 1.8, 0.4);
                this.rig.shake(0.2);
                this.sfx.play('crateBreak', this.panOf(x));
                vibrate('crate');
            } else {
                this.particles.burst(x, 0.6, z, 6, [st.top, st.side], { speed: 2, up: 2.5, size: 0.1, ttl: 0.4, grav: 12 });
                this.sfx.play('crateHit', this.panOf(x));
            }
        });

        ev.on('shieldBreak', (tank, x) => {
            this.particles.burst(tank.x, 0.5, tank.z, 24, [0x6fd0ff, 0xffffff, 0x3fa9ff], { speed: 4, up: 3, size: 0.12, ttl: 0.5, grav: 6 });
            this.waves.spawn(tank.x, tank.z, 0x6fd0ff, 1.4, 0.35);
            this.sfx.play('shield', this.panOf(x));
            if (mine(tank)) vibrate('shield');
        });

        ev.on('hit', (tank, x, z, color, damage) => {
            const pal = tank.def.palette, me = mine(tank);
            if (damage > 1) {
                this.particles.burst(x, 0.5, z, 30, FLAMES, { speed: 5, up: 4, size: 0.2, ttl: 0.6, grav: -1 });
                this.waves.spawn(x, z, 0xff9a1f, 1.8, 0.4);
            }
            this.particles.burst(x, 0.5, z, 14, [color, pal.body, pal.accent, 0xffffff], { speed: 4, up: 3, size: 0.13, ttl: 0.5 });
            this.rig.shake(me ? 0.4 : 0.2);
            this.hitStop = 0.05;
            if (me) {
                this.renderer.flash(0xff2060, 0.45);
                vibrate('hurt');
            }
            this.sfx.play(me ? 'hurt' : 'hit', this.panOf(x));
        });

        ev.on('nukeLaunch', (n) => {
            this.particles.burst(n.x0, 0.5, n.z0, 16, [0xffffff, 0xffe600, 0x9a9a9a], { speed: 2, up: 3, size: 0.16, ttl: 0.6, grav: -1 });
            this.rig.shake(0.25);
            this.sfx.play('nukeLaunch', this.panOf(n.x0));
        });

        ev.on('nukeBoom', (n) => this.nukeFx(n));

        ev.on('death', (tank) => {
            this.fallen = tank;
            this.hitStop = 0.12;
            this.deathFx(tank);
            vibrate(mine(tank) ? 'dead' : 'kill');
        });
    }

    // La gran explosión: destello, hongo de fuego, ondas del tamaño del radio y quemadura.
    nukeFx(n, scorch = true) {
        const { x1: x, z1: z, radius: R } = n;
        this.particles.burst(x, 0.3, z, 90, FIRE, { speed: R * 2.4, up: 3, size: 0.26, ttl: 0.9, grav: 2 });
        this.particles.burst(x, 0.5, z, 60, [0xffe600, 0xff9a1f, 0xffffff], { speed: 1.2, up: 9, size: 0.34, ttl: 1.2, grav: -2 });
        this.particles.burst(x, 3.5, z, 40, [0x5a4a6a, 0x8a7a9a, 0xff9a1f], { speed: 2.2, up: 1.5, size: 0.4, ttl: 1.6, grav: -0.5 });
        this.waves.spawn(x, z, 0xffffff, R + 0.4, 0.45);
        this.waves.spawn(x, z, 0xffe600, R, 0.7);
        this.waves.spawn(x, z, 0xff3e1f, R * 1.4, 1);
        this.rig.shake(1);
        this.renderer.flash(0xffffff, 0.95);
        this.hitStop = Math.max(this.hitStop, 0.08);
        this.sfx.play('nuke', this.panOf(x));
        vibrate('nuke');
        if (!scorch) return;
        const mark = new THREE.Mesh(
            new THREE.CircleGeometry(R * 0.9, 14),
            new THREE.MeshBasicMaterial({ color: this.theme.scorch, transparent: true, opacity: 0.45, depthWrite: false })
        );
        mark.position.set(x, 0.013, z);
        mark.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI);
        this.world.root.add(mark);
        this.world.arena.trash.push(mark.material, mark.geometry);
    }

    // Efecto visual al coger cada tipo de objeto.
    pickupFx(tank, item) {
        const d = item.def, x = tank.x, z = tank.z;
        switch (item.kind) {
            case 'heal':
                this.markers.sprinkle(x, z, '+', d.color, this.theme.outline, 12);
                break;
            case 'power':
                this.particles.burst(x, 0.6, z, 26, FLAMES, { speed: 2.5, up: 4, size: 0.16, ttl: 0.6, grav: -2 });
                break;
            case 'shield':
                this.waves.spawn(x, z, d.color, 1.2, 0.5);
                this.particles.burst(x, 0.6, z, 20, [d.color, d.accent], { speed: 1.5, up: 3, size: 0.1, ttl: 0.6, grav: 0 });
                break;
            case 'turbo':
                this.particles.burst(x, 0.3, z, 24, TURBO, { speed: 5, up: 1, size: 0.1, ttl: 0.4, grav: 0 });
                break;
            case 'cloak':
                this.particles.burst(x, 0.5, z, 30, [0xffffff, d.color, 0xcfc8e8], { speed: 2, up: 2, size: 0.22, ttl: 0.8, grav: -1 });
                break;
            case 'bounce':
                this.particles.burst(x, 0.6, z, 24, SPARKS, { speed: 3, up: 5, size: 0.1, ttl: 0.6, grav: 10 });
                break;
            case 'radar':
                this.waves.spawn(x, z, d.color, 9, 0.9);
                break;
            case 'nuke':
                this.particles.burst(x, 0.6, z, 24, NUKE, { speed: 2.5, up: 4, size: 0.12, ttl: 0.6, grav: 6 });
                break;
        }
    }
}
