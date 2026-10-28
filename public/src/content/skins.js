// Skins del tanque del jugador. Se compran con monedas de oro en "Mi Tanque"; las de los jefes
// ("boss") no se compran: se ganan al vencer a ese jefe en modo difícil.
// Los gorros se construyen con cubos encima de la torreta: add(w, h, d, color, x, y, z, outlined)
// con y = 0 en la tapa de la torreta. Un gorro puede devolver piezas a animar.
// "gold" convierte el tanque entero en oro, con aura y partículas.
import { L } from '../core/I18n.js';
export const SKINS = [
    {
        id: 'none',
        name: L('NO HAT', 'SIN GORRO'),
        price: 0,
    },
    {
        id: 'party',
        name: L('PARTY HAT', 'GORRO DE FIESTA'),
        price: 1,
        hat(add) {
            const c = [0xff3e8e, 0xffe03a, 0x23e0d6, 0xff3e8e];
            [0.3, 0.23, 0.16, 0.1].forEach((w, i) => add(w, 0.1, w, c[i], 0, 0.05 + i * 0.1, 0, i === 0));
            add(0.1, 0.1, 0.1, 0xffffff, 0, 0.47, 0);
        },
    },
    {
        id: 'tophat',
        name: L('TOP HAT', 'CHISTERA'),
        price: 1,
        hat(add) {
            add(0.46, 0.05, 0.46, 0x1b0b33, 0, 0.025, 0);
            add(0.28, 0.32, 0.28, 0x2a1d4a, 0, 0.21, 0);
            add(0.29, 0.06, 0.29, 0xff3e3e, 0, 0.09, 0, false);
        },
    },
    {
        id: 'chef',
        name: L('CHEF', 'CHEF'),
        price: 1,
        hat(add) {
            add(0.34, 0.1, 0.34, 0xffffff, 0, 0.05, 0);
            add(0.42, 0.16, 0.42, 0xf4f6ff, 0, 0.18, 0);
            for (const [x, z] of [[-0.12, 0], [0.12, 0], [0, 0.1]]) add(0.2, 0.14, 0.2, 0xffffff, x, 0.3, z);
        },
    },
    {
        id: 'cowboy',
        name: L('COWBOY', 'VAQUERO'),
        price: 1,
        hat(add) {
            add(0.6, 0.04, 0.46, 0xa8642e, 0, 0.03, 0);
            for (const x of [-0.27, 0.27]) add(0.06, 0.1, 0.46, 0xa8642e, x, 0.08, 0, false);
            add(0.3, 0.18, 0.26, 0xc47a3a, 0, 0.13, 0);
            add(0.31, 0.04, 0.27, 0x3b2214, 0, 0.07, 0, false);
        },
    },
    {
        id: 'cat',
        name: L('CAT EARS', 'OREJAS DE GATO'),
        price: 1,
        hat(add) {
            add(0.46, 0.05, 0.36, 0xff9a1f, 0, 0.025, 0);
            for (const s of [-1, 1]) {
                add(0.16, 0.12, 0.1, 0xff9a1f, s * 0.15, 0.1, 0);
                add(0.1, 0.1, 0.1, 0xff9a1f, s * 0.15, 0.2, 0);
                add(0.04, 0.06, 0.1, 0xff9a1f, s * 0.15, 0.28, 0);
                add(0.08, 0.1, 0.02, 0xff8fd8, s * 0.15, 0.15, 0.06, false);
            }
        },
    },
    {
        id: 'pirate',
        name: L('PIRATE', 'PIRATA'),
        price: 2,
        hat(add) {
            add(0.52, 0.06, 0.34, 0x1b0b33, 0, 0.03, 0);
            add(0.32, 0.14, 0.26, 0x241640, 0, 0.13, 0);
            add(0.52, 0.12, 0.05, 0x1b0b33, 0, 0.12, 0.15);
            add(0.08, 0.07, 0.02, 0xffffff, 0, 0.13, 0.18, false);
            add(0.03, 0.02, 0.02, 0x1b0b33, -0.02, 0.135, 0.19, false);
            add(0.03, 0.02, 0.02, 0x1b0b33, 0.02, 0.135, 0.19, false);
        },
    },
    {
        id: 'viking',
        name: L('VIKING', 'VIKINGO'),
        price: 2,
        hat(add) {
            add(0.4, 0.12, 0.4, 0x9aa3b8, 0, 0.06, 0);
            add(0.3, 0.1, 0.3, 0xb7c0d4, 0, 0.16, 0);
            add(0.42, 0.04, 0.42, 0xffd23f, 0, 0.02, 0, false);
            for (const s of [-1, 1]) {
                add(0.08, 0.08, 0.08, 0xfff1d0, s * 0.24, 0.1, 0);
                add(0.07, 0.08, 0.07, 0xfff1d0, s * 0.3, 0.18, 0);
                add(0.06, 0.08, 0.06, 0xfff1d0, s * 0.32, 0.26, 0);
            }
        },
    },
    {
        id: 'propeller',
        name: L('PROPELLER', 'HÉLICE'),
        price: 2,
        hat(add) {
            add(0.36, 0.1, 0.36, 0xff3e8e, 0, 0.05, 0);
            add(0.18, 0.1, 0.36, 0x23e0d6, 0.09, 0.05, 0, false);
            add(0.38, 0.03, 0.12, 0xffe03a, 0, 0.02, 0.2, false);
            add(0.04, 0.14, 0.04, 0x1b0b33, 0, 0.16, 0, false);
            const blades = [add(0.5, 0.03, 0.08, 0xffe03a, 0, 0.24, 0), add(0.08, 0.03, 0.5, 0xff9a1f, 0, 0.24, 0)];
            return { animate: (t, moving) => blades.forEach((b) => (b.rotation.y = t * (moving ? 22 : 8))) };
        },
    },
    {
        id: 'helmet',
        name: L('ARMY HELMET', 'CASCO MILITAR'),
        price: 2,
        hat(add) {
            add(0.5, 0.12, 0.5, 0x4a6a2a, 0, 0.06, 0);
            add(0.38, 0.1, 0.38, 0x5a7a34, 0, 0.17, 0);
            add(0.54, 0.04, 0.1, 0x3a5a24, 0, 0.02, 0.26);
            add(0.38, 0.06, 0.02, 0x2a2a2a, 0, 0.09, 0.26, false);  // cinta
            for (const [x, z] of [[-0.12, -0.1], [0.14, 0.06]]) add(0.08, 0.04, 0.08, 0x3a5a24, x, 0.23, z, false); // camuflaje
        },
    },
    {
        id: 'headphones',
        name: L('HEADPHONES', 'AURICULARES'),
        price: 2,
        hat(add) {
            for (const s of [-1, 1]) {
                add(0.08, 0.2, 0.18, 0x2a2a40, s * 0.27, -0.02, 0);
                add(0.03, 0.12, 0.12, 0xff4fa3, s * 0.32, -0.02, 0, false);
                add(0.05, 0.22, 0.06, 0x2a2a40, s * 0.25, 0.13, 0);
            }
            add(0.54, 0.05, 0.08, 0x2a2a40, 0, 0.25, 0);
            add(0.3, 0.03, 0.09, 0xff4fa3, 0, 0.27, 0, false);
        },
    },
    {
        id: 'crown',
        name: L('CROWN', 'CORONA'),
        price: 3,
        hat(add) {
            add(0.36, 0.1, 0.36, 0xffd23f, 0, 0.05, 0);
            for (const [x, z] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]]) add(0.08, 0.12, 0.08, 0xffd23f, x, 0.16, z);
            add(0.07, 0.07, 0.03, 0xff3e3e, 0, 0.06, 0.18, false);
            add(0.06, 0.06, 0.03, 0x23e0d6, -0.12, 0.06, 0.18, false);
            add(0.06, 0.06, 0.03, 0x23e0d6, 0.12, 0.06, 0.18, false);
        },
    },
    {
        id: 'wizard',
        name: L('WIZARD', 'MAGO'),
        price: 3,
        hat(add) {
            add(0.58, 0.04, 0.58, 0x5a3ad6, 0, 0.02, 0);
            [[0.34, 0.1], [0.26, 0.22], [0.18, 0.34], [0.11, 0.46]].forEach(([w, y], i) => add(w, 0.12, w, 0x7b5cff, i * 0.015, y, -i * 0.02));
            add(0.07, 0.07, 0.07, 0xffe03a, 0.06, 0.55, -0.06);
            for (const [x, y, z] of [[-0.12, 0.14, 0.17], [0.1, 0.27, 0.13], [-0.05, 0.36, 0.1]]) add(0.05, 0.05, 0.02, 0xffe03a, x, y, z, false);
        },
    },
    {
        id: 'santa',
        name: L('SANTA HAT', 'GORRO DE NAVIDAD'),
        price: 3,
        hat(add) {
            add(0.46, 0.08, 0.46, 0xffffff, 0, 0.04, 0);
            add(0.36, 0.14, 0.36, 0xff2a3a, 0, 0.15, 0);
            add(0.24, 0.12, 0.24, 0xff2a3a, 0.03, 0.27, -0.04);
            add(0.14, 0.1, 0.14, 0xff2a3a, 0.1, 0.33, -0.12);
            add(0.13, 0.13, 0.13, 0xffffff, 0.18, 0.31, -0.2);
        },
    },
    {
        id: 'flowers',
        name: L('FLOWER CROWN', 'CORONA DE FLORES'),
        price: 3,
        hat(add) {
            for (const [w, d, x, z] of [[0.46, 0.06, 0, -0.2], [0.46, 0.06, 0, 0.2], [0.06, 0.46, -0.2, 0], [0.06, 0.46, 0.2, 0]]) add(w, 0.05, d, 0x3fbf4a, x, 0.03, z, false);
            const cols = [0xff4fa3, 0xffe03a, 0xffffff, 0xb46bff, 0xff9a1f, 0x6ff6ff];
            cols.forEach((c, i) => {
                const a = (i / cols.length) * Math.PI * 2;
                add(0.11, 0.08, 0.11, c, Math.sin(a) * 0.2, 0.08, Math.cos(a) * 0.2);
                add(0.04, 0.03, 0.04, 0xffd23f, Math.sin(a) * 0.2, 0.13, Math.cos(a) * 0.2, false);
            });
        },
    },
    {
        id: 'unicorn',
        name: L('UNICORN HORN', 'CUERNO DE UNICORNIO'),
        price: 3,
        hat(add) {
            add(0.42, 0.06, 0.42, 0xffffff, 0, 0.03, 0);
            const cols = [0xff3e8e, 0xffe03a, 0x23e0d6, 0xb46bff];
            [0.16, 0.12, 0.09, 0.06].forEach((w, i) => add(w, 0.1, w, cols[i], 0, 0.11 + i * 0.1, 0.06, i === 0));
            for (const s of [-1, 1]) add(0.08, 0.1, 0.06, 0xffffff, s * 0.17, 0.1, -0.04);
            const mane = [0xff8fd8, 0x9af6ff, 0xffe680].map((c, i) => add(0.08, 0.08, 0.1, c, 0, 0.1 - i * 0.03, -0.2 - i * 0.07, false));
            return { animate: (t) => mane.forEach((m, i) => (m.position.x = Math.sin(t * 5 + i) * 0.03)) };
        },
    },
    // ---------- Trofeos de los jefes (modo difícil) ----------
    {
        id: 'h_w1', boss: 'w1',
        name: L('FARMER HAT', 'SOMBRERO DE PAJA'),
        hat(add) {
            add(0.6, 0.04, 0.6, 0xffd86b, 0, 0.02, 0);
            add(0.3, 0.16, 0.3, 0xffd86b, 0, 0.12, 0);
            add(0.31, 0.05, 0.31, 0xff3e3e, 0, 0.07, 0, false);
            for (const [x, z] of [[-0.2, 0.22], [0.24, -0.1], [-0.25, -0.2]]) add(0.06, 0.02, 0.06, 0xd6a842, x, 0.045, z, false);
            add(0.03, 0.18, 0.03, 0xd6a842, 0.08, 0.26, 0.04, false); // espiga
            add(0.06, 0.06, 0.06, 0xffe680, 0.08, 0.37, 0.04, false);
        },
    },
    {
        id: 'h_w2', boss: 'w2',
        name: L('CRAB HAT', 'GORRO CANGREJO'),
        hat(add) {
            add(0.36, 0.12, 0.32, 0xff5a3c, 0, 0.06, 0);
            add(0.26, 0.06, 0.22, 0xffb08a, 0, 0.15, 0);
            const eyes = [];
            for (const s of [-1, 1]) {
                add(0.04, 0.16, 0.04, 0xff5a3c, s * 0.08, 0.26, 0.08, false);
                eyes.push(add(0.1, 0.1, 0.1, 0xffffff, s * 0.08, 0.38, 0.08));
                add(0.04, 0.04, 0.02, 0x1b0b33, s * 0.08, 0.38, 0.135, false);
                add(0.12, 0.08, 0.1, 0xff5a3c, s * 0.24, 0.08, 0.1);   // pinzas
                add(0.06, 0.06, 0.08, 0xffb08a, s * 0.28, 0.14, 0.17);
            }
            return { animate: (t) => eyes.forEach((e, i) => (e.position.y = 0.38 + Math.sin(t * 5 + i * 2) * 0.02)) };
        },
    },
    {
        id: 'h_w3', boss: 'w3',
        name: L('STINGER', 'AGUIJÓN'),
        hat(add) {
            add(0.3, 0.08, 0.3, 0x4a2f7a, 0, 0.04, 0);
            add(0.12, 0.12, 0.12, 0x4a2f7a, 0, 0.14, -0.1);
            add(0.11, 0.12, 0.11, 0x4a2f7a, 0, 0.26, -0.14);
            add(0.1, 0.12, 0.1, 0x4a2f7a, 0, 0.38, -0.08);
            add(0.1, 0.1, 0.12, 0xffb03a, 0, 0.44, 0.04);
            add(0.04, 0.04, 0.08, 0xff3e3e, 0, 0.41, 0.13, false);
        },
    },
    {
        id: 'h_w4', boss: 'w4',
        name: L('CUPCAKE', 'MAGDALENA'),
        hat(add) {
            add(0.36, 0.1, 0.36, 0xc47a3a, 0, 0.05, 0);
            for (const x of [-0.12, 0, 0.12]) add(0.04, 0.1, 0.37, 0xa8642e, x, 0.05, 0, false);
            add(0.42, 0.08, 0.42, 0xff8fd8, 0, 0.14, 0);
            add(0.3, 0.08, 0.3, 0xffc6ec, 0, 0.22, 0);
            add(0.14, 0.14, 0.14, 0xff2a4a, 0, 0.33, 0);
            add(0.03, 0.12, 0.03, 0x3fbf4a, 0.03, 0.45, 0, false);
            const sprinkles = [0xffe03a, 0x23e0d6, 0xffffff, 0x7b5cff];
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                add(0.05, 0.03, 0.03, sprinkles[i % 4], Math.sin(a) * 0.16, 0.185, Math.cos(a) * 0.16, false);
            }
        },
    },
    {
        id: 'h_w5', boss: 'w5',
        name: L('SNOWMAN', 'MUÑECO DE NIEVE'),
        hat(add) {
            add(0.32, 0.26, 0.3, 0xffffff, 0, 0.13, 0);
            for (const s of [-1, 1]) add(0.05, 0.05, 0.02, 0x1b1f4a, s * 0.07, 0.17, 0.155, false);
            add(0.05, 0.05, 0.14, 0xff9a1f, 0, 0.12, 0.2, false);       // zanahoria
            add(0.36, 0.04, 0.34, 0x1b1f4a, 0, 0.28, 0);                // chistera
            add(0.22, 0.18, 0.22, 0x1b1f4a, 0, 0.38, 0);
            add(0.23, 0.04, 0.23, 0x2a6aff, 0, 0.32, 0, false);
        },
    },
    {
        id: 'h_w6', boss: 'w6',
        name: L('POLICE CAP', 'GORRA DE POLICÍA'),
        hat(add) {
            add(0.36, 0.12, 0.34, 0x2a3a8a, 0, 0.06, 0);
            add(0.4, 0.06, 0.38, 0x1a2a6a, 0, 0.15, 0);
            add(0.36, 0.03, 0.14, 0x15152a, 0, 0.02, 0.2);              // visera
            add(0.08, 0.08, 0.02, 0xffd23f, 0, 0.1, 0.18, false);       // placa
            const red = add(0.08, 0.07, 0.08, 0xff2a4a, -0.05, 0.22, 0, false);
            const blue = add(0.08, 0.07, 0.08, 0x2a6aff, 0.05, 0.22, 0, false);
            return {
                animate: (t) => {
                    const on = Math.floor(t * 5) % 2 === 0;
                    red.visible = on;
                    blue.visible = !on;
                },
            };
        },
    },
    {
        id: 'h_w7', boss: 'w7',
        name: L('MINI VOLCANO', 'MINIVOLCÁN'),
        hat(add) {
            add(0.36, 0.12, 0.36, 0x3a2a30, 0, 0.06, 0);
            add(0.26, 0.12, 0.26, 0x3a2a30, 0, 0.18, 0);
            add(0.16, 0.06, 0.16, 0x4a3a40, 0, 0.27, 0);
            add(0.1, 0.03, 0.1, 0xffd23f, 0, 0.3, 0, false);
            for (const s of [-1, 1]) add(0.03, 0.1, 0.03, 0xff5a1f, s * 0.1, 0.17, 0.13, false);
            const blob = add(0.06, 0.06, 0.06, 0xff9a1f, 0, 0.36, 0, false);
            return { animate: (t) => (blob.position.y = 0.34 + Math.abs(Math.sin(t * 3)) * 0.14) };
        },
    },
    {
        id: 'h_w8', boss: 'w8',
        name: L('ALIEN ANTENNAE', 'ANTENAS MARCIANAS'),
        hat(add) {
            add(0.42, 0.06, 0.06, 0x7dff4a, 0, 0.03, 0);                 // diadema
            const tips = [];
            for (const s of [-1, 1]) {
                add(0.04, 0.26, 0.04, 0x7dff4a, s * 0.16, 0.18, 0, false);
                tips.push(add(0.1, 0.1, 0.1, 0x2ef2ff, s * 0.16, 0.34, 0));
            }
            return { animate: (t) => tips.forEach((b, i) => (b.position.y = 0.34 + Math.sin(t * 4 + i * Math.PI) * 0.03)) };
        },
    },
    {
        id: 'h_secret', boss: 'secret',
        name: L('PRISM CROWN', 'CORONA PRISMÁTICA'),
        hat(add) {
            add(0.38, 0.08, 0.38, 0xffffff, 0, 0.04, 0);
            const cols = [0xff3e5e, 0xffe03a, 0x7dff4a, 0x23e0d6, 0x7b5cff];
            const gems = cols.map((c, i) => {
                const a = (i / cols.length) * Math.PI * 2;
                return add(0.08, 0.16 + (i % 2) * 0.08, 0.08, c, Math.sin(a) * 0.13, 0.16 + (i % 2) * 0.04, Math.cos(a) * 0.13);
            });
            return { animate: (t) => gems.forEach((g, i) => (g.position.y = 0.17 + (i % 2) * 0.04 + Math.sin(t * 3 + i) * 0.02)) };
        },
    },
    // ---------- El último y el más caro: el tanque dorado ----------
    {
        id: 'gold',
        name: L('GOLDEN TANK', 'TANQUE DORADO'),
        price: 999,
        gold: true,
        palette: { body: 0xffc21a, accent: 0xfff2a0, tread: 0x9a6200, barrel: 0xffe680, bullet: 0xffe680 },
    },
];

export const SKIN_BY_ID = Object.fromEntries(SKINS.map((s) => [s.id, s]));
export const GOLD_SPARKS = [0xffe680, 0xffffff, 0xffc21a, 0xfff2a0];

// Pinturas: colores del tanque (el tanque dorado las tapa con su oro).
export const PAINTS = [
    { id: 'p_default', name: L('SPARK', 'CHISPA'), price: 0, palette: null },
    { id: 'p_fire', name: L('FIRE', 'FUEGO'), price: 1, palette: { body: 0xff3e3e, accent: 0xffd23f, tread: 0x3a1010, bullet: 0xffb08a } },
    { id: 'p_forest', name: L('FOREST', 'BOSQUE'), price: 1, palette: { body: 0x5a9a3a, accent: 0xd8c46a, tread: 0x2a3a1a, bullet: 0xd8ff8a } },
    { id: 'p_lemon', name: L('LEMON', 'LIMÓN'), price: 1, palette: { body: 0xffe03a, accent: 0x2a2a40, tread: 0x3a3a1a, bullet: 0xfff6a0 } },
    { id: 'p_mint', name: L('MINT', 'MENTA'), price: 1, palette: { body: 0x7dffc8, accent: 0xffffff, tread: 0x1f6a5a, bullet: 0xc8fff0 } },
    { id: 'p_ocean', name: L('OCEAN', 'OCÉANO'), price: 1, palette: { body: 0x2a8bff, accent: 0x9af6ff, tread: 0x10284a, bullet: 0x9af6ff } },
    { id: 'p_night', name: L('NIGHT', 'NOCHE'), price: 2, palette: { body: 0x3a2a6a, accent: 0xb46bff, tread: 0x0e0a1c, barrel: 0xd0dcff, bullet: 0xd6b0ff } },
    { id: 'p_bubble', name: L('BUBBLEGUM', 'CHICLE'), price: 2, palette: { body: 0xff8fd8, accent: 0x6ff6ff, tread: 0x6a2a5a, bullet: 0xffc6ec } },
    { id: 'p_snow', name: L('GLACIER', 'GLACIAR'), price: 2, palette: { body: 0xf4f8ff, accent: 0x2a8bff, tread: 0x3a4a6a, bullet: 0x9af6ff } },
    { id: 'p_grape', name: L('GRAPE', 'UVA'), price: 2, palette: { body: 0x9a4aff, accent: 0x7dff4a, tread: 0x2a1048, bullet: 0xd0a8ff } },
    { id: 'p_cherry', name: L('CHERRY', 'CEREZA'), price: 2, palette: { body: 0xe8203a, accent: 0xffffff, tread: 0x4a0a14, barrel: 0xfff0f0, bullet: 0xff8fa8 } },
    { id: 'p_camo', name: L('CAMO', 'CAMUFLAJE'), price: 3, palette: { body: 0x6a7a3a, accent: 0x3a4a1a, tread: 0x2a2a1a, barrel: 0x8a8a5a, bullet: 0xd8e08a } },
    { id: 'p_sunset', name: L('SUNSET', 'ATARDECER'), price: 3, palette: { body: 0xff7a3c, accent: 0xb04bff, tread: 0x4a1a3a, barrel: 0xffd23f, bullet: 0xffb36a } },
    { id: 'p_tiger', name: L('TIGER', 'TIGRE'), price: 3, palette: { body: 0xff9a1f, accent: 0x1b0b33, tread: 0x1b0b33, barrel: 0xfff1d0, bullet: 0xffd08a } },
    { id: 'p_chrome', name: L('CHROME', 'CROMO'), price: 3, palette: { body: 0xd0d8e8, accent: 0x6a7490, tread: 0x2a2e3a, barrel: 0xffffff, bullet: 0xe8f0ff } },
    { id: 'p_galaxy', name: L('GALAXY', 'GALAXIA'), price: 3, palette: { body: 0x1a1a5a, accent: 0xff4fd8, tread: 0x0a0a20, barrel: 0x6ff6ff, bullet: 0xff9af0 } },
    // Trofeos de los jefes (modo difícil): sus colores
    { id: 'p_w1', boss: 'w1', name: L('TRACTOR', 'TRACTOR'), palette: { body: 0x3fbf4a, accent: 0xffd86b, tread: 0x2a2a2a, barrel: 0x9a9aac, bullet: 0xd8ff8a } },
    { id: 'p_w2', boss: 'w2', name: L('CORAL', 'CORAL'), palette: { body: 0xff5a3c, accent: 0xffb08a, tread: 0x6a1a10, bullet: 0xffb08a } },
    { id: 'p_w3', boss: 'w3', name: L('VENOM', 'VENENO'), palette: { body: 0x4a2f7a, accent: 0xffb03a, tread: 0x1a0f2a, bullet: 0xffd08a } },
    { id: 'p_w4', boss: 'w4', name: L('FROSTING', 'GLASEADO'), palette: { body: 0xffc6ec, accent: 0xff2a4a, tread: 0xa8642e, barrel: 0xffffff, bullet: 0xff8fd8 } },
    { id: 'p_w5', boss: 'w5', name: L('BLIZZARD', 'VENTISCA'), palette: { body: 0xffffff, accent: 0x2a6aff, tread: 0x1b1f4a, bullet: 0xcff6ff } },
    { id: 'p_w6', boss: 'w6', name: L('PATROL', 'PATRULLA'), palette: { body: 0x2a3a8a, accent: 0x2ef2ff, tread: 0x15152a, barrel: 0xd0dcff, bullet: 0x8afcff } },
    { id: 'p_w7', boss: 'w7', name: L('MAGMA', 'MAGMA'), palette: { body: 0x3a2a30, accent: 0xff5a1f, tread: 0x1a1014, barrel: 0x6e5a6c, bullet: 0xffb03a } },
    { id: 'p_w8', boss: 'w8', name: L('MARTIAN', 'MARCIANO'), palette: { body: 0x7dff4a, accent: 0xd0dcff, tread: 0x1a1a3a, barrel: 0x9af6ff, bullet: 0xb0ff8a } },
    { id: 'p_secret', boss: 'secret', name: L('OPAL', 'ÓPALO'), palette: { body: 0xf4f0ff, accent: 0xff8fd8, tread: 0x5a3aa8, barrel: 0x9af6ff, bullet: 0xffffff } },
];

// Estelas: el rastro que dejan tus balas (las de fuego y rebote mantienen el suyo).
export const TRAILS = [
    { id: 't_default', name: L('NORMAL', 'NORMAL'), price: 0, style: null },
    { id: 't_smoke', name: L('SMOKE', 'HUMO'), price: 1, style: 'smoke' },
    { id: 't_bubbles', name: L('BUBBLES', 'BURBUJAS'), price: 1, style: 'bubbles' },
    { id: 't_leaves', name: L('LEAVES', 'HOJAS'), price: 1, style: 'leaves' },
    { id: 't_snow', name: L('SNOWFALL', 'NEVADA'), price: 1, style: 'snow' },
    { id: 't_confetti', name: L('CONFETTI', 'CONFETI'), price: 1, style: 'confetti' },
    { id: 't_stars', name: L('STARS', 'ESTRELLAS'), price: 2, style: 'stars' },
    { id: 't_hearts', name: L('HEARTS', 'CORAZONES'), price: 2, style: 'hearts' },
    { id: 't_petals', name: L('PETALS', 'PÉTALOS'), price: 2, style: 'petals' },
    { id: 't_notes', name: L('MUSIC', 'MÚSICA'), price: 2, style: 'notes' },
    { id: 't_fire', name: L('BLAZE', 'LLAMARADA'), price: 2, style: 'fire' },
    { id: 't_rainbow', name: L('RAINBOW', 'ARCOÍRIS'), price: 3, style: 'rainbow' },
    { id: 't_electric', name: L('ELECTRIC', 'ELÉCTRICA'), price: 3, style: 'electric' },
    { id: 't_shadow', name: L('SHADOW', 'SOMBRA'), price: 3, style: 'shadow' },
    { id: 't_pixels', name: L('GLITCH', 'GLITCH'), price: 3, style: 'pixels' },
    { id: 't_coins', name: L('GOLD RUSH', 'FIEBRE DEL ORO'), price: 3, style: 'coins' },
];

export const PAINT_BY_ID = Object.fromEntries(PAINTS.map((p) => [p.id, p]));
export const TRAIL_BY_ID = Object.fromEntries(TRAILS.map((t) => [t.id, t]));

// Trofeos de los jefes: id del objeto -> id del jefe que hay que vencer en modo difícil
export const BOSS_REWARDS = Object.fromEntries([...SKINS, ...PAINTS].filter((x) => x.boss).map((x) => [x.id, x.boss]));
