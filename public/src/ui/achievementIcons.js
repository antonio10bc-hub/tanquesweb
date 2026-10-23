// Iconos pixelados de los logros (12x12, se escalan sin suavizar). Cada uno hace referencia a
// su hazaña y va sobre una placa de su color ("bg"). K es siempre el contorno.
const INK = '#1b0b33';
const P = {
    W: '#ffffff', Y: '#ffd23f', O: '#ff9a1f', o: '#c77800', R: '#ff3e5e', P: '#ff4fd8', p: '#ffb3f0',
    G: '#3fbf4a', g: '#8af06a', B: '#2a8bff', b: '#9af6ff', C: '#23e0d6', D: '#4a4a6a', d: '#2a2a40',
    N: '#b8763a', n: '#7a4824', V: '#7b5cff',
};

export const ACHIEVEMENT_ICONS = {
    first_win: { bg: '#23e0d6', rows: [
        '..K.........', '..KKKKKKKK..', '..KRRRRRRK..', '..KRRWRRRK..', '..KRRRRRRK..', '..KKKKKKKK..',
        '..K.........', '..K.........', '..K.........', '..K.........', '.KKK........', 'KKKKK.......'] },
    untouched: { bg: '#9af6ff', rows: [
        '.KKKKKKKKKK.', 'KBBBBBBBBBBK', 'KBWWBBBBBBBK', 'KBWBBBBBBBBK', 'KBBBBBBBBBBK', 'KBBBBBBBBBBK',
        '.KBBBBBBBBK.', '.KBBBBBBBBK.', '..KBBBBBBK..', '...KBBBBK...', '....KBBK....', '.....KK.....'] },
    clutch: { bg: '#ffb3f0', rows: [
        '............', '.KKK....KKK.', 'KRRRK..KRRRK', 'KRWRRKKRRRRK', 'KRRRRRKRRRRK', 'KRRRRKRRRRRK',
        '.KRRRRKRRRK.', '..KRRKRRRK..', '...KRRKRK...', '....KRRK....', '.....KK.....', '............'] },
    streak3: { bg: '#ff9a1f', rows: [
        '.....K......', '....KOK.....', '....KOOK....', '...KOOOK.K..', '..KOOYOOKOK.', '..KOOYYOOOK.',
        '.KOOYYYYOOK.', '.KOYYWWYYOK.', '.KOYWWWWYOK.', '.KOYYWWYYOK.', '..KOOYYOOK..', '...KKKKKK...'] },
    nuke_kill: { bg: '#ffe03a', rows: [
        '........Y.Y.', '.......K.Y..', '......K.Y.Y.', '...KKKK.....', '..KDDDDK....', '.KDWDDDDK...',
        '.KDWDDDDK...', '.KYYYYYYK...', '.KDDDDDDK...', '..KDDDDK....', '...KKKK.....', '............'] },
    bounce_kill: { bg: '#b46bff', rows: [
        '............', '........KKK.', '.......KPPPK', '.W.W..KPWPPK', '......KPPPPK', '..W.W.KPPPPK',
        '.......KPPK.', '...W.W..KK..', '............', '.KKKKKKKKKK.', '.KDDDDDDDDK.', '.KKKKKKKKKK.'] },
    bush_kill: { bg: '#8af06a', rows: [
        '............', '....KKKK....', '..KKGGGGKK..', '.KGGgGGGGGK.', '.KGgGGGGgGK.', 'KGGWKGGWKGGK',
        'KGGWKGGWKGGK', 'KGgGGGGGGgGK', 'KGGGGgGGGGGK', '.KGGGGGGGGK.', '..KKKKKKKK..', '............'] },
    demolisher: { bg: '#ffd86b', rows: [
        'KKKKKKKKKKKK', 'KNNNNNNNNNNK', 'KNKKKKKKKKNK', 'KNKNNNKNNKNK', 'KNKNNKNNNKNK', 'KNKNKNNKNKNK',
        'KNKNNNKNNKNK', 'KNKNNKNNNKNK', 'KNKKKKKKKKNK', 'KNNNNNNNNNNK', 'KKKKKKKKKKKK', '............'] },
    collector: { bg: '#ffffff', rows: [
        'KKKKK.KKKKK.', 'KGGGK.KOOOK.', 'KGWGK.KOYOK.', 'KGGGK.KOOOK.', 'KKKKK.KKKKK.', '............',
        'KKKKK.KKKKK.', 'KBBBK.KPPPK.', 'KBWBK.KPWPK.', 'KBBBK.KPPPK.', 'KKKKK.KKKKK.', '............'] },
    wave5: { bg: '#9af6ff', rows: [
        '............', '.....KKKK...', '...KKWWWWK..', '..KWWBBBBWK.', '.KWBBKKKBBK.', '.KBBK...KK..',
        'KBBBK.......', 'KBBBBK...KK.', 'KBBBBBKKKBK.', '.KBBBBBBBBK.', 'KBBBBBBBBBBK', 'KKKKKKKKKKKK'] },
    wave10: { bg: '#7b5cff', rows: [
        '......KKKK..', '.....KYYYK..', '....KYYYK...', '...KYYYK....', '..KYYYYKKK..', '.KYYYYYYYK..',
        '.KKKKYYYK...', '....KYYK....', '...KYYK.....', '...KYK......', '..KYK.......', '..KK........'] },
    rich: { bg: '#ff9a1f', rows: [
        '............', '....KKKK....', '...KYYYYK...', '...KWYYoK...', '...KYYYoK...', '....KKKK....',
        '.KKKK.KKKK..', 'KYYYYKYYYYK.', 'KWYYoKWYYoK.', 'KYYYoKYYYoK.', '.KKKK.KKKK..', '............'] },
    fashion: { bg: '#ff8fd8', rows: [
        '............', '...KKKKKK...', '...KDDDDK...', '...KDWDDK...', '...KDDDDK...', '...KDDDDK...',
        '...KRRRRK...', '.KKKKKKKKKK.', 'KDDDDDDDDDDK', '.KKKKKKKKKK.', '............', '............'] },
    golden: { bg: '#ffe680', rows: [
        '............', '....KKKK....', '...KYYYYK...', '...KYWYYKKKK', '...KYYYYYYYK', '.KKKKKKKKKKK',
        'KYYYYYYYYYYK', 'KYWYYYYYYYYK', 'KoooooooooOK', 'KKKKKKKKKKKK', 'KdKdKdKdKdKK', '.KKKKKKKKKK.'] },
    boss1: { bg: '#ff3e5e', rows: [
        '..........KK', '.........KWK', '........KWK.', '.......KWK..', '......KWK...', '..K..KWK....',
        '..KKKWK.....', '...KYK......', '..KNKKK.....', '.KNK..K.....', 'KNK.........', 'KK..........'] },
    bosses: { bg: '#b46bff', rows: [
        '............', '............', '.K...KK...K.', 'KYK.KYYK.KYK', 'KYYKYYYYKYYK', 'KYYYYRYYYYYK',
        'KYYYRRRYYYYK', 'KYYYYRYYYYYK', 'KooooooooooK', 'KKKKKKKKKKKK', '............', '............'] },
    stars_all: { bg: '#7b5cff', rows: [
        '.....KK.....', '....KYYK....', '....KYYK....', 'KKKKYWYYKKKK', 'KYYYYWYYYYYK', '.KYYYYYYYYK.',
        '..KYYYYYYK..', '..KYYYYYYK..', '.KYYYKKYYYK.', '.KYYK..KYYK.', 'KYKK....KKYK', 'KK........KK'] },
    nightmare: { bg: '#ff2a3a', rows: [
        '..KKKKKKKK..', '.KWWWWWWWWK.', 'KWWWWWWWWWWK', 'KWKKKWWKKKWK', 'KWKKKWWKKKWK', 'KWWKWWWWKWWK',
        'KWWWWKKWWWWK', '.KWWWWWWWWK.', '..KWKWKWKK..', '..KWKWKWKK..', '...KKKKKK...', '............'] },
    pocket_prism: { bg: '#12d6e6', rows: [
        '.....KK.....', '....KWBK....', '...KWBBPK...', '..KWBBPPPK..', '.KWBBBPPPPK.', 'KWBBBBPPPPPK',
        'KBBBBBPPPPPK', '.KBBBBPPPPK.', '..KBBBPPPK..', '...KBBPPK...', '....KBPK....', '.....KK.....'] },
    prisma: { bg: 'rainbow', rows: [
        '............', '............', '...KKKKKK...', '..KRRRRRRK..', '.KRROOOORRK.', 'KROOYYYYOORK',
        'KROYGGGGYORK', 'KOYGBBBBGYOK', 'KOYGBKKBGYOK', 'KYGBK..KBGYK', 'KKKK....KKKK', '............'] },
};

const cache = new Map();

// data: URL del icono de un logro (o null si no tiene)
export function achievementIcon(id) {
    if (cache.has(id)) return cache.get(id);
    const def = ACHIEVEMENT_ICONS[id];
    if (!def) return null;
    const cv = document.createElement('canvas');
    cv.width = cv.height = 12;
    const ctx = cv.getContext('2d');
    def.rows.forEach((row, y) => [...row].forEach((ch, x) => {
        const c = ch === 'K' ? INK : P[ch];
        if (!c) return;
        ctx.fillStyle = c;
        ctx.fillRect(x, y, 1, 1);
    }));
    const url = `url(${cv.toDataURL()})`;
    cache.set(id, url);
    return url;
}

export function achievementBg(id) {
    return (ACHIEVEMENT_ICONS[id] || {}).bg || '#ffe03a';
}
