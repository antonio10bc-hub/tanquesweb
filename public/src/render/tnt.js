import * as THREE from 'three';

// Texturas pixeladas del bloque explosivo: TNT de toda la vida. Por los lados, cartuchos rojos
// con una franja blanca y una llama en medio (el aviso de "esto explota" de los videojuegos);
// por arriba, un cartel blanco con una llama grande, que es lo que se ve desde la cámara. Se dibujan píxel a píxel en un canvas
// de 16×16 y se muestran sin suavizar, como todo el juego.
const PAL = {
    R: '#e8202a', r: '#a8101a', K: '#1b0b33', W: '#fff6e8', w: '#d8cfc0',
    O: '#ff6a00', Y: '#ffd23f', F: '#ffffff',
};

const SIDE = [
    'RRRrRRRrRRRrRRRr',
    'RRRrRRRrRRRrRRRr',
    'RRRrRRRrRRRrRRRr',
    'KKKKKKKKKKKKKKKK',
    'WWWWWWWOWWWWWWWW',
    'WWWWWWOOWOWWWWWW',
    'WWWWWOOYOOWWWWWW',
    'WWWWWOYYYOWWWWWW',
    'WWWWOOYFYOOWWWWW',
    'WWWWWOOYOOWWWWWW',
    'wwwwwwwwwwwwwwww',
    'KKKKKKKKKKKKKKKK',
    'RRRrRRRrRRRrRRRr',
    'RRRrRRRrRRRrRRRr',
    'RRRrRRRrRRRrRRRr',
    'rrrrrrrrrrrrrrrr',
];

// Arriba (lo que más se ve desde la cámara): el cartel blanco con la llama
const TOP = [
    'rrrrrrrrrrrrrrrr',
    'rRRRRRRRRRRRRRRr',
    'rRRWWWWWWWWWWRRr',
    'rRWWWWWWOWWWWWRr',
    'rRWWWWWOOWWOWWRr',
    'rRWWWOWOOWOOWWRr',
    'rRWWWOOOYOOOWWRr',
    'rRWWOOOYYYOOWWRr',
    'rRWWOOYYFYYOWWRr',
    'rRWWOOYYFYYOWWRr',
    'rRWWWOOYYYOOWWRr',
    'rRWWWWOOOOOWWWRr',
    'rRWWWWWWWWWWWWRr',
    'rRRWWWWWWWWWWRRr',
    'rRRRRRRRRRRRRRRr',
    'rrrrrrrrrrrrrrrr',
];

function texture(rows) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 16;
    const ctx = cv.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
        ctx.fillStyle = PAL[ch];
        ctx.fillRect(x, y, 1, 1);
    }));
    const t = new THREE.CanvasTexture(cv);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    return t;
}

let cache = null;
// { side, top }: texturas compartidas por todas las partidas (se crean una vez)
export function tntTextures() {
    if (!cache) cache = { side: texture(SIDE), top: texture(TOP) };
    return cache;
}
