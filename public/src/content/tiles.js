// Leyenda de los mapas ASCII. "style" se pinta según el tema del nivel.
// Cualquier carácter que no esté aquí es suelo + punto de aparición (P, E, 1, 2...).
export const TILES = {
    '.': { solid: false },
    '#': { solid: true, style: 'wall' },
    'B': { solid: true, style: 'block' },
    // Muro rompible: aguanta "hp" balas y desaparece dejando suelo.
    'D': { solid: true, style: 'crate', hp: 3 },
    // Hierba alta: se atraviesa y esconde al tanque que está dentro.
    'g': { solid: false, bush: true },
    // Hielo: se atraviesa, pero resbala (el tanque tarda en frenar y en girar)
    'i': { solid: false, ice: true },
    // Barril explosivo: revienta de un disparo, daña a los tanques cercanos y rompe muros
    'X': { solid: true, style: 'barrel', hp: 1 },
};
