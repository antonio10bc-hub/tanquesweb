// Partículas de las estelas de bala (tienda de Mi Tanque). Las usa la partida y el escaparate.
const FIRE = [0xffe03a, 0xff9a1f, 0xff3e1f];
const CONFETTI = [0xff3e8e, 0xffe03a, 0x23e0d6, 0x7dff4a, 0xb46bff];
const LEAVES = [0x3fbf4a, 0x7dff4a, 0x2e9e40, 0xd8c46a];
const NOTES = [0xff3e8e, 0x23e0d6, 0xffe03a, 0x7b5cff];
const PETALS = [0xff9fd0, 0xffc6ec, 0xffffff];
const GLITCH = [0x23e0d6, 0xff3e8e, 0xffffff];
const GOLD = [0xffd23f, 0xffe680, 0xffc21a, 0xffffff];
const r = Math.random;

// Una partícula de la estela "style" para una bala en (x, y, z) que va a (vx, vz).
export function trailParticle(particles, style, x, y, z, vx, vz, size, t) {
    switch (style) {
        case 'rainbow': {
            const h = ((t * 2) % 1 + 1) % 1;
            particles.spawn(x, y, z, 0, 0, 0, size * 0.7, 0.35, hsl(h), 0);
            break;
        }
        case 'fire':
            particles.spawn(x + (r() - 0.5) * 0.1, y, z + (r() - 0.5) * 0.1, -vx * 0.05, 1 + r(), -vz * 0.05, size * (0.5 + r() * 0.4), 0.3, FIRE[(r() * 3) | 0], -3);
            break;
        case 'stars':
            particles.spawn(x + (r() - 0.5) * 0.2, y + (r() - 0.5) * 0.2, z + (r() - 0.5) * 0.2, 0, 0, 0, size * (0.3 + r() * 0.5), 0.6, r() < 0.5 ? 0xffffff : 0xffe03a, 0);
            break;
        case 'bubbles':
            particles.spawn(x, y, z, (r() - 0.5) * 0.3, 0.8 + r() * 0.6, (r() - 0.5) * 0.3, size * (0.4 + r() * 0.5), 0.7, r() < 0.6 ? 0x9af6ff : 0xffffff, -0.5);
            break;
        case 'hearts':
            if (r() < 0.6) particles.spawn(x + (r() - 0.5) * 0.15, y, z + (r() - 0.5) * 0.15, 0, 0.6 + r() * 0.5, 0, size * (0.45 + r() * 0.3), 0.6, r() < 0.7 ? 0xff3e8e : 0xffb3f0, -0.6);
            break;
        case 'electric':
            // Chispazos que saltan de lado a lado de la bala
            particles.spawn(x + (r() - 0.5) * 0.35, y + (r() - 0.5) * 0.2, z + (r() - 0.5) * 0.35, (r() - 0.5) * 3, (r() - 0.5) * 2, (r() - 0.5) * 3, size * (0.25 + r() * 0.3), 0.18, r() < 0.5 ? 0x6ff6ff : 0xffffff, 0);
            break;
        case 'snow':
            particles.spawn(x + (r() - 0.5) * 0.2, y + 0.1, z + (r() - 0.5) * 0.2, (r() - 0.5) * 0.3, -0.4, (r() - 0.5) * 0.3, size * (0.3 + r() * 0.35), 0.9, r() < 0.7 ? 0xffffff : 0xcff6ff, 0.3);
            break;
        case 'shadow':
            particles.spawn(x, y, z, -vx * 0.02, 0.2 + r() * 0.3, -vz * 0.02, size * (0.6 + r() * 0.4), 0.45, r() < 0.5 ? 0x2a1d4a : 0x7b5cff, -0.5);
            break;
        case 'smoke':
            // Bocanadas grises que crecen un poco al quedarse atrás
            particles.spawn(x + (r() - 0.5) * 0.1, y, z + (r() - 0.5) * 0.1, -vx * 0.03, 0.3 + r() * 0.3, -vz * 0.03, size * (0.6 + r() * 0.5), 0.55, r() < 0.5 ? 0xe8e0f0 : 0xb9b0d8, -0.3);
            break;
        case 'leaves':
            // Hojitas que caen dando vueltas
            particles.spawn(x + (r() - 0.5) * 0.2, y, z + (r() - 0.5) * 0.2, (r() - 0.5) * 0.8, 0.4, (r() - 0.5) * 0.8, size * (0.35 + r() * 0.3), 0.8, LEAVES[(r() * LEAVES.length) | 0], 1.2);
            break;
        case 'petals':
            particles.spawn(x + (r() - 0.5) * 0.2, y, z + (r() - 0.5) * 0.2, (r() - 0.5) * 1, 0.6, (r() - 0.5) * 1, size * (0.3 + r() * 0.25), 0.9, PETALS[(r() * PETALS.length) | 0], 0.8);
            break;
        case 'notes':
            // Notas de colores que suben ondeando
            if (r() < 0.5) particles.spawn(x, y + 0.05, z, (r() - 0.5) * 0.4, 0.9 + r() * 0.4, (r() - 0.5) * 0.4, size * (0.4 + r() * 0.2), 0.7, NOTES[(r() * NOTES.length) | 0], -0.4);
            break;
        case 'pixels':
            // Glitch: cuadrados cian y rosa que aparecen desplazados y se quedan quietos
            particles.spawn(x + (r() - 0.5) * 0.45, y + (r() - 0.5) * 0.3, z + (r() - 0.5) * 0.45, 0, 0, 0, size * (0.3 + r() * 0.5), 0.25, GLITCH[(r() * GLITCH.length) | 0], 0);
            break;
        case 'coins':
            // Monedas de oro que saltan y caen
            particles.spawn(x, y, z, (r() - 0.5) * 1.2, 1.4 + r(), (r() - 0.5) * 1.2, size * (0.4 + r() * 0.2), 0.55, GOLD[(r() * GOLD.length) | 0], 7);
            break;
        case 'confetti':
            particles.spawn(x, y, z, (r() - 0.5) * 1.5, 1 + r(), (r() - 0.5) * 1.5, size * 0.5, 0.6, CONFETTI[(r() * CONFETTI.length) | 0], 8);
            break;
    }
}

// Cada cuánto suelta una partícula cada estela (segundos)
export const TRAIL_RATE = { rainbow: 0.012, fire: 0.014, stars: 0.03, bubbles: 0.03, confetti: 0.02, hearts: 0.03, electric: 0.012, snow: 0.025, shadow: 0.014,
    smoke: 0.02, leaves: 0.035, petals: 0.03, notes: 0.04, pixels: 0.012, coins: 0.03 };

function hsl(h) {
    const f = (n) => {
        const k = (n + h * 12) % 12;
        return 0.55 - 0.45 * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return (Math.round(f(0) * 255) << 16) | (Math.round(f(8) * 255) << 8) | Math.round(f(4) * 255);
}
