// --- ANALÍTICAS (PostHog, región EU) ---
// Eventos de juego anónimos para entender cómo se juega: el funnel (tutorial → partidas →
// campaña → modo difícil), qué modos, objetos y skins se usan más y cuáles menos.
// Solo en la web publicada (nunca en local ni en el dispositivo del autor) y solo si el
// jugador dice que SÍ en el aviso del menú (o en Ajustes). Sin datos personales: un
// identificador anónimo por navegador. Mientras no contesta, los eventos esperan en memoria
// (nada sale del navegador ni se guarda); si dice que NO, se tiran. La librería la descarga el navegador aparte (no frena el arranque) y,
// mientras llega, los eventos esperan en la cola del propio stub.
const KEY = 'phc_xnbbVrZbqhjzk6GfeLxopJHkhtxFFXAxM96symjc2snN'; // clave pública (va en la web por diseño)
// Se envía a través de la propia web (/ingest → PostHog EU, ver vercel.json) para que los
// bloqueadores no se coman los eventos
const HOST = '/ingest';
const UI_HOST = 'https://eu.posthog.com';

import { Settings } from './Settings.js';
import { DEV } from './Dev.js';

// Si en esta web se pueden pedir las estadísticas (la publicada, no el móvil del autor)
export const analyticsAvailable = () => location.protocol === 'https:' && !['localhost', '127.0.0.1'].includes(location.hostname) && !DEV;

let ph = null;
let base = null;    // propiedades comunes (llegan con initAnalytics)
let pending = [];   // eventos a la espera de que conteste el aviso

// Prepara las analíticas. props: propiedades que van en todos los eventos. Solo arranca
// PostHog si ya hay permiso.
export function initAnalytics(props = {}) {
    base = props;
    if (Settings.analytics === true) start();
}

// La respuesta del jugador (aviso del menú o Ajustes)
export function setAnalyticsConsent(on) {
    Settings.set('analytics', on);
    if (on) {
        start();
        return;
    }
    pending = [];
    if (!ph) return;
    // Dejar de enviar y borrar el identificador anónimo que PostHog guardó
    try {
        if (window.posthog && window.posthog.opt_out_capturing) window.posthog.opt_out_capturing();
        for (const k of Object.keys(localStorage)) if (k.startsWith('ph_')) localStorage.removeItem(k);
        document.cookie = `ph_${KEY}_posthog=; Max-Age=0; path=/`;
    } catch {
        /* nada */
    }
    ph = null;
}

function start() {
    if (ph || !base || !analyticsAvailable()) return;
    // Ya cargada en esta visita (dijo NO y luego SÍ en Ajustes): volver a encenderla
    if (window.posthog && window.posthog.__loaded) {
        ph = window.posthog;
        ph.opt_in_capturing();
        flush();
        return;
    }
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
    flush();
}

// Lo que pasó antes de contestar (el tutorial de la primera vez, por ejemplo)
function flush() {
    const list = pending;
    pending = [];
    for (const [event, props] of list) track(event, props);
}

// Un evento de juego (si las analíticas no están activas, no hace nada)
export function track(event, props) {
    if (!ph) {
        if (Settings.analytics === null && analyticsAvailable() && pending.length < 200) pending.push([event, props]);
        return;
    }
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
