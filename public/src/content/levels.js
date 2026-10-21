// Niveles. El mapa es ASCII (ver tiles.js); P/E marcan las apariciones.
// Para añadir enemigos basta con más entradas en "enemies" (y más letras en el mapa).
export const LEVELS = {
    base: {
        name: 'ARENA BASE',
        theme: 'candy',
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
