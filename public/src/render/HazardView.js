import * as THREE from 'three';
import { box, toon, outline, OUTLINE } from './materials.js';

// Dibuja los peligros de los jefes (world/Hazards.js) con el mismo estilo voxel del juego:
// sombras de aviso que parpadean, cosas que caen del cielo, charcos, remolinos, la ola y el láser.
const STYLE = {
    icicle: { fall: [0xcff6ff, 0x6fd0ff, 0xffffff], warn: 0x6fd0ff },
    meteor: { fall: [0x3a2a30, 0xff5a1f, 0xffd23f], warn: 0xff5a1f },
    lava: { disc: 0xff5a1f, inner: 0xffd23f, bits: [0xffd23f, 0xff9a1f, 0xff3e1f] },
    ice: { disc: 0xcff6ff, inner: 0xffffff, bits: [0xffffff, 0x9fefff] },
    caramel: { disc: 0xff8fd8, inner: 0xffc6ec, bits: [0xffffff, 0xff8fd8] },
    whirl: { cone: [0xf4d08a, 0xe9b46a, 0xfff0c4], bits: [0xfff0c4, 0xf4d08a] },
};

export class HazardView {
    constructor(scene, particles) {
        this.scene = scene;
        this.particles = particles;
        this.views = new Map();
        this.outlineColor = 0x1b0b33;
    }

    setOutline(color) {
        this.outlineColor = color;
    }

    clear() {
        for (const v of this.views.values()) this.drop(v);
        this.views.clear();
    }

    drop(v) {
        v.group.removeFromParent();
        for (const m of v.trash) m.dispose();
    }

    sync(list, time, dt, arena) {
        const live = new Set();
        for (const h of list) {
            live.add(h.id);
            let v = this.views.get(h.id);
            if (!v) {
                v = this.build(h, arena);
                this.views.set(h.id, v);
                this.scene.add(v.group);
            }
            v.update(h, time, dt);
        }
        for (const [id, v] of this.views) {
            if (live.has(id)) continue;
            this.drop(v);
            this.views.delete(id);
        }
    }

    // ---------- Piezas ----------
    kit() {
        const trash = [];
        const own = (m) => (trash.push(m), m);
        const hull = own(outline(this.outlineColor));
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
        const flat = (geo, color, opacity) => {
            const m = new THREE.Mesh(own(geo), own(new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false })));
            m.rotation.x = -Math.PI / 2;
            return m;
        };
        return { trash, own, cube, flat };
    }

    build(h, arena) {
        return this[h.kind](h, arena);
    }

    // Sombra de aviso que crece y parpadea + la pieza que cae en el último momento.
    strike(h) {
        const { trash, cube, flat } = this.kit();
        const st = STYLE[h.style];
        const group = new THREE.Group();
        group.position.set(h.x, 0, h.z);
        const shadow = flat(new THREE.CircleGeometry(h.r, 12), 0x000000, 0.3);
        shadow.position.y = 0.02;
        const ring = flat(new THREE.RingGeometry(h.r - 0.12, h.r, 12), st.warn, 0.9);
        ring.position.y = 0.025;
        const fall = new THREE.Group();
        if (h.style === 'icicle') {
            cube(fall, 0.34, 0.9, 0.34, st.fall[0], 0, 0.45, 0);
            cube(fall, 0.2, 0.4, 0.2, st.fall[1], 0, -0.15, 0);
            cube(fall, 0.12, 0.12, 0.12, st.fall[2], 0.08, 0.75, 0.08, false);
        } else {
            cube(fall, 0.7, 0.6, 0.7, st.fall[0], 0, 0.3, 0);
            cube(fall, 0.3, 0.3, 0.3, st.fall[1], 0.22, 0.5, 0.12);
            cube(fall, 0.22, 0.22, 0.22, st.fall[2], -0.2, 0.62, -0.1);
            cube(fall, 0.26, 0.2, 0.26, st.fall[1], -0.1, 0.1, 0.3);
        }
        group.add(shadow, ring, fall);
        const FALL = 0.55;
        return {
            group, trash,
            update: (hz, time) => {
                const k = Math.min(1, hz.t / hz.delay);
                shadow.scale.setScalar(0.3 + k * 0.7);
                ring.visible = Math.floor(time * (k > 0.6 ? 14 : 7)) % 2 === 0;
                const left = hz.delay - hz.t;
                fall.visible = left < FALL;
                fall.position.y = Math.max(0, (left / FALL) * 9);
                fall.rotation.y = time * 3;
                if (hz.style === 'meteor' && fall.visible && Math.random() < 0.7) {
                    this.particles.spawn(hz.x + (Math.random() - 0.5) * 0.4, fall.position.y + 0.7, hz.z + (Math.random() - 0.5) * 0.4,
                        0, 1.5, 0, 0.12 + Math.random() * 0.12, 0.35, st.fall[1 + ((Math.random() * 2) | 0)], -2);
                }
            },
        };
    }

    zone(h) {
        const { trash, cube, flat } = this.kit();
        const group = new THREE.Group();
        const st = STYLE[h.style];
        let update;
        if (h.style === 'whirl') {
            // Remolino de arena: discos voxel apilados que giran
            const spin = new THREE.Group();
            const levels = [[0.42, 0.18], [0.56, 0.36], [0.72, 0.54], [0.9, 0.72]];
            levels.forEach(([s, y], i) => cube(spin, s, 0.16, s, st.cone[i % st.cone.length], 0, y, 0, i % 2 === 0));
            const shadow = flat(new THREE.CircleGeometry(h.r, 10), 0x000000, 0.25);
            shadow.position.y = 0.02;
            group.add(spin, shadow);
            update = (hz, time) => {
                spin.rotation.y = time * 9;
                spin.children.forEach((m, i) => (m.position.x = Math.sin(time * 6 + i) * 0.06));
                const k = Math.min(1, hz.t / 0.5, (hz.life - hz.t) / 0.5);
                spin.scale.setScalar(Math.max(0.01, k));
                if (Math.random() < 0.5) {
                    const a = Math.random() * Math.PI * 2;
                    this.particles.spawn(hz.x + Math.sin(a) * 0.5, 0.1 + Math.random() * 0.8, hz.z + Math.cos(a) * 0.5,
                        Math.cos(a) * 2, 0.6, -Math.sin(a) * 2, 0.06 + Math.random() * 0.05, 0.4, st.bits[(Math.random() * 2) | 0], 0);
                }
            };
        } else {
            // Charco: disco con borde a cuadros y un núcleo que late
            const disc = flat(new THREE.CircleGeometry(h.r, 12), st.disc, 0.85);
            disc.position.y = 0.022;
            const inner = flat(new THREE.CircleGeometry(h.r * 0.55, 10), st.inner, 0.9);
            inner.position.y = 0.024;
            group.add(disc, inner);
            update = (hz, time) => {
                const k = Math.min(1, hz.t / 0.3, (hz.life - hz.t) / 0.6);
                group.scale.setScalar(Math.max(0.01, k));
                inner.scale.setScalar(1 + Math.sin(time * 6) * 0.15);
                const armed = !hz.dmg || hz.t > (hz.arm ?? 0.4);
                disc.material.opacity = armed ? 0.85 : 0.4;
                if (Math.random() < (hz.style === 'lava' ? 0.45 : 0.15)) {
                    const a = Math.random() * Math.PI * 2, r = Math.random() * hz.r;
                    this.particles.spawn(hz.x + Math.sin(a) * r, 0.05, hz.z + Math.cos(a) * r, 0, hz.style === 'lava' ? 1.4 : 0.5, 0,
                        0.06 + Math.random() * 0.06, 0.5, st.bits[(Math.random() * st.bits.length) | 0], hz.style === 'lava' ? 2 : 0);
                }
            };
        }
        return {
            group, trash,
            update: (hz, time, dt) => {
                group.position.set(hz.x, 0, hz.z);
                update(hz, time, dt);
            },
        };
    }

    // Ola: una fila de bloques de agua con cresta de espuma que cruza la arena.
    wave(h, arena) {
        const { trash, cube } = this.kit();
        const group = new THREE.Group();
        const cols = arena.cols;
        const crest = [];
        for (let c = 0; c < cols; c++) {
            const col = new THREE.Group();
            col.position.x = c + 0.5;
            cube(col, 1.02, 0.7, 0.7, 0x12d6e6, 0, 0.35, 0, false);
            cube(col, 1.02, 0.18, 0.5, 0xffffff, 0, 0.78, h.dir * 0.08, false);
            group.add(col);
            crest.push(col);
        }
        // Contorno común a toda la fila
        const hull = new THREE.Mesh(box(cols + OUTLINE * 2, 0.9 + OUTLINE * 2, 0.7 + OUTLINE * 2), trash[0]);
        hull.position.set(cols / 2, 0.45, 0);
        group.add(hull);
        return {
            group, trash,
            update: (hz, time) => {
                const warn = hz.t < hz.warn;
                group.position.z = hz.front;
                // Durante el aviso asoma por el borde y parpadea
                group.visible = !warn || Math.floor(time * 8) % 2 === 0;
                const rise = warn ? 0.35 : 1;
                crest.forEach((col, c) => {
                    col.scale.y = rise * (0.85 + Math.sin(time * 9 + c * 0.9) * 0.15);
                });
                hull.scale.y = rise;
                hull.position.y = 0.45 * rise;
                if (!warn && Math.random() < 0.8) {
                    this.particles.spawn(Math.random() * cols, 0.8, hz.front + hz.dir * 0.2, (Math.random() - 0.5) * 2, 2.5, hz.dir * 1.5,
                        0.08 + Math.random() * 0.08, 0.5, Math.random() < 0.5 ? 0xffffff : 0x9af6ff, 10);
                }
            },
        };
    }

    // Mina: disco oscuro con una luz que parpadea; al pisarla, el radio de la explosión avisa.
    mine(h) {
        const { trash, cube, flat } = this.kit();
        const group = new THREE.Group();
        group.position.set(h.x, 0, h.z);
        cube(group, 0.44, 0.09, 0.44, 0x2a2a34, 0, 0.045, 0);
        cube(group, 0.28, 0.05, 0.28, 0x4a4a58, 0, 0.11, 0, false);
        const light = cube(group, 0.1, 0.07, 0.1, 0xff2a2a, 0, 0.15, 0, false);
        const ring = flat(new THREE.RingGeometry(h.r - 0.1, h.r, 14), 0xff2a2a, 0.85);
        ring.position.y = 0.03;
        const fill = flat(new THREE.CircleGeometry(h.r, 14), 0xff2a2a, 0.18);
        fill.position.y = 0.025;
        group.add(ring, fill);
        return {
            group, trash,
            update: (hz, time) => {
                const lit = hz.fuse !== undefined;
                const armed = hz.t >= hz.arm;
                // Aparece con un pequeño salto al soltarla
                group.scale.setScalar(Math.min(1, 0.3 + hz.t * 3));
                light.visible = lit ? Math.floor(time * 14) % 2 === 0 : armed && Math.floor(time * 2.5) % 2 === 0;
                ring.visible = fill.visible = lit;
                if (lit) {
                    const k = 1 - Math.max(0, hz.fuse - hz.t) / hz.delay;
                    fill.scale.setScalar(0.2 + k * 0.8);
                }
            },
        };
    }

    // Láser: aviso fino que parpadea y luego un rayo gordo con núcleo blanco.
    beam(h) {
        const { trash, own } = this.kit();
        const group = new THREE.Group();
        const outer = new THREE.Mesh(box(1, 1, 1), own(new THREE.MeshBasicMaterial({ color: h.color })));
        const core = new THREE.Mesh(box(1, 1, 1), own(new THREE.MeshBasicMaterial({ color: 0xffffff })));
        const edge = new THREE.Mesh(box(1, 1, 1), own(new THREE.MeshBasicMaterial({ color: this.outlineColor, side: THREE.BackSide })));
        group.add(outer, core, edge);
        return {
            group, trash,
            update: (hz, time) => {
                const len = hz.len || 0.1;
                group.position.set(hz.x + Math.sin(hz.angle) * len / 2, 0.45, hz.z + Math.cos(hz.angle) * len / 2);
                group.rotation.y = hz.angle;
                if (!hz.live) {
                    const on = Math.floor(time * 12) % 2 === 0;
                    outer.scale.set(0.07, 0.07, len);
                    core.visible = false;
                    edge.visible = false;
                    outer.visible = on;
                    return;
                }
                const w = hz.width * (0.9 + Math.sin(time * 40) * 0.1);
                outer.visible = core.visible = edge.visible = true;
                outer.scale.set(w, w * 0.7, len);
                core.scale.set(w * 0.4, w * 0.3, len);
                edge.scale.set(w + 0.1, w * 0.7 + 0.1, len);
                // Chispas donde choca
                const ex = hz.x + Math.sin(hz.angle) * len, ez = hz.z + Math.cos(hz.angle) * len;
                for (let k = 0; k < 2; k++) {
                    this.particles.spawn(ex, 0.45, ez, (Math.random() - 0.5) * 4, 1 + Math.random() * 2, (Math.random() - 0.5) * 4,
                        0.08 + Math.random() * 0.06, 0.3, Math.random() < 0.5 ? 0xffffff : hz.color, 8);
                }
            },
        };
    }
}
