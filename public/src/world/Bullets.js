import * as THREE from 'three';
import { box, OUTLINE } from '../render/materials.js';
import { trailParticle, TRAIL_RATE } from '../render/trails.js';

const FIELDS = ['x', 'z', 'vx', 'vz', 'life', 'ttl', 'size', 'dmg', 'trail', 'power', 'bounce', 'bounced'];
const _d = new THREE.Object3D();
const _c = new THREE.Color();
const HEIGHT = 0.45;
const POWER_COLOR = 0xffc21a;
export const FIRE = [0xffe03a, 0xff9a1f, 0xff3e1f, 0xffffff];
const BOUNCE_COLOR = 0xff4fd8;
const SPARKS = [0xff4fd8, 0xffffff, 0xffb3f0];

// Proyectiles en pool con arrays planos; se dibujan con 2 InstancedMesh (núcleo + contorno).
export class BulletSystem {
    constructor(scene, events, particles, max = 128) {
        this.events = events;
        this.particles = particles;
        this.max = max;
        this.n = 0;
        for (const f of FIELDS) this[f] = new Float32Array(max);
        this.owner = new Array(max).fill(null);
        this.color = new Uint32Array(max);

        this.core = new THREE.InstancedMesh(box(1, 1, 1), new THREE.MeshBasicMaterial(), max);
        this.core.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
        this.hull = new THREE.InstancedMesh(box(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x1b0b33, side: THREE.BackSide }), max);
        for (const m of [this.core, this.hull]) {
            m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            m.frustumCulled = false;
            m.count = 0;
            scene.add(m);
        }
    }

    setOutline(color) {
        this.hull.material.color.setHex(color);
    }

    spawn(owner, x, z, yaw, w, power = 1, bounce = 0, color = null) {
        if (this.n >= this.max) return;
        const i = this.n++;
        this.x[i] = x;
        this.z[i] = z;
        this.vx[i] = Math.sin(yaw) * w.speed;
        this.vz[i] = Math.cos(yaw) * w.speed;
        this.life[i] = 0;
        this.ttl[i] = w.range / w.speed;
        this.size[i] = power > 1 ? w.size * 2.1 : w.size;
        this.power[i] = power;
        this.bounce[i] = bounce;
        this.bounced[i] = 0;
        this.dmg[i] = w.damage * power;
        this.trail[i] = 0;
        this.owner[i] = owner;
        this.color[i] = color ?? (power > 1 ? POWER_COLOR : bounce > 0 ? BOUNCE_COLOR : owner.def.palette.bullet);
        if (bounce > 0) this.ttl[i] *= 1 + bounce * 0.4; // más alcance cuantos más rebotes, para poder usarlos todos
    }

    remove(i) {
        const last = --this.n;
        if (i !== last) {
            for (const f of FIELDS) this[f][i] = this[f][last];
            this.owner[i] = this.owner[last];
            this.color[i] = this.color[last];
        }
        this.owner[last] = null;
    }

    update(dt, world) {
        const { arena, tanks } = world;
        for (let i = 0; i < this.n; i++) {
            this.life[i] += dt;
            const x = this.x[i], z = this.z[i];
            if (this.life[i] >= this.ttl[i]) {
                this.particles.burst(x, HEIGHT, z, 4, [this.color[i], 0xffffff], { speed: 1.5, up: 1, size: 0.1, ttl: 0.25, grav: 6 });
                this.remove(i--);
                continue;
            }
            const nx = x + this.vx[i] * dt, nz = z + this.vz[i] * dt;
            if (arena.solidAt(nx, nz)) {
                const c = Math.floor(nx), r = Math.floor(nz);
                const style = arena.styleAt(c, r);
                const res = arena.damageTile(c, r, this.dmg[i]);
                if (res) this.events.emit('tileHit', c, r, res, this.color[i], style, this.owner[i]);
                if (res === 'broken' && style === 'barrel') world.explodeBarrel(c, r, this.owner[i]);
                if (this.bounce[i] > 0 && res !== 'broken') {
                    // Rebote: invierte la componente que ha chocado
                    const hitX = arena.solidAt(nx, z), hitZ = arena.solidAt(x, nz);
                    if (hitX || !hitZ) this.vx[i] = -this.vx[i];
                    if (hitZ || !hitX) this.vz[i] = -this.vz[i];
                    this.bounce[i]--;
                    this.bounced[i] = 1;
                    this.events.emit('bulletBounce', x, z);
                    continue;
                }
                this.events.emit('bulletWall', x, z, this.color[i]);
                this.remove(i--);
                continue;
            }
            this.x[i] = nx;
            this.z[i] = nz;

            const owner = this.owner[i];
            let hit = null;
            for (const t of tanks) {
                if (!t.alive || t.frozen || t.team === owner.team) continue;
                const dx = t.x - nx, dz = t.z - nz, rr = t.radius + this.size[i] * 0.5;
                if (dx * dx + dz * dz < rr * rr) { hit = t; break; }
            }
            if (hit) {
                const sp = Math.hypot(this.vx[i], this.vz[i]);
                world.hitTank(hit, owner, this.dmg[i], this.vx[i] / sp, this.vz[i] / sp, nx, nz, this.color[i], this.bounced[i] ? 'bounce' : 'bullet');
                this.remove(i--);
                continue;
            }

            this.trail[i] -= dt;
            if (this.power[i] > 1 && this.trail[i] <= 0) {
                // Estela de fuego: llamas que suben y se apagan
                // Las llamas nacen detrás de la bala para que la bala gorda se siga viendo delante.
                this.trail[i] = 0.016;
                const s = this.size[i], sp = Math.hypot(this.vx[i], this.vz[i]);
                const bx = nx - (this.vx[i] / sp) * s * 0.9, bz = nz - (this.vz[i] / sp) * s * 0.9;
                const j = () => (Math.random() - 0.5) * s * 0.5;
                this.particles.spawn(bx + j(), HEIGHT + j(), bz + j(), -this.vx[i] * 0.15, 0.8 + Math.random(), -this.vz[i] * 0.15,
                    s * (0.3 + Math.random() * 0.35), 0.26, FIRE[(Math.random() * FIRE.length) | 0], -3);
            } else if (this.bounce[i] > 0 && this.trail[i] <= 0) {
                this.trail[i] = 0.02;
                this.particles.spawn(nx, HEIGHT, nz, (Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5),
                    this.size[i] * 0.45, 0.22, SPARKS[(Math.random() * SPARKS.length) | 0], 0);
            } else if (owner.trail && this.trail[i] <= 0) {
                // Estela comprada en la tienda
                this.trail[i] = TRAIL_RATE[owner.trail] || 0.03;
                trailParticle(this.particles, owner.trail, nx, HEIGHT, nz, this.vx[i], this.vz[i], this.size[i], this.life[i]);
            } else if (this.trail[i] <= 0) {
                this.trail[i] = 0.03;
                this.particles.spawn(nx, HEIGHT, nz, 0, 0, 0, this.size[i] * 0.55, 0.16, this.color[i], 0);
            }
        }
    }

    // Bala enemiga que viene directa hacia "tank" (para que la IA esquive).
    findThreat(tank, range) {
        for (let i = 0; i < this.n; i++) {
            if (this.owner[i].team === tank.team) continue;
            const sp = Math.hypot(this.vx[i], this.vz[i]);
            const dx = (this.vx[i] / sp), dz = (this.vz[i] / sp);
            const rx = tank.x - this.x[i], rz = tank.z - this.z[i];
            const along = rx * dx + rz * dz;
            if (along <= 0 || along > range) continue;
            if (Math.abs(rx * dz - rz * dx) < tank.radius + 0.25) return { dx, dz, x: this.x[i], z: this.z[i] };
        }
        return null;
    }

    sync(time) {
        const colors = this.core.instanceColor.array;
        for (let i = 0; i < this.n; i++) {
            const s = this.size[i];
            _d.position.set(this.x[i], HEIGHT, this.z[i]);
            _d.rotation.set(time * 9 + i, time * 13 + i, 0);
            _d.scale.setScalar(s);
            _d.updateMatrix();
            this.core.setMatrixAt(i, _d.matrix);
            _d.scale.setScalar(s + OUTLINE * 2.4);
            _d.updateMatrix();
            this.hull.setMatrixAt(i, _d.matrix);
            _c.setHex(this.color[i]);
            colors[i * 3] = _c.r;
            colors[i * 3 + 1] = _c.g;
            colors[i * 3 + 2] = _c.b;
        }
        this.core.count = this.hull.count = this.n;
        this.core.instanceMatrix.needsUpdate = true;
        this.hull.instanceMatrix.needsUpdate = true;
        this.core.instanceColor.needsUpdate = true;
    }

    clear() {
        while (this.n > 0) this.remove(this.n - 1);
        this.core.count = this.hull.count = 0;
    }
}
