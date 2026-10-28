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
        id: 'pet_chick', name: L('CHICK', 'POLLITO'), price: 1, fly: 0,
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
        id: 'pet_slime', name: L('SLIME', 'BABOSO'), price: 1, fly: 0,
        build(add) {
            add(0.34, 0.24, 0.34, 0x7dff4a, 0, 0.12, 0);
            add(0.24, 0.08, 0.24, 0xb6ff8a, 0, 0.27, 0, false);
            eyes(add, 0.16, 0.175, 0.07, 0.06);
            add(0.08, 0.03, 0.02, 0x2a8a2a, 0, 0.08, 0.175, false);  // boca
        },
        squash: true,
    },
    {
        id: 'pet_frog', name: L('FROG', 'RANITA'), price: 1, fly: 0,
        build(add) {
            add(0.3, 0.16, 0.26, 0x5ad64a, 0, 0.09, 0);
            for (const sx of [-1, 1]) {
                add(0.09, 0.09, 0.09, 0x5ad64a, sx * 0.09, 0.2, 0.07);       // ojos saltones
                add(0.05, 0.06, 0.02, 0x1b0b33, sx * 0.09, 0.21, 0.12, false);
                add(0.08, 0.05, 0.12, 0x3fa83a, sx * 0.15, 0.03, -0.06, false); // patas
            }
            add(0.16, 0.02, 0.02, 0xff6a8a, 0, 0.07, 0.135, false);           // sonrisa
            add(0.2, 0.02, 0.16, 0xd8ff8a, 0, 0.005, 0.02, false);            // barriga
        },
        squash: true,
    },
    {
        id: 'pet_bunny', name: L('BUNNY', 'CONEJITO'), price: 1, fly: 0,
        build(add) {
            add(0.24, 0.2, 0.26, 0xffffff, 0, 0.11, 0);
            add(0.2, 0.18, 0.18, 0xffffff, 0, 0.29, 0.06);
            eyes(add, 0.31, 0.155, 0.05, 0.04);
            add(0.04, 0.03, 0.02, 0xff8fd8, 0, 0.26, 0.155, false);           // nariz
            const ears = [-1, 1].map((sx) => add(0.06, 0.2, 0.05, 0xffffff, sx * 0.05, 0.48, 0.04));
            for (const sx of [-1, 1]) add(0.03, 0.14, 0.02, 0xff8fd8, sx * 0.05, 0.48, 0.07, false);
            add(0.1, 0.1, 0.08, 0xffffff, 0, 0.13, -0.16);                     // colita
            return { animate: (t, moving) => ears.forEach((e, i) => (e.rotation.x = (moving ? -0.4 : 0) + Math.sin(t * 3 + i) * 0.1)) };
        },
    },
    {
        id: 'pet_penguin', name: L('PENGUIN', 'PINGÜINO'), price: 1, fly: 0,
        build(add) {
            add(0.24, 0.34, 0.22, 0x1b1f4a, 0, 0.18, 0);
            add(0.18, 0.24, 0.02, 0xffffff, 0, 0.16, 0.115, false);            // pechera
            eyes(add, 0.29, 0.12, 0.05, 0.035);
            add(0.08, 0.04, 0.08, 0xff9a1f, 0, 0.25, 0.14, false);            // pico
            for (const sx of [-1, 1]) add(0.08, 0.03, 0.1, 0xff9a1f, sx * 0.06, 0.01, 0.04, false);
            const wings = [-1, 1].map((sx) => add(0.04, 0.2, 0.12, 0x1b1f4a, sx * 0.14, 0.18, 0, false));
            return { animate: (t, moving) => wings.forEach((w, i) => (w.rotation.z = (i ? 1 : -1) * (0.15 + Math.abs(Math.sin(t * (moving ? 14 : 3))) * 0.4))) };
        },
    },
    {
        id: 'pet_cat', name: L('KITTY', 'GATITO'), price: 2, fly: 0,
        build(add) {
            add(0.2, 0.18, 0.32, 0xff9a1f, 0, 0.12, 0);
            add(0.22, 0.2, 0.18, 0xff9a1f, 0, 0.27, 0.13);
            for (const sx of [-1, 1]) {
                add(0.06, 0.08, 0.04, 0xff9a1f, sx * 0.07, 0.4, 0.13);         // orejas
                add(0.06, 0.02, 0.02, 0xffffff, sx * 0.13, 0.24, 0.225, false); // bigotes
            }
            eyes(add, 0.29, 0.225, 0.05, 0.04);
            add(0.04, 0.03, 0.02, 0xff6a8a, 0, 0.25, 0.23, false);
            for (const z of [-0.06, 0.06]) add(0.21, 0.03, 0.04, 0xd86a10, 0, 0.21, z, false); // rayas
            const tail = add(0.05, 0.22, 0.05, 0xff9a1f, 0, 0.26, -0.17);
            return { animate: (t) => (tail.rotation.z = Math.sin(t * 3) * 0.4) };
        },
    },
    {
        id: 'pet_puppy', name: L('PUPPY', 'PERRITO'), price: 2, fly: 0,
        build(add) {
            add(0.22, 0.18, 0.32, 0xd8a86a, 0, 0.12, 0);
            add(0.22, 0.2, 0.2, 0xd8a86a, 0, 0.28, 0.14);
            add(0.12, 0.08, 0.08, 0xf4dcb4, 0, 0.24, 0.26);                     // hocico
            add(0.05, 0.04, 0.02, 0x1b0b33, 0, 0.27, 0.3, false);              // nariz
            eyes(add, 0.32, 0.245, 0.06, 0.04);
            const ears = [-1, 1].map((sx) => add(0.06, 0.14, 0.08, 0x8a5a34, sx * 0.13, 0.3, 0.12));
            add(0.24, 0.04, 0.04, 0xff3e3e, 0, 0.2, 0.08, false);              // collar
            const tail = add(0.05, 0.05, 0.14, 0xd8a86a, 0, 0.2, -0.2);
            return {
                animate: (t, moving) => {
                    tail.rotation.y = Math.sin(t * (moving ? 22 : 12)) * 0.6;
                    ears.forEach((e, i) => (e.rotation.z = (i ? -1 : 1) * Math.abs(Math.sin(t * 6)) * 0.3));
                },
            };
        },
    },
    {
        id: 'pet_ghost', name: L('GHOST', 'FANTASMITA'), price: 2, fly: 0.55,
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
        id: 'pet_bee', name: L('BEE', 'ABEJITA'), price: 2, fly: 0.7,
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
        id: 'pet_bat', name: L('BAT', 'MURCIÉLAGO'), price: 2, fly: 0.8,
        build(add) {
            add(0.18, 0.18, 0.16, 0x4a2f7a, 0, 0, 0);
            for (const sx of [-1, 1]) add(0.05, 0.08, 0.04, 0x4a2f7a, sx * 0.06, 0.12, 0);
            for (const sx of [-1, 1]) add(0.05, 0.05, 0.02, 0xffe03a, sx * 0.045, 0.02, 0.085, false);
            add(0.06, 0.03, 0.02, 0xffffff, 0, -0.05, 0.085, false);           // colmillos
            const wings = [-1, 1].map((sx) => add(0.24, 0.03, 0.14, 0x2a1d4a, sx * 0.2, 0.02, -0.02));
            return { animate: (t) => wings.forEach((w, i) => (w.rotation.z = (i ? 1 : -1) * Math.sin(t * 22) * 0.7)) };
        },
    },
    {
        id: 'pet_drone', name: L('DRONE', 'DRON'), price: 3, fly: 0.85,
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
        id: 'pet_robot', name: L('ROBOT', 'ROBOTITO'), price: 3, fly: 0,
        build(add) {
            add(0.24, 0.2, 0.2, 0x9aa3b8, 0, 0.14, 0);
            add(0.2, 0.16, 0.18, 0xb7c0d4, 0, 0.32, 0);
            add(0.16, 0.06, 0.02, 0x1b0b33, 0, 0.33, 0.095, false);            // visor
            const eyesLit = [-1, 1].map((sx) => add(0.04, 0.03, 0.02, 0x2ef2ff, sx * 0.04, 0.33, 0.1, false));
            add(0.02, 0.1, 0.02, 0x5a6080, 0, 0.45, 0, false);                  // antena
            const bulb = add(0.05, 0.05, 0.05, 0xff3e3e, 0, 0.51, 0, false);
            add(0.1, 0.06, 0.02, 0xffe03a, 0, 0.15, 0.105, false);            // panel
            for (const sx of [-1, 1]) add(0.08, 0.05, 0.16, 0x2a2e3a, sx * 0.08, 0.025, 0, false); // orugas
            return {
                animate: (t) => {
                    bulb.visible = Math.floor(t * 2) % 2 === 0;
                    eyesLit.forEach((e) => (e.scale.y = Math.floor(t * 0.7) % 4 === 0 ? 0.3 : 1));
                },
            };
        },
    },
    {
        id: 'pet_ufo', name: L('MINI UFO', 'MINI OVNI'), price: 3, fly: 0.9,
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
        id: 'pet_dino', name: L('DINO', 'DINO'), price: 3, fly: 0,
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
    {
        id: 'pet_dragon', name: L('BABY DRAGON', 'DRAGONCITO'), price: 3, fly: 0.75,
        build(add) {
            add(0.2, 0.18, 0.26, 0xff5a3c, 0, 0, 0);
            add(0.18, 0.16, 0.16, 0xff5a3c, 0, 0.1, 0.16);
            add(0.14, 0.03, 0.18, 0xffd23f, 0, -0.09, 0.02, false);             // barriga
            eyes(add, 0.13, 0.245, 0.05, 0.04);
            for (const sx of [-1, 1]) add(0.03, 0.08, 0.03, 0xfff1d0, sx * 0.05, 0.22, 0.12, false); // cuernos
            for (const z of [-0.08, 0.02]) add(0.04, 0.06, 0.06, 0xffd23f, 0, 0.12, z, false); // cresta
            add(0.08, 0.08, 0.16, 0xff5a3c, 0, -0.02, -0.18);                    // cola
            const wings = [-1, 1].map((sx) => add(0.2, 0.03, 0.14, 0xb04bff, sx * 0.17, 0.08, -0.02));
            const puff = add(0.06, 0.06, 0.06, 0xffe03a, 0, 0.08, 0.28, false); // chispa de fuego
            return {
                animate: (t) => {
                    wings.forEach((w, i) => (w.rotation.z = (i ? 1 : -1) * (0.2 + Math.sin(t * 12) * 0.5)));
                    puff.visible = Math.floor(t * 1.5) % 3 === 0;
                    puff.position.z = 0.28 + (t * 1.5 % 1) * 0.1;
                },
            };
        },
    },
];

export const PET_BY_ID = Object.fromEntries(PETS.map((p) => [p.id, p]));
