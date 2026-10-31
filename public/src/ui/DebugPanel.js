// Panel de depuración (solo en el dispositivo del autor, core/Dev.js): un botón en la esquina de
// abajo a la derecha del menú abre la lista de herramientas.
//   Modos: abrir o cerrar cada uno (o todos) y ver su animación de desbloqueo
//   Tienda: todo gratis, monedas, todos los objetos o ninguno
//   Campaña: completarla (también el modo difícil) o empezarla de cero
import { UNLOCKS, isUnlocked, forceUnlock } from '../core/Unlocks.js';
import { devFree, setDevFree } from '../core/Dev.js';
import { Profile } from '../core/Profile.js';
import { SKINS, PAINTS, TRAILS, WORLDS } from '../content/index.js';
import { PETS } from '../content/pets.js';
import { DANCES } from '../content/dances.js';
import { L } from '../core/I18n.js';

export class DebugPanel {
    constructor({ locks, sfx, hud }) {
        this.locks = locks;
        this.sfx = sfx;
        this.hud = hud;
        this.btn = document.getElementById('btn-debug');
        this.panel = document.getElementById('debug-panel');
        this.body = document.getElementById('debug-body');
        this.btn.classList.remove('hidden');
        this.btn.addEventListener('click', () => this.open());
        document.getElementById('debug-close').addEventListener('click', () => this.close());
        this.body.addEventListener('click', (e) => {
            const b = e.target.closest('button[data-act]');
            if (!b) return;
            this.sfx.play('ui');
            this.run(b.dataset.act, b.dataset.id);
        });
    }

    open() {
        this.sfx.play('ui');
        this.render();
        this.panel.classList.remove('hidden');
    }

    close() {
        this.sfx.play('ui');
        this.panel.classList.add('hidden');
        this.locks.refresh();
    }

    run(act, id) {
        const modes = Object.keys(UNLOCKS);
        const items = [...SKINS, ...PAINTS, ...TRAILS, ...PETS, ...DANCES].filter((s) => !s.boss && s.price > 0).map((s) => s.id);
        const all = WORLDS.map((w) => w.id);
        switch (act) {
            case 'open': forceUnlock(id, true); break;
            case 'close': forceUnlock(id, false); break;
            case 'openAll': modes.forEach((m) => forceUnlock(m, true)); break;
            case 'closeAll': modes.forEach((m) => forceUnlock(m, false)); break;
            // Animaciones: se cierra el panel para verlas en el menú
            case 'anim': this.panel.classList.add('hidden'); this.locks.preview(id); return;
            case 'animAll': this.panel.classList.add('hidden'); this.locks.play(modes); return;
            case 'free': setDevFree(!devFree()); Profile.save(); break;
            case 'coins': Profile.addCoins(100); break;
            case 'items': Profile.data.owned = [...new Set([...Profile.data.owned, ...items])]; Profile.save(); break;
            case 'noItems':
                Profile.data.owned = ['none'];
                Object.assign(Profile.data, { skin: 'none', paint: 'p_default', trail: 't_default', dance: 'd_rocket', pet: 'pet_none' });
                Profile.save();
                break;
            case 'campaign': {
                const c = Profile.data.campaign;
                c.beaten = [...all];
                c.hard.beaten = [...all];
                for (const w of all) c.stars[w] = c.hard.stars[w] = 3;
                Profile.save();
                break;
            }
            case 'noCampaign':
                Profile.data.campaign = { beaten: [], stars: {}, hard: { beaten: [], stars: {} } };
                Profile.save();
                break;
        }
        this.render();
    }

    render() {
        const row = (label, btns) => `<div class="dbg-row"><span>${label}</span><div>${btns}</div></div>`;
        const b = (act, text, id = '', on = false) => `<button class="dbg-btn${on ? ' on' : ''}" data-act="${act}" data-id="${id}">${text}</button>`;
        const modes = Object.entries(UNLOCKS).map(([id, u]) => {
            const open = isUnlocked(id);
            return row(u.name, b(open ? 'close' : 'open', open ? L('OPEN', 'ABIERTO') : L('LOCKED', 'CERRADO'), id, open) + b('anim', '▶', id));
        }).join('');
        this.body.innerHTML = `
            <h3>${L('MODES', 'MODOS')}</h3>${modes}
            ${row(L('ALL', 'TODOS'), b('openAll', L('OPEN', 'ABRIR')) + b('closeAll', L('LOCK', 'CERRAR')) + b('animAll', '▶'))}
            <h3>${L('SHOP', 'TIENDA')}</h3>
            ${row(L('EVERYTHING FREE', 'TODO GRATIS'), b('free', devFree() ? L('YES', 'SÍ') : 'NO', '', devFree()))}
            ${row(`${L('COINS', 'MONEDAS')}: ${Profile.coins}`, b('coins', '+100'))}
            ${row(L('ITEMS', 'OBJETOS'), b('items', L('ALL', 'TODOS')) + b('noItems', L('NONE', 'NINGUNO')))}
            <h3>${L('CAMPAIGN', 'CAMPAÑA')}</h3>
            ${row(L('BOSSES', 'JEFES'), b('campaign', L('ALL BEATEN', 'TODOS')) + b('noCampaign', L('RESET', 'DE CERO')))}`;
    }
}
