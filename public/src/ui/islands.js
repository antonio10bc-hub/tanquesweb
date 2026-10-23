// Formas de las islas del mapa de la campaña: cada mundo tiene su silueta y una pieza que lo
// identifica de lejos (en vez de la misma mancha redondeada para todos).
//
//   land(c, r, k)               ¿la casilla (c, r) es tierra?
//   landmark(add, k, reserve)   la pieza grande del mundo (montaña, rascacielos, oasis...).
//                               reserve(x, z, radio) aparta casillas para que el decorado
//                               pequeño no se le meta encima.
// k: { n: pedestal del jefe, zc: centro del mundo, s: hacia qué lado queda el hueco libre
// (+1 derecha, -1 izquierda), x(d): la x a "d" casillas del pedestal hacia ese lado }.
// El pedestal y la casilla donde esperas siempre son tierra (core en CampaignMap).

// Ruido fijo por casilla (los bordes salen igual cada vez)
function hash(c, r, k) {
    let h = (c * 374761393 + r * 668265263 + k * 1442695041) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Mancha ovalada centrada en (cx, cz); jit hace el borde irregular
function blob(c, r, cx, cz, rx, rz, jit = 0, seed = 0) {
    const x = (c + 0.5 - cx) / rx, z = (r + 0.5 - cz) / rz;
    return x * x + z * z <= 1 + (jit ? (hash(c, r, seed) - 0.5) * jit : 0);
}

// Palmera (playa y oasis)
function palm(add, x, z, lean = 0.2) {
    for (let k = 0; k < 4; k++) add(0.18, 0.3, 0.18, 0xc8925a, x + k * 0.05, 0.15 + k * 0.3, z);
    const tx = x + lean, ty = 1.25;
    add(1.0, 0.08, 0.26, 0x4fb83a, tx, ty, z);
    add(0.26, 0.08, 1.0, 0x4fb83a, tx, ty, z);
    add(0.26, 0.2, 0.26, 0x7ad94a, tx, ty + 0.1, z);
}

export const ISLANDS = {
    // Pradera: isla redondeada con un islote al lado y un molino
    meadow: {
        land: (c, r, k) => blob(c, r, k.x(0.9), k.zc, 4.6, 3.9, 0.5, 1) || blob(c, r, k.x(5.4), k.zc + 3.2, 1.3, 1.1, 0, 2),
        landmark(add, k, reserve) {
            const x = k.x(3.4), z = k.zc - 1.2;
            reserve(x, z, 1.2);
            add(0.9, 1.5, 0.9, 0xfff6e8, x, 0.75, z);
            add(1.05, 0.5, 1.05, 0xff5a5a, x, 1.7, z);
            add(0.5, 0.3, 0.5, 0xff5a5a, x, 2.05, z);
            add(0.3, 0.4, 0.06, 0x8a5a34, x, 0.2, z + 0.46, { outlined: false });          // puerta
            add(0.12, 0.12, 0.12, 0x5a3a24, x, 1.3, z + 0.52);                             // eje
            add(0.14, 1.8, 0.06, 0xffd86b, x, 1.3, z + 0.58, { rz: 0.5 });                 // aspas
            add(0.14, 1.8, 0.06, 0xffd86b, x, 1.3, z + 0.58, { rz: -1.07 });
            // Árbol en el islote
            const tx = k.x(5.4), tz = k.zc + 3.2;
            reserve(tx, tz, 0.8);
            add(0.22, 0.5, 0.22, 0x8a5a34, tx, 0.25, tz);
            add(0.86, 0.6, 0.86, 0x3fbf4a, tx, 0.78, tz);
            add(0.52, 0.32, 0.52, 0x6fe06a, tx, 1.22, tz);
        },
    },

    // Playa: archipiélago, una isla pequeña con el jefe y varios islotes con palmeras
    beach: {
        islets: (k) => [[k.x(4.3), k.zc - 2.3, 1.6, 1.4], [k.x(4.6), k.zc + 2.1, 1.3, 1.2], [k.x(-3.2), k.zc - 3.6, 0.9, 0.85], [k.x(1.9), k.zc + 4.2, 0.9, 0.8]],
        land(c, r, k) {
            if (blob(c, r, k.n.x, k.zc + 0.4, 2.6, 3.1, 0.4, 1)) return true;
            return this.islets(k).some(([x, z, rx, rz], i) => blob(c, r, x, z, rx, rz, 0.3, 2 + i));
        },
        landmark(add, k, reserve) {
            this.islets(k).forEach(([x, z, rx], i) => {
                reserve(x, z, rx);
                if (rx > 1) palm(add, x - 0.2, z, 0.2);
                else add(0.4, 0.3, 0.4, 0xf0c977, x, 0.15, z);                              // montoncito de arena
                if (i === 0) palm(add, x + 0.6, z + 0.5, -0.2);
            });
        },
    },

    // Desierto: una duna larga y estrecha, con su pirámide y un oasis
    desert: {
        land: (c, r, k) => blob(c, r, 6, k.zc + 0.2, 5.9, 2.8, 0.35, 1),
        landmark(add, k, reserve) {
            const px = k.x(4.3), pz = k.zc - 0.6;
            reserve(px, pz, 1.6);
            [[2.1, 0.0], [1.6, 0.35], [1.1, 0.7], [0.6, 1.05], [0.2, 1.35]].forEach(([s, y]) => add(s, 0.35, s, 0xf4bb70, px, y + 0.17, pz));
            add(0.36, 0.4, 0.06, 0x7a4824, px, 0.22, pz + 1.06, { outlined: false });          // entrada
            // Oasis: charca con borde de arena húmeda y palmeras
            const ox = k.x(-1.4), oz = k.zc + 1.7;
            reserve(ox, oz, 1.2);
            add(1.6, 0.06, 1.1, 0xd8a85a, ox, 0.03, oz, { outlined: false });
            add(1.3, 0.08, 0.8, 0x2fb8ff, ox, 0.05, oz, { outlined: false });
            add(0.6, 0.09, 0.3, 0x9af6ff, ox - 0.2, 0.06, oz - 0.1, { outlined: false });
            palm(add, ox + 0.9, oz - 0.4, 0.2);
        },
    },

    // Caramelo: tres lóbulos redondos, como gominolas, con una piruleta gigante
    // Separados por un canal de agua y unidos por puentes de bastón de caramelo
    candy: {
        land: (c, r, k) =>
            blob(c, r, k.n.x, k.zc + 0.4, 2.4, 3.3) || blob(c, r, k.x(5.2), k.zc - 1.8, 1.6, 1.7) || blob(c, r, k.x(4.6), k.zc + 2.5, 1.3, 1.3),
        landmark(add, k, reserve) {
            // Puentes de rayas sobre el canal (de cada lóbulo pequeño al grande)
            for (const z of [k.zc - 1.8, k.zc + 2.5]) {
                for (let t = 0; t < 4; t++) {
                    add(0.42, 0.12, 0.7, t % 2 ? 0xff3e5e : 0xffffff, k.x(2.25 + t * 0.42), 0.0, z);
                }
                for (const side of [-0.38, 0.38]) add(1.7, 0.08, 0.08, 0xffffff, k.x(2.88), 0.2, z + side, { outlined: false });
            }
            const x = k.x(5.2), z = k.zc - 1.8;
            reserve(x, z, 1.2);
            add(0.14, 2.0, 0.14, 0xffffff, x, 1.0, z);
            add(1.3, 1.3, 0.22, 0xff4fa3, x, 2.4, z);
            add(0.9, 0.9, 0.24, 0xffffff, x, 2.4, z, { outlined: false });
            add(0.5, 0.5, 0.26, 0x6ff6ff, x, 2.4, z, { outlined: false });
            // Gominolas en el otro lóbulo
            const gx = k.x(4.6), gz = k.zc + 2.5;
            reserve(gx, gz, 1);
            [[0, 0, 0x7dff4a], [0.55, 0.3, 0xffd23f], [-0.45, 0.35, 0xb46bff]].forEach(([dx, dz, c]) => {
                add(0.46, 0.36, 0.46, c, gx + dx, 0.18, gz + dz);
                add(0.3, 0.12, 0.3, c, gx + dx, 0.42, gz + dz);
            });
        },
    },

    // Nieve: una montaña nevada escalonada a un lado de la isla
    snow: {
        land: (c, r, k) => blob(c, r, k.x(1.6), k.zc, 4.9, 4.2, 0.6, 1),
        landmark(add, k, reserve) {
            const x = k.x(4.0), z = k.zc - 0.9;
            reserve(x, z, 2.2);
            const rock = [0x5a6aa8, 0x6a7ab8, 0x7f8fc8, 0x95a4d8, 0xb0bce8];
            // Escalones cada vez más pequeños y algo desplazados: una montaña, no una pirámide
            const levels = [[4.0, 3.4, 0, 0], [3.2, 2.8, 0.15, -0.1], [2.5, 2.2, -0.1, 0.08], [1.9, 1.6, 0.12, -0.06], [1.3, 1.1, 0.02, 0.04]];
            const H = 0.72;
            levels.forEach(([sx, sz, ox, oz], i) => {
                const y = i * H;
                add(sx, H, sz, rock[i], x + ox, y + H / 2, z + oz);
                // Nieve sobre cada escalón, más cuanto más arriba
                const snow = 0.45 + i * 0.1;
                add(sx * snow, 0.1, sz * snow, 0xffffff, x + ox, y + H + 0.05, z + oz, { outlined: false });
            });
            // Cima nevada
            add(0.8, 0.45, 0.7, 0xffffff, x + 0.02, levels.length * H + 0.22, z + 0.04);
            add(0.4, 0.3, 0.36, 0xffffff, x + 0.06, levels.length * H + 0.6, z);
            for (const [dx, dz] of [[-1.9, 1.5], [1.8, 1.4], [-1.6, -1.6]]) add(0.7, 0.35, 0.6, 0xffffff, x + dx, 0.17, z + dz); // nieve al pie
        },
    },

    // Ciudad: una manzana rectangular con muelle y rascacielos de verdad
    city: {
        land(c, r, k) {
            const top = Math.floor(k.zc - 3.6), bottom = Math.floor(k.zc + 2.6);
            const lo = 1, hi = 10;
            if (c >= lo && c <= hi && r >= top && r <= bottom) {
                const corner = (c === lo || c === hi) && (r === top || r === bottom); // esquinas recortadas
                return !corner;
            }
            // Muelle hacia el sur por el lado libre
            const pier = Math.floor(k.x(3.2));
            return c === pier && r > bottom && r <= bottom + 2;
        },
        landmark(add, k, reserve) {
            const cols = [0x3a2d8c, 0x2a3a6a, 0x4a3aa8, 0x23245a];
            const spots = [[3.0, -2.6, 4.6], [4.2, -2.4, 3.4], [3.0, -1.1, 3.0], [4.3, -0.9, 5.2], [3.1, 0.5, 2.4], [4.4, 0.7, 3.8]];
            spots.forEach(([d, dz, h], i) => {
                const x = k.x(d), z = k.zc + dz, c = cols[i % cols.length];
                reserve(x, z, 0.6);
                add(0.95, h, 0.95, c, x, h / 2, z);
                add(0.99, 0.1, 0.99, i % 2 ? 0x2ef2ff : 0xff4fa3, x, h - 0.6, z, { outlined: false });  // franja de neón
                // Ventanas encendidas en las dos caras que mira la cámara
                for (let y = 0.4; y < h - 0.8; y += 0.38) {
                    for (const s of [-0.24, 0.24]) {
                        if (hash(i, Math.round(y * 10), s > 0 ? 1 : 2) < 0.72) add(0.16, 0.16, 0.02, 0xffe680, x + s, y, z + 0.48, { outlined: false });
                        if (hash(i, Math.round(y * 10), s > 0 ? 3 : 4) < 0.6) add(0.02, 0.16, 0.16, 0x8afcff, x + k.s * -0.48, y, z + s, { outlined: false });
                    }
                }
                if (h > 3.5) {
                    add(0.06, 0.7, 0.06, 0x9aa4c8, x, h + 0.35, z);
                    add(0.12, 0.12, 0.12, 0xff2a3a, x, h + 0.74, z, { outlined: false });
                }
            });
            // Barco amarrado al muelle
            const bx = k.x(4.4), bz = Math.floor(k.zc + 2.6) + 2.2;
            add(0.6, 0.3, 1.3, 0xfff6e8, bx, -0.35, bz);
            add(0.4, 0.3, 0.5, 0x2a6aff, bx, -0.05, bz - 0.15);
        },
    },

    // Volcán: borde dentado, el volcán humeante y un río de lava hasta el mar
    volcano: {
        land: (c, r, k) => blob(c, r, k.x(1.2), k.zc, 4.8, 4.0, 1.5, 1),
        landmark(add, k, reserve, map) {
            const x = k.x(3.8), z = k.zc - 1.3;
            reserve(x, z, 1.7);
            [[2.4, 0.25, 0x544350], [1.8, 0.75, 0x544350], [1.2, 1.25, 0x6e5a6c], [0.8, 1.7, 0x6e5a6c]].forEach(([s, y, c]) => add(s, 0.5, s, c, x, y, z));
            add(0.5, 0.06, 0.5, 0xffd23f, x, 1.97, z, { outlined: false });
            add(0.16, 1.2, 0.06, 0xff5a1f, x + 0.3, 1.1, z + 0.42, { outlined: false });
            map.emitters.push({ x, y: 2.05, z, colors: [0x6a5a6a, 0x8a7a8a, 0xff9a1f] });
            // Río de lava que baja hasta la orilla
            for (let t = 0; t < 7; t++) {
                const rx = x + k.s * 0.25 * t, rz = z + 1.3 + t * 0.5;
                reserve(rx, rz, 0.3);
                add(0.5, 0.05, 0.6, t % 2 ? 0xff5a1f : 0xff9a1f, rx, 0.03, rz, { outlined: false });
            }
        },
    },

    // Espacio: un asteroide lleno de cráteres y rocas flotando alrededor
    space: {
        land: (c, r, k) => blob(c, r, k.x(0.6), k.zc + 0.3, 3.7, 3.7, 0.9, 1),
        landmark(add, k, reserve) {
            const rocks = [[k.x(4.7), k.zc - 2.3, 0.9, 1.1], [k.x(4.2), k.zc + 2.6, 1.3, 0.8], [k.x(-3.0), k.zc - 3.6, 0.8, 0.6], [k.x(5.2), k.zc + 0.2, 0.5, 0.5]];
            rocks.forEach(([x, z, y, s], i) => {
                add(s, s * 0.7, s * 0.9, 0x6a6a9a, x, y, z, { ry: i * 0.6 });
                add(s * 0.6, s * 0.3, s * 0.5, 0x8a8ab8, x + 0.1, y + s * 0.45, z, { ry: i * 0.6 });
                add(s * 0.4, s * 0.4, s * 0.4, 0x5a5a88, x - s * 0.5, y - 0.1, z + 0.1, { ry: i });
            });
            // Cráteres en el suelo
            for (const [dx, dz] of [[2.6, -1.8], [-1.6, 2.6], [2.4, 2.0]]) {
                const x = k.x(dx), z = k.zc + dz;
                reserve(x, z, 0.6);
                add(1.0, 0.04, 1.0, 0x3a3f5a, x, 0.02, z, { outlined: false });
                for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) add(0.3, 0.12, 0.3, 0x8a92b8, x + a * 0.55, 0.06, z + b * 0.55);
            }
        },
    },

    // Mundo secreto: una nube de lóbulos redondos (el arcoíris lo pone su decorado)
    rainbow: {
        land: (c, r, k) =>
            blob(c, r, 6, k.zc + 0.3, 3.0, 3.0) || blob(c, r, 3.2, k.zc + 0.9, 1.9, 1.6) || blob(c, r, 8.8, k.zc + 0.9, 1.9, 1.6) ||
            blob(c, r, 4.6, k.zc - 2.1, 1.6, 1.4) || blob(c, r, 7.4, k.zc - 2.1, 1.6, 1.4) || blob(c, r, 6, k.zc + 3.4, 1.7, 1.2),
    },
};

// El pedestal del jefe y la casilla donde esperas son siempre tierra
export function core(c, r, k) {
    return blob(c, r, k.n.x, k.n.z + 0.9, 2.3, 2.6);
}
