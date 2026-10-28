import { WORLD_BY_ID } from '../../content/index.js';
import { vibrate } from '../Haptics.js';
import { L } from '../I18n.js';
import { CONFETTI, FIRE, PHASE, BOSS_INTRO, HARD } from './constants.js';

// Jefes: presentación, eventos de sus ataques, escena de la fase 2, muerte y el botón secreto de depuración.
// Métodos de Game (se mezclan en su prototipo desde core/Game.js): "this" es la partida.
export const BossPart = {
    // Campaña: el combate contra el jefe de un mundo.
    startBoss(worldId, hard = false) {
        this.worldId = worldId;
        this.hard = hard;
        this.startMatch(`boss_${worldId}`);
        this.introPrev = -1;
    },

    // Presentación del jefe: se le acerca la cámara, hace su gesto (salto, giro de torreta y
    // rugido) y aparece su nombre con franjas, como en los juegos de lucha.
    updateBossIntro(t) {
        const b = this.boss, prev = this.introPrev ?? -1;
        const at = (s) => prev < s && t >= s;
        if (t < prev) this.introPrev = -1;
        if (at(BOSS_INTRO.card)) {
            const w = WORLD_BY_ID[this.worldId];
            this.sfx.play(this.hard ? 'hardSting' : 'bossSting');
            this.hud.bossIntro(b.def.name, this.def.tagline, this.hard ? L('HARD MODE', 'MODO DIFÍCIL') : L(`${w.name} BOSS`, `JEFE DE ${w.name}`), this.hard);
        }
        if (at(BOSS_INTRO.gesture)) {
            this.sfx.play('roar', this.panOf(b.x));
            this.rig.shake(0.5);
            this.waves.spawn(b.x, b.z, this.hard ? 0xff1a3a : 0xffffff, 2.4 * b.model.scale, 0.6);
        }
        const g = (t - BOSS_INTRO.gesture) / 0.9;
        if (g > 0 && g < 1) {
            b.model.dropY = Math.abs(Math.sin(g * Math.PI * 2)) * 0.5 * (1 - g);
            b.aimYaw = b.yaw + Math.sin(g * Math.PI * 2) * 1.2;
        }
        if (at(BOSS_INTRO.back)) b.aimYaw = b.yaw;
        this.introPrev = t;
    },

    bindBossEvents() {
        const ev = this.events;
        const SOUND = { charge: 'charge', wave: 'wave', storm: 'storm', ring: 'candy', icicles: 'whoosh', meteors: 'whoosh', summon: 'siren', laser: 'laser' };

        ev.on('bossCast', (tank, a) => {
            this.hud.callout(a.name);
            this.sfx.play('warn');
            vibrate('pickup');
            const sc = tank.model.scale;
            this.waves.spawn(tank.x, tank.z, 0xffffff, 1.4 * sc, a.cast);
            this.particles.burst(tank.x, 0.4, tank.z, 16, [tank.def.palette.accent, 0xffffff], { speed: 2.5, up: 3, size: 0.12, ttl: 0.5, grav: 6 });
        });

        ev.on('bossAttack', (tank, a) => {
            this.sfx.play(SOUND[a.id] || 'warn', this.panOf(tank.x));
            this.rig.shake(0.3);
            if (a.id === 'storm') {
                this.particles.burst(tank.x, 0.6, tank.z, 60, [0xfff0c4, 0xf4d08a, 0xe9b46a], { speed: 5, up: 3, size: 0.2, ttl: 1.2, grav: 0 });
                this.renderer.flash(0xf4d08a, 0.4);
            }
            if (a.id === 'summon') this.renderer.flash(0x2a6aff, 0.3);
        });

        ev.on('bossPhase', (tank) => {
            if (tank === this.boss) return this.startPhaseScene(tank);
            // Mini jefe de supervivencia: se enfada sin parar la partida
            tank.angry = true;
            tank.flash = 1;
            this.hud.callout(L('IT\'S ANGRY!', '¡SE HA ENFADADO!'));
            this.sfx.play('roar', this.panOf(tank.x));
            this.rig.shake(0.5);
            this.waves.spawn(tank.x, tank.z, 0xff2a2a, 3 * tank.model.scale, 0.7);
        });

        ev.on('mineArmed', (h) => this.sfx.play('warn', this.panOf(h.x)));

        ev.on('hazardBoom', (h) => {
            this.recorder.note('hazardBoom', h);
            this.hazardBoomFx(h);
        });

        ev.on('bossBump', (tank) => {
            this.rig.shake(0.7);
            this.sfx.play('drop', this.panOf(tank.x));
            this.particles.burst(tank.x, 0.3, tank.z, 24, [this.theme.dust, 0xffffff], { speed: 4, up: 3, size: 0.18, ttl: 0.6, grav: 8 });
        });

        // ROBOPATRULLA: sus drones caen del cielo cerca de él
        ev.on('summon', (boss, n, max) => {
            const w = this.world;
            const alive = w.tanks.filter((t) => t.alive && t.def.name === L('DRONE', 'DRON')).length;
            for (let i = 0; i < Math.min(n, max - alive); i++) {
                const at = w.arena.randomFloorNear(boss.x, boss.z, 1.6, 4) || w.farSpot(3);
                const tank = w.spawn({ tank: 'drone', params: { dodge: 0.15 } }, 'enemy', 'hunter', at);
                tank.model.dropY = 9;
                tank.frozen = true;
                tank.reveal = 1.5;
                this.dropping.push({ tank, t: -i * 0.25 });
            }
        });
    },

    // ---------- Escena de la fase 2 ----------
    // El combate se congela y no puedes moverte: la cámara se acerca al jefe, tiembla y echa
    // humo, ruge, se enfada (cejas), salta con una onda expansiva y sale "¡FASE 2!". Luego la
    // cámara vuelve a tu tanque y se sigue jugando.
    startPhaseScene(boss) {
        this.cutscene = { boss, t: 0, prev: 0, puff: 0 };
        this.setInputs(false);
        this.hud.showHint(false);
        // Balas y ataques en curso se borran: al volver, nadie recibe un golpe que no ha visto venir
        this.bullets.clear();
        this.world.hazards.clear();
        this.world.forceReveal = true;
        this.renderer.flash(0xffffff, 0.6);
        this.hitStop = 0.12;
        this.music.stop(0.25); // silencio para el rugido; el tema de la fase 2 entra con el cartel
        this.sfx.play('warn');
        vibrate('hurt');
    },

    updatePhaseScene(dt) {
        const c = this.cutscene, b = c.boss, m = b.model, sc = m.scale;
        const t = (c.t += dt), at = (s) => c.prev < s && t >= s;
        const pal = b.def.palette;
        // Tiembla de rabia y echa humo
        const shaking = t > PHASE.roar && t < PHASE.rage + 0.3;
        m.root.rotation.z = shaking ? Math.sin(t * 70) * 0.07 : 0;
        if (shaking) {
            this.rig.shake(dt * 2);
            if ((c.puff -= dt) <= 0) {
                c.puff = 0.06;
                for (let k = 0; k < 3; k++) {
                    this.particles.spawn(b.x + (Math.random() - 0.5) * 0.5 * sc, 1 * sc, b.z + (Math.random() - 0.5) * 0.5 * sc,
                        (Math.random() - 0.5) * 1.5, 2 + Math.random() * 1.5, (Math.random() - 0.5) * 1.5, 0.14 + Math.random() * 0.12, 0.7,
                        Math.random() < 0.5 ? 0xffffff : 0xff6a6a, -1);
                }
                b.flash = Math.floor(t * 8) % 2 ? 0.8 : 0;
            }
        }
        // Se hincha antes del estallido
        const swell = t > PHASE.roar && t < PHASE.rage ? (t - PHASE.roar) / (PHASE.rage - PHASE.roar) : 0;
        m.root.scale.setScalar(sc * (1 + swell * 0.18));
        // Salto con el estallido
        const hop = (t - PHASE.rage) / 0.5;
        m.dropY = hop > 0 && hop < 1 ? Math.sin(hop * Math.PI) * 0.9 : 0;

        if (at(PHASE.roar)) {
            this.sfx.play('roar', this.panOf(b.x));
            this.waves.spawn(b.x, b.z, 0xffffff, 1.6 * sc, 0.5);
        }
        if (at(PHASE.rage)) {
            b.angry = true;
            b.flash = 1;
            this.hud.banner(L('PHASE 2!', '¡FASE 2!'));
            this.startMusic();
            this.sfx.play('boom', this.panOf(b.x));
            this.rig.shake(1);
            this.renderer.flash(0xff2a2a, 0.7);
            vibrate('nuke');
            this.waves.spawn(b.x, b.z, 0xff2a2a, 3.4 * sc, 0.8);
            this.waves.spawn(b.x, b.z, 0xffffff, 2.2 * sc, 0.5);
            this.waves.spawn(b.x, b.z, pal.accent, 4.4 * sc, 1.1);
            this.particles.burst(b.x, 0.9 * sc, b.z, 60, [0xff2a2a, 0xffffff, 0xff9a1f, pal.accent], { speed: 6, up: 7, size: 0.2, ttl: 1, grav: 10 });
        }
        if (at(PHASE.rage + 0.5)) this.landed(b);
        if (t >= PHASE.end) {
            m.root.rotation.z = 0;
            m.root.scale.setScalar(sc);
            m.dropY = 0;
            this.cutscene = null;
            this.world.updateIntel(0);
            this.world.forceReveal = false;
            b.reveal = Math.max(b.reveal, 1.5);
            if (!this.paused) this.setInputs(true);
            this.sfx.play('go');
        }
        c.prev = t;
    },

    // El jefe cae: explosión enorme y sus drones se apagan con él.
    bossDeath(boss) {
        const sc = boss.model.scale;
        this.particles.burst(boss.x, 0.8, boss.z, 80, FIRE.concat(CONFETTI), { speed: 7, up: 9, size: 0.26, ttl: 1.6, grav: 12 });
        this.waves.spawn(boss.x, boss.z, 0xffffff, 4 * sc, 0.8);
        this.renderer.flash(0xffffff, 1);
        for (const t of this.world.tanks) {
            if (t === boss || t.team === 'player' || !t.alive) continue;
            t.hp = 0;
            t.alive = false;
            this.deathFx(t, false);
        }
    },

    debugWin() {
        if (this.state !== 'play' || this.cutscene || this.paused) return;
        const w = this.world, p = w.player;
        const kill = (t) => t.alive && w.hitTank(t, p, 999, 0, 1, t.x, t.z, 0xffffff);
        this.sfx.play('warn');
        if (this.mode === 'tutorial' && this.tutorial.step < 4) {
            this.tutorial.wait = 0;
            this.tutorial.next();
            return;
        }
        if (this.boss) {
            const b = this.boss;
            if (b.brain.phase === 1) {
                // Lo deja justo por encima de la mitad y un golpe lo pasa a la fase 2
                b.hp = Math.floor(b.maxHp / 2) + 1;
                w.hitTank(b, p, 1, 0, 1, b.x, b.z, 0xffffff);
            } else {
                kill(b);
            }
            return;
        }
        for (const t of w.tanks) if (t.team !== p.team && !t.decoy) kill(t);
        for (const d of this.dropping) d.tank.frozen = false;
    },
};
