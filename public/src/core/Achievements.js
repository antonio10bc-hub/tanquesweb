import { ACHIEVEMENTS, SKIN_BY_ID } from '../content/index.js';
import { Profile } from './Profile.js';
import { trackAchievement } from './GameAnalytics.js';

// Vigila los eventos del juego, actualiza las estadísticas (también las de la pantalla de
// estadísticas) y desbloquea logros.
export class Achievements {
    constructor(game) {
        this.game = game;
        this.match = { damaged: false };
        const ev = game.events;
        const player = () => game.world && game.world.player;

        const st = () => Profile.data.stats;
        // Las estadísticas son de tus partidas: ni el tutorial ni los duelos a dos
        const counts = () => game.mode !== 'tutorial' && game.mode !== 'duel';

        ev.on('matchStart', () => {
            this.match = { damaged: false };
            this.wave = null;
        });
        // Supervivencia: lo que pasa en cada oleada (para los logros de minador y mini jefe)
        ev.on('waveStart', (n, specs) => {
            this.wave = {
                miner: specs.some((s) => s.type === 'miner'),
                boss: specs.some((s) => s.def.miniBoss),
                mineHurt: false,
                hurt: false,
            };
        });
        ev.on('shot', (tank) => tank === player() && counts() && st().shots++);
        ev.on('hit', (tank, x, z, color, damage, owner, cause) => {
            if (tank === player()) {
                this.match.damaged = true;
                if (this.wave) {
                    this.wave.hurt = true;
                    if (cause === 'hazard' && owner && owner.def.type === 'miner') this.wave.mineHurt = true;
                }
            }
            else if (owner === player() && tank.team !== 'player' && counts()) st().hits++;
        });
        ev.on('death', (tank, owner, cause) => {
            if (!counts()) return;
            if (tank === player()) st().deaths++;
            if (owner !== player() || tank.team === 'player') return;
            st().kills++;
            if (tank.def.frontArmor) this.unlock('flanker');
            if (tank.def.type === 'sniper') st().snipers++;
            if (tank.def.miniBoss && this.wave && this.wave.boss && !this.wave.hurt) this.unlock('giant_slayer');
            if (tank.def.secretBoss) this.unlock('pocket_prism');
            if (cause === 'nuke') this.unlock('nuke_kill');
            if (cause === 'bounce') this.unlock('bounce_kill');
            if (owner.inBush) this.unlock('bush_kill');
        });
        ev.on('tileHit', (c, r, res, color, style, owner) => {
            if (res !== 'broken' || owner !== player()) return;
            Profile.data.stats.cratesBroken++;
            this.check();
        });
        ev.on('pickup', (tank, item) => {
            if (tank === player() && counts()) st().pickups++;
            if (tank !== player() || Profile.data.stats.pickupKinds.includes(item.kind)) return;
            Profile.data.stats.pickupKinds.push(item.kind);
            this.check();
        });
        ev.on('matchEnd', ({ win, mode, world }) => {
            const s = st();
            if (mode === 'tutorial') this.unlock('graduate');
            if (mode === 'duel') this.unlock('duelist');
            if (mode === 'duel') s.duels++;
            else if (mode !== 'tutorial') {
                s.matches++;
                if (win) s.victories++;
                else if (mode !== 'survival') s.losses++;
                if (mode === 'campaign') s.bossTries++;
                s.playTime += Math.round(game.playTime || 0);
                s.bestStreak = Math.max(s.bestStreak, s.streak);
            }
            if (mode === 'quick' && win) {
                this.unlock('first_win');
                if (!this.match.damaged) this.unlock('untouched');
            }
            if (mode === 'campaign' && win) {
                this.unlock('boss1');
                if (world === 'secret') this.unlock('prisma');
            }
            if (win && mode !== 'duel' && mode !== 'tutorial' && player().hp === 1) this.unlock('clutch');
            this.check();
        });
        ev.on('waveCleared', () => {
            st().wavesCleared++;
            if (this.wave && this.wave.miner && !this.wave.mineHurt) this.unlock('deminer');
            this.check();
        });
        ev.on('coin', () => this.check());
    }

    // Al equipar una skin desde Mi Tanque
    equipped(id) {
        const skin = SKIN_BY_ID[id];
        if (skin && skin.hat) this.unlock('fashion');
        if (skin && skin.gold) this.unlock('golden');
    }

    // Revisa los logros con barra de progreso.
    check() {
        const s = Profile.data.stats;
        for (const a of ACHIEVEMENTS) {
            if (!a.progress || Profile.unlocked(a.id)) continue;
            const [v, goal] = a.progress(s);
            if (v >= goal) this.unlock(a.id);
        }
        Profile.save();
    }

    unlock(id) {
        if (!Profile.unlock(id)) return;
        trackAchievement(id);
        const a = ACHIEVEMENTS.find((x) => x.id === id);
        this.game.hud.achievement(a.name, a.desc, a.id);
        this.game.sfx.play('achievement');
    }
}

export function achievementCount() {
    return [ACHIEVEMENTS.filter((a) => Profile.unlocked(a.id)).length, ACHIEVEMENTS.length];
}
