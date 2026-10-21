// Capa DOM: menús, marcador de vida, aviso de sigilo y carteles.
export class Hud {
    constructor() {
        const $ = (id) => document.getElementById(id);
        this.el = {
            hud: $('hud'), menu: $('menu'), end: $('end'), banner: $('banner'),
            play: $('btn-play'), again: $('btn-again'),
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
        this.onPause = null;
        this.onResume = null;
        this.onQuit = null;
        this.onToggle = null;
        this.el.pauseBtn.addEventListener('click', () => this.onPause && this.onPause());
        this.el.resume.addEventListener('click', () => this.onResume && this.onResume());
        this.el.quit.addEventListener('click', () => this.onQuit && this.onQuit());
        this.toggles = [...document.querySelectorAll('.toggle')];
        for (const t of this.toggles) t.addEventListener('click', () => this.onToggle && this.onToggle(t.dataset.key));
        this.el.play.addEventListener('click', () => this.onPlay && this.onPlay());
        this.el.again.addEventListener('click', () => this.onAgain && this.onAgain());
    }

    ready() {
        this.el.play.disabled = false;
        this.el.play.textContent = 'JUGAR';
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

    showEnd(win, sub) {
        this.el.endTitle.textContent = win ? '¡VICTORIA!' : 'DERROTA';
        this.el.endTitle.classList.toggle('lose', !win);
        this.el.endSub.textContent = sub || '';
        this.screen('end');
    }
}
