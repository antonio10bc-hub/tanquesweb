import { ACHIEVEMENTS, WORLDS } from '../content/index.js';
import { Profile } from '../core/Profile.js';
import { achievementIcon, achievementBg } from './achievementIcons.js';
import { L } from '../core/I18n.js';

// Pantalla de logros: conseguidos a color, pendientes en gris y con su barra de progreso.
// La otra pestaña son las estadísticas del jugador (de Profile.data.stats).
export class Trophies {
    constructor(sfx) {
        const $ = (id) => document.getElementById(id);
        this.sfx = sfx;
        this.screen = $('trophies');
        this.list = $('trophies-list');
        this.count = $('trophies-count');
        $('btn-trophies').addEventListener('click', () => this.open());
        $('btn-trophies-close').addEventListener('click', () => this.close());
        this.statsList = $('stats-list');
        this.tabs = [...document.querySelectorAll('.trophy-tabs .tab')];
        for (const t of this.tabs) t.addEventListener('click', () => {
            this.sfx.play('tick');
            this.view(t.dataset.view);
        });
        window.addEventListener('keydown', (e) => e.code === 'Escape' && this.close());
    }

    open() {
        this.sfx.unlock();
        this.sfx.play('ui');
        this.render();
        this.renderStats();
        this.view('list');
        this.screen.classList.remove('hidden');
        this.list.scrollTop = 0;
    }

    view(name) {
        for (const t of this.tabs) t.classList.toggle('on', t.dataset.view === name);
        const stats = name === 'stats';
        this.list.classList.toggle('hidden', stats);
        this.statsList.classList.toggle('hidden', !stats);
        this.count.classList.toggle('hidden', stats);
        document.getElementById('trophies-pips').classList.toggle('hidden', stats);
        this.statsList.scrollTop = 0;
    }

    renderStats() {
        const s = Profile.data.stats, c = Profile.data.campaign;
        const bosses = WORLDS.filter((w) => !w.secret);
        const stars = Object.entries(c.stars).filter(([id]) => bosses.some((w) => w.id === id)).reduce((a, [, n]) => a + n, 0);
        const hardStars = Object.values(c.hard.stars).reduce((a, b) => a + b, 0);
        const mins = Math.floor(s.playTime / 60);
        const time = mins >= 60 ? `${Math.floor(mins / 60)}H ${mins % 60}M` : `${mins}M ${s.playTime % 60}S`;
        const aim = s.shots ? Math.min(100, Math.round((s.hits / s.shots) * 100)) : 0;
        const cell = (v, label, big) => `<div class="s-cell${big ? ' big' : ''}"><b>${v}</b><span>${label}</span></div>`;
        const card = (icon, title, cells) => `<section class="s-card"><h3><i style="background-image:var(--px-${icon})"></i>${title}</h3><div class="s-grid">${cells.join('')}</div></section>`;
        this.statsList.innerHTML = [
            card('trophy', L('GENERAL', 'GENERAL'), [
                cell(s.matches, L('MATCHES PLAYED', 'PARTIDAS JUGADAS'), true),
                cell(time, L('TIME PLAYED', 'TIEMPO JUGADO'), true),
                cell(s.victories, L('WINS', 'VICTORIAS')),
                cell(s.losses, L('DEFEATS', 'DERROTAS')),
                cell(s.bestStreak, L('BEST STREAK', 'MEJOR RACHA')),
                cell(s.coinsEarned, L('COINS EARNED', 'MONEDAS GANADAS')),
            ]),
            card('spark-a', L('COMBAT', 'COMBATE'), [
                cell(s.kills, L('TANKS DESTROYED', 'TANQUES DESTRUIDOS'), true),
                cell(`${aim}%`, L('ACCURACY', 'PUNTERÍA'), true),
                cell(s.shots, L('SHOTS FIRED', 'DISPAROS')),
                cell(s.deaths, L('TIMES DESTROYED', 'VECES DESTRUIDO')),
                cell(s.pickups, L('ITEMS PICKED UP', 'OBJETOS COGIDOS')),
                cell(s.cratesBroken, L('CRATES BROKEN', 'CAJAS ROTAS')),
            ]),
            card('star-on', L('CAMPAIGN', 'CAMPAÑA'), [
                cell(`${c.beaten.filter((id) => bosses.some((w) => w.id === id)).length}/${bosses.length}`, L('BOSSES BEATEN', 'JEFES DERROTADOS'), true),
                cell(`${stars}/${bosses.length * 3}`, L('STARS', 'ESTRELLAS'), true),
                cell(c.hard.beaten.length, L('NIGHTMARE BOSSES', 'JEFES PESADILLA')),
                cell(hardStars, L('NIGHTMARE STARS', 'ESTRELLAS PESADILLA')),
                cell(s.bossTries, L('BOSS FIGHTS', 'COMBATES CON JEFES')),
            ]),
            card('skull', L('SURVIVAL AND DUEL', 'SUPERVIVENCIA Y DUELO'), [
                cell(s.bestWave, L('BEST WAVE', 'MEJOR OLEADA'), true),
                cell(s.wavesCleared, L('WAVES CLEARED', 'OLEADAS SUPERADAS')),
                cell(s.duels, L('DUELS PLAYED', 'DUELOS JUGADOS')),
            ]),
        ].join('');
    }

    close() {
        if (this.screen.classList.contains('hidden')) return;
        this.sfx.play('ui');
        this.screen.classList.add('hidden');
    }

    render() {
        const s = Profile.data.stats;
        const done = ACHIEVEMENTS.filter((a) => Profile.unlocked(a.id));
        this.count.textContent = L(`${done.length} OF ${ACHIEVEMENTS.length}`, `${done.length} DE ${ACHIEVEMENTS.length}`);
        // Una casilla por logro, como la vida en la partida
        const pips = document.getElementById('trophies-pips');
        pips.innerHTML = ACHIEVEMENTS.map((a, i) => `<i class="${i < done.length ? 'on' : ''}"></i>`).join('');
        // Primero los conseguidos
        const sorted = [...ACHIEVEMENTS].sort((a, b) => Profile.unlocked(b.id) - Profile.unlocked(a.id));
        this.list.innerHTML = '';
        for (const a of sorted) {
            const ok = Profile.unlocked(a.id);
            const row = document.createElement('div');
            row.className = `t-row${ok ? ' done' : ''}`;
            let bar = '';
            if (a.progress && !ok) {
                const [v, goal] = a.progress(s);
                const k = Math.min(1, v / goal);
                bar = `<div class="t-prog"><div class="t-bar" style="--n:${Math.min(goal, 25)}"><i style="width:${k * 100}%"></i></div><span>${Math.min(v, goal)}/${goal}</span></div>`;
            }
            const bg = achievementBg(a.id);
            row.innerHTML = `<div class="t-badge${bg === 'rainbow' ? ' rainbow' : ''}" style="--bg:${bg}"><i class="t-ico" style="background-image:${achievementIcon(a.id)}"></i></div>
                <div class="t-text"><h3>${a.name}</h3><p>${a.desc}</p>${bar}</div>${ok ? `<span class="t-stamp">${L('DONE!', '¡HECHO!')}</span>` : ''}`;
            this.list.appendChild(row);
        }
    }
}
