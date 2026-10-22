import { PICKUPS, PICKUP_RULES } from '../content/index.js';

// Un único objeto a la vez: aparece, dura "lifetime" y salta a otro sitio.
// Nunca aparece pegado a un tanque y, si puede, a distancia parecida de los dos bandos.
export class PickupSpawner {
    constructor(rules, events) {
        this.rules = { ...PICKUP_RULES, ...rules };
        this.events = events;
        this.current = null;
        this.timer = this.rules.firstDelay;
        this.last = null;
        this.nextId = 1;
        this.weights = this.rules.kinds;
        this.kinds = Object.keys(this.weights);
        for (const k of this.kinds) if (!PICKUPS[k]) throw new Error(`[objetos] tipo desconocido: "${k}"`);
    }

    step(dt, world) {
        const cur = this.current;
        if (!cur) {
            this.timer -= dt;
            if (this.timer <= 0) this.spawn(world);
            return;
        }
        cur.life += dt;
        for (const t of world.tanks) {
            if (!t.alive || t.decoy) continue;
            const r = t.radius + this.rules.radius;
            if ((t.x - cur.x) ** 2 + (t.z - cur.z) ** 2 < r * r) {
                t.applyPickup(cur.def);
                if (cur.def.decoy) world.spawnDecoy(t, cur.def.decoy);
                this.remove(this.rules.respawnDelay);
                this.events.emit('pickup', t, cur);
                return;
            }
        }
        if (cur.life >= this.rules.lifetime) {
            this.remove(this.rules.swapDelay);
            this.events.emit('pickupExpired', cur);
        }
    }

    remove(delay) {
        this.last = this.current;
        this.current = null;
        this.timer = delay;
    }

    spawn(world) {
        const spot = this.findSpot(world);
        if (!spot) {
            this.timer = 0.5;
            return;
        }
        const kind = this.pickKind();
        this.current = { id: this.nextId++, kind, def: PICKUPS[kind], x: spot.x, z: spot.z, life: 0 };
        this.events.emit('pickupSpawn', this.current);
    }

    // Nunca el mismo tipo dos veces seguidas (si el arquetipo tiene más de uno).
    pickKind() {
        const prev = this.last && this.last.kind;
        const kinds = this.kinds.length > 1 ? this.kinds.filter((k) => k !== prev) : this.kinds;
        let x = Math.random() * kinds.reduce((s, k) => s + this.weights[k], 0);
        for (const k of kinds) if ((x -= this.weights[k]) < 0) return k;
        return kinds[0];
    }

    findSpot(world) {
        const { arena, tanks } = world;
        const r = this.rules;
        const alive = tanks.filter((t) => t.alive && !t.decoy);
        const player = alive.find((t) => t.team === 'player');
        const valid = [], fair = [];
        for (let row = 0; row < arena.rows; row++) {
            for (let c = 0; c < arena.cols; c++) {
                if (arena.isSolid(c, row)) continue;
                const x = c + 0.5, z = row + 0.5;
                let near = Infinity, enemy = Infinity;
                for (const t of alive) {
                    const d = Math.hypot(t.x - x, t.z - z);
                    near = Math.min(near, d);
                    if (t.team !== 'player') enemy = Math.min(enemy, d);
                }
                if (near < r.minTankDist) continue;
                if (this.last && Math.hypot(this.last.x - x, this.last.z - z) < r.minPrevDist) continue;
                valid.push({ x, z });
                if (!player || enemy === Infinity || Math.abs(Math.hypot(player.x - x, player.z - z) - enemy) <= r.fairness) {
                    fair.push({ x, z });
                }
            }
        }
        const pool = fair.length ? fair : valid;
        return pool.length ? pool[(Math.random() * pool.length) | 0] : null;
    }
}
