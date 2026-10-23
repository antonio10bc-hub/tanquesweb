// Graba los últimos segundos de partida (tanques, balas y ataques de los jefes) para repetir
// el golpe final a cámara lenta. Solo guarda lo necesario para dibujar: nada de lógica. Los
// momentos sueltos (un meteorito que impacta) se apuntan con note() y la repetición los
// devuelve al pasar por ellos para volver a pintar su efecto.
const TANK_FIELDS = ['x', 'z', 'yaw', 'aimYaw', 'recoil', 'flash', 'hp', 'shield'];

export class ReplayRecorder {
    constructor(seconds = 3, fps = 30) {
        this.max = Math.ceil(seconds * fps);
        this.step = 1 / fps;
        this.frames = [];
        this.acc = 0;
        this.time = 0;
        this.notes = [];
        this.cursor = -1;
    }

    reset() {
        this.frames.length = 0;
        this.acc = 0;
        this.time = 0;
        this.notes = [];
        this.cursor = -1;
    }

    // Un momento suelto: va en el próximo fotograma que se grabe
    note(kind, data) {
        this.notes.push({ kind, data: { ...data, hits: undefined, owner: undefined } });
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
            nukes: world.nukes.map((n) => ({ ...n })),
            // Copias sin las referencias a tanques (solo lo que lee HazardView)
            hazards: world.hazards.list.map(({ hits, owner, ...h }) => h),
            notes: this.notes,
            bullets: {
                n: bullets.n,
                x: bullets.x.slice(0, bullets.n),
                z: bullets.z.slice(0, bullets.n),
                size: bullets.size.slice(0, bullets.n),
                color: bullets.color.slice(0, bullets.n),
            },
        };
        this.notes = [];
        this.frames.push(frame);
        if (this.frames.length > this.max) this.frames.shift();
    }

    get duration() {
        return this.frames.length ? this.frames[this.frames.length - 1].t - this.frames[0].t : 0;
    }

    // Aplica el fotograma correspondiente a "t" segundos desde el inicio de la grabación.
    // Devuelve los momentos sueltos de los fotogramas por los que ha pasado desde la última vez
    // (rewind() vuelve a empezar).
    apply(t, world, bullets) {
        if (!this.frames.length) return [];
        const t0 = this.frames[0].t;
        let idx = this.frames.length - 1;
        for (let i = 0; i < this.frames.length; i++) if (this.frames[i].t - t0 >= t) { idx = i; break; }
        const f = this.frames[idx];
        const notes = [];
        for (let i = Math.max(0, this.cursor + 1); i <= idx; i++) if (this.cursor >= 0 || i === idx) notes.push(...this.frames[i].notes);
        this.cursor = Math.max(this.cursor, idx);
        f.tanks.forEach((s, i) => {
            const tank = world.tanks[i];
            if (!tank) return;
            for (const k of TANK_FIELDS) tank[k] = s[k];
            tank.alive = s.alive;
            tank.moving = s.moving;
        });
        world.nukes = f.nukes.map((n) => ({ ...n }));
        world.hazards.list = f.hazards.map((h) => ({ ...h }));
        const b = f.bullets;
        bullets.n = b.n;
        bullets.x.set(b.x);
        bullets.z.set(b.z);
        bullets.size.set(b.size);
        bullets.color.set(b.color);
        return notes;
    }

    rewind() {
        this.cursor = -1;
    }
}
