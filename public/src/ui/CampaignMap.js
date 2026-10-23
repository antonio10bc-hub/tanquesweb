import * as THREE from 'three';
import { THEMES, WORLDS, TANKS, SKIN_BY_ID, PAINT_BY_ID } from '../content/index.js';
import { TankModel } from '../render/TankModel.js';
import { Particles } from '../render/Particles.js';
import { Markers } from '../render/Markers.js';
import { box, toon, outline, OUTLINE } from '../render/materials.js';
import { weatherParticle } from '../render/weather.js';
import { makeRng } from '../world/MapGen.js';
import { Profile } from '../core/Profile.js';
import { clamp } from '../core/math.js';
import { L as tr } from '../core/I18n.js';

// Mapa de la campaña: un diorama voxel vertical, como los mapas de mundos de los plataformas
// clásicos. Se recorre de abajo arriba: una isla por mundo (cada una sobre su propio mar),
// unidas por un camino de piedras. En cada isla espera su jefe; arriba del todo, escondido
// entre nubes, el mundo arcoíris del jefe secreto.
// Se dibuja con el mismo renderizador pixelado que las partidas.

const W = 12;          // ancho del mapa (como el de una arena)
const H = 11;          // alto de cada mundo
const TOP = 8;         // cielo por encima del mundo secreto
const BOTTOM = 14;     // mar por debajo del primero (deja subir la isla por encima de la ficha)
const N = WORLDS.length;
const L = TOP + N * H + BOTTOM;
const STAND = 1.9;     // tu tanque espera un poco al sur del pedestal del jefe
const ZOOM = 0.8;      // algo más cerca que en las partidas: se ven mejor los jefes
const PAD_Y = 0.28;
const _d = new THREE.Object3D();
const _c = new THREE.Color();
const _v = new THREE.Vector2();

const fakeTank = (x, z, yaw) => ({
    x, z, yaw, aimYaw: yaw, moving: false, alive: true, recoil: 0, flash: 0, shield: 0,
    hp: 2, maxHp: 2, ammo: 0, reloading: 0, reloadProgress: 1, angry: false,
});

export class CampaignMap {
    constructor(game) {
        this.game = game;
        this.built = false;
        this.selected = 0;
        this.at = 0;           // nodo donde está tu tanque
        this.route = null;     // camino que está recorriendo
        this.timeline = null;  // animación de desbloqueo al volver de ganar a un jefe
        this.t = 0;
        this.drag = null;
        this.freeCam = false;
        this.hard = false;     // modo difícil (se abre al terminar la campaña)
        const $ = (id) => document.getElementById(id);
        this.el = {
            root: $('campaign'), region: $('camp-region'), card: $('camp-card'), world: $('camp-world'),
            boss: $('camp-boss'), tell: $('camp-tell'), go: $('camp-go'), status: $('camp-status'),
            stars: $('camp-stars'), skull: $('btn-hard'),
        };
        // Calavera: cambia entre campaña normal y modo difícil
        this.el.skull.addEventListener('click', () => {
            this.hard = !this.hard;
            game.sfx.play(this.hard ? 'roar' : 'ui');
            game.renderer.flash(this.hard ? 0xff1a3a : 0xffffff, 0.6);
            game.rig.shake(this.hard ? 0.6 : 0.2);
            this.open(null, this.hard);
        });
        $('btn-campaign-back').addEventListener('click', () => {
            game.sfx.play('ui');
            game.showMenu();
        });
        this.el.go.addEventListener('click', () => this.play());
        window.addEventListener('keydown', (e) => {
            if (game.state !== 'campaign' || this.locked) return;
            if (e.code === 'Escape') game.showMenu();
            else if (e.code === 'ArrowUp') this.select(Math.min(this.maxOpen(), this.selected + 1), true);
            else if (e.code === 'ArrowDown') this.select(Math.max(0, this.selected - 1), true);
            else if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); this.play(); }
        });
        const canvas = game.renderer.canvas;
        canvas.addEventListener('pointerdown', (e) => this.down(e));
        window.addEventListener('pointermove', (e) => this.move(e));
        window.addEventListener('pointerup', (e) => this.up(e));
        canvas.addEventListener('wheel', (e) => {
            if (game.state !== 'campaign') return;
            this.freeCam = true;
            this.game.rig.fz = this.game.rig.clampZ(this.game.rig.fz + e.deltaY * 0.02);
        }, { passive: true });
    }

    // ---------- Progreso ----------
    isBeaten(id) {
        return Profile.beaten(id, this.hard);
    }

    unlocked(i) {
        const w = WORLDS[i];
        if (w.secret) return WORLDS.every((o) => o.secret || this.isBeaten(o.id));
        return i === 0 || this.isBeaten(WORLDS[i - 1].id);
    }

    maxOpen() {
        let m = 0;
        for (let i = 0; i < N; i++) if (this.unlocked(i)) m = i;
        return m;
    }

    // Primer mundo abierto sin ganar (o el último, si ya está todo)
    frontier() {
        for (let i = 0; i < N; i++) if (this.unlocked(i) && !this.isBeaten(WORLDS[i].id)) return i;
        return this.maxOpen();
    }

    // ---------- Geometría ----------
    regionZ(i) {
        return TOP + (N - 1 - i + 0.5) * H;
    }

    node(i) {
        const x = WORLDS[i].secret ? W / 2 : W / 2 + (i % 2 ? 1.7 : -1.7);
        return { x, z: this.regionZ(i) - 0.3 };
    }

    stand(i) {
        const n = this.node(i);
        return { x: n.x, z: n.z + STAND };
    }

    // ---------- Construcción (una vez) ----------
    build() {
        this.built = true;
        const scene = (this.scene = new THREE.Scene());
        const sun = new THREE.DirectionalLight(0xfff6e8, 2.2);
        sun.position.set(-4, 10, 6);
        scene.add(sun, new THREE.HemisphereLight(0xeee6ff, 0x5a4aa8, 1.15));
        this.particles = new Particles(scene, 700);
        this.markers = new Markers(scene);
        this.batch = [];      // cubos estáticos: todo el decorado va en 2 mallas instanciadas
        this.tiles = [];      // casillas de isla por mundo (Set "c,r")
        this.emitters = [];   // humo de volcanes, etc.
        this.foamPts = [];

        WORLDS.forEach((w, i) => {
            this.building = !!w.secret;
            this.buildRegion(w, i);
            this.buildNode(w, i);
            this.building = false;
        });
        this.buildPath();
        this.flushBatch();
        this.buildFoam();
        this.buildActors();
        this.buildClouds();
    }

    // Cubo del decorado estático (con contorno del color del mundo).
    cube(w, h, d, color, x, y, z, { outlined = true, ry = 0, ink = 0x1b0b33, rx = 0, rz = 0 } = {}) {
        this.batch.push({ w, h, d, color, x, y, z, outlined, ry, rx, rz, ink, secret: this.building });
    }

    // El mundo secreto va en su propio grupo: no se ve hasta desbloquearlo y luego emerge del mar.
    flushBatch() {
        this.secretGroup = new THREE.Group();
        this.scene.add(this.secretGroup);
        for (const secret of [false, true]) this.flushPart(this.batch.filter((b) => !!b.secret === secret), secret ? this.secretGroup : this.scene);
        this.batch = null;
    }

    flushPart(all, parent) {
        const list = all.filter((b) => !b.hullOnly);
        const mesh = new THREE.InstancedMesh(box(1, 1, 1), toon(0xffffff), list.length);
        const hulls = all.filter((b) => b.outlined);
        const hull = new THREE.InstancedMesh(box(1, 1, 1), outline(0xffffff), hulls.length);
        const put = (m, i, b, grow) => {
            _d.position.set(b.x, b.y, b.z);
            _d.rotation.set(b.rx, b.ry, b.rz);
            _d.scale.set(b.w + grow, b.h + grow, b.d + grow);
            _d.updateMatrix();
            m.setMatrixAt(i, _d.matrix);
        };
        list.forEach((b, i) => {
            put(mesh, i, b, 0);
            mesh.setColorAt(i, _c.setHex(b.color));
        });
        hulls.forEach((b, i) => {
            put(hull, i, b, b.hullOnly ? 0 : OUTLINE * 2);
            hull.setColorAt(i, _c.setHex(b.ink));
        });
        for (const m of [mesh, hull]) {
            m.frustumCulled = false;
            parent.add(m);
        }
    }

    buildRegion(w, i) {
        const theme = THEMES[w.theme], ink = theme.outline;
        const zc = this.regionZ(i), n = this.node(i);
        const rng = makeRng(1000 + i * 77);

        // Mar del mundo: cada zona tiene su color y queda claramente delimitada
        const z0 = i === N - 1 ? -40 : zc - H / 2, z1 = i === 0 ? L + 40 : zc + H / 2;
        const sea = new THREE.Mesh(new THREE.PlaneGeometry(120, z1 - z0), new THREE.MeshBasicMaterial({ color: theme.sea }));
        sea.rotation.x = -Math.PI / 2;
        sea.position.set(W / 2, -0.8, (z0 + z1) / 2);
        this.scene.add(sea);
        if (i < N - 1) for (let x = -20; x < W + 20; x += 0.7) this.foamPts.push({ x, z: zc - H / 2, color: 0xffffff, s: 0.1 + rng() * 0.1, ph: rng() * 6 });

        // Isla: una mancha de casillas alrededor del pedestal
        const rx = w.secret ? 4.4 : 4.6, rz = 3.9;
        const set = new Set();
        const tiles = [];
        for (let r = Math.floor(zc - 5); r <= Math.ceil(zc + 5); r++) {
            for (let c = 0; c < W; c++) {
                const dx = (c + 0.5 - n.x) / (rx + (rng() - 0.5) * 0.8), dz = (r + 0.5 - zc) / (rz + (rng() - 0.5) * 0.8);
                if (dx * dx + dz * dz > 1) continue;
                set.add(`${c},${r}`);
                tiles.push({ c, r });
            }
        }
        this.tiles[i] = set;
        const has = (c, r) => set.has(`${c},${r}`);
        tiles.forEach(({ c, r }) => {
            const x = c + 0.5, z = r + 0.5;
            const floor = theme.rainbow ? _c.setHSL(((c + r) * 0.07) % 1, 0.8, 0.75).getHex() : theme.floor[(c + r) & 1];
            this.cube(1, 0.3, 1, floor, x, -0.15, z, { outlined: false });
            this.cube(1, 1.2, 1, theme.island, x, -0.9, z, { outlined: false });
            // Contorno solo por los lados que dan al mar
            const ext = (dc, dr) => (has(c + dc, r + dr) ? -0.01 : OUTLINE);
            const l = ext(-1, 0), rt = ext(1, 0), t = ext(0, -1), b = ext(0, 1);
            this.batch.push({
                w: 1 + l + rt, h: 1.5, d: 1 + t + b, color: theme.island, ink,
                x: x + (rt - l) / 2, y: -0.75, z: z + (b - t) / 2, outlined: true, ry: 0, rx: 0, rz: 0, hullOnly: true, secret: this.building,
            });
            for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                if (has(c + dc, r + dr)) continue;
                for (let k = 0; k < 2; k++) {
                    this.foamPts.push({ x: x + dc * 0.62 + (dr ? (rng() - 0.5) : 0), z: z + dr * 0.62 + (dc ? (rng() - 0.5) : 0), color: theme.foam, s: 0.12 + rng() * 0.14, ph: rng() * 6, secret: !!w.secret });
                }
            }
        });

        // Decorado temático en las casillas libres (lejos del pedestal y del camino)
        const free = tiles.filter(({ c, r }) => {
            const x = c + 0.5, z = r + 0.5;
            if (Math.hypot(x - n.x, z - n.z) < 2.2 || Math.hypot(x - n.x, z - (n.z + STAND)) < 1.6) return false;
            if (Math.abs(x - n.x) < 1.3 && (z < n.z || z > n.z + STAND)) return false; // por donde pasa el camino
            const edge = !has(c + 1, r) || !has(c - 1, r) || !has(c, r + 1) || !has(c, r - 1);
            return !edge;
        });
        const used = new Set();
        const take = () => {
            for (let k = 0; k < 30; k++) {
                const t = free[(rng() * free.length) | 0];
                if (!t) return null;
                const key = `${t.c},${t.r}`;
                if (used.has(key)) continue;
                for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) used.add(`${t.c + dc},${t.r + dr}`);
                return { x: t.c + 0.5 + (rng() - 0.5) * 0.2, z: t.r + 0.5 + (rng() - 0.5) * 0.2 };
            }
            return null;
        };
        const add = (w2, h, d, color, x, y, z, o = {}) => this.cube(w2, h, d, color, x, y, z, { ink, ...o });
        const props = PROPS[w.theme];
        const big = props.big && take();
        if (big) props.big(add, big.x, big.z, rng, this);
        for (let k = 0; k < 9; k++) {
            const p = take();
            if (!p) break;
            const list = props.small;
            list[(rng() * list.length) | 0](add, p.x, p.z, rng, theme, this);
        }
    }

    // Camino de piedras de cada mundo al siguiente (con pasarela sobre el mar)
    buildPath() {
        this.stones = [];
        for (let i = 0; i < N - 1; i++) {
            const a = this.node(i), b = this.node(i + 1);
            const s = { x: a.x, z: a.z - 0.95 }, e = { x: b.x, z: b.z + STAND + 0.65 };
            const zm = (s.z + e.z) / 2;
            const P = [s, { x: s.x, z: zm }, { x: e.x, z: zm }, e];
            const at = (t) => {
                const u = 1 - t;
                return {
                    x: u * u * u * P[0].x + 3 * u * u * t * P[1].x + 3 * u * t * t * P[2].x + t * t * t * P[3].x,
                    z: u * u * u * P[0].z + 3 * u * u * t * P[1].z + 3 * u * t * t * P[2].z + t * t * t * P[3].z,
                };
            };
            // Piedras a distancias iguales a lo largo de la curva
            const pts = [];
            let prev = at(0), acc = 0;
            pts.push(prev);
            for (let k = 1; k <= 400; k++) {
                const p = at(k / 400);
                acc += Math.hypot(p.x - prev.x, p.z - prev.z);
                prev = p;
                if (acc >= 0.62) {
                    pts.push(p);
                    acc = 0;
                }
            }
            pts.forEach((p, k) => {
                const land = this.onLand(p.x, p.z);
                this.stones.push({ seg: i, k, n: pts.length, x: p.x, z: p.z, land });
                // Sobre el mar, la piedra es un tablón con su poste
                this.building = i === N - 2; // los postes hacia el mundo secreto también esperan
                if (!land) this.cube(0.12, 1.0, 0.12, 0x8a5a34, p.x, -0.55, p.z, { ink: THEMES[WORLDS[i].theme].outline });
                this.building = false;
            });
            this.segPts = this.segPts || [];
            this.segPts[i] = pts;
        }
        const mesh = new THREE.InstancedMesh(box(1, 1, 1), toon(0xffffff), this.stones.length);
        const hull = new THREE.InstancedMesh(box(1, 1, 1), outline(0x1b0b33), this.stones.length);
        this.stones.forEach((s, i) => {
            const plank = !s.land;
            s.size = plank ? [0.62, 0.14, 0.5] : [0.42, 0.14, 0.42];
            for (const [m, g] of [[mesh, 0], [hull, OUTLINE * 2]]) {
                _d.position.set(s.x, 0.07, s.z);
                _d.rotation.set(0, 0, 0);
                _d.scale.set(s.size[0] + g, s.size[1] + g, s.size[2] + g);
                _d.updateMatrix();
                m.setMatrixAt(i, _d.matrix);
            }
        });
        for (const m of [mesh, hull]) {
            m.frustumCulled = false;
            m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            this.scene.add(m);
        }
        mesh.setColorAt(0, _c.setHex(0xffffff));
        this.stoneMesh = mesh;
        this.stoneHull = hull;
    }

    onLand(x, z) {
        const key = `${Math.floor(x)},${Math.floor(z)}`;
        return this.tiles.some((set) => set.has(key));
    }

    // Pedestal del jefe en cada isla
    buildNode(w, i) {
        const theme = THEMES[w.theme], n = this.node(i), ink = theme.outline;
        const st = theme.walls.block;
        this.cube(1.7, 0.16, 1.7, st.side, n.x, 0.08, n.z, { ink });
        this.cube(1.36, 0.12, 1.36, st.top, n.x, 0.22, n.z, { ink });
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
            this.cube(0.16, 0.42, 0.16, theme.walls.crate.top, n.x + sx * 0.9, 0.21, n.z + sz * 0.9, { ink });
        }
    }

    buildFoam() {
        const pts = this.foamPts;
        const mesh = new THREE.InstancedMesh(box(1, 1, 1), new THREE.MeshBasicMaterial(), pts.length);
        pts.forEach((p, i) => mesh.setColorAt(i, _c.setHex(p.color)));
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.frustumCulled = false;
        this.scene.add(mesh);
        this.foam = mesh;
    }

    // Jefes en sus pedestales, banderas, flecha de selección y tu tanque
    buildActors() {
        this.bosses = WORLDS.map((w, i) => {
            const n = this.node(i);
            const def = TANKS[`boss_${w.id}`];
            const model = new TankModel(def.palette, THEMES[w.theme].outline, 4, null, { scale: 1.3, deco: def.deco, rainbow: def.rainbow, noBar: true });
            model.addTo(this.scene);
            model.dropY = PAD_Y;
            return { model, fake: fakeTank(n.x, n.z, 0), mode: 'ghost', pop: 0 };
        });
        this.flags = WORLDS.map((w, i) => {
            const n = this.node(i), ink = THEMES[w.theme].outline;
            const g = new THREE.Group();
            g.position.set(n.x + 0.25, PAD_Y, n.z - 0.1);
            const part = (wd, h, d, color, x, y, z) => {
                const m = new THREE.Mesh(box(wd, h, d), toon(color));
                m.position.set(x, y, z);
                const o = new THREE.Mesh(box(wd + OUTLINE * 2, h + OUTLINE * 2, d + OUTLINE * 2), outline(ink));
                o.position.copy(m.position);
                g.add(m, o);
                return m;
            };
            part(0.08, 1.5, 0.08, 0xffffff, 0, 0.75, 0);
            const cloth = new THREE.Group();
            cloth.position.set(0.04, 1.32, 0);
            g.add(cloth);
            const c1 = new THREE.Mesh(box(0.7, 0.42, 0.05), toon(0x23e0d6));
            c1.position.x = 0.35;
            const c2 = new THREE.Mesh(box(0.22, 0.14, 0.06), toon(0xffe03a));
            c2.position.set(0.35, 0, 0);
            const co = new THREE.Mesh(box(0.7 + OUTLINE * 2, 0.42 + OUTLINE * 2, 0.05 + OUTLINE * 2), outline(ink));
            co.position.x = 0.35;
            cloth.add(c1, c2, co);
            this.scene.add(g);
            return { g, cloth, k: 0 };
        });
        // Tres estrellitas sobre cada mundo ganado
        this.starOn = toon(0xffd23f);
        this.starOff = toon(0x4a3a7a);
        const starHull = outline(0x1b0b33);
        this.starModels = WORLDS.map((w, i) => {
            const n = this.node(i), g = new THREE.Group();
            g.position.set(n.x - 0.3, 2.3, n.z - 0.1);
            for (let k = 0; k < 3; k++) {
                const m = new THREE.Mesh(box(0.24, 0.24, 0.24), this.starOff);
                m.position.set((k - 1) * 0.36, k === 1 ? 0.1 : 0, 0);
                m.userData.k = k;
                const o = new THREE.Mesh(box(0.24 + OUTLINE * 2, 0.24 + OUTLINE * 2, 0.24 + OUTLINE * 2), starHull);
                o.position.copy(m.position);
                o.userData.hull = true;
                o.userData.k = 9;
                g.add(m, o);
            }
            g.visible = false;
            this.scene.add(g);
            return g;
        });
        // Flecha que marca el mundo elegido
        this.arrow = new THREE.Group();
        const yellow = toon(0xffe03a), hull = outline(0x1b0b33);
        [[0.5, 0.16, 0.5, 0.3], [0.32, 0.16, 0.32, 0.14], [0.16, 0.14, 0.16, 0]].forEach(([w, h, d, y]) => {
            const m = new THREE.Mesh(box(w, h, d), yellow);
            m.position.y = y;
            const o = new THREE.Mesh(box(w + OUTLINE * 2, h + OUTLINE * 2, d + OUTLINE * 2), hull);
            o.position.y = y;
            this.arrow.add(m, o);
        });
        this.scene.add(this.arrow);
    }

    // Tu tanque (con la skin equipada): se rehace al abrir por si has cambiado de skin
    makePlayer() {
        if (this.player) this.player.model.dispose();
        const skin = SKIN_BY_ID[Profile.data.skin] || null;
        const paint = PAINT_BY_ID[Profile.data.paint];
        const model = new TankModel({ ...TANKS.hero.palette, ...(paint && paint.palette) }, 0x1b0b33, 3, skin, { noBar: true });
        model.addTo(this.scene);
        const s = this.stand(this.at);
        this.player = { model, fake: fakeTank(s.x, s.z, Math.PI), skin };
    }

    // Nubes que esconden el mundo secreto hasta que lo desbloqueas
    buildClouds() {
        const i = N - 1, zc = this.regionZ(i);
        const white = toon(0xffffff), shade = toon(0xe6dcff), hull = outline(0x12052e);
        this.clouds = [];
        const rng = makeRng(4242);
        for (let k = 0; k < 9; k++) {
            const g = new THREE.Group();
            const parts = 3 + (k % 3);
            for (let p = 0; p < parts; p++) {
                const w = 1.6 + rng() * 1.8, h = 0.8 + rng() * 0.6, d = 1.4 + rng() * 1.2;
                const m = new THREE.Mesh(box(w, h, d), p % 2 ? shade : white);
                m.position.set(p * 1.2 - parts * 0.6, rng() * 0.5, (rng() - 0.5) * 1);
                const o = new THREE.Mesh(box(w + OUTLINE * 2, h + OUTLINE * 2, d + OUTLINE * 2), hull);
                o.position.copy(m.position);
                g.add(m, o);
            }
            const side = k % 2 ? 1 : -1;
            const home = { x: W / 2 + (rng() - 0.5) * 9, y: 1.2 + rng() * 1.6, z: zc - H / 2 + 1 + (k / 8) * (H - 1) + (rng() - 0.5) };
            g.position.set(home.x, home.y, home.z);
            this.scene.add(g);
            this.clouds.push({ g, home, away: home.x + side * 16 });
        }
    }

    // ---------- Abrir el mapa ----------
    open(justBeaten, hard = this.hard) {
        if (!this.built) this.build();
        this.hard = hard && Profile.hardUnlocked;
        // Recién terminada la campaña, la calavera aún no está: llega volando en la ceremonia
        const fresh = justBeaten === 'secret' && !this.hard;
        this.el.skull.classList.toggle('hidden', !Profile.hardUnlocked || fresh);
        this.el.skull.classList.toggle('on', this.hard);
        this.el.root.classList.toggle('hard', this.hard);
        // Modo difícil: todo teñido de rojo y negro y los jefes con su aura maligna
        this.game.renderer.setGrade(1.35, 0.42, 0.48, this.hard ? 0.6 : 0);
        for (const b of this.bosses) b.model.setEvil(this.hard);
        this.at = this.frontier();
        this.route = null;
        this.timeline = null;
        this.freeCam = false;
        this.makePlayer();
        const rig = this.game.rig;
        rig.setBounds(W, L);
        rig.zoomTarget = ZOOM;
        rig.yawTarget = 0;

        // Estado visible de cada mundo según el progreso guardado
        this.view = {
            boss: WORLDS.map((w, i) => (this.isBeaten(w.id) ? 'gone' : this.unlocked(i) ? 'solid' : 'ghost')),
            flag: WORLDS.map((w) => (this.isBeaten(w.id) ? 1 : 0)),
            lit: [],
            secret: this.unlocked(N - 1) ? 1 : 0,
        };
        for (let i = 0; i < N - 1; i++) this.view.lit[i] = this.unlocked(i + 1) ? 1 : 0;

        const idx = WORLDS.findIndex((w) => w.id === justBeaten);
        if (idx >= 0) this.celebrate(idx);
        else this.select(this.at, true);
        rig.snap();
        this.paintStones();
        this.paintStars();
        this.show(true);
    }

    // Estrellitas voxel sobre cada mundo ganado (las conseguidas en amarillo)
    paintStars() {
        this.starModels.forEach((g, i) => {
            const n = Profile.stars(WORLDS[i].id, this.hard);
            g.visible = this.isBeaten(WORLDS[i].id);
            g.children.forEach((m) => (m.material = m.userData.k < n ? this.starOn : m.userData.hull ? m.material : this.starOff));
        });
    }

    show(on) {
        this.el.root.classList.toggle('hidden', !on);
        if (!on) this.markers && this.markers.clear();
    }

    // Vuelves de ganar a un jefe: cae su figura, se iza tu bandera, se ilumina el camino y
    // tu tanque avanza al siguiente mundo (o se abren las nubes del mundo secreto).
    celebrate(idx) {
        const v = this.view, next = idx + 1 < N && this.unlocked(idx + 1) ? idx + 1 : -1;
        const secretNow = next === N - 1;
        v.boss[idx] = 'solid';
        v.flag[idx] = 0;
        if (next >= 0) {
            v.lit[idx] = 0;
            v.boss[next] = 'ghost';
            if (secretNow) v.secret = 0;
        }
        this.at = idx;
        this.makePlayer();
        this.select(idx, false);
        this.focus(idx);
        this.el.card.classList.add('hidden');
        const steps = [
            [0.5, () => this.bossFalls(idx)],
            [1.0, () => this.game.sfx.play('win')],
        ];
        if (next >= 0) {
            steps.push([1.6, () => (this.litAnim = { seg: idx, t: 0 })]);
            if (secretNow) {
                steps.push([1.9, () => {
                    this.secretAnim = 0;
                    this.game.sfx.play('secret');
                    this.game.hud.banner(tr('SECRET WORLD!', '¡MUNDO SECRETO!'), 'go');
                }]);
            }
            steps.push([2.8, () => {
                this.focus(next);
                this.bosses[next].pop = 1;
                v.boss[next] = 'solid';
                this.game.sfx.play('unlock');
                this.burst(this.node(next), [0xffe03a, 0xffffff, 0xff8fd8], 30);
                this.goTo(next);
            }]);
            steps.push([3.6, () => this.select(next, false)]);
        } else if (WORLDS[idx].secret && !this.hard) {
            // Campaña terminada: con calma, se desbloquea el modo difícil
            steps.push([2.2, () => this.unlockHard()]);
        } else {
            steps.push([1.6, () => this.select(idx, false)]);
        }
        this.timeline = { t: 0, steps };
    }

    // Ceremonia del modo difícil: sin poder tocar nada, la calavera aparece en el centro, se
    // explica qué se ha desbloqueado, vuela a su botón y un bocadillo señala dónde ha quedado.
    unlockHard() {
        const g = this.game, $ = (id) => document.getElementById(id);
        const box = $('hard-unlock'), big = box.querySelector('.hu-skull'), btn = this.el.skull;
        this.locked = true;
        this.el.root.classList.add('locked');
        this.el.card.classList.add('hidden');
        box.className = 'hard-unlock';
        const at = (ms, fn) => setTimeout(fn, ms);
        at(0, () => {
            box.classList.add('show');
            g.sfx.play('roar');
            g.renderer.flash(0xff1a3a, 0.6);
            g.rig.shake(0.6);
        });
        at(900, () => {
            box.classList.add('t1');
            g.sfx.play('win');
        });
        at(2000, () => {
            box.classList.add('t2');
            g.sfx.play('unlock');
        });
        at(5200, () => {
            // Vuela a saltos hasta su botón, encogiendo
            box.classList.add('fly');
            btn.classList.remove('hidden');
            btn.style.visibility = 'hidden';
            const a = big.getBoundingClientRect(), b = btn.getBoundingClientRect();
            const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
            const s1 = (b.width * 0.7) / a.width;
            let k = 0;
            const hop = () => {
                k++;
                const t = k / 8;
                big.style.transform = `translate(${Math.round(dx * t)}px, ${Math.round(dy * t - Math.sin(t * Math.PI) * 60)}px) scale(${1 + (s1 - 1) * t})`;
                g.sfx.play('step');
                if (k < 8) at(70, hop);
                else at(70, land);
            };
            hop();
        });
        const land = () => {
            box.className = 'hard-unlock';
            big.style.transform = '';
            btn.style.visibility = '';
            btn.classList.add('arrive');
            g.sfx.play('reloaded');
            g.hud.landSparks(btn.getBoundingClientRect());
            $('hard-tip').classList.remove('hidden');
            at(600, () => btn.classList.remove('arrive'));
            at(1800, () => {
                // Ya se puede tocar
                this.locked = false;
                this.el.root.classList.remove('locked');
                this.select(this.selected, false);
            });
            at(5000, () => $('hard-tip').classList.add('hidden'));
        };
    }

    bossFalls(i) {
        const n = this.node(i), b = this.bosses[i], pal = TANKS[`boss_${WORLDS[i].id}`].palette;
        this.view.boss[i] = 'gone';
        this.flagRise = i;
        this.burst(n, [pal.body, pal.accent, 0xffe03a, 0xffffff], 50);
        this.game.sfx.play('boom');
        this.game.rig.shake(0.6);
        this.game.renderer.flash(0xffffff, 0.5);
        b.pop = 0;
    }

    burst(n, colors, count) {
        this.particles.burst(n.x, 0.8, n.z, count, colors, { speed: 4, up: 6, size: 0.16, ttl: 1.1, grav: 12 });
    }

    // Termina la animación al momento (al tocar la pantalla)
    skipTimeline() {
        const tl = this.timeline;
        if (!tl) return;
        for (const [, fn] of tl.steps.splice(0)) fn();
        this.timeline = null;
        if (this.litAnim) this.view.lit[this.litAnim.seg] = 1;
        this.litAnim = null;
        if (this.secretAnim !== undefined && this.secretAnim !== null) this.view.secret = 1;
        this.secretAnim = null;
        if (this.flagRise !== undefined && this.flagRise !== null) this.view.flag[this.flagRise] = 1;
        this.flagRise = null;
        this.paintStones();
    }

    // ---------- Selección y movimiento ----------
    select(i, move) {
        this.selected = i;
        const w = WORLDS[i], open = this.unlocked(i), beaten = this.isBeaten(w.id);
        this.el.card.classList.remove('hidden');
        this.el.world.textContent = w.secret ? tr(`SECRET WORLD · ${w.name}`, `MUNDO SECRETO · ${w.name}`) : tr(`WORLD ${i + 1} · ${w.name}`, `MUNDO ${i + 1} · ${w.name}`);
        this.el.boss.textContent = open ? w.tank.name : '???';
        this.el.tell.textContent = open ? w.tell : w.secret ? tr('DEFEAT ALL 8 BOSSES TO FIND IT', 'DERROTA A LOS 8 JEFES PARA DESCUBRIRLO') : tr(`DEFEAT ${WORLDS[i - 1].tank.name} TO GET HERE`, `DERROTA A ${WORLDS[i - 1].tank.name} PARA LLEGAR`);
        this.el.status.textContent = beaten ? tr('DEFEATED', 'DERROTADO') : '';
        this.el.status.classList.toggle('hidden', !beaten);
        const n = Profile.stars(w.id, this.hard);
        this.el.stars.innerHTML = open ? [0, 1, 2].map((k) => `<i class="star${k < n ? ' on' : ''}"></i>`).join('') : '';
        this.el.go.disabled = !open;
        this.el.go.textContent = !open ? tr('LOCKED', 'BLOQUEADO') : beaten ? tr('REMATCH', 'REVANCHA') : tr('FIGHT!', '¡A LUCHAR!');
        this.el.card.classList.toggle('locked', !open);
        this.el.card.classList.toggle('secret', !!w.secret);
        this.freeCam = false;
        this.focus(i);
        if (move && open && i !== this.at) this.goTo(i);
    }

    // Encuadra el mundo dejando sitio a la ficha de abajo (en móviles pequeños ocupa mucho)
    focus(i) {
        const n = this.node(i), rig = this.game.rig;
        const card = this.el.card.offsetHeight ? (this.el.card.offsetHeight + 24) / window.innerHeight : 0.3;
        rig.focus(W / 2, n.z + 1.2 + card * rig.halfDepth * ZOOM * 0.6);
    }

    // Recorre el camino de piedras de un mundo a otro
    goTo(target) {
        const from = this.route ? this.route.to : this.at;
        if (target === from) return;
        const pts = [this.stand(from)];
        const up = target > from;
        for (let i = from; i !== target; i += up ? 1 : -1) {
            const seg = up ? i : i - 1;
            const list = this.segPts[seg];
            const a = this.node(i);
            if (up) pts.push({ x: a.x, z: a.z }, ...list);
            else pts.push(...[...list].reverse());
            if (!up) pts.push(this.node(i - 1));
        }
        pts.push(this.stand(target));
        // Desde la posición actual, por si ya iba de camino a otro sitio
        pts[0] = { x: this.player.fake.x, z: this.player.fake.z };
        this.route = { pts, k: 1, to: target };
    }

    play() {
        if (this.game.state !== 'campaign') return;
        const i = this.selected;
        if (!this.unlocked(i)) {
            this.game.sfx.play('itemGone');
            return;
        }
        this.game.sfx.play('ui');
        this.at = i;
        this.show(false);
        this.game.startBoss(WORLDS[i].id, this.hard);
    }

    // ---------- Toques: arrastrar para desplazar, tocar un mundo para elegirlo ----------
    down(e) {
        if (this.game.state !== 'campaign' || this.locked) return;
        this.drag = { id: e.pointerId, y: e.clientY, x: e.clientX, y0: e.clientY, t: performance.now(), moved: false, vel: 0 };
    }

    move(e) {
        const d = this.drag;
        if (!d || e.pointerId !== d.id) return;
        const dy = e.clientY - d.y;
        d.y = e.clientY;
        if (Math.abs(e.clientY - d.y0) > 8) d.moved = true;
        if (!d.moved) return;
        const rig = this.game.rig;
        // Píxeles de pantalla a unidades del mapa
        const k = (rig.halfDepth * 2 * rig.zoom) / window.innerHeight;
        this.freeCam = true;
        rig.fz = rig.clampZ(rig.fz - dy * k);
        rig.z = rig.fz;
        d.vel = -dy * k;
    }

    up(e) {
        const d = this.drag;
        if (!d || e.pointerId !== d.id) return;
        this.drag = null;
        if (d.moved) {
            this.fling = d.vel * 60;
            return;
        }
        if (this.timeline) return this.skipTimeline();
        const i = this.pick(e.clientX, e.clientY);
        if (i >= 0) {
            this.game.sfx.play('ui');
            this.select(i, true);
        }
    }

    // Mundo bajo el dedo (el pedestal más cercano en el suelo)
    pick(px, py) {
        const cam = this.game.rig.camera;
        _v.set((px / window.innerWidth) * 2 - 1, -(py / window.innerHeight) * 2 + 1);
        const ray = new THREE.Raycaster();
        ray.setFromCamera(_v, cam);
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.3);
        const hit = new THREE.Vector3();
        if (!ray.ray.intersectPlane(plane, hit)) return -1;
        let best = -1, bestD = 2.2;
        for (let i = 0; i < N; i++) {
            if (WORLDS[i].secret && !this.unlocked(i)) continue;
            const n = this.node(i);
            const d = Math.hypot(hit.x - n.x, hit.z - (n.z + 0.4));
            if (d < bestD) {
                bestD = d;
                best = i;
            }
        }
        return best;
    }

    // ---------- Bucle ----------
    frame(dt) {
        const game = this.game, rig = game.rig;
        this.t += dt;
        const t = this.t;

        if (this.timeline) {
            const tl = this.timeline;
            tl.t += dt;
            while (tl.steps.length && tl.steps[0][0] <= tl.t) tl.steps.shift()[1]();
            if (!tl.steps.length) this.timeline = null;
        }
        if (this.flagRise !== null && this.flagRise !== undefined) {
            const v = this.view;
            v.flag[this.flagRise] = Math.min(1, v.flag[this.flagRise] + dt * 1.6);
            if (v.flag[this.flagRise] >= 1) this.flagRise = null;
        }
        if (this.litAnim) {
            const a = this.litAnim;
            a.t += dt;
            const before = Math.floor(this.view.lit[a.seg] * this.segPts[a.seg].length);
            this.view.lit[a.seg] = Math.min(1, a.t / 1.1);
            const after = Math.floor(this.view.lit[a.seg] * this.segPts[a.seg].length);
            if (after > before && after % 2 === 0) game.sfx.play('step');
            this.paintStones();
            if (a.t >= 1.1) this.litAnim = null;
        }
        if (this.secretAnim !== null && this.secretAnim !== undefined) {
            this.secretAnim += dt;
            this.view.secret = Math.min(1, this.secretAnim / 1.6);
            this.paintStones();
            if (this.view.secret >= 1) this.secretAnim = null;
        }

        this.updateActors(dt, t);
        this.updateRoute(dt);

        // Cámara: sigue al tanque o al mundo elegido; arrastrando, va libre con inercia
        if (this.fling) {
            rig.fz = rig.clampZ(rig.fz + this.fling * dt);
            this.fling *= Math.pow(0.04, dt);
            if (Math.abs(this.fling) < 0.05) this.fling = 0;
        }
        if (!this.freeCam && this.route) rig.focus(W / 2, this.player.fake.z + 0.4);
        rig.update(dt);
        this.updateRegionLabel();

        this.ambient(dt);
        this.updateFoam(t);
        this.particles.update(dt);
        this.particles.sync();
        this.markers.update(dt, t);
        game.renderer.render(this.scene, rig.camera, dt);
    }

    updateActors(dt, t) {
        const v = this.view, cam = this.game.rig.camera;
        const p = this.player.fake;
        this.bosses.forEach((b, i) => {
            const mode = v.boss[i];
            const hidden = WORLDS[i].secret && v.secret < 1;
            const n = this.node(i);
            b.pop = Math.max(0, b.pop - dt * 2.5);
            const f = b.fake;
            // Mira hacia tu tanque y se balancea, esperando
            f.aimYaw = Math.atan2(p.x - f.x, p.z - f.z);
            f.yaw = Math.sin(t * 0.8 + i) * 0.25;
            b.model.dropY = PAD_Y + Math.abs(Math.sin(t * 2 + i)) * 0.06 + b.pop * 0.6;
            const fade = mode === 'gone' || hidden ? 0 : mode === 'ghost' ? 0.3 : 1;
            b.model.sync(dt, f, fade, cam);
            if (mode === 'ghost' && !hidden) this.markers.ghost(`w${i}`, n.x, n.z, 0xffffff, 0x1b0b33, 0.9);
            else this.markers.hideGhost(`w${i}`);
        });
        this.flags.forEach((fl, i) => {
            const k = v.flag[i];
            fl.g.visible = k > 0.01;
            fl.g.scale.set(1, Math.max(0.01, k), 1);
            fl.cloth.scale.x = 0.85 + Math.sin(t * 5 + i) * 0.15;
        });
        this.starModels.forEach((g, i) => (g.rotation.y = Math.sin(t * 1.5 + i) * 0.4));
        // Flecha sobre el mundo elegido
        const n = this.node(this.selected);
        this.arrow.position.set(n.x, 3.1 + Math.abs(Math.sin(t * 4)) * 0.3, n.z - 0.2);
        this.arrow.rotation.y = t * 2;
        // La isla secreta sube desde el fondo del mar al abrirse
        this.secretGroup.visible = v.secret > 0;
        this.secretGroup.position.y = -3 * (1 - v.secret) * (1 - v.secret);
        this.flags[N - 1].g.visible &&= v.secret >= 1;
        // Nubes del mundo secreto: se apartan al desbloquearlo
        for (const c of this.clouds) {
            c.g.position.x = c.home.x + (c.away - c.home.x) * v.secret * v.secret;
            c.g.position.y = c.home.y + Math.sin(t * 0.7 + c.home.z) * 0.15;
            c.g.visible = v.secret < 1;
        }
        const pm = this.player.model;
        pm.dropY = this.onPad(p.x, p.z) ? PAD_Y : 0;
        pm.sync(dt, p, 1, cam);
    }

    onPad(x, z) {
        for (let i = 0; i < N; i++) {
            const n = this.node(i);
            if (Math.abs(x - n.x) < 0.85 && Math.abs(z - n.z) < 0.85) return true;
        }
        return false;
    }

    updateRoute(dt) {
        const r = this.route, p = this.player.fake;
        if (!r) {
            p.moving = false;
            // Quieto: mira hacia el jefe de su mundo
            const n = this.node(this.at);
            p.aimYaw = Math.atan2(n.x - p.x, n.z - p.z);
            return;
        }
        let step = 4.2 * dt;
        while (step > 0 && r.k < r.pts.length) {
            const q = r.pts[r.k], dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
            if (d <= step) {
                p.x = q.x;
                p.z = q.z;
                step -= d;
                r.k++;
            } else {
                p.x += (dx / d) * step;
                p.z += (dz / d) * step;
                const yaw = Math.atan2(dx, dz);
                p.yaw = yaw;
                p.aimYaw = yaw;
                step = 0;
            }
        }
        p.moving = true;
        if ((this.dust = (this.dust || 0) - dt) <= 0) {
            this.dust = 0.08;
            this.particles.spawn(p.x - Math.sin(p.yaw) * 0.4, 0.08, p.z - Math.cos(p.yaw) * 0.4, 0, 0.6, 0, 0.14, 0.4, 0xffffff, -0.5);
        }
        if (r.k >= r.pts.length) {
            this.at = r.to;
            this.route = null;
            p.moving = false;
        }
    }

    // Piedras iluminadas (camino abierto) o apagadas; las del mundo secreto, de arcoíris
    paintStones() {
        const v = this.view;
        this.stones.forEach((s, i) => {
            const k = v.lit[s.seg] ?? 0;
            const on = s.k < Math.round(k * s.n);
            const secretSeg = s.seg === N - 2;
            let color = on ? (s.land ? 0xfff6e8 : 0xd8a46a) : 0x6a6488;
            if (secretSeg && on) color = _c.setHSL((s.k / s.n) % 1, 0.85, 0.66).getHex();
            this.stoneMesh.setColorAt(i, _c.setHex(color));
            // Hacia el mundo secreto no hay camino hasta que se abre
            const hide = secretSeg && v.secret < 1 && !on;
            for (const [m, g] of [[this.stoneMesh, 0], [this.stoneHull, OUTLINE * 2]]) {
                _d.position.set(s.x, 0.07, s.z);
                _d.rotation.set(0, 0, 0);
                const sc = hide ? 0.0001 : 1;
                _d.scale.set((s.size[0] + g) * sc, (s.size[1] + g) * sc, (s.size[2] + g) * sc);
                _d.updateMatrix();
                m.setMatrixAt(i, _d.matrix);
            }
        });
        this.stoneMesh.instanceColor.needsUpdate = true;
        this.stoneMesh.instanceMatrix.needsUpdate = true;
        this.stoneHull.instanceMatrix.needsUpdate = true;
    }

    // Clima de cada mundo, solo en los que están a la vista
    ambient(dt) {
        const rig = this.game.rig;
        WORLDS.forEach((w, i) => {
            const zc = this.regionZ(i);
            if (Math.abs(zc - rig.z) > H) return;
            if (w.secret && this.view.secret < 1) return;
            const amb = THEMES[w.theme].ambient;
            if (!amb) return;
            this.acc = this.acc || [];
            this.acc[i] = (this.acc[i] || 0) + dt * amb.rate * 0.45;
            while (this.acc[i] >= 1) {
                this.acc[i]--;
                const x = -1 + Math.random() * (W + 2), z = zc - H / 2 + Math.random() * H;
                weatherParticle(this.particles, amb.kind, x, z, amb.colors[(Math.random() * amb.colors.length) | 0]);
            }
        });
        // Modo difícil: brasas rojas y humo negro por todo el mapa
        if (this.hard && Math.random() < dt * 40) {
            const x = -1 + Math.random() * (W + 2), z = rig.z - H + Math.random() * H * 2;
            this.particles.spawn(x, 0.1, z, (Math.random() - 0.5) * 0.3, 0.8 + Math.random(), 0, 0.06 + Math.random() * 0.1, 1.6,
                Math.random() < 0.5 ? 0xff1a3a : 0x1a0008, -0.4);
        }
        for (const e of this.emitters) {
            if (Math.abs(e.z - rig.z) > H || Math.random() > dt * 10) continue;
            this.particles.spawn(e.x + (Math.random() - 0.5) * 0.3, e.y, e.z + (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3, 1 + Math.random() * 0.6, 0, 0.14 + Math.random() * 0.12, 1.4, e.colors[(Math.random() * e.colors.length) | 0], -0.6);
        }
    }

    updateFoam(t) {
        const rig = this.game.rig;
        this.foamPts.forEach((p, i) => {
            const near = Math.abs(p.z - rig.z) < H * 1.2 && (!p.secret || this.view.secret > 0.5);
            const s = near ? p.s * (0.8 + Math.sin(t * 3 + p.ph) * 0.35) : 0.0001;
            _d.position.set(p.x, -0.78 + Math.sin(t * 2 + p.ph) * 0.05, p.z);
            _d.rotation.set(0, p.ph + t * 0.5, 0);
            _d.scale.set(s * 2, s * 0.5, s * 2);
            _d.updateMatrix();
            this.foam.setMatrixAt(i, _d.matrix);
        });
        this.foam.instanceMatrix.needsUpdate = true;
    }

    // Etiqueta arriba con el mundo que estás mirando
    updateRegionLabel() {
        const z = this.game.rig.z - 1.2;
        const i = clamp(N - 1 - Math.floor((z - TOP) / H), 0, N - 1);
        const w = WORLDS[i];
        let text = w.secret && this.view.secret < 1 ? '???' : w.secret ? tr(`SECRET · ${w.name}`, `SECRETO · ${w.name}`) : tr(`WORLD ${i + 1} · ${w.name}`, `MUNDO ${i + 1} · ${w.name}`);
        if (this.hard) text = tr(`HARD · ${text}`, `DIFÍCIL · ${text}`);
        if (this.el.region.textContent !== text) this.el.region.textContent = text;
    }
}

// ---------- Decorado de cada mundo ----------
// big: una pieza grande por isla (pirámide, volcán...); small: adornos que se reparten.
const tree = (add, x, z) => {
    add(0.22, 0.5, 0.22, 0x8a5a34, x, 0.25, z);
    add(0.86, 0.6, 0.86, 0x3fbf4a, x, 0.78, z);
    add(0.52, 0.32, 0.52, 0x6fe06a, x, 1.22, z);
};
const flowers = (add, x, z, rng, theme) => {
    for (let k = 0; k < 4; k++) add(0.14, 0.12, 0.14, theme.flowers[(rng() * theme.flowers.length) | 0], x + (rng() - 0.5) * 0.7, 0.06, z + (rng() - 0.5) * 0.7, { outlined: false });
};
const PROPS = {
    meadow: {
        small: [
            tree, tree, flowers,
            (add, x, z) => add(0.5, 0.4, 0.64, 0xffd86b, x, 0.2, z),                                     // bala de paja
            (add, x, z) => { add(0.9, 0.08, 0.08, 0xffffff, x, 0.3, z); for (const s of [-0.4, 0, 0.4]) add(0.08, 0.4, 0.08, 0xffffff, x + s, 0.2, z); }, // valla
        ],
    },
    beach: {
        small: [
            (add, x, z) => {                                                                              // palmera
                for (let k = 0; k < 4; k++) add(0.18, 0.3, 0.18, 0xc8925a, x + k * 0.05, 0.15 + k * 0.3, z);
                const tx = x + 0.2, ty = 1.25;
                add(1.0, 0.08, 0.26, 0x4fb83a, tx, ty, z);
                add(0.26, 0.08, 1.0, 0x4fb83a, tx, ty, z);
                add(0.26, 0.2, 0.26, 0x7ad94a, tx, ty + 0.1, z);
            },
            (add, x, z) => { add(0.06, 0.9, 0.06, 0xffffff, x, 0.45, z); add(0.9, 0.12, 0.9, 0xff5a73, x, 0.92, z); add(0.5, 0.1, 0.5, 0xffffff, x, 1.0, z, { outlined: false }); },
            (add, x, z) => { add(0.7, 0.35, 0.7, 0xf0c977, x, 0.18, z); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(0.2, 0.32, 0.2, 0xf0c977, x + a * 0.32, 0.5, z + b * 0.32); },
            (add, x, z, rng) => add(0.34, 0.06, 0.34, 0xff9a3c, x, 0.03, z, { outlined: false, ry: rng() }),
        ],
    },
    desert: {
        big: (add, x, z) => {                                                                             // pirámide
            [[1.9, 0.0], [1.4, 0.35], [0.9, 0.7], [0.45, 1.05]].forEach(([s, y]) => add(s, 0.35, s, 0xf4bb70, x, y + 0.17, z));
        },
        small: [
            (add, x, z) => {                                                                              // cactus
                add(0.3, 0.95, 0.3, 0x63d25d, x, 0.48, z);
                add(0.2, 0.36, 0.2, 0x63d25d, x - 0.3, 0.62, z);
                add(0.2, 0.12, 0.2, 0x63d25d, x - 0.2, 0.45, z, { outlined: false });
                add(0.2, 0.3, 0.2, 0x63d25d, x + 0.3, 0.75, z);
            },
            (add, x, z, rng) => add(0.45, 0.28, 0.36, 0xc4703a, x, 0.14, z, { ry: rng() }),
            (add, x, z) => { add(0.5, 0.45, 0.5, 0xb8763a, x, 0.22, z); add(0.52, 0.06, 0.52, 0x7a4824, x, 0.3, z, { outlined: false }); },
        ],
    },
    candy: {
        small: [
            (add, x, z, rng) => {                                                                         // piruleta
                const c = [0xff8fd8, 0x6ff6ff, 0xffd23f][(rng() * 3) | 0];
                add(0.08, 0.9, 0.08, 0xffffff, x, 0.45, z);
                add(0.66, 0.66, 0.14, c, x, 1.1, z);
                add(0.26, 0.26, 0.16, 0xffffff, x, 1.1, z, { outlined: false });
            },
            (add, x, z) => {                                                                              // bastón de caramelo
                add(0.16, 0.9, 0.16, 0xffffff, x, 0.45, z);
                add(0.4, 0.16, 0.16, 0xffffff, x + 0.12, 0.92, z);
                add(0.16, 0.22, 0.16, 0xffffff, x + 0.24, 0.78, z);
                for (const y of [0.2, 0.45, 0.7]) add(0.18, 0.07, 0.18, 0xff3e5e, x, y, z, { outlined: false });
            },
            (add, x, z) => { add(0.5, 0.3, 0.5, 0xb8763a, x, 0.15, z); add(0.6, 0.24, 0.6, 0xff8fd8, x, 0.42, z); add(0.14, 0.14, 0.14, 0xff2a4a, x, 0.62, z); },
            (add, x, z, rng) => add(0.36, 0.3, 0.36, [0x7dff4a, 0xb46bff, 0xffd23f][(rng() * 3) | 0], x, 0.15, z),
        ],
    },
    snow: {
        small: [
            (add, x, z) => {                                                                              // abeto nevado
                add(0.18, 0.3, 0.18, 0x6a4a3a, x, 0.15, z);
                [[0.9, 0.42], [0.66, 0.74], [0.4, 1.04]].forEach(([s, y]) => {
                    add(s, 0.3, s, 0x2e9a72, x, y, z);
                    add(s * 0.7, 0.06, s * 0.7, 0xffffff, x, y + 0.17, z, { outlined: false });
                });
            },
            (add, x, z) => { add(0.5, 0.5, 0.5, 0xffffff, x, 0.25, z); add(0.36, 0.36, 0.36, 0xffffff, x, 0.68, z); add(0.06, 0.06, 0.22, 0xff8a1f, x, 0.68, z + 0.26, { outlined: false }); },
            (add, x, z) => { add(1.0, 0.4, 1.0, 0xffffff, x, 0.2, z); add(0.7, 0.3, 0.7, 0xeaf4ff, x, 0.55, z); add(0.32, 0.3, 0.1, 0x3a4a6a, x, 0.15, z + 0.5, { outlined: false }); },
        ],
    },
    city: {
        small: [
            (add, x, z, rng) => {                                                                         // edificio con neón
                const h = 1.3 + rng() * 1.4;
                add(0.9, h, 0.9, 0x3a2d8c, x, h / 2, z);
                add(0.94, 0.08, 0.94, [0x2ef2ff, 0xff4fa3][(rng() * 2) | 0], x, h + 0.04, z, { outlined: false });
                for (let y = 0.35; y < h - 0.2; y += 0.35) for (const s of [-0.22, 0.22]) {
                    if (rng() < 0.65) add(0.14, 0.14, 0.02, 0xffe680, x + s, y, z + 0.46, { outlined: false });
                }
            },
            (add, x, z) => { add(0.06, 0.95, 0.06, 0x9aa4c8, x, 0.48, z); add(0.22, 0.12, 0.22, 0xffe680, x, 0.98, z); },
            (add, x, z) => { add(0.62, 0.28, 0.36, 0xffd23f, x, 0.2, z); add(0.36, 0.16, 0.32, 0xffd23f, x, 0.42, z); },
        ],
    },
    volcano: {
        big: (add, x, z, rng, map) => {                                                                  // volcán humeante
            [[2.2, 0.25, 0x544350], [1.6, 0.75, 0x544350], [1.0, 1.25, 0x6e5a6c]].forEach(([s, y, c]) => add(s, 0.5, s, c, x, y, z));
            add(0.6, 0.06, 0.6, 0xffd23f, x, 1.52, z, { outlined: false });
            add(0.16, 0.9, 0.06, 0xff5a1f, x + 0.3, 0.9, z + 0.52, { outlined: false });
            map.emitters.push({ x, y: 1.6, z, colors: [0x6a5a6a, 0x8a7a8a, 0xff9a1f] });
        },
        small: [
            (add, x, z, rng) => { add(0.5, 0.36, 0.5, 0x3a2a30, x, 0.18, z, { ry: rng() }); add(0.04, 0.2, 0.3, 0xff5a1f, x + 0.2, 0.2, z, { outlined: false }); },
            (add, x, z) => add(0.8, 0.04, 0.8, 0xff5a1f, x, 0.02, z, { outlined: false }),
            (add, x, z) => { add(0.3, 0.7, 0.3, 0x9a5cff, x, 0.35, z, { ry: 0.4 }); add(0.2, 0.4, 0.2, 0x6a3acf, x + 0.25, 0.2, z, { ry: 0.8 }); },
        ],
    },
    space: {
        small: [
            (add, x, z, rng) => { add(0.24, 0.75, 0.24, 0xff4fd8, x, 0.38, z, { ry: rng() }); add(0.16, 0.45, 0.16, 0xb46bff, x + 0.24, 0.22, z + 0.1, { ry: rng() }); },
            (add, x, z) => { add(0.9, 0.03, 0.9, 0x4a3f6b, x, 0.02, z, { outlined: false }); for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) add(0.24, 0.12, 0.24, 0x8a92b8, x + a * 0.5, 0.06, z + b * 0.5); },
            (add, x, z) => { add(0.8, 0.5, 0.8, 0xd0dcff, x, 0.25, z); add(0.4, 0.16, 0.06, 0x6ff6ff, x, 0.3, z + 0.42, { outlined: false }); add(0.06, 0.6, 0.06, 0xd0dcff, x + 0.25, 0.8, z); },
        ],
    },
    rainbow: {
        big: (add, x, z) => {                                                                             // arco iris
            const col = [0xff3e5e, 0xff9a1f, 0xffe03a, 0x7dff4a, 0x23e0d6, 0x7b5cff];
            col.forEach((c, b) => {
                const R = 1.5 - b * 0.18;
                for (let k = 0; k <= 10; k++) {
                    const a = (k / 10) * Math.PI;
                    add(0.22, 0.22, 0.22, c, x + Math.cos(a) * R, Math.sin(a) * R + 0.05, z, { outlined: b === 0 || b === col.length - 1 });
                }
            });
        },
        small: [
            (add, x, z, rng) => { add(0.22, 0.8, 0.22, _c.setHSL(rng(), 0.85, 0.7).getHex(), x, 0.4, z, { ry: rng() }); add(0.16, 0.5, 0.16, _c.setHSL(rng(), 0.85, 0.7).getHex(), x + 0.22, 0.25, z, { ry: rng() }); },
            (add, x, z) => { add(0.7, 0.3, 0.5, 0xffffff, x, 0.4, z); add(0.4, 0.26, 0.4, 0xffd6f4, x + 0.3, 0.55, z); },
        ],
    },
};
