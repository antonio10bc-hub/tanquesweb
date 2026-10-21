// Música chiptune generada al vuelo: bajo, arpegio, melodía y batería sobre una progresión
// de 4 compases. Cada tema elige raíz, escala, tempo y timbre; la melodía se genera con una
// semilla, así que cada escenario suena distinto pero siempre igual dentro de una partida.
// "intensity" (0..1) acelera y añade capas cuando la cosa se pone fea.
const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
};
const PROGRESSIONS = {
    major: [0, 5, 3, 4],
    minor: [0, 5, 2, 6],
    dorian: [0, 3, 0, 6],
};
const BASS = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0];
const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Music {
    constructor(sfx) {
        this.sfx = sfx;
        this.timer = null;
        this.intensity = 0;
        this.enabled = true;
    }

    start(cfg, seed = 1) {
        this.stop();
        const ctx = this.sfx.ctx;
        if (!ctx || !this.enabled) return;
        this.cfg = { root: 57, scale: 'minor', tempo: 120, lead: 'square', ...cfg };
        this.scale = SCALES[this.cfg.scale] || SCALES.minor;
        this.prog = PROGRESSIONS[this.cfg.scale] || PROGRESSIONS.minor;
        this.melody = makeMelody(seed);
        this.bus = ctx.createGain();
        this.bus.gain.value = 0;
        this.bus.gain.linearRampToValueAtTime(0.42, ctx.currentTime + 0.6);
        this.bus.connect(this.sfx.master);
        this.step = 0;
        this.next = ctx.currentTime + 0.08;
        this.timer = setInterval(() => this.tick(), 25);
    }

    stop(fade = 0.4) {
        if (!this.timer) return;
        clearInterval(this.timer);
        this.timer = null;
        const ctx = this.sfx.ctx, bus = this.bus;
        bus.gain.cancelScheduledValues(ctx.currentTime);
        bus.gain.setValueAtTime(bus.gain.value, ctx.currentTime);
        bus.gain.linearRampToValueAtTime(0, ctx.currentTime + fade);
        setTimeout(() => bus.disconnect(), (fade + 0.3) * 1000);
    }

    get playing() {
        return !!this.timer;
    }

    tick() {
        const ctx = this.sfx.ctx;
        if (ctx.state !== 'running') {
            this.next = ctx.currentTime + 0.05;
            return;
        }
        const sixteenth = 60 / (this.cfg.tempo * (1 + 0.14 * this.intensity)) / 4;
        while (this.next < ctx.currentTime + 0.12) {
            this.schedule(this.step, this.next, sixteenth);
            this.next += sixteenth;
            this.step++;
        }
    }

    note(deg, octave) {
        const s = this.scale, n = s.length;
        const o = Math.floor(deg / n);
        return this.cfg.root + 12 * (octave + o) + s[((deg % n) + n) % n];
    }

    schedule(step, t, len) {
        const s = step % 16, bar = Math.floor(step / 16) % 4;
        const deg = this.prog[bar];
        const chord = [deg, deg + 2, deg + 4];
        const hot = this.intensity > 0.5;

        if (BASS[s]) this.voice('triangle', this.note(deg, -1), t, len * 2.2, 0.28);
        if (s % 2 === 0 || hot) this.voice('square', this.note(chord[(s >> (hot ? 0 : 1)) % 3], 1), t, len * 0.9, hot ? 0.05 : 0.04);
        const m = this.melody[(step % 64)];
        if (m !== null) this.voice(this.cfg.lead, this.note(deg + m, 1), t, len * 1.8, 0.07);

        if (s % 8 === 0) this.kick(t);
        if (s % 8 === 4) this.hiss(t, 0.12, 0.16, 1800);
        if (s % 2 === 1) this.hiss(t, 0.03, hot ? 0.06 : 0.035, 7000);
    }

    voice(type, midi, t, dur, vol) {
        const ctx = this.sfx.ctx;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(midiToHz(midi), t);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(this.bus);
        o.start(t);
        o.stop(t + dur + 0.02);
    }

    kick(t) {
        const ctx = this.sfx.ctx;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(150, t);
        o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
        g.gain.setValueAtTime(0.5, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
        o.connect(g).connect(this.bus);
        o.start(t);
        o.stop(t + 0.16);
    }

    hiss(t, dur, vol, freq) {
        const ctx = this.sfx.ctx;
        const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        src.buffer = this.sfx.noiseBuf;
        f.type = 'highpass';
        f.frequency.value = freq;
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(f).connect(g).connect(this.bus);
        src.start(t, Math.random() * 0.5);
        src.stop(t + dur + 0.02);
    }
}

// 64 pasos de melodía: grados relativos al acorde o silencio, con un paseo aleatorio suave.
function makeMelody(seed) {
    let a = seed >>> 0;
    const rnd = () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), a | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const out = [];
    let deg = 2;
    for (let i = 0; i < 64; i++) {
        const strong = i % 4 === 0;
        if (rnd() < (strong ? 0.75 : 0.3)) {
            deg = Math.max(-2, Math.min(7, deg + Math.floor(rnd() * 5) - 2));
            out.push(deg);
        } else out.push(null);
    }
    return out;
}
