const KEYS = {
    ArrowLeft: 'l', KeyA: 'l',
    ArrowRight: 'r', KeyD: 'r',
    ArrowUp: 'u', KeyW: 'u',
    ArrowDown: 'd', KeyS: 'd',
};

// Joystick flotante estilo Archero: aparece donde tocas, la base te sigue si arrastras lejos.
// Cualquier inclinación fuera de la zona muerta = velocidad máxima en esa dirección.
export class Input {
    constructor(surface, joyEl) {
        this.move = { x: 0, z: 0 };
        this.enabled = false;
        this.capture = false;
        this.radius = 52;
        this.dead = 0.2;
        this.pointerId = null;
        this.ox = 0;
        this.oy = 0;
        this.jx = 0;
        this.jy = 0;
        this.keys = { l: false, r: false, u: false, d: false };
        this.joy = joyEl;
        this.thumb = joyEl.querySelector('.joy-thumb');
        this.base = joyEl.querySelector('.joy-base');
        this.onMove = null;
        this.region = null;   // duelo: solo acepta dedos en su mitad de la pantalla (y => bool)
        this.keySet = 'all';  // 'all' | 'wasd' | 'arrows' (duelo en el ordenador)
        this.top = false;     // el joystick descansa arriba (jugador 2 del duelo)

        surface.addEventListener('pointerdown', (e) => this.down(e), { passive: false });
        window.addEventListener('pointermove', (e) => this.drag(e), { passive: false });
        window.addEventListener('pointerup', (e) => this.up(e));
        window.addEventListener('pointercancel', (e) => this.up(e));
        window.addEventListener('keydown', (e) => this.key(e, true));
        window.addEventListener('keyup', (e) => this.key(e, false));
        window.addEventListener('blur', () => this.reset());
        window.addEventListener('resize', () => this.pointerId === null && this.rest());
        this.rest();
    }

    // enabled: el joystick mueve el tanque. capture: acepta dedos aunque aún no mueva
    // (p. ej. durante la cuenta atrás, para no perder un toque mantenido).
    setEnabled(on, capture = on) {
        this.enabled = on;
        this.capture = capture;
        this.joy.classList.toggle('hidden', !capture);
        if (!capture) this.reset();
    }

    // Duelo: mitad de pantalla y teclas de cada jugador (sin argumentos vuelve a lo normal)
    setSide(side) {
        const half = () => window.innerHeight / 2;
        this.region = side === 'bottom' ? (y) => y > half() : side === 'top' ? (y) => y <= half() : null;
        this.keySet = side === 'bottom' ? 'wasd' : side === 'top' ? 'arrows' : 'all';
        this.top = side === 'top';
        this.reset();
    }

    reset() {
        this.pointerId = null;
        this.jx = this.jy = 0;
        for (const k in this.keys) this.keys[k] = false;
        this.rest();
    }

    rest() {
        this.ox = window.innerWidth / 2;
        // En el duelo descansa más cerca del borde: el centro de la pantalla es para las arenas
        const off = this.region ? 82 : Math.max(100, window.innerHeight * 0.16);
        this.oy = this.top ? off : window.innerHeight - off;
        this.place(0, 0);
        this.joy.classList.add('idle');
    }

    place(dx, dy) {
        this.base.style.transform = `translate(${this.ox}px, ${this.oy}px)`;
        this.thumb.style.transform = `translate(${this.ox + dx}px, ${this.oy + dy}px)`;
    }

    down(e) {
        if (!this.capture || this.pointerId !== null) return;
        if (this.region && !this.region(e.clientY)) return;
        e.preventDefault();
        this.pointerId = e.pointerId;
        this.ox = e.clientX;
        this.oy = e.clientY;
        this.jx = this.jy = 0;
        this.place(0, 0);
        this.joy.classList.remove('idle');
    }

    drag(e) {
        if (e.pointerId !== this.pointerId) return;
        e.preventDefault();
        const R = this.radius;
        let dx = e.clientX - this.ox, dy = e.clientY - this.oy;
        let d = Math.hypot(dx, dy);
        if (d > R * 1.35) {
            // La base persigue al dedo
            const k = (d - R * 1.35) / d;
            this.ox += dx * k;
            this.oy += dy * k;
            dx = e.clientX - this.ox;
            dy = e.clientY - this.oy;
            d = Math.hypot(dx, dy);
        }
        const c = d > R ? R / d : 1;
        this.place(dx * c, dy * c);
        if (d / R < this.dead) {
            this.jx = this.jy = 0;
        } else {
            this.jx = dx / d;
            this.jy = dy / d;
        }
    }

    up(e) {
        if (e.pointerId !== this.pointerId) return;
        this.pointerId = null;
        this.jx = this.jy = 0;
        this.rest();
    }

    key(e, isDown) {
        const k = KEYS[e.code];
        if (!k) return;
        const arrow = e.code.startsWith('Arrow');
        if ((this.keySet === 'wasd' && arrow) || (this.keySet === 'arrows' && !arrow)) return;
        if (e.code.startsWith('Arrow')) e.preventDefault();
        this.keys[k] = isDown;
    }

    update() {
        let x = 0, z = 0;
        if (this.enabled) {
            if (this.pointerId !== null) {
                x = this.jx;
                z = this.jy;
            } else {
                x = (this.keys.r ? 1 : 0) - (this.keys.l ? 1 : 0);
                z = (this.keys.d ? 1 : 0) - (this.keys.u ? 1 : 0);
                const l = Math.hypot(x, z);
                if (l > 0) { x /= l; z /= l; }
            }
        }
        this.move.x = x;
        this.move.z = z;
        if ((x || z) && this.onMove) this.onMove();
    }
}
