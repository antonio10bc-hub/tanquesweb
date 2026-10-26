// Moverse por los menús con el teclado: las flechas pasan al botón más cercano en esa dirección
// de la pantalla que está delante, y Enter o Espacio lo pulsan. La primera flecha solo enseña
// dónde estás (el último botón en el que estuviste en esa pantalla, o el principal).
// Respeta las teclas propias de cada pantalla: en Mi Tanque izquierda/derecha cambian de objeto
// (salvo en las pestañas y los botones de abajo) y en el mapa de la campaña arriba/abajo cambian
// de mundo. Las listas largas (logros) también se pueden enfocar y se desplazan con arriba/abajo.

// Pantallas, de la que queda más arriba a la de más abajo
const SCREENS = ['postcard', 'pause', 'garage', 'trophies', 'glossary', 'settings', 'consent', 'end', 'menu', 'campaign'];
// Teclas que se quedan para la pantalla (si el foco no está en uno de los elementos "keep")
const OWN = {
    garage: { keys: ['ArrowLeft', 'ArrowRight'], keep: '.tab, .garage-foot .btn' },
    campaign: { keys: ['ArrowUp', 'ArrowDown'], keep: '' },
};
const DIRS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

const shown = (el) => !!el && !el.classList.contains('hidden') && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
const center = (el) => {
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
};

export class KeyNav {
    constructor(onMove) {
        this.onMove = onMove;
        this.last = {}; // pantalla -> último elemento en el que estuvo el foco
        // En la fase de captura: va antes que las teclas propias de cada pantalla
        window.addEventListener('keydown', (e) => this.key(e), true);
    }

    screen() {
        for (const id of SCREENS) {
            const el = document.getElementById(id);
            if (shown(el)) return el;
        }
        return null;
    }

    items(screen) {
        // Las listas, solo si tienen algo que desplazar
        const scrolls = (el) => !el.classList.contains('glossary-list') || el.scrollHeight > el.clientHeight + 1;
        return [...screen.querySelectorAll('button, .glossary-list')].filter((el) => !el.disabled && !el.dataset.navSkip && shown(el) && scrolls(el));
    }

    key(e) {
        const dir = DIRS[e.code], press = e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter';
        if (!dir && !press) return;
        const screen = this.screen();
        if (!screen) return; // jugando: las flechas mueven el tanque
        const items = this.items(screen);
        const cur = items.includes(document.activeElement) ? document.activeElement : null;
        if (press) {
            // Pulsa el botón enfocado (y nadie más hace nada con esa tecla)
            if (!cur || cur.tagName !== 'BUTTON') return;
            e.preventDefault();
            e.stopPropagation();
            cur.click();
            return;
        }
        const own = OWN[screen.id];
        if (own && own.keys.includes(e.code) && !(cur && own.keep && cur.matches(own.keep))) return;
        e.preventDefault();
        e.stopPropagation();
        if (!cur) {
            const back = this.last[screen.id];
            this.focus(screen, items.includes(back) ? back : items.find((el) => el.dataset.navFirst) || items[0]);
            return;
        }
        // Lista enfocada: arriba/abajo la desplazan mientras quede por ver
        if (cur.classList.contains('glossary-list') && dir[1]) {
            const room = dir[1] < 0 ? cur.scrollTop > 0 : cur.scrollTop + cur.clientHeight < cur.scrollHeight - 1;
            if (room) {
                cur.scrollBy({ top: dir[1] * 140 });
                return;
            }
        }
        const next = this.nearest(cur, items, dir);
        if (next) {
            this.focus(screen, next);
            if (this.onMove) this.onMove();
        }
    }

    // El más cercano en esa dirección: lo que está de frente cuenta más que lo que está de lado
    nearest(cur, items, [dx, dy]) {
        const [cx, cy] = center(cur);
        let best = null, bestScore = Infinity, bestInCone = false;
        for (const el of items) {
            if (el === cur) continue;
            const [x, y] = center(el);
            const ahead = (x - cx) * dx + (y - cy) * dy, side = Math.abs((x - cx) * dy) + Math.abs((y - cy) * dx);
            if (ahead <= 4) continue;
            const inCone = side <= ahead * 2;
            const score = ahead + side * 2.5;
            if ((inCone && !bestInCone) || (inCone === bestInCone && score < bestScore)) {
                best = el;
                bestScore = score;
                bestInCone = inCone;
            }
        }
        return best;
    }

    focus(screen, el) {
        if (!el) return;
        this.last[screen.id] = el;
        el.focus();
        if (el.classList.contains('glossary-list')) return;
        el.scrollIntoView({ block: 'nearest' });
    }
}
