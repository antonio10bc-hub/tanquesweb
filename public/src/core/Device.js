// Ordenador o móvil. El juego está pensado para el móvil en vertical; en un ordenador (ratón
// y teclado) la interfaz se agranda para la pantalla, los textos hablan de teclas y no de dedos
// y el duelo se juega en una sola vista compartida.
//   PC          → hay ratón (puntero fino que puede pasar por encima)
//   html.pc     → la misma señal para el CSS
//   --ui        → cuánto se agranda la interfaz (1 en el móvil)
import { Settings } from './Settings.js';

export const PC = typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;

// Tamaño de interfaz elegido en Ajustes (solo en el ordenador)
export const UI_SIZES = { small: 0.8, normal: 1, large: 1.25 };

// Diseñada para unos 720 px de alto: se agranda a saltos de 0,25 (la fuente pixelada se ve
// más limpia) sin pasar del ancho disponible; en "pequeña" puede quedar algo por debajo de 1
function uiScale() {
    const s = Math.min(window.innerHeight / 720, window.innerWidth / 1000) * (UI_SIZES[Settings.uiSize] || 1);
    return Math.min(3, Math.max(Settings.uiSize === 'small' ? 0.75 : 1, Math.floor(s * 4) / 4));
}

// Duelo en el ordenador con la pantalla apaisada: una vista para los dos, sin partir
export const sharedDuel = () => PC && window.innerWidth > window.innerHeight;

// Vuelve a calcular el tamaño de la interfaz (al cambiarlo en Ajustes o la ventana)
export function applyUiScale() {
    if (PC) document.documentElement.style.setProperty('--ui', uiScale());
}

// Cursor pixelado: una flecha con contorno de tinta, amarilla y cian sobre lo que se pulsa
function cursor(fill, light) {
    const rows = [
        'K...........', 'KK..........', 'KLK.........', 'KLFK........', 'KLFFK.......', 'KLFFFK......',
        'KLFFFFK.....', 'KLFFFFFK....', 'KLFFFFFFK...', 'KLFFFFFFFK..', 'KLFFFFKKKKK.', 'KLFKFFK.....',
        'KFK.KFFK....', 'KK..KFFK....', 'K....KFFK...', '.....KKK....',
    ];
    const pal = { K: '#1b0b33', F: fill, L: light };
    let rects = '';
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
        if (pal[ch]) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${pal[ch]}"/>`;
    }));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 12 16" shape-rendering="crispEdges">${rects}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 0 0`;
}

if (PC) {
    Settings.load();
    const root = document.documentElement;
    root.classList.add('pc');
    root.style.setProperty('--cursor', `${cursor('#ffe03a', '#fff7a8')}, auto`);
    root.style.setProperty('--cursor-hand', `${cursor('#23e0d6', '#a8fff8')}, pointer`);
    applyUiScale();
    window.addEventListener('resize', applyUiScale);
}
