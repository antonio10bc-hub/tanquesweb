// Ataques especiales de los jefes. Cada uno recibe el jefe, el mundo, sus parámetros
// (content/campaign.js), el cerebro (para encadenar cosas con brain.later) y si está en fase 2.
const TAU = Math.PI * 2;
const CANDY = [0xff8fd8, 0x6ff6ff, 0xffe03a, 0x7dff4a, 0xffffff];

// Puntos de impacto: el primero donde el jefe cree que estás; el resto alrededor, separados.
function targetSpots(tank, world, n, spread) {
    const a = world.arena, t = tank.pickTarget();
    const cx = t ? t.x : tank.x, cz = t ? t.z : tank.z;
    const spots = [{ x: cx, z: cz }];
    for (let k = 0; spots.length < n && k < 80; k++) {
        const ang = Math.random() * TAU, d = 1 + Math.random() * spread;
        const x = cx + Math.sin(ang) * d, z = cz + Math.cos(ang) * d;
        if (a.solidAt(x, z) || x < 1 || z < 1 || x > a.cols - 1 || z > a.rows - 1) continue;
        if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < 1.3)) continue;
        spots.push({ x, z });
    }
    return spots;
}

export const ATTACKS = {
    charge(tank, world, a, brain, p2) {
        brain.startCharge(tank, a, p2 ? a.repeat2 : 1);
    },

    wave(tank, world, a, brain, p2) {
        const rows = world.arena.rows;
        const add = (dir, warn) => world.hazards.add({
            kind: 'wave', style: 'wave', owner: tank, dir, front: dir > 0 ? 0.6 : rows - 0.6,
            speed: a.speed * (p2 ? 1.15 : 1), warn, dmg: 1, color: 0x12d6e6,
        });
        add(1, 0.9);
        if (p2) add(-1, 3);
    },

    storm(tank, world, a, brain, p2) {
        tank.cloak = 3.5;
        const n = p2 ? a.count2 : a.count;
        for (let i = 0; i < n; i++) {
            const ang = (i / n) * TAU + Math.random();
            world.hazards.add({
                kind: 'zone', style: 'whirl', owner: tank, x: tank.x + Math.sin(ang) * 1.4, z: tank.z + Math.cos(ang) * 1.4,
                r: 0.55, life: a.life, dmg: 1, every: 1.1, arm: 0.7, chase: a.speed * (p2 ? 1.15 : 1), color: 0xf4d08a,
            });
        }
    },

    ring(tank, world, a, brain, p2) {
        // Pasillo seguro: en cada lluvia queda un hueco ancho hacia un lado al azar (el mismo en
        // todos los anillos de la fase 2), para colarse leyendo el ataque y no por suerte
        const gap = Math.random() * TAU, half = ((a.lane || 0) * TAU) / a.count / 2;
        const fire = (off, round) => {
            if (!tank.alive) return;
            const w = tank.weapon;
            for (let k = 0; k < a.count; k++) {
                const yaw = off + (k / a.count) * TAU;
                const d = Math.abs(((yaw - gap) % TAU + TAU * 1.5) % TAU - Math.PI);
                if (d < half) continue;
                world.bullets.spawn(tank, tank.x + Math.sin(yaw) * w.muzzle, tank.z + Math.cos(yaw) * w.muzzle, yaw, w, 1, 0, CANDY[(k + round) % CANDY.length]);
            }
            tank.reveal = Math.max(tank.reveal, 1);
            world.events.emit('shot', tank, tank.x, tank.z);
        };
        fire(0, 0);
        if (!p2) return;
        for (let r = 1; r < a.rings2; r++) brain.later(r * 0.35, () => fire((r * Math.PI) / a.count, r));
        // Charcos de caramelo pegajoso donde estás: te frenan
        for (const s of targetSpots(tank, world, 3, 2.5)) {
            world.hazards.add({ kind: 'zone', style: 'caramel', owner: tank, x: s.x, z: s.z, r: 0.8, life: 6, slow: 0.45, color: 0xff8fd8 });
        }
    },

    icicles(tank, world, a, brain, p2) {
        targetSpots(tank, world, p2 ? a.count2 : a.count, 2.6).forEach((s, i) => world.hazards.add({
            kind: 'strike', style: 'icicle', owner: tank, x: s.x, z: s.z, r: a.radius, delay: a.delay + i * 0.12, dmg: 1, color: 0x9fefff,
            zone: { style: 'ice', r: 0.8, life: 4, slow: 0.5, color: 0xcff6ff },
        }));
    },

    meteors(tank, world, a, brain, p2) {
        targetSpots(tank, world, p2 ? a.count2 : a.count, 3).forEach((s, i) => world.hazards.add({
            kind: 'strike', style: 'meteor', owner: tank, x: s.x, z: s.z, r: a.radius, delay: a.delay + i * 0.15, dmg: 1, color: 0xff5a1f,
            zone: { style: 'lava', r: 0.7, life: a.lava, dmg: 1, every: 1.2, arm: 0.4, color: 0xff5a1f },
        }));
    },

    summon(tank, world, a, brain, p2) {
        tank.radar = a.radar; // los focos: durante un rato te ve aunque estés escondido
        world.events.emit('summon', tank, p2 ? a.count2 : a.count, a.max || 3);
    },

    laser(tank, world, a, brain, p2) {
        const t = tank.pickTarget();
        const base = t ? Math.atan2(t.x - tank.x, t.z - tank.z) : tank.aimYaw;
        const turn = (p2 ? a.turn2 : a.turn) * (Math.random() < 0.5 ? 1 : -1);
        // Empieza un poco antes de ti y gira hacia donde estás
        for (const off of p2 ? [0, Math.PI] : [0]) {
            world.hazards.add({
                kind: 'beam', style: 'laser', owner: tank, angle: base + off - Math.sign(turn) * 0.8, turn,
                warn: a.warn, time: a.time, width: 0.45, dmg: 1, color: 0x7dff4a,
            });
        }
        brain.busy = a.warn + a.time;
    },
};
