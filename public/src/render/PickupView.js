import * as THREE from 'three';
import { box, toon, outline, OUTLINE } from './materials.js';
import { easeOutBack } from '../core/math.js';

// Modelo voxel flotante de cada objeto. Se construyen una vez por tipo y se reutilizan.
const BUILDERS = {
    // Cruz médica con núcleo blanco
    heal(add, def) {
        add(0.56, 0.2, 0.2, def.color, 0, 0, 0);
        add(0.2, 0.56, 0.2, def.color, 0, 0, 0);
        add(0.12, 0.12, 0.24, def.accent, 0, 0, 0, false);
    },
    // Dos balas gordas con punta: munición potenciada
    power(add, def) {
        for (const x of [-0.13, 0.13]) {
            add(0.16, 0.34, 0.16, def.color, x, -0.05, 0);
            add(0.11, 0.12, 0.11, def.accent, x, 0.18, 0);
        }
        add(0.42, 0.06, 0.2, def.accent, 0, -0.2, 0, false);
    },
};

export class PickupView {
    constructor(scene, outlineColor = 0x1b0b33) {
        this.root = new THREE.Group();
        scene.add(this.root);
        this.outlineMat = outline(outlineColor);
        this.models = new Map();
    }

    get(kind, def) {
        let m = this.models.get(kind);
        if (m) return m;
        const group = new THREE.Group();
        const item = new THREE.Group();
        const add = (w, h, d, color, x, y, z, outlined = true) => {
            const mesh = new THREE.Mesh(box(w, h, d), toon(color));
            mesh.position.set(x, y, z);
            item.add(mesh);
            if (outlined) {
                const o = new THREE.Mesh(box(w + OUTLINE * 2, h + OUTLINE * 2, d + OUTLINE * 2), this.outlineMat);
                o.position.set(x, y, z);
                item.add(o);
            }
        };
        (BUILDERS[kind] || BUILDERS.heal)(add, def);
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.4, 0.56, 10, 1),
            new THREE.MeshBasicMaterial({ color: def.color, transparent: true, depthWrite: false })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.03;
        const shadow = new THREE.Mesh(
            new THREE.CircleGeometry(0.26, 8),
            new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false })
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.02;
        group.add(item, ring, shadow);
        group.visible = false;
        this.root.add(group);
        m = { group, item, ring };
        this.models.set(kind, m);
        return m;
    }

    sync(cur, rules, time) {
        for (const m of this.models.values()) m.group.visible = false;
        if (!cur) return;
        const m = this.get(cur.kind, cur.def);
        const left = rules.lifetime - cur.life;
        m.group.visible = left > rules.blinkTime || Math.floor(time * 10) % 2 === 0;
        m.group.position.set(cur.x, 0, cur.z);
        const pop = cur.life < 0.3 ? easeOutBack(cur.life / 0.3) : 1;
        m.item.scale.setScalar(Math.max(0.001, pop) * 1.35);
        m.item.position.y = 0.65 + Math.sin(time * 3) * 0.08;
        // Balanceo de cara a la cámara: un giro completo lo dejaría de canto la mitad del tiempo.
        m.item.rotation.set(-0.9, Math.sin(time * 2.2) * 0.55, 0); // inclinado hacia la cámara
        m.ring.scale.setScalar(1 + Math.sin(time * 6) * 0.1);
        m.ring.material.opacity = 0.55 + Math.sin(time * 6) * 0.25;
    }
}
