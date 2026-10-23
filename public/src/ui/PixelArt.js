// Sprites pixelados de la interfaz (moneda, trofeo, destellos), dibujados píxel a píxel
// para que la UI tenga el mismo aspecto que el juego. Se pintan en canvas pequeños y se
// escalan con image-rendering: pixelated, nunca suavizados.

const INK = '#1b0b33';
const GOLD = { dark: '#c77800', mid: '#e6a400', base: '#ffd23f', light: '#fff4b0' };

// Un fotograma de la moneda girando: `half` es la media anchura (7 de frente, 1 de canto).
export function drawCoin(ctx, half) {
    const S = 16, c = (S - 1) / 2, rx = half + 0.9, ry = 7.9;
    ctx.clearRect(0, 0, S, S);
    const inside = (x, y) => x >= 0 && y >= 0 && x < S && y < S &&
        ((x - c) / rx) ** 2 + ((y - c) / ry) ** 2 <= 1;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        if (!inside(x, y)) continue;
        const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        let col;
        if (edge) col = INK;
        else if (half <= 1) col = y < 5 ? GOLD.light : GOLD.mid;          // de canto
        else {
            const nx = (x - c) / rx, ny = (y - c) / ry, d = nx * nx + ny * ny;
            const light = nx + ny < -0.75, dark = nx + ny > 0.7;          // luz arriba a la izquierda
            if (half >= 5 && d > 0.22 && d < 0.42) col = GOLD.mid;       // aro interior
            else if (dark) col = GOLD.dark;
            else if (light) col = GOLD.light;
            else col = GOLD.base;
        }
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
    }
}
export const COIN_SPIN = [7, 6, 4, 1, 4, 6];

const SPRITES = {
    trophy: {
        rows: [
            '.KKKKKKKKKK.',
            'KK.KYYYYYK.K',
            'K..KWYYYOK.K',
            'K..KWYYYOK.K',
            '.K.KYYYYOK.K',
            '..KKYYYOOKK.',
            '....KYYOK...',
            '.....KOK....',
            '.....KOK....',
            '....KYYOK...',
            '...KKKKKKK..',
            '...KOOOOOK..',
            '...KKKKKKK..',
        ],
        pal: { K: INK, Y: '#ffd23f', O: '#e6a400', W: '#fff4b0' },
    },
    starOn: {
        rows: ['.....K.....', '....KYK....', '....KYK....', 'KKKKKWYKKKK', 'KYYYYWYYYYK', '.KYYYYYYYK.', '..KYYYYYK..',
            '..KYYKYYK..', '.KYYK.KYYK.', '.KYK...KYK.', '.KK.....KK.'],
        pal: { K: INK, Y: '#ffd23f', W: '#fff4b0' },
    },
    starOff: {
        rows: ['.....K.....', '....KYK....', '....KYK....', 'KKKKKYYKKKK', 'KYYYYYYYYYK', '.KYYYYYYYK.', '..KYYYYYK..',
            '..KYYKYYK..', '.KYYK.KYYK.', '.KYK...KYK.', '.KK.....KK.'],
        pal: { K: INK, Y: '#3b2d6b' },
    },
    skull: {
        rows: ['..KKKKKKKK..', '.KWWWWWWWWK.', 'KWWWWWWWWWWK', 'KWRRKWWKRRWK', 'KWRRKWWKRRWK', 'KWWWWKKWWWWK',
            '.KWWWWWWWWK.', '..KWKWKWKK..', '..KWKWKWKK..', '...KKKKKK...'],
        pal: { K: INK, W: '#ffffff', R: '#ff1a3a' },
    },
    // Casita del botón de volver (Ajustes)
    home: {
        rows: ['.....KK.....', '....KRRK....', '...KRRRRK.KK', '..KRRRRRRKWK', '.KRRRRRRRRKK', 'KKKKKKKKKKKK', '.KWWWWWWWWK.', '.KWKKWWWWWK.', '.KWKBKWKKWK.', '.KWKKWWKNWK.', '.KWWWWWKNWK.', '.KKKKKKKKKK.'],
        pal: { K: INK, R: '#ff3e5e', W: '#fff6e8', B: '#6ff6ff', N: '#b8763a' },
    },
    // Mejoras de supervivencia (vida, recarga, daño, velocidad)
    upHeart: {
        rows: ['............', '..KK....KK..', '.KRRK..KRRK.', 'KRWRRKKRRRRK', 'KRWRRRRRRRRK', 'KRRRRRRRRRRK', '.KRRRRRRRRK.', '..KRRRRRRK..', '...KRRRRK...', '....KRRK....', '.....KK.....', '............'],
        pal: { K: INK, R: '#ff3e5e', W: '#ffd0d8' },
    },
    upReload: {
        rows: ['............', '.KK..KK..KK.', 'KYYKKYYKKYYK', 'KYYKKYYKKYYK', 'KOOKKOOKKOOK', 'KOOKKOOKKOOK', 'KOOKKOOKKOOK', 'KKKKKKKKKKKK', '........K...', 'KKKKKKKKWK..', 'KWWWWWWWWWK.', 'KKKKKKKKWK..'],
        pal: { K: INK, Y: '#ffd23f', O: '#e6a400', W: '#ffffff' },
    },
    upDamage: {
        rows: ['.....K......', '....KOK.....', '....KOOK.K..', '...KOOYOKOK.', '..KOOYYOOOK.', '.KOOYYWYOOK.', '.KOYYWWYYOK.', '.KOYYWWYYOK.', '.KOOYYYYOOK.', '..KOOOOOOK..', '...KKKKKK...', '............'],
        pal: { K: INK, O: '#ff6a00', Y: '#ffd23f', W: '#ffffff' },
    },
    upSpeed: {
        rows: ['............', '.KK...KK....', '.KCK..KCK...', '..KCK..KCK..', '...KCK..KCK.', '....KCK..KCK', '....KCK..KCK', '...KCK..KCK.', '..KCK..KCK..', '.KCK..KCK...', '.KK...KK....', '............'],
        pal: { K: INK, C: '#23e0d6' },
    },
    sparkA: {
        rows: ['...W...', '...W...', '...Y...', 'WWYWYWW', '...Y...', '...W...', '...W...'],
        pal: { W: '#ffffff', Y: '#ffe03a' },
    },
    sparkB: {
        rows: ['.......', '.......', '...Y...', '..YWY..', '...Y...', '.......', '.......'],
        pal: { W: '#ffffff', Y: '#ffe03a' },
    },
};

function spriteUrl({ rows, pal }) {
    const cv = document.createElement('canvas');
    cv.width = rows[0].length;
    cv.height = rows.length;
    const ctx = cv.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
        if (!pal[ch]) return;
        ctx.fillStyle = pal[ch];
        ctx.fillRect(x, y, 1, 1);
    }));
    return `url(${cv.toDataURL()})`;
}

// Deja los sprites como variables CSS (--px-coin, --px-trophy...) para usarlos en el CSS.
export function installPixelSprites() {
    const root = document.documentElement.style;
    const cv = Object.assign(document.createElement('canvas'), { width: 16, height: 16 });
    drawCoin(cv.getContext('2d'), 7);
    root.setProperty('--px-coin', `url(${cv.toDataURL()})`);
    for (const [name, def] of Object.entries(SPRITES)) {
        root.setProperty(`--px-${name.replace(/[A-Z]/, (m) => '-' + m.toLowerCase())}`, spriteUrl(def));
    }
}
