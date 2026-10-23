import * as THREE from 'three';
import { box, toon, outline, OUTLINE } from './materials.js';

// Modo difícil: calaveras voxel que brotan en los límites de la arena, suben despacio
// balanceándose y se deshacen en ceniza roja y negra. Sustituyen al filtro rojo que teñía
// toda la pantalla: la dificultad se nota en el borde, sin ensuciar el tablero.
const COUNT = 12;
const LIFE = 3.2;
const RATE = 2.4;    // calaveras nuevas por segundo
const ASH = [0xff1a3a, 0x12000a, 0x6a0010];

export class SkullWisps {
    constructor(scene, particles) {
        this.particles = particles;
        this.group = new THREE.Group();
        this.group.visible = false;
        scene.add(this.group);
        this.skulls = [];
        for (let i = 0; i < COUNT; i++) this.skulls.push(this.build());
        this.acc = 0;
        this.arena = null;
    }

    build() {
        const fx = { fade: { value: 1 }, flash: { value: 0 } };
        const white = toon(0xf4f0ff, fx), red = toon(0xff1a3a, fx), dark = toon(0x12000a, fx);
        const hull = outline(0x12000a, fx);
        const root = new THREE.Group();
        const cube = (w, h, d, mat, x, y, z, outlined = true) => {
            const m = new THREE.Mesh(box(w, h, d), mat);
            m.position.set(x, y, z);
            root.add(m);
            if (outlined) {
                const o = new THREE.Mesh(box(w + OUTLINE * 2, h + OUTLINE * 2, d + OUTLINE * 2), hull);
                o.position.set(x, y, z);
                root.add(o);
            }
        };
        cube(0.4, 0.32, 0.36, white, 0, 0.2, 0);               // cráneo
        cube(0.26, 0.1, 0.26, white, 0, 0.0, 0.03);            // mandíbula
        for (const s of [-1, 1]) cube(0.11, 0.1, 0.04, red, s * 0.09, 0.2, 0.18, false);   // ojos
        cube(0.05, 0.06, 0.04, dark, 0, 0.11, 0.18, false);    // nariz
        for (const x of [-0.08, 0, 0.08]) cube(0.04, 0.06, 0.04, dark, x, 0.01, 0.16, false); // dientes
        root.visible = false;
        this.group.add(root);
        return { root, fx, mats: [white, red, dark, hull], t: LIFE };
    }

    // arena: la de la partida en modo difícil; null las apaga
    start(arena) {
        this.arena = arena;
        this.group.visible = !!arena;
        for (const s of this.skulls) {
            s.t = LIFE;
            s.root.visible = false;
        }
    }

    // Un punto al azar sobre los muros del borde de la arena
    spot() {
        const a = this.arena, side = Math.random() * (a.cols * 2 + a.rows * 2);
        if (side < a.cols) return [side, 0.5];
        if (side < a.cols * 2) return [side - a.cols, a.rows - 0.5];
        if (side < a.cols * 2 + a.rows) return [0.5, side - a.cols * 2];
        return [a.cols - 0.5, side - a.cols * 2 - a.rows];
    }

    update(dt, time) {
        if (!this.arena) return;
        this.acc += dt * RATE;
        while (this.acc >= 1) {
            this.acc--;
            const s = this.skulls.find((k) => k.t >= LIFE);
            if (!s) break;
            const [x, z] = this.spot();
            s.t = 0;
            s.x = x;
            s.z = z;
            s.spin = (Math.random() - 0.5) * 1.2;
            s.phase = Math.random() * 6;
        }
        for (const s of this.skulls) {
            if (s.t >= LIFE) {
                s.root.visible = false;
                continue;
            }
            s.t += dt;
            const k = s.t / LIFE;
            s.root.visible = true;
            s.root.position.set(s.x + Math.sin(time * 2 + s.phase) * 0.15, 1.15 + k * 1.6, s.z);
            s.root.rotation.y = s.spin * s.t + Math.sin(time * 3 + s.phase) * 0.25;
            s.root.scale.setScalar(1.1 + Math.min(1, k * 4) * 0.5);
            // Aparece y se deshace con la trama del juego (sin transparencias suaves)
            s.fx.fade.value = Math.min(1, k * 5, (1 - k) * 3);
            if (Math.random() < dt * 6) {
                const p = s.root.position;
                this.particles.spawn(p.x + (Math.random() - 0.5) * 0.3, p.y, p.z + (Math.random() - 0.5) * 0.3,
                    (Math.random() - 0.5) * 0.4, 0.6 + Math.random() * 0.6, (Math.random() - 0.5) * 0.4,
                    0.06 + Math.random() * 0.06, 0.8, ASH[(Math.random() * ASH.length) | 0], -0.4);
            }
        }
    }
}
