import { CONFIG } from '../config.js';
import { WEAPONS, getDef } from '../content/index.js';
import { turnTowards } from '../core/math.js';

let nextId = 1;

// Simulación de un tanque. Mismas reglas para jugador e IA:
//  - el "cerebro" solo decide una intención de movimiento (intent)
//  - si se mueve no dispara; quieto, dispara solo cada weapon.interval
//  - al vaciar el cargador recarga durante weapon.reload (también moviéndose)
//  - disparar (o recibir un impacto) le hace visible durante un rato
//  - los objetos dan efectos temporales (escudo, turbo, invisibilidad, radar, rebote, fuego)
export class Tank {
    constructor(def, team, x, z, brain) {
        this.id = nextId++;
        this.def = def;
        this.team = team;
        this.weapon = getDef(WEAPONS, def.weapon, 'arma');
        this.brain = brain;
        this.x = x;
        this.z = z;
        this.radius = def.radius;
        this.speed = def.speed;
        this.hp = this.maxHp = def.hp;
        this.alive = true;
        this.yaw = team === 'player' ? Math.PI : 0;
        this.aimYaw = this.yaw;
        this.cooldown = this.weapon.firstShotDelay;
        this.ammo = this.weapon.magazine;
        this.damageMult = 1; // >1 tras coger un potenciador: se gasta en el siguiente disparo
        this.bounceNext = 0; // rebotes de la siguiente bala
        this.nukeNext = null; // { radius, damage, flight } si el siguiente disparo es la bomba
        this.tripleNext = 0; // balas en abanico del siguiente disparo (0: normal)
        this.tripleSpread = 0;
        this.decoy = false;  // copia falsa (objeto señuelo): no dispara y atrae a los rivales
        this.shield = 0;     // impactos que absorbe
        this.turbo = 0;      // segundos restantes de cada efecto temporal
        this.speedMult = 1;
        this.cloak = 0;
        this.radar = 0;
        this.inBush = false;
        this.slowT = 0;      // pisando hielo o caramelo: va más lento mientras dure
        this.slowMult = 1;
        this.chargeT = 0;    // embestida de un jefe: corre mucho más durante este tiempo
        this.chargeMult = 1;
        this.angry = false;  // jefe en fase 2
        this.reloading = 0;
        this.reveal = 0;
        this.recoil = 0;
        this.flash = 0;
        this.moving = false;
        this.shots = 0;
        this.intent = { x: 0, z: 0 };
        this.intel = new Map(); // rival -> { opp, x, z, visible, age }
        this.model = null;
        this.viewFade = 1;
    }

    get revealed() {
        return this.reveal > 0;
    }

    // Lo que ven los demás: disparar te delata salvo que seas invisible.
    get exposed() {
        return this.reveal > 0 && this.cloak <= 0;
    }

    // 0..1 mientras recarga; 1 con el cargador listo.
    get reloadProgress() {
        return this.reloading > 0 ? 1 - this.reloading / this.weapon.reload : 1;
    }

    know(opp) {
        if (!this.intel.has(opp)) this.intel.set(opp, { opp, x: opp.x, z: opp.z, visible: false, age: Infinity });
    }

    // Objetivo: el rival visible más cercano; si no, la pista más reciente.
    pickTarget() {
        let best = null, bestScore = Infinity;
        for (const info of this.intel.values()) {
            if (!info.opp.alive || info.age === Infinity) continue;
            const score = info.visible ? Math.hypot(info.x - this.x, info.z - this.z) : 1000 + info.age;
            if (score < bestScore) {
                bestScore = score;
                best = info;
            }
        }
        return best;
    }

    step(dt, world) {
        if (!this.alive || this.frozen) return; // frozen: aún cayendo del cielo
        this.brain.update(this, dt, world);

        let ix = this.intent.x, iz = this.intent.z;
        const len = Math.hypot(ix, iz);
        if (len > 1) { ix /= len; iz /= len; }
        this.moving = len > 0.12;

        const w = this.weapon;
        if (this.moving) {
            const speed = this.speed * (this.turbo > 0 ? this.speedMult : 1) *
                (this.slowT > 0 ? this.slowMult : 1) * (this.chargeT > 0 ? this.chargeMult : 1);
            this.x += ix * speed * dt;
            this.z += iz * speed * dt;
            world.arena.resolveCircle(this, this.radius);
            this.yaw = turnTowards(this.yaw, Math.atan2(ix, iz), 14 * dt);
            this.aimYaw = turnTowards(this.aimYaw, this.yaw, 14 * dt);
            if (this.cooldown < w.firstShotDelay) this.cooldown = w.firstShotDelay;
        }
        this.cooldown -= dt;
        if (this.reloading > 0) {
            this.reloading -= dt;
            if (this.reloading <= 0) {
                this.reloading = 0;
                this.ammo = w.magazine;
                world.events.emit('reloaded', this);
            }
        }

        if (!this.moving) {
            const target = this.pickTarget();
            const desired = target ? Math.atan2(target.x - this.x, target.z - this.z) : this.aimYaw;
            this.aimYaw = turnTowards(this.aimYaw, desired, 18 * dt);
            if (this.cooldown <= 0 && this.reloading === 0) {
                this.aimYaw = desired;
                this.fire(world);
                this.cooldown = Math.max(0, this.cooldown) + w.interval;
            }
        }

        this.inBush = world.arena.bushAt(this.x, this.z);
        this.reveal = Math.max(0, this.reveal - dt);
        this.turbo = Math.max(0, this.turbo - dt);
        this.cloak = Math.max(0, this.cloak - dt);
        this.radar = Math.max(0, this.radar - dt);
        this.slowT = Math.max(0, this.slowT - dt);
        this.chargeT = Math.max(0, this.chargeT - dt);
        this.recoil = Math.max(0, this.recoil - dt * 5);
        this.flash = Math.max(0, this.flash - dt * 6);
    }

    fire(world) {
        const w = this.weapon;
        const mx = this.x + Math.sin(this.aimYaw) * w.muzzle;
        const mz = this.z + Math.cos(this.aimYaw) * w.muzzle;
        if (this.nukeNext) {
            // La bomba va a la última posición conocida del rival (o unos tiles al frente)
            const t = this.pickTarget();
            const tx = t ? t.x : this.x + Math.sin(this.aimYaw) * 5;
            const tz = t ? t.z : this.z + Math.cos(this.aimYaw) * 5;
            world.launchNuke(this, mx, mz, tx, tz, this.nukeNext);
            this.nukeNext = null;
        } else {
            const power = this.damageMult, bounce = this.bounceNext;
            const count = this.tripleNext || w.count, spread = this.tripleNext ? this.tripleSpread : w.spread;
            this.damageMult = 1;
            this.bounceNext = 0;
            this.tripleNext = 0;
            for (let k = 0; k < count; k++) {
                world.bullets.spawn(this, mx, mz, this.aimYaw + (k - (count - 1) / 2) * spread, w, power, bounce);
            }
        }
        const s = CONFIG.stealth;
        this.reveal = Math.max(this.reveal, this.inBush ? s.bushRevealTime : s.revealTime);
        this.recoil = 1;
        this.shots++;
        world.events.emit('shot', this, mx, mz);
        if (--this.ammo <= 0) {
            this.reloading = w.reload;
            world.events.emit('reload', this);
        }
    }

    applyPickup(def) {
        if (def.heal) this.hp = Math.min(this.maxHp, this.hp + def.heal);
        if (def.damageMult) this.damageMult = Math.max(this.damageMult, def.damageMult);
        if (def.shield) this.shield = Math.max(this.shield, def.shield);
        if (def.turbo) { this.turbo = def.turbo; this.speedMult = def.speedMult || 1.5; }
        if (def.cloak) this.cloak = def.cloak;
        if (def.bounce) this.bounceNext = Math.max(this.bounceNext, def.bounce);
        if (def.radar) this.radar = def.radar;
        if (def.nuke) this.nukeNext = def.nuke;
        if (def.triple) { this.tripleNext = def.triple; this.tripleSpread = def.spread; }
        if (def.decoy) { this.cloak = Math.max(this.cloak, def.decoy.cloak); this.reveal = 0; }
    }

    // Devuelve el daño realmente recibido (0 si lo para el escudo).
    damage(amount, dirX, dirZ, world) {
        if (this.shield > 0) {
            this.shield--;
            this.flash = 0.6;
            return 0;
        }
        this.hp = Math.max(0, this.hp - amount);
        this.flash = 1;
        this.reveal = Math.max(this.reveal, CONFIG.stealth.revealOnHit);
        this.x += dirX * 0.15;
        this.z += dirZ * 0.15;
        world.arena.resolveCircle(this, this.radius);
        if (this.hp <= 0) this.alive = false;
        return amount;
    }
}
