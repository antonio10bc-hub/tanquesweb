// Niveles. El mapa es ASCII (ver tiles.js); P/E marcan las apariciones.
// Para añadir enemigos basta con más entradas en "enemies" (y más letras en el mapa).
// Con "generator" cada partida genera un mapa simétrico nuevo (world/MapGen.js);
// "map" queda como mapa fijo de respaldo si la generación fallara.
export const LEVELS = {
    base: {
        name: 'ARENA BASE',
        theme: 'candy',
        generator: { cols: 13, rows: 19 },
        map: [
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
        ],
        player: { tank: 'hero', spawn: 'P' },
        enemies: [
            { tank: 'rival', spawn: 'E', brain: 'hunter', params: { dodge: 0.5 } },
        ],
    },
};

export const FIRST_LEVEL = 'base';
