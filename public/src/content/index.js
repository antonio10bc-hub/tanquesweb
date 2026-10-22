export { TANKS } from './tanks.js';
export { WEAPONS } from './weapons.js';
export { THEMES } from './themes.js';
export { TILES } from './tiles.js';
export { LEVELS, FIRST_LEVEL, SURVIVAL } from './levels.js';
export { PICKUPS, PICKUP_RULES } from './pickups.js';
export { SKINS, SKIN_BY_ID, GOLD_SPARKS, PAINTS, TRAILS, PAINT_BY_ID, TRAIL_BY_ID } from './skins.js';
export { ACHIEVEMENTS } from './achievements.js';
export { WORLDS, WORLD_BY_ID, MIX_ORDER } from './campaign.js';

// La campaña registra sus jefes (y el dron) como tanques y cada mundo como un nivel.
import { TANKS as _tanks } from './tanks.js';
import { LEVELS as _levels } from './levels.js';
import { WORLDS as _worlds, MINIONS, bossLevel } from './campaign.js';
for (const w of _worlds) {
    _tanks[`boss_${w.id}`] = w.tank;
    _levels[`boss_${w.id}`] = bossLevel(w);
}
Object.assign(_tanks, MINIONS);

// Acceso con error legible cuando un id de contenido no existe.
export function getDef(table, id, kind) {
    const def = table[id];
    if (!def) throw new Error(`[contenido] ${kind} desconocido: "${id}"`);
    return def;
}
