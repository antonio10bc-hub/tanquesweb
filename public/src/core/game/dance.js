import { DANCES, DANCE_BY_ID } from '../../content/dances.js';
import { danceTime, dancePose, danceFx, newPose, DANCE_SFX, DANCE_SHAKE } from '../../render/dance.js';
import { Profile } from '../Profile.js';

// Baile de victoria: tras la repetición, la cámara se acerca al ganador, baila y sale volando;
// en la pantalla final vuelve a caer del cielo a su sitio. Tocar la pantalla lo salta.
// Métodos de Game (se mezclan en su prototipo desde core/Game.js): "this" es la partida.
const LAND = { delay: 0.15, fall: 0.5 };
const LEAD = 0.35; // la cámara se acerca antes de que empiece a bailar

export const DancePart = {
    // Tras la repetición (o si no la hay): baile si alguien ha ganado, si no el final directo
    afterReplay() {
        const tank = this.danceTank();
        if (!tank) return this.showEnd();
        this.setState('dance');
        this.timeScale = 1;
        this.hud.showReplay(false);
        this.world.forceReveal = true;
        tank.moving = false;
        const mine = tank === this.world.player;
        this.dance = { tank, def: DANCE_BY_ID[mine ? Profile.data.dance : ''] || DANCES[0], pose: newPose(), sfxAt: {} };
        tank.model.pose = this.dance.pose;
    },

    // Quién baila: tú al ganar; en el duelo, el ganador (el jugador 2 con el cohete)
    danceTank() {
        if (this.mode === 'tutorial' || this.mode === 'survival') return null;
        if (!this.result && this.mode !== 'duel') return null;
        const tank = this.mode === 'duel' && !this.result ? this.world.enemies()[0] : this.world.player;
        return tank && tank.alive ? tank : null;
    },

    updateDance() {
        const d = this.dance, t = Math.max(0, this.stateTime - LEAD);
        dancePose(d.def, t, d.pose, (kind, y, a) => {
            const snd = DANCE_SFX[kind];
            if (snd) {
                const last = d.sfxAt[kind] ?? -1;
                if (last < 0 || t - last >= snd[1]) {
                    d.sfxAt[kind] = t;
                    this.sfx.play(snd[0]);
                }
            }
            if (DANCE_SHAKE[kind]) this.rig.shake(DANCE_SHAKE[kind]);
            danceFx(this.particles, kind, d.tank.x + d.pose.dx, y, d.tank.z + d.pose.dz, d.tank.model.scale, a);
        });
        if (t >= danceTime(d.def)) this.endDance();
    },

    endDance() {
        const d = this.dance;
        if (!d) return;
        this.dance = null;
        d.tank.model.pose = null;
        d.tank.model.dropY = 9;
        this.landing = { tank: d.tank, t: 0 };
        this.showEnd();
    },

    // Pantalla final: el que bailó vuelve a caer del cielo a su sitio
    updateLanding(dt) {
        const l = this.landing;
        if (!l) return;
        l.t += dt;
        const k = Math.min(1, Math.max(0, (l.t - LAND.delay) / LAND.fall));
        l.tank.model.dropY = 9 * (1 - k) * (1 - k);
        if (k >= 1) {
            this.landing = null;
            this.landed(l.tank);
        }
    },
};
