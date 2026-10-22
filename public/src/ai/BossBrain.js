import { HunterBrain } from './HunterBrain.js';
import { ATTACKS } from './bossAttacks.js';
import { WORLDS, MIX_ORDER } from '../content/index.js';

// Jefe de la campaña: pelea como la IA cazadora (se recoloca, se planta y dispara) y cada
// pocos segundos anuncia su ataque especial, quieto y visible, antes de lanzarlo.
// A mitad de vida se enfada (fase 2): ruge, va más rápido y ataca más fuerte y más a menudo.
export class BossBrain extends HunterBrain {
    constructor(params) {
        super({ dodge: 0.25, burst: [2, 4], range: [3.5, 7.5], greed: 0.5, ambush: 0.4, ...params });
        this.every = params.every || 1; // multiplica la espera entre especiales (dificultad del mundo)
        this.special = params.attack;  // ("attack" ya es el método de disparar de la IA cazadora)
        this.cd = 3.5;       // el primer especial llega pronto
        this.phase = 1;
        this.cast = null;    // { t, attack } mientras lo anuncia
        this.busy = 0;       // se queda quieto mientras dura (el láser)
        this.charge = null;  // embestida en curso
        this.rage = 0;       // rugido al pasar a fase 2
        this.queue = [];     // acciones con retraso
        this.mix = 0;        // PRISMA: siguiente ataque prestado
    }

    later(t, fn) {
        this.queue.push({ t, fn });
    }

    update(tank, dt, world) {
        for (let i = this.queue.length - 1; i >= 0; i--) {
            const q = this.queue[i];
            if ((q.t -= dt) <= 0) {
                this.queue.splice(i, 1);
                q.fn();
            }
        }
        if (this.phase === 1 && tank.hp <= tank.maxHp / 2) return this.enrage(tank, world);
        if (this.rage > 0) {
            this.rage -= dt;
            this.hold(tank);
            if (this.rage <= 0) this.cd = 1.5; // un respiro tras la escena antes del primer especial furioso
            return;
        }
        if (this.charge) return this.updateCharge(tank, dt, world);
        if (this.cast) {
            this.cast.t -= dt;
            this.hold(tank);
            tank.reveal = Math.max(tank.reveal, 0.4);
            if (this.cast.t <= 0) {
                const a = this.cast.attack;
                this.cast = null;
                ATTACKS[a.id](tank, world, a, this, this.phase === 2);
                world.events.emit('bossAttack', tank, a);
            }
            return;
        }
        if (this.busy > 0) {
            this.busy -= dt;
            this.hold(tank);
            return;
        }
        this.cd -= dt;
        if (this.cd <= 0 && tank.pickTarget()) return this.startCast(tank, world);
        super.update(tank, dt, world);
    }

    // Quieto y sin disparar (anunciando, rugiendo o con el láser encendido).
    hold(tank) {
        tank.intent.x = tank.intent.z = 0;
        tank.cooldown = Math.max(tank.cooldown, 0.25);
    }

    startCast(tank, world) {
        let a = this.special;
        if (a.id === 'mix') {
            const id = MIX_ORDER[this.mix++ % MIX_ORDER.length];
            a = WORLDS.find((w) => w.attack.id === id).attack;
        }
        const own = this.special, p2 = this.phase === 2;
        this.cd = (p2 ? own.cooldown2 || own.cooldown * 0.68 : own.cooldown) * this.every;
        this.cast = { t: a.cast, attack: a };
        tank.reveal = Math.max(tank.reveal, a.cast + 0.8);
        this.state = 'think';
        world.events.emit('bossCast', tank, a);
    }

    enrage(tank, world) {
        this.phase = 2;
        this.rage = 0.4; // la escena de la fase 2 la monta Game (cámara, rugido, cartel)
        this.cast = null;
        this.charge = null;
        this.busy = 0;
        tank.chargeT = 0;
        tank.speed *= 1.18;
        tank.reveal = Math.max(tank.reveal, 2);
        this.hold(tank);
        world.events.emit('bossPhase', tank);
    }

    // ---------- Embestida ----------
    startCharge(tank, a, runs) {
        this.charge = { a, left: runs, t: 0, pause: 0 };
        this.aimCharge(tank);
    }

    aimCharge(tank) {
        const c = this.charge, t = tank.pickTarget();
        const ang = t ? Math.atan2(t.x - tank.x, t.z - tank.z) : tank.yaw;
        c.dx = Math.sin(ang);
        c.dz = Math.cos(ang);
        c.t = c.a.time;
        c.lx = tank.x;
        c.lz = tank.z;
        c.stuck = 0;
        tank.chargeT = c.a.time;
        tank.chargeMult = c.a.speed;
        tank.rammed = new Set();
        tank.reveal = Math.max(tank.reveal, c.a.time + 0.5);
    }

    updateCharge(tank, dt, world) {
        const c = this.charge;
        if (c.pause > 0) {
            this.hold(tank);
            if ((c.pause -= dt) <= 0) this.aimCharge(tank);
            return;
        }
        tank.intent.x = c.dx;
        tank.intent.z = c.dz;
        tank.cooldown = Math.max(tank.cooldown, 0.3);
        c.t -= dt;
        // Contra un muro: se para en seco
        const moved = Math.hypot(tank.x - c.lx, tank.z - c.lz);
        c.lx = tank.x;
        c.lz = tank.z;
        if (c.t < c.a.time - 0.15 && moved < tank.speed * c.a.speed * dt * 0.3) c.stuck += dt;
        const bumped = c.stuck > 0.06;
        if (c.t > 0 && !bumped) return;
        tank.chargeT = 0;
        if (bumped) world.events.emit('bossBump', tank);
        if (--c.left > 0) {
            c.pause = 0.5;
        } else {
            this.charge = null;
            this.state = 'think';
        }
    }
}
