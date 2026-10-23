// Arquetipos de escenario. Cada partida elige uno al azar (distinto del anterior) y genera
// un mapa nuevo con él. Un arquetipo combina:
//   themes     temas visuales posibles (content/themes.js): solo cambian el aspecto
//   generator  cómo se construye el mapa (world/MapGen.js): cuánto muro, qué materiales
//              (# muro, B bloque bajo, D rompible) y cuánta hierba alta
//   pickups    qué objetos salen (content/pickups.js) y, si hace falta, sus reglas
// "map" es un mapa fijo de respaldo por si la generación fallara.
import { L } from '../core/I18n.js';
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
        name: L('CLASSIC ARENA', 'ARENA CLÁSICA'),
        tagline: L('FIRE AND HEALTH', 'FUEGO Y VIDA'),
        themes: ['candy', 'meadow'],
        generator: { materials: { '#': 3, B: 2, D: 1 }, bushes: [1, 2] },
        pickups: { kinds: { heal: 2, power: 2, bounce: 1, triple: 1, decoy: 1, nuke: 1 } },
    },
    emboscada: {
        name: L('AMBUSH', 'EMBOSCADA'),
        tagline: L('THE GRASS HIDES', 'LA HIERBA ESCONDE'),
        themes: ['meadow', 'beach', 'desert'],
        generator: { pieces: [4, 6], density: [0.1, 0.22], materials: { '#': 2, B: 2 }, bushes: [5, 7], bushSize: [3, 6] },
        pickups: { kinds: { radar: 2, heal: 2, decoy: 3, nuke: 1 } },
    },
    demolicion: {
        name: L('DEMOLITION', 'DEMOLICIÓN'),
        tagline: L('EVERYTHING BREAKS', 'TODO SE ROMPE'),
        themes: ['city', 'desert', 'space'],
        generator: { pieces: [6, 9], density: [0.16, 0.32], materials: { '#': 1, D: 5 }, bushes: [0, 1] },
        pickups: { kinds: { power: 3, bounce: 2, heal: 1, triple: 2, nuke: 1 } },
    },
    fortaleza: {
        name: L('FORTRESS', 'FORTALEZA'),
        tagline: L('WALLS AND SHIELDS', 'MUROS Y ESCUDOS'),
        themes: ['snow', 'volcano', 'space'],
        generator: { pieces: [6, 9], density: [0.18, 0.32], materials: { '#': 4, B: 1, D: 2 }, bushes: [0, 2] },
        pickups: { kinds: { shield: 2, bounce: 2, heal: 1, triple: 1, nuke: 1 } },
    },
    carreras: {
        name: L('RACING', 'CARRERAS'),
        tagline: L('RUN AND GUN', 'CORRE Y DISPARA'),
        themes: ['beach', 'candy', 'city'],
        generator: { pieces: [3, 5], density: [0.08, 0.18], materials: { B: 3, D: 2 }, bushes: [2, 3] },
        pickups: { kinds: { turbo: 3, power: 2, shield: 1, triple: 1, nuke: 1 }, lifetime: 4 },
    },
    fantasmas: {
        name: L('GHOSTS', 'FANTASMAS'),
        tagline: L('NOBODY IS SEEN', 'NADIE SE VE'),
        themes: ['city', 'space', 'volcano'],
        generator: { materials: { '#': 2, B: 2, D: 1 }, bushes: [3, 5], bushSize: [2, 4] },
        pickups: { kinds: { radar: 3, heal: 1, decoy: 3, nuke: 1 } },
    },
};

for (const lvl of Object.values(LEVELS)) Object.assign(lvl, { map: FALLBACK_MAP }, DUEL);

// Modo supervivencia: un mapa para toda la partida y oleadas de enemigos cada vez mayores.
// No entra en la rotación de partidas rápidas ("survival: true").
LEVELS.supervivencia = {
    name: L('SURVIVAL', 'SUPERVIVENCIA'),
    tagline: L('HOLD OUT AS LONG AS YOU CAN', 'AGUANTA LO QUE PUEDAS'),
    survival: true,
    themes: ['snow', 'desert', 'candy', 'volcano', 'beach', 'meadow', 'city', 'space'],
    generator: { materials: { '#': 3, B: 2, D: 2 }, bushes: [2, 4] },
    pickups: { kinds: { heal: 3, power: 2, shield: 2, turbo: 1, bounce: 1, radar: 1, triple: 2, decoy: 1, nuke: 1 }, lifetime: 6 },
    map: FALLBACK_MAP,
    player: { tank: 'hero', spawn: 'P' },
    enemies: [], // la primera oleada la pone Game con content/survival.js
};

// Tutorial de la primera partida (core/Tutorial.js): arena pequeña y fija.
// Baja a propósito: arriba queda sitio para los textos del tutorial sin tapar el tablero.
const TUTORIAL_MAP = [
    '#############',
    '#.....E.....#',
    '#.##.....##.#',
    '#...........#',
    '#gg.......gg#',
    '#gg.......gg#',
    '#...........#',
    '#.....P.....#',
    '#############',
];

LEVELS.tutorial = {
    name: L('TUTORIAL', 'TUTORIAL'),
    tagline: L('LEARN THE BASICS', 'APRENDE LO BÁSICO'),
    tutorial: true,
    themes: ['meadow'],
    map: TUTORIAL_MAP,
    pickups: { kinds: { heal: 2, power: 2, shield: 1 }, firstDelay: 1e9, lifetime: 1e9 },
    player: { tank: 'hero', spawn: 'P', hp: 20 }, // en el tutorial es imposible perder
    enemies: [],
};

// Duelo local: dos personas en el mismo móvil. No entra en la rotación de partidas rápidas.
LEVELS.duelo = {
    name: L('DUEL', 'DUELO'),
    tagline: L('ONE ON ONE', 'UNO CONTRA UNO'),
    duel: true,
    themes: ['snow', 'desert', 'candy', 'volcano', 'beach', 'meadow', 'city', 'space'],
    generator: { materials: { '#': 3, B: 2, D: 1 }, bushes: [2, 3] },
    pickups: { kinds: { heal: 2, power: 2, shield: 1, bounce: 1, triple: 1, turbo: 1, nuke: 1 } },
    map: FALLBACK_MAP,
    player: { tank: 'hero', spawn: 'P' },
    enemies: [{ tank: 'rival', spawn: 'E', brain: 'player2', noSkin: true }],
};

// Ritmo de las oleadas. Cada oleada trae un enemigo más, hasta el tope; los tipos nuevos
// van apareciendo poco a poco y cada 5 oleadas llega un mini jefe (content/survival.js).
export const SURVIVAL = {
    heal: 2,          // vida que recuperas al superar una oleada
    pause: 2.4,       // segundos de respiro entre oleadas
    minSpawnDist: 6,  // los nuevos enemigos aparecen lejos de ti
    maxEnemies: 8,    // tope de enemigos por oleada (más no caben con sentido en la arena)
    // Quién llega en cada oleada (y el mini jefe cada 5): content/survival.js
};

export const FIRST_LEVEL = 'clasico';
