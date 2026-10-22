import { ACHIEVEMENTS } from '../content/index.js';
import { Profile } from '../core/Profile.js';
import { achievementIcon, achievementBg } from './achievementIcons.js';

// Pantalla de logros: conseguidos a color, pendientes en gris y con su barra de progreso.
export class Trophies {
    constructor(sfx) {
        const $ = (id) => document.getElementById(id);
        this.sfx = sfx;
        this.screen = $('trophies');
        this.list = $('trophies-list');
        this.count = $('trophies-count');
        $('btn-trophies').addEventListener('click', () => this.open());
        $('btn-trophies-close').addEventListener('click', () => this.close());
        window.addEventListener('keydown', (e) => e.code === 'Escape' && this.close());
    }

    open() {
        this.sfx.unlock();
        this.sfx.play('ui');
        this.render();
        this.screen.classList.remove('hidden');
        this.list.scrollTop = 0;
    }

    close() {
        if (this.screen.classList.contains('hidden')) return;
        this.sfx.play('ui');
        this.screen.classList.add('hidden');
    }

    render() {
        const s = Profile.data.stats;
        const done = ACHIEVEMENTS.filter((a) => Profile.unlocked(a.id));
        this.count.textContent = `${done.length} DE ${ACHIEVEMENTS.length}`;
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
                <div class="t-text"><h3>${a.name}</h3><p>${a.desc}</p>${bar}</div>${ok ? '<span class="t-stamp">¡HECHO!</span>' : ''}`;
            this.list.appendChild(row);
        }
    }
}
