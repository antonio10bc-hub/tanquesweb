import { CONFIG } from '../../config.js';
import { SURVIVAL } from '../../content/index.js';
import { waveSpecs, ENEMY_TYPES } from '../../content/survival.js';
import { UPGRADES, rollUpgrades } from '../../content/upgrades.js';
import { Profile } from '../Profile.js';
import { clamp } from '../math.js';
import { L } from '../I18n.js';

// Supervivencia: oleadas que caen del cielo, respiro entre oleadas y mini jefe cada 5.
// Métodos de Game (se mezclan en su prototipo desde core/Game.js): "this" es la partida.
export const SurvivalPart = {
    startSurvival(seed, themeId) {
        this.startMatch('supervivencia', seed, themeId);
    },

    updateSurvival(dt) {
        const w = this.world;
        if (!this.waveClear) {
            if (w.aliveEnemies() > 0 || this.dropping.length) return;
            // Oleada superada: respiro y curación (las minas que quedaban se desactivan). Tu
            // tanque se queda quieto y sin disparar hasta la siguiente oleada (mientras pasa el
            // avión y eliges la mejora no hay nada que hacer, y así no vuela ningún barril)
            this.waveClear = true;
            this.setInputs(false, true);
            w.player.cooldown = 1e9; // sin disparar hasta la siguiente oleada
            w.hazards.list = w.hazards.list.filter((h) => h.kind !== 'mine');
            if (this.miniBoss) {
                if (this.miniBoss.def.secretBoss) this.startMusic(); // vuelve la música del escenario
                this.miniBoss = null;
                this.hud.showBoss(null);
            }
            this.waveTimer = SURVIVAL.pause;
            this.hud.banner(L(`WAVE ${this.wave}!`, `¡OLEADA ${this.wave}!`), 'go');
            this.sfx.play('win');
            const p = w.player;
            const healed = Math.min(p.maxHp, p.hp + SURVIVAL.heal);
            if (healed > p.hp) {
                p.hp = healed;
                this.markers.sprinkle(p.x, p.z, '+', 0x17d65a, this.theme.outline, 10);
            }
            // Monedas: la oleada n da n (1, luego 2, luego 3...: 1, 3, 6... en total)
            const coins = this.wave;
            this.runCoins += coins;
            Profile.addCoins(coins);
            this.events.emit('coin', Profile.coins);
            this.sfx.play('coin');
            this.hud.toast(L(`+${coins} GOLD COIN${coins > 1 ? 'S' : ''}`, `+${coins} MONEDA${coins > 1 ? 'S' : ''} DE ORO`), 'coin');
            if (this.wave > Profile.data.stats.bestWave) {
                Profile.data.stats.bestWave = this.wave;
                this.newRecord = true;
                Profile.save();
            }
            this.events.emit('waveCleared', this.wave);
            this.supply = { phase: 'wait', t: 0 };
            return;
        }
        // Entre oleadas pasa el avión de suministros: hasta que eliges, no llega la siguiente
        if (this.supply) {
            this.updateSupply(dt);
            return;
        }
        this.waveTimer -= dt;
        if (this.waveTimer > 0) return;
        this.waveClear = false;
        this.wave++;
        if (!this.paused) this.setInputs(true);
        w.player.cooldown = w.player.weapon.firstShotDelay;
        const specs = waveSpecs(this.wave, this.themeId, SURVIVAL.maxEnemies);
        this.waveSize = specs.length;
        this.hud.setNames(w.player.def.name, L(`WAVE ${this.wave}`, `OLEADA ${this.wave}`));
        const boss = specs.find((s) => s.def.miniBoss);
        if (boss && boss.def.secretBoss) {
            // Oleada 25: el jefe secreto, con fogonazo de colores y su música
            this.hud.banner(L(`WAVE ${this.wave}`, `OLEADA ${this.wave}`));
            this.hud.showBoss(boss.def.name);
            this.renderer.flash(0xff8fd8, 0.6);
            this.rig.shake(0.6);
            this.sfx.play('roar');
            setTimeout(() => this.state === 'play' && this.hud.callout(L('SECRET BOSS!', '¡JEFE SECRETO!')), 900);
            this.music.start(boss.world.music, 7);
        } else if (boss) {
            // Cada 5 oleadas, el jefe del escenario en pequeño, con su barra de vida
            this.hud.banner(L(`WAVE ${this.wave}`, `OLEADA ${this.wave}`));
            this.hud.showBoss(boss.def.name);
            setTimeout(() => this.state === 'play' && this.hud.callout(L('MINI BOSS!', '¡MINI JEFE!')), 900);
            this.sfx.play('warn');
        } else {
            this.hud.banner(L(`WAVE ${this.wave}`, `OLEADA ${this.wave}`));
            this.sfx.play('go');
        }
        let intro = 0;
        this.events.emit('waveStart', this.wave, specs);
        // Mejora de escudo: cada oleada empieza con él puesto
        if (w.player.waveShield) w.player.shield = Math.max(w.player.shield, w.player.waveShield);
        specs.forEach((spec, i) => {
            const tank = w.spawn(spec, 'enemy', spec.brain, w.farSpot(spec.def.miniBoss ? SURVIVAL.minSpawnDist + 1 : SURVIVAL.minSpawnDist));
            tank.model.dropY = 9;
            tank.frozen = true;
            tank.reveal = 1.5; // al aterrizar se les ve un momento
            this.dropping.push({ tank, t: -i * 0.25 });
            if (spec.def.miniBoss) this.miniBoss = tank;
            // Un tipo nuevo se presenta: su nombre y cómo pelea, para que sepas qué hacer
            if (spec.type && !this.seenTypes.has(spec.type)) {
                this.seenTypes.add(spec.type);
                const type = ENEMY_TYPES[spec.type], wait = 1300 + (intro++) * 2800;
                setTimeout(() => {
                    if (this.state !== 'play') return;
                    this.hud.callout(L(`NEW: ${type.name}!`, `¡NUEVO: ${type.name}!`));
                    if (type.tell) this.hud.toast(type.tell);
                }, wait);
            }
        });
    },

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
    },

    // Avión de suministros: cruza la arena, suelta una caja cerca de ti y al abrirse eliges una
    // de tres mejoras. Si ya están todas al máximo, no pasa.
    updateSupply(dt) {
        const s = this.supply, w = this.world, p = w.player;
        s.t += dt;
        if (s.phase === 'wait' && s.t > 0.9) {
            s.options = rollUpgrades(this.upgrades);
            if (!s.options.length) {
                this.supply = null;
                return;
            }
            const at = w.arena.randomFloorNear(p.x, p.z, 1, 2.2) || { x: p.x, z: p.z };
            s.at = at;
            this.plane.start(w.arena, at.x, at.z);
            this.sfx.play('plane');
            s.phase = 'plane';
        }
        if (s.phase === 'plane' || s.phase === 'choose' || s.phase === 'done') {
            if (this.plane.update(dt, this.time) === 'landed') {
                // La caja cae y se abre: polvo, chispas y las tres mejoras
                this.sfx.play('drop', this.panOf(s.at.x));
                this.sfx.play('itemSpawn', this.panOf(s.at.x));
                this.particles.burst(s.at.x, 0.4, s.at.z, 26, [0xb8763a, 0xffd23f, 0xffffff], { speed: 3, up: 4, size: 0.12, ttl: 0.7, grav: 12 });
                this.waves.spawn(s.at.x, s.at.z, 0xffffff, 1.6, 0.4);
                s.phase = 'choose';
                this.hud.showUpgrades(s.options.map((id) => ({ id, ...UPGRADES[id], level: this.upgrades[id] || 0 })), (id) => this.applyUpgrade(id));
            }
        }
        if (s.phase === 'done' && s.t > s.until) {
            this.plane.stop();
            this.supply = null;
            this.waveTimer = 0.8;
        }
    },

    applyUpgrade(id) {
        const p = this.world.player, lvl = (this.upgrades[id] = (this.upgrades[id] || 0) + 1);
        UPGRADES[id].apply(p, lvl, this.upgradeBase);
        this.sfx.play('heal');
        this.particles.burst(p.x, 0.6, p.z, 30, [0xffd23f, 0xffffff, 0x23e0d6], { speed: 2.5, up: 5, size: 0.1, ttl: 0.8, grav: 8 });
        this.markers.sprinkle(p.x, p.z, '+', 0xffd23f, this.theme.outline, 8);
        this.events.emit('upgrade', id, lvl);
        if (this.supply) {
            this.supply.phase = 'done';
            this.supply.until = this.supply.t + 1.0;
        }
    },
};
