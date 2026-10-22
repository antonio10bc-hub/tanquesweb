import * as THREE from 'three';
import { box, toon, outline, OUTLINE } from './materials.js';
import { easeOutBack } from '../core/math.js';
import { buildBomb } from './NukeView.js';

// Modelo voxel flotante de cada objeto. Se construyen una vez por tipo y se reutilizan.
// Cada constructor puede devolver piezas a animar ({ flames }).
const BUILDERS = {
    // Cruz verde de farmacia sobre una cruz blanca algo mayor
    heal(add, def) {
        add(0.64, 0.26, 0.12, def.accent, 0, 0, -0.03);
        add(0.26, 0.64, 0.12, def.accent, 0, 0, -0.03);
        add(0.5, 0.16, 0.1, def.color, 0, 0, 0.04, false);
        add(0.16, 0.5, 0.1, def.color, 0, 0, 0.04, false);
    },
    // Una bala gorda con llamas saliendo por detrás
    power(add, def) {
        add(0.26, 0.36, 0.26, def.color, 0, 0.04, 0);
        add(0.2, 0.14, 0.2, 0xfff1a8, 0, 0.29, 0);
        add(0.3, 0.06, 0.3, def.accent, 0, -0.1, 0, false);
        const flames = [
            add(0.2, 0.2, 0.2, 0xff3e1f, 0, -0.28, 0, false),
            add(0.13, 0.16, 0.13, 0xff9a1f, -0.09, -0.4, 0.03, false),
            add(0.13, 0.16, 0.13, 0xffe03a, 0.09, -0.42, -0.03, false),
        ];
        return { flames };
    },
    // Escudo de caballero con el centro claro
    shield(add, def) {
        add(0.5, 0.46, 0.12, def.color, 0, 0.05, 0);
        add(0.32, 0.16, 0.12, def.color, 0, -0.25, 0);
        add(0.14, 0.1, 0.12, def.color, 0, -0.37, 0);
        add(0.28, 0.3, 0.14, def.accent, 0, 0.04, 0.01, false);
    },
    // Doble flecha hacia arriba hecha de cubitos: velocidad
    turbo(add, def) {
        const arrow = (y, color) => {
            add(0.13, 0.13, 0.13, color, 0, y + 0.13, 0);
            for (const x of [-0.12, 0.12]) add(0.13, 0.13, 0.13, color, x, y, 0);
            for (const x of [-0.24, 0.24]) add(0.13, 0.13, 0.13, color, x, y - 0.13, 0);
        };
        arrow(0.12, def.accent);
        arrow(-0.2, def.color);
    },
    // Fantasmita: invisibilidad
    cloak(add, def) {
        add(0.44, 0.42, 0.3, def.color, 0, 0.02, 0);
        add(0.32, 0.12, 0.28, def.color, 0, 0.28, 0);
        for (const x of [-0.15, 0, 0.15]) add(0.12, 0.12, 0.28, def.color, x, -0.24, 0);
        for (const x of [-0.09, 0.09]) add(0.07, 0.1, 0.04, def.accent, x, 0.08, 0.16, false);
    },
    // Pelota saltarina con brillo: rebote
    bounce(add, def) {
        add(0.42, 0.42, 0.42, def.color, 0, 0, 0);
        add(0.5, 0.28, 0.28, def.color, 0, 0, 0, false);
        add(0.28, 0.5, 0.28, def.color, 0, 0, 0, false);
        add(0.28, 0.28, 0.5, def.color, 0, 0, 0, false);
        add(0.1, 0.1, 0.1, def.accent, -0.1, 0.12, 0.22, false);
    },
    // Tres balas en abanico: triple disparo
    triple(add, def) {
        for (const [x, r] of [[-0.24, 0.45], [0, 0], [0.24, -0.45]]) {
            const b = add(0.16, 0.3, 0.16, def.color, x, x === 0 ? 0.06 : -0.02, 0);
            b.rotation.z = r;
            const tip = add(0.1, 0.1, 0.1, 0xffffff, x - Math.sin(r) * 0.2, (x === 0 ? 0.06 : -0.02) + Math.cos(r) * 0.2, 0, false);
            tip.rotation.z = r;
        }
        add(0.6, 0.08, 0.14, def.accent, 0, -0.28, 0);
    },
    // Tanquecito holográfico con antifaz: señuelo
    decoy(add, def) {
        add(0.5, 0.2, 0.34, def.color, 0, -0.1, 0);
        add(0.3, 0.18, 0.26, def.color, 0, 0.1, 0);
        add(0.08, 0.08, 0.26, def.accent, 0, 0.1, 0.24);
        add(0.34, 0.07, 0.04, 0x1b0b33, 0, 0.13, 0.14, false);
        for (const x of [-0.08, 0.08]) add(0.05, 0.04, 0.04, def.accent, x, 0.13, 0.16, false);
    },
    // Bomba nuclear: cuerpo negro con franja y aletas amarillas
    nuke(add, def) {
        buildBomb(add, def);
    },
    // Pantalla de radar con mira y un "blip"
    radar(add, def) {
        add(0.58, 0.58, 0.1, def.accent, 0, 0, 0);
        add(0.05, 0.46, 0.12, def.color, 0, 0, 0.01, false);
        add(0.46, 0.05, 0.12, def.color, 0, 0, 0.01, false);
        add(0.11, 0.11, 0.14, 0xffffff, 0.13, 0.12, 0.02, false);
        add(0.08, 0.08, 0.14, def.color, -0.15, -0.14, 0.02, false);
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
            return mesh;
        };
        const parts = (BUILDERS[kind] || BUILDERS.heal)(add, def) || {};
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
        m = { group, item, ring, flames: parts.flames || [] };
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
        m.flames.forEach((f, i) => f.scale.setScalar(0.7 + Math.abs(Math.sin(time * 17 + i * 2.1)) * 0.6));
    }
}
