// Ajustes que solo salen en el ordenador: pantalla completa (también con la tecla F), tamaño de
// la interfaz, tamaño del píxel del juego y la pantalla de controles (qué hace cada tecla y
// cada botón del mando).
import { L } from '../core/I18n.js';
import { Settings } from '../core/Settings.js';
import { PC, UI_SIZES, applyUiScale } from '../core/Device.js';

const SIZE_NAMES = { small: L('SMALL', 'PEQUEÑA'), normal: L('NORMAL', 'NORMAL'), large: L('LARGE', 'GRANDE') };
// Tamaño del píxel: líneas en el lado corto de la pantalla (la DS tenía 192)
export const PIXEL_LINES = { big: 160, normal: 210, fine: 300 };
const PIXEL_NAMES = { big: L('BIG', 'GRANDE'), normal: L('NORMAL', 'NORMAL'), fine: L('FINE', 'FINO') };

// Acción · teclado · mando
const CONTROLS = [
    [L('MOVE', 'MOVERSE'), ['WASD', L('ARROWS', 'FLECHAS')], [L('STICK', 'STICK'), L('D-PAD', 'CRUCETA')]],
    [L('FIRE', 'DISPARAR'), [L('STAND STILL', 'QUÉDATE QUIETO')], [L('STAND STILL', 'QUÉDATE QUIETO')]],
    [L('PAUSE', 'PAUSA'), ['ESC', 'P'], ['START']],
    [L('MENUS', 'MENÚS'), [L('ARROWS', 'FLECHAS'), 'ENTER'], [L('D-PAD', 'CRUCETA'), 'A']],
    [L('BACK', 'VOLVER'), ['ESC'], ['B']],
    [L('SUPPLIES', 'SUMINISTROS'), ['1 2 3', '← →', 'ENTER'], [L('D-PAD', 'CRUCETA'), 'A']],
    [L('CHANGE ITEM', 'CAMBIAR OBJETO'), ['← →'], [L('D-PAD', 'CRUCETA')]],
    [L('FULL SCREEN', 'PANTALLA COMPLETA'), ['F'], []],
    [L('TWO-PLAYER DUEL', 'DUELO A DOS'), [L('P1 WASD', 'J1 WASD'), L('P2 ARROWS', 'J2 FLECHAS')], [L('ONE PAD EACH', 'UN MANDO CADA UNO')]],
];

export class PcSettings {
    // setLines(n): cambia el tamaño del píxel del juego (RetroRenderer.setLines)
    constructor(sfx, setLines) {
        if (!PC) return;
        const $ = (id) => document.getElementById(id);
        this.sfx = sfx;
        this.setLines = setLines;
        this.el = { size: $('btn-uisize'), full: $('btn-fullscreen'), controls: $('controls'), pixel: $('btn-pixel') };
        this.el.pixel.addEventListener('click', () => this.pixel());
        setLines(PIXEL_LINES[Settings.pixel] || PIXEL_LINES.fine);
        this.el.full.addEventListener('click', () => this.fullscreen());
        this.el.size.addEventListener('click', () => this.size());
        $('btn-controls').addEventListener('click', () => this.showControls(true));
        $('btn-controls-close').addEventListener('click', () => this.showControls(false));
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyF' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) this.fullscreen();
            else if (e.code === 'Escape' && !this.el.controls.classList.contains('hidden')) {
                e.stopImmediatePropagation(); // vuelve a Ajustes, sin cerrarlos también
                this.showControls(false);
            }
        }, true);
        document.addEventListener('fullscreenchange', () => this.labels());
        this.buildControls();
        this.labels();
    }

    labels() {
        const on = !!document.fullscreenElement;
        this.el.full.textContent = on ? L('EXIT FULL SCREEN', 'SALIR DE PANTALLA COMPLETA') : L('FULL SCREEN', 'PANTALLA COMPLETA');
        this.el.size.textContent = `${L('INTERFACE', 'INTERFAZ')}: ${SIZE_NAMES[Settings.uiSize] || SIZE_NAMES.normal}`;
        this.el.pixel.textContent = `${L('PIXEL', 'PÍXEL')}: ${PIXEL_NAMES[Settings.pixel] || PIXEL_NAMES.fine}`;
    }

    fullscreen() {
        this.sfx.play('ui');
        const doc = document.documentElement;
        try {
            if (document.fullscreenElement) document.exitFullscreen();
            else (doc.requestFullscreen || doc.webkitRequestFullscreen).call(doc);
        } catch {
            /* el navegador no deja: no pasa nada */
        }
    }

    // Pequeña → normal → grande → pequeña...
    size() {
        this.sfx.play('ui');
        const order = Object.keys(UI_SIZES);
        Settings.set('uiSize', order[(order.indexOf(Settings.uiSize) + 1) % order.length]);
        applyUiScale();
        this.labels();
    }

    // Grande → normal → fino → grande...
    pixel() {
        this.sfx.play('ui');
        const order = Object.keys(PIXEL_LINES);
        Settings.set('pixel', order[(order.indexOf(Settings.pixel) + 1) % order.length]);
        this.setLines(PIXEL_LINES[Settings.pixel]);
        this.labels();
    }

    buildControls() {
        const caps = (keys) => (keys.length ? keys.map((k) => `<kbd>${k}</kbd>`).join(' ') : '<span class="c-none">—</span>');
        document.getElementById('controls-list').innerHTML =
            `<div class="c-head"><span></span><span>${L('KEYBOARD', 'TECLADO')}</span><span>${L('GAMEPAD', 'MANDO')}</span></div>`
            + CONTROLS.map(([what, keys, pad]) => `<div class="c-row"><span class="c-what">${what}</span><span>${caps(keys)}</span><span>${caps(pad)}</span></div>`).join('');
    }

    showControls(on) {
        this.sfx.play('ui');
        this.el.controls.classList.toggle('hidden', !on);
    }
}
