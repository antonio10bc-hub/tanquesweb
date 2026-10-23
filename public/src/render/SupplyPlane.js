import * as THREE from 'three';
import { box, toon, outline, OUTLINE } from './materials.js';

// Supervivencia: entre oleada y oleada pasa un avión de suministros. Cruza la arena de lado a
// lado, suelta una caja con paracaídas cerca de ti y la caja aterriza y se abre (entonces
// Game enseña las mejoras para elegir). Solo es visual; los tiempos están en TIMES.
export const PLANE_TIMES = { fly: 1.7, drop: 0.75, fall: 1.0, open: 0.25 }; // drop: cuándo suelta la caja

export class SupplyPlane {
    constructor(scene, particles) {
        this.scene = scene;
        this.particles = particles;
        this.trash = [];
        const own = (m) => (this.trash.push(m), m);
        const hull = own(outline(0x1b0b33));
        const cube = (parent, w, h, d, color, x, y, z, outlined = true) => {
            const m = new THREE.Mesh(box(w, h, d), own(toon(color)));
            m.position.set(x, y, z);
            parent.add(m);
            if (outlined) {
                const o = new THREE.Mesh(box(w + OUTLINE * 2, h + OUTLINE * 2, d + OUTLINE * 2), hull);
                o.position.set(x, y, z);
                parent.add(o);
            }
            return m;
        };

        // Avioneta: mira hacia +x
        const plane = (this.plane = new THREE.Group());
        plane.scale.setScalar(1.5); // grande: tiene que verse bien desde la cámara alta
        cube(plane, 1.5, 0.36, 0.4, 0xff9a1f, 0, 0, 0);                 // fuselaje
        cube(plane, 0.3, 0.3, 0.34, 0xfff6e8, 0.8, 0, 0);              // morro
        cube(plane, 0.36, 0.2, 0.3, 0x6ff6ff, 0.3, 0.24, 0, false);    // cabina
        cube(plane, 0.5, 0.08, 2.4, 0xffd23f, 0.1, 0.02, 0);           // alas
        cube(plane, 0.3, 0.06, 0.9, 0xffd23f, -0.65, 0.06, 0);         // estabilizador
        cube(plane, 0.26, 0.4, 0.06, 0xff3e3e, -0.68, 0.26, 0);        // timón
        for (const z of [-0.8, 0.8]) cube(plane, 0.5, 0.09, 0.12, 0xff3e3e, 0.11, 0.03, z, false); // franjas
        this.prop = new THREE.Group();
        this.prop.position.set(0.98, 0, 0);
        cube(this.prop, 0.04, 0.7, 0.1, 0x3a2a20, 0, 0, 0, false);
        plane.add(this.prop);

        // Caja de suministros con paracaídas
        const crate = (this.crate = new THREE.Group());
        cube(crate, 0.6, 0.5, 0.6, 0xb8763a, 0, 0.25, 0);
        cube(crate, 0.62, 0.08, 0.62, 0x7a4824, 0, 0.42, 0, false);
        cube(crate, 0.62, 0.08, 0.62, 0x7a4824, 0, 0.08, 0, false);
        cube(crate, 0.2, 0.2, 0.02, 0xffffff, 0, 0.25, 0.31, false);     // cruz blanca
        cube(crate, 0.06, 0.18, 0.03, 0x3fbf4a, 0, 0.25, 0.32, false);
        cube(crate, 0.18, 0.06, 0.03, 0x3fbf4a, 0, 0.25, 0.32, false);
        const chute = (this.chute = new THREE.Group());
        chute.position.y = 1.5;
        cube(chute, 1.3, 0.18, 1.3, 0xff3e8e, 0, 0, 0);
        cube(chute, 0.9, 0.12, 0.9, 0xffffff, 0, 0.13, 0, false);
        for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
            const line = cube(chute, 0.03, 1.0, 0.03, 0xfff6e8, x * 0.62, -0.55, z * 0.62, false);
            line.rotation.set(z * 0.35, 0, -x * 0.35);
        }
        crate.add(chute);

        this.group = new THREE.Group();
        this.group.add(plane, crate);
        this.group.visible = false;
        scene.add(this.group);
        this.active = false;
    }

    // Empieza el paso del avión sobre la arena, soltando la caja en (tx, tz)
    start(arena, tx, tz) {
        this.active = true;
        this.t = 0;
        this.tx = tx;
        this.tz = tz;
        this.x0 = -3;
        this.x1 = arena.cols + 3;
        this.z = tz;
        this.group.visible = true;
        this.crate.visible = false;
        this.chute.visible = true;
        this.landed = false;
    }

    stop() {
        this.active = false;
        this.group.visible = false;
    }

    // Devuelve 'landed' el fotograma en que la caja toca el suelo
    update(dt, time) {
        if (!this.active) return null;
        this.t += dt;
        const T = PLANE_TIMES, t = this.t;
        const k = Math.min(1, t / T.fly);
        const px = this.x0 + (this.x1 - this.x0) * k;
        this.plane.position.set(px, 4.2 + Math.sin(t * 6) * 0.08, this.z);
        this.plane.rotation.z = Math.sin(t * 3) * 0.05;
        this.plane.visible = k < 1;
        this.prop.rotation.x = time * 40;
        if (k < 1 && Math.random() < 0.6) {
            this.particles.spawn(px - 0.9, 4.2, this.z + (Math.random() - 0.5) * 0.2, -1, 0.1, 0, 0.08 + Math.random() * 0.06, 0.6, 0xffffff, 0);
        }
        // La caja: sale del avión al soltarla y baja colgada del paracaídas
        const fallT = t - T.drop;
        let event = null;
        if (fallT >= 0 && !this.landed) {
            this.crate.visible = true;
            const f = Math.min(1, fallT / T.fall);
            const sx = this.x0 + (this.x1 - this.x0) * (T.drop / T.fly);
            this.crate.position.set(sx + (this.tx - sx) * Math.min(1, f * 1.6), 3.9 * (1 - f), this.tz);
            this.crate.rotation.z = Math.sin(t * 5) * 0.12 * (1 - f);
            if (f >= 1) {
                this.landed = true;
                this.chute.visible = false;
                this.crate.rotation.z = 0;
                event = 'landed';
            }
        }
        if (this.landed && t > T.drop + T.fall + T.open && k >= 1) this.crate.visible = false;
        return event;
    }

    dispose() {
        this.group.removeFromParent();
        for (const m of this.trash) m.dispose();
    }
}
