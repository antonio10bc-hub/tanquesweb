import * as THREE from 'three';
import { COMMON_WALLS } from '../../world/Arena.js';
import { FIRE as FLAMES } from '../../world/Bullets.js';
import { vibrate } from '../Haptics.js';
import { clamp } from '../math.js';
import { L } from '../I18n.js';
import { FIRE, SPARKS, TURBO, NUKE, TRIPLE, DECOY } from './constants.js';

// Efectos: reacciones visuales y sonoras a los eventos de la simulación (disparos, impactos, muertes, objetos, bombas).
// Métodos de Game (se mezclan en su prototipo desde core/Game.js): "this" es la partida.
export const EffectsPart = {
    panOf(x) {
        return clamp((x - this.rig.x) / 7, -1, 1);
    },

    // Apunta un impacto para que la repetición lo vuelva a pintar (solo mientras se juega:
    // es lo único que se graba)
    rec(kind, data) {
        if (this.state === 'play') this.recorder.note(kind, data);
    },

    deathFx(tank, scorch = true) {
        const pal = tank.def.palette;
        this.particles.burst(tank.x, 0.4, tank.z, 46, [pal.body, pal.accent, pal.tread, pal.barrel], { speed: 6, up: 7, size: 0.2, ttl: 1.4, grav: 16 });
        this.particles.burst(tank.x, 0.5, tank.z, 30, FIRE, { speed: 3, up: 4, size: 0.24, ttl: 0.7, grav: -1 });
        this.waves.spawn(tank.x, tank.z, 0xffffff, 3.2, 0.5);
        this.waves.spawn(tank.x, tank.z, pal.accent, 2.2, 0.7);
        this.rig.shake(1);
        this.renderer.flash(0xffffff, 0.7);
        this.sfx.play('boom', this.panOf(tank.x));
        this.music.duck(0.6, 0.9);
        if (!scorch) return;
        const mark = new THREE.Mesh(
            new THREE.CircleGeometry(0.55, 8),
            new THREE.MeshBasicMaterial({ color: this.theme.scorch, transparent: true, opacity: 0.55, depthWrite: false })
        );
        mark.position.set(tank.x, 0.015, tank.z);
        mark.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI);
        this.world.root.add(mark);
        this.world.arena.trash.push(mark.material, mark.geometry);
    },

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
            // La bomba nuclear avisa con su alarma: es el objeto que más cambia la partida
            this.sfx.play(item.kind === 'nuke' ? 'nukeSpawn' : 'itemSpawn', this.panOf(item.x));
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
                const SOUNDS = { heal: 'heal', power: 'power', shield: 'shieldGet', turbo: 'turbo', bounce: 'bounceGet', radar: 'radar', nuke: 'nukeGet', triple: 'triple', decoy: 'decoy' };
                this.sfx.play(SOUNDS[item.kind] || 'heal');
                this.renderer.flash(d.color, 0.25);
                vibrate('pickup');
            } else {
                this.sfx.play('grabOther', this.panOf(item.x));
            }
        });

        ev.on('bulletWall', (x, z, color) => {
            this.rec('wall', { x, z, color });
            this.particles.burst(x, 0.45, z, 6, [color, 0xffffff], { speed: 2.2, up: 1.5, size: 0.09, ttl: 0.3, grav: 9 });
            this.sfx.play('wall', this.panOf(x));
        });

        ev.on('bulletBounce', (x, z) => {
            this.particles.burst(x, 0.45, z, 8, SPARKS, { speed: 2.5, up: 1.5, size: 0.08, ttl: 0.3, grav: 4 });
            this.sfx.play('boing', this.panOf(x));
        });

        ev.on('tileHit', (c, r, res, color, style = 'crate') => {
            const st = this.theme.walls[style] || COMMON_WALLS[style] || this.theme.walls.crate, x = c + 0.5, z = r + 0.5;
            this.rec('tile', { x, z, broken: res === 'broken', top: st.top, side: st.side });
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
            this.rec('shield', { x: tank.x, z: tank.z });
            this.particles.burst(tank.x, 0.5, tank.z, 24, [0x6fd0ff, 0xffffff, 0x3fa9ff], { speed: 4, up: 3, size: 0.12, ttl: 0.5, grav: 6 });
            this.waves.spawn(tank.x, tank.z, 0x6fd0ff, 1.4, 0.35);
            this.sfx.play('shield', this.panOf(x));
            if (mine(tank)) vibrate('shield');
        });

        ev.on('hit', (tank, x, z, color, damage) => {
            if (tank === this.world.player) this.damageTaken += damage;
            const pal = tank.def.palette, me = mine(tank);
            this.rec('hit', { x, z, color, damage, body: pal.body, accent: pal.accent });
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

        ev.on('barrelBoom', (x, z, R) => {
            this.rec('barrel', { x, z, R });
            this.barrelFx(x, z, R);
        });

        // Señuelo: una nube de humo al soltarlo (tapa el cambio) y un "¡puf!" al deshacerse
        ev.on('decoy', (d) => {
            this.particles.burst(d.x, 0.5, d.z, 34, DECOY, { speed: 2.4, up: 2, size: 0.24, ttl: 0.8, grav: -1 });
            this.waves.spawn(d.x, d.z, 0xb46bff, 1.4, 0.4);
        });
        ev.on('decoyPop', (d) => {
            this.particles.burst(d.x, 0.5, d.z, 30, DECOY, { speed: 3, up: 3, size: 0.2, ttl: 0.7, grav: 2 });
            this.markers.pop(d.x, 1.2, d.z, '?', 0xb46bff, this.theme.outline);
            this.sfx.play('decoyPop', this.panOf(d.x));
            this.markers.hideGhost(d.id);
        });

        // Rachas: destruir varios tanques seguidos (menos de 4 s entre uno y otro)
        ev.on('death', (tank, owner) => {
            const p = this.world.player;
            if (owner !== p || tank === p || tank.decoy) return;
            const now = this.time;
            this.streak = now - (this.lastKill ?? -99) < 4 ? (this.streak || 1) + 1 : 1;
            this.lastKill = now;
            if (this.streak < 2) return;
            const NAMES = ['', '', L('DOUBLE!', '¡DOBLE!'), L('TRIPLE!', '¡TRIPLE!'), L('QUADRUPLE!', '¡CUÁDRUPLE!')];
            this.hud.streak(NAMES[this.streak] || L('UNSTOPPABLE!', '¡IMPARABLE!'), this.streak);
            this.sfx.play(`streak${Math.min(this.streak, 5)}`);
            if (this.streak >= 5) this.renderer.flash(0xffe03a, 0.3);
        });

        ev.on('death', (tank) => {
            if (this.boss && tank.team !== 'player' && tank !== this.boss && this.fallen === this.boss) return;
            this.fallen = tank;
            this.hitStop = 0.12;
            this.deathFx(tank);
            vibrate(mine(tank) ? 'dead' : 'kill');
            if (tank === this.boss) this.bossDeath(tank);
        });

        this.bindBossEvents();
    },


    // Explosión de un barril de TNT (scorch: deja la quemadura; en la repetición ya está)
    barrelFx(x, z, R, scorch = true) {
        this.particles.burst(x, 0.4, z, 50, FIRE, { speed: R * 3, up: 5, size: 0.22, ttl: 0.7, grav: 4 });
        this.particles.burst(x, 0.8, z, 20, [0x5a4a6a, 0x8a7a9a], { speed: 1.5, up: 4, size: 0.3, ttl: 1.1, grav: -1 });
        this.waves.spawn(x, z, 0xffe03a, R, 0.45);
        this.waves.spawn(x, z, 0xff3e1f, R * 1.3, 0.7);
        this.rig.shake(0.6);
        this.renderer.flash(0xffb03a, 0.35);
        this.hitStop = Math.max(this.hitStop, 0.05);
        this.sfx.play('boom', this.panOf(x));
        if (!scorch) return;
        vibrate('crate');
        const mark = new THREE.Mesh(new THREE.CircleGeometry(R * 0.7, 10),
            new THREE.MeshBasicMaterial({ color: this.theme.scorch, transparent: true, opacity: 0.45, depthWrite: false }));
        mark.position.set(x, 0.014, z);
        mark.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI);
        this.world.root.add(mark);
        this.world.arena.trash.push(mark.material, mark.geometry);
    },

    // Triple toque en tu barra de vida: gana la partida. Contra un jefe, primero fuerza su fase 2
    // y a la siguiente gana; en supervivencia supera la oleada; en el tutorial pasa de paso.
    // Impacto de algo que cae del cielo (meteorito, carámbano)
    hazardBoomFx(h) {
        const cols = h.style === 'meteor' || h.style === 'mine' ? FIRE.concat([0x3a2a30]) : [0xffffff, 0x9fefff, 0x6fd0ff];
        this.particles.burst(h.x, 0.4, h.z, 26, cols, { speed: 4, up: 5, size: 0.16, ttl: 0.7, grav: 14 });
        this.waves.spawn(h.x, h.z, h.color, h.r + 0.5, 0.4);
        this.rig.shake(0.3);
        this.sfx.play('crash', this.panOf(h.x));
    },

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
        this.music.duck(0.85, 1.6);
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
    },

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
            case 'bounce':
                this.particles.burst(x, 0.6, z, 24, SPARKS, { speed: 3, up: 5, size: 0.1, ttl: 0.6, grav: 10 });
                break;
            case 'radar':
                this.waves.spawn(x, z, d.color, 9, 0.9);
                break;
            case 'nuke':
                this.particles.burst(x, 0.6, z, 24, NUKE, { speed: 2.5, up: 4, size: 0.12, ttl: 0.6, grav: 6 });
                break;
            case 'triple':
                this.particles.burst(x, 0.6, z, 24, TRIPLE, { speed: 3, up: 3, size: 0.1, ttl: 0.5, grav: 6 });
                break;
        }
    },

    landed(tank) {
        this.particles.burst(tank.x, 0.1, tank.z, 16, [this.theme.dust, 0xffffff], { speed: 3.5, up: 1.5, size: 0.16, ttl: 0.5, grav: 4 });
        this.waves.spawn(tank.x, tank.z, 0xffffff, 1.6, 0.35);
        this.rig.shake(0.35);
        this.sfx.play('drop', this.panOf(tank.x));
    },
};
