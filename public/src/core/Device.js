// Ordenador o móvil. El juego está pensado para el móvil en vertical; en un ordenador (ratón
// y teclado) la interfaz se agranda para la pantalla, los textos hablan de teclas y no de dedos
// y el duelo se juega en una sola vista compartida.
//   PC          → hay ratón (puntero fino que puede pasar por encima)
//   html.pc     → la misma señal para el CSS
//   --ui        → cuánto se agranda la interfaz (1 en el móvil)
export const PC = typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;

// Diseñada para unos 720 px de alto: se agranda a saltos de 0,25 (la fuente pixelada se ve
// más limpia) sin pasar del ancho disponible
function uiScale() {
    const s = Math.min(window.innerHeight / 720, window.innerWidth / 1000);
    return Math.min(2.5, Math.max(1, Math.floor(s * 4) / 4));
}

// Duelo en el ordenador con la pantalla apaisada: una vista para los dos, sin partir
export const sharedDuel = () => PC && window.innerWidth > window.innerHeight;

if (PC) {
    const root = document.documentElement;
    root.classList.add('pc');
    const apply = () => root.style.setProperty('--ui', uiScale());
    apply();
    window.addEventListener('resize', apply);
}
