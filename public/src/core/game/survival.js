import { CONFIG } from '../../config.js';
import { SURVIVAL } from '../../content/index.js';
import { waveSpecs, ENEMY_TYPES } from '../../content/survival.js';
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
            // Oleada superada: respiro y curación (las minas que quedaban se desactivan)
            this.waveClear = true;
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
            return;
        }
        this.waveTimer -= dt;
        if (this.waveTimer > 0) return;
        this.waveClear = false;
        this.wave++;
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
};
