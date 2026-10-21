// Leyenda de los mapas ASCII. "style" se pinta según el tema del nivel.
// Cualquier carácter que no esté aquí es suelo + punto de aparición (P, E, 1, 2...).
export const TILES = {
    '.': { solid: false },
    '#': { solid: true, style: 'wall' },
    'B': { solid: true, style: 'block' },
};
