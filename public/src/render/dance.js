// Animación de los bailes de victoria (content/dances.js), compartida por la partida y el
// escaparate de "Mi Tanque". La pose se aplica en TankModel.sync (model.pose).
const FLAME = [0xffe03a, 0xff9a1f, 0xffffff, 0xff3e3e];
const PARTY = [0xffe03a, 0x23e0d6, 0xff3e8e, 0xb6ff5c, 0x7b5cff, 0xffffff];
const WIND = [0xffffff, 0xe8e0f0, 0xcfc8ea, 0xb9b0d8];
const DUST = [0xffffff, 0xe8e0f0, 0xd8cfe8];
// Fuegos artificiales: colores de cada uno (va rotando) y su forma
const SKY = [
    [0xff3e8e, 0xffffff], [0x23e0d6, 0xffffff], [0xffe03a, 0xff9a1f], [0xb6ff5c, 0x23e0d6],
    [0x7b5cff, 0xff3e8e], [0xff3e3e, 0xffe03a], [0xffffff, 0x23e0d6],
];
const SHAPES = ['ball', 'ring', 'willow', 'glitter'];
const FLOOR = [0xff3e8e, 0x23e0d6, 0xffe03a, 0x7b5cff, 0xb6ff5c];

// Duración total de un baile (baile + salida)
export const danceTime = (def) => def.time + def.lift;

// Sonido y temblor de cámara de los efectos que lo tienen (solo en la partida)
export const DANCE_SFX = { blast: 'turbo', launch: 'itemSpawn', firework: 'crateBreak', boing: 'boing', land: 'drop', whoosh: 'decoy', gust: 'storm' };
export const DANCE_SHAKE = { blast: 0.3, land: 0.12, boing: 0.08, firework: 0.04 };

export function newPose() {
    return { y: 0, dx: 0, dz: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, turret: 0, recoil: 0, done: {} };
}

// Pose del baile en el segundo t. emit(tipo, altura, dato)
export function dancePose(def, t, pose, emit) {
    Object.assign(pose, { y: 0, dx: 0, dz: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, turret: 0, recoil: 0 });
    def.move(t, pose, emit);
    if (t >= def.time) def.exit(Math.min(1, (t - def.time) / def.lift), pose, emit, t);
    return pose;
}

// Dónde revienta cada fuego artificial (repartidos alrededor con el ángulo de oro)
function shellTarget(i, compact) {
    const a = i * 2.39996, w = compact ? 0.6 : 1;
    const big = i >= 12;
    return { x: Math.sin(a) * 1.4 * w, y: (compact ? 1.4 : 2.4) + (i % 3) * (compact ? 0.15 : 0.45) + (big ? 0.4 : 0), z: Math.cos(a) * 0.9 * w - 0.5 };
}

// Partículas del baile alrededor de (x, z). s: escala del tanque. a: dato del efecto.
// ceil: altura máxima de los efectos del cielo (el escaparate de Mi Tanque se ve de cerca)
export function danceFx(particles, kind, x, y, z, s = 1, a = 0, ceil = Infinity) {
    const r = Math.random, j = (k) => (r() - 0.5) * k * s;
    const P = particles;
    const compact = ceil < 3;
    switch (kind) {
        // ----- cohete -----
        case 'spark':
            if (r() < 0.5) P.spawn(x + j(0.9), y, z + j(0.9), j(1.5), 1.5 + r() * 1.5, j(1.5), 0.06, 0.4, r() < 0.5 ? 0xffe03a : 0xffffff, 6);
            break;
        case 'blast':
            for (let k = 0; k < 26; k++) {
                const b = (k / 26) * Math.PI * 2;
                P.spawn(x + Math.sin(b) * 0.4 * s, 0.1, z + Math.cos(b) * 0.4 * s, Math.sin(b) * 3.2, 0.4 + r() * 0.6, Math.cos(b) * 3.2, 0.16 + r() * 0.08, 0.55, r() < 0.6 ? 0xffffff : 0xffe03a, 1);
            }
            break;
        case 'flame':
            for (let k = 0; k < 3; k++) {
                P.spawn(x + j(0.35), y - 0.05, z + j(0.35), j(0.6), -3 - r() * 2, j(0.6), 0.1 + r() * 0.1, 0.35, FLAME[(r() * FLAME.length) | 0], 0);
            }
            if (r() < 0.5) P.spawn(x + j(0.5), y - 0.2, z + j(0.5), j(0.4), -1, j(0.4), 0.16, 0.6, 0xe8e0f0, -1);
            break;

        // ----- tornado: un embudo de viento que gira y sube, más ancho arriba -----
        case 'gust':
            for (let k = 0; k < 18; k++) {
                const b = (k / 18) * Math.PI * 2;
                P.spawn(x + Math.sin(b) * 0.5 * s, 0.08, z + Math.cos(b) * 0.5 * s, Math.cos(b) * 3, 0.3, -Math.sin(b) * 3, 0.14, 0.5, DUST[k % 3], 0);
            }
            break;
        case 'twister': {
            // El embudo: tres brazos en espiral que giran (dibujados de nuevo en cada fotograma)
            const top = y + 0.5 + a * 1.3, phase = (performance.now() / 1000) * (6 + a * 10);
            for (let arm = 0; arm < 3; arm++) {
                for (let k = 0; k < 9; k++) {
                    const h = (k / 8) * top, rad = (0.22 + (h / top) * (0.5 + a * 0.6)) * s;
                    const b = phase + h * 2.2 + (arm * Math.PI * 2) / 3;
                    P.spawn(x + Math.sin(b) * rad, h, z + Math.cos(b) * rad, 0, 0, 0, (0.08 + a * 0.06) * (0.7 + h / top * 0.6), 0.07, WIND[(arm + k) % WIND.length], 0);
                }
            }
            // ...y lo que sale despedido girando
            const n = 2 + Math.round(a * 4);
            for (let k = 0; k < n; k++) {
                const h = r() * top, rad = (0.3 + h * 0.32) * s, b = r() * Math.PI * 2, v = (2.5 + a * 4) * s;
                // Tangente al círculo (gira) y un poco hacia dentro y hacia arriba
                P.spawn(x + Math.sin(b) * rad, h, z + Math.cos(b) * rad,
                    Math.cos(b) * v - Math.sin(b) * 0.6, 1.2 + r() * 1.8, -Math.sin(b) * v - Math.cos(b) * 0.6,
                    0.06 + r() * 0.08, 0.3, WIND[(r() * WIND.length) | 0], -3);
            }
            // Polvo arrastrado por el suelo hacia el remolino
            if (r() < a) {
                const b = r() * Math.PI * 2, rad = 1.1 * s;
                P.spawn(x + Math.sin(b) * rad, 0.06, z + Math.cos(b) * rad, -Math.sin(b) * 2 + Math.cos(b) * 2, 0.2, -Math.cos(b) * 2 - Math.sin(b) * 2, 0.12, 0.45, DUST[(r() * 3) | 0], 0);
            }
            break;
        }

        // ----- voltereta: estela blanca al girar, estrellitas arriba y polvo al caer -----
        case 'swoosh':
            for (let k = 0; k < 2; k++) P.spawn(x + j(0.6), y + 0.3 + j(0.5), z + j(0.6), 0, 0, 0, 0.1 + r() * 0.06, 0.22, r() < 0.7 ? 0xffffff : 0x23e0d6, 0);
            break;
        case 'stars':
            for (let k = 0; k < 10; k++) {
                const b = (k / 10) * Math.PI * 2;
                P.spawn(x + Math.sin(b) * 0.3, y, z + Math.cos(b) * 0.3, Math.sin(b) * 2.2, Math.cos(b) * 1.4 + 0.6, Math.cos(b) * 0.6, 0.11, 0.45, k % 2 ? 0xffe03a : 0xffffff, 2);
            }
            break;
        case 'land':
            for (let k = 0; k < 14 + a * 8; k++) {
                const b = r() * Math.PI * 2, v = (1.6 + a * 1.8) * (0.7 + r() * 0.5);
                P.spawn(x + Math.sin(b) * 0.4 * s, 0.06, z + Math.cos(b) * 0.4 * s, Math.sin(b) * v, 0.3 + r() * 0.5, Math.cos(b) * v, 0.12 + r() * 0.08, 0.45, DUST[(r() * 3) | 0], 2);
            }
            break;
        case 'whoosh':
            for (let k = 0; k < 24; k++) {
                const b = (k / 24) * Math.PI * 2;
                P.spawn(x + Math.sin(b) * 0.45 * s, 0.08, z + Math.cos(b) * 0.45 * s, Math.sin(b) * 3.6, 0.2, Math.cos(b) * 3.6, 0.13, 0.4, k % 3 ? 0xffffff : 0x23e0d6, 0);
            }
            break;

        // ----- boing: anillo de colores en cada bote y burbujas al salir -----
        case 'boing': {
            danceFx(P, 'land', x, 0, z, s, a * 0.6);
            const n = Math.round(14 + a * 12);
            for (let k = 0; k < n; k++) {
                const b = (k / n) * Math.PI * 2, v = (1.4 + a * 1.4) * s;
                P.spawn(x + Math.sin(b) * 0.45 * s, 0.1, z + Math.cos(b) * 0.45 * s, Math.sin(b) * v, 1 + a * 0.8, Math.cos(b) * v, 0.1 + a * 0.03, 0.4 + a * 0.1, PARTY[k % PARTY.length], 5);
            }
            break;
        }
        case 'bubbles':
            if (r() < 0.7) P.spawn(x + j(0.5), y + j(0.3), z + j(0.5), j(0.5), -0.6, j(0.5), 0.12 + r() * 0.1, 0.5, [0xff3e8e, 0xffe03a, 0x23e0d6][(r() * 3) | 0], 0);
            break;

        // ----- helicóptero: aspas borrosas y polvo que el aire empuja por el suelo -----
        case 'rotor': {
            // Disco borroso de las aspas: un aro que gira con dos palas marcadas
            const phase = (performance.now() / 1000) * 30 * a, rad = 0.75 * s;
            for (let k = 0; k < 10; k++) {
                const b = phase + (k / 10) * Math.PI * 2;
                P.spawn(x + Math.sin(b) * rad, y, z + Math.cos(b) * rad, 0, 0, 0, 0.07, 0.05, 0xffffff, 0);
            }
            for (const off of [0, Math.PI]) {
                for (let k = 1; k <= 4; k++) {
                    const b = phase + off, d = (k / 4) * rad;
                    P.spawn(x + Math.sin(b) * d, y, z + Math.cos(b) * d, 0, 0, 0, 0.09, 0.05, 0xe8e0f0, 0);
                }
            }
            break;
        }
        case 'downwash':
            // El aire de las aspas aplasta el polvo y lo empuja hacia fuera en anillo
            for (let k = 0; k < 4 * a; k++) {
                const b = r() * Math.PI * 2, v = (3 + r() * 2.5) * s;
                P.spawn(x + Math.sin(b) * 0.35 * s, 0.07, z + Math.cos(b) * 0.35 * s, Math.sin(b) * v, 0.1, Math.cos(b) * v, 0.12 + r() * 0.1, 0.5, DUST[(r() * 3) | 0], 0);
            }
            break;

        // ----- fuegos artificiales: chispazo al lanzar, cohetito con estela y cuatro formas -----
        case 'launch':
            for (let k = 0; k < 8; k++) P.spawn(x + j(0.2), y, z + j(0.2), j(2), 1.5 + r() * 2, j(2), 0.08, 0.3, FLAME[(r() * FLAME.length) | 0], 6);
            break;
        case 'shell': {
            const i = Math.floor(a), k = a - i, to = shellTarget(i, compact);
            const e = 1 - (1 - k) * (1 - k); // frena al llegar arriba
            const px = x + to.x * k, py = 0.7 + (Math.min(ceil, to.y) - 0.7) * e, pz = z + to.z * k;
            P.spawn(px, py, pz, 0, 0, 0, 0.1, 0.12, 0xffffff, 0);
            P.spawn(px + j(0.1), py, pz + j(0.1), j(0.4), -0.5, j(0.4), 0.06, 0.4, SKY[i % SKY.length][0], 3);
            break;
        }
        case 'firework': {
            const i = a, to = shellTarget(i, compact), big = i >= 12 ? 1.5 : 1;
            const fx = x + to.x, fy = Math.min(ceil, to.y), fz = z + to.z;
            const [c1, c2] = SKY[i % SKY.length], shape = SHAPES[i % SHAPES.length];
            const sp = (compact ? 1.8 : 3.2) * big;
            // Destello en el centro
            P.spawn(fx, fy, fz, 0, 0, 0, 0.45 * big, 0.12, 0xffffff, 0);
            if (shape === 'ball') {
                P.burst(fx, fy, fz, Math.round(44 * big), [c1, c1, c2], { speed: sp, up: sp * 0.5, size: 0.11, ttl: 0.9, grav: 2.5 });
            } else if (shape === 'ring') {
                // Un aro de frente a la cámara, con otro de dentro
                const n = Math.round(30 * big);
                for (let k = 0; k < n; k++) {
                    const b = (k / n) * Math.PI * 2;
                    P.spawn(fx, fy, fz, Math.cos(b) * sp, Math.sin(b) * sp, 0, 0.12, 0.85, c1, 1.5);
                    if (k % 2) P.spawn(fx, fy, fz, Math.cos(b) * sp * 0.5, Math.sin(b) * sp * 0.5, 0, 0.09, 0.7, c2, 1.5);
                }
            } else if (shape === 'willow') {
                // Sauce: dorado que cae despacio como ramas
                P.burst(fx, fy, fz, Math.round(40 * big), [0xffe03a, 0xff9a1f, c1], { speed: sp * 0.7, up: sp * 0.6, size: 0.1, ttl: 1.5, grav: 4 });
            } else {
                // Purpurina: chispas blancas que tintinean y tardan en apagarse
                P.burst(fx, fy, fz, Math.round(36 * big), [0xffffff, 0xffffff, c1, c2], { speed: sp * 0.55, up: sp * 0.3, size: 0.08, ttl: 1.4, grav: 0.8 });
            }
            break;
        }
        case 'glitter':
            for (let k = 0; k < 3; k++) P.spawn(x + j(0.6), y + j(0.3), z + j(0.6), j(1.2), -0.5 - r(), j(1.2), 0.08 + r() * 0.06, 0.6, PARTY[(r() * PARTY.length) | 0], 1.5);
            break;

        // ----- disco: pista que se enciende al ritmo, bola de espejos con destellos, notas -----
        case 'floor': {
            const step = compact ? 0.4 : 0.5, size = compact ? 0.26 : 0.44;
            for (let gx = -2; gx <= 2; gx++) {
                for (let gz = -2; gz <= 2; gz++) {
                    if ((gx + gz + a) % 2 !== 0 || (gx === 0 && gz === 0)) continue;
                    P.spawn(x + gx * step, 0.04, z + gz * step, 0, 0, 0, size, 0.3, FLOOR[(Math.abs(gx * 3 + gz) + a) % FLOOR.length], 0);
                    // Baldosas planas, sin girar
                    P.rot[P.n - 1] = P.spin[P.n - 1] = 0;
                }
            }
            break;
        }
        case 'ball': {
            const by = Math.min(ceil, y);
            // La bola: un cubo plateado que gira despacio colgado de su cordel...
            P.spawn(x, by, z, 0, 0, 0, 0.5 * s, 0.04, 0xd8e4ff, 0);
            P.spin[P.n - 1] = 0;
            P.rot[P.n - 1] = a * 2;
            for (let k = 1; k <= 3; k++) P.spawn(x, by + 0.2 + k * 0.18, z, 0, 0, 0, 0.05, 0.04, 0x8e86a8, 0);
            // ...con destellos encima y rayos de colores que bajan hacia la pista
            for (let k = 0; k < 2; k++) if (r() < 0.7) P.spawn(x + j(0.5), by + j(0.5), z + j(0.5), 0, 0, 0, 0.08, 0.08, 0xffffff, 0);
            for (let k = 0; k < 2; k++) {
                const b = r() * Math.PI * 2, d = -0.3 - r() * 0.9, v = 4.5;
                P.spawn(x, by, z, Math.sin(b) * v, d * v, Math.cos(b) * v, 0.09, 0.4, PARTY[(r() * PARTY.length) | 0], 0);
            }
            break;
        }
        case 'note':
            if (r() < 0.4) P.spawn(x + j(1.2), y + r() * 0.4, z + j(1.2), j(0.6), 1.2, j(0.6), 0.1, 0.8, PARTY[(r() * PARTY.length) | 0], -0.6);
            break;
    }
}
