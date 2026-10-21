// Ajustes globales del motor. Lo que pertenece a un contenido concreto
// (un tanque, un arma, un nivel...) vive en /content, no aquí.
export const CONFIG = {
    render: {
        targetPixels: 210,  // líneas aprox. en el lado corto de la pantalla (la DS tenía 192)
        maxScale: 6,
        colorLevels: 31,    // niveles por canal: 5 bits, como la DS
        dither: 1.0,
        saturation: 1.25,
    },
    camera: {
        fov: 34,
        pitch: 58,          // grados sobre el horizonte
        sideMargin: 0.4,    // tiles extra a los lados del arena
        minRows: 15,        // filas mínimas visibles en horizontal (escritorio)
        follow: 6,
    },
    stealth: {
        revealTime: 0.75,   // segundos visible tras cada disparo (> intervalo => visible mientras disparas)
        revealOnHit: 0.35,  // al recibir un impacto también te ven un instante
        proximity: 1.9,     // a esta distancia siempre os veis
        playerGhost: 0.45,  // opacidad de tu tanque mientras estás oculto
        fadeSpeed: 10,
    },
    match: {
        dropTime: 0.5,
        countdownStart: 1.0,
        countdownStep: 0.6,
        slowmo: 0.25,
        slowmoTime: 1.3,
    },
    sim: {
        maxStep: 1 / 60,    // subpaso máximo de simulación
        maxFrame: 1 / 20,   // evita saltos enormes tras cambiar de pestaña
    },
};
