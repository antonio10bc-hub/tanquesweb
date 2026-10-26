// Mandos (Gamepad API, distribución estándar). El stick izquierdo o la cruceta mueven el
// tanque; en el duelo, el primer mando es del jugador 1 y el segundo del jugador 2. Fuera de la
// partida (menús, pausa, suministros) el mando se traduce a las mismas teclas que ya entiende el
// juego: cruceta/stick → flechas, A → Enter, B → Escape, Start → Escape (pausa).
// Con un mando conectado, html.pad: las etiquetas de los botones enseñan A/B en vez de teclas.
const DEAD = 0.3;
const BUTTON_KEYS = { 0: 'Enter', 1: 'Escape', 9: 'Escape' };
const DPAD = { 12: 'ArrowUp', 13: 'ArrowDown', 14: 'ArrowLeft', 15: 'ArrowRight' };
// Mantener una dirección en los menús: repite tras REPEAT[0] y luego cada REPEAT[1] segundos
const REPEAT = [0.4, 0.14];

const pads = () => [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter((p) => p && p.connected);

export class Gamepads {
    // inputs(): [mando del jugador 1, del jugador 2]; menus(): true si el mando maneja menús
    constructor({ inputs, menus, onConnect }) {
        this.inputs = inputs;
        this.menus = menus;
        this.prev = new Map(); // índice del mando -> botones pulsados el fotograma anterior
        this.hold = new Map(); // índice -> { key, t }
        this.last = performance.now();
        window.addEventListener('gamepadconnected', () => {
            document.documentElement.classList.add('pad');
            onConnect?.(true);
        });
        window.addEventListener('gamepaddisconnected', () => {
            if (!pads().length) document.documentElement.classList.remove('pad');
            onConnect?.(false);
        });
        this.frame = this.frame.bind(this);
        requestAnimationFrame(this.frame);
    }

    frame(now) {
        requestAnimationFrame(this.frame);
        const dt = Math.min(0.1, (now - this.last) / 1000);
        this.last = now;
        const list = pads();
        const [in1, in2, duel] = this.inputs();
        in1.pad.x = in1.pad.z = in2.pad.x = in2.pad.z = 0;
        if (!list.length) return;
        const menus = this.menus();
        list.forEach((pad, n) => {
            const dir = this.direction(pad);
            // Movimiento: en el duelo, un mando por jugador; si no, cualquiera mueve tu tanque
            const target = duel && n === 1 ? in2 : n === 0 || !duel ? in1 : null;
            if (target && (dir.x || dir.z)) {
                target.pad.x = dir.x;
                target.pad.z = dir.z;
            }
            // Botones: solo al pulsarlos (no mientras se mantienen)
            const was = this.prev.get(pad.index) || [];
            const now = pad.buttons.map((b) => b.pressed);
            // (jugando, solo Start: A y B no hacen nada para no pausar sin querer)
            for (const [b, key] of Object.entries(BUTTON_KEYS)) if (now[b] && !was[b] && (menus || b === '9')) press(key);
            this.prev.set(pad.index, now);
            // Menús: la dirección como flechas, con repetición al mantenerla
            if (menus) this.navigate(pad.index, dir, dt);
            else this.hold.delete(pad.index);
        });
    }

    // Stick izquierdo (si sale de la zona muerta) o cruceta
    direction(pad) {
        let x = pad.axes[0] || 0, z = pad.axes[1] || 0;
        if (Math.hypot(x, z) < DEAD) x = z = 0;
        const b = (i) => !!pad.buttons[i]?.pressed;
        if (!x && !z) {
            x = (b(15) ? 1 : 0) - (b(14) ? 1 : 0);
            z = (b(13) ? 1 : 0) - (b(12) ? 1 : 0);
        }
        return { x, z };
    }

    navigate(i, dir, dt) {
        const key = !dir.x && !dir.z ? null
            : Math.abs(dir.x) > Math.abs(dir.z) ? (dir.x > 0 ? DPAD[15] : DPAD[14]) : (dir.z > 0 ? DPAD[13] : DPAD[12]);
        const h = this.hold.get(i);
        if (!key) return this.hold.delete(i);
        if (!h || h.key !== key) {
            press(key);
            this.hold.set(i, { key, t: REPEAT[0] });
        } else if ((h.t -= dt) <= 0) {
            press(key);
            h.t = REPEAT[1];
        }
    }
}

// Una pulsación de tecla como si viniera del teclado (al elemento con el foco, para que los
// atajos de cada pantalla y la navegación de los menús se comporten igual)
function press(code) {
    const el = document.activeElement && document.activeElement !== document.body ? document.activeElement : document.body;
    const key = code.startsWith('Arrow') ? code : code === 'Escape' ? 'Escape' : 'Enter';
    el.dispatchEvent(new KeyboardEvent('keydown', { code, key, bubbles: true, cancelable: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { code, key, bubbles: true, cancelable: true }));
}
