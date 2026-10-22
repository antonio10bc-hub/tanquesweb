// Skins del tanque del jugador. Se compran con monedas de oro en "Mi Tanque".
// Los gorros se construyen con cubos encima de la torreta: add(w, h, d, color, x, y, z, outlined)
// con y = 0 en la tapa de la torreta. Un gorro puede devolver piezas a animar.
// "gold" convierte el tanque entero en oro, con aura y partículas.
export const SKINS = [
    {
        id: 'none',
        name: 'SIN GORRO',
        price: 0,
    },
    {
        id: 'party',
        name: 'GORRO DE FIESTA',
        price: 1,
        hat(add) {
            const c = [0xff3e8e, 0xffe03a, 0x23e0d6, 0xff3e8e];
            [0.3, 0.23, 0.16, 0.1].forEach((w, i) => add(w, 0.1, w, c[i], 0, 0.05 + i * 0.1, 0, i === 0));
            add(0.1, 0.1, 0.1, 0xffffff, 0, 0.47, 0);
        },
    },
    {
        id: 'tophat',
        name: 'CHISTERA',
        price: 1,
        hat(add) {
            add(0.46, 0.05, 0.46, 0x1b0b33, 0, 0.025, 0);
            add(0.28, 0.32, 0.28, 0x2a1d4a, 0, 0.21, 0);
            add(0.29, 0.06, 0.29, 0xff3e3e, 0, 0.09, 0, false);
        },
    },
    {
        id: 'crown',
        name: 'CORONA',
        price: 1,
        hat(add) {
            add(0.36, 0.1, 0.36, 0xffd23f, 0, 0.05, 0);
            for (const [x, z] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]]) add(0.08, 0.12, 0.08, 0xffd23f, x, 0.16, z);
            add(0.07, 0.07, 0.03, 0xff3e3e, 0, 0.06, 0.18, false);
            add(0.06, 0.06, 0.03, 0x23e0d6, -0.12, 0.06, 0.18, false);
            add(0.06, 0.06, 0.03, 0x23e0d6, 0.12, 0.06, 0.18, false);
        },
    },
    {
        id: 'pirate',
        name: 'PIRATA',
        price: 1,
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
        id: 'cowboy',
        name: 'VAQUERO',
        price: 1,
        hat(add) {
            add(0.6, 0.04, 0.46, 0xa8642e, 0, 0.03, 0);
            for (const x of [-0.27, 0.27]) add(0.06, 0.1, 0.46, 0xa8642e, x, 0.08, 0, false);
            add(0.3, 0.18, 0.26, 0xc47a3a, 0, 0.13, 0);
            add(0.31, 0.04, 0.27, 0x3b2214, 0, 0.07, 0, false);
        },
    },
    {
        id: 'viking',
        name: 'VIKINGO',
        price: 1,
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
        id: 'chef',
        name: 'CHEF',
        price: 1,
        hat(add) {
            add(0.34, 0.1, 0.34, 0xffffff, 0, 0.05, 0);
            add(0.42, 0.16, 0.42, 0xf4f6ff, 0, 0.18, 0);
            for (const [x, z] of [[-0.12, 0], [0.12, 0], [0, 0.1]]) add(0.2, 0.14, 0.2, 0xffffff, x, 0.3, z);
        },
    },
    {
        id: 'propeller',
        name: 'HÉLICE',
        price: 1,
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
        id: 'gold',
        name: 'TANQUE DORADO',
        price: 1,
        gold: true,
        palette: { body: 0xffc21a, accent: 0xfff2a0, tread: 0x9a6200, barrel: 0xffe680, bullet: 0xffe680 },
    },
];

export const SKIN_BY_ID = Object.fromEntries(SKINS.map((s) => [s.id, s]));
export const GOLD_SPARKS = [0xffe680, 0xffffff, 0xffc21a, 0xfff2a0];
