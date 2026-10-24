// Mascotas: bichitos voxel que siguen a tu tanque. Solo adornan (no hacen nada en la partida)
// y se esconden con él: cuando tu tanque se desvanece, la mascota también.
// build(add) las construye con cubos: add(w, h, d, color, x, y, z, outlined), con y = 0 en el
// suelo bajo la mascota y mirando hacia +z. Puede devolver animate(t, moving) para sus piezas.
// fly: altura a la que flota (0: va andando a saltitos).
import { L } from '../core/I18n.js';

const INK = 0x1b0b33;
const eyes = (add, y, z, gap = 0.06, size = 0.05) => {
    for (const s of [-1, 1]) add(size, size * 1.3, 0.02, INK, s * gap, y, z, false);
};

export const PETS = [
    { id: 'pet_none', name: L('NO PET', 'SIN MASCOTA'), price: 0 },
    {
        id: 'pet_chick', name: L('CHICK', 'POLLITO'), price: 3, fly: 0,
        build(add) {
            add(0.26, 0.24, 0.26, 0xffe03a, 0, 0.14, 0);
            add(0.18, 0.16, 0.18, 0xffe03a, 0, 0.32, 0.03);
            add(0.06, 0.05, 0.08, 0xff9a1f, 0, 0.31, 0.15, false);   // pico
            eyes(add, 0.35, 0.125, 0.05, 0.04);
            add(0.04, 0.08, 0.04, 0xff9a1f, 0, 0.44, 0.02, false);   // pelito
            const wings = [-1, 1].map((s) => add(0.04, 0.12, 0.14, 0xffc21a, s * 0.15, 0.15, 0, false));
            for (const s of [-1, 1]) add(0.04, 0.04, 0.06, 0xff9a1f, s * 0.07, 0.01, 0.02, false); // patas
            return { animate: (t, moving) => wings.forEach((w, i) => (w.rotation.z = (i ? 1 : -1) * (0.2 + Math.abs(Math.sin(t * (moving ? 20 : 4))) * 0.5))) };
        },
    },
    {
        id: 'pet_slime', name: L('SLIME', 'BABOSO'), price: 3, fly: 0,
        build(add) {
            add(0.34, 0.24, 0.34, 0x7dff4a, 0, 0.12, 0);
            add(0.24, 0.08, 0.24, 0xb6ff8a, 0, 0.27, 0, false);
            eyes(add, 0.16, 0.175, 0.07, 0.06);
            add(0.08, 0.03, 0.02, 0x2a8a2a, 0, 0.08, 0.175, false);  // boca
        },
        squash: true,
    },
    {
        id: 'pet_ghost', name: L('GHOST', 'FANTASMITA'), price: 3, fly: 0.55,
        build(add) {
            add(0.3, 0.3, 0.28, 0xf4f0ff, 0, 0.15, 0);
            add(0.22, 0.08, 0.22, 0xf4f0ff, 0, 0.33, 0, false);
            const tails = [-0.1, 0, 0.1].map((x) => add(0.08, 0.1, 0.24, 0xe2dcff, x, -0.04, 0, false));
            eyes(add, 0.19, 0.145, 0.06, 0.05);
            add(0.06, 0.06, 0.02, 0xff8fd8, 0, 0.09, 0.145, false);  // boquita
            return { animate: (t) => tails.forEach((b, i) => (b.position.y = -0.04 + Math.sin(t * 8 + i * 2) * 0.03)) };
        },
    },
    {
        id: 'pet_drone', name: L('DRONE', 'DRON'), price: 4, fly: 0.85,
        build(add) {
            add(0.24, 0.1, 0.24, 0x9aa3b8, 0, 0, 0);
            add(0.14, 0.06, 0.06, 0x2ef2ff, 0, 0, 0.13, false);      // cámara
            const light = add(0.05, 0.05, 0.05, 0xff3e3e, 0, 0.07, -0.08, false);
            const rotors = [];
            for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
                add(0.16, 0.03, 0.03, 0x5a6080, x * 0.1, 0.02, z * 0.1, false).rotation.y = x * z * Math.PI / 4;
                rotors.push(add(0.2, 0.02, 0.04, 0xffffff, x * 0.17, 0.06, z * 0.17, false));
            }
            return {
                animate: (t) => {
                    rotors.forEach((r, i) => (r.rotation.y = t * 30 + i));
                    light.visible = Math.floor(t * 3) % 2 === 0;
                },
            };
        },
    },
    {
        id: 'pet_bee', name: L('BEE', 'ABEJITA'), price: 4, fly: 0.7,
        build(add) {
            add(0.2, 0.18, 0.26, 0xffd23f, 0, 0, 0);
            for (const z of [-0.05, 0.05]) add(0.21, 0.19, 0.04, INK, 0, 0, z, false);
            add(0.06, 0.06, 0.06, INK, 0, 0, -0.15, false);         // aguijón
            eyes(add, 0.03, 0.135, 0.05, 0.045);
            const wings = [-1, 1].map((s) => add(0.16, 0.02, 0.12, 0xdff6ff, s * 0.13, 0.12, -0.02, false));
            return { animate: (t) => wings.forEach((w, i) => (w.rotation.z = (i ? 1 : -1) * Math.sin(t * 40) * 0.6)) };
        },
    },
    {
        id: 'pet_ufo', name: L('MINI UFO', 'MINI OVNI'), price: 4, fly: 0.9,
        build(add) {
            add(0.4, 0.06, 0.4, 0x9aa3b8, 0, 0, 0);
            add(0.28, 0.06, 0.28, 0xd0dcff, 0, -0.05, 0, false);
            add(0.18, 0.12, 0.18, 0x7dff4a, 0, 0.08, 0);             // cúpula con su marciano
            eyes(add, 0.1, 0.095, 0.04, 0.035);
            const lights = [0, 1, 2, 3, 4, 5].map((i) => {
                const a = (i / 6) * Math.PI * 2;
                return add(0.05, 0.04, 0.05, 0xffe03a, Math.sin(a) * 0.2, 0.01, Math.cos(a) * 0.2, false);
            });
            return { animate: (t) => lights.forEach((l, i) => (l.visible = (Math.floor(t * 8) + i) % 3 !== 0)) };
        },
    },
    {
        id: 'pet_dino', name: L('DINO', 'DINO'), price: 5, fly: 0,
        build(add) {
            add(0.22, 0.2, 0.32, 0x3fbf4a, 0, 0.14, 0);
            add(0.18, 0.16, 0.2, 0x3fbf4a, 0, 0.3, 0.16);             // cabeza
            add(0.16, 0.04, 0.06, 0xffffff, 0, 0.24, 0.27, false);    // dientes
            eyes(add, 0.35, 0.265, 0.05, 0.04);
            for (const z of [-0.08, 0.04]) add(0.06, 0.08, 0.06, 0xffe03a, 0, 0.28, z, false); // cresta
            const tail = add(0.1, 0.1, 0.2, 0x3fbf4a, 0, 0.12, -0.22);
            for (const s of [-1, 1]) add(0.06, 0.06, 0.06, 0x2a8a3a, s * 0.08, 0.02, 0.02, false);
            return { animate: (t, moving) => (tail.rotation.y = Math.sin(t * (moving ? 14 : 4)) * 0.4) };
        },
    },
];

export const PET_BY_ID = Object.fromEntries(PETS.map((p) => [p.id, p]));
