export { TANKS } from './tanks.js';
export { WEAPONS } from './weapons.js';
export { THEMES } from './themes.js';
export { TILES } from './tiles.js';
export { LEVELS, FIRST_LEVEL } from './levels.js';

// Acceso con error legible cuando un id de contenido no existe.
export function getDef(table, id, kind) {
    const def = table[id];
    if (!def) throw new Error(`[contenido] ${kind} desconocido: "${id}"`);
    return def;
}
