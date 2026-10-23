// Supervivencia: los enemigos de las oleadas y el mini jefe que llega cada 5 oleadas.
//
// Cada enemigo tiene un papel (cómo pelea) y una silueta propia (piezas voxel que se ven de
// lejos), y se viste con los colores y un adorno del escenario en el que estás: en la nieve
// llevan la torreta nevada, en el desierto un cactus, en caramelo una piruleta...
// Los tipos nuevos van apareciendo de uno en uno, y la primera vez se presentan con su nombre.
import { L } from '../core/I18n.js';
import { WORLDS } from './campaign.js';

// Papeles. arch: forma de pelear (cerebro + parámetros); look: piezas de su silueta.
//   part(target, w, h, d, color, x, y, z, outlined) con target 'body' | 'turret' | 'barrel'
//   y colores con nombre (body, alt, accent, dark, barrel) que pone el escenario.
export const ENEMY_TYPES = {
    grunt: {
        name: L('SOLDIER', 'SOLDADO'),
        from: 1,
        tank: { hp: 2, speed: 3.0, radius: 0.36, weapon: 'cannon' },
        tone: 'body',
        brain: 'hunter',
    },
    scout: {
        name: L('SCOUT', 'EXPLORADOR'),
        tell: L('FAST AND SLIPPERY', 'RÁPIDO Y ESCURRIDIZO'),
        from: 3,
        tank: { hp: 2, speed: 3.9, radius: 0.34, weapon: 'cannon' },
        tone: 'alt',
        brain: 'hunter',
        params: { range: [2.5, 5], burst: [1, 2] },
        // Alerón trasero
        look: (part, c) => {
            part('body', 0.62, 0.04, 0.14, c.accent, 0, 0.52, -0.36);
            for (const s of [-1, 1]) part('body', 0.04, 0.1, 0.08, c.dark, s * 0.24, 0.46, -0.36, false);
        },
    },
    sniper: {
        name: L('SNIPER', 'FRANCOTIRADOR'),
        tell: L('SHOOTS FROM AFAR: KEEP MOVING', 'DISPARA DE LEJOS: NO TE PARES'),
        from: 4,
        tank: { hp: 1, speed: 2.8, radius: 0.36, weapon: 'sniper' },
        tone: 'body',
        brain: 'hunter',
        params: { range: [6, 11], burst: [1, 1], ambush: 3 },
        // Cañón larguísimo y mira telescópica
        look: (part, c) => {
            part('barrel', 0.08, 0.08, 0.44, c.barrel, 0, 0, 0.62);
            part('barrel', 0.12, 0.12, 0.06, c.dark, 0, 0, 0.84);
            part('turret', 0.08, 0.1, 0.22, c.dark, 0.17, 0.32, -0.02);
            part('turret', 0.06, 0.06, 0.03, 0xff3e3e, 0.17, 0.32, 0.1, false);
        },
    },
    miner: {
        name: L('MINER', 'MINADOR'),
        tell: L('LEAVES MINES BEHIND: WATCH YOUR STEP', 'DEJA MINAS AL PASAR: MIRA DÓNDE PISAS'),
        from: 6,
        tank: { hp: 2, speed: 3.2, radius: 0.36, weapon: 'minerGun' },
        tone: 'alt',
        brain: 'miner',
        params: { range: [3, 6] },
        // Minas apiladas en la parte de atrás
        look: (part, c) => {
            for (const s of [-1, 1]) {
                part('body', 0.2, 0.07, 0.2, c.dark, s * 0.13, 0.47, -0.24);
                part('body', 0.06, 0.04, 0.06, 0xff3e3e, s * 0.13, 0.52, -0.24, false);
            }
        },
    },
    armored: {
        name: L('ARMORED', 'ACORAZADO'),
        tell: L('ITS SHIELD BLOCKS SHOTS: HIT IT FROM THE SIDE', 'SU ESCUDO PARA LAS BALAS: DALE POR UN LADO'),
        from: 7,
        tank: { hp: 2, speed: 2.4, radius: 0.38, weapon: 'cannon', frontArmor: true },
        tone: 'body',
        brain: 'hunter',
        params: { range: [2.5, 5], burst: [2, 3] },
        // Escudo delante de la torreta (gira con ella: apunta adonde mira)
        look: (part, c) => {
            part('turret', 0.62, 0.34, 0.07, c.dark, 0, 0.12, 0.28);
            part('turret', 0.5, 0.05, 0.08, c.accent, 0, 0.26, 0.29, false);
            for (const s of [-1, 1]) part('turret', 0.06, 0.06, 0.08, c.barrel, s * 0.22, 0.04, 0.3, false);
        },
    },
    brute: {
        name: L('BRUTE', 'BRUTO'),
        tell: L('BIG AND TOUGH', 'GRANDE Y DURO DE PELAR'),
        from: 8,
        tank: { hp: 4, speed: 2.6, radius: 0.42, weapon: 'cannon', scale: 1.18 },
        tone: 'alt',
        brain: 'hunter',
        // Hombreras de metal
        look: (part, c) => {
            for (const s of [-1, 1]) part('body', 0.16, 0.14, 0.5, c.dark, s * 0.31, 0.32, 0);
        },
    },
};

// Colores y adorno de cada escenario. El adorno va sobre la torreta, en lugar de la antena.
// Desde arriba lo que más se ve es la tapa de la torreta (accent): contrasta con el suelo del
// escenario para que se vean de lejos, y nunca es el amarillo ni el cian del jugador. En la ciudad son taxis; en el espacio, marcianos verdes.
export const THEME_LOOKS = {
    snow: {
        colors: { body: 0x2a6aff, alt: 0x7b5cff, accent: 0x1b1f4a, dark: 0x1b1f4a, barrel: 0xe8f6ff, tread: 0x1b1f4a, bullet: 0xcff6ff },
        // Montoncito de nieve con carámbanos
        deco: (part) => {
            part('turret', 0.26, 0.08, 0.22, 0xffffff, -0.08, 0.35, -0.1);
            part('turret', 0.12, 0.06, 0.1, 0xffffff, -0.06, 0.42, -0.1);
            for (const x of [-0.14, 0.02, 0.16]) part('turret', 0.05, 0.1, 0.05, 0x9fefff, x, 0.26, 0.2, false);
        },
    },
    desert: {
        colors: { body: 0xc2462a, alt: 0xe07a2a, accent: 0x5a2a14, dark: 0x3a1a0a, barrel: 0xfff0c4, tread: 0x3a1a0a, bullet: 0xffe0a0 },
        // Un cactus
        deco: (part) => {
            part('turret', 0.09, 0.26, 0.09, 0x2f9e44, 0.1, 0.44, -0.1);
            part('turret', 0.07, 0.07, 0.07, 0x2f9e44, 0.17, 0.46, -0.1);
            part('turret', 0.07, 0.12, 0.07, 0x2f9e44, 0.2, 0.52, -0.1);
        },
    },
    candy: {
        colors: { body: 0xff8fd8, alt: 0x9b4dff, accent: 0xff3e8e, dark: 0x7a2a5a, barrel: 0xffffff, tread: 0x7a2a5a, bullet: 0xffc6ec },
        // Piruleta
        deco: (part) => {
            part('turret', 0.04, 0.3, 0.04, 0xffffff, -0.12, 0.46, -0.12, false);
            part('turret', 0.22, 0.22, 0.06, 0xff3e8e, -0.12, 0.68, -0.12);
            part('turret', 0.1, 0.1, 0.07, 0xffffff, -0.12, 0.68, -0.12, false);
        },
    },
    volcano: {
        colors: { body: 0xff7a1f, alt: 0xffb03a, accent: 0xff2a1a, dark: 0x241820, barrel: 0x6e5a6c, tread: 0x241820, bullet: 0xffb03a },
        // Roca con una grieta de lava
        deco: (part) => {
            part('turret', 0.22, 0.12, 0.2, 0x241820, 0.08, 0.38, -0.1);
            part('turret', 0.1, 0.04, 0.1, 0xffd23f, 0.08, 0.45, -0.1, false);
            part('turret', 0.46, 0.02, 0.04, 0xff5a1f, 0, 0.29, 0.12, false);
        },
    },
    beach: {
        colors: { body: 0x12a6e6, alt: 0x2a6aff, accent: 0xff5a5a, dark: 0x1a4a6a, barrel: 0xfff6e8, tread: 0x1a4a6a, bullet: 0x9af6ff },
        // Sombrilla de rayas
        deco: (part) => {
            part('turret', 0.04, 0.34, 0.04, 0xffffff, -0.12, 0.48, -0.12, false);
            part('turret', 0.4, 0.05, 0.4, 0xff5a5a, -0.12, 0.66, -0.12);
            part('turret', 0.14, 0.06, 0.42, 0xffffff, -0.12, 0.66, -0.12, false);
        },
    },
    meadow: {
        colors: { body: 0xff8f3a, alt: 0x9b4dff, accent: 0xc44a3a, dark: 0x5a2a14, barrel: 0xfff6e8, tread: 0x5a2a14, bullet: 0xffd08a },
        // Una flor
        deco: (part) => {
            part('turret', 0.04, 0.24, 0.04, 0x2f9e44, -0.12, 0.42, -0.12, false);
            part('turret', 0.2, 0.06, 0.2, 0xffffff, -0.12, 0.56, -0.12);
            part('turret', 0.08, 0.08, 0.08, 0xffe03a, -0.12, 0.6, -0.12, false);
        },
    },
    city: {
        colors: { body: 0xffd23f, alt: 0xff4fa3, accent: 0xfff6e8, dark: 0x15152a, barrel: 0xd0dcff, tread: 0x15152a, bullet: 0xfff09a },
        // Sirena de policía que parpadea
        deco: (part) => {
            part('turret', 0.24, 0.04, 0.12, 0x15152a, 0, 0.33, -0.08);
            const red = part('turret', 0.1, 0.08, 0.1, 0xff2a3a, -0.06, 0.39, -0.08, false);
            const blue = part('turret', 0.1, 0.08, 0.1, 0x2a6aff, 0.06, 0.39, -0.08, false);
            return { animate: (t) => {
                const on = Math.floor(t * 5) % 2 === 0;
                red.visible = on;
                blue.visible = !on;
            } };
        },
    },
    space: {
        colors: { body: 0x7dff4a, alt: 0xff4fa3, accent: 0x2ef2ff, dark: 0x1a1a3a, barrel: 0xd0dcff, tread: 0x1a1a3a, bullet: 0xb0ff8a },
        // Cúpula de cristal con el piloto dentro
        deco: (part) => {
            part('turret', 0.28, 0.16, 0.26, 0x9fefff, 0, 0.4, -0.06);
            part('turret', 0.1, 0.1, 0.1, 0xff4fa3, 0, 0.42, -0.06, false);
        },
    },
};

// Definición del tanque de un tipo en un escenario (se pasa a World.spawn como spec.def).
export function enemyDef(typeId, themeId) {
    const type = ENEMY_TYPES[typeId];
    const look = THEME_LOOKS[themeId] || THEME_LOOKS.meadow;
    const c = look.colors;
    return {
        ...type.tank,
        name: type.name,
        type: typeId,
        palette: { body: c[type.tone], accent: c.accent, tread: c.tread, barrel: c.barrel, bullet: c.bullet },
        // La pieza puede apagarse en la animación (la sirena), así que part devuelve la malla
        deco: (part) => {
            if (type.look) type.look(part, c);
            return look.deco(part);
        },
    };
}

// Mini jefe: el jefe de la campaña del mismo escenario, en pequeño y con menos vida.
// k: cuántos mini jefes van en esta partida (1 en la oleada 5, 2 en la 10...).
export function miniBossSpec(themeId, k) {
    const w = WORLDS.find((x) => x.theme === themeId && !x.secret) || WORLDS[0];
    const def = {
        ...w.tank,
        hp: 7 + (k - 1) * 3,
        speed: w.tank.speed * 1.05,
        radius: 0.5,
        scale: 1.3,
        weapon: 'miniBossCannon',
        miniBoss: true,
    };
    const skill = { dodge: Math.min(0.15 + k * 0.05, 0.4), burst: [2, 3], every: Math.max(1, 1.35 - k * 0.1) };
    return { def, brain: 'boss', params: { attack: w.attack, ...skill }, world: w };
}

// Jefe secreto de supervivencia (oleada 25): PRISMA, el jefe final de la campaña, en pequeño
// pero con todos sus ataques prestados, y una escolta.
export const SECRET_WAVE = 25;
export function secretBossSpec() {
    const w = WORLDS.find((x) => x.secret);
    const def = { ...w.tank, hp: 22, radius: 0.52, scale: 1.4, weapon: 'miniBossCannon', miniBoss: true, secretBoss: true };
    return { def, brain: 'boss', params: { attack: w.attack, dodge: 0.35, burst: [2, 3], every: 1.05 }, world: w };
}

// Composición de la oleada n en el escenario themeId.
export function waveSpecs(n, themeId, max) {
    const dodge = Math.min(0.2 + n * 0.05, 0.7);
    const spec = (type) => ({ type, def: enemyDef(type, themeId), brain: ENEMY_TYPES[type].brain, params: { dodge, ...ENEMY_TYPES[type].params } });
    if (n === SECRET_WAVE) return [secretBossSpec(), spec('armored'), spec('sniper'), spec('scout'), spec('scout')];
    // Cada 5 oleadas, el mini jefe (y, a partir de la 10, algo de escolta)
    if (n % 5 === 0) {
        const k = n / 5;
        const out = [miniBossSpec(themeId, k)];
        for (let i = 0; i < (k - 1) * 2; i++) out.push(spec(i % 2 ? 'scout' : 'grunt'));
        return out;
    }
    const pool = Object.keys(ENEMY_TYPES).filter((id) => ENEMY_TYPES[id].from <= n);
    const fresh = pool.find((id) => ENEMY_TYPES[id].from === n && id !== 'grunt');
    const count = Math.min(n, max);
    const out = [];
    for (let i = 0; i < count; i++) {
        // El tipo que se estrena esta oleada sale seguro (solo uno, para presentarlo)
        let type = i === 0 ? 'grunt' : pool[(i * 2 + n) % pool.length];
        if (fresh && i === 1) type = fresh;
        else if (fresh && type === fresh) type = 'grunt';
        out.push(spec(type));
    }
    return out;
}
