// Efectos chiptune sintetizados al vuelo con WebAudio: cero archivos que cargar.
export class Sfx {
    constructor(volume = 0.32) {
        this.ctx = null;
        this.volume = volume;
        this.enabled = true; // efectos (la música va aparte, en core/Music.js)
    }

    // Los navegadores exigen un gesto del usuario para arrancar el audio. Se llama en cada
    // toque/tecla: crea el contexto la primera vez y lo reanuda siempre que no esté sonando
    // (en iPhone el estado puede ser "interrupted", no solo "suspended").
    unlock() {
        if (!this.ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            // Safari 16.4+: que el interruptor de silencio del iPhone no apague el juego
            try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* no disponible */ }
            this.ctx = new AC();
            this.ctx.onstatechange = () => this.onStateChange && this.onStateChange(this.ctx.state);
            this.master = this.ctx.createGain();
            this.master.gain.value = this.volume;
            // Compresor al final: une la mezcla y evita que las explosiones saturen
            this.comp = this.ctx.createDynamicsCompressor();
            this.comp.threshold.value = -16;
            this.comp.knee.value = 12;
            this.comp.ratio.value = 4;
            this.comp.attack.value = 0.004;
            this.comp.release.value = 0.2;
            this.master.connect(this.comp).connect(this.ctx.destination);
            // Los efectos pasan por su propio bus con un eco opcional (la música va aparte)
            this.fx = this.ctx.createGain();
            this.fx.connect(this.master);
            this.delay = this.ctx.createDelay(1);
            this.feedback = this.ctx.createGain();
            this.wet = this.ctx.createGain();
            this.feedback.gain.value = 0;
            this.wet.gain.value = 0;
            this.fx.connect(this.delay);
            this.delay.connect(this.feedback).connect(this.delay);
            this.delay.connect(this.wet).connect(this.master);
            this.setAmbience(this.ambience);
            const len = this.ctx.sampleRate;
            this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
            const data = this.noiseBuf.getChannelData(0);
            for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        }
        if (this.ctx.state !== 'running' && !this.held) {
            this.ctx.resume().catch(() => {});
            // Un sonido vacío dentro del gesto termina de desbloquear el audio en iOS
            const src = this.ctx.createBufferSource();
            src.buffer = this.ctx.createBuffer(1, 1, 22050);
            src.connect(this.ctx.destination);
            src.start(0);
        }
    }

    // Pausa: suspende el audio y evita que un toque lo reanude mientras dura.
    hold(on) {
        this.held = on;
        if (!this.ctx) return;
        if (on) this.ctx.suspend().catch(() => {});
        else this.ctx.resume().catch(() => {});
    }

    // Corta en seco lo que quede sonando de la partida (explosiones largas, fanfarrias a
    // medias, ecos...): esos sonidos van al bus de efectos viejo, que se apaga y se suelta;
    // lo que suene después va por uno nuevo.
    cut() {
        if (!this.ctx) return;
        const old = this.fx, t = this.ctx.currentTime;
        old.gain.setValueAtTime(old.gain.value, t);
        old.gain.linearRampToValueAtTime(0, t + 0.06);
        setTimeout(() => old.disconnect(), 150);
        this.fx = this.ctx.createGain();
        this.fx.connect(this.master);
        this.fx.connect(this.delay);
        // La cola del eco también se apaga (y el eco vuelve a estar listo enseguida)
        const wet = this.wet.gain.value;
        this.wet.gain.cancelScheduledValues(t);
        this.wet.gain.setValueAtTime(0, t);
        this.wet.gain.setValueAtTime(wet, t + 0.6);
    }

    // Acústica del escenario: tipo de suelo (cambia el ruido de las orugas) y eco
    // (la ciudad entre edificios, la cueva del volcán, el vacío del espacio...).
    setAmbience(amb = {}) {
        this.ambience = amb;
        this.ground = amb.ground || 'grass';
        if (!this.ctx) return;
        const t = this.ctx.currentTime, echo = amb.echo || 0;
        this.delay.delayTime.setValueAtTime(echo || 0.1, t);
        this.feedback.gain.setValueAtTime(echo ? 0.32 : 0, t);
        this.wet.gain.setValueAtTime(echo ? 0.32 : 0, t);
    }

    out(pan) {
        if (!pan || !this.ctx.createStereoPanner) return this.fx;
        const p = this.ctx.createStereoPanner();
        p.pan.value = Math.max(-1, Math.min(1, pan));
        p.connect(this.fx);
        return p;
    }

    // Orugas sobre el suelo del escenario (vol: 1 tu tanque, menos para los rivales cercanos)
    tread(pan = 0, vol = 1, surface = this.ground) {
        if (!this.ctx || this.ctx.state !== 'running' || !this.enabled) return;
        const v = 0.7 * vol;
        switch (surface) {
            case 'sand': this.noise(0.06, 0.07 * v, 3200, pan); break;
            case 'snow': this.noise(0.08, 0.09 * v, 1800, pan); this.tone('triangle', 130, 80, 0.04, 0.04 * v, pan); break;
            case 'candy': this.tone('square', 900 + Math.random() * 300, 1300, 0.03, 0.025 * v, pan); break;
            case 'rock': this.tone('sine', 95, 50, 0.06, 0.1 * v, pan); this.noise(0.04, 0.05 * v, 700, pan); break;
            case 'metal': this.tone('square', 240, 190, 0.03, 0.035 * v, pan); this.noise(0.03, 0.04 * v, 6500, pan); break;
            case 'ice': this.noise(0.14, 0.05 * v, 7500, pan); break;
            case 'bush': this.noise(0.1, 0.08 * v, 2600, pan); break;
            default: this.noise(0.05, 0.06 * v, 1000, pan); // hierba
        }
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
        if (!this.ctx || this.ctx.state !== 'running' || !this.enabled) return;
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
            case 'crateHit': this.noise(0.08, 0.25, 900, pan); this.tone('square', 180, 120, 0.06, 0.12, pan); break;
            case 'crateBreak': this.noise(0.35, 0.5, 1400, pan); this.tone('triangle', 260, 60, 0.3, 0.3, pan); break;
            case 'boing': this.tone('sine', 300, 900, 0.12, 0.2, pan); break;
            case 'shield': this.tone('square', 1200, 300, 0.2, 0.15, pan); this.noise(0.2, 0.3, 5000, pan); break;
            case 'shieldGet': this.seq('triangle', [392, 523, 659, 784], 0.05, 0.16, 0.12); break;
            case 'turbo': this.tone('sawtooth', 200, 1200, 0.3, 0.12); break;
            case 'bounceGet': this.seq('square', [523, 784, 659, 1047], 0.05, 0.12, 0.08); break;
            case 'radar': this.tone('sine', 1320, 1320, 0.08, 0.15); this.tone('sine', 1320, 1320, 0.08, 0.1, 0, 0.25); break;
            case 'pause': this.tone('square', 660, 440, 0.08, 0.12); break;
            case 'streak2': this.seq('square', [784, 1047], 0.07, 0.14, 0.12); break;
            case 'streak3': this.seq('square', [784, 988, 1319], 0.07, 0.14, 0.12); break;
            case 'streak4': this.seq('square', [784, 988, 1175, 1568], 0.06, 0.14, 0.12); break;
            case 'streak5': this.seq('square', [523, 659, 784, 1047, 1319, 1568, 2093], 0.06, 0.14, 0.16); this.seq('sawtooth', [262, 330, 392, 523], 0.09, 0.08, 0.2); break;
            case 'triple': this.seq('square', [880, 1175, 1568], 0.04, 0.12, 0.08); break;
            case 'decoy': this.tone('triangle', 300, 900, 0.25, 0.14); this.noise(0.3, 0.25, 3000); break;
            case 'decoyPop': this.tone('square', 700, 120, 0.2, 0.14, pan); this.noise(0.25, 0.3, 2500, pan); break;
            case 'nukeGet': this.seq('square', [196, 262, 330, 392, 523], 0.06, 0.14, 0.12); break;
            case 'nukeLaunch': this.tone('square', 220, 90, 0.25, 0.25, pan); this.tone('sine', 1400, 300, 1.35, 0.12, pan, 0.05); break;
            case 'nuke': this.noise(1.8, 1, 700, pan); this.tone('sine', 110, 22, 1.6, 0.9, pan); this.noise(0.4, 0.8, 4000, pan); break;
            case 'coin': this.tone('square', 988, 988, 0.07, 0.14); this.tone('square', 1319, 1319, 0.2, 0.14, 0, 0.07); break;
            case 'achievement': this.seq('square', [784, 988, 1175, 1568], 0.07, 0.13, 0.14); this.seq('triangle', [392, 494, 587, 784], 0.07, 0.12, 0.14); break;
            // Jefes
            case 'warn': this.tone('square', 880, 880, 0.08, 0.14); this.tone('square', 660, 660, 0.08, 0.14, 0, 0.12); this.tone('square', 880, 880, 0.08, 0.14, 0, 0.24); break;
            case 'roar': this.tone('sawtooth', 160, 50, 0.9, 0.35); this.tone('square', 110, 40, 0.9, 0.25, 0, 0.05); this.noise(0.8, 0.5, 900); break;
            case 'charge': this.tone('sawtooth', 90, 260, 0.5, 0.25, pan); this.noise(0.5, 0.35, 1200, pan); break;
            case 'wave': this.noise(1.6, 0.55, 2400); this.tone('sine', 220, 90, 1.4, 0.2); break;
            case 'storm': this.noise(1.4, 0.45, 3200); this.tone('triangle', 300, 900, 0.9, 0.08); break;
            case 'laser': this.tone('sawtooth', 1400, 300, 0.25, 0.16, pan); this.tone('square', 220, 220, 1.2, 0.08, pan, 0.2); break;
            case 'siren': for (let i = 0; i < 3; i++) { this.tone('square', 700, 1100, 0.2, 0.1, 0, i * 0.4); this.tone('square', 1100, 700, 0.2, 0.1, 0, i * 0.4 + 0.2); } break;
            case 'plane': this.tone('sawtooth', 70, 110, 1.6, 0.07); this.tone('square', 140, 210, 1.6, 0.04); this.noise(1.4, 0.12, 900); break;
            case 'whoosh': this.tone('triangle', 1600, 200, 0.5, 0.12, pan); this.noise(0.4, 0.2, 5000, pan); break;
            case 'crash': this.noise(0.5, 0.7, 1600, pan); this.tone('square', 180, 50, 0.3, 0.3, pan); break;
            case 'candy': this.seq('square', [1047, 1319, 1568, 2093], 0.04, 0.1, 0.06); break;
            case 'unlock': this.seq('square', [523, 659, 784, 1047, 1319], 0.08, 0.13, 0.14); this.seq('triangle', [262, 330, 392, 523, 659], 0.08, 0.12, 0.14); break;
            case 'secret': this.seq('square', [523, 659, 784, 988, 1175, 1319, 1568, 2093], 0.09, 0.12, 0.18); this.seq('triangle', [262, 330, 392, 494, 587, 659, 784, 1047], 0.09, 0.12, 0.18); break;
            case 'step': this.tone('square', 330, 200, 0.04, 0.06); break;
            case 'tick': this.tone('square', 440, 440, 0.12, 0.14); break;
            case 'go': this.seq('square', [880, 1175, 1760], 0.07, 0.14, 0.2); break;
            case 'ui': this.tone('square', 660, 1320, 0.09, 0.14); break;
            case 'win': this.seq('square', [523, 659, 784, 1047, 784, 1047], 0.1, 0.14, 0.16); break;
            // ---------- Tensión ----------
            // Latido: tu última vida (dos golpes graves)
            case 'heartbeat': this.tone('sine', 70, 45, 0.12, 0.35); this.tone('sine', 62, 40, 0.14, 0.25, 0, 0.17); break;
            // Queda un solo enemigo en la oleada
            case 'lastOne': this.seq('square', [440, 554, 659], 0.06, 0.08, 0.1); this.tone('sine', 110, 55, 0.5, 0.2); break;
            // Aparece la bomba nuclear: alarma corta
            case 'nukeSpawn': this.tone('square', 660, 660, 0.1, 0.16, pan); this.tone('square', 880, 880, 0.1, 0.16, pan, 0.12); this.tone('square', 660, 660, 0.1, 0.16, pan, 0.24); break;
            // ---------- Cuenta atrás: cada número más agudo ----------
            case 'count3': this.tone('square', 440, 440, 0.12, 0.14); this.tone('sine', 110, 60, 0.15, 0.25); break;
            case 'count2': this.tone('square', 523, 523, 0.12, 0.14); this.tone('sine', 120, 60, 0.15, 0.25); break;
            case 'count1': this.tone('square', 659, 659, 0.14, 0.15); this.tone('sine', 130, 60, 0.18, 0.28); break;
            // ---------- Modos ----------
            // Duelo: campana de boxeo, dos golpes
            case 'bell':
                for (const d of [0, 0.32]) { this.tone('sine', 1480, 1470, 1.1, 0.16, 0, d); this.tone('sine', 2350, 2340, 0.7, 0.07, 0, d); this.tone('triangle', 740, 735, 0.9, 0.06, 0, d); }
                break;
            // Supervivencia: bocina de que llega una oleada
            case 'waveHorn': this.tone('sawtooth', 233, 220, 0.42, 0.2); this.tone('sawtooth', 175, 165, 0.6, 0.17, 0, 0.45); this.noise(0.9, 0.12, 400); break;
            // Supervivencia: oleada superada
            case 'waveClear': this.seq('square', [523, 659, 784, 1047, 1319], 0.07, 0.12, 0.12); this.seq('triangle', [262, 330, 392, 523, 659], 0.07, 0.12, 0.12); break;
            // ---------- Campaña ----------
            // El jefe entra en escena: acorde grave de metales, golpes de timbal que aceleran y un platillo
            case 'bossSting':
                for (const f of [65.4, 92.5, 98]) this.tone('sawtooth', f, f * 0.98, 1.6, 0.09);
                for (let i = 0; i < 7; i++) this.tone('sine', 90, 50, 0.16, 0.18 + i * 0.03, 0, 0.9 - 0.9 / (i + 1.2));
                this.noise(1.4, 0.25, 7000, 0, 0.9);
                break;
            // ...y en modo difícil, más oscuro: tritono y una campana
            case 'hardSting':
                for (const f of [55, 77.8, 110]) this.tone('sawtooth', f, f * 0.97, 2, 0.1);
                this.tone('sine', 196, 194, 2.4, 0.18, 0, 0.6);
                this.tone('sine', 466, 462, 1.8, 0.07, 0, 0.6);
                this.noise(1.8, 0.3, 900, 0, 0.6);
                break;
            // Jefe derrotado: fanfarria larga
            case 'bossWin':
                this.seq('square', [523, 523, 523, 659, 784, 659, 784, 1047], 0.11, 0.13, 0.16);
                this.seq('triangle', [262, 262, 262, 330, 392, 330, 392, 523], 0.11, 0.13, 0.16);
                this.tone('sine', 131, 131, 1, 0.2, 0, 0.88);
                break;
            // ---------- Bailes de victoria ----------
            case 'rocket': this.noise(0.16, 0.14, 1100); this.tone('sawtooth', 90, 60, 0.12, 0.05); break;
            case 'fizz': this.noise(0.05, 0.05, 6500); break;
            case 'wind': this.noise(0.45, 0.09, 1400); break;
            case 'swish': this.tone('triangle', 500, 1400, 0.12, 0.06); this.noise(0.1, 0.05, 4500); break;
            case 'twinkle': this.seq('triangle', [1568, 2093, 2637], 0.04, 0.06, 0.08); break;
            case 'pop': this.tone('sine', 420 + Math.random() * 200, 1000, 0.05, 0.1); break;
            // Helicóptero: el golpe de las aspas
            case 'chop': this.noise(0.05, 0.22, 600); this.tone('sine', 95, 60, 0.05, 0.16); break;
            case 'discoBeat': this.tone('sine', 150, 40, 0.13, 0.32); this.noise(0.04, 0.07, 9000, 0, 0.16); break;
            case 'kiss': this.tone('sine', 1100, 1800, 0.09, 0.07); this.tone('sine', 1500, 2200, 0.07, 0.05, 0, 0.1); break;
            case 'inflate': this.tone('triangle', 180, 520, 0.4, 0.07); this.noise(0.35, 0.03, 2500); break;
            case 'flap': this.noise(0.09, 0.1, 1600); break;
            case 'jelly': this.tone('sine', 260 + Math.random() * 120, 200, 0.11, 0.09); break;
            case 'scratch': this.tone('sawtooth', 380, 140, 0.12, 0.05); this.noise(0.1, 0.06, 2200); break;
            // Rockero: acorde de quinta con distorsión (dos sierras casi iguales)
            case 'riff': for (const f of [110, 110.8, 165, 220]) this.tone('sawtooth', f, f * 0.99, 0.3, 0.05); break;
            case 'lose': this.seq('triangle', [392, 330, 262, 196], 0.16, 0.22, 0.24); break;
        }
    }
}
