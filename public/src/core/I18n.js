// Idioma del juego: inglés por defecto y español si el navegador está en español (cualquiera
// de sus idiomas preferidos) o si la zona horaria es de España. Se decide una vez al cargar.
//   L('ENGLISH', 'ESPAÑOL')  → el texto en el idioma activo (el inglés va primero: es el de base)
//   En index.html el texto escrito es el inglés y el español va en data-es (o data-es-aria)
const SPAIN_TZ = ['Europe/Madrid', 'Africa/Ceuta', 'Atlantic/Canary'];

function detect() {
    try {
        const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
        if (langs.some((l) => l && l.toLowerCase().startsWith('es'))) return 'es';
    } catch {
        /* sin navigator */
    }
    try {
        if (SPAIN_TZ.includes(Intl.DateTimeFormat().resolvedOptions().timeZone)) return 'es';
    } catch {
        /* sin Intl */
    }
    return 'en';
}

export const LANG = detect();
export const L = (en, es) => (LANG === 'es' ? es : en);

// Textos fijos de la página (index.html)
export function applyHtmlTexts(root = document) {
    document.documentElement.lang = LANG;
    if (LANG !== 'es') return;
    for (const el of root.querySelectorAll('[data-es]')) el.innerHTML = el.dataset.es;
    for (const el of root.querySelectorAll('[data-es-aria]')) el.setAttribute('aria-label', el.dataset.esAria);
}
