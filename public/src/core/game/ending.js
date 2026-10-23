import { CONFIG } from '../../config.js';
import { WORLD_BY_ID } from '../../content/index.js';
import { Profile } from '../Profile.js';
import { L } from '../I18n.js';
import { CONFETTI, REPLAY, STARS } from './constants.js';

// Final de partida: cámara lenta, repetición del golpe final y pantalla de resultado (récords, estrellas, monedas).
// Métodos de Game (se mezclan en su prototipo desde core/Game.js): "this" es la partida.
export const EndingPart = {
    endMatch(win) {
        // El impacto final puede caer entre dos fotogramas de la grabación: se graba siempre,
        // si no la repetición acabaría justo antes de que la bala llegue y sin explosión.
        this.recorder.record(0, this.world, this.bullets, true);
        this.result = win;
        this.setState('outro');
        this.timeScale = CONFIG.match.slowmo;
        this.setInputs(false);
        this.music.stop(1);
    },

    // Tras la cámara lenta, la repetición del golpe final (si hay grabación).
    startReplay() {
        if (this.recorder.duration < 0.5) {
            this.world.hazards.clear();
            return this.showEnd();
        }
        this.setState('replay');
        this.timeScale = 1;
        this.hud.showReplay(true);
        this.particles.clear();
        this.replayLen = Math.min(REPLAY.length, this.recorder.duration);
        this.replayFrom = this.recorder.duration - this.replayLen;
        this.replayAlive = this.world.tanks.map(() => true);
        this.replayNukes = new Map();
        this.recorder.rewind();
    },

    updateReplay() {
        const t = Math.min(this.stateTime * REPLAY.speed, this.replayLen);
        // Los ataques del jefe también se repiten: los impactos vuelven a sonar y temblar
        for (const n of this.recorder.apply(this.replayFrom + t, this.world, this.bullets)) {
            if (n.kind === 'hazardBoom') this.hazardBoomFx(n.data);
        }
        const live = new Set(this.world.nukes.map((n) => n.id));
        for (const [id, n] of this.replayNukes) if (!live.has(id)) { this.nukeFx(n, false); this.replayNukes.delete(id); }
        for (const n of this.world.nukes) this.replayNukes.set(n.id, n);
        this.world.tanks.forEach((tank, i) => {
            if (this.replayAlive[i] && !tank.alive) this.deathFx(tank, false);
            this.replayAlive[i] = tank.alive;
        });
        // Se queda un poco más tras el golpe para ver la explosión entera
        if (this.stateTime * REPLAY.speed > this.replayLen + 0.8) this.showEnd();
    },

    showEnd() {
        const win = this.result;
        this.setState('end');
        this.timeScale = 1;
        this.hud.showReplay(false);
        this.hud.showHint(false);
        this.bullets.clear();
        this.world.nukes.length = 0;
        this.world.hazards.clear();
        this.world.forceReveal = true;
        for (const t of this.world.tanks) t.alive = t.hp > 0;
        const p = this.world.player;
        const st = Profile.data.stats;
        if (this.mode === 'tutorial') {
            this.finishTutorial();
            this.hud.showEnd(true, L('YOU KNOW THE BASICS: LET\'S PLAY!', 'YA SABES LO BÁSICO: ¡A JUGAR!'), L('TUTORIAL COMPLETE!', '¡TUTORIAL COMPLETADO!'));
        } else if (this.mode === 'duel') {
            this.hud.showEnd(true, win ? L('PLAYER 2 IS DOWN', 'EL JUGADOR 2 HA CAÍDO') : L('PLAYER 1 IS DOWN', 'EL JUGADOR 1 HA CAÍDO'), win ? L('P1 WINS!', '¡GANA EL J1!') : L('P2 WINS!', '¡GANA EL J2!'));
        } else if (this.mode === 'campaign') {
            const w = WORLD_BY_ID[this.worldId], hard = this.hard;
            if (win) {
                const first = Profile.beat(w.id, hard);
                this.justBeaten = first ? w.id : null;
                // Estrellas: ganar, perder poca vida y ganar rápido
                const par = hard ? STARS.parHard : STARS.par;
                const got = [true, this.damageTaken <= STARS.maxDamage, this.playTime < par];
                const stars = got.filter(Boolean).length;
                const prevBest = Profile.stars(w.id, hard);
                const best = Profile.setStars(w.id, stars, hard);
                this.lastStars = stars;
                // Las monedas solo se ganan aquí: una por cada estrella nueva de este jefe
                const reward = Math.max(0, best - prevBest);
                st.bosses = Profile.data.campaign.beaten.filter((id) => !WORLD_BY_ID[id].secret).length;
                st.stars = Object.values(Profile.data.campaign.stars).reduce((a, b) => a + b, 0);
                st.hardBosses = Profile.data.campaign.hard.beaten.length;
                Profile.save();
                const sub = w.secret && !hard ? L('YOU HAVE COMPLETED THE CAMPAIGN!', '¡HAS COMPLETADO LA CAMPAÑA!') : L(`${w.tank.name} IS DOWN`, `${w.tank.name} HA CAÍDO`);
                const end = () => {
                    this.hud.showEnd(true, sub, hard ? L('NIGHTMARE BEATEN!', '¡PESADILLA SUPERADA!') : L('BOSS DEFEATED!', '¡JEFE DERROTADO!'));
                    // Al ganar, solo se vuelve al mapa (allí se ve cómo se abre el siguiente mundo)
                    this.hud.endButtons(null, L('BACK TO THE MAP', 'VOLVER AL MAPA'));
                    this.hud.showStars(got, best, par, (k) => this.sfx.play(k < stars ? 'coin' : 'tick'));
                };
                if (reward > 0) {
                    // Primero las monedas vuelan al contador; después, con calma, el final con las estrellas
                    const before = Profile.coins, token = ++this.endToken;
                    Profile.addCoins(reward);
                    this.events.emit('coin', Profile.coins);
                    this.sfx.play('coin');
                    this.hud.coinReward(before, Profile.coins, {
                        onFly: () => this.sfx.play('itemSpawn'),
                        onLand: () => this.sfx.play('reloaded'),
                    }).then(() => {
                        if (this.endToken === token && this.state === 'end') end();
                    });
                } else {
                    end();
                }
            } else {
                this.hud.showEnd(false, L('TRY AGAIN!', '¡INTÉNTALO OTRA VEZ!'));
            }
        } else if (this.mode === 'survival') {
            const reached = this.wave - (this.waveClear ? 0 : 1);
            const sub = this.newRecord ? L('NEW RECORD!', '¡NUEVO RÉCORD!') : L(`RECORD: ${st.bestWave} WAVES`, `RÉCORD: ${st.bestWave} OLEADAS`);
            this.hud.showEnd(false, sub, L(`${reached} WAVE${reached === 1 ? '' : 'S'}`, `${reached} OLEADA${reached === 1 ? '' : 'S'}`));
        } else {
            st.streak = win ? st.streak + 1 : 0;
            if (win) st.wins++;
            Profile.save();
            if (win) {
                this.hud.showEnd(true, '');
            } else {
                this.hud.showEnd(false, L('NEXT TIME!', '¡A LA PRÓXIMA!'));
            }
        }
        this.events.emit('matchEnd', { win, mode: this.mode, wave: this.wave, world: this.worldId });
        this.sfx.play(win ? 'win' : 'lose');
        if (win) this.particles.burst(p.x, 0.8, p.z, 90, CONFETTI, { speed: 4, up: 9, size: 0.14, ttl: 2.4, grav: 9 });
    },
};
