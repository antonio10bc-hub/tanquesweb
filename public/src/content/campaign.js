// Campaña: un mundo por temática, de abajo arriba en el mapa, y en cada uno un jefe.
// Al ganar a los 8 se abre el mundo secreto (arcoíris) con el jefe final.
//
// Cada jefe es un tanque gigante con las mismas reglas que el resto (sigilo incluido):
//   tank      vida, velocidad, tamaño (scale) y colores
//   deco      piezas voxel temáticas que se añaden al modelo (ver render/TankModel.js)
//   attack    su ataque especial (ai/bossAttacks.js): cada "cooldown" segundos lo anuncia
//             (cast: segundos de aviso, con el jefe visible) y lo lanza
//   phase2    al bajar a mitad de vida se enfada: más rápido, ataca más a menudo y el
//             ataque especial se vuelve más fuerte (cada ataque decide cómo)

// Arena de jefe: algo más grande y con pasillos de 2 casillas para que quepa el gigante.
const BOSS_ARENA = { cols: 15, rows: 21, pieces: [4, 7], density: [0.07, 0.2], gap: 2, spawnClear: 3 };
const BOSS_PICKUPS = { kinds: { heal: 3, shield: 2, power: 2, bounce: 1, turbo: 1, radar: 2, nuke: 1 }, lifetime: 6 };

// Mapa fijo de respaldo con pasillos anchos.
const BOSS_FALLBACK = [
    '###############',
    '#......E......#',
    '#.............#',
    '#.............#',
    '#..##.....##..#',
    '#..#.......#..#',
    '#.............#',
    '#......B......#',
    '#.............#',
    '#..B.......B..#',
    '#.............#',
    '#..B.......B..#',
    '#.............#',
    '#......B......#',
    '#.............#',
    '#..#.......#..#',
    '#..##.....##..#',
    '#.............#',
    '#.............#',
    '#......P......#',
    '###############',
];

const boss = (o) => ({ radius: 0.66, scale: 1.85, weapon: 'bossCannon', boss: true, ...o });

// Dificultad que sube mundo a mundo: lo bien que esquiva y apunta el jefe y cuánto tarda en
// repetir su especial (los primeros dan tiempo a aprender cada ataque).
const SKILL = [
    { dodge: 0.08, burst: [1, 2], every: 1.35 },
    { dodge: 0.12, burst: [1, 2], every: 1.3 },
    { dodge: 0.16, burst: [2, 2], every: 1.2 },
    { dodge: 0.2, burst: [2, 3], every: 1.15 },
    { dodge: 0.24, burst: [2, 3], every: 1.1 },
    { dodge: 0.28, burst: [2, 3], every: 1.05 },
    { dodge: 0.32, burst: [2, 4], every: 1 },
    { dodge: 0.36, burst: [2, 4], every: 1 },
    { dodge: 0.38, burst: [2, 4], every: 1 },
];

const DRUMS = {
    boomchick: { k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.' },
    rock: { k: 'x.......x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
    calypso: { k: 'x.......x.......', s: '...x..x....x..x.', h: 'xxxxxxxxxxxxxxxx' },
    surf: { k: 'x..x....x..x....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
    tribal: { k: 'x..x..x.x.x..x..', s: '........x.......', h: '....x.......x...' },
    light: { k: 'x.......x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
    sleigh: { k: 'x.......x.......', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx' },
    four: { k: 'x...x...x...x...', s: '....x.......x...', h: '..o...o...o...o.' },
    metal: { k: 'xxxxxxxxxxxxxxxx', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
    halftime: { k: 'x.....x.........', s: '........x.......', h: 'x.x.x.x.x.x.x.x.' },
    epic: { k: 'x.x...x.x.x...x.', s: '....x.......x.xx', h: 'x.x.x.x.x.x.x.x.' },
};

// Música de cada jefe (core/Music.js): su tema y otro más intenso para la fase 2, que entra
// con el cartel de ¡FASE 2!.
export const WORLDS = [
    {
        id: 'w1', theme: 'meadow', name: 'PRADERA',
        generator: { materials: { '#': 3, B: 2, D: 2 }, bushes: [3, 5] },
        tank: boss({
            name: 'TRACTORÓN', hp: 9, speed: 2.7,
            palette: { body: 0xe8402e, accent: 0xfff6e8, tread: 0x2a3a1a, barrel: 0x4a4a4a, bullet: 0xffe680 },
            deco: (part) => {
                part('body', 0.66, 0.16, 0.08, 0x9a9aac, 0, 0.16, 0.45);          // pala delantera
                part('body', 0.36, 0.2, 0.22, 0xffd86b, 0, 0.52, -0.26);           // bala de paja
                part('body', 0.38, 0.04, 0.04, 0xd6a842, 0, 0.55, -0.26, false);
                part('turret', 0.07, 0.34, 0.07, 0x2a2a2a, 0.16, 0.3, -0.16);     // tubo de escape
            },
        }),
        attack: { id: 'charge', name: '¡EMBESTIDA!', cast: 0.9, cooldown: 6.5, speed: 3.2, time: 1.3, repeat2: 2 },
        intro: 'EL TRACTOR MÁS BRUTO DEL CAMPO',
        tell: 'SE LANZA A TODA VELOCIDAD CONTRA TI',
        // Hoedown de granja: bajo oom-pah, ritmo de galope y melodía saltarina
        music: { root: 60, scale: 'major', tempo: 148, lead: 'square', bass: '1...5...1...5...', drums: DRUMS.boomchick, swing: 0.18, motif: '0.2.4.4.5.4.2.0.4.4.2.0.1.2.0...' },
        music2: { root: 62, scale: 'mixolydian', tempo: 172, lead: 'sawtooth', bass: '1.5.1.5.1.5.8.5.', drums: DRUMS.rock, swing: 0.12, harmony: true, motif: '4.4.5.6.7.6.5.4.2.4.5.4.2.1.0...' },
    },
    {
        id: 'w2', theme: 'beach', name: 'PLAYA',
        generator: { materials: { '#': 3, B: 3, D: 1 }, bushes: [2, 4] },
        tank: boss({
            name: 'CANGREJOTE', hp: 10, speed: 2.6,
            palette: { body: 0xff5a3c, accent: 0xffb08a, tread: 0x8a2a1a, barrel: 0xffe6d0, bullet: 0xffb08a },
            deco: (part) => {
                for (const s of [-1, 1]) {
                    part('body', 0.16, 0.16, 0.26, 0xff5a3c, s * 0.38, 0.3, 0.42);   // pinzas
                    part('body', 0.08, 0.08, 0.18, 0xffb08a, s * 0.44, 0.4, 0.58);
                    part('body', 0.08, 0.08, 0.14, 0xffb08a, s * 0.32, 0.26, 0.6);
                    part('turret', 0.04, 0.2, 0.04, 0xff5a3c, s * 0.12, 0.38, 0.1, false); // ojos en palitos
                    part('turret', 0.1, 0.1, 0.1, 0xffffff, s * 0.12, 0.5, 0.1);
                }
            },
        }),
        attack: { id: 'wave', name: '¡OLA GIGANTE!', cast: 1.1, cooldown: 8, speed: 5.5 },
        intro: 'EL REY DE LA ARENA',
        tell: 'LLAMA A UNA OLA: ESCÓNDETE DETRÁS DE UN MURO',
        // Calipso de playa con bajo de tresillo y "steel drum"; en la fase 2, surf rock
        music: { root: 60, scale: 'mixolydian', tempo: 138, lead: 'triangle', octave: 2, bass: '1..1..1.5..5..5.', drums: DRUMS.calypso, arp: 'stab', motif: '4..4..2.4..5..4.2..2..0.2..4....' },
        music2: { root: 57, scale: 'minor', tempo: 166, lead: 'sawtooth', bass: '1.1.1.1.5.5.8.8.', drums: DRUMS.surf, arp: 'up', motif: '0.0.2.3.4...3.2.0.0.2.3.2.0.a...' },
    },
    {
        id: 'w3', theme: 'desert', name: 'DESIERTO',
        generator: { materials: { '#': 2, B: 3, D: 2 }, bushes: [2, 3] },
        tank: boss({
            name: 'ESCORPIÓN', hp: 11, speed: 2.9,
            palette: { body: 0x4a2f7a, accent: 0xffb03a, tread: 0x24123f, barrel: 0xffe6b0, bullet: 0xffd08a },
            deco: (part) => {
                part('turret', 0.14, 0.14, 0.16, 0x4a2f7a, 0, 0.26, -0.3);       // cola en curva
                part('turret', 0.13, 0.15, 0.13, 0x4a2f7a, 0, 0.42, -0.4);
                part('turret', 0.12, 0.14, 0.12, 0x4a2f7a, 0, 0.58, -0.34);
                part('turret', 0.12, 0.12, 0.14, 0xffb03a, 0, 0.68, -0.18);       // aguijón
                part('turret', 0.05, 0.05, 0.1, 0xff3e3e, 0, 0.64, -0.06, false);
                for (const s of [-1, 1]) part('body', 0.12, 0.1, 0.2, 0xffb03a, s * 0.36, 0.26, 0.44);
            },
        }),
        attack: { id: 'storm', name: '¡TORMENTA DE ARENA!', cast: 1.0, cooldown: 8, count: 2, count2: 3, life: 5.5, speed: 2.1 },
        intro: 'NADIE LO VE VENIR',
        tell: 'DESAPARECE EN UNA TORMENTA Y SUELTA REMOLINOS',
        // Encantador de serpientes: escala de desierto, tambores tribales y bajo en bordón
        music: { root: 57, scale: 'hijaz', tempo: 120, lead: 'sawtooth', bass: '1.1.1.1.1.1.1.1.', bassType: 'sine', drums: DRUMS.tribal, arp: 'none', prog: [0, 0, 1, 0], motif: '0.1.2.1.0...4.3.2.1.2.1.0.a.0...' },
        music2: { root: 59, scale: 'hijaz', tempo: 150, lead: 'square', bass: '1.11.11.1.11.11.', bassType: 'sawtooth', drums: DRUMS.rock, arp: 'up', prog: [0, 1, 0, 6], harmony: true, motif: '4.5.4.2.1.2.1.0.4.5.6.5.4.2.1.0.' },
    },
    {
        id: 'w4', theme: 'candy', name: 'CARAMELO',
        generator: { materials: { '#': 3, B: 2, D: 2 }, bushes: [2, 4] },
        tank: boss({
            name: 'PASTELÓN', hp: 12, speed: 2.7,
            palette: { body: 0xff8fd8, accent: 0xfff4e0, tread: 0x6a2a1a, barrel: 0xffffff, bullet: 0xff8fd8 },
            deco: (part) => {
                part('turret', 0.5, 0.06, 0.48, 0xffffff, 0, 0.29, -0.03);        // nata
                part('turret', 0.16, 0.16, 0.16, 0xff2a4a, 0, 0.42, -0.03);       // cereza
                part('turret', 0.03, 0.14, 0.03, 0x3fbf4a, 0.03, 0.56, -0.03, false);
                const sprinkles = [0x6ff6ff, 0xffe03a, 0x7dff4a, 0xb46bff];
                for (let i = 0; i < 6; i++) {
                    const a = (i / 6) * Math.PI * 2;
                    part('body', 0.07, 0.04, 0.04, sprinkles[i % 4], Math.sin(a) * 0.2, 0.43, Math.cos(a) * 0.28, false);
                }
            },
        }),
        attack: { id: 'ring', name: '¡LLUVIA DE CARAMELOS!', cast: 0.8, cooldown: 6, count: 14, rings2: 3 },
        intro: 'DULCE POR FUERA, MALO POR DENTRO',
        tell: 'DISPARA CARAMELOS EN TODAS DIRECCIONES',
        // Cajita de música de caramelo con arpegios brillantes; en la fase 2, subidón de azúcar
        music: { root: 64, scale: 'major', tempo: 134, lead: 'square', octave: 2, bass: '1...3...5...3...', drums: DRUMS.light, arp: 'up', motif: '4.6.7.6.4.2.4...5.7.9.7.5.4.2...' },
        music2: { root: 66, scale: 'lydian', tempo: 168, lead: 'square', octave: 2, bass: '1.1.3.3.5.5.3.3.', bassType: 'square', drums: DRUMS.four, arp: 'up', harmony: true, motif: '7.6.4.6.7.9.7.6.4.2.4.6.4.2.0...' },
    },
    {
        id: 'w5', theme: 'snow', name: 'NIEVE',
        generator: { materials: { '#': 3, B: 2, D: 2 }, bushes: [1, 3] },
        tank: boss({
            name: 'MUÑECÓN', hp: 13, speed: 2.7,
            palette: { body: 0xf4f8ff, accent: 0x2a6aff, tread: 0x3a4a6a, barrel: 0xff8a1f, bullet: 0xe6f6ff },
            deco: (part) => {
                part('turret', 0.4, 0.04, 0.4, 0x1b1f4a, 0, 0.31, -0.03);         // chistera
                part('turret', 0.26, 0.26, 0.26, 0x1b1f4a, 0, 0.46, -0.03);
                part('turret', 0.27, 0.05, 0.27, 0xff3e3e, 0, 0.36, -0.03, false);
                part('body', 0.56, 0.08, 0.76, 0x2a6aff, 0, 0.44, 0);              // bufanda
                part('body', 0.1, 0.24, 0.06, 0x2a6aff, 0.22, 0.32, -0.38);
                for (const y of [0.24, 0.34]) part('body', 0.06, 0.06, 0.03, 0x1b1f4a, 0, y, 0.37, false); // botones
            },
        }),
        attack: { id: 'icicles', name: '¡CARÁMBANOS!', cast: 0.6, cooldown: 6.5, count: 4, count2: 6, delay: 1.3, radius: 0.8 },
        intro: 'FRÍO, FRÍO, FRÍO',
        tell: 'HACE CAER CARÁMBANOS: MIRA LAS SOMBRAS DEL SUELO',
        // Nana helada de cascabeles; en la fase 2, ventisca
        music: { root: 62, scale: 'minor', tempo: 116, lead: 'triangle', octave: 2, bass: '1.......5.......', drums: DRUMS.sleigh, arp: 'stab', motif: '4...2...3...1...2.3.4.3.2...0...' },
        music2: { root: 62, scale: 'harmonic', tempo: 150, lead: 'square', bass: '1.1.5.5.1.1.5.5.', bassType: 'sawtooth', drums: DRUMS.rock, arp: 'up', harmony: true, motif: '4.3.2.1.2.3.4...6.5.4.3.2.1.0...' },
    },
    {
        id: 'w6', theme: 'city', name: 'CIUDAD',
        generator: { materials: { '#': 3, B: 2, D: 2 }, bushes: [1, 3] },
        tank: boss({
            name: 'ROBOPATRULLA', hp: 14, speed: 2.9,
            palette: { body: 0x2a3a8a, accent: 0x2ef2ff, tread: 0x15152a, barrel: 0xd0dcff, bullet: 0x8afcff },
            deco: (part) => {
                const red = part('turret', 0.14, 0.1, 0.14, 0xff2a4a, -0.11, 0.35, -0.03);   // sirenas
                const blue = part('turret', 0.14, 0.1, 0.14, 0x2a6aff, 0.11, 0.35, -0.03);
                part('turret', 0.36, 0.04, 0.16, 0xd0dcff, 0, 0.29, -0.03);
                part('body', 0.6, 0.06, 0.08, 0x2ef2ff, 0, 0.3, 0.38, false);                 // luz de neón
                return {
                    animate(t) {
                        const on = Math.floor(t * 6) % 2 === 0;
                        red.scale.setScalar(on ? 1.15 : 0.8);
                        blue.scale.setScalar(on ? 0.8 : 1.15);
                    },
                };
            },
        }),
        attack: { id: 'summon', name: '¡REFUERZOS!', cast: 1.0, cooldown: 11, count: 1, count2: 2, max: 2, radar: 2.5 },
        intro: 'LA LEY DE LA CIUDAD DE NOCHE',
        tell: 'LLAMA A SUS DRONES Y TE ENCUENTRA CON LOS FOCOS',
        // Persecución de neón: bajo pulsante a octavas, bombo a negras y melodía de sirena
        music: { root: 52, scale: 'minor', tempo: 132, lead: 'sawtooth', bass: '1.8.1.8.1.8.1.8.', bassType: 'sawtooth', drums: DRUMS.four, arp: 'stab', motif: '4.4.6.4.4.4.6.4.7.7.6.4.2.2.0...' },
        music2: { root: 54, scale: 'phrygian', tempo: 160, lead: 'square', bass: '18181818181818..', bassType: 'sawtooth', drums: DRUMS.epic, arp: 'up', harmony: true, motif: '6.4.6.4.6.4.7.6.4.2.4.2.1.0.1...' },
    },
    {
        id: 'w7', theme: 'volcano', name: 'VOLCÁN',
        generator: { materials: { '#': 3, B: 2, D: 2 }, bushes: [1, 3] },
        tank: boss({
            name: 'MAGMATÓN', hp: 15, speed: 2.6,
            palette: { body: 0x3a2a30, accent: 0xff5a1f, tread: 0x1a1014, barrel: 0x6e5a6c, bullet: 0xffb03a },
            deco: (part) => {
                part('turret', 0.34, 0.12, 0.34, 0x3a2a30, 0, 0.36, -0.03);       // volcán en la torreta
                part('turret', 0.22, 0.12, 0.22, 0x3a2a30, 0, 0.48, -0.03);
                part('turret', 0.14, 0.04, 0.14, 0xffd23f, 0, 0.55, -0.03, false); // lava
                for (const s of [-1, 1]) {
                    part('body', 0.02, 0.05, 0.4, 0xff5a1f, s * 0.26, 0.3, 0.02, false);   // grietas
                    part('body', 0.02, 0.12, 0.04, 0xff5a1f, s * 0.26, 0.34, -0.16, false);
                }
            },
        }),
        attack: { id: 'meteors', name: '¡LLUVIA DE LAVA!', cast: 0.7, cooldown: 7.5, count: 3, count2: 5, delay: 1.3, radius: 0.95, lava: 3.5 },
        intro: 'SU CORAZÓN ES PURA LAVA',
        tell: 'LANZA ROCAS DE LAVA QUE DEJAN CHARCOS ARDIENDO',
        // Metal de lava: bajo al galope, doble bombo y riff grave
        music: { root: 45, scale: 'phrygian', tempo: 146, lead: 'sawtooth', octave: 2, bass: '1.111.111.111.11', bassType: 'sawtooth', drums: DRUMS.metal, arp: 'none', motif: '0.0.0.1.0.0.3.2.0.0.0.1.4.3.2.1.' },
        music2: { root: 47, scale: 'harmonic', tempo: 172, lead: 'sawtooth', octave: 2, bass: '1111111111111111', bassType: 'sawtooth', drums: DRUMS.metal, arp: 'stab', harmony: true, motif: '0.1.2.3.4.3.2.1.0.6.5.4.3.2.1.0.' },
    },
    {
        id: 'w8', theme: 'space', name: 'ESPACIO',
        generator: { materials: { '#': 3, B: 2, D: 2 }, bushes: [1, 3] },
        tank: boss({
            name: 'COMANDANTE ZORG', hp: 16, speed: 2.9,
            palette: { body: 0x8a5cff, accent: 0x7dff4a, tread: 0x2a1a5a, barrel: 0xd0dcff, bullet: 0x7dff4a },
            deco: (part) => {
                part('body', 0.96, 0.05, 0.96, 0xd0dcff, 0, 0.3, 0);              // platillo
                part('turret', 0.3, 0.18, 0.3, 0x9af6ff, 0, 0.36, -0.03);         // cúpula
                part('turret', 0.1, 0.1, 0.1, 0x7dff4a, 0, 0.36, -0.03, false);   // el alien
                const lights = [];
                for (let i = 0; i < 8; i++) {
                    const a = (i / 8) * Math.PI * 2;
                    lights.push(part('body', 0.07, 0.05, 0.07, 0x7dff4a, Math.sin(a) * 0.48, 0.34, Math.cos(a) * 0.48, false));
                }
                return {
                    animate(t) {
                        lights.forEach((l, i) => (l.visible = Math.floor(t * 8 + i) % 4 !== 0));
                    },
                };
            },
        }),
        attack: { id: 'laser', name: '¡RAYO LÁSER!', cast: 0.5, cooldown: 7.5, warn: 0.9, time: 3.2, turn: 1.0, turn2: 1.35 },
        intro: 'VIENE DE MUY, MUY LEJOS',
        tell: 'BARRE LA ARENA CON UN LÁSER: LOS MUROS LO PARAN',
        // Ciencia ficción: arpegios cósmicos, medio tiempo y melodía extraña de tonos enteros
        music: { root: 50, scale: 'dorian', tempo: 110, lead: 'square', bass: '1.......1...5...', bassType: 'sine', drums: DRUMS.halftime, arp: 'up', motif: '7.4.2.4.7.4.2.4.6.4.1.4.6.4.1.4.' },
        music2: { root: 50, scale: 'wholetone', tempo: 142, lead: 'sawtooth', bass: '1.1.1.1.3.3.3.3.', bassType: 'sawtooth', drums: DRUMS.rock, arp: 'up', harmony: true, motif: '5.4.3.2.1.2.3.4.5...3...1...0...' },
    },
    {
        id: 'secret', theme: 'rainbow', name: 'ARCOÍRIS', secret: true,
        generator: { materials: { '#': 3, B: 3, D: 1 }, bushes: [2, 3] },
        tank: boss({
            name: 'PRISMA', hp: 18, speed: 3.0, rainbow: true,
            palette: { body: 0xffffff, accent: 0xff8fd8, tread: 0x5a3aa8, barrel: 0xffffff, bullet: 0xffffff },
            deco: (part) => {
                part('turret', 0.12, 0.3, 0.12, 0x9af6ff, -0.12, 0.42, -0.08);   // cristales
                part('turret', 0.12, 0.42, 0.12, 0xff8fd8, 0, 0.48, -0.12);
                part('turret', 0.12, 0.3, 0.12, 0xffe680, 0.12, 0.42, -0.08);
            },
        }),
        attack: { id: 'mix', name: '¡PODER PRISMÁTICO!', cast: 0.8, cooldown: 6, cooldown2: 4.2 },
        intro: 'EL JEFE FINAL SECRETO',
        tell: 'USA LOS ATAQUES DE TODOS LOS JEFES',
        // Jefe final: épico, con melodía a dos voces; en la fase 2, todo a la vez
        music: { root: 57, scale: 'harmonic', tempo: 152, lead: 'square', bass: '1.111.111.111.11', bassType: 'sawtooth', drums: DRUMS.epic, arp: 'up', harmony: true, motif: '0.2.4.7.6.4.2.4.5.4.2.0.1.2.4...' },
        music2: { root: 60, scale: 'lydian', tempo: 178, lead: 'square', octave: 2, bass: '1818181818181818', bassType: 'sawtooth', drums: DRUMS.metal, arp: 'up', harmony: true, motif: '7.6.4.6.7.9.11..9.7.6.4.2.4.6...' },
    },
];

// Ataques que mezcla PRISMA (en orden). Toma prestados los parámetros de cada jefe.
export const MIX_ORDER = ['ring', 'icicles', 'laser', 'wave', 'meteors', 'storm', 'charge'];

export const WORLD_BY_ID = Object.fromEntries(WORLDS.map((w) => [w.id, w]));

// Nivel jugable de cada mundo (se registra en LEVELS con el id "boss_<mundo>").
export function bossLevel(w) {
    return {
        name: w.tank.name,
        tagline: w.intro,
        campaign: w.id,
        themes: [w.theme],
        generator: { ...BOSS_ARENA, ...w.generator },
        pickups: BOSS_PICKUPS,
        map: BOSS_FALLBACK,
        player: { tank: 'hero', spawn: 'P' },
        enemies: [{ tank: `boss_${w.id}`, spawn: 'E', brain: 'boss', params: { attack: w.attack, ...SKILL[WORLDS.indexOf(w)] } }],
    };
}

// Dron de la ROBOPATRULLA: pequeño, rápido y de un solo impacto.
export const MINIONS = {
    drone: {
        name: 'DRON', hp: 1, speed: 3.6, radius: 0.32, weapon: 'droneGun',
        palette: { body: 0x2ef2ff, accent: 0xff4fa3, tread: 0x15152a, barrel: 0xd0dcff, bullet: 0x8afcff },
    },
};
