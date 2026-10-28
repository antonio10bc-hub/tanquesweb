import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LEVELS, THEMES, SURVIVAL, WORLD_BY_ID, getDef } from '../content/index.js';
import { RetroRenderer } from '../render/RetroRenderer.js';
import { CameraRig } from '../render/CameraRig.js';
import { Particles } from '../render/Particles.js';
import { Shockwaves } from '../render/Shockwaves.js';
import { Markers } from '../render/Markers.js';
import { PickupView } from '../render/PickupView.js';
import { NukeView } from '../render/NukeView.js';
import { HazardView } from '../render/HazardView.js';
import { SkullWisps } from '../render/SkullWisps.js';
import { SupplyPlane } from '../render/SupplyPlane.js';
import { Tracks } from '../render/Tracks.js';
import { CampaignMap } from '../ui/CampaignMap.js';
import { drawMinimap } from '../ui/Minimap.js';
import { Tutorial } from './Tutorial.js';
import { waveSpecs } from '../content/survival.js';
import { BulletSystem } from '../world/Bullets.js';
import { World } from '../world/World.js';
import { EventBus } from './EventBus.js';
import { Input } from './Input.js';
import { Music } from './Music.js';
import { Ambience } from './Ambience.js';
import { ReplayRecorder } from './Replay.js';
import { Settings } from './Settings.js';
import { setAnalyticsConsent } from './Analytics.js';
import { Profile } from './Profile.js';
import { vibrate } from './Haptics.js';
import { clamp, pick } from './math.js';
import { L } from './I18n.js';
import { BOSS_INTRO, HARD, SCOUT } from './game/constants.js';
import { ViewPart } from './game/view.js';
import { EffectsPart } from './game/effects.js';
import { BossPart } from './game/boss.js';
import { SurvivalPart } from './game/survival.js';
import { EndingPart } from './game/ending.js';
import { DancePart } from './game/dance.js';

// Música del mapa de la campaña: de aventura, con su melodía (y una versión inquietante)
const MAP_MUSIC = {
    root: 60, scale: 'lydian', tempo: 100, lead: 'triangle', octave: 2, arp: 'up', bass: '1.......5.......',
    drums: { k: 'x.......x.......', s: '................', h: '..x...x...x...x.' }, harmony: true,
    motif: '4...6.7.6...4...2...4.2.0.......4...6.7.9...7.6.4...6.4.2.......',
};
const MAP_MUSIC_HARD = {
    root: 57, scale: 'harmonic', tempo: 88, lead: 'sawtooth', arp: 'stab', bass: '1...1...5...1...', bassType: 'sine',
    drums: { k: 'x.......x..x....', s: '................', h: '................' },
    motif: '0...1...0...a...0...2...1.......0...1...3...2...1...0...a.......',
};

// Orquesta todo: bucle, estados de partida, cámara, efectos, música y HUD.
// Este archivo lleva el flujo (menú, cargar, empezar, pausa, bucle e intro); el resto de
// métodos vive en core/game/ por áreas y se mezcla en el prototipo al final del archivo:
//   view.js (dibujo y cámara) · effects.js (efectos de los eventos) · boss.js (jefes)
//   survival.js (oleadas) · ending.js (cámara lenta, repetición y pantalla final)
//   dance.js (baile de victoria)
// Estados: menu -> intro -> play -> outro -> replay -> (dance) -> end -> (intro...)
// Cada partida elige un arquetipo (content/levels.js) y uno de sus temas visuales.
export class Game {
    constructor({ canvas, hud, input, sfx }) {
        this.hud = hud;
        this.input = input;
        // Jugador 2 del duelo local: su joystick vive en la mitad de arriba
        this.input2 = new Input(canvas, document.getElementById('joy2'));
        this.input2.setEnabled(false);
        this.sfx = sfx;
        this.music = new Music(sfx);
        this.ambience = new Ambience(sfx); // viento, olas, lava... de cada escenario
        this.events = new EventBus();
        this.renderer = new RetroRenderer(canvas, CONFIG.render);
        this.scene = new THREE.Scene();
        this.rig = new CameraRig(CONFIG.camera);
        this.particles = new Particles(this.scene, 900);
        this.waves = new Shockwaves(this.scene);
        this.markers = new Markers(this.scene);
        this.pickupView = new PickupView(this.scene);
        this.nukeView = new NukeView(this.scene);
        this.hazardView = new HazardView(this.scene, this.particles);
        this.skulls = new SkullWisps(this.scene, this.particles); // bordes del modo difícil
        this.plane = new SupplyPlane(this.scene, this.particles); // suministros de supervivencia
        this.tracks = new Tracks(this.scene); // huellas de las orugas en nieve y arena
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
        this.mode = 'quick';   // 'quick' (partida rápida) | 'survival' | 'campaign'
        this.worldId = null;   // campaña: mundo cuyo jefe se está jugando
        this.endToken = 0;     // invalida la ceremonia de la moneda si empieza otra partida
        this.dropping = [];    // enemigos de oleada cayendo del cielo

        Settings.load();
        this.applySettings();
        // Si la partida empezó antes de que el navegador dejara sonar el audio, la música
        // arranca en cuanto lo permite (antes había que apagarla y encenderla a mano).
        sfx.onStateChange = (state) => {
            if (state === 'running' && Settings.music && !this.music.playing && (this.state === 'intro' || this.state === 'play')) this.startMusic();
            if (state === 'running') this.ambience.resume();
        };

        this.renderer.onResize = (w, h) => this.rig.resize(w / h);
        this.renderer.resize();
        this.bindEvents();
        this.trackTally();
        this.bindUi();
        this.campaign = new CampaignMap(this);
        this.tutorial = new Tutorial(this);

        this.last = performance.now();
        this.frame = this.frame.bind(this);
        requestAnimationFrame(this.frame);
    }

    bindUi() {
        const hud = this.hud;
        hud.onPause = () => this.pause();
        hud.onDebug = () => this.debugWin();
        hud.onResume = () => this.resume();
        hud.onQuit = () => {
            this.resume(true);
            this.music.stop();
            if (this.mode === 'tutorial') this.finishTutorial();
            if (this.mode === 'campaign') this.showCampaign();
            else this.showMenu();
        };
        hud.settingsSource = Settings;
        hud.syncToggles(Settings);
        hud.onToggle = (key) => {
            if (key === 'analytics') setAnalyticsConsent(!Settings.analytics);
            else Settings.toggle(key);
            this.applySettings();
            hud.syncToggles(Settings);
            if (key === 'vibration' && Settings.vibration) vibrate('pickup');
            this.sfx.unlock();
            this.sfx.play('ui');
        };
        this.input.onMove = () => hud.showHint(false);
        hud.onUpgradeMove = () => this.sfx.play('tick');

        window.addEventListener('keydown', (e) => {
            if ((e.code === 'Enter' || e.code === 'Space') && (this.state === 'menu' || this.state === 'end') && !document.activeElement?.closest?.('button')) {
                e.preventDefault();
                this.sfx.unlock();
                if (this.state === 'menu') this.startMatch(this.levelId, undefined, this.themeId);
                else if (document.getElementById('btn-again').classList.contains('hidden')) this.hud.onMenu();
                else this.again();
            } else if (e.code === 'Escape' || e.code === 'KeyP') {
                if (this.paused) this.resume();
                else this.pause();
            }
        });
        document.addEventListener('visibilitychange', () => document.hidden && this.pause());
        // También al irse a otra ventana (Alt+Tab en el ordenador): la pestaña sigue visible
        window.addEventListener('blur', () => this.pause());
        // Toca durante la repetición o el baile para saltarlos
        window.addEventListener('pointerdown', () => {
            if (this.state === 'replay' && this.stateTime > 0.4) this.afterReplay();
            else if (this.state === 'dance' && this.stateTime > 0.3) this.endDance();
        });
    }

    applySettings() {
        this.sfx.enabled = Settings.sfx;
        this.ambience.setEnabled(Settings.sfx);
        this.music.enabled = Settings.music;
        if (!Settings.music) this.music.stop(0.2);
        else if (!this.music.playing && this.world && (this.state === 'intro' || this.state === 'play')) this.startMusic();
    }

    // ---------- Flujo ----------
    randomLevel() {
        const all = Object.keys(LEVELS).filter((id) => !LEVELS[id].survival && !LEVELS[id].campaign && !LEVELS[id].duel && !LEVELS[id].tutorial);
        const ids = all.filter((id) => id !== this.levelId);
        return pick(ids.length ? ids : all);
    }

    // seed / themeId: opcionales, para repetir un mapa concreto (game.world.seed, game.themeId).
    load(levelId = this.randomLevel(), seed, themeId) {
        if (this.world) this.world.dispose();
        this.dance = null;
        this.landing = null;
        this.bullets.clear();
        this.particles.clear();
        this.waves.clear();
        this.markers.clear();
        this.nukeView.clear();
        this.hazardView.clear();

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
        this.hazardView.setOutline(theme.outline);
        this.sfx.setAmbience(theme.sound);

        // Supervivencia: la primera oleada ya va vestida del escenario (content/survival.js)
        const level = def.survival ? { ...def, enemies: waveSpecs(1, this.themeId, SURVIVAL.maxEnemies).map((e) => ({ ...e, spawn: 'E' })) } : def;
        this.world = new World(level, theme, { events: this.events, bullets: this.bullets, input: this.input, input2: this.input2, seed, skin: Profile.data.skin, paint: Profile.data.paint, trail: Profile.data.trail, pet: Profile.data.pet });
        this.scene.add(this.world.root);
        this.levelId = levelId;
        this.rig.setBounds(this.world.arena.cols, this.world.arena.rows);
        this.tracks.start(theme, this.world.arena);
        this.recorder.reset();

        const enemy = this.world.enemies()[0];
        this.hud.setNames(this.world.player.def.name, enemy ? enemy.def.name : '');
    }

    showMenu(levelId) {
        this.sfx.cut();
        this.plane.stop();
        this.supply = null;
        this.campaign.show(false);
        if (this.state === 'campaign') this.music.stop(0.3);
        this.load(levelId);
        this.ambience.stop(); // el menú, en silencio: el ambiente es cosa de la partida
        this.setState('menu');
        this.world.forceReveal = true;
        this.setInputs(false);
        this.hud.screen('menu');
        this.hud.showReplay(false);
        this.hud.ready();
        this.hud.showBoss(null);
        this.hud.showDuel(false);
        this.skulls.start(null);
        this.input.setSide(null);
        this.input2.setSide(null);
        this.rig.zoomTarget = 1.15;
        this.rig.focus(this.world.arena.cols / 2, this.world.arena.rows / 2);
        this.rig.snap();
    }

    // "Otra vez": repite el modo de la última partida.
    again() {
        if (this.mode === 'survival') this.startSurvival();
        else if (this.mode === 'duel') this.startDuel();
        else if (this.mode === 'tutorial') this.startTutorial();
        else if (this.mode === 'campaign') this.startBoss(this.worldId, this.hard);
        else this.startMatch();
    }

    // Campaña: el mapa de mundos. justBeaten anima el desbloqueo del siguiente.
    showCampaign() {
        this.sfx.cut();
        this.endToken++;
        this.paused = false;
        this.music.stop(0.2);
        this.bullets.clear();
        this.particles.clear();
        this.hazardView.clear();
        this.setState('campaign');
        this.setInputs(false);
        this.hud.screen('campaign');
        this.hud.showBoss(null);
        this.hud.showReplay(false);
        // Mapa: música de aventura tranquila (oscura en modo difícil) sobre el mar del archipiélago
        // (al elegir un mundo, CampaignMap suma su ambiente por encima)
        this.ambience.set('map', { hard: this.hard });
        this.campaign.open(this.justBeaten, this.hard);
        this.justBeaten = null;
        this.mapMusic(this.hard);
    }

    mapMusic(hard) {
        if (Settings.music) this.music.start(hard ? MAP_MUSIC_HARD : MAP_MUSIC, 7);
    }

    startMatch(levelId, seed, themeId) {
        this.endToken++;
        this.cutscene = null;
        this.streak = 0;
        this.lastKill = null;
        this.load(levelId, seed, themeId);
        this.tutorial.stop();
        this.mode = this.def.survival ? 'survival' : this.def.campaign ? 'campaign' : this.def.duel ? 'duel' : this.def.tutorial ? 'tutorial' : 'quick';
        const duel = this.mode === 'duel';
        this.input.setSide(duel ? 'bottom' : null);
        this.input2.setSide(duel ? 'top' : null);
        this.hud.showDuel(duel);
        if (duel) this.hud.setNames(L('PLAYER 1', 'JUGADOR 1'), L('PLAYER 2', 'JUGADOR 2'));
        this.boss = this.mode === 'campaign' ? this.world.enemies()[0] : null;
        if (this.mode !== 'campaign') this.hard = false;
        if (this.boss && this.hard) {
            // Modo difícil: aura maligna y jefe más duro
            const b = this.boss;
            b.hp = b.maxHp = Math.round(b.maxHp * HARD.hp);
            b.speed *= HARD.speed;
            b.brain.every *= HARD.every;
            b.brain.p.dodge = Math.min(0.8, b.brain.p.dodge + HARD.dodge);
            b.evil = true;
            b.model.setEvil(true);
        }
        // Modo difícil: calaveras en los bordes de la arena (sin teñir la pantalla)
        this.skulls.start(this.hard ? this.world.arena : null);
        // Ambiente del escenario (en modo difícil, con su fondo inquietante)
        this.ambience.set(this.themeId, { hard: this.hard });
        this.heartT = 0;
        this.playTime = 0;
        this.damageTaken = 0;
        this.tally = { kills: 0, hits: 0, pickups: 0 }; // para el resumen final
        this.hud.showBoss(this.boss ? this.boss.def.name : null);
        this.hud.endButtons(this.mode === 'tutorial' ? L('REPEAT', 'REPETIR') : L('PLAY AGAIN', 'OTRA VEZ'), this.mode === 'campaign' ? L('SEE THE MAP', 'VER EL MAPA') : L('MAIN MENU', 'MENÚ PRINCIPAL'));
        this.wave = 1;
        this.lastOneWave = 0;
        this.waveSize = this.world.enemies().length;
        this.waveClear = false;
        this.dropping = [];
        this.newRecord = false;
        this.runCoins = 0; // monedas ganadas en esta partida de supervivencia
        // Mejoras del avión (supervivencia): nivel de cada una y los valores de partida del tanque
        this.supply = null;
        this.plane.stop();
        this.hud.hideUpgrades();
        this.upgrades = {};
        const pl = this.world.player;
        pl.weapon = { ...pl.weapon }; // copia propia: las mejoras no tocan el arma compartida
        this.upgradeBase = { reload: pl.weapon.reload, interval: pl.weapon.interval, damage: pl.weapon.damage, speed: pl.speed };
        this.miniBoss = null;
        this.seenTypes = new Set(['grunt']); // tipos ya presentados en esta partida
        if (this.mode === 'survival') this.hud.setNames(this.world.player.def.name, L('WAVE 1', 'OLEADA 1'));
        this.events.emit('matchStart', this.mode);
        this.setState('intro');
        this.fallen = null;
        this.timeScale = 1;
        this.countdown = 0;
        this.world.forceReveal = true;
        for (const t of this.world.tanks) t.model.dropY = 9;
        this.setInputs(false, true);
        this.hud.screen('play');
        this.hud.showReplay(false);
        this.hud.showHint(true);
        if (!this.boss && this.mode !== 'tutorial') this.hud.stage(this.def.name, `${this.theme.name} · ${this.def.tagline}`);
        this.rig.zoomTarget = 1.6;
        this.rig.yawTarget = 0.7;
        this.rig.focus(this.world.player.x, this.world.player.z);
        this.rig.snap();
        this.rig.zoomTarget = 1;
        this.rig.yawTarget = 0;
        this.scout = this.scoutTarget();
        this.startMusic();
    }

    // Partida rápida y supervivencia: si los rivales caen donde la cámara de salida no llega,
    // a dónde mirar para enseñárselos (el centro de todos); si no, null
    scoutTarget() {
        if (this.mode !== 'quick' && this.mode !== 'survival') return null;
        const foes = this.world.enemies();
        if (!foes.length) return null;
        const rig = this.rig, p = this.world.player;
        const free = rig.free;
        rig.free = false; // dónde quedará la cámara de juego, aunque venga de una escena
        const cz = rig.clampZ(p.z), hd = rig.halfDepth * 0.9;
        rig.free = free;
        if (!foes.some((e) => Math.abs(e.z - cz) > hd)) return null;
        const x = foes.reduce((s, e) => s + e.x, 0) / foes.length;
        const z = foes.reduce((s, e) => s + e.z, 0) / foes.length;
        return { x, z, shown: false };
    }

    // Los jefes tienen su propio tema (y otro para la fase 2); el resto, la música del escenario.
    // Activa los mandos: en el duelo, los dos; si no, solo el tuyo.
    setInputs(on, capture = on) {
        this.input.setEnabled(on, capture);
        const duel = this.mode === 'duel' && (this.state === 'intro' || this.state === 'play');
        this.input2.setEnabled(duel && on, duel && capture);
    }

    // Tutorial de la primera partida
    startTutorial() {
        this.startMatch('tutorial');
    }

    // Cuánto subir el foco de la cámara para que el tablero quede bajo el cuadro de texto
    tutorialLift() {
        const box = document.getElementById('tut').getBoundingClientRect();
        const covered = box.height ? box.bottom / window.innerHeight : 0.35; // parte de pantalla tapada arriba
        return covered * this.rig.halfDepth * 0.95;
    }

    // Saltar o dejar el tutorial también cuenta como visto (no vuelve a salir solo)
    finishTutorial() {
        this.tutorial.stop();
        if (!Profile.data.tutorialDone) {
            Profile.data.tutorialDone = true;
            Profile.save();
        }
    }

    startDuel() {
        this.startMatch('duelo');
    }

    startMusic() {
        this.music.intensity = 0;
        const w = this.boss && WORLD_BY_ID[this.worldId];
        const cfg = w ? (this.boss.angry ? w.music2 : w.music) : this.theme.music;
        this.music.start(cfg, (this.world.seed || 1) ^ this.levelId.length);
    }

    setState(s) {
        this.state = s;
        this.stateTime = 0;
    }

    pause() {
        if (this.paused || (this.state !== 'play' && this.state !== 'intro')) return;
        this.paused = true;
        this.setInputs(false);
        drawMinimap(document.getElementById('pause-map'), this.world, this.theme);
        this.hud.showPause(true, Settings);
        this.sfx.play('pause');
        this.sfx.hold(true);
    }

    resume(silent) {
        if (!this.paused) return;
        this.paused = false;
        this.hud.showPause(false);
        this.sfx.hold(false);
        // Entre oleadas de supervivencia el mando sigue bloqueado hasta la siguiente
        if (!silent) this.setInputs(this.state === 'play' && !this.cutscene && !this.waveClear, true);
        this.last = performance.now();
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
        if (this.state === 'campaign') {
            this.input.update();
            this.campaign.frame(dt);
            return;
        }
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
        while (left > 1e-6 && !this.cutscene) {
            const h = Math.min(max, left);
            this.world.step(h, tanksActive);
            left -= h;
        }
    }

    update(dt, simDt) {
        const w = this.world;
        this.stateTime += dt;
        this.input.update();
        this.input2.update();

        switch (this.state) {
            case 'intro':
                this.updateIntro();
                break;
            case 'play':
                if (this.cutscene) {
                    this.updatePhaseScene(dt);
                    break;
                }
                this.stepWorld(simDt, true);
                this.playTime += simDt;
                this.recorder.record(simDt, w, this.bullets);
                this.updateDrops(dt);
                if (this.mode === 'tutorial') {
                    this.tutorial.update(dt);
                    if (this.tutorial.step === 4 && w.aliveEnemies() === 0) this.endMatch(true);
                } else if (!w.player.alive) this.endMatch(false);
                else if (this.mode === 'survival') this.updateSurvival(dt);
                else if (this.mode === 'campaign') { if (!this.boss.alive) this.endMatch(true); }
                else if (w.aliveEnemies() === 0) this.endMatch(true);
                break;
            case 'outro':
                this.stepWorld(simDt, false);
                if (this.stateTime >= CONFIG.match.slowmoTime) this.startReplay();
                break;
            case 'replay':
                this.updateReplay();
                break;
            case 'dance':
                this.updateDance();
                break;
            case 'end':
                this.stepWorld(simDt, false);
                this.updateLanding(dt);
                break;
        }

        const p = w.player, e = w.enemies().find((t) => t.alive) || w.enemies()[0];
        this.hud.setHp('p', p.hp, p.maxHp);
        // Supervivencia: el panel del rival cuenta los enemigos que quedan en la oleada
        if (this.miniBoss) this.hud.bossHp(this.miniBoss.hp / this.miniBoss.maxHp, this.miniBoss.angry, dt);
        else if (this.mode === 'survival') this.hud.setHp('e', w.aliveEnemies(), this.waveSize);
        else if (this.boss) this.hud.bossHp(this.boss.hp / this.boss.maxHp, this.boss.angry, dt);
        else if (e) this.hud.setHp('e', e.hp, e.maxHp);
        let stealth = 'hidden';
        if (w.forceReveal || p.exposed) stealth = 'visible';
        else if (p.cloak > 0) stealth = 'cloak';
        else if (p.inBush) stealth = 'bush';
        this.hud.setStealth(stealth);
        this.updateTension(dt, stealth);
    }

    // Tensión sonora: la música acelera y suma capas con la vida baja, con un enemigo cerca,
    // con el jefe furioso o según avanzan las oleadas; escondido suena apagada, y en la última
    // vida se oye el latido.
    updateTension(dt, stealth) {
        const w = this.world, p = w.player, playing = this.state === 'play' && !this.cutscene;
        let target = 0;
        if (playing && p.alive) {
            const r = p.hp / p.maxHp;
            target = r <= 0.2 ? 1 : r <= 0.4 ? 0.6 : 0;
            let near = Infinity;
            for (const e of w.enemies()) if (e.alive && !e.decoy) near = Math.min(near, Math.hypot(e.x - p.x, e.z - p.z));
            target = Math.max(target, clamp((5.5 - near) / 4, 0, 1) * 0.55);
            if (this.boss && this.boss.angry) target = Math.max(target, 0.6);
            if (this.mode === 'survival') target = Math.max(target, Math.min(0.45, this.wave * 0.03));
        }
        // Sube rápido y baja despacio
        const k = target > this.music.intensity ? 2 : 0.5;
        this.music.intensity += (target - this.music.intensity) * Math.min(1, dt * k);
        this.music.setMuffle(playing && this.mode !== 'duel' && this.mode !== 'tutorial' && stealth !== 'visible');
        // Latido en la última vida
        if (playing && p.alive && p.hp === 1) {
            this.heartT = (this.heartT || 0) - dt;
            if (this.heartT <= 0) {
                this.heartT = 0.85;
                this.sfx.play('heartbeat');
            }
        } else this.heartT = 0;
    }

    updateIntro() {
        const m = CONFIG.match;
        const t = this.stateTime;
        // Jefes: antes de la cuenta atrás, su presentación
        const extra = this.boss ? BOSS_INTRO.extra : this.scout ? SCOUT.extra : 0;
        if (this.boss) this.updateBossIntro(t);
        // Rival fuera de la pantalla: al llegar la cámara, su "!" y un anillo
        if (this.scout && !this.scout.shown && t >= SCOUT.at + 0.35) {
            this.scout.shown = true;
            for (const e of this.world.enemies()) {
                this.markers.pop(e.x, 1.6, e.z, '!', 0xffe03a, this.theme.outline);
                this.waves.spawn(e.x, e.z, 0xff3e8e, 2.2, 0.6);
            }
            this.sfx.play('spot');
        }
        // Tutorial: sin cuenta atrás, en cuanto aterriza ya puedes moverte
        if (this.mode === 'tutorial' && t >= 0.9) {
            this.world.forceReveal = false;
            this.setInputs(true);
            this.setState('play');
            this.tutorial.start();
            return;
        }
        this.world.tanks.forEach((tank, i) => {
            const start = 0.25 + i * 0.25;
            const k = clamp((t - start) / m.dropTime, 0, 1);
            const was = tank.model.dropY;
            tank.model.dropY = 9 * (1 - k) * (1 - k);
            if (was > 0 && tank.model.dropY === 0) this.landed(tank);
        });

        const labels = ['3', '2', '1'];
        const step = Math.floor((t - m.countdownStart - extra) / m.countdownStep);
        if (t >= m.countdownStart + extra && step >= this.countdown) {
            if (step < labels.length) {
                this.hud.banner(labels[step]);
                this.sfx.play(`count${3 - step}`);
                this.countdown = step + 1;
            } else {
                this.hud.banner(L('GO!', '¡FUEGO!'), 'go');
                // El duelo empieza con campana de boxeo; el resto, con su fanfarria
                this.sfx.play(this.mode === 'duel' ? 'bell' : 'go');
                // Durante la cuenta atrás os veis: cada uno arranca sabiendo dónde está el otro.
                this.world.updateIntel(0);
                this.world.forceReveal = false;
                this.setInputs(true);
                this.setState('play');
            }
        }
    }

}

Object.assign(Game.prototype, ViewPart, EffectsPart, BossPart, SurvivalPart, EndingPart, DancePart);
