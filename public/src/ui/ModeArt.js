import * as THREE from 'three';
import { SKIN_BY_ID, PAINT_BY_ID, TANKS, WORLDS } from '../content/index.js';
import { enemyDef } from '../content/survival.js';
import { TankModel } from '../render/TankModel.js';
import { box, toon } from '../render/materials.js';
import { Profile } from '../core/Profile.js';

// Escenitas voxel en los botones de modo del menú, con los mismos modelos del juego:
//   PARTIDA RÁPIDA  tu tanque (con tu gorro y tu pintura), que apunta y dispara
//   CAMPAÑA         el próximo jefe que te toca, enorme y con sus piezas
//   SUPERVIVENCIA   un enjambre de enemigos en formación, que cambia de escenario
//   DUELO A DOS     tu tanque contra el rival, disparándose por turnos
// Se dibujan a muy baja resolución y se escalan sin suavizar (como el juego), a 12 fotogramas
// por segundo para que tengan ese movimiento a saltitos de sprite y cuesten poco.
const W = 56, H = 30;      // píxeles de cada escena (el CSS los dobla)
const FPS = 12;
const INK = 0x1b0b33;
const SWARM_THEMES = ['volcano', 'meadow', 'beach', 'space', 'desert'];

const fake = (x, z, yaw) => ({
    x, z, yaw, aimYaw: yaw, moving: false, alive: true, recoil: 0, flash: 0, shield: 0,
    hp: 3, maxHp: 3, ammo: 3, reloading: 0, angry: false,
});

export class ModeArt {
    constructor() {
        this.gl = new THREE.WebGLRenderer({ antialias: false, alpha: true });
        this.gl.setPixelRatio(1);
        this.gl.setSize(W, H, false);
        this.gl.outputColorSpace = THREE.LinearSRGBColorSpace;
        this.gl.setClearColor(0x000000, 0);
        this.scenes = {};
        for (const id of ['play', 'campaign', 'survival', 'duel']) {
            const canvas = document.querySelector(`#btn-${id} .mode-art`);
            canvas.width = W;
            canvas.height = H;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            const scene = new THREE.Scene();
            const sun = new THREE.DirectionalLight(0xfff2d8, 2.4);
            sun.position.set(-4, 10, 6);
            scene.add(sun, new THREE.HemisphereLight(0xd6c8ff, 0x7a4cff, 1.2));
            this.scenes[id] = { ctx, scene, camera: new THREE.PerspectiveCamera(30, W / H, 0.1, 60), tanks: [], shots: [] };
        }
        this.t = 0;
        this.acc = 0;
        this.key = '';
        this.build();
        Profile.onChange(() => this.build());
        this.last = performance.now();
        this.tick = this.tick.bind(this);
        requestAnimationFrame(this.tick);
    }

    // ---------- Montaje ----------
    clear(s) {
        for (const { model } of s.tanks) {
            model.root.removeFromParent();
            model.shadow.removeFromParent();
            for (const m of model.materials) m.dispose();
        }
        for (const b of s.shots) b.removeFromParent();
        s.tanks = [];
        s.shots = [];
    }

    add(s, def, x, z, yaw, opts = {}, skin = null) {
        const model = new TankModel(def.palette, INK, 3, skin, opts);
        s.scene.add(model.root, model.shadow);
        const t = { model, f: fake(x, z, yaw), def };
        s.tanks.push(t);
        return t;
    }

    shot(s, color) {
        const b = new THREE.Mesh(box(0.22, 0.22, 0.22), toon(color));
        b.visible = false;
        s.scene.add(b);
        s.shots.push(b);
        return b;
    }

    hero() {
        const d = Profile.data;
        const skin = SKIN_BY_ID[d.skin] || null;
        const paint = PAINT_BY_ID[d.paint] || {};
        let palette = { ...TANKS.hero.palette, ...(paint.palette || {}) };
        if (skin && skin.palette) palette = { ...palette, ...skin.palette };
        return { def: { palette }, skin };
    }

    // El próximo jefe por ganar (o el último, si ya están todos)
    nextBoss() {
        const beaten = Profile.data.campaign.beaten;
        const main = WORLDS.filter((w) => !w.secret);
        return main.find((w) => !beaten.includes(w.id)) || WORLDS.find((w) => w.secret) || main[main.length - 1];
    }

    // Se rehace solo si cambia algo que se ve (gorro, pintura o jefe)
    build() {
        const d = Profile.data, boss = this.nextBoss();
        const key = `${d.skin}|${d.paint}|${boss.id}`;
        if (key === this.key) return;
        this.key = key;
        const hero = this.hero();
        const S = this.scenes;

        // Partida rápida: tu tanque, mirando hacia el texto del botón
        this.clear(S.play);
        this.add(S.play, hero.def, 0, 0, 1.1, {}, hero.skin);
        S.play.bullet = this.shot(S.play, hero.def.palette.bullet);
        S.play.camera.position.set(0.35, 1.25, 2.55);
        S.play.camera.lookAt(0.35, 0.34, 0);

        // Campaña: el jefe
        this.clear(S.campaign);
        const b = boss.tank;
        this.add(S.campaign, b, 0, 0, 0.75, { scale: b.scale, deco: b.deco, rainbow: b.rainbow, noBar: true });
        S.campaign.camera.position.set(0.25, 2.0, 4.2);
        S.campaign.camera.lookAt(0.25, 0.72, 0);

        // Supervivencia: enjambre en cuña; el escenario se elige al pintar
        this.buildSwarm(S.survival.theme || SWARM_THEMES[0]);
        S.survival.camera.position.set(0, 1.7, 4.6);
        S.survival.camera.lookAt(0, 0.3, 0);

        // Duelo: tú contra el rival, cara a cara
        this.clear(S.duel);
        this.add(S.duel, hero.def, -0.95, 0, Math.PI / 2, {}, hero.skin);
        this.add(S.duel, TANKS.rival, 0.95, 0, -Math.PI / 2);
        S.duel.shots = [this.shot(S.duel, hero.def.palette.bullet), this.shot(S.duel, TANKS.rival.palette.bullet)];
        S.duel.camera.position.set(0, 1.35, 3.25);
        S.duel.camera.lookAt(0, 0.3, 0);
    }

    buildSwarm(theme) {
        const s = this.scenes.survival;
        this.clear(s);
        s.theme = theme;
        // En columna escalonada (de lado se ven todos, sin taparse) y avanzando hacia el texto
        const types = ['scout', 'grunt', 'sniper', 'armored', 'brute'];
        const spots = [[1.5, 0.25], [0.75, -0.3], [0, 0.25], [-0.75, -0.3], [-1.5, 0.25]];
        spots.forEach(([x, z], i) => {
            const def = enemyDef(types[i], theme);
            const t = this.add(s, def, x, z, Math.PI / 2, { scale: def.scale, deco: def.deco });
            t.f.moving = true;
            t.phase = i * 0.7;
        });
    }

    // ---------- Animación ----------
    tick(now) {
        requestAnimationFrame(this.tick);
        const dt = Math.min(0.1, (now - this.last) / 1000);
        this.last = now;
        if (document.getElementById('menu').classList.contains('hidden')) return;
        this.acc += dt;
        if (this.acc < 1 / FPS) return;
        const step = this.acc;
        this.acc = 0;
        this.t += step;
        this.animate(step);
        for (const s of Object.values(this.scenes)) {
            for (const { model, f } of s.tanks) {
                model.sync(step, f, 1, s.camera);
                model.bar.visible = false;
            }
            this.gl.render(s.scene, s.camera);
            s.ctx.clearRect(0, 0, W, H);
            s.ctx.drawImage(this.gl.domElement, 0, 0);
        }
    }

    animate(dt) {
        const t = this.t, S = this.scenes;

        // Tu tanque: barre con la torreta y cada poco dispara hacia el texto
        const p = S.play.tanks[0].f, cycle = t % 2.4;
        p.aimYaw = 1.1 + Math.sin(t * 1.6) * 0.35 * (cycle < 1.6 ? 1 : 0);
        if (cycle >= 1.6 && cycle - dt < 1.6) p.recoil = 1;
        p.recoil = Math.max(0, p.recoil - dt * 5);
        const k = (cycle - 1.6) / 0.5, bul = S.play.bullet;
        bul.visible = k >= 0 && k < 1;
        if (bul.visible) bul.position.set(Math.sin(p.aimYaw) * (0.6 + k * 3), 0.48, Math.cos(p.aimYaw) * (0.6 + k * 3));

        // El jefe: respira, gira un poco y de vez en cuando se enfada
        const b = S.campaign.tanks[0].f;
        b.aimYaw = b.yaw = 0.75 + Math.sin(t * 0.9) * 0.25;
        b.angry = t % 6 > 4.2;
        b.flash = b.angry && Math.floor(t * 8) % 2 ? 0.35 : 0;

        // Enjambre: avanza en el sitio, cada uno con su vaivén; cambia de escenario cada poco
        // Solo los de colores vivos: los de nieve y ciudad son oscuros y se perderían en el menú
        const themes = SWARM_THEMES;
        const theme = themes[Math.floor(t / 4) % themes.length];
        if (theme !== S.survival.theme) this.buildSwarm(theme);
        for (const e of S.survival.tanks) {
            e.f.z = e.f.z0 ?? (e.f.z0 = e.f.z);
            e.f.z = e.f.z0 + Math.sin(t * 2 + e.phase) * 0.08;
            e.f.yaw = e.f.aimYaw = Math.PI / 2 + Math.sin(t * 2 + e.phase) * 0.12;
        }

        // Duelo: se disparan por turnos; la bala cruza y el otro encaja el golpe
        const [me, rival] = S.duel.tanks.map((x) => x.f);
        const turn = Math.floor(t / 1.3) % 2, u = (t % 1.3) / 0.55;
        const [from, to] = turn === 0 ? [me, rival] : [rival, me];
        if (u < dt / 0.55 * 1.01) from.recoil = 1;
        S.duel.shots.forEach((s, i) => {
            s.visible = i === turn && u < 1;
            if (s.visible) s.position.set(from.x + (to.x - from.x) * (0.25 + u * 0.6), 0.48, 0);
        });
        if (u >= 1 && u - dt / 0.55 < 1) to.flash = 1;
        for (const f of [me, rival]) {
            f.recoil = Math.max(0, f.recoil - dt * 5);
            f.flash = Math.max(0, f.flash - dt * 4);
        }
    }
}
