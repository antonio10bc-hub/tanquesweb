// Efectos chiptune sintetizados al vuelo con WebAudio: cero archivos que cargar.
export class Sfx {
    constructor(volume = 0.32) {
        this.ctx = null;
        this.volume = volume;
    }

    // Los navegadores exigen un gesto del usuario para arrancar el audio.
    unlock() {
        if (!this.ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            this.ctx = new AC();
            this.master = this.ctx.createGain();
            this.master.gain.value = this.volume;
            this.master.connect(this.ctx.destination);
            const len = this.ctx.sampleRate;
            this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
            const data = this.noiseBuf.getChannelData(0);
            for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    out(pan) {
        if (!pan || !this.ctx.createStereoPanner) return this.master;
        const p = this.ctx.createStereoPanner();
        p.pan.value = Math.max(-1, Math.min(1, pan));
        p.connect(this.master);
        return p;
    }

    tone(type, f0, f1, dur, vol, pan = 0, delay = 0) {
        const c = this.ctx, t = c.currentTime + delay;
        const o = c.createOscillator(), g = c.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f0, t);
        o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(this.out(pan));
        o.start(t);
        o.stop(t + dur + 0.02);
    }

    noise(dur, vol, freq, pan = 0, delay = 0) {
        const c = this.ctx, t = c.currentTime + delay;
        const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
        src.buffer = this.noiseBuf;
        f.type = 'lowpass';
        f.frequency.setValueAtTime(freq, t);
        f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.2), t + dur);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(f).connect(g).connect(this.out(pan));
        src.start(t, Math.random() * 0.5);
        src.stop(t + dur + 0.02);
    }

    seq(type, notes, step, vol, len = step) {
        notes.forEach((n, i) => this.tone(type, n, n, len, vol, 0, i * step));
    }

    play(name, pan = 0) {
        if (!this.ctx || this.ctx.state !== 'running') return;
        switch (name) {
            case 'shot': this.tone('square', 900, 160, 0.09, 0.2, pan); this.noise(0.06, 0.25, 4000, pan); break;
            case 'shotEnemy': this.tone('square', 520, 110, 0.11, 0.16, pan); this.noise(0.07, 0.22, 2500, pan); break;
            case 'wall': this.tone('triangle', 420, 180, 0.05, 0.12, pan); break;
            case 'hit': this.noise(0.18, 0.5, 2200, pan); this.tone('square', 330, 70, 0.14, 0.22, pan); break;
            case 'hurt': this.noise(0.25, 0.6, 1400); this.tone('sawtooth', 220, 45, 0.3, 0.3); break;
            case 'boom': this.noise(0.9, 0.9, 900, pan); this.tone('sine', 140, 28, 0.8, 0.7, pan); break;
            case 'spot': this.tone('square', 988, 988, 0.06, 0.12); this.tone('square', 1319, 1319, 0.1, 0.12, 0, 0.07); break;
            case 'drop': this.tone('sine', 260, 50, 0.22, 0.45, pan); this.noise(0.15, 0.3, 700, pan); break;
            case 'reload': this.tone('square', 300, 200, 0.06, 0.1, pan); this.tone('square', 220, 160, 0.06, 0.1, pan, 0.09); break;
            case 'reloaded': this.tone('square', 520, 520, 0.04, 0.1, pan); this.tone('square', 780, 780, 0.06, 0.1, pan, 0.06); break;
            case 'itemSpawn': this.tone('triangle', 660, 990, 0.12, 0.12, pan); break;
            case 'itemGone': this.tone('triangle', 500, 250, 0.1, 0.08, pan); break;
            case 'heal': this.seq('square', [523, 659, 784, 1047], 0.05, 0.12, 0.1); break;
            case 'power': this.seq('sawtooth', [330, 440, 660, 880], 0.05, 0.12, 0.12); break;
            case 'grabOther': this.tone('square', 392, 262, 0.15, 0.12, pan); break;
            case 'tick': this.tone('square', 440, 440, 0.12, 0.14); break;
            case 'go': this.seq('square', [880, 1175, 1760], 0.07, 0.14, 0.2); break;
            case 'ui': this.tone('square', 660, 1320, 0.09, 0.14); break;
            case 'win': this.seq('square', [523, 659, 784, 1047, 784, 1047], 0.1, 0.14, 0.16); break;
            case 'lose': this.seq('triangle', [392, 330, 262, 196], 0.16, 0.22, 0.24); break;
        }
    }
}
