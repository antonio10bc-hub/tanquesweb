// --- ANALÍTICAS (PostHog, región EU) ---
// Eventos de juego anónimos para entender cómo se juega: el funnel (tutorial → partidas →
// campaña → modo difícil), qué modos, objetos y skins se usan más y cuáles menos.
// Solo en la web publicada (nunca en local). Sin datos personales: un identificador anónimo
// por navegador. La librería la descarga el navegador aparte (no frena el arranque) y,
// mientras llega, los eventos esperan en la cola del propio stub.
const KEY = 'phc_xnbbVrZbqhjzk6GfeLxopJHkhtxFFXAxM96symjc2snN'; // clave pública (va en la web por diseño)
// Se envía a través de la propia web (/ingest → PostHog EU, ver vercel.json) para que los
// bloqueadores no se coman los eventos
const HOST = '/ingest';
const UI_HOST = 'https://eu.posthog.com';

const enabled = () => location.protocol === 'https:' && !['localhost', '127.0.0.1'].includes(location.hostname);

let ph = null;

// Arranca PostHog (una vez). base: propiedades que van en todos los eventos.
export function initAnalytics(base = {}) {
    if (ph || !enabled()) return;
    // Stub: guarda las llamadas en una cola que la librería ejecuta al cargar (como el snippet oficial)
    const stub = [];
    for (const m of ['capture', 'register']) stub[m] = (...args) => stub.push([m, ...args]);
    stub.people = [];
    stub._i = [[KEY, {
        api_host: HOST,
        ui_host: UI_HOST,
        // Solo lo que mandamos a mano: los clics automáticos no dicen nada en un canvas de juego
        autocapture: false,
        capture_pageview: true,
        capture_pageleave: true,
        disable_session_recording: true,
        person_profiles: 'identified_only',
    }]];
    window.posthog = ph = stub;
    ph.register({ app: 'tankless', ...base });
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = `${HOST}/static/array.js`;
    document.head.appendChild(s);
}

// Un evento de juego (si las analíticas no están activas, no hace nada)
export function track(event, props) {
    if (!ph) return;
    try {
        // Tras cargar, window.posthog es ya la librería de verdad; si no llega nunca (sin
        // conexión, bloqueada), la cola no crece sin límite
        const lib = window.posthog || ph;
        if (lib === ph && ph.length > 300) return;
        lib.capture(event, props);
    } catch {
        /* las analíticas nunca rompen el juego */
    }
}
