// Peligros que crean los ataques especiales de los jefes. Solo simulación: los dibuja
// render/HazardView.js leyendo esta lista, y los efectos llegan por eventos.
// Nunca dañan al equipo de quien los crea (el jefe y sus drones).
//
//  strike  algo cae del cielo en (x, z): la sombra avisa durante "delay" y luego golpea en
//          un radio "r". Puede dejar una zona al caer (charco de lava, hielo...).
//  zone    círculo en el suelo durante "life": daña cada cierto tiempo (dmg) y/o frena (slow).
//          Con "chase" persigue la última posición conocida del rival del jefe.
//  wave    una ola cruza la arena de arriba abajo (dir 1) o al revés (dir -1). Los muros
//          protegen: si tienes uno justo delante, la ola te pasa por encima.
//  beam    rayo que sale del jefe y va girando; los muros lo cortan.
export class Hazards {
    constructor(world) {
        this.world = world;
        this.list = [];
        this.nextId = 1;
    }

    add(h) {
        h.id = this.nextId++;
        h.t = 0;
        h.hits = new Map(); // tanque -> segundos hasta poder volver a dañarle
        this.list.push(h);
        this.world.events.emit('hazard', h);
        return h;
    }

    clear() {
        this.list.length = 0;
    }

    step(dt) {
        for (let i = this.list.length - 1; i >= 0; i--) {
            const h = this.list[i];
            h.t += dt;
            for (const [tank, cd] of h.hits) h.hits.set(tank, cd - dt);
            if (this[h.kind](h, dt) === false) {
                this.list.splice(i, 1);
                this.world.events.emit('hazardEnd', h);
            }
        }
    }

    // Rivales del dueño del peligro que lo están tocando (y que aún pueden recibir daño).
    *victims(h, test) {
        for (const t of this.world.tanks) {
            if (!t.alive || t.frozen || t.team === h.owner.team) continue;
            if ((h.hits.get(t) ?? 0) > 0) continue;
            if (test(t)) yield t;
        }
    }

    hurt(h, t, dirX, dirZ, cooldown = 0.8) {
        h.hits.set(t, cooldown);
        this.world.hitTank(t, h.owner, h.dmg, dirX, dirZ, t.x, t.z, h.color || 0xffffff, 'hazard');
    }

    strike(h) {
        if (h.t < h.delay) return true;
        this.world.events.emit('hazardBoom', h);
        for (const t of this.victims(h, (t) => Math.hypot(t.x - h.x, t.z - h.z) < h.r + t.radius * 0.5)) {
            const d = Math.hypot(t.x - h.x, t.z - h.z) || 1;
            this.hurt(h, t, (t.x - h.x) / d, (t.z - h.z) / d);
        }
        if (h.zone) this.add({ kind: 'zone', owner: h.owner, x: h.x, z: h.z, ...h.zone });
        return false;
    }

    zone(h, dt) {
        if (h.t >= h.life) return false;
        if (h.chase) {
            const target = h.owner.alive ? h.owner.pickTarget() : null;
            if (target) {
                const dx = target.x - h.x, dz = target.z - h.z, d = Math.hypot(dx, dz);
                if (d > 0.05) {
                    h.x += (dx / d) * h.chase * dt;
                    h.z += (dz / d) * h.chase * dt;
                }
            }
            const a = this.world.arena;
            h.x = Math.min(a.cols - 1.5, Math.max(1.5, h.x));
            h.z = Math.min(a.rows - 1.5, Math.max(1.5, h.z));
        }
        const inside = (t) => Math.hypot(t.x - h.x, t.z - h.z) < h.r + t.radius * 0.4;
        if (h.slow) {
            for (const t of this.world.tanks) {
                if (t.alive && t.team !== h.owner.team && inside(t)) {
                    t.slowT = 0.15;
                    t.slowMult = h.slow;
                }
            }
        }
        // Las zonas tardan un momento en hacer daño: da tiempo a verlas y salir
        if (h.dmg && h.t > (h.arm ?? 0.4)) {
            for (const t of this.victims(h, inside)) {
                const d = Math.hypot(t.x - h.x, t.z - h.z) || 1;
                this.hurt(h, t, (t.x - h.x) / d, (t.z - h.z) / d, h.every || 0.9);
            }
        }
        return true;
    }

    wave(h, dt) {
        const a = this.world.arena;
        if (h.t < h.warn) return true;
        h.front += h.dir * h.speed * dt;
        if (h.front < -1 || h.front > a.rows + 1) return false;
        for (const t of this.victims(h, (t) => Math.abs(t.z - h.front) < 0.35 && !h.passed?.has(t))) {
            (h.passed ||= new Set()).add(t);
            // ¿Muro justo delante (por donde viene la ola)? Entonces te protege.
            const c = Math.floor(t.x), r = Math.floor(t.z);
            let sheltered = false;
            for (let k = 1; k <= 2 && !sheltered; k++) {
                const rr = r - h.dir * k;
                if (a.isSolid(c, rr) && !a.isBorder(c, rr)) sheltered = true;
            }
            if (sheltered) {
                this.world.events.emit('waveDodge', t);
                continue;
            }
            this.hurt(h, t, 0, h.dir, 10);
        }
        return true;
    }

    beam(h, dt) {
        const o = h.owner;
        if (!o.alive || h.t >= h.warn + h.time) return false;
        if (h.t >= h.warn) h.angle += h.turn * dt;
        const ux = Math.sin(h.angle), uz = Math.cos(h.angle);
        h.x = o.x + ux * o.radius * 0.9;
        h.z = o.z + uz * o.radius * 0.9;
        // Hasta dónde llega: el primer muro lo corta
        const a = this.world.arena;
        let len = 0;
        while (len < 16 && !a.solidAt(h.x + ux * len, h.z + uz * len)) len += 0.1;
        h.len = len;
        h.live = h.t >= h.warn;
        if (!h.live) return true;
        for (const t of this.victims(h, (t) => {
            const rx = t.x - h.x, rz = t.z - h.z, along = rx * ux + rz * uz;
            return along > 0 && along < len && Math.abs(rx * uz - rz * ux) < h.width / 2 + t.radius * 0.6;
        })) {
            this.hurt(h, t, uz, -ux, 0.9);
        }
        return true;
    }
}
