import * as THREE from 'three';
import { box, toon } from './materials.js';

const _d = new THREE.Object3D();
const _c = new THREE.Color();
const _f = new THREE.Color();
const STEP = 0.2;      // cada cuánto (en tiles recorridos) se marca un trozo de oruga
const MARK = 0.12;     // largo de cada marca: con el hueco queda el dibujo a rayas de la oruga

// Huellas de las orugas en el suelo blando (nieve, arena...). Las deja cualquier tanque,
// también los que van escondidos: así se adivina por dónde anda alguien. Cada marca se funde
// poco a poco con el color de su casilla y al final desaparece. Todo en un InstancedMesh con
// un anillo de marcas (las más viejas se reciclan), sin transparencias: solo color.
export class Tracks {
    constructor(scene, max = 900) {
        this.max = max;
        this.mesh = new THREE.InstancedMesh(box(1, 1, 1), toon(0xffffff), max);
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
        this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
        this.mesh.frustumCulled = false;
        this.mesh.count = 0;
        scene.add(this.mesh);
        this.marks = [];
        this.next = 0;
        this.cfg = null;
        this.last = new Map(); // tanque -> último punto marcado
    }

    // theme.tracks = { color, life } o nada (suelo duro: sin huellas)
    start(theme, arena) {
        this.clear();
        this.cfg = theme.tracks || null;
        this.floor = theme.floor;
        this.arena = arena;
    }

    clear() {
        this.marks.length = 0;
        this.next = 0;
        this.mesh.count = 0;
        this.last.clear();
    }

    // Llamar cada fotograma por tanque: marca cuando ha avanzado lo suficiente
    follow(tank, scale = 1) {
        if (!this.cfg) return;
        const prev = this.last.get(tank);
        if (!prev) return void this.last.set(tank, { x: tank.x, z: tank.z });
        const dx = tank.x - prev.x, dz = tank.z - prev.z, d = Math.hypot(dx, dz);
        if (d < STEP) return;
        prev.x = tank.x;
        prev.z = tank.z;
        if (d > 1) return; // teletransporte o salto de la repetición: sin raya
        const a = this.arena;
        if (a.iceAt(tank.x, tank.z) || a.bushAt(tank.x, tank.z)) return;
        const yaw = Math.atan2(dx, dz);
        const ox = Math.cos(yaw) * 0.31 * scale, oz = -Math.sin(yaw) * 0.31 * scale;
        for (const s of [-1, 1]) this.add(tank.x + ox * s, tank.z + oz * s, yaw, 0.2 * scale);
    }

    add(x, z, yaw, w) {
        const c = Math.floor(x), r = Math.floor(z);
        const m = { x, z, yaw, w, t: 0, floor: this.floor[(c + r) & 1] };
        if (this.marks.length < this.max) this.marks.push(m);
        else this.marks[this.next] = m;
        this.next = (this.next + 1) % this.max;
    }

    update(dt) {
        if (!this.cfg || !this.marks.length) {
            this.mesh.count = 0;
            return;
        }
        const life = this.cfg.life;
        let n = 0;
        for (const m of this.marks) {
            m.t += dt;
            const k = m.t / life;
            if (k >= 1) continue;
            // Primero se aclara hacia el color del suelo; en el último tramo se encoge
            _c.setHex(this.cfg.color).lerp(_f.setHex(m.floor), Math.min(1, k * 1.15));
            const s = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1;
            _d.position.set(m.x, 0.006, m.z);
            _d.rotation.set(0, m.yaw, 0);
            _d.scale.set(m.w * s, 0.012, MARK * s);
            _d.updateMatrix();
            this.mesh.setMatrixAt(n, _d.matrix);
            this.mesh.setColorAt(n, _c);
            n++;
        }
        this.mesh.count = n;
        this.mesh.instanceMatrix.needsUpdate = true;
        this.mesh.instanceColor.needsUpdate = true;
    }
}
