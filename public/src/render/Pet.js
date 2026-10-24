import * as THREE from 'three';
import { box, toon, outline, OUTLINE } from './materials.js';
import { damp } from '../core/math.js';

const SCALE = 1.25;   // un poco más grandes que a tamaño real: se ven desde la cámara del juego

// Mascota voxel (content/pets.js) que sigue a un tanque. Solo visual: comparte el fundido de
// sigilo de su dueño y celebra con él cuando baila.
export class Pet {
    constructor(def, outlineColor) {
        this.def = def;
        this.fx = { fade: { value: 1 }, flash: { value: 0 } };
        this.materials = [];
        const hull = this.own(outline(outlineColor, this.fx));
        const mats = new Map();
        const mat = (c) => mats.get(c) || (mats.set(c, this.own(toon(c, this.fx))), mats.get(c));
        this.root = new THREE.Group();
        this.body = new THREE.Group();
        this.body.scale.setScalar(SCALE);
        this.root.add(this.body);
        const extra = def.build((w, h, d, color, x, y, z, outlined = true) => {
            const m = new THREE.Mesh(box(w, h, d), mat(color));
            m.position.set(x, y, z);
            this.body.add(m);
            if (outlined) {
                const o = new THREE.Mesh(box(w + OUTLINE * 2, h + OUTLINE * 2, d + OUTLINE * 2), hull);
                o.position.set(x, y, z);
                this.body.add(o);
            }
            return m;
        });
        this.animate = extra && extra.animate;
        this.shadowMat = this.own(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
        this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.18, 8), this.shadowMat);
        this.shadow.rotation.x = -Math.PI / 2;
        this.materials.push({ dispose: () => this.shadow.geometry.dispose() });
        this.t = Math.random() * 10;
        this.x = null;
        this.z = 0;
        this.yaw = 0;
    }

    own(m) {
        this.materials.push(m);
        return m;
    }

    addTo(parent) {
        parent.add(this.root, this.shadow);
    }

    // Sigue al tanque desde detrás y a un lado (si ahí hay un muro, prueba otro hueco)
    sync(dt, tank, fade, arena) {
        const s = Math.sin(tank.yaw), c = Math.cos(tank.yaw);
        let tx = tank.x, tz = tank.z;
        for (const [b, side] of [[0.7, 0.45], [0.7, -0.45], [0.75, 0], [0, 0.6], [0, -0.6]]) {
            const x = tank.x - s * b + c * side, z = tank.z - c * b - s * side;
            if (!arena || !arena.solidAt(x, z)) {
                tx = x;
                tz = z;
                break;
            }
        }
        const party = !!(tank.model && tank.model.pose);
        this.step(dt, tx, tz, tank.alive ? fade : 0, party);
    }

    // Se acerca a (tx, tz) mirando hacia donde va; party: da saltos de alegría
    step(dt, tx, tz, fade, party = false) {
        this.t += dt;
        if (this.x === null) {
            this.x = tx;
            this.z = tz;
        }
        const dx = tx - this.x, dz = tz - this.z, far = Math.hypot(dx, dz);
        if (far > 4) {
            // Teletransporte o salto de la repetición: aparece a su lado
            this.x = tx;
            this.z = tz;
        }
        this.x = damp(this.x, tx, 5, dt);
        this.z = damp(this.z, tz, 5, dt);
        const moving = far > 0.12;
        if (moving) this.yaw = Math.atan2(dx, dz);
        const def = this.def, t = this.t;
        let y = 0, sy = 1;
        if (def.fly) y = def.fly + Math.sin(t * 3) * 0.06;
        else if (moving || party) {
            const hop = Math.abs(Math.sin(t * (party ? 9 : 12)));
            y = hop * (party ? 0.35 : 0.12);
            if (def.squash) sy = 0.8 + hop * 0.35;
        } else if (def.squash) sy = 1 + Math.sin(t * 4) * 0.06;
        if (party && def.fly) y += Math.abs(Math.sin(t * 8)) * 0.25;
        this.root.position.set(this.x, y, this.z);
        this.root.rotation.y = party ? this.yaw + t * 6 : this.yaw;
        this.body.scale.set(SCALE * (2 - sy), SCALE * sy, SCALE * (2 - sy));
        if (this.animate) this.animate(t, moving || party);
        this.fx.fade.value = fade;
        const shown = fade > 0.001;
        this.root.visible = this.shadow.visible = shown;
        this.shadow.position.set(this.x, 0.013, this.z);
        this.shadowMat.opacity = 0.25 * Math.min(1, fade * 1.5);
    }

    dispose() {
        this.root.removeFromParent();
        this.shadow.removeFromParent();
        for (const m of this.materials) m.dispose();
    }
}
