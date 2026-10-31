import * as THREE from 'three';
import { SKINS, SKIN_BY_ID, GOLD_SPARKS, TANKS, PAINTS, TRAILS, PAINT_BY_ID, TRAIL_BY_ID, WORLD_BY_ID } from '../content/index.js';
import { trailParticle, TRAIL_RATE } from '../render/trails.js';
import { TankModel } from '../render/TankModel.js';
import { Particles } from '../render/Particles.js';
import { box, toon, outline, OUTLINE } from '../render/materials.js';
import { DANCES, DANCE_BY_ID } from '../content/dances.js';
import { PETS, PET_BY_ID } from '../content/pets.js';
import { danceTime, dancePose, danceFx, newPose } from '../render/dance.js';
import { Pet } from '../render/Pet.js';
import { Profile } from '../core/Profile.js';
import { devFree } from '../core/Dev.js';
import { L } from '../core/I18n.js';

// "Mi Tanque": tu tanque en 3D sobre un pedestal. Cinco pestañas (gorros, pinturas, estelas de
// bala, bailes de victoria y mascotas); flechas para pasar, comprar y usar. La vista previa combina lo que llevas puesto con
// lo que estás mirando. El botón del menú enseña en pequeño el tanque equipado.
const CATS = [
    { key: 'skin', items: SKINS },
    { key: 'paint', items: PAINTS },
    { key: 'trail', items: TRAILS },
    { key: 'dance', items: DANCES },
    { key: 'pet', items: PETS },
];
// Escaparate del baile: baila, sale volando, vuelve a caer y espera un poco
export class Garage {
    constructor(sfx, px = 112) {
        const $ = (id) => document.getElementById(id);
        this.sfx = sfx;
        this.px = px;
        this.el = {
            screen: $('garage'), view: $('garage-view'), name: $('garage-name'), count: $('garage-count'),
            action: $('garage-action'), coins: $('garage-coins'), menu: $('menu'), hint: $('garage-hint'),
            btnCanvas: $('btn-garage').querySelector('canvas'),
        };
        this.el.hint.dataset.text = this.el.hint.innerHTML;
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
        // Algo alejada y mirando más arriba: caben los gorros altos (van a escala 1.4)
        this.camera.position.set(0, 2.05, 4.05);
        this.camera.lookAt(0, 0.52, 0);
        this.buildPedestal();
        this.particles = new Particles(this.scene, 600);
        this.fake = {
            x: 0, z: 0, yaw: 0.6, aimYaw: 0.6, moving: false, alive: true, recoil: 0, flash: 0, shield: 0,
            hp: 6, maxHp: 6, ammo: 3, reloading: 0, reloadProgress: 1,
        };
        this.models = new Map();
        this.pets = new Map();
        this.danceT = 0;

        this.cat = 0;
        this.index = 0;
        this.tabs = [...document.querySelectorAll('#garage .garage-tabs .tab')];
        this.tabs.forEach((t, i) => t.addEventListener('click', () => this.setCat(i)));
        // Bala de muestra para enseñar la estela
        this.shot = new THREE.Mesh(box(0.2, 0.2, 0.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        this.shot.visible = false;
        this.scene.add(this.shot);
        this.shotT = 0;
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
        Profile.onChange(() => {
            this.refresh();
            this.updateDot();
        });
        this.dot = $('garage-dot');
        // Quien ya jugaba antes del punto rojo empieza "al día" (sin aviso por lo que ya tenía)
        if (!Profile.data.garageSeen) this.markSeen(false);
        this.updateDot();

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

    model(skin, paint) {
        const key = `${skin.id}|${paint.id}`;
        let m = this.models.get(key);
        if (!m) {
            m = new TankModel({ ...TANKS.hero.palette, ...paint.palette }, 0x1b0b33, 3, skin);
            m.addTo(this.scene);
            this.models.set(key, m);
        }
        return m;
    }

    get items() {
        return CATS[this.cat].items;
    }

    // Lo que se está mirando ahora en la pestaña abierta
    get skin() {
        return this.items[this.index];
    }

    // Lo que enseña el pedestal: lo equipado, cambiando solo la categoría que se mira
    preview(browsing) {
        const d = Profile.data;
        const look = {
            skin: SKIN_BY_ID[d.skin] || SKINS[0],
            paint: PAINT_BY_ID[d.paint] || PAINTS[0],
            trail: TRAIL_BY_ID[d.trail] || TRAILS[0],
            dance: DANCE_BY_ID[d.dance] || DANCES[0],
            pet: PET_BY_ID[d.pet] || PETS[0],
        };
        if (browsing) look[CATS[this.cat].key] = this.skin;
        return look;
    }

    setCat(i) {
        this.cat = i;
        const key = CATS[i].key;
        this.index = Math.max(0, this.items.findIndex((s) => s.id === Profile.data[key]));
        this.tabs.forEach((t, k) => t.classList.toggle('on', k === i));
        this.sfx.play('tick');
        this.particles.clear();
        this.danceT = 0;
        this.refresh();
    }

    // Trofeos de jefe que ya tienes (gorros y pinturas de modo difícil)
    trophies() {
        return CATS.flatMap((c) => c.items).filter((s) => s.boss && Profile.owns(s.id)).map((s) => s.id);
    }

    // Lo que hay ahora queda "visto": el punto rojo se apaga hasta que pase algo nuevo
    markSeen(save = true) {
        Profile.data.garageSeen = { coins: Profile.coins, trophies: this.trophies() };
        if (save) Profile.save();
        else this.updateDot();
    }

    // Punto rojo en el botón de Mi Tanque: has ganado monedas suficientes para algo que antes
    // no podías comprar, o has desbloqueado un trofeo de jefe nuevo. Al entrar se apaga.
    updateDot() {
        const seen = Profile.data.garageSeen;
        if (!this.dot || !seen) return;
        const coins = Profile.coins;
        const affordable = coins > seen.coins && CATS.some((c) => c.items.some((s) =>
            !s.boss && this.price(s) > seen.coins && this.price(s) <= coins && !Profile.owns(s.id)));
        const trophy = this.trophies().some((id) => !seen.trophies.includes(id));
        this.dot.classList.toggle('hidden', !(affordable || trophy));
    }

    open() {
        this.markSeen();
        this.sfx.unlock();
        this.sfx.play('ui');
        this.isOpen = true;
        this.el.screen.classList.remove('hidden');
        this.setCat(this.cat);
    }

    close() {
        this.sfx.play('ui');
        this.isOpen = false;
        this.el.screen.classList.add('hidden');
    }

    step(d) {
        this.index = (this.index + d + this.items.length) % this.items.length;
        this.sfx.play('tick');
        this.particles.clear();
        this.pop = 0;
        this.danceT = 0;
        this.refresh();
        // El tanque dorado llega con fanfarria y una lluvia de oro
        if (this.skin.gold) {
            this.sfx.play('secret');
            this.goldBurst = 1;
        }
    }

    // Comprar (si no la tienes) o equipar.
    act() {
        const s = this.skin, key = CATS[this.cat].key;
        if (Profile.owns(s.id)) {
            if (Profile.data[key] !== s.id && Profile.equip(s.id, key)) {
                this.sfx.play('reloaded');
                if (this.onWear) this.onWear(s, key, false);
            }
        } else if (s.boss) {
            this.sfx.play('itemGone'); // trofeo de jefe: no se compra
        } else if (Profile.buy(s.id, this.price(s))) {
            Profile.equip(s.id, key);
            this.markSeen(); // lo que te queda tras comprar es el nuevo punto de partida del aviso
            this.sfx.play('win');
            this.burst = 1;
            if (this.onBuy) this.onBuy(s, key);
            if (this.onWear) this.onWear(s, key, true);
        } else {
            this.sfx.play('itemGone');
        }
        if (this.onEquip) this.onEquip(Profile.data.skin);
        this.refresh();
    }

    // Precio de un objeto (0 si el panel de depuración lo ha puesto todo gratis)
    price(s) {
        return devFree() ? 0 : s.price;
    }

    refresh() {
        const s = { ...this.skin, price: this.price(this.skin) }, el = this.el;
        el.name.textContent = s.name;
        // Los trofeos de los jefes van con su marco especial
        el.screen.classList.toggle('boss-item', !!s.boss);
        document.getElementById('garage-badge').classList.toggle('off', !s.boss || !!s.gold);
        // El tanque dorado: el premio gordo, con su propio escenario (rayos, destellos y cartel)
        el.screen.classList.toggle('legend', !!s.gold);
        document.getElementById('garage-legend').classList.toggle('off', !s.gold);
        document.getElementById('garage-badge').classList.toggle('hidden', !!s.gold);
        document.getElementById('garage-legend').classList.toggle('hidden', !s.gold);
        el.count.textContent = `${this.index + 1} / ${this.items.length}`;
        el.coins.textContent = Profile.coins;
        const owned = Profile.owns(s.id), equipped = Profile.data[CATS[this.cat].key] === s.id;
        // Trofeo de un jefe aún sin ganar: dice a quién hay que vencer
        if (s.boss && !owned) {
            const boss = WORLD_BY_ID[s.boss].tank.name;
            el.action.disabled = true;
            el.action.className = 'btn buy locked';
            el.action.innerHTML = L(`<span class="skull-mini"></span> BEAT ${boss} ON HARD`, `<span class="skull-mini"></span> VENCE A ${boss} EN DIFÍCIL`);
            el.hint.classList.add('off');
            el.screen.classList.toggle('golden', !!this.preview(true).skin.gold);
            return;
        }
        el.action.disabled = equipped || (!owned && Profile.coins < s.price);
        el.action.className = `btn ${owned ? '' : 'buy'}`;
        el.action.innerHTML = equipped ? L('EQUIPPED', 'EQUIPADO') : owned ? L('USE', 'USAR')
            : Profile.coins >= s.price ? L(`BUY <span class="coin"></span> ${s.price}`, `COMPRAR <span class="coin"></span> ${s.price}`) : L(`<span class="coin"></span> ${s.price} · NOT ENOUGH COINS`, `<span class="coin"></span> ${s.price} · SIN MONEDAS`);
        // Recordatorio de dónde salen las monedas (para el dorado, una barra de lo que llevas)
        el.hint.classList.toggle('off', owned || Profile.coins >= s.price);
        if (s.gold && !owned && Profile.coins < s.price) {
            const k = Math.min(1, Profile.coins / s.price);
            el.hint.innerHTML = `<span class="legend-bar"><i style="width:${Math.max(2, k * 100)}%"></i></span>${Profile.coins} / ${s.price}`;
        } else if (el.hint.dataset.text) el.hint.innerHTML = el.hint.dataset.text;
        el.screen.classList.toggle('golden', !!this.preview(true).skin.gold);
    }

    draw(look, dt, ctx) {
        const skin = look.skin;
        const m = this.model(skin, look.paint);
        for (const other of this.models.values()) other.root.visible = other.shadow.visible = other === m;
        const f = this.fake;
        f.yaw = f.aimYaw = 0.6 + Math.sin(performance.now() / 1400) * 0.5;
        // Pestaña de bailes: el tanque enseña el que miras una y otra vez
        const dancing = ctx === this.ctx && CATS[this.cat].key === 'dance';
        m.pose = null;
        m.dropY = 0;
        if (dancing) {
            // Cada baile dura lo suyo; después vuelve a caer al pedestal y empieza otra vez
            const T = danceTime(look.dance);
            this.danceT = (this.danceT + dt) % (T + 1.4);
            const t = this.danceT;
            if (t < dt) this.dancePose = newPose();
            if (t < T) {
                const pose = (this.dancePose ||= newPose());
                // Aquí se ve de cerca: los efectos del cielo, más bajos y más juntos
                m.pose = dancePose(look.dance, t, pose, (kind, y, a) => danceFx(this.particles, kind, pose.dx, y, pose.dz, 1, a, 1.6));
            } else {
                const k = Math.min(1, (t - T) / 0.4);
                m.dropY = 6 * (1 - k) * (1 - k);
            }
        }
        m.sync(dt, f, 1, this.camera);
        // Mascota: a un lado del pedestal, mirando a la cámara
        for (const p of this.pets.values()) p.root.visible = p.shadow.visible = false;
        if (look.pet.build) {
            let pet = this.pets.get(look.pet.id);
            if (!pet) {
                pet = new Pet(look.pet, 0x1b0b33);
                pet.addTo(this.scene);
                this.pets.set(look.pet.id, pet);
            }
            pet.step(dt, 0.72, 0.45, 1, !!m.pose);
            pet.shadow.position.y = 0.002;
        }
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
        // Escaparate de la estela: dispara cada poco una bala con ella
        const trail = look.trail.style;
        if (trail && ctx === this.ctx) {
            this.shotT += dt;
            if (this.shotT > 1.3) {
                this.shotT = 0;
                m.root.visible && (f.recoil = 1);
            }
            const k = this.shotT / 0.55;
            this.shot.visible = k < 1;
            if (k < 1) {
                const a = f.aimYaw, d = 0.6 + k * 2.6;
                this.shot.position.set(Math.sin(a) * d, 0.48, Math.cos(a) * d);
                this.shot.material.color.setHex({ ...TANKS.hero.palette, ...look.paint.palette }.bullet);
                this.trailAcc = (this.trailAcc || 0) - dt;
                while (this.trailAcc <= 0) {
                    this.trailAcc += TRAIL_RATE[trail] || 0.03;
                    trailParticle(this.particles, trail, this.shot.position.x, 0.48, this.shot.position.z, Math.sin(a) * 4, Math.cos(a) * 4, 0.24, this.shotT);
                }
            }
            f.recoil = Math.max(0, f.recoil - dt * 5);
        } else {
            this.shot.visible = false;
        }
        if (this.goldBurst && ctx === this.ctx) {
            this.particles.burst(0, 1.4, 0, 70, GOLD_SPARKS, { speed: 2.6, up: 3, size: 0.09, ttl: 1.4, grav: 4 });
            this.goldBurst = 0;
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

    // Foto del tanque equipado (con su mascota) para la postal, a size x size píxeles
    snapshot(size) {
        const c = document.createElement('canvas');
        c.width = c.height = size;
        this.gl.setSize(size, size, false);
        this.particles.clear();
        this.draw(this.preview(false), 1 / 60, c.getContext('2d'));
        this.gl.setSize(this.px, this.px, false);
        return c;
    }

    tick(now) {
        requestAnimationFrame(this.tick);
        const dt = Math.min(0.05, (now - this.last) / 1000);
        this.last = now;
        if (this.isOpen) this.draw(this.preview(true), dt, this.ctx);
        else if (!this.el.menu.classList.contains('hidden')) this.draw(this.preview(false), dt, this.btnCtx);
    }
}
