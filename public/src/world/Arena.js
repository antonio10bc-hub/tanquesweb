import * as THREE from 'three';
import { TILES } from '../content/index.js';
import { box, toon, outline, OUTLINE } from '../render/materials.js';
import { easeOutBack } from '../core/math.js';

const _d = new THREE.Object3D();
const _c = new THREE.Color();
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const INTRO_TIME = 1.3;

// Rejilla del nivel: datos de colisión + construcción visual (todo instanciado).
export class Arena {
    constructor(map) {
        if (!map || !map.length) throw new Error('[arena] mapa vacío');
        this.rows = map.length;
        this.cols = map[0].length;
        this.solid = new Uint8Array(this.cols * this.rows);
        this.hp = new Uint8Array(this.cols * this.rows);      // >0: muro rompible
        this.bush = new Uint8Array(this.cols * this.rows);    // 1: hierba alta
        this.shake = new Float32Array(this.cols * this.rows); // agitación visual de la hierba
        this.styles = new Array(this.cols * this.rows).fill(null);
        this.spawns = {};
        this.spawnCursor = {};

        map.forEach((line, r) => {
            if (line.length !== this.cols) {
                throw new Error(`[arena] la fila ${r} mide ${line.length}, se esperaban ${this.cols}`);
            }
            [...line].forEach((ch, c) => {
                const tile = TILES[ch];
                const i = r * this.cols + c;
                if (tile && tile.solid) {
                    this.solid[i] = 1;
                    this.styles[i] = tile.style;
                    if (tile.hp) this.hp[i] = tile.hp;
                } else if (tile && tile.bush) {
                    this.bush[i] = 1;
                } else if (!tile) {
                    (this.spawns[ch] ||= []).push({ x: c + 0.5, z: r + 0.5 });
                }
            });
        });

        this.prev = new Int32Array(this.cols * this.rows);
        this.queue = new Int32Array(this.cols * this.rows);
        this.trash = [];
        this.animated = [];
        this.introT = 0;
        this.crates = new Map(); // índice de tile -> { mesh, hull, index, maxHp }
        this.bushView = null;
    }

    // ---------- Consultas ----------
    isSolid(c, r) {
        return c < 0 || r < 0 || c >= this.cols || r >= this.rows || this.solid[r * this.cols + c] === 1;
    }

    solidAt(x, z) {
        return this.isSolid(Math.floor(x), Math.floor(z));
    }

    bushAt(x, z) {
        const c = Math.floor(x), r = Math.floor(z);
        return c >= 0 && r >= 0 && c < this.cols && r < this.rows && this.bush[r * this.cols + c] === 1;
    }

    // Una bala golpea el tile: si es rompible le quita vida. Devuelve null (muro normal),
    // 'hit' o 'broken'. Al romperse el tile pasa a ser suelo.
    damageTile(c, r, amount) {
        if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return null;
        const i = r * this.cols + c;
        if (!this.hp[i]) return null;
        const ref = this.crates.get(i);
        this.hp[i] = Math.max(0, this.hp[i] - amount);
        if (this.hp[i] > 0) {
            if (ref) {
                const k = 0.45 + 0.55 * (this.hp[i] / ref.maxHp);
                ref.mesh.mesh.setColorAt(ref.index, _c.setRGB(k, k, k));
                ref.mesh.mesh.instanceColor.needsUpdate = true;
                ref.mesh.positions[ref.index].kick = 1;
                this.layout(ref.mesh, this.introT);
            }
            return 'hit';
        }
        this.solid[i] = 0;
        if (ref) {
            ref.mesh.positions[ref.index].gone = true;
            ref.hull.positions[ref.index].gone = true;
            this.layout(ref.mesh, this.introT);
            this.layout(ref.hull, this.introT);
        }
        return 'broken';
    }

    // La hierba se agita cuando algo la atraviesa.
    rustle(x, z) {
        const c = Math.floor(x), r = Math.floor(z);
        if (this.bushAt(x, z)) this.shake[r * this.cols + c] = 1;
    }

    takeSpawn(ch) {
        const list = this.spawns[ch];
        if (!list) throw new Error(`[arena] no hay punto de aparición "${ch}" en el mapa`);
        const i = this.spawnCursor[ch] || 0;
        this.spawnCursor[ch] = i + 1;
        return list[i % list.length];
    }

    // Empuja un círculo {x, z} fuera de los tiles sólidos (deslizando por las paredes).
    resolveCircle(o, radius) {
        const c0 = Math.floor(o.x - radius), c1 = Math.floor(o.x + radius);
        const r0 = Math.floor(o.z - radius), r1 = Math.floor(o.z + radius);
        for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
                if (!this.isSolid(c, r)) continue;
                const nx = o.x < c ? c : o.x > c + 1 ? c + 1 : o.x;
                const nz = o.z < r ? r : o.z > r + 1 ? r + 1 : o.z;
                const dx = o.x - nx, dz = o.z - nz;
                const d2 = dx * dx + dz * dz;
                if (d2 >= radius * radius) continue;
                if (d2 > 1e-9) {
                    const d = Math.sqrt(d2), push = (radius - d) / d;
                    o.x += dx * push;
                    o.z += dz * push;
                } else {
                    const left = o.x - c, right = c + 1 - o.x, top = o.z - r, bottom = r + 1 - o.z;
                    const m = Math.min(left, right, top, bottom);
                    if (m === left) o.x = c - radius;
                    else if (m === right) o.x = c + 1 + radius;
                    else if (m === top) o.z = r - radius;
                    else o.z = r + 1 + radius;
                }
            }
        }
    }

    hasLOS(ax, az, bx, bz) {
        const dx = bx - ax, dz = bz - az;
        const n = Math.ceil(Math.hypot(dx, dz) / 0.2);
        for (let i = 1; i < n; i++) {
            const t = i / n;
            if (this.solidAt(ax + dx * t, az + dz * t)) return false;
        }
        return true;
    }

    // BFS en 8 direcciones sin cortar esquinas. Devuelve centros de tile o null.
    findPath(sx, sz, tx, tz) {
        const cols = this.cols;
        const sc = Math.floor(sx), sr = Math.floor(sz), tc = Math.floor(tx), tr = Math.floor(tz);
        if (this.isSolid(tc, tr) || this.isSolid(sc, sr)) return null;
        const start = sr * cols + sc, goal = tr * cols + tc;
        const prev = this.prev, queue = this.queue;
        prev.fill(-1);
        prev[start] = start;
        let head = 0, tail = 0;
        queue[tail++] = start;
        while (head < tail) {
            const cur = queue[head++];
            if (cur === goal) break;
            const cc = cur % cols, cr = (cur / cols) | 0;
            for (const [dx, dz] of DIRS) {
                const nc = cc + dx, nr = cr + dz;
                if (this.isSolid(nc, nr)) continue;
                if (dx && dz && (this.isSolid(cc + dx, cr) || this.isSolid(cc, cr + dz))) continue;
                const ni = nr * cols + nc;
                if (prev[ni] !== -1) continue;
                prev[ni] = cur;
                queue[tail++] = ni;
            }
        }
        if (prev[goal] === -1) return null;
        const path = [];
        for (let i = goal; i !== start; i = prev[i]) path.push({ x: (i % cols) + 0.5, z: ((i / cols) | 0) + 0.5 });
        return path.reverse();
    }

    randomFloorNear(x, z, min, max) {
        for (let k = 0; k < 24; k++) {
            const a = Math.random() * Math.PI * 2, d = min + Math.random() * (max - min);
            const c = Math.floor(x + Math.sin(a) * d), r = Math.floor(z + Math.cos(a) * d);
            if (!this.isSolid(c, r)) return { x: c + 0.5, z: r + 0.5 };
        }
        return null;
    }

    // ---------- Visual ----------
    build(root, theme) {
        const { cols, rows } = this;
        const own = (o) => (this.trash.push(o), o);
        const cx = cols / 2, cz = rows / 2;

        // Mar e isla
        const sea = new THREE.Mesh(own(new THREE.PlaneGeometry(600, 600)), own(new THREE.MeshBasicMaterial({ color: theme.sea })));
        sea.rotation.x = -Math.PI / 2;
        sea.position.set(cx, -0.8, cz);
        root.add(sea);

        const islandMat = own(toon(theme.island));
        const island = new THREE.Mesh(box(cols + 0.4, 2.2, rows + 0.4), islandMat);
        island.position.set(cx, -1.4, cz);
        const islandHull = new THREE.Mesh(box(cols + 0.4 + OUTLINE * 2, 2.2, rows + 0.4 + OUTLINE * 2), own(outline(theme.outline)));
        islandHull.position.copy(island.position);
        root.add(island, islandHull);

        // Suelo a cuadros (también bajo los muros rompibles, que dejan suelo al caer)
        const floorTiles = [];
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
            const i = r * cols + c;
            if (!this.solid[i] || this.hp[i]) floorTiles.push({ c, r });
        }
        const floor = new THREE.InstancedMesh(box(1, 0.3, 1), own(toon(0xffffff)), floorTiles.length);
        floorTiles.forEach(({ c, r }, i) => {
            _c.setHex(theme.floor[(c + r) & 1]).offsetHSL(0, 0, (Math.random() - 0.5) * theme.floorJitter);
            floor.setColorAt(i, _c);
        });
        this.addAnimated(root, floor, floorTiles.map(({ c, r }) => ({ x: c + 0.5, y: -0.15, z: r + 0.5 })), cx, cz);

        // Muros agrupados por estilo: una InstancedMesh + su contorno por estilo
        const byStyle = new Map();
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
            const s = this.styles[r * cols + c];
            if (!s) continue;
            if (!byStyle.has(s)) byStyle.set(s, []);
            byStyle.get(s).push({ c, r });
        }
        for (const [style, tiles] of byStyle) {
            const st = theme.walls[style];
            if (!st) throw new Error(`[arena] el tema no define el estilo de muro "${style}"`);
            const side = own(toon(st.side)), top = own(toon(st.top));
            const h = st.height;
            const mesh = new THREE.InstancedMesh(box(1, h, 1), [side, side, top, side, side, side], tiles.length);
            const hull = new THREE.InstancedMesh(box(1, 1, 1), own(outline(theme.outline)), tiles.length);
            const breakable = style === 'crate';
            const pos = tiles.map(({ c, r }) => ({ x: c + 0.5, y: h / 2, z: r + 0.5 }));
            // El contorno solo sobresale por los lados sin vecino sólido fijo: así los muros
            // contiguos se leen como un único bloque. Los rompibles van siempre contorneados,
            // para que al caer uno sus vecinos no se queden sin borde.
            const fixed = (c, r) => this.isSolid(c, r) && !this.hp[r * cols + c];
            const hullPos = tiles.map(({ c, r }) => {
                const ext = (dc, dr) => (!breakable && fixed(c + dc, r + dr) ? -0.01 : OUTLINE);
                const l = ext(-1, 0), rt = ext(1, 0), t = ext(0, -1), b = ext(0, 1);
                return {
                    x: c + 0.5 + (rt - l) / 2, y: h / 2, z: r + 0.5 + (b - t) / 2,
                    sx: 1 + l + rt, sy: h + OUTLINE * 2, sz: 1 + t + b,
                };
            });
            if (breakable) for (let k = 0; k < tiles.length; k++) mesh.setColorAt(k, _c.setRGB(1, 1, 1));
            const meshAnim = this.addAnimated(root, mesh, pos, cx, cz, 0.25);
            const hullAnim = this.addAnimated(root, hull, hullPos, cx, cz, 0.25);
            if (breakable) tiles.forEach(({ c, r }, index) => {
                const i = r * cols + c;
                this.crates.set(i, { mesh: meshAnim, hull: hullAnim, index, maxHp: this.hp[i] });
            });
        }

        this.buildBushes(root, theme, own, cx, cz);

        this.buildFoam(root, theme, own);
        this.buildClouds(root, theme, own);
    }

    addAnimated(root, mesh, positions, cx, cz, extraDelay = 0) {
        mesh.frustumCulled = false;
        const delays = positions.map((p) => Math.hypot(p.x - cx, p.z - cz) * 0.045 + extraDelay);
        const entry = { mesh, positions, delays };
        this.animated.push(entry);
        root.add(mesh);
        this.layout(entry, 0);
        return entry;
    }

    layout({ mesh, positions, delays }, t) {
        positions.forEach((p, i) => {
            const k = Math.min(1, Math.max(0, (t - delays[i]) / 0.45));
            const s = k <= 0 || p.gone ? 0.0001 : easeOutBack(k);
            const kick = p.kick ? 1 + p.kick * 0.12 : 1;
            _d.position.set(p.x + (p.jx || 0), p.y - (1 - k) * 3, p.z + (p.jz || 0));
            _d.rotation.set(0, p.ry || 0, 0);
            if (p.gone) _d.scale.setScalar(0.0001); // roto: desaparece del todo (también su contorno)
            else _d.scale.set((p.sx || 1) * kick, (p.sy || 1) * s * kick, (p.sz || 1) * kick);
            _d.updateMatrix();
            mesh.setMatrixAt(i, _d.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
    }

    // Hierba alta: cada tile son 3 matas voxel de alturas y tonos distintos.
    buildBushes(root, theme, own, cx, cz) {
        const { cols, rows } = this;
        const clumps = [];
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
            if (!this.bush[r * cols + c]) continue;
            const offs = [[-0.2, -0.18], [0.2, -0.1], [0.02, 0.2]];
            offs.forEach(([ox, oz], k) => {
                const s = 0.42 + Math.random() * 0.14, h = 0.5 + Math.random() * 0.22;
                clumps.push({ x: c + 0.5 + ox, y: h / 2, z: r + 0.5 + oz, sx: s, sy: h, sz: s, ry: Math.random() * 1.2, tile: r * cols + c, k });
            });
        }
        if (!clumps.length) return;
        const mesh = new THREE.InstancedMesh(box(1, 1, 1), own(toon(0xffffff)), clumps.length);
        clumps.forEach((p, i) => mesh.setColorAt(i, _c.setHex(theme.bush[(i * 7 + p.k) % theme.bush.length])));
        const hull = new THREE.InstancedMesh(box(1, 1, 1), own(outline(theme.outline)), clumps.length);
        const hullClumps = clumps.map((p) => ({ ...p, sx: p.sx + OUTLINE * 2, sy: p.sy + OUTLINE * 2, sz: p.sz + OUTLINE * 2 }));
        this.bushView = [this.addAnimated(root, mesh, clumps, cx, cz, 0.35), this.addAnimated(root, hull, hullClumps, cx, cz, 0.35)];
    }

    buildFoam(root, theme, own) {
        const { cols, rows } = this;
        const pts = [];
        const add = (x, z) => pts.push({ x, z, ph: Math.random() * 6, s: 0.12 + Math.random() * 0.16 });
        for (let x = -0.4; x <= cols + 0.4; x += 0.45) { add(x, -0.35 - Math.random() * 0.3); add(x, rows + 0.35 + Math.random() * 0.3); }
        for (let z = -0.4; z <= rows + 0.4; z += 0.45) { add(-0.35 - Math.random() * 0.3, z); add(cols + 0.35 + Math.random() * 0.3, z); }
        const mesh = new THREE.InstancedMesh(box(1, 1, 1), own(new THREE.MeshBasicMaterial({ color: theme.foam })), pts.length);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.frustumCulled = false;
        root.add(mesh);
        this.foam = { mesh, pts };
    }

    buildClouds(root, theme, own) {
        const mat = own(toon(theme.clouds));
        const hullMat = own(outline(theme.outline));
        this.clouds = [];
        for (let i = 0; i < 7; i++) {
            const g = new THREE.Group();
            const parts = 3 + (i % 3);
            for (let k = 0; k < parts; k++) {
                const w = 0.9 + Math.random() * 1.2, h = 0.5 + Math.random() * 0.4, d = 0.8 + Math.random() * 0.8;
                const m = new THREE.Mesh(box(w, h, d), mat);
                m.position.set(k * 0.8 - parts * 0.4, Math.random() * 0.3, (Math.random() - 0.5) * 0.6);
                const o = new THREE.Mesh(box(w + OUTLINE * 2, h + OUTLINE * 2, d + OUTLINE * 2), hullMat);
                o.position.copy(m.position);
                g.add(m, o);
            }
            const side = i % 2 ? 1 : -1;
            g.position.set(this.cols / 2 + side * (this.cols / 2 + 3 + Math.random() * 6), 1.5 + Math.random() * 1.5, Math.random() * this.rows);
            g.userData.speed = 0.2 + Math.random() * 0.3;
            root.add(g);
            this.clouds.push(g);
        }
    }

    update(dt, time) {
        const intro = this.introT < INTRO_TIME + 0.5;
        if (intro) {
            this.introT += dt;
            for (const a of this.animated) this.layout(a, this.introT);
        }
        // Hierba agitada y muros que acaban de recibir un balazo
        let moved = false;
        for (let i = 0; i < this.shake.length; i++) {
            if (this.shake[i] > 0) { this.shake[i] = Math.max(0, this.shake[i] - dt * 3); moved = true; }
        }
        if (this.bushView && (moved || this.wasShaking)) {
            for (const entry of this.bushView) for (const p of entry.positions) {
                const sh = this.shake[p.tile];
                p.jx = sh ? Math.sin(time * 40 + p.k) * 0.06 * sh : 0;
                p.jz = sh ? Math.cos(time * 37 + p.k) * 0.04 * sh : 0;
            }
            if (!intro) for (const entry of this.bushView) this.layout(entry, this.introT);
        }
        this.wasShaking = moved;
        for (const ref of this.crates.values()) {
            const p = ref.mesh.positions[ref.index];
            if (p.kick) {
                p.kick = Math.max(0, p.kick - dt * 6);
                if (!intro) this.layout(ref.mesh, this.introT);
            }
        }
        const { mesh, pts } = this.foam;
        pts.forEach((p, i) => {
            const s = p.s * (0.8 + Math.sin(time * 3 + p.ph) * 0.35);
            _d.position.set(p.x, -0.78 + Math.sin(time * 2 + p.ph) * 0.05, p.z);
            _d.rotation.set(0, p.ph + time * 0.5, 0);
            _d.scale.set(s * 2, s * 0.5, s * 2);
            _d.updateMatrix();
            mesh.setMatrixAt(i, _d.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
        for (const c of this.clouds) {
            c.position.z += c.userData.speed * dt;
            if (c.position.z > this.rows + 8) c.position.z = -8;
        }
    }

    restartIntro() {
        this.introT = 0;
    }

    dispose() {
        for (const o of this.trash) o.dispose();
        this.trash.length = 0;
        for (const a of this.animated) a.mesh.dispose();
        if (this.foam) this.foam.mesh.dispose();
    }
}
