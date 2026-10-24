import { DANCE } from '../content/dances.js';

// Animación de los bailes de victoria (content/dances.js), compartida por la partida y el
// escaparate de "Mi Tanque". La pose se aplica en TankModel.sync (model.pose).
export const DANCE_TIME = DANCE.move + DANCE.lift;
const FLAME = [0xffe03a, 0xff9a1f, 0xffffff, 0xff3e3e];
const PARTY = [0xffe03a, 0x23e0d6, 0xff3e8e, 0xb6ff5c, 0x7b5cff, 0xffffff];

export function newPose() {
    return { y: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, turret: 0, recoil: 0, done: {}, blasted: false };
}

// Pose del baile en el segundo t (el despegue final lo añade aquí). emit(tipo, altura)
export function dancePose(def, t, pose, emit) {
    Object.assign(pose, { y: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, turret: 0, recoil: 0 });
    def.move(t, pose, emit);
    const u = (t - DANCE.move) / DANCE.lift;
    if (u >= 0) {
        if (!pose.blasted) {
            pose.blasted = true;
            emit('blast', 0);
        }
        // Despegue: acelera hacia arriba hasta salir de cuadro, estirado por la velocidad
        pose.y += 0.15 + 18 * u * u;
        pose.sy *= 1.12;
        pose.sx *= 0.92;
        emit('flame', pose.y);
    }
    return pose;
}

// Partículas del baile alrededor de (x, z). s: escala del tanque
export function danceFx(particles, kind, x, y, z, s = 1) {
    const r = Math.random, j = (k) => (r() - 0.5) * k * s;
    switch (kind) {
        case 'spark':
            if (r() < 0.5) particles.spawn(x + j(0.9), y, z + j(0.9), j(1.5), 1.5 + r() * 1.5, j(1.5), 0.06, 0.4, r() < 0.5 ? 0xffe03a : 0xffffff, 6);
            break;
        case 'dust':
            if (r() < 0.5) particles.spawn(x + j(1), y, z + j(1), j(2.5), 0.4, j(2.5), 0.14, 0.5, 0xffffff, -0.5);
            break;
        case 'note':
            if (r() < 0.25) particles.spawn(x + j(1), y + r() * 0.4, z + j(1), j(0.6), 1.2, j(0.6), 0.1, 0.8, PARTY[(r() * PARTY.length) | 0], -0.6);
            break;
        case 'firework': {
            const fx = x + j(1.6), fz = z + j(1.2) - 0.4;
            particles.burst(fx, y, fz, 42, PARTY, { speed: 3.2, up: 1.5, size: 0.11, ttl: 0.9, grav: 3 });
            break;
        }
        case 'blast':
            for (let k = 0; k < 26; k++) {
                const a = (k / 26) * Math.PI * 2;
                particles.spawn(x + Math.sin(a) * 0.4 * s, 0.1, z + Math.cos(a) * 0.4 * s, Math.sin(a) * 3.2, 0.4 + r() * 0.6, Math.cos(a) * 3.2, 0.16 + r() * 0.08, 0.55, r() < 0.6 ? 0xffffff : 0xffe03a, 1);
            }
            break;
        case 'flame':
            for (let k = 0; k < 3; k++) {
                particles.spawn(x + j(0.35), y - 0.05, z + j(0.35), j(0.6), -3 - r() * 2, j(0.6), 0.1 + r() * 0.1, 0.35, FLAME[(r() * FLAME.length) | 0], 0);
            }
            if (r() < 0.5) particles.spawn(x + j(0.5), y - 0.2, z + j(0.5), j(0.4), -1, j(0.4), 0.16, 0.6, 0xe8e0f0, -1);
            break;
    }
}
