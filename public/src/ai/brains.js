import { PlayerBrain } from './PlayerBrain.js';
import { HunterBrain } from './HunterBrain.js';
import { BossBrain } from './BossBrain.js';

// Registro de cerebros. Un cerebro solo rellena tank.intent ({x, z}) cada paso;
// las reglas (disparar al parar, visibilidad...) son iguales para todos.
// Para una IA nueva: crea la clase y regístrala aquí; luego úsala en un nivel por id.
export const BRAINS = {
    player: (params, ctx) => new PlayerBrain(ctx.input),
    hunter: (params) => new HunterBrain(params),
    boss: (params) => new BossBrain(params),
};

export function createBrain(id, params, ctx) {
    const factory = BRAINS[id];
    if (!factory) throw new Error(`[ia] cerebro desconocido: "${id}"`);
    return factory(params || {}, ctx);
}
