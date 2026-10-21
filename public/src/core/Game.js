import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LEVELS, THEMES, getDef } from '../content/index.js';
import { RetroRenderer } from '../render/RetroRenderer.js';
import { CameraRig } from '../render/CameraRig.js';
import { Particles } from '../render/Particles.js';
import { Shockwaves } from '../render/Shockwaves.js';
import { Markers } from '../render/Markers.js';
import { PickupView } from '../render/PickupView.js';
import { BulletSystem, FIRE as FLAMES } from '../world/Bullets.js';
import { World } from '../world/World.js';
import { EventBus } from './EventBus.js';
import { approach, clamp } from './math.js';

const CONFETTI = [0xffe03a, 0x23e0d6, 0xff3e8e, 0xb6ff5c, 0x7b5cff, 0xffffff];
const FIRE = [0xffe03a, 0xff9a1f, 0xffffff, 0xff3e3e];

// Orquesta todo: bucle, estados de partida, cámara, efectos y HUD.
// Estados: menu -> intro -> play -> outro -> end -> (intro...)
export class Game {
    constructor({ canvas, hud, input, sfx }) {
        this.hud = hud;
        this.input = input;
        this.sfx = sfx;
        this.events = new EventBus();
        this.renderer = new RetroRenderer(canvas, CONFIG.render);
        this.scene = new THREE.Scene();
        this.rig = new CameraRig(CONFIG.camera);
        this.particles = new Particles(this.scene);
        this.waves = new Shockwaves(this.scene);
        this.markers = new Markers(this.scene);
        this.pickupView = new PickupView(this.scene);
        this.bullets = new BulletSystem(this.scene, this.events, this.particles);

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

        this.renderer.onResize = (w, h) => this.rig.resize(w / h);
        this.renderer.resize();
        this.bindEvents();

        input.onMove = () => this.hud.showHint(false);
        window.addEventListener('keydown', (e) => {
            if ((e.code === 'Enter' || e.code === 'Space') && (this.state === 'menu' || this.state === 'end')) {
                e.preventDefault();
                this.sfx.unlock();
                this.startMatch(this.levelId);
            }
        });

        this.last = performance.now();
        this.frame = this.frame.bind(this);
        requestAnimationFrame(this.frame);
    }

    // ---------- Flujo ----------
    // seed: opcional, para repetir un mapa generado concreto (game.world.seed lo muestra).
    load(levelId, seed) {
        if (this.world) this.world.dispose();
        this.bullets.clear();
        this.particles.clear();
        this.waves.clear();
        this.markers.clear();

        const def = getDef(LEVELS, levelId, 'nivel');
        const theme = getDef(THEMES, def.theme, 'tema');
        this.theme = theme;
        this.scene.background = new THREE.Color(theme.sea);
        this.sun.color.setHex(theme.light.sun);
        this.sun.intensity = theme.light.sunIntensity;
        this.hemi.color.setHex(theme.light.sky);
        this.hemi.groundColor.setHex(theme.light.ground);
        this.hemi.intensity = theme.light.hemiIntensity;
        this.bullets.setOutline(theme.outline);

        this.world = new World(def, theme, { events: this.events, bullets: this.bullets, input: this.input, seed });
        this.scene.add(this.world.root);
        this.levelId = levelId;
        this.rig.setBounds(this.world.arena.cols, this.world.arena.rows);

        const enemy = this.world.enemies()[0];
        this.hud.setNames(this.world.player.def.name, enemy ? enemy.def.name : '');
    }

    showMenu(levelId) {
        this.load(levelId);
        this.setState('menu');
        this.world.forceReveal = true;
        this.input.setEnabled(false);
        this.hud.screen('menu');
        this.hud.ready();
        this.rig.zoomTarget = 1.15;
        this.rig.focus(this.world.arena.cols / 2, this.world.arena.rows / 2);
        this.rig.snap();
    }

    startMatch(levelId, seed) {
        this.load(levelId, seed);
        this.setState('intro');
        this.fallen = null;
        this.timeScale = 1;
        this.countdown = 0;
        this.world.forceReveal = true;
        for (const t of this.world.tanks) t.model.dropY = 9;
        this.input.setEnabled(false, true);
        this.hud.screen('play');
        this.hud.showHint(true);
        this.rig.zoomTarget = 1.6;
        this.rig.yawTarget = 0.7;
        this.rig.focus(this.world.player.x, this.world.player.z);
        this.rig.snap();
        this.rig.zoomTarget = 1;
        this.rig.yawTarget = 0;
    }

    setState(s) {
        this.state = s;
        this.stateTime = 0;
    }

    endMatch(win) {
        this.result = win;
        this.setState('outro');
        this.timeScale = CONFIG.match.slowmo;
        this.input.setEnabled(false);
    }

    finish() {
        const win = this.result;
        this.setState('end');
        this.timeScale = 1;
        this.world.forceReveal = true;
        const p = this.world.player;
        this.hud.showEnd(win, win ? `TE QUEDAN ${p.hp} DE ${p.maxHp}` : '¡A LA PRÓXIMA!');
        this.sfx.play(win ? 'win' : 'lose');
        if (win) this.particles.burst(p.x, 0.8, p.z, 90, CONFETTI, { speed: 4, up: 9, size: 0.14, ttl: 2.4, grav: 9 });
    }

    // ---------- Bucle ----------
    frame(now) {
        requestAnimationFrame(this.frame);
        const dt = Math.min((now - this.last) / 1000, CONFIG.sim.maxFrame);
        this.last = now;
        this.time += dt;
        let simDt = dt * this.timeScale;
        if (this.hitStop > 0) {
            this.hitStop -= dt;
            simDt = 0;
        }
        if (this.world) {
            this.update(dt, simDt);
            this.draw(dt, simDt);
        }
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
                if (!w.player.alive) this.endMatch(false);
                else if (w.aliveEnemies() === 0) this.endMatch(true);
                break;
            case 'outro':
                this.stepWorld(simDt, false);
                if (this.stateTime >= CONFIG.match.slowmoTime) this.finish();
                break;
            case 'end':
                this.stepWorld(simDt, false);
                break;
        }

        const p = w.player, e = w.enemies()[0];
        this.hud.setHp('p', p.hp, p.maxHp);
        if (e) this.hud.setHp('e', e.hp, e.maxHp);
        this.hud.setStealth(p.reveal > 0 || w.forceReveal);
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
        const item = w.pickups && w.pickups.current;
        this.pickupView.sync(item, w.pickups && w.pickups.rules, this.time);
        // El objeto de la bala de fuego también echa llamas
        if (item && item.kind === 'power' && (this.itemFireT = (this.itemFireT || 0) - dt) <= 0) {
            this.itemFireT = 0.05;
            this.particles.spawn(item.x + (Math.random() - 0.5) * 0.2, 0.35, item.z + 0.15, 0, 1.4 + Math.random(), 0,
                0.07 + Math.random() * 0.07, 0.35, FLAMES[(Math.random() * FLAMES.length) | 0], -2);
        }
        this.particles.update(simDt);
        this.particles.sync();
        this.bullets.sync(this.time);
        this.waves.update(simDt);
        this.markers.update(dt, this.time);
        this.updateCamera();
        this.rig.update(dt);
        this.renderer.render(this.scene, this.rig.camera, dt);
    }

    updateCamera() {
        const w = this.world;
        if (this.state === 'menu') {
            this.rig.yawTarget = Math.sin(this.time * 0.25) * 0.35;
            this.rig.focus(w.arena.cols / 2, w.arena.rows / 2 + Math.sin(this.time * 0.18) * 3);
        } else if (this.state === 'outro' && this.fallen) {
            this.rig.zoomTarget = 0.8;
            this.rig.focus(this.fallen.x, this.fallen.z);
        } else {
            this.rig.zoomTarget = 1;
            this.rig.focus(w.player.x, w.player.z);
        }
    }

    // Visibilidad desde el punto de vista del jugador + animación de modelos.
    syncTanks(dt) {
        const w = this.world, player = w.player, stealth = CONFIG.stealth;
        const playing = this.state === 'play';
        for (const tank of w.tanks) {
            let target;
            if (!playing || w.forceReveal) target = 1;
            else if (tank === player) target = tank.reveal > 0 ? 1 : stealth.playerGhost;
            else target = player.intel.get(tank)?.visible ? 1 : 0;
            tank.viewFade = approach(tank.viewFade, target, stealth.fadeSpeed * dt);
            tank.model.sync(dt, tank, tank.viewFade, this.rig.camera);

            if (tank.moving && tank.viewFade > 0.5) {
                tank.dustT = (tank.dustT || 0) - dt;
                if (tank.dustT <= 0) {
                    tank.dustT = 0.07;
                    const bx = tank.x - Math.sin(tank.yaw) * 0.4, bz = tank.z - Math.cos(tank.yaw) * 0.4;
                    this.particles.spawn(bx + (Math.random() - 0.5) * 0.5, 0.08, bz, 0, 0.6, 0, 0.14, 0.4, this.theme.dust, -0.5);
                }
            }

            // Siguiente bala potenciada: el cañón echa fuego
            if (tank.alive && tank.damageMult > 1 && tank.viewFade > 0.4) {
                tank.fireT = (tank.fireT || 0) - dt;
                if (tank.fireT <= 0) {
                    tank.fireT = 0.018;
                    const mx = tank.x + Math.sin(tank.aimYaw) * 0.66, mz = tank.z + Math.cos(tank.aimYaw) * 0.66;
                    const j = () => (Math.random() - 0.5) * 0.22;
                    this.particles.spawn(mx + j(), 0.55 + j(), mz + j(), 0, 1.2 + Math.random(), 0,
                        0.12 + Math.random() * 0.1, 0.35, FLAMES[(Math.random() * FLAMES.length) | 0], -3);
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
            if (playing && tank.alive && info && !seen && info.age < Infinity) {
                this.markers.ghost(tank.id, info.x, info.z, tank.def.palette.body, this.theme.outline, Math.max(0.35, 1 - info.age / 8));
            } else {
                this.markers.hideGhost(tank.id);
            }
        }
    }

    panOf(x) {
        return clamp((x - this.rig.x) / 7, -1, 1);
    }

    // ---------- Efectos (reacciones a eventos de la simulación) ----------
    bindEvents() {
        const ev = this.events;

        ev.on('shot', (tank, x, z) => {
            const pal = tank.def.palette;
            if (tank.viewFade > 0.3) {
                this.particles.burst(x, 0.45, z, 7, [0xffffff, pal.accent, pal.bullet], { speed: 2.5, up: 0.8, size: 0.1, ttl: 0.18, grav: 0 });
            }
            const mine = tank === this.world.player;
            this.sfx.play(mine ? 'shot' : 'shotEnemy', this.panOf(x));
            if (mine) this.rig.shake(0.06);
        });

        ev.on('reload', (tank) => {
            if (tank === this.world.player) this.sfx.play('reload');
        });

        ev.on('reloaded', (tank) => {
            if (tank === this.world.player) this.sfx.play('reloaded');
        });

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
            const mine = tank === this.world.player;
            this.particles.burst(item.x, 0.55, item.z, 18, [item.def.color, item.def.accent, 0xffffff], { speed: 3, up: 4, size: 0.12, ttl: 0.6, grav: 6 });
            this.waves.spawn(item.x, item.z, item.def.color, 1.6, 0.4);
            if (mine || tank.viewFade > 0.5) {
                if (item.kind === 'heal') {
                    this.markers.sprinkle(tank.x, tank.z, '+', item.def.color, this.theme.outline, 12);
                } else {
                    this.particles.burst(tank.x, 0.6, tank.z, 26, FLAMES, { speed: 2.5, up: 4, size: 0.16, ttl: 0.6, grav: -2 });
                }
            }
            if (mine) {
                this.sfx.play(item.kind === 'heal' ? 'heal' : 'power');
                this.renderer.flash(item.def.color, 0.25);
            } else {
                this.sfx.play('grabOther', this.panOf(item.x));
            }
        });

        ev.on('bulletWall', (x, z, color) => {
            this.particles.burst(x, 0.45, z, 6, [color, 0xffffff], { speed: 2.2, up: 1.5, size: 0.09, ttl: 0.3, grav: 9 });
            this.sfx.play('wall', this.panOf(x));
        });

        ev.on('hit', (tank, x, z, color, damage) => {
            const pal = tank.def.palette, mine = tank === this.world.player;
            if (damage > 1) {
                this.particles.burst(x, 0.5, z, 30, FLAMES, { speed: 5, up: 4, size: 0.2, ttl: 0.6, grav: -1 });
                this.waves.spawn(x, z, 0xff9a1f, 1.8, 0.4);
            }
            this.particles.burst(x, 0.5, z, 14, [color, pal.body, pal.accent, 0xffffff], { speed: 4, up: 3, size: 0.13, ttl: 0.5 });
            this.rig.shake(mine ? 0.4 : 0.2);
            this.hitStop = 0.05;
            if (mine) this.renderer.flash(0xff2060, 0.45);
            this.sfx.play(mine ? 'hurt' : 'hit', this.panOf(x));
        });

        ev.on('death', (tank) => {
            const pal = tank.def.palette;
            this.fallen = tank;
            this.particles.burst(tank.x, 0.4, tank.z, 46, [pal.body, pal.accent, pal.tread, pal.barrel], { speed: 6, up: 7, size: 0.2, ttl: 1.4, grav: 16 });
            this.particles.burst(tank.x, 0.5, tank.z, 30, FIRE, { speed: 3, up: 4, size: 0.24, ttl: 0.7, grav: -1 });
            this.waves.spawn(tank.x, tank.z, 0xffffff, 3.2, 0.5);
            this.waves.spawn(tank.x, tank.z, pal.accent, 2.2, 0.7);
            this.rig.shake(1);
            this.renderer.flash(0xffffff, 0.7);
            this.hitStop = 0.12;
            this.sfx.play('boom', this.panOf(tank.x));

            const scorch = new THREE.Mesh(
                new THREE.CircleGeometry(0.55, 8),
                new THREE.MeshBasicMaterial({ color: this.theme.scorch, transparent: true, opacity: 0.55, depthWrite: false })
            );
            scorch.position.set(tank.x, 0.015, tank.z);
            scorch.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI);
            this.world.root.add(scorch);
            this.world.arena.trash.push(scorch.material, scorch.geometry);
        });
    }
}
