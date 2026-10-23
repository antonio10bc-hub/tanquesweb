import { CONFIG } from '../../config.js';
import { GOLD_SPARKS } from '../../content/index.js';
import { weatherParticle } from '../../render/weather.js';
import { FIRE as FLAMES } from '../../world/Bullets.js';
import { approach } from '../math.js';
import { SPARKS, TURBO, NUKE, TRIPLE, REPLAY, PHASE, BOSS_INTRO } from './constants.js';

// Vista: dibujar cada fotograma, clima, cámara y tanques (fundido de sigilo, marcas).
// Métodos de Game (se mezclan en su prototipo desde core/Game.js): "this" es la partida.
export const ViewPart = {
    draw(dt, simDt) {
        const w = this.world;
        w.arena.update(dt, this.time);
        this.syncTanks(dt);
        const item = this.state === 'replay' ? null : w.pickups && w.pickups.current;
        this.pickupView.sync(item, w.pickups && w.pickups.rules, this.time);
        this.nukeView.sync(w.nukes, this.time);
        this.hazardView.sync(w.hazards.list, this.time, dt, w.arena);
        this.skulls.update(dt, this.time);
        this.tutorial.animate(this.time);
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
    },

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
            weatherParticle(this.particles, amb.kind, x, z, amb.colors[(Math.random() * amb.colors.length) | 0]);
        }
    },

    updateCamera() {
        const w = this.world;
        if (this.state === 'menu') {
            this.rig.yawTarget = Math.sin(this.time * 0.25) * 0.35;
            this.rig.focus(w.arena.cols / 2, w.arena.rows / 2 + Math.sin(this.time * 0.18) * 3);
        } else if (this.mode === 'tutorial' && this.state !== 'outro' && this.state !== 'replay') {
            // Tutorial: tablero quieto en la parte de abajo y los textos arriba, sin taparlo
            this.rig.free = true;
            this.rig.yawTarget = 0;
            this.rig.zoomTarget = 1;
            this.rig.focus(w.arena.cols / 2, w.arena.rows / 2 - this.tutorialLift());
        } else if (this.mode === 'duel' && this.state !== 'outro' && this.state !== 'replay') {
            // Duelo: los dos miran la misma pantalla, así que se ve la arena entera
            this.rig.free = true;
            this.rig.yawTarget = 0;
            this.rig.zoomTarget = Math.max(1, (w.arena.rows + 1.5) / (2 * this.rig.halfDepth)); // ancho y alto enteros
            this.rig.focus(w.arena.cols / 2, w.arena.rows / 2);
        } else if (this.state === 'intro' && this.boss && this.stateTime < BOSS_INTRO.back) {
            this.rig.free = true;
            this.rig.zoomTarget = this.stateTime > 0.5 ? 0.5 : 1;
            this.rig.yawTarget = 0.3;
            this.rig.focus(this.boss.x, this.boss.z);
        } else if (this.cutscene) {
            // Escena de la fase 2: primer plano del jefe y vuelta a tu tanque al final
            const c = this.cutscene, back = c.t >= PHASE.back;
            this.rig.free = !back;
            this.rig.zoomTarget = back ? 1 : 0.5;
            this.rig.yawTarget = back ? 0 : 0.25;
            this.rig.focus(back ? w.player.x : c.boss.x, back ? w.player.z : c.boss.z);
        } else if ((this.state === 'outro' || this.state === 'replay') && this.fallen) {
            this.rig.zoomTarget = this.state === 'replay' ? 0.7 : 0.8;
            this.rig.focus(this.fallen.x, this.fallen.z);
        } else {
            // Cámara normal (también al acabar la presentación del jefe, que la deja ladeada)
            this.rig.zoomTarget = 1;
            this.rig.yawTarget = 0;
            this.rig.focus(w.player.x, w.player.z);
        }
        if (!this.cutscene && this.mode !== 'duel' && this.mode !== 'tutorial' && !(this.state === 'intro' && this.boss && this.stateTime < BOSS_INTRO.back)) this.rig.free = false;
    },

    // Visibilidad desde el punto de vista del jugador + animación de modelos y sus efectos.
    syncTanks(dt) {
        const w = this.world, player = w.player, stealth = CONFIG.stealth;
        const playing = this.state === 'play';
        for (const tank of w.tanks) {
            let target;
            if (!playing || w.forceReveal) target = 1;
            else if (tank === player) target = tank.exposed ? 1 : tank.cloak > 0 ? 0.22 : stealth.playerGhost;
            else if (this.mode === 'duel') {
                // Duelo en un móvil: escondido se ve solo como una sombra tenue; disparar te delata
                target = tank.exposed ? 1 : tank.cloak > 0 ? 0.08 : tank.inBush ? 0.14 : 0.28;
            } else if (tank.decoy && tank.team === player.team) target = 0.8; // tu señuelo: lo ves siempre
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
            // Jefe del modo difícil: humo negro y chispas rojas a su alrededor
            if (tank.evil && shown && Math.random() < dt * 30) {
                const a = Math.random() * Math.PI * 2, rr = (0.5 + Math.random() * 0.4) * tank.model.scale;
                this.particles.spawn(tank.x + Math.sin(a) * rr, 0.1 + Math.random() * 0.4, tank.z + Math.cos(a) * rr, 0, 1 + Math.random(), 0,
                    0.08 + Math.random() * 0.1, 0.8, Math.random() < 0.55 ? 0x1a0008 : 0xff1a3a, -0.6);
            }
            // Jefe enfadado (fase 2): echa humo por la cabeza
            if (tank.angry && shown && Math.random() < dt * 14) {
                const sc = tank.model.scale;
                this.particles.spawn(tank.x + (Math.random() - 0.5) * 0.4 * sc, 1.05 * sc, tank.z + (Math.random() - 0.5) * 0.4 * sc,
                    (Math.random() - 0.5) * 0.6, 1.6, (Math.random() - 0.5) * 0.6, 0.12 + Math.random() * 0.1, 0.7, Math.random() < 0.5 ? 0xffffff : 0xff6a6a, -1);
            }

            // La hierba se mueve al pasar: la tuya siempre, la del rival solo si está cerca.
            if (playing && tank.inBush && tank.moving && (tank === player || Math.hypot(tank.x - player.x, tank.z - player.z) < 4)) {
                w.arena.rustle(tank.x, tank.z);
            }

            // Orugas: tu tanque siempre; los rivales cercanos también se oyen aunque no se vean
            if (playing && tank.alive && !tank.decoy && (tank.moving || Math.hypot(tank.vx, tank.vz) > 0.5)) {
                const near = tank === player ? 1 : Math.max(0, 1 - Math.hypot(tank.x - player.x, tank.z - player.z) / 4.5);
                tank.stepT = (tank.stepT || 0) - dt;
                if (near > 0 && tank.stepT <= 0) {
                    tank.stepT = tank.turbo > 0 ? 0.1 : 0.17;
                    const a = w.arena;
                    const surface = tank.inBush ? 'bush' : a.iceAt(tank.x, tank.z) ? 'ice' : undefined;
                    this.sfx.tread(tank === player ? 0 : this.panOf(tank.x), tank === player ? 1 : near * 0.8, surface);
                }
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
            const loaded = tank.nukeNext ? NUKE : tank.damageMult > 1 ? FLAMES : tank.bounceNext > 0 ? SPARKS : tank.tripleNext ? TRIPLE : null;
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

            if (tank === player || (tank.decoy && tank.team === player.team) || this.mode === 'duel') continue;
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
    },
};
