// Capa DOM: menús, marcador de vida, aviso de sigilo y carteles.
import { drawCoin, COIN_SPIN, installPixelSprites } from './PixelArt.js';
import { achievementIcon, achievementBg } from './achievementIcons.js';
export class Hud {
    constructor() {
        installPixelSprites();
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
        document.getElementById('btn-campaign').disabled = false;
        document.getElementById('btn-duel').disabled = false;
    }

    // Ceremonia al ganar: la moneda aparece con un +1, vuela al contador (que muestra la cifra
    // anterior) y suma. Tocar la pantalla la salta. Devuelve una promesa que se cumple al terminar.
    coinReward(from, to, { onFly, onLand } = {}) {
        const reward = document.getElementById('reward');
        const wrap = reward.querySelector('.reward-coin');
        const coin = reward.querySelector('.big-coin');
        const counter = document.getElementById('coin-counter');
        const num = document.getElementById('hud-coins');
        const ctx = coin.getContext('2d');
        num.textContent = from;
        this.achHold = true; // los logros esperan a que termine la ceremonia
        counter.classList.remove('hidden', 'bump');
        reward.classList.remove('hidden', 'fly');
        wrap.style.transform = '';
        coin.style.width = coin.style.height = '';
        for (const el of [coin, ...reward.querySelectorAll('.spark, .reward-plus')]) {
            el.style.animation = 'none';
            void el.offsetWidth;
            el.style.animation = '';
        }
        // La moneda gira por fotogramas, como un sprite
        let frame = 0;
        drawCoin(ctx, COIN_SPIN[0]);
        const spin = setInterval(() => drawCoin(ctx, COIN_SPIN[++frame % COIN_SPIN.length]), 90);
        return new Promise((resolve) => {
            const timers = [];
            let finished = false, landed = false;
            const land = () => {
                if (landed) return;
                landed = true;
                clearInterval(spin);
                num.textContent = to;
                counter.classList.remove('bump');
                void counter.offsetWidth;
                counter.classList.add('bump');
                reward.classList.add('hidden');
                this.landSparks(counter.getBoundingClientRect());
                if (onLand) onLand();
            };
            const finish = () => {
                if (finished) return;
                finished = true;
                timers.forEach(clearTimeout);
                reward.onpointerdown = null;
                resolve();
                // Ya con el menú final en pantalla, bajan los logros pendientes
                this.achHold = false;
                setTimeout(() => !this.achBusy && this.nextAchievement(), 500);
            };
            reward.onpointerdown = () => {
                land();
                finish();
            };
            timers.push(setTimeout(() => {
                // Vuelo a saltos hasta el contador: la moneda encoge en múltiplos enteros
                // de su tamaño (6x, 5x... 1x) para que los píxeles sigan siendo nítidos.
                const a = wrap.getBoundingClientRect(), b = counter.querySelector('.coin').getBoundingClientRect();
                const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
                const dx = b.left + b.width / 2 - ax, dy = b.top + b.height / 2 - ay;
                const cx = dx * 0.15 - 50, cy = 70; // control de la curva: primero baja un poco
                reward.classList.add('fly');
                if (onFly) onFly();
                const STEPS = 9;
                let k = 0, px = 0, py = 0;
                const hop = () => {
                    k++;
                    const t = k / STEPS, u = 1 - t;
                    const x = 2 * u * t * cx + t * t * dx, y = 2 * u * t * cy + t * t * dy;
                    if (k > 1) this.trail(ax + px, ay + py);
                    px = x; py = y;
                    const scale = Math.max(1, Math.round(6 - 5 * t));
                    wrap.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
                    coin.style.width = coin.style.height = `${16 * scale}px`;
                    if (k < STEPS) timers.push(setTimeout(hop, 80));
                    else timers.push(setTimeout(() => { land(); timers.push(setTimeout(finish, 750)); }, 80));
                };
                hop();
            }, 1150));
        });
    }

    trail(x, y) {
        const el = Object.assign(document.createElement('div'), { className: 'coin-trail' });
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 400);
    }

    // Destellos pixelados alrededor del contador cuando la moneda llega
    landSparks(r) {
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        for (const [ox, oy] of [[-r.width / 2 - 8, -10], [r.width / 2 + 8, -8], [-r.width / 2 + 4, r.height / 2 + 6], [r.width / 2 - 2, r.height / 2 + 8]]) {
            const el = Object.assign(document.createElement('i'), { className: 'spark land-spark' });
            el.style.left = `${cx + ox}px`;
            el.style.top = `${cy + oy}px`;
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 500);
        }
    }

    setCoins(n) {
        for (const id of ['menu-coins', 'garage-coins']) document.getElementById(id).textContent = n;
    }

    setTrophies(done, total) {
        document.getElementById('menu-trophies').textContent = `${done}/${total}`;
    }

    // Logro completado: baja desde arriba del todo. Si llegan varios, van saliendo de uno en uno.
    achievement(name, desc, id) {
        this.achQueue = this.achQueue || [];
        this.achQueue.push({ name, desc, id });
        if (!this.achBusy && !this.achHold) this.nextAchievement();
    }

    nextAchievement() {
        const a = this.achQueue && this.achQueue.shift();
        const el = document.getElementById('ach');
        if (!a) {
            this.achBusy = false;
            return;
        }
        this.achBusy = true;
        document.getElementById('ach-name').textContent = a.name;
        document.getElementById('ach-desc').textContent = a.desc;
        // El icono propio del logro sobre su color
        const icon = achievementIcon(a.id), bg = achievementBg(a.id);
        document.getElementById('ach-trophy').style.backgroundImage = icon || '';
        const box = document.getElementById('ach-icon');
        box.style.background = bg === 'rainbow'
            ? 'linear-gradient(180deg, #ff3e5e 0 17%, #ff9a1f 17% 34%, #ffe03a 34% 50%, #7dff4a 50% 67%, #23e0d6 67% 84%, #7b5cff 84%)'
            : bg;
        el.classList.remove('show');
        void el.offsetWidth;
        el.classList.add('show');
        setTimeout(() => this.nextAchievement(), 3500);
    }

    // Aviso breve arriba (p. ej. moneda ganada en supervivencia). Se encolan si llegan varios.
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
        if (name !== 'end') document.getElementById('coin-counter').classList.add('hidden');
        this.el.menu.classList.toggle('hidden', name !== 'menu');
        this.el.end.classList.toggle('hidden', name !== 'end');
        this.el.hud.classList.toggle('hidden', name === 'menu' || name === 'campaign');
        document.getElementById('campaign').classList.toggle('hidden', name !== 'campaign');
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

    // Duelo local: etiquetas de cada jugador en su mitad (la de arriba, girada para el J2)
    showDuel(on) {
        document.getElementById('duel-labels').classList.toggle('hidden', !on);
        this.el.hud.classList.toggle('duel-mode', on);
    }

    // ---------- Tutorial ----------
    // title null: lo oculta. i/n: paso actual (puntitos de progreso).
    tutorial(title, text, i, n) {
        const box = document.getElementById('tut');
        box.classList.toggle('hidden', !title);
        this.el.hud.classList.toggle('tut-mode', !!title);
        if (!title) return this.tutorialTip('', false);
        document.getElementById('tut-title').textContent = title;
        document.getElementById('tut-text').textContent = text;
        document.getElementById('tut-dots').innerHTML = Array.from({ length: n }, (_, k) => `<i class="${k < i ? 'ok' : k === i ? 'now' : ''}"></i>`).join('');
        box.classList.remove('pop', 'done');
        void box.offsetWidth;
        box.classList.add('pop');
    }

    // Pista extra bajo el paso; highlight resalta el aviso OCULTO / ¡VISIBLE!
    tutorialTip(text, highlight) {
        const tip = document.getElementById('tut-tip');
        tip.textContent = text;
        tip.classList.toggle('hidden', !text);
        this.el.stealth.classList.toggle('hl', !!highlight);
    }

    tutorialDone() {
        const box = document.getElementById('tut');
        box.classList.remove('pop');
        void box.offsetWidth;
        box.classList.add('done');
    }

    // ---------- Jefes ----------
    showBoss(name) {
        const bar = document.getElementById('bossbar');
        bar.classList.toggle('hidden', !name);
        bar.classList.remove('angry');
        this.el.hud.classList.toggle('boss-mode', !!name);
        if (!name) return;
        document.getElementById('bb-name').textContent = name;
        this.bossRatio = this.bossTrail = 1;
        this.bossHp(1, false, 0);
    }

    // Vida del jefe: la barra baja al momento y un tramo blanco se vacía detrás.
    bossHp(ratio, angry, dt) {
        this.bossTrail = ratio < this.bossTrail ? Math.max(ratio, this.bossTrail - dt * 0.6) : ratio;
        const key = `${ratio.toFixed(3)}|${this.bossTrail.toFixed(3)}|${angry}`;
        if (key === this.bossKey) return;
        this.bossKey = key;
        document.getElementById('bb-fill').style.width = `${ratio * 100}%`;
        document.getElementById('bb-trail').style.width = `${this.bossTrail * 100}%`;
        document.getElementById('bossbar').classList.toggle('angry', angry);
    }

    // Racha de destrucciones ("¡DOBLE!", "¡TRIPLE!"...): cuanto más larga, más grande
    streak(text, n) {
        const el = document.getElementById('streak');
        el.className = 'streak';
        void el.offsetWidth;
        el.textContent = text;
        el.style.setProperty('--k', Math.min(n, 5));
        el.className = `streak show${n >= 5 ? ' top' : ''}`;
    }

    // Presentación del jefe con su nombre en grande (dura lo mismo que la animación CSS)
    bossIntro(name, tagline, world, hard) {
        const el = document.getElementById('boss-intro');
        document.getElementById('bi-name').textContent = name;
        document.getElementById('bi-tag').textContent = tagline;
        document.getElementById('bi-world').textContent = world;
        el.className = 'boss-intro';
        void el.offsetWidth;
        el.className = `boss-intro show${hard ? ' hard' : ''}`;
    }

    // Estrellas al ganar a un jefe: aparecen una a una y debajo se explica cada una.
    showStars(got, best, par, onStar) {
        const box = document.getElementById('end-stars');
        const stars = [...box.querySelectorAll('.star')];
        box.classList.remove('hidden');
        stars.forEach((s) => (s.className = 'star'));
        const n = got.filter(Boolean).length;
        const line = (ok, text) => (ok ? `<b>★ ${text}</b>` : `<s>☆ ${text}</s>`);
        document.getElementById('stars-why').innerHTML = [
            line(got[0], 'GANAR'), line(got[1], 'PERDER 2 DE VIDA COMO MUCHO'), line(got[2], `GANAR EN MENOS DE ${par} S`),
        ].join('<br>') + (best > n ? `<br>RÉCORD: ${best} ★` : '');
        clearTimeout(this.starTimer);
        let k = 0;
        const next = () => {
            if (k >= 3) return;
            if (k < n) stars[k].classList.add('on');
            onStar(k);
            k++;
            this.starTimer = setTimeout(next, 380);
        };
        this.starTimer = setTimeout(next, 450);
    }

    // Aviso del ataque especial que viene ("¡OLA GIGANTE!")
    callout(text) {
        const c = document.getElementById('callout');
        c.className = 'callout';
        void c.offsetWidth;
        c.textContent = text;
        c.className = 'callout show';
    }

    // Textos de los botones del final (la campaña vuelve al mapa en vez de al menú)
    endButtons(again, menu) {
        this.el.again.textContent = again;
        this.el.endMenu.textContent = menu;
    }

    // title: opcional (supervivencia muestra las oleadas en lugar de VICTORIA/DERROTA)
    showEnd(win, sub, title) {
        document.getElementById('end-stars').classList.add('hidden');
        this.el.endTitle.textContent = title || (win ? '¡VICTORIA!' : 'DERROTA');
        this.el.endTitle.classList.toggle('lose', !win);
        this.el.endSub.textContent = sub || '';
        this.screen('end');
    }
}
