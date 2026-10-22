import { ACHIEVEMENTS, SKIN_BY_ID } from '../content/index.js';
import { Profile } from './Profile.js';

// Vigila los eventos del juego, actualiza las estadísticas y desbloquea logros.
export class Achievements {
    constructor(game) {
        this.game = game;
        this.match = { damaged: false };
        const ev = game.events;
        const player = () => game.world && game.world.player;

        ev.on('matchStart', () => (this.match = { damaged: false }));
        ev.on('hit', (tank) => tank === player() && (this.match.damaged = true));
        ev.on('death', (tank, owner, cause) => {
            if (owner !== player() || tank.team === 'player') return;
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
            if (tank !== player() || Profile.data.stats.pickupKinds.includes(item.kind)) return;
            Profile.data.stats.pickupKinds.push(item.kind);
            this.check();
        });
        ev.on('matchEnd', ({ win, mode }) => {
            if (mode === 'quick' && win) {
                this.unlock('first_win');
                if (!this.match.damaged) this.unlock('untouched');
            }
            if (win && player().hp === 1) this.unlock('clutch');
            this.check();
        });
        ev.on('waveCleared', () => this.check());
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
        const a = ACHIEVEMENTS.find((x) => x.id === id);
        this.game.hud.toast(`LOGRO: ${a.name}`, 'trophy');
        this.game.sfx.play('achievement');
    }
}

export function achievementCount() {
    return [ACHIEVEMENTS.filter((a) => Profile.unlocked(a.id)).length, ACHIEVEMENTS.length];
}
