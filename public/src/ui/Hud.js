// Capa DOM: menús, marcador de vida, aviso de sigilo y carteles.
export class Hud {
    constructor() {
        const $ = (id) => document.getElementById(id);
        this.el = {
            hud: $('hud'), menu: $('menu'), end: $('end'), banner: $('banner'),
            play: $('btn-play'), again: $('btn-again'),
            endTitle: $('end-title'), endSub: $('end-sub'),
            stealth: $('stealth'), hint: $('hint'),
            p: { name: $('p-name'), hp: $('p-hp') },
            e: { name: $('e-name'), hp: $('e-hp') },
        };
        this.cache = { p: { hp: -1, max: -1 }, e: { hp: -1, max: -1 }, visible: null };
        this.onPlay = null;
        this.onAgain = null;
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

    setStealth(visible) {
        if (this.cache.visible === visible) return;
        this.cache.visible = visible;
        this.el.stealth.textContent = visible ? '¡VISIBLE!' : 'OCULTO';
        this.el.stealth.classList.toggle('visible', visible);
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
