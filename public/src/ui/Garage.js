import * as THREE from 'three';
import { SKINS, SKIN_BY_ID, GOLD_SPARKS, TANKS } from '../content/index.js';
import { TankModel } from '../render/TankModel.js';
import { Particles } from '../render/Particles.js';
import { box, toon, outline, OUTLINE } from '../render/materials.js';
import { Profile } from '../core/Profile.js';

// "Mi Tanque": tu tanque en 3D sobre un pedestal; flechas para pasar de skin, comprar y usar.
// El botón del menú enseña en pequeño el tanque con la skin equipada.
export class Garage {
    constructor(sfx, px = 112) {
        const $ = (id) => document.getElementById(id);
        this.sfx = sfx;
        this.px = px;
        this.el = {
            screen: $('garage'), view: $('garage-view'), name: $('garage-name'), count: $('garage-count'),
            action: $('garage-action'), coins: $('garage-coins'), menu: $('menu'),
            btnCanvas: $('btn-garage').querySelector('canvas'),
        };
        this.ctx = this.el.view.getContext('2d');
        this.btnCtx = this.el.btnCanvas.getContext('2d');
        this.btnCtx.imageSmoothingEnabled = false;

        THREE.ColorManagement.enabled = false;
        this.gl = new THREE.WebGLRenderer({ antialias: false, alpha: true });
        this.gl.setPixelRatio(1);
        this.gl.setSize(px, px, false);
        this.gl.outputColorSpace = THREE.LinearSRGBColorSpace;
        this.gl.setClearColor(0x000000, 0);
        this.scene = new THREE.Scene();
        const sun = new THREE.DirectionalLight(0xfff2d8, 2.4);
        sun.position.set(-4, 10, 6);
        this.scene.add(sun, new THREE.HemisphereLight(0xd6c8ff, 0x7a4cff, 1.2));
        this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
        this.camera.position.set(0, 1.9, 3.6);
        this.camera.lookAt(0, 0.38, 0);
        this.buildPedestal();
        this.particles = new Particles(this.scene, 160);
        this.fake = {
            x: 0, z: 0, yaw: 0.6, aimYaw: 0.6, moving: false, alive: true, recoil: 0, flash: 0, shield: 0,
            hp: 6, maxHp: 6, ammo: 3, reloading: 0, reloadProgress: 1,
        };
        this.models = new Map();

        this.index = Math.max(0, SKINS.findIndex((s) => s.id === Profile.data.skin));
        $('btn-garage').addEventListener('click', () => this.open());
        $('btn-garage-close').addEventListener('click', () => this.close());
        $('garage-prev').addEventListener('click', () => this.step(-1));
        $('garage-next').addEventListener('click', () => this.step(1));
        this.el.action.addEventListener('click', () => this.act());
        window.addEventListener('keydown', (e) => {
            if (!this.isOpen) return;
            if (e.code === 'ArrowLeft') this.step(-1);
            else if (e.code === 'ArrowRight') this.step(1);
            else if (e.code === 'Escape') this.close();
        });
        // Deslizar el dedo sobre el tanque también cambia de skin
        let sx = null;
        this.el.view.addEventListener('pointerdown', (e) => (sx = e.clientX));
        this.el.view.addEventListener('pointerup', (e) => {
            if (sx !== null && Math.abs(e.clientX - sx) > 30) this.step(e.clientX < sx ? 1 : -1);
            sx = null;
        });
        Profile.onChange(() => this.refresh());

        this.isOpen = false;
        this.last = performance.now();
        this.tick = this.tick.bind(this);
        requestAnimationFrame(this.tick);
    }

    buildPedestal() {
        const base = new THREE.Group();
        [[0, 0, 0x8af06a], [1, 0, 0x6fdc5a], [0, 1, 0x6fdc5a], [1, 1, 0x8af06a]].forEach(([x, z, c]) => {
            const t = new THREE.Mesh(box(0.8, 0.3, 0.8), toon(c));
            t.position.set(x * 0.8 - 0.4, -0.16, z * 0.8 - 0.4);
            base.add(t);
        });
        const hullTop = new THREE.Mesh(box(1.6 + OUTLINE * 2, 0.3 + OUTLINE * 2, 1.6 + OUTLINE * 2), outline(0x1b0b33));
        hullTop.position.y = -0.16;
        const side = new THREE.Mesh(box(1.6, 0.4, 1.6), toon(0xb04bff));
        side.position.y = -0.5;
        const hullSide = new THREE.Mesh(box(1.6 + OUTLINE * 2, 0.4 + OUTLINE * 2, 1.6 + OUTLINE * 2), outline(0x1b0b33));
        hullSide.position.y = -0.5;
        base.add(hullTop, side, hullSide);
        this.scene.add(base);
    }

    model(skin) {
        let m = this.models.get(skin.id);
        if (!m) {
            m = new TankModel(TANKS.hero.palette, 0x1b0b33, 3, skin);
            m.addTo(this.scene);
            this.models.set(skin.id, m);
        }
        return m;
    }

    get skin() {
        return SKINS[this.index];
    }

    open() {
        this.sfx.unlock();
        this.sfx.play('ui');
        this.index = Math.max(0, SKINS.findIndex((s) => s.id === Profile.data.skin));
        this.isOpen = true;
        this.el.screen.classList.remove('hidden');
        this.refresh();
    }

    close() {
        this.sfx.play('ui');
        this.isOpen = false;
        this.el.screen.classList.add('hidden');
    }

    step(d) {
        this.index = (this.index + d + SKINS.length) % SKINS.length;
        this.sfx.play('tick');
        this.particles.clear();
        this.pop = 0;
        this.refresh();
    }

    // Comprar (si no la tienes) o equipar.
    act() {
        const s = this.skin;
        if (Profile.owns(s.id)) {
            if (Profile.data.skin !== s.id && Profile.equip(s.id)) this.sfx.play('reloaded');
        } else if (Profile.buy(s.id, s.price)) {
            Profile.equip(s.id);
            this.sfx.play('win');
            this.burst = 1;
            if (this.onBuy) this.onBuy(s);
        } else {
            this.sfx.play('itemGone');
        }
        if (this.onEquip) this.onEquip(Profile.data.skin);
        this.refresh();
    }

    refresh() {
        const s = this.skin, el = this.el;
        el.name.textContent = s.name;
        el.count.textContent = `${this.index + 1} / ${SKINS.length}`;
        el.coins.textContent = Profile.coins;
        const owned = Profile.owns(s.id), equipped = Profile.data.skin === s.id;
        el.action.disabled = equipped || (!owned && Profile.coins < s.price);
        el.action.className = `btn ${owned ? '' : 'buy'}`;
        el.action.innerHTML = equipped ? 'EQUIPADO' : owned ? 'USAR'
            : Profile.coins >= s.price ? `COMPRAR <span class="coin"></span> ${s.price}` : `<span class="coin"></span> ${s.price} · SIN MONEDAS`;
        el.screen.classList.toggle('golden', !!s.gold);
    }

    draw(skin, dt, ctx) {
        for (const [id, m] of this.models) m.root.visible = m.shadow.visible = id === skin.id;
        const m = this.model(skin);
        const f = this.fake;
        f.yaw = f.aimYaw = 0.6 + Math.sin(performance.now() / 1400) * 0.5;
        m.sync(dt, f, 1, this.camera);
        m.bar.visible = false;
        if (skin.gold) {
            this.sparkT = (this.sparkT || 0) - dt;
            while (this.sparkT <= 0) {
                this.sparkT += 0.016;
                const a = Math.random() * Math.PI * 2, r = 0.4 + Math.random() * 0.5;
                this.particles.spawn(Math.sin(a) * r, 0.1 + Math.random() * 0.6, Math.cos(a) * r, 0, 0.8 + Math.random(), 0,
                    0.05 + Math.random() * 0.06, 0.7, GOLD_SPARKS[(Math.random() * GOLD_SPARKS.length) | 0], -0.5);
            }
        }
        if (this.burst) {
            this.particles.burst(0, 0.6, 0, 50, [0xffe03a, 0xff3e8e, 0x23e0d6, 0xffffff], { speed: 3, up: 5, size: 0.1, ttl: 1, grav: 8 });
            this.burst = 0;
        }
        this.particles.update(dt);
        this.particles.sync();
        this.gl.render(this.scene, this.camera);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(this.gl.domElement, 0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    tick(now) {
        requestAnimationFrame(this.tick);
        const dt = Math.min(0.05, (now - this.last) / 1000);
        this.last = now;
        if (this.isOpen) this.draw(this.skin, dt, this.ctx);
        else if (!this.el.menu.classList.contains('hidden')) this.draw(SKIN_BY_ID[Profile.data.skin] || SKINS[0], dt, this.btnCtx);
    }
}
