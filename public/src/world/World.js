import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { TANKS, getDef } from '../content/index.js';
import { createBrain } from '../ai/brains.js';
import { TankModel } from '../render/TankModel.js';
import { Arena } from './Arena.js';
import { Tank } from './Tank.js';
import { generateArena } from './MapGen.js';
import { PickupSpawner } from './Pickups.js';

// Una partida en curso: arena + tanques + reglas de visibilidad.
// No sabe nada de HUD, sonido ni cámara: comunica lo que pasa con eventos.
export class World {
    constructor(def, theme, ctx) {
        this.def = def;
        this.theme = theme;
        this.ctx = ctx;
        this.events = ctx.events;
        this.bullets = ctx.bullets;
        this.root = new THREE.Group();
        const generated = def.generator ? generateArena(def.generator, ctx.seed) : null;
        this.seed = generated ? generated.seed : null;
        this.arena = new Arena(generated ? generated.map : def.map);
        this.arena.build(this.root, theme);
        this.tanks = [];
        this.nukes = []; // bombas en el aire
        this.nextNukeId = 1;
        this.forceReveal = true;

        // def.pickups: false para desactivarlos, o un objeto que sobreescribe PICKUP_RULES.
        this.pickups = def.pickups === false ? null : new PickupSpawner(def.pickups || {}, this.events);
        this.name = def.name;

        this.player = this.spawn(def.player, 'player', 'player');
        for (const e of def.enemies) this.spawn(e, 'enemy', e.brain);
    }

    spawn(spec, team, brainId) {
        const def = getDef(TANKS, spec.tank, 'tanque');
        const at = this.arena.takeSpawn(spec.spawn);
        const tank = new Tank(def, team, at.x, at.z, createBrain(brainId, spec.params, this.ctx));
        tank.model = new TankModel(def.palette, this.theme.outline, tank.weapon.magazine);
        tank.model.addTo(this.root);
        for (const other of this.tanks) {
            if (other.team === team) continue;
            other.know(tank);
            tank.know(other);
        }
        this.tanks.push(tank);
        return tank;
    }

    enemies() {
        return this.tanks.filter((t) => t.team !== 'player');
    }

    aliveEnemies() {
        let n = 0;
        for (const t of this.tanks) if (t.team !== 'player' && t.alive) n++;
        return n;
    }

    // Reglas de visibilidad (iguales para jugador e IA):
    //  radar del observador > invisibilidad del objetivo > disparo reciente > cercanía
    //  (la hierba reduce la distancia a la que te ven y lo que dura el destello al disparar).
    canSee(observer, target) {
        if (this.forceReveal || observer.radar > 0) return true;
        const s = CONFIG.stealth;
        const dx = target.x - observer.x, dz = target.z - observer.z, d2 = dx * dx + dz * dz;
        if (target.cloak > 0) return d2 < s.cloakProximity ** 2;
        if (target.reveal > 0) return true;
        const p = target.inBush ? s.bushProximity : s.proximity;
        return d2 < p * p;
    }

    updateIntel(dt) {
        for (const a of this.tanks) {
            if (!a.alive) continue;
            for (const info of a.intel.values()) {
                const b = info.opp;
                if (b.alive && this.canSee(a, b)) {
                    info.x = b.x;
                    info.z = b.z;
                    info.visible = true;
                    info.age = 0;
                } else {
                    info.visible = false;
                    info.age += dt;
                }
            }
        }
    }

    step(dt, tanksActive = true) {
        this.updateIntel(dt);
        if (tanksActive) {
            for (const t of this.tanks) t.step(dt, this);
            this.separate();
            if (this.pickups) this.pickups.step(dt, this);
        }
        this.bullets.update(dt, this);
        this.updateNukes(dt);
    }

    launchNuke(owner, x0, z0, x1, z1, spec) {
        const a = this.arena;
        x1 = Math.min(a.cols - 0.5, Math.max(0.5, x1));
        z1 = Math.min(a.rows - 0.5, Math.max(0.5, z1));
        const nuke = { id: this.nextNukeId++, owner, x0, z0, x1, z1, t: 0, ...spec };
        this.nukes.push(nuke);
        this.events.emit('nukeLaunch', nuke);
    }

    updateNukes(dt) {
        for (let i = this.nukes.length - 1; i >= 0; i--) {
            const n = this.nukes[i];
            n.t += dt;
            if (n.t < n.flight) continue;
            this.nukes.splice(i, 1);
            this.detonate(n);
        }
    }

    // Arrasa el radio: muros rompibles, hierba y daño a cualquier tanque (también al que la lanzó).
    detonate(n) {
        const a = this.arena, R = n.radius;
        this.events.emit('nukeBoom', n);
        for (let r = Math.floor(n.z1 - R); r <= Math.floor(n.z1 + R); r++) {
            for (let c = Math.floor(n.x1 - R); c <= Math.floor(n.x1 + R); c++) {
                if (Math.hypot(c + 0.5 - n.x1, r + 0.5 - n.z1) > R) continue;
                const res = a.damageTile(c, r, 99);
                if (res) this.events.emit('tileHit', c, r, res, 0xffe600);
                a.burnBush(c, r);
            }
        }
        for (const t of this.tanks) {
            if (!t.alive) continue;
            const dx = t.x - n.x1, dz = t.z - n.z1, d = Math.hypot(dx, dz);
            if (d > R + t.radius * 0.5) continue;
            this.hitTank(t, n.owner, n.damage, d > 0.01 ? dx / d : 0, d > 0.01 ? dz / d : 1, t.x, t.z, 0xffe600);
        }
    }

    separate() {
        const list = this.tanks;
        for (let i = 0; i < list.length; i++) {
            const a = list[i];
            if (!a.alive) continue;
            for (let j = i + 1; j < list.length; j++) {
                const b = list[j];
                if (!b.alive) continue;
                const dx = b.x - a.x, dz = b.z - a.z, min = a.radius + b.radius;
                const d2 = dx * dx + dz * dz;
                if (d2 >= min * min || d2 < 1e-8) continue;
                const d = Math.sqrt(d2), push = (min - d) / (2 * d);
                a.x -= dx * push; a.z -= dz * push;
                b.x += dx * push; b.z += dz * push;
                this.arena.resolveCircle(a, a.radius);
                this.arena.resolveCircle(b, b.radius);
            }
        }
    }

    hitTank(tank, owner, damage, dirX, dirZ, x, z, color) {
        const dealt = tank.damage(damage, dirX, dirZ, this);
        if (!dealt) {
            this.events.emit('shieldBreak', tank, x, z);
            return;
        }
        this.events.emit('hit', tank, x, z, color, damage);
        if (!tank.alive) this.events.emit('death', tank, owner);
    }

    dispose() {
        for (const t of this.tanks) t.model.dispose();
        this.arena.dispose();
        this.root.removeFromParent();
    }
}
