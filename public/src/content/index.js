export { TANKS } from './tanks.js';
export { WEAPONS } from './weapons.js';
export { THEMES } from './themes.js';
export { TILES } from './tiles.js';
export { LEVELS, FIRST_LEVEL, SURVIVAL } from './levels.js';
export { PICKUPS, PICKUP_RULES } from './pickups.js';
export { SKINS, SKIN_BY_ID, GOLD_SPARKS } from './skins.js';
export { ACHIEVEMENTS } from './achievements.js';

// Acceso con error legible cuando un id de contenido no existe.
export function getDef(table, id, kind) {
    const def = table[id];
    if (!def) throw new Error(`[contenido] ${kind} desconocido: "${id}"`);
    return def;
}
