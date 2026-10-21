import { randInt } from '../core/math.js';

const DEFAULTS = {
    dodge: 0.5,         // probabilidad de esquivar una bala que viene directa
    burst: [2, 3],      // disparos por ráfaga antes de recolocarse (nunca más de los que quedan)
    range: [3, 6.5],    // distancia a la que le gusta pelear
    memory: 3,          // segundos que persigue una pista antigua antes de patrullar
    greed: 0.85,        // probabilidad de ir a por un objeto que le sirve
};

// IA "cazadora" al estilo Archero: se recoloca, se planta, suelta una ráfaga y vuelve a moverse.
// Juega con las mismas reglas: solo conoce tu posición cuando te ve (disparas, te dan o estás cerca).
export class HunterBrain {
    constructor(params) {
        this.p = { ...DEFAULTS, ...params };
        this.state = 'think';
        this.timer = 0;
        this.path = null;
        this.step = 0;
        this.dodgeCd = 0;
        this.dir = { x: 0, z: 0 };
        this.considered = 0;  // último objeto evaluado (se decide una vez por objeto)
        this.chasing = 0;     // objeto al que va ahora mismo
    }

    update(tank, dt, world) {
        const intent = tank.intent;
        this.timer -= dt;
        this.dodgeCd -= dt;

        if (this.state !== 'dodge' && this.dodgeCd <= 0) {
            const threat = world.bullets.findThreat(tank, 3);
            if (threat) {
                this.dodgeCd = 0.6;
                if (Math.random() < this.p.dodge) this.startDodge(tank, threat, world);
            }
        }

        this.updatePickups(tank, world);

        switch (this.state) {
            case 'attack':
                intent.x = intent.z = 0;
                if (this.timer <= 0) this.think(tank, world, true);
                break;
            case 'dodge':
                intent.x = this.dir.x;
                intent.z = this.dir.z;
                if (this.timer <= 0) this.think(tank, world, false);
                break;
            case 'move':
                if (!this.followPath(tank) || this.timer <= 0) this.arrive(tank, world);
                break;
            default:
                this.think(tank, world, false);
        }
    }

    think(tank, world, justAttacked) {
        const target = this.freshTarget(tank);
        const arena = world.arena;
        if (target && !justAttacked && target.visible && tank.reloading === 0) {
            const d = Math.hypot(target.x - tank.x, target.z - tank.z);
            if (d <= this.p.range[1] && arena.hasLOS(tank.x, tank.z, target.x, target.z)) {
                this.attack(tank);
                return;
            }
        }
        const goal = target ? this.pickSpot(tank, target, arena) : arena.randomFloorNear(tank.x, tank.z, 3, 9);
        this.goTo(tank, goal, arena);
    }

    arrive(tank, world) {
        const target = this.freshTarget(tank);
        // Pararse sin balas solo serviría para quedarse quieto y visible: mejor seguir moviéndose.
        if (target && tank.reloading === 0) this.attack(tank);
        else this.think(tank, world, false);
    }

    // Quedarse quieto = disparar (regla del tanque). Duración = nº de disparos de la ráfaga.
    attack(tank) {
        const w = tank.weapon;
        const shots = Math.min(tank.ammo, randInt(this.p.burst[0], this.p.burst[1]));
        this.state = 'attack';
        this.timer = Math.max(tank.cooldown, w.firstShotDelay) + (shots - 1) * w.interval + 0.08;
        tank.intent.x = tank.intent.z = 0;
    }

    freshTarget(tank) {
        const t = tank.pickTarget();
        return t && (t.visible || t.age < this.p.memory) ? t : null;
    }

    // Elige un punto cercano con línea de tiro y a buena distancia del objetivo.
    pickSpot(tank, target, arena) {
        const [near, far] = this.p.range;
        const mid = (near + far) / 2;
        let best = null, bestScore = -Infinity;
        for (let k = 0; k < 14; k++) {
            const p = arena.randomFloorNear(tank.x, tank.z, 1.2, 4.5);
            if (!p) continue;
            const dT = Math.hypot(p.x - target.x, p.z - target.z);
            let s = arena.hasLOS(p.x, p.z, target.x, target.z) ? 3 : 0;
            s -= Math.abs(dT - mid) * 0.6;
            if (dT < near * 0.7) s -= 3;
            s -= Math.hypot(p.x - tank.x, p.z - tank.z) * 0.15;
            s += Math.random() * 0.8;
            if (s > bestScore) {
                bestScore = s;
                best = p;
            }
        }
        return best;
    }

    goTo(tank, goal, arena) {
        this.path = goal ? arena.findPath(tank.x, tank.z, goal.x, goal.z) : null;
        this.step = 0;
        this.state = 'move';
        this.timer = this.path ? this.path.length / tank.speed + 1 : 0.3;
        if (!this.path) {
            // Sin camino: un pequeño paso aleatorio para no quedarse quieto (y delatarse).
            const a = Math.random() * Math.PI * 2;
            this.path = [{ x: tank.x + Math.sin(a), z: tank.z + Math.cos(a) }];
        }
    }

    followPath(tank) {
        while (this.step < this.path.length) {
            const n = this.path[this.step];
            const dx = n.x - tank.x, dz = n.z - tank.z, d = Math.hypot(dx, dz);
            if (d < 0.2) {
                this.step++;
                continue;
            }
            tank.intent.x = dx / d;
            tank.intent.z = dz / d;
            return true;
        }
        tank.intent.x = tank.intent.z = 0;
        return false;
    }

    // Ir a por un objeto si le sirve, llega a tiempo y no está claramente más lejos que el rival.
    updatePickups(tank, world) {
        const item = world.pickups && world.pickups.current;
        if (this.chasing && (!item || item.id !== this.chasing)) {
            this.chasing = 0;
            if (this.state === 'move') this.think(tank, world, false);
        }
        if (!item || this.state === 'dodge' || this.considered === item.id) return;
        this.considered = item.id;

        const useful = item.def.heal ? tank.hp < tank.maxHp : tank.damageMult === 1;
        if (!useful || Math.random() > this.p.greed) return;
        const path = world.arena.findPath(tank.x, tank.z, item.x, item.z);
        if (!path) return;
        const eta = path.length / tank.speed;
        if (eta > world.pickups.rules.lifetime - item.life - 0.2) return;
        const target = tank.pickTarget();
        const desperate = item.def.heal && tank.hp <= tank.maxHp / 2;
        if (target && target.visible && !desperate) {
            const mine = Math.hypot(item.x - tank.x, item.z - tank.z);
            const theirs = Math.hypot(item.x - target.x, item.z - target.z);
            if (mine > theirs + 1.5) return;
        }
        this.path = path;
        this.step = 0;
        this.state = 'move';
        this.timer = eta + 1;
        this.chasing = item.id;
    }

    startDodge(tank, threat, world) {
        let px = -threat.dz, pz = threat.dx;
        if ((tank.x - threat.x) * px + (tank.z - threat.z) * pz < 0) { px = -px; pz = -pz; }
        if (world.arena.solidAt(tank.x + px * 0.8, tank.z + pz * 0.8)) { px = -px; pz = -pz; }
        this.dir.x = px;
        this.dir.z = pz;
        this.state = 'dodge';
        this.timer = 0.3;
    }
}
