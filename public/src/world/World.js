import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { TANKS, SKIN_BY_ID, PAINT_BY_ID, TRAIL_BY_ID, getDef } from '../content/index.js';
import { createBrain } from '../ai/brains.js';
import { TankModel } from '../render/TankModel.js';
import { Arena } from './Arena.js';
import { Tank } from './Tank.js';
import { generateArena } from './MapGen.js';
import { PickupSpawner } from './Pickups.js';
import { Hazards } from './Hazards.js';

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
        // Las casillas especiales (hielo, teletransportes, barriles) las pone el tema
        const generated = def.generator ? generateArena({ ...def.generator, ...theme.specials }, ctx.seed) : null;
        this.seed = generated ? generated.seed : null;
        this.arena = new Arena(generated ? generated.map : def.map);
        this.arena.build(this.root, theme);
        this.tanks = [];
        this.nukes = []; // bombas en el aire
        this.hazards = new Hazards(this); // ataques especiales de los jefes
        this.nextNukeId = 1;
        this.forceReveal = true;

        // def.pickups: false para desactivarlos, o un objeto que sobreescribe PICKUP_RULES.
        this.pickups = def.pickups === false ? null : new PickupSpawner(def.pickups || {}, this.events);
        this.name = def.name;

        this.player = this.spawn(def.player, 'player', 'player');
        for (const e of def.enemies) this.spawn(e, 'enemy', e.brain);
    }

    spawn(spec, team, brainId, at) {
        let def = getDef(TANKS, spec.tank, 'tanque');
        // La skin equipada solo la lleva el jugador; el dorado también tiñe sus balas
        const mine = team === 'player' && !spec.noSkin;
        const skin = mine ? SKIN_BY_ID[this.ctx.skin] || null : null;
        const paint = mine ? PAINT_BY_ID[this.ctx.paint] : null;
        if (paint && paint.palette) def = { ...def, palette: { ...def.palette, ...paint.palette } };
        if (skin && skin.palette) def = { ...def, palette: { ...def.palette, ...skin.palette } };
        if (spec.hp) def = { ...def, hp: spec.hp };
        if (spec.speed) def = { ...def, speed: spec.speed };
        at = at || this.arena.takeSpawn(spec.spawn);
        const tank = new Tank(def, team, at.x, at.z, createBrain(brainId, spec.params, this.ctx));
        if (mine) tank.trail = (TRAIL_BY_ID[this.ctx.trail] || {}).style || null;
        const opts = def.boss ? { scale: def.scale, deco: def.deco, rainbow: def.rainbow, noBar: true } : {};
        tank.model = new TankModel(def.palette, this.theme.outline, tank.weapon.magazine, skin, opts);
        tank.model.addTo(this.root);
        for (const other of this.tanks) {
            if (other.team === team) continue;
            other.know(tank);
            tank.know(other);
        }
        this.tanks.push(tank);
        return tank;
    }

    // Casilla libre lejos del jugador y de los demás enemigos (para las oleadas).
    farSpot(minDist) {
        const a = this.arena, p = this.player, out = [];
        for (let r = 1; r < a.rows - 1; r++) for (let c = 1; c < a.cols - 1; c++) {
            if (a.isSolid(c, r)) continue;
            const x = c + 0.5, z = r + 0.5;
            if (Math.hypot(x - p.x, z - p.z) < minDist) continue;
            if (this.tanks.some((t) => t.alive && t !== p && Math.hypot(t.x - x, t.z - z) < 2)) continue;
            out.push({ x, z });
        }
        if (!out.length) return minDist > 2 ? this.farSpot(minDist - 1.5) : { x: p.x, z: 1.5 };
        return out[(Math.random() * out.length) | 0];
    }

    enemies() {
        return this.tanks.filter((t) => t.team !== 'player' && !t.decoy);
    }

    aliveEnemies() {
        let n = 0;
        for (const t of this.tanks) if (t.team !== 'player' && t.alive && !t.decoy) n++;
        return n;
    }

    // Señuelo: una copia idéntica del tanque, quieta, que se delata sin parar (los rivales la
    // ven desde cualquier sitio y van a por ella). Un impacto o el tiempo la deshacen.
    spawnDecoy(owner, spec) {
        const d = new Tank({ ...owner.def, hp: 1 }, owner.team, owner.x, owner.z, createBrain('decoy', spec, this.ctx));
        d.decoy = true;
        d.yaw = owner.yaw;
        d.aimYaw = owner.aimYaw;
        d.model = new TankModel(owner.def.palette, this.theme.outline, d.weapon.magazine, owner.model.skin);
        d.model.addTo(this.root);
        for (const other of this.tanks) {
            if (other.team === d.team) continue;
            other.know(d);
            d.know(other);
        }
        this.tanks.push(d);
        this.events.emit('decoy', d, owner);
        return d;
    }

    popDecoy(d) {
        if (!d.alive) return;
        d.alive = false;
        d.hp = 0;
        this.events.emit('decoyPop', d);
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
        // Los tanques grandes (jefes) se ven desde más lejos
        const p = (target.inBush ? s.bushProximity : s.proximity) + Math.max(0, target.radius - 0.36);
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
            this.rams();
            this.teleport();
            this.hazards.step(dt);
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

    // Arrasa el radio: cualquier muro del interior, hierba y daño a cualquier tanque (también al que la lanzó).
    detonate(n) {
        const a = this.arena, R = n.radius;
        this.events.emit('nukeBoom', n);
        for (let r = Math.floor(n.z1 - R); r <= Math.floor(n.z1 + R); r++) {
            for (let c = Math.floor(n.x1 - R); c <= Math.floor(n.x1 + R); c++) {
                if (Math.hypot(c + 0.5 - n.x1, r + 0.5 - n.z1) > R) continue;
                const style = a.obliterate(c, r);
                if (style) this.events.emit('tileHit', c, r, 'broken', 0xffe600, style, n.owner);
                a.burnBush(c, r);
            }
        }
        for (const t of this.tanks) {
            if (!t.alive) continue;
            const dx = t.x - n.x1, dz = t.z - n.z1, d = Math.hypot(dx, dz);
            if (d > R + t.radius * 0.5) continue;
            this.hitTank(t, n.owner, n.damage, d > 0.01 ? dx / d : 0, d > 0.01 ? dz / d : 1, t.x, t.z, 0xffe600, 'nuke');
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

    // Teletransportes: al pisar uno apareces en su pareja. Para volver a usarlo hay que salir.
    teleport() {
        for (const t of this.tanks) {
            if (!t.alive) continue;
            const pad = this.arena.teleportAt(t.x, t.z);
            if (!pad) {
                t.tpLock = null;
                continue;
            }
            if (t.tpLock === pad) continue;
            const to = pad.to;
            const from = { x: t.x, z: t.z };
            t.x = to.x;
            t.z = to.z;
            t.tpLock = to;
            this.arena.resolveCircle(t, t.radius);
            this.events.emit('teleport', t, from, to);
        }
    }

    // Barril explosivo: daña a los tanques cercanos, rompe los muros rompibles de alrededor y
    // hace estallar en cadena a otros barriles.
    explodeBarrel(c, r, owner) {
        const a = this.arena, x = c + 0.5, z = r + 0.5, R = 1.6;
        this.events.emit('barrelBoom', x, z, R);
        for (const t of this.tanks) {
            if (!t.alive) continue;
            const d = Math.hypot(t.x - x, t.z - z);
            if (d > R + t.radius * 0.5) continue;
            this.hitTank(t, owner, 1, d > 0.01 ? (t.x - x) / d : 0, d > 0.01 ? (t.z - z) / d : 1, t.x, t.z, 0xff9a1f, 'barrel');
        }
        for (let rr = r - 1; rr <= r + 1; rr++) for (let cc = c - 1; cc <= c + 1; cc++) {
            if (cc === c && rr === r) continue;
            const style = a.styleAt(cc, rr);
            const res = a.damageTile(cc, rr, 9);
            if (!res) continue;
            this.events.emit('tileHit', cc, rr, res, 0xff9a1f, style, owner);
            if (res === 'broken' && style === 'barrel') this.explodeBarrel(cc, rr, owner);
        }
    }

    // Embestida: un jefe a la carga golpea una vez a cada rival con el que choca.
    rams() {
        for (const a of this.tanks) {
            if (!a.alive || a.chargeT <= 0) continue;
            a.rammed ||= new Set();
            for (const b of this.tanks) {
                if (!b.alive || b.team === a.team || a.rammed.has(b)) continue;
                const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
                if (d > a.radius + b.radius + 0.12) continue;
                a.rammed.add(b);
                const ux = d > 0.01 ? dx / d : 0, uz = d > 0.01 ? dz / d : 1;
                this.hitTank(b, a, 1, ux, uz, b.x, b.z, a.def.palette.accent, 'ram');
                // El golpe lo aparta del camino
                b.x += ux * 0.5;
                b.z += uz * 0.5;
                this.arena.resolveCircle(b, b.radius);
            }
        }
    }

    // cause: 'bullet' | 'bounce' | 'nuke' | 'ram' | 'hazard' (para los logros)
    hitTank(tank, owner, damage, dirX, dirZ, x, z, color, cause = 'bullet') {
        if (tank.decoy) return this.popDecoy(tank);
        const dealt = tank.damage(damage, dirX, dirZ, this);
        if (!dealt) {
            this.events.emit('shieldBreak', tank, x, z);
            return;
        }
        this.events.emit('hit', tank, x, z, color, damage);
        if (!tank.alive) this.events.emit('death', tank, owner, cause);
    }

    dispose() {
        for (const t of this.tanks) t.model.dispose();
        this.arena.dispose();
        this.root.removeFromParent();
    }
}
