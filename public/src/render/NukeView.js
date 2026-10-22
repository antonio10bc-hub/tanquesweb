import * as THREE from 'three';
import { box, toon, outline, OUTLINE } from './materials.js';

const WARN = 0xff2a2a;

// Pieza voxel de la bomba (la usan el objeto del suelo y la bomba en vuelo).
export function buildBomb(add, def) {
    add(0.34, 0.42, 0.34, def.accent, 0, 0, 0);
    add(0.38, 0.1, 0.38, def.color, 0, 0.04, 0);
    add(0.22, 0.12, 0.22, def.accent, 0, 0.27, 0);
    add(0.1, 0.08, 0.1, def.color, 0, 0.37, 0, false);
    for (const [x, z] of [[0.17, 0], [-0.17, 0], [0, 0.17], [0, -0.17]]) add(x ? 0.06 : 0.14, 0.16, z ? 0.06 : 0.14, def.color, x, -0.27, z);
}

// Bombas en el aire: el modelo siguiendo su parábola y el círculo rojo que avisa de dónde caerá.
export class NukeView {
    constructor(scene, outlineColor = 0x1b0b33) {
        this.scene = scene;
        this.outlineMat = outline(outlineColor);
        this.items = new Map();
    }

    make(n) {
        const group = new THREE.Group();
        const bomb = new THREE.Group();
        buildBomb((w, h, d, color, x, y, z, outlined = true) => {
            const m = new THREE.Mesh(box(w, h, d), toon(color));
            m.position.set(x, y, z);
            bomb.add(m);
            if (outlined) {
                const o = new THREE.Mesh(box(w + OUTLINE * 2, h + OUTLINE * 2, d + OUTLINE * 2), this.outlineMat);
                o.position.set(x, y, z);
                bomb.add(o);
            }
        }, { color: 0xffe600, accent: 0x1b0b33 });
        bomb.scale.setScalar(1.6);

        const mat = (opacity) => new THREE.MeshBasicMaterial({ color: WARN, transparent: true, opacity, depthWrite: false });
        const fill = new THREE.Mesh(new THREE.CircleGeometry(n.radius, 24), mat(0.18));
        const ring = new THREE.Mesh(new THREE.RingGeometry(n.radius - 0.16, n.radius, 24, 1), mat(0.9));
        const core = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.42, 12, 1), mat(0.9));
        for (const m of [fill, ring, core]) {
            m.rotation.x = -Math.PI / 2;
            m.position.set(n.x1, 0.035, n.z1);
        }
        const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.4, 10),
            new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.set(n.x1, 0.04, n.z1);
        group.add(bomb, fill, ring, core, shadow);
        this.scene.add(group);
        return { group, bomb, fill, ring, core, shadow };
    }

    sync(nukes, time) {
        const alive = new Set();
        for (const n of nukes) {
            alive.add(n.id);
            let v = this.items.get(n.id);
            if (!v) this.items.set(n.id, (v = this.make(n)));
            const k = Math.min(1, n.t / n.flight);
            // Parábola alta por encima de los muros, con el morro hacia donde va
            const x = n.x0 + (n.x1 - n.x0) * k, z = n.z0 + (n.z1 - n.z0) * k;
            const y = 0.6 + Math.sin(Math.PI * k) * 6 * (1 - k * 0.15);
            v.bomb.position.set(x, y, z);
            v.bomb.rotation.set(0, Math.atan2(n.x1 - n.x0, n.z1 - n.z0), (k - 0.5) * 2.4 + time * 6);
            // El aviso late más deprisa cuanto más cerca está el impacto
            const beat = Math.sin(time * (8 + k * 22)) * 0.5 + 0.5;
            v.ring.material.opacity = 0.55 + beat * 0.45;
            v.fill.material.opacity = 0.1 + k * 0.2 + beat * 0.08;
            v.core.scale.setScalar(1 + beat * 0.3);
            v.shadow.scale.setScalar(0.4 + k * 1.6);
        }
        for (const [id, v] of this.items) {
            if (alive.has(id)) continue;
            this.dispose(v);
            this.items.delete(id);
        }
    }

    dispose(v) {
        v.group.removeFromParent();
        v.group.traverse((o) => {
            if (!o.isMesh) return;
            if (o.material !== this.outlineMat) o.material.dispose();
            if (o.geometry.type !== 'BoxGeometry') o.geometry.dispose();
        });
    }

    clear() {
        for (const v of this.items.values()) this.dispose(v);
        this.items.clear();
    }
}
