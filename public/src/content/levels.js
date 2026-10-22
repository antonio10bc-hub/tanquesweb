// Arquetipos de escenario. Cada partida elige uno al azar (distinto del anterior) y genera
// un mapa nuevo con él. Un arquetipo combina:
//   themes     temas visuales posibles (content/themes.js): solo cambian el aspecto
//   generator  cómo se construye el mapa (world/MapGen.js): cuánto muro, qué materiales
//              (# muro, B bloque bajo, D rompible) y cuánta hierba alta
//   pickups    qué objetos salen (content/pickups.js) y, si hace falta, sus reglas
// "map" es un mapa fijo de respaldo por si la generación fallara.
const DUEL = {
    player: { tank: 'hero', spawn: 'P' },
    enemies: [{ tank: 'rival', spawn: 'E', brain: 'hunter', params: { dodge: 0.5 } }],
};

const FALLBACK_MAP = [
    '#############',
    '#.....E.....#',
    '#...........#',
    '#..B.....B..#',
    '#....###....#',
    '#...........#',
    '#.##.....##.#',
    '#.#.......#.#',
    '#.....B.....#',
    '#...B...B...#',
    '#.....B.....#',
    '#.#.......#.#',
    '#.##.....##.#',
    '#...........#',
    '#....###....#',
    '#..B.....B..#',
    '#...........#',
    '#.....P.....#',
    '#############',
];

export const LEVELS = {
    clasico: {
        name: 'ARENA CLÁSICA',
        tagline: 'FUEGO Y VIDA',
        themes: ['candy', 'mountain'],
        generator: { materials: { '#': 3, B: 2, D: 1 }, bushes: [1, 2] },
        pickups: { kinds: { heal: 2, power: 2, bounce: 1 } },
    },
    emboscada: {
        name: 'EMBOSCADA',
        tagline: 'LA HIERBA ESCONDE',
        themes: ['autumn', 'beach', 'candy'],
        generator: { pieces: [4, 6], density: [0.1, 0.22], materials: { '#': 2, B: 2 }, bushes: [5, 7], bushSize: [3, 6] },
        pickups: { kinds: { radar: 2, cloak: 1, heal: 2 } },
    },
    demolicion: {
        name: 'DEMOLICIÓN',
        tagline: 'TODO SE ROMPE',
        themes: ['city', 'snow'],
        generator: { pieces: [6, 9], density: [0.16, 0.32], materials: { '#': 1, D: 5 }, bushes: [0, 1] },
        pickups: { kinds: { power: 3, bounce: 2, heal: 1, nuke: 1 } },
    },
    fortaleza: {
        name: 'FORTALEZA',
        tagline: 'MUROS Y ESCUDOS',
        themes: ['mountain', 'snow', 'city'],
        generator: { pieces: [6, 9], density: [0.18, 0.32], materials: { '#': 4, B: 1, D: 2 }, bushes: [0, 2] },
        pickups: { kinds: { shield: 2, bounce: 2, heal: 1, nuke: 1 } },
    },
    carreras: {
        name: 'CARRERAS',
        tagline: 'CORRE Y DISPARA',
        themes: ['beach', 'candy', 'city'],
        generator: { pieces: [3, 5], density: [0.08, 0.18], materials: { B: 3, D: 2 }, bushes: [2, 3] },
        pickups: { kinds: { turbo: 3, power: 2, shield: 1 }, lifetime: 4 },
    },
    fantasmas: {
        name: 'FANTASMAS',
        tagline: 'NADIE SE VE',
        themes: ['snow', 'autumn', 'mountain'],
        generator: { materials: { '#': 2, B: 2, D: 1 }, bushes: [3, 5], bushSize: [2, 4] },
        pickups: { kinds: { cloak: 2, radar: 2, heal: 1 } },
    },
};

for (const lvl of Object.values(LEVELS)) Object.assign(lvl, { map: FALLBACK_MAP }, DUEL);

export const FIRST_LEVEL = 'clasico';
