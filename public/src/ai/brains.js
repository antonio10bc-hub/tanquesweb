import { PlayerBrain } from './PlayerBrain.js';
import { HunterBrain } from './HunterBrain.js';
import { BossBrain } from './BossBrain.js';
import { MinerBrain } from './MinerBrain.js';

// Registro de cerebros. Un cerebro solo rellena tank.intent ({x, z}) cada paso;
// las reglas (disparar al parar, visibilidad...) son iguales para todos.
// Para una IA nueva: crea la clase y regístrala aquí; luego úsala en un nivel por id.
export const BRAINS = {
    player: (params, ctx) => new PlayerBrain(ctx.input),
    player2: (params, ctx) => new PlayerBrain(ctx.input2), // duelo en un móvil
    hunter: (params) => new HunterBrain(params),
    boss: (params) => new BossBrain(params),
    miner: (params) => new MinerBrain(params),
    // Muñeco del tutorial: quieto, sin disparar y siempre a la vista
    dummy: () => ({
        update(tank) {
            tank.intent.x = tank.intent.z = 0;
            tank.cooldown = 99;
            tank.reveal = 99;
        },
    }),
    // Señuelo: quieto, sin disparar y delatándose hasta que se deshace
    decoy: (params) => ({
        life: params.life || 6,
        update(tank, dt, world) {
            tank.intent.x = tank.intent.z = 0;
            tank.cooldown = 99;
            tank.reveal = 99;
            if ((this.life -= dt) <= 0) world.popDecoy(tank);
        },
    }),
};

export function createBrain(id, params, ctx) {
    const factory = BRAINS[id];
    if (!factory) throw new Error(`[ia] cerebro desconocido: "${id}"`);
    return factory(params || {}, ctx);
}
