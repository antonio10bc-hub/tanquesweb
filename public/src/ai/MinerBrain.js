import { HunterBrain } from './HunterBrain.js';

const MINE = { every: 3.2, max: 3, arm: 0.9, life: 16, trigger: 0.45, delay: 0.45, r: 1.05, dmg: 1 };

// MINADOR de supervivencia: pelea como la IA cazadora y, mientras se mueve, va soltando minas
// detrás de él (como mucho unas pocas a la vez, para que la arena no se llene).
export class MinerBrain extends HunterBrain {
    constructor(params) {
        super(params);
        this.mineCd = 1.5 + Math.random() * 1.5;
    }

    update(tank, dt, world) {
        super.update(tank, dt, world);
        this.mineCd -= dt;
        if (this.mineCd > 0 || !tank.moving) return;
        const mine = world.hazards.list.filter((h) => h.kind === 'mine' && h.owner === tank).length;
        if (mine >= MINE.max) return;
        this.mineCd = MINE.every * (0.8 + Math.random() * 0.4);
        const x = tank.x - Math.sin(tank.yaw) * 0.55, z = tank.z - Math.cos(tank.yaw) * 0.55;
        if (world.arena.solidAt(x, z)) return;
        world.hazards.add({ kind: 'mine', owner: tank, x, z, color: 0xff2a2a, style: 'mine', ...MINE });
    }
}
