import { CONFIG } from '../../config.js';
import { WORLD_BY_ID } from '../../content/index.js';
import { Profile } from '../Profile.js';
import { L } from '../I18n.js';
import { CONFETTI, FIRE, REPLAY, STARS } from './constants.js';

// Final de partida: cámara lenta, repetición del golpe final y pantalla de resultado (récords, estrellas, monedas).
// Métodos de Game (se mezclan en su prototipo desde core/Game.js): "this" es la partida.
// Monedas por ganar una partida rápida: 1, o 2 contra el rival difícil (las de supervivencia:
// survival.js; la campaña no da)
const QUICK_COIN = 1;
const QUICK_COIN_HARD = 2;

export const EndingPart = {
    endMatch(win) {
        // El impacto final puede caer entre dos fotogramas de la grabación: se graba siempre,
        // si no la repetición acabaría justo antes de que la bala llegue y sin explosión.
        this.recorder.record(0, this.world, this.bullets, true);
        this.result = win;
        this.hud.holdAchievements(true);
        this.setState('outro');
        this.timeScale = CONFIG.match.slowmo;
        this.setInputs(false);
        this.music.stop(1);
    },

    // Tras la cámara lenta, la repetición del golpe final (si hay grabación).
    startReplay() {
        if (this.recorder.duration < 0.5) {
            this.world.hazards.clear();
            return this.afterReplay();
        }
        this.setState('replay');
        this.timeScale = 1;
        this.hud.showReplay(true);
        this.particles.clear();
        this.replayLen = Math.min(REPLAY.length, this.recorder.duration);
        this.replayFrom = this.recorder.duration - this.replayLen;
        this.replayNukes = new Map();
        this.recorder.rewind();
        // Quién está vivo al empezar la repetición: los que ya habían caído antes no vuelven a
        // explotar en el primer fotograma (antes salían explosiones donde no había nada)
        this.recorder.apply(this.replayFrom, this.world, this.bullets);
        this.recorder.rewind();
        this.replayAlive = this.world.tanks.map((t) => t.alive);
    },

    // Fin de la repetición (o al saltarla): todo vuelve a como acabó la partida y se quita lo
    // que estaba a medio vuelo, para que el baile y la pantalla final no tengan balas ni ataques
    // congelados ni tanques muertos de pie
    settleReplay() {
        if (this.state === 'replay') this.recorder.apply(Infinity, this.world, this.bullets);
        this.bullets.clear();
        this.world.nukes.length = 0;
        this.world.hazards.clear();
        this.finishDrops();
    },

    // Efectos de los impactos grabados (la repetición los vuelve a pintar al pasar por ellos)
    replayFx(n) {
        const d = n.data;
        switch (n.kind) {
            case 'hazardBoom': return this.hazardBoomFx(d);
            case 'hit':
                if (d.damage > 1) this.particles.burst(d.x, 0.5, d.z, 30, FIRE, { speed: 5, up: 4, size: 0.2, ttl: 0.6, grav: -1 });
                this.particles.burst(d.x, 0.5, d.z, 14, [d.color, d.body, d.accent, 0xffffff], { speed: 4, up: 3, size: 0.13, ttl: 0.5 });
                this.rig.shake(0.25);
                return this.sfx.play('hit', this.panOf(d.x));
            case 'wall':
                return this.particles.burst(d.x, 0.45, d.z, 6, [d.color, 0xffffff], { speed: 2.2, up: 1.5, size: 0.09, ttl: 0.3, grav: 9 });
            case 'tile':
                if (d.broken) {
                    this.particles.burst(d.x, 0.5, d.z, 34, [d.top, d.side, 0xffffff], { speed: 4, up: 5, size: 0.2, ttl: 1, grav: 14 });
                    this.waves.spawn(d.x, d.z, d.top, 1.8, 0.4);
                    return this.sfx.play('crateBreak', this.panOf(d.x));
                }
                return this.particles.burst(d.x, 0.6, d.z, 6, [d.top, d.side], { speed: 2, up: 2.5, size: 0.1, ttl: 0.4, grav: 12 });
            case 'barrel':
                return this.barrelFx(d.x, d.z, d.R, false);
            case 'shield':
                this.particles.burst(d.x, 0.5, d.z, 24, [0x6fd0ff, 0xffffff, 0x3fa9ff], { speed: 4, up: 3, size: 0.12, ttl: 0.5, grav: 6 });
                return this.sfx.play('shield', this.panOf(d.x));
        }
    },

    updateReplay() {
        const t = Math.min(this.stateTime * REPLAY.speed, this.replayLen);
        // Los ataques del jefe también se repiten: los impactos vuelven a sonar y temblar
        for (const n of this.recorder.apply(this.replayFrom + t, this.world, this.bullets)) this.replayFx(n);
        const live = new Set(this.world.nukes.map((n) => n.id));
        for (const [id, n] of this.replayNukes) if (!live.has(id)) { this.nukeFx(n, false); this.replayNukes.delete(id); }
        for (const n of this.world.nukes) this.replayNukes.set(n.id, n);
        this.world.tanks.forEach((tank, i) => {
            if (this.replayAlive[i] && !tank.alive) this.deathFx(tank, false);
            this.replayAlive[i] = tank.alive;
        });
        // Se queda un poco más tras el golpe para ver la explosión entera
        if (this.stateTime * REPLAY.speed > this.replayLen + 0.8) this.afterReplay();
    },

    // Lo que cuenta el resumen final (solo lo que hace tu tanque)
    trackTally() {
        const ev = this.events, mine = (t) => this.world && t === this.world.player;
        ev.on('hit', (tank, x, z, color, damage, owner) => mine(owner) && tank.team !== 'player' && this.tally.hits++);
        ev.on('death', (tank, owner) => mine(owner) && tank.team !== 'player' && this.tally.kills++);
        ev.on('pickup', (tank) => mine(tank) && this.tally.pickups++);
    },

    // Resumen de la partida en la pantalla final, contado cifra a cifra
    showTally() {
        const p = this.world.player, t = Math.round(this.playTime);
        const aim = p.shots ? Math.min(100, Math.round((this.tally.hits / p.shots) * 100)) : 0;
        this.hud.showTally([
            { label: L('TIME', 'TIEMPO'), value: t, format: (v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` },
            { label: L('TANKS DESTROYED', 'DERRIBADOS'), value: this.tally.kills },
            { label: L('SHOTS', 'DISPAROS'), value: p.shots },
            { label: L('ACCURACY', 'PUNTERÍA'), value: aim, format: (v) => `${v}%` },
        ], (final) => this.sfx.play(final ? 'reloaded' : 'tick'));
    },

    // Ceremonia de monedas antes del final: aparecen, vuelan al contador y suman; después then().
    // Sin monedas que dar, then() va directo.
    payCoins(n, then) {
        if (n <= 0) return then();
        const before = Profile.coins, token = ++this.endToken;
        Profile.addCoins(n);
        this.events.emit('coin', Profile.coins);
        this.sfx.play('coin');
        this.hud.coinReward(before, Profile.coins, {
            onFly: () => this.sfx.play('itemSpawn'),
            onLand: () => this.sfx.play('reloaded'),
        }).then(() => {
            if (this.endToken === token && this.state === 'end') then();
        });
    },

    showEnd() {
        const win = this.result;
        this.setState('end');
        this.hud.holdAchievements(false);
        this.timeScale = 1;
        this.hud.showReplay(false);
        this.hud.showHint(false);
        this.bullets.clear();
        this.world.nukes.length = 0;
        this.world.hazards.clear();
        this.finishDrops();
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
                const best = Profile.setStars(w.id, stars, hard);
                this.lastStars = stars;
                st.bosses = Profile.data.campaign.beaten.filter((id) => !WORLD_BY_ID[id].secret).length;
                st.stars = Object.values(Profile.data.campaign.stars).reduce((a, b) => a + b, 0);
                st.hardBosses = Profile.data.campaign.hard.beaten.length;
                Profile.save();
                const sub = w.secret && !hard ? L('YOU HAVE COMPLETED THE CAMPAIGN!', '¡HAS COMPLETADO LA CAMPAÑA!') : L(`${w.tank.name} IS DOWN`, `${w.tank.name} HA CAÍDO`);
                const end = () => {
                    this.hud.showEnd(true, sub, hard ? L('NIGHTMARE BEATEN!', '¡PESADILLA SUPERADA!') : L('BOSS DEFEATED!', '¡JEFE DERROTADO!'));
                    this.showTally();
                    // Al ganar, solo se vuelve al mapa (allí se ve cómo se abre el siguiente mundo)
                    this.hud.endButtons(null, L('BACK TO THE MAP', 'VOLVER AL MAPA'));
                    this.hud.showStars(got, best, par, (k) => this.sfx.play(k < stars ? 'coin' : 'tick'));
                    // Primera victoria en difícil: su gorro y su pintura ya están en Mi Tanque
                    if (hard && first) setTimeout(() => this.state === 'end' && this.hud.toast(L('NEW HAT AND PAINT IN MY TANK!', '¡NUEVO GORRO Y PINTURA EN MI TANQUE!'), 'trophy'), 2600);
                };
                // La campaña no da monedas: se juega por las estrellas y los trofeos
                end();
            } else {
                this.hud.showEnd(false, L('TRY AGAIN!', '¡INTÉNTALO OTRA VEZ!'));
                this.showTally();
            }
        } else if (this.mode === 'survival') {
            const reached = this.wave - (this.waveClear ? 0 : 1);
            const sub = this.newRecord ? L('NEW RECORD!', '¡NUEVO RÉCORD!') : L(`RECORD: ${st.bestWave} WAVES`, `RÉCORD: ${st.bestWave} OLEADAS`);
            // Las monedas de las oleadas ya se cobraron al superarlas: aquí se recuerda el total
            const coins = this.runCoins ? L(` · +${this.runCoins} COINS`, ` · +${this.runCoins} MONEDAS`) : '';
            this.hud.showEnd(false, sub + coins, L(`${reached} WAVE${reached === 1 ? '' : 'S'}`, `${reached} OLEADA${reached === 1 ? '' : 'S'}`));
            this.showTally();
        } else {
            st.streak = win ? st.streak + 1 : 0;
            if (win) st.wins++;
            Profile.save();
            if (win) {
                // Partida rápida ganada: una moneda de oro
                this.payCoins(this.rival && this.rival.id === 'hard' ? QUICK_COIN_HARD : QUICK_COIN, () => {
                    this.hud.showEnd(true, '');
                    this.showTally();
                });
            } else {
                this.hud.showEnd(false, L('NEXT TIME!', '¡A LA PRÓXIMA!'));
                this.showTally();
            }
        }
        this.events.emit('matchEnd', { win, mode: this.mode, wave: this.wave, world: this.worldId });
        this.sfx.play(!win ? 'lose' : this.mode === 'campaign' ? 'bossWin' : 'win');
        if (win) this.particles.burst(p.x, 0.8, p.z, 90, CONFETTI, { speed: 4, up: 9, size: 0.14, ttl: 2.4, grav: 9 });
    },
};
