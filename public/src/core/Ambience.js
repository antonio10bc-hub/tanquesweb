// Ambiente sonoro de cada escenario, sintetizado al vuelo como el resto del audio: capas que
// suenan sin parar (viento, olas, rumor de lava, zumbido de la ciudad, el vacío del espacio...)
// y detalles sueltos que aparecen de vez en cuando (pájaros, gaviotas, burbujas de lava,
// sirenas lejanas, pitidos de radar...). Va por su propio bus, por debajo de efectos y música,
// y se funde al cambiar de escenario. Sigue el interruptor de efectos de Ajustes.
//
//   set(kind, { hard, extra, level })
//     kind   id del tema (content/themes.js) o 'map' (el mar del mapa de la campaña)
//     hard   modo difícil: un fondo inquietante encima (zumbido grave, susurros, campana)
//     extra  otro tema que se oye a la mitad por encima (el mundo elegido en el mapa)
//     level  volumen (1 en la partida; menos en el menú)

const VOL = 0.5;           // volumen general del ambiente: sutil, se nota pero no tapa nada
const FADE = 1.2;          // segundos del fundido al cambiar
const TICK = 0.25;         // cada cuánto se tiran los dados de los detalles sueltos

// Recetas: capas continuas (layers) y detalles sueltos (events: nombre -> veces por segundo)
const RECIPES = {
    snow: { layers: [['wind', 700, 0.9, 0.11, 0.13], ['wind', 1900, 2.5, 0.035, 0.31]], events: { gust: 0.08, creak: 0.05, chime: 0.07 } },
    desert: { layers: [['wind', 450, 0.7, 0.09, 0.09], ['wind', 3200, 3, 0.02, 0.23]], events: { gust: 0.12, hawk: 0.035, rattle: 0.04 } },
    candy: { layers: [['wind', 1200, 1.2, 0.03, 0.17], ['pad', [0, 4, 7, 11], 72, 0.014]], events: { twinkle: 0.5, pop: 0.12 } },
    volcano: { layers: [['rumble', 240, 0.1, 0.07], ['rumble', 520, 0.03, 0.19]], events: { bubble: 0.9, crackle: 1.2, eruption: 0.03 } },
    beach: { layers: [['waves', 0.05, 0.17], ['wind', 900, 0.8, 0.015, 0.21]], events: { gull: 0.06, splash: 0.06 } },
    meadow: { layers: [['wind', 1100, 0.9, 0.035, 0.16]], events: { bird: 0.55, cricket: 0.2, bee: 0.04 } },
    city: { layers: [['rumble', 320, 0.05, 0.05], ['hum', 120, 0.012]], events: { car: 0.11, siren: 0.025, horn: 0.03, buzz: 0.15 } },
    space: { layers: [['drone', [82.4, 83.1, 123.5, 164.8], 0.012], ['wind', 300, 4, 0.02, 0.05]], events: { blip: 0.3, ping: 0.08, warp: 0.03 } },
    rainbow: { layers: [['pad', [0, 4, 7, 11, 14], 60, 0.018], ['wind', 1500, 1.5, 0.02, 0.12]], events: { twinkle: 0.7, harp: 0.08 } },
    map: { layers: [['waves', 0.035, 0.12], ['wind', 800, 0.7, 0.012, 0.11]], events: { gull: 0.04 } },
    hard: { layers: [['drone', [73.4, 74.1, 110, 155.6], 0.016], ['rumble', 200, 0.04, 0.06]], events: { whisper: 0.12, toll: 0.03 } },
};

const PENTA = [0, 2, 4, 7, 9];
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Ambience {
    constructor(sfx) {
        this.sfx = sfx;
        this.enabled = true;
        this.current = null;   // { key, bus, nodes, events, level }
        this.timer = null;
        this.want = null;
    }

    // Cambia de ambiente (si es el mismo, no hace nada)
    set(kind, opts = {}) {
        const key = `${kind}|${opts.hard ? 1 : 0}|${opts.extra || ''}|${opts.level ?? 1}`;
        this.want = { kind, opts, key };
        if (this.current && this.current.key === key) return;
        this.apply();
    }

    // El audio acaba de arrancar (o de volver): pone lo pedido si aún no suena
    resume() {
        if (this.want && !this.current) this.apply();
    }

    stop() {
        this.want = null;
        this.apply();
    }

    // Arranca lo pedido (también al desbloquearse el audio o al volver a activar los efectos)
    apply() {
        const ctx = this.sfx.ctx;
        if (this.current) {
            this.fadeOut(this.current);
            this.current = null;
        }
        if (!ctx || !this.want || !this.enabled) return;
        const { kind, opts, key } = this.want;
        const level = (opts.level ?? 1) * VOL;
        const bus = ctx.createGain();
        bus.gain.setValueAtTime(0, ctx.currentTime);
        bus.gain.linearRampToValueAtTime(level, ctx.currentTime + FADE);
        bus.connect(this.sfx.master);
        const amb = { key, bus, nodes: [], events: [], level };
        const add = (name, scale) => {
            const r = RECIPES[name];
            if (!r) return;
            for (const l of r.layers) this.layer(amb, l, scale);
            for (const [ev, rate] of Object.entries(r.events)) amb.events.push([ev, rate * scale]);
        };
        add(kind, 1);
        if (opts.extra) add(opts.extra, 0.55);
        if (opts.hard) add('hard', 1);
        this.current = amb;
        if (!this.timer) this.timer = setInterval(() => this.tick(), TICK * 1000);
    }

    fadeOut(amb) {
        const ctx = this.sfx.ctx, t = ctx.currentTime;
        amb.bus.gain.cancelScheduledValues(t);
        amb.bus.gain.setValueAtTime(amb.bus.gain.value, t);
        amb.bus.gain.linearRampToValueAtTime(0, t + FADE);
        setTimeout(() => {
            for (const n of amb.nodes) {
                try { n.stop(); } catch { /* ya parado */ }
            }
            amb.bus.disconnect();
        }, (FADE + 0.2) * 1000);
    }

    setEnabled(on) {
        if (this.enabled === on) return;
        this.enabled = on;
        this.apply();
    }

    // ---------- Capas continuas ----------
    layer(amb, [type, ...a], scale) {
        const ctx = this.sfx.ctx, out = ctx.createGain();
        out.connect(amb.bus);
        const lfo = (rate, param, depth) => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.frequency.value = rate * (0.85 + Math.random() * 0.3);
            g.gain.value = depth;
            o.connect(g).connect(param);
            o.start();
            amb.nodes.push(o);
        };
        const noise = () => {
            const src = ctx.createBufferSource();
            src.buffer = this.sfx.noiseBuf;
            src.loop = true;
            src.start(0, Math.random());
            amb.nodes.push(src);
            return src;
        };
        if (type === 'wind') {
            // Ruido filtrado que sube y baja (el filtro también se mueve: rachas)
            const [freq, q, vol, rate] = a;
            const f = ctx.createBiquadFilter();
            f.type = 'bandpass';
            f.frequency.value = freq;
            f.Q.value = q;
            out.gain.value = vol * scale;
            noise().connect(f).connect(out);
            lfo(rate, out.gain, vol * scale * 0.6);
            lfo(rate * 0.7, f.frequency, freq * 0.35);
        } else if (type === 'rumble') {
            const [freq, vol, rate] = a;
            const f = ctx.createBiquadFilter();
            f.type = 'lowpass';
            f.frequency.value = freq;
            out.gain.value = vol * scale;
            noise().connect(f).connect(out);
            lfo(rate, out.gain, vol * scale * 0.5);
        } else if (type === 'waves') {
            // Olas: ruido grave que crece y rompe cada pocos segundos
            const [vol, rate] = a;
            const f = ctx.createBiquadFilter();
            f.type = 'lowpass';
            f.frequency.value = 800;
            out.gain.value = vol * scale * 0.55;
            noise().connect(f).connect(out);
            lfo(rate, out.gain, vol * scale * 0.5);
            lfo(rate, f.frequency, 500);
        } else if (type === 'hum') {
            const [freq, vol] = a;
            const o = ctx.createOscillator(), f = ctx.createBiquadFilter();
            o.type = 'sawtooth';
            o.frequency.value = freq;
            f.type = 'lowpass';
            f.frequency.value = 200;
            out.gain.value = vol * scale;
            o.connect(f).connect(out);
            o.start();
            amb.nodes.push(o);
        } else if (type === 'drone') {
            // Varias sinusoides casi iguales: un batido lento y profundo
            const [freqs, vol] = a;
            out.gain.value = vol * scale;
            for (const fr of freqs) {
                const o = ctx.createOscillator();
                o.type = 'sine';
                o.frequency.value = fr;
                o.connect(out);
                o.start();
                amb.nodes.push(o);
            }
            lfo(0.07, out.gain, vol * scale * 0.4);
        } else if (type === 'pad') {
            // Acorde suave muy agudo que respira (caramelo, arcoíris)
            const [steps, root, vol] = a;
            out.gain.value = vol * scale;
            steps.forEach((s, i) => {
                const o = ctx.createOscillator();
                o.type = 'triangle';
                o.frequency.value = hz(root + s);
                const g = ctx.createGain();
                g.gain.value = 0.5;
                o.connect(g).connect(out);
                o.start();
                amb.nodes.push(o);
                lfo(0.11 + i * 0.03, g.gain, 0.45);
            });
        }
    }

    // ---------- Detalles sueltos ----------
    tick() {
        const amb = this.current, ctx = this.sfx.ctx;
        if (!amb || !ctx || ctx.state !== 'running') return;
        for (const [ev, rate] of amb.events) {
            if (Math.random() < rate * TICK) this.event(ev, amb);
        }
    }

    tone(amb, type, f0, f1, dur, vol, pan = 0, delay = 0, attack = 0.005) {
        const ctx = this.sfx.ctx, t = ctx.currentTime + delay;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f0, t);
        o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(this.panner(amb, pan));
        o.start(t);
        o.stop(t + dur + 0.05);
    }

    hiss(amb, dur, vol, freq, type = 'bandpass', pan = 0, delay = 0, attack = 0.01, q = 1) {
        const ctx = this.sfx.ctx, t = ctx.currentTime + delay;
        const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        src.buffer = this.sfx.noiseBuf;
        f.type = type;
        f.frequency.value = freq;
        f.Q.value = q;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(f).connect(g).connect(this.panner(amb, pan));
        src.start(t, Math.random() * 0.5);
        src.stop(t + dur + 0.05);
        return f;
    }

    panner(amb, pan) {
        const ctx = this.sfx.ctx;
        if (!pan || !ctx.createStereoPanner) return amb.bus;
        const p = ctx.createStereoPanner();
        p.pan.value = pan;
        p.connect(amb.bus);
        return p;
    }

    event(name, amb) {
        const r = Math.random, side = () => (r() * 2 - 1) * 0.8;
        const pan = side();
        switch (name) {
            case 'bird': {
                // Dos o tres trinos rápidos
                const base = 2200 + r() * 1800, n = 2 + ((r() * 3) | 0);
                for (let i = 0; i < n; i++) this.tone(amb, 'sine', base * (1 + r() * 0.3), base * (0.8 + r() * 0.6), 0.07, 0.035, pan, i * 0.09);
                break;
            }
            case 'cricket':
                for (let i = 0; i < 4; i++) this.tone(amb, 'square', 4200, 4100, 0.025, 0.006, pan, i * 0.05);
                break;
            case 'bee':
                this.tone(amb, 'sawtooth', 220, 240, 1.2, 0.01, pan, 0, 0.3);
                break;
            case 'gull':
                for (let i = 0; i < 2 + ((r() * 2) | 0); i++) this.tone(amb, 'triangle', 1500 + r() * 300, 900, 0.22, 0.03, pan, i * 0.26, 0.03);
                break;
            case 'splash':
                this.hiss(amb, 0.6, 0.05, 2500, 'highpass', pan, 0, 0.15);
                break;
            case 'gust': {
                const f = this.hiss(amb, 2.2, 0.06, 600, 'bandpass', pan, 0, 0.9, 1.5);
                f.frequency.exponentialRampToValueAtTime(1400, this.sfx.ctx.currentTime + 1.2);
                break;
            }
            case 'creak':
                this.tone(amb, 'triangle', 320 + r() * 60, 230, 0.35, 0.02, pan, 0, 0.05);
                break;
            case 'chime':
                this.tone(amb, 'sine', 2600 + r() * 900, 2600, 0.5, 0.02, pan);
                break;
            case 'hawk':
                this.tone(amb, 'sine', 1900, 1250, 0.9, 0.025, pan, 0, 0.1);
                break;
            case 'rattle':
                for (let i = 0; i < 6; i++) this.hiss(amb, 0.03, 0.025, 6000, 'highpass', pan, i * 0.035);
                break;
            case 'twinkle': {
                const m = 84 + PENTA[(r() * 5) | 0] + (r() < 0.3 ? 12 : 0);
                this.tone(amb, 'triangle', hz(m), hz(m), 0.35, 0.02, pan);
                break;
            }
            case 'harp':
                [0, 4, 7, 11, 14].forEach((s, i) => this.tone(amb, 'triangle', hz(72 + s), hz(72 + s), 0.6, 0.018, pan, i * 0.07));
                break;
            case 'pop':
                this.tone(amb, 'sine', 500, 1100, 0.06, 0.03, pan);
                break;
            case 'bubble':
                this.tone(amb, 'sine', 160 + r() * 80, 420 + r() * 200, 0.12, 0.06, pan);
                break;
            case 'crackle':
                for (let i = 0; i < 2 + ((r() * 4) | 0); i++) this.hiss(amb, 0.02, 0.03, 3000 + r() * 3000, 'highpass', pan, r() * 0.25, 0.002);
                break;
            case 'eruption':
                this.hiss(amb, 2.5, 0.16, 160, 'lowpass', pan * 0.5, 0, 0.3);
                this.tone(amb, 'sine', 110, 55, 2, 0.12, pan * 0.5, 0, 0.2);
                break;
            case 'car': {
                // Un coche que cruza de un lado a otro
                const ctx = this.sfx.ctx, f = this.hiss(amb, 1.6, 0.05, 500, 'bandpass', 0, 0, 0.7, 2);
                f.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 1.6);
                break;
            }
            case 'siren':
                for (let i = 0; i < 4; i++) {
                    this.tone(amb, 'triangle', 620, 820, 0.45, 0.012, pan, i * 0.9, 0.1);
                    this.tone(amb, 'triangle', 820, 620, 0.45, 0.012, pan, i * 0.9 + 0.45, 0.1);
                }
                break;
            case 'horn':
                this.tone(amb, 'square', 330, 320, 0.3, 0.008, pan, 0, 0.02);
                this.tone(amb, 'square', 330, 320, 0.2, 0.008, pan, 0.4, 0.02);
                break;
            case 'buzz':
                this.tone(amb, 'sawtooth', 120, 120, 0.25, 0.006, pan);
                break;
            case 'blip': {
                const m = 79 + PENTA[(r() * 5) | 0];
                this.tone(amb, 'square', hz(m), hz(m), 0.06, 0.01, pan);
                break;
            }
            case 'ping':
                for (let i = 0; i < 3; i++) this.tone(amb, 'sine', 1320, 1320, 0.35, 0.025 / (i + 1), pan, i * 0.3);
                break;
            case 'warp':
                this.tone(amb, 'sawtooth', 80, 900, 1.4, 0.012, pan, 0, 0.5);
                break;
            case 'whisper': {
                const f = this.hiss(amb, 1.4, 0.035, 3000, 'bandpass', pan, 0, 0.5, 6);
                f.frequency.exponentialRampToValueAtTime(5000, this.sfx.ctx.currentTime + 1.4);
                break;
            }
            case 'toll':
                // Campana lejana: dos parciales que se apagan despacio
                this.tone(amb, 'sine', 196, 194, 3, 0.05, pan * 0.4, 0, 0.01);
                this.tone(amb, 'sine', 466, 463, 2.2, 0.02, pan * 0.4, 0, 0.01);
                break;
        }
    }
}
