// Botones de los modos bloqueados (core/Unlocks.js): candado con el progreso en la esquina; al
// pulsarlos, un aviso dice qué falta. Al volver al menú con un modo recién abierto, se anuncia.
import { UNLOCKS, isUnlocked } from '../core/Unlocks.js';
import { L } from '../core/I18n.js';

const BUTTONS = { campaign: 'btn-campaign', survival: 'btn-survival', duel: 'btn-duel' };

export class ModeLocks {
    constructor(hud, sfx) {
        const $ = (id) => document.getElementById(id);
        this.hud = hud;
        this.sfx = sfx;
        this.note = { box: $('lock-note'), text: $('lock-text'), bar: $('lock-bar'), count: $('lock-count') };
        this.tags = {};
        for (const [id, btn] of Object.entries(BUTTONS)) {
            const tag = document.createElement('span');
            tag.className = 'lock-tag';
            tag.innerHTML = '<i></i><b></b>';
            $(btn).appendChild(tag);
            this.tags[id] = tag.querySelector('b');
        }
        // Los que ya estaban abiertos al cargar no se anuncian
        this.known = new Set(Object.keys(BUTTONS).filter(isUnlocked));
        this.refresh();
    }

    // Si el modo está bloqueado, enseña qué falta y devuelve true (el botón no hace nada más)
    deny(id) {
        if (isUnlocked(id)) return false;
        const u = UNLOCKS[id], [have, need] = u.progress(), n = this.note;
        this.sfx.play('itemGone');
        n.text.textContent = u.need;
        n.count.textContent = `${Math.min(have, need)}/${need}`;
        n.bar.style.width = `${Math.round((Math.min(have, need) / need) * 100)}%`;
        n.box.classList.remove('show');
        void n.box.offsetWidth; // reinicia la animación
        n.box.classList.add('show');
        clearTimeout(this.noteTimer);
        this.noteTimer = setTimeout(() => n.box.classList.remove('show'), 3200);
        const btn = document.getElementById(BUTTONS[id]);
        btn.classList.remove('denied');
        void btn.offsetWidth;
        btn.classList.add('denied');
        return true;
    }

    // Candados y progreso al día; los modos recién abiertos se anuncian y brillan
    refresh() {
        for (const [id, btnId] of Object.entries(BUTTONS)) {
            const btn = document.getElementById(btnId), open = isUnlocked(id);
            btn.classList.toggle('locked', !open);
            const [have, need] = UNLOCKS[id].progress();
            this.tags[id].textContent = `${Math.min(have, need)}/${need}`;
            if (open && !this.known.has(id)) {
                this.known.add(id);
                this.hud.toast(L(`NEW MODE: ${UNLOCKS[id].name}!`, `¡NUEVO MODO: ${UNLOCKS[id].name}!`), 'trophy');
                this.sfx.play('achievement');
                btn.classList.add('just-unlocked');
                setTimeout(() => btn.classList.remove('just-unlocked'), 2000);
            }
        }
    }
}
