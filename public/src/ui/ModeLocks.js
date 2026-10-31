// Botones de los modos bloqueados (core/Unlocks.js): candado con el progreso en la esquina; al
// pulsarlos, un aviso dice qué falta. Al volver al menú con un modo recién abierto, se abre con
// su animación: el menú deja de responder, el candado tiembla, se abre y sale volando, el botón
// recupera el color con un destello y, al acabar, vuelve el control.
import { UNLOCKS, isUnlocked } from '../core/Unlocks.js';
import { L } from '../core/I18n.js';

export const BUTTONS = { campaign: 'btn-campaign', survival: 'btn-survival', duel: 'btn-duel' };
// Tiempos de la animación de desbloqueo (segundos): tiembla, se abre, sale volando y el botón
// recupera el color, aviso y fin
const OPEN = { shake: 0, open: 0.6, fly: 0.85, color: 0.9, toast: 1.3, end: 2.1 };
const wait = (s) => new Promise((ok) => setTimeout(ok, s * 1000));

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

    // Candados y progreso al día; los modos recién abiertos se abren con su animación
    refresh() {
        const fresh = [];
        for (const [id, btnId] of Object.entries(BUTTONS)) {
            const btn = document.getElementById(btnId), open = isUnlocked(id);
            const [have, need] = UNLOCKS[id].progress();
            this.tags[id].textContent = `${Math.min(have, need)}/${need}`;
            if (open && !this.known.has(id)) {
                // Sigue apagado hasta que le toque su animación
                this.known.add(id);
                fresh.push(id);
                btn.classList.add('locked');
                continue;
            }
            if (!btn.classList.contains('unlocking')) btn.classList.toggle('locked', !open);
            if (!open) this.known.delete(id);
        }
        if (fresh.length) this.play(fresh);
    }

    // Abre uno o varios modos, uno detrás de otro, con el menú bloqueado mientras dura
    async play(ids) {
        this.queue = [...(this.queue || []), ...ids];
        if (this.playing) return;
        this.playing = true;
        document.body.classList.add('ui-blocked');
        while (this.queue.length) await this.animate(this.queue.shift());
        document.body.classList.remove('ui-blocked');
        this.playing = false;
    }

    async animate(id) {
        const btn = document.getElementById(BUTTONS[id]), tag = btn.querySelector('.lock-tag');
        btn.classList.add('locked', 'unlocking');
        this.sfx.play('charge');
        await wait(OPEN.open - OPEN.shake);
        tag.classList.add('open');                      // se abre el candado
        this.sfx.play('reloaded');
        await wait(OPEN.fly - OPEN.open);
        tag.classList.add('fly');                       // sale volando
        await wait(OPEN.color - OPEN.fly);
        btn.classList.remove('locked');                 // vuelve el color, con un destello
        btn.classList.add('colored');
        this.burst(btn);
        this.sfx.play('unlock');
        await wait(OPEN.toast - OPEN.color);
        this.hud.toast(L(`NEW MODE: ${UNLOCKS[id].name}!`, `¡NUEVO MODO: ${UNLOCKS[id].name}!`), 'trophy');
        await wait(OPEN.end - OPEN.toast);
        btn.classList.remove('unlocking', 'colored');
        tag.classList.remove('open', 'fly');
        // (el panel de depuración puede enseñarla en un modo cerrado: vuelve a como estaba)
        btn.classList.toggle('locked', !isUnlocked(id));
    }

    // Chispas pixeladas que salen del botón al abrirse
    burst(btn) {
        const cols = ['#ffe03a', '#ffffff', '#23e0d6', '#ff3e8e'];
        for (let i = 0; i < 14; i++) {
            const p = document.createElement('i');
            p.className = 'unlock-spark';
            const a = (i / 14) * Math.PI * 2, d = 70 + (i % 3) * 25;
            p.style.setProperty('--dx', `${Math.cos(a) * d}px`);
            p.style.setProperty('--dy', `${Math.sin(a) * d * 0.6}px`);
            p.style.background = cols[i % cols.length];
            btn.appendChild(p);
            setTimeout(() => p.remove(), 800);
        }
    }

    // Panel de depuración: enseñar la animación de un modo (sin cambiar si está abierto o no)
    preview(id) {
        this.play([id]);
    }
}
