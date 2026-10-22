// Capa DOM: menús, marcador de vida, aviso de sigilo y carteles.
export class Hud {
    constructor() {
        const $ = (id) => document.getElementById(id);
        this.el = {
            hud: $('hud'), menu: $('menu'), end: $('end'), banner: $('banner'),
            play: $('btn-play'), again: $('btn-again'), endMenu: $('btn-end-menu'),
            settings: $('settings'),
            pause: $('pause'), pauseBtn: $('btn-pause'), resume: $('btn-resume'), quit: $('btn-quit'),
            stage: $('stage'), stageName: $('stage-name'), stageSub: $('stage-sub'), replay: $('replay'),
            endTitle: $('end-title'), endSub: $('end-sub'),
            stealth: $('stealth'), hint: $('hint'),
            p: { name: $('p-name'), hp: $('p-hp') },
            e: { name: $('e-name'), hp: $('e-hp') },
        };
        this.cache = { p: { hp: -1, max: -1 }, e: { hp: -1, max: -1 }, visible: null };
        this.onPlay = null;
        this.onAgain = null;
        this.onMenu = null;
        this.onPause = null;
        this.onResume = null;
        this.onQuit = null;
        this.onToggle = null;
        this.el.pauseBtn.addEventListener('click', () => this.onPause && this.onPause());
        $('btn-settings').addEventListener('click', () => this.showSettings(true));
        $('btn-settings-close').addEventListener('click', () => this.showSettings(false));
        window.addEventListener('keydown', (e) => e.code === 'Escape' && this.showSettings(false));
        this.settingsSource = null;
        this.el.resume.addEventListener('click', () => this.onResume && this.onResume());
        this.el.quit.addEventListener('click', () => this.onQuit && this.onQuit());
        this.toggles = [...document.querySelectorAll('.toggle')];
        for (const t of this.toggles) t.addEventListener('click', () => this.onToggle && this.onToggle(t.dataset.key));
        this.el.play.addEventListener('click', () => this.onPlay && this.onPlay());
        this.el.again.addEventListener('click', () => this.onAgain && this.onAgain());
        this.el.endMenu.addEventListener('click', () => this.onMenu && this.onMenu());
    }

    ready() {
        this.el.play.disabled = false;
        this.el.play.textContent = 'PARTIDA RÁPIDA';
        document.getElementById('btn-survival').disabled = false;
    }

    setCoins(n) {
        for (const id of ['menu-coins', 'garage-coins']) document.getElementById(id).textContent = n;
    }

    setTrophies(done, total) {
        document.getElementById('menu-trophies').textContent = `${done}/${total}`;
    }

    // Aviso breve arriba (moneda ganada, logro desbloqueado). Se encolan si llegan varios.
    toast(text, kind = '') {
        this.toasts = this.toasts || [];
        this.toasts.push({ text, kind });
        if (!this.toastBusy) this.nextToast();
    }

    nextToast() {
        const t = this.toasts.shift();
        const el = document.getElementById('toast');
        if (!t) {
            this.toastBusy = false;
            return;
        }
        this.toastBusy = true;
        el.className = 'toast';
        void el.offsetWidth;
        el.innerHTML = `<span class="${t.kind === 'coin' ? 'coin' : 'trophy'}"></span>`;
        el.append(t.text);
        el.className = `toast show ${t.kind === 'trophy' ? 'trophy-toast' : ''}`;
        setTimeout(() => this.nextToast(), 2700);
    }

    screen(name) {
        this.el.menu.classList.toggle('hidden', name !== 'menu');
        this.el.end.classList.toggle('hidden', name !== 'end');
        this.el.hud.classList.toggle('hidden', name === 'menu');
        this.el.pauseBtn.classList.toggle('hidden', name !== 'play');
    }

    showPause(on, settings) {
        this.el.pause.classList.toggle('hidden', !on);
        if (settings) this.syncToggles(settings);
    }

    // Pantalla de ajustes del menú principal (los mismos interruptores que la pausa).
    showSettings(on) {
        this.el.settings.classList.toggle('hidden', !on);
        if (on && this.settingsSource) this.syncToggles(this.settingsSource);
    }

    syncToggles(settings) {
        for (const t of this.toggles) t.classList.toggle('off', !settings[t.dataset.key]);
    }

    showReplay(on) {
        this.el.replay.classList.toggle('hidden', !on);
        this.el.pauseBtn.classList.toggle('hidden', on);
        this.replaying = on;
        this.el.stealth.classList.toggle('hidden', on);
        if (on) this.showHint(false);
    }

    stage(name, sub) {
        const s = this.el.stage;
        this.el.stageName.textContent = name;
        this.el.stageSub.textContent = sub;
        s.className = 'stage';
        void s.offsetWidth;
        s.className = 'stage show';
    }

    setNames(player, enemy) {
        this.el.p.name.textContent = player;
        this.el.e.name.textContent = enemy;
    }

    setHp(side, hp, max) {
        const c = this.cache[side], box = this.el[side].hp;
        if (c.max !== max) {
            box.innerHTML = '';
            for (let i = 0; i < max; i++) box.appendChild(Object.assign(document.createElement('div'), { className: 'pip' }));
            c.max = max;
            c.hp = max;
        }
        if (c.hp === hp) return;
        [...box.children].forEach((pip, i) => {
            const off = i >= hp;
            if (off && !pip.classList.contains('off')) {
                pip.classList.add('off', 'lost');
                setTimeout(() => pip.classList.remove('lost'), 450);
            } else if (!off && pip.classList.contains('off')) {
                pip.classList.remove('off');
                pip.classList.add('gain');
                setTimeout(() => pip.classList.remove('gain'), 600);
            }
        });
        c.hp = hp;
    }

    // state: 'visible' | 'hidden' | 'bush' | 'cloak'
    setStealth(state) {
        if (this.cache.visible === state) return;
        this.cache.visible = state;
        const LABELS = { visible: '¡VISIBLE!', hidden: 'OCULTO', bush: 'EN LA HIERBA', cloak: 'INVISIBLE' };
        this.el.stealth.textContent = LABELS[state];
        this.el.stealth.className = `stealth ${state === 'hidden' ? '' : state}${this.replaying ? ' hidden' : ''}`;
    }

    showHint(on) {
        this.el.hint.classList.toggle('gone', !on);
    }

    banner(text, kind = '') {
        const b = this.el.banner;
        b.className = 'banner';
        void b.offsetWidth; // reinicia la animación CSS
        b.textContent = text;
        b.className = `banner show ${kind}`;
    }

    // title: opcional (supervivencia muestra las oleadas en lugar de VICTORIA/DERROTA)
    showEnd(win, sub, title) {
        this.el.endTitle.textContent = title || (win ? '¡VICTORIA!' : 'DERROTA');
        this.el.endTitle.classList.toggle('lose', !win);
        this.el.endSub.textContent = sub || '';
        this.screen('end');
    }
}
