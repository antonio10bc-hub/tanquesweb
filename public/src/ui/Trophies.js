import { ACHIEVEMENTS } from '../content/index.js';
import { Profile } from '../core/Profile.js';

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
        // Primero los conseguidos
        const sorted = [...ACHIEVEMENTS].sort((a, b) => Profile.unlocked(b.id) - Profile.unlocked(a.id));
        this.list.innerHTML = '';
        for (const a of sorted) {
            const ok = Profile.unlocked(a.id);
            const row = document.createElement('div');
            row.className = `g-row t-row${ok ? ' done' : ''}`;
            let bar = '';
            if (a.progress && !ok) {
                const [v, goal] = a.progress(s);
                bar = `<div class="t-bar"><i style="width:${Math.min(100, (v / goal) * 100)}%"></i></div>`;
            }
            row.innerHTML = `<div class="t-icon"><span class="trophy"></span></div>
                <div class="g-text"><h3 style="color:${ok ? '#ffe03a' : '#b9b0d8'}">${a.name}</h3><p>${a.desc}</p>${bar}</div>`;
            this.list.appendChild(row);
        }
    }
}
