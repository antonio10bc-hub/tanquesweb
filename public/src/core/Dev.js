// Herramientas de desarrollo (el triple toque sobre tu barra de vida para ganar al momento).
// Solo existen en el dispositivo del autor: se activan una vez abriendo el juego con
// ?dev=tanqueloco y se quedan guardadas en ese navegador (aparte del progreso, así que
// borrar el progreso no las quita). ?dev=off las apaga. En localhost están siempre.
const KEY = 'tankless.dev';
const CODE = 'tanqueloco';

function read() {
    let on = false, changed = null;
    try {
        const url = new URL(location.href);
        const p = url.searchParams.get('dev');
        if (p === CODE) localStorage.setItem(KEY, '1'), (changed = true);
        else if (p === 'off') localStorage.removeItem(KEY), (changed = false);
        if (p !== null) {
            url.searchParams.delete('dev');
            history.replaceState(null, '', url.pathname + url.search + url.hash);
        }
        on = localStorage.getItem(KEY) === '1';
    } catch {
        /* sin almacenamiento */
    }
    if (['localhost', '127.0.0.1'].includes(location.hostname)) on = true;
    return { on, changed };
}

const state = read();
export const DEV = state.on;
// true/false si esta carga acaba de encenderlas o apagarlas (para avisar), si no null
export const DEV_CHANGED = state.changed;

// Panel de depuración: todo gratis en Mi Tanque
const FREE_KEY = 'tankless.devfree';
export function devFree() {
    try {
        return localStorage.getItem(FREE_KEY) === '1';
    } catch {
        return false;
    }
}
export function setDevFree(on) {
    try {
        if (on) localStorage.setItem(FREE_KEY, '1');
        else localStorage.removeItem(FREE_KEY);
    } catch {
        /* sin almacenamiento */
    }
}
