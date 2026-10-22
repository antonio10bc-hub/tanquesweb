// Graba los últimos segundos de partida (tanques y balas) para repetir el golpe final
// a cámara lenta. Solo guarda lo necesario para dibujar: nada de lógica ni eventos.
const TANK_FIELDS = ['x', 'z', 'yaw', 'aimYaw', 'recoil', 'flash', 'hp', 'shield'];

export class ReplayRecorder {
    constructor(seconds = 3, fps = 30) {
        this.max = Math.ceil(seconds * fps);
        this.step = 1 / fps;
        this.frames = [];
        this.acc = 0;
        this.time = 0;
    }

    reset() {
        this.frames.length = 0;
        this.acc = 0;
        this.time = 0;
    }

    // force: graba ya aunque no toque (el fotograma del golpe final no se puede perder).
    record(dt, world, bullets, force = false) {
        this.time += dt;
        this.acc += dt;
        if (this.acc < this.step && !force) return;
        this.acc = 0;
        const frame = {
            t: this.time,
            tanks: world.tanks.map((t) => {
                const s = { alive: t.alive, moving: t.moving };
                for (const f of TANK_FIELDS) s[f] = t[f];
                return s;
            }),
            bullets: {
                n: bullets.n,
                x: bullets.x.slice(0, bullets.n),
                z: bullets.z.slice(0, bullets.n),
                size: bullets.size.slice(0, bullets.n),
                color: bullets.color.slice(0, bullets.n),
            },
        };
        this.frames.push(frame);
        if (this.frames.length > this.max) this.frames.shift();
    }

    get duration() {
        return this.frames.length ? this.frames[this.frames.length - 1].t - this.frames[0].t : 0;
    }

    // Aplica el fotograma correspondiente a "t" segundos desde el inicio de la grabación.
    apply(t, world, bullets) {
        if (!this.frames.length) return null;
        const t0 = this.frames[0].t;
        let f = this.frames[this.frames.length - 1];
        for (const fr of this.frames) if (fr.t - t0 >= t) { f = fr; break; }
        f.tanks.forEach((s, i) => {
            const tank = world.tanks[i];
            if (!tank) return;
            for (const k of TANK_FIELDS) tank[k] = s[k];
            tank.alive = s.alive;
            tank.moving = s.moving;
        });
        const b = f.bullets;
        bullets.n = b.n;
        bullets.x.set(b.x);
        bullets.z.set(b.z);
        bullets.size.set(b.size);
        bullets.color.set(b.color);
        return f;
    }
}
