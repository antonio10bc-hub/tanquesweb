// Generador de arenas simétricas: cada partida un mapa distinto, siempre justo.
//
// - Simetría por rotación de 180° (siempre): el lado del jugador y el del rival son el
//   mismo mapa girado, así que ninguno tiene ventaja. A veces también espejo izquierda/derecha.
// - El mapa se construye con piezas con forma (barras, L, T, cruces...) separadas por al
//   menos un tile de pasillo, para que no salgan rincones ni callejones encerrados.
// - Cada pieza es de un material elegido por peso: muro (#), bloque bajo (B) o rompible (D).
// - Después se siembran manchas de hierba alta (g), también simétricas: no bloquean, esconden.
// - Según el tema, casillas especiales: hielo (i), parejas de teletransporte (T) y barriles
//   explosivos (X). Los barriles solo se ponen si el mapa sigue conectado.
// - Cada mapa se valida: todo el suelo conectado, densidad razonable y sin línea de tiro
//   directa entre las dos salidas. Si no cumple, se descarta y se genera otro.

const PIECES = [
    { cells: [[0, 0]], weight: 2 },
    { cells: [[0, 0], [1, 0]], weight: 3 },
    { cells: [[0, 0], [1, 0], [2, 0]], weight: 3 },
    { cells: [[0, 0], [1, 0], [0, 1]], weight: 2 },
    { cells: [[0, 0], [1, 0], [2, 0], [0, 1]], weight: 2 },
    { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], weight: 1 },
    { cells: [[0, 0], [1, 0], [2, 0], [1, 1]], weight: 1 },
    { cells: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]], weight: 1 },
];
const TOTAL_WEIGHT = PIECES.reduce((s, p) => s + p.weight, 0);

const DEFAULTS = {
    cols: 13,
    rows: 19,
    pieces: [5, 8],         // intentos de pieza (cada una se copia 2 o 4 veces por simetría)
    density: [0.12, 0.3],   // fracción del interior ocupada por obstáculos
    materials: { '#': 11, B: 9 },  // peso de cada material por pieza
    bushes: [0, 0],         // manchas de hierba alta (cada una se copia por simetría)
    bushSize: [2, 5],       // tiles por mancha
    mirrorChance: 0.5,      // probabilidad de añadir espejo izquierda/derecha
    spawnClear: 2,          // filas libres delante de cada salida
    gap: 1,                 // anchura mínima de los pasillos (2 en las arenas de jefe: el boss es grande)
    ice: [0, 0],            // manchas de hielo
    teleports: 0,           // parejas de teletransporte
    barrels: [0, 0],        // barriles explosivos (cada uno se copia por simetría)
};

// PRNG con semilla (mulberry32): la misma semilla da el mismo mapa.
export function makeRng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function generateArena(params = {}, seed = (Math.random() * 2 ** 32) >>> 0) {
    const p = { ...DEFAULTS, ...params };
    if (p.cols % 2 === 0) throw new Error('[mapgen] cols debe ser impar (columna central para las salidas)');
    const rng = makeRng(seed);
    for (let attempt = 0; attempt < 400; attempt++) {
        const map = tryGenerate(p, rng);
        if (map) return { map, seed };
    }
    return null;
}

function tryGenerate(p, rng) {
    const { cols, rows } = p;
    const grid = [];
    for (let r = 0; r < rows; r++) {
        grid.push([]);
        for (let c = 0; c < cols; c++) grid[r].push(c === 0 || r === 0 || c === cols - 1 || r === rows - 1 ? '#' : '.');
    }
    const mid = (cols - 1) / 2;
    const mirror = rng() < p.mirrorChance;

    // Zonas reservadas: las salidas y unas filas delante de ellas.
    const reserved = (c, r) =>
        Math.abs(c - mid) <= 1 + p.gap && (r <= p.spawnClear || r >= rows - 1 - p.spawnClear);

    const copies = (c, r) => {
        const out = [[c, r], [cols - 1 - c, rows - 1 - r]];
        if (mirror) out.push([cols - 1 - c, r], [c, rows - 1 - r]);
        return out;
    };

    const nPieces = p.pieces[0] + Math.floor(rng() * (p.pieces[1] - p.pieces[0] + 1));
    for (let k = 0; k < nPieces; k++) {
        for (let tries = 0; tries < 30; tries++) {
            const cells = orient(pickPiece(rng), rng);
            const ox = 1 + Math.floor(rng() * (cols - 2));
            const oz = 1 + Math.floor(rng() * Math.ceil((rows - 2) / 2)); // mitad superior + fila central
            const set = new Map();
            let ok = true;
            for (const [x, z] of cells) {
                for (const [c, r] of copies(ox + x, oz + z)) {
                    const g = p.gap;
                    if (c < 1 + g || r < 1 + g || c > cols - 2 - g || r > rows - 2 - g || reserved(c, r)) { ok = false; break; }
                    set.set(r * cols + c, [c, r]);
                }
                if (!ok) break;
            }
            if (!ok || !hasMargin(grid, set, cols, rows, p.gap)) continue;
            const ch = pickWeighted(p.materials, rng);
            for (const [c, r] of set.values()) grid[r][c] = ch;
            break;
        }
    }

    grid[1][mid] = 'E';
    grid[rows - 2][mid] = 'P';
    if (!isGood(grid, p)) return null;
    sowPatches(grid, p, rng, copies, 'g', p.bushes, p.bushSize);
    sowPatches(grid, p, rng, copies, 'i', p.ice, [3, 6]);
    placeTeleports(grid, p, rng);
    placeBarrels(grid, p, rng, copies);
    return grid.map((row) => row.join(''));
}

function pickWeighted(weights, rng) {
    const entries = Object.entries(weights);
    let x = rng() * entries.reduce((s, [, w]) => s + w, 0);
    for (const [k, w] of entries) if ((x -= w) < 0) return k;
    return entries[0][0];
}

// Manchas (hierba, hielo): paseo aleatorio por el suelo libre desde una semilla, con sus
// copias simétricas. Pueden pegarse a muros (es donde más sentido tiene esconderse) pero
// nunca tapan las salidas: la casilla de salida y la de delante quedan libres.
function sowPatches(grid, p, rng, copies, ch, countRange, sizeRange) {
    const { cols, rows } = p;
    const mid = (cols - 1) / 2;
    const free = (c, r) => c > 0 && r > 0 && c < cols - 1 && r < rows - 1 && grid[r][c] === '.' &&
        !(c === mid && (r <= 2 || r >= rows - 3));
    const n = countRange[0] + Math.floor(rng() * (countRange[1] - countRange[0] + 1));
    for (let k = 0; k < n; k++) {
        let c = 1 + Math.floor(rng() * (cols - 2)), r = 1 + Math.floor(rng() * Math.ceil((rows - 2) / 2));
        const size = sizeRange[0] + Math.floor(rng() * (sizeRange[1] - sizeRange[0] + 1));
        for (let s = 0, guard = 0; s < size && guard < 40; guard++) {
            if (free(c, r)) {
                for (const [cc, rr] of copies(c, r)) if (free(cc, rr)) grid[rr][cc] = ch;
                s++;
            }
            const d = Math.floor(rng() * 4);
            c += d === 0 ? 1 : d === 1 ? -1 : 0;
            r += d === 2 ? 1 : d === 3 ? -1 : 0;
            c = Math.max(1, Math.min(cols - 2, c));
            r = Math.max(1, Math.min(rows - 2, r));
        }
    }
}

// Parejas de teletransporte: una casilla y su copia girada 180° (cada bando tiene la suya).
function placeTeleports(grid, p, rng) {
    const { cols, rows } = p, mid = (cols - 1) / 2;
    for (let k = 0, placed = 0; placed < p.teleports && k < 80; k++) {
        const c = 1 + Math.floor(rng() * (cols - 2)), r = 3 + Math.floor(rng() * Math.max(1, Math.floor(rows / 2) - 4));
        const c2 = cols - 1 - c, r2 = rows - 1 - r;
        if (grid[r][c] !== '.' || grid[r2][c2] !== '.' || Math.abs(c - mid) <= 1) continue;
        if (Math.hypot(c - c2, r - r2) < 7) continue;
        grid[r][c] = grid[r2][c2] = 'T';
        placed++;
    }
}

// Barriles: junto a algún muro (es donde hacen gracia) y sin cerrar ningún paso.
function placeBarrels(grid, p, rng, copies) {
    const { cols, rows } = p;
    const n = p.barrels[0] + Math.floor(rng() * (p.barrels[1] - p.barrels[0] + 1));
    const mid = (cols - 1) / 2;
    for (let k = 0, placed = 0; placed < n && k < 80; k++) {
        const c = 1 + Math.floor(rng() * (cols - 2)), r = 2 + Math.floor(rng() * Math.ceil((rows - 4) / 2));
        const cells = copies(c, r);
        if (cells.some(([cc, rr]) => grid[rr][cc] !== '.' || (Math.abs(cc - mid) <= 1 && (rr <= 2 || rr >= rows - 3)))) continue;
        // Pegado a un muro y con un pasillo de "gap" casillas libre por el otro lado
        const wall = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dc, dr]) => solid(grid[r + dr][c + dc]));
        if (!wall) continue;
        let roomy = true;
        for (let g = 1; g <= p.gap; g++) {
            const rr = r - wall[1] * g, cc = c - wall[0] * g;
            if (rr <= 0 || cc <= 0 || rr >= rows - 1 || cc >= cols - 1 || solid(grid[rr][cc])) roomy = false;
        }
        if (!roomy) continue;
        for (const [cc, rr] of cells) grid[rr][cc] = 'X';
        if (connected(grid, p)) placed++;
        else for (const [cc, rr] of cells) grid[rr][cc] = '.';
    }
}

function pickPiece(rng) {
    let x = rng() * TOTAL_WEIGHT;
    for (const piece of PIECES) if ((x -= piece.weight) < 0) return piece.cells;
    return PIECES[0].cells;
}

// Gira la pieza 0/90/180/270° y, a veces, la refleja.
function orient(cells, rng) {
    let out = cells.map(([x, z]) => [x, z]);
    const turns = Math.floor(rng() * 4);
    for (let t = 0; t < turns; t++) out = out.map(([x, z]) => [-z, x]);
    if (rng() < 0.5) out = out.map(([x, z]) => [-x, z]);
    const minX = Math.min(...out.map((v) => v[0])), minZ = Math.min(...out.map((v) => v[1]));
    return out.map(([x, z]) => [x - minX, z - minZ]);
}

// Las copias de una pieza pueden tocarse entre sí (forman una figura simétrica),
// pero deben quedar a "gap" tiles de cualquier otro obstáculo: siempre hay pasillo alrededor.
function hasMargin(grid, set, cols, rows, gap = 1) {
    for (const [c, r] of set.values()) {
        if (grid[r][c] !== '.') return false;
        for (let dr = -gap; dr <= gap; dr++) for (let dc = -gap; dc <= gap; dc++) {
            const nc = c + dc, nr = r + dr;
            if (set.has(nr * cols + nc)) continue;
            if (nr <= 0 || nc <= 0 || nr >= rows - 1 || nc >= cols - 1) continue; // el borde exterior sí puede rozar
            if (grid[nr][nc] !== '.') return false;
        }
    }
    return true;
}

const solid = (ch) => ch === '#' || ch === 'B' || ch === 'D' || ch === 'X';

// ¿Todo el suelo se alcanza desde la salida del jugador (4 direcciones)?
function connected(grid, p) {
    const { cols, rows } = p;
    let open = 0, start = null;
    for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
        if (solid(grid[r][c])) continue;
        open++;
        if (grid[r][c] === 'P') start = [c, r];
    }
    const seen = new Set([start[1] * cols + start[0]]);
    const stack = [start];
    while (stack.length) {
        const [c, r] = stack.pop();
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nc = c + dc, nr = r + dr, key = nr * cols + nc;
            if (seen.has(key) || solid(grid[nr][nc])) continue;
            seen.add(key);
            stack.push([nc, nr]);
        }
    }
    return seen.size === open;
}

function isGood(grid, p) {
    const { cols, rows } = p;
    let interior = 0, filled = 0, open = 0, start = null;
    for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
        interior++;
        if (solid(grid[r][c])) filled++;
        else { open++; if (grid[r][c] === 'P') start = [c, r]; }
    }
    const density = filled / interior;
    if (density < p.density[0] || density > p.density[1]) return false;

    // Todo el suelo alcanzable desde la salida del jugador (4 direcciones).
    const seen = new Set([start[1] * cols + start[0]]);
    const stack = [start];
    while (stack.length) {
        const [c, r] = stack.pop();
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nc = c + dc, nr = r + dr, key = nr * cols + nc;
            if (seen.has(key) || solid(grid[nr][nc])) continue;
            seen.add(key);
            stack.push([nc, nr]);
        }
    }
    if (seen.size !== open) return false;

    // Sin línea de tiro entre las salidas: tiene que haber cobertura en el centro.
    const mid = (cols - 1) / 2 + 0.5;
    for (let z = 1.5; z <= rows - 1.5; z += 0.25) if (solid(grid[Math.floor(z)][Math.floor(mid)])) return true;
    return false;
}
