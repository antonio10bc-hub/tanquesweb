import { COMMON_WALLS } from '../world/Arena.js';

// Minimapa de la pausa: la arena vista desde arriba en píxeles (4 por casilla). Solo enseña
// lo que tú sabes: tu tanque, los rivales que estás viendo y la última pista de los demás.
const PX = 4;
const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;

export function drawMinimap(canvas, world, theme) {
    const a = world.arena, p = world.player;
    canvas.width = a.cols * PX;
    canvas.height = a.rows * PX;
    const g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
    const cell = (c, r, color, inset = 0) => {
        g.fillStyle = color;
        g.fillRect(c * PX + inset, r * PX + inset, PX - inset * 2, PX - inset * 2);
    };
    for (let r = 0; r < a.rows; r++) for (let c = 0; c < a.cols; c++) {
        const i = r * a.cols + c;
        cell(c, r, hex(theme.floor[(c + r) & 1]));
        if (a.ice[i]) cell(c, r, '#6fd8ff');
        if (a.bush[i]) cell(c, r, hex(theme.bush[0]), 1);
        if (a.solid[i]) {
            const st = theme.walls[a.styles[i]] || COMMON_WALLS[a.styles[i]] || theme.walls.wall;
            cell(c, r, hex(st.side));
            g.fillStyle = hex(st.top);
            g.fillRect(c * PX, r * PX, PX, PX - 1);
        }
    }
    for (const t of a.teleports) cell(t.c, t.r, '#9af6ff', 1);
    // Objeto en el suelo
    const item = world.pickups && world.pickups.current;
    if (item) dot(g, item.x, item.z, hex(item.def.color), 3);
    // Rivales: a la vista, o la última posición conocida con un interrogante
    for (const info of p.intel.values()) {
        if (!info.opp.alive || info.age === Infinity) continue;
        if (info.visible) dot(g, info.x, info.z, '#ff3e8e', 4);
        else question(g, info.x, info.z);
    }
    // Tú: diana blanca y cian, que se distinga sobre cualquier muro
    dot(g, p.x, p.z, '#23e0d6', 6);
    dot(g, p.x, p.z, '#ffffff', 2);
}

function dot(g, x, z, color, size) {
    const px = Math.round(x * PX - size / 2), pz = Math.round(z * PX - size / 2);
    g.fillStyle = '#1b0b33';
    g.fillRect(px - 1, pz - 1, size + 2, size + 2);
    g.fillStyle = color;
    g.fillRect(px, pz, size, size);
}

function question(g, x, z) {
    const rows = ['.###.', '#...#', '...#.', '..#..', '.....', '..#..'];
    const px = Math.round(x * PX) - 2, pz = Math.round(z * PX) - 3;
    g.fillStyle = '#1b0b33';
    rows.forEach((row, y) => [...row].forEach((ch, xx) => ch === '#' && g.fillRect(px + xx - 1, pz + y - 1, 3, 3)));
    g.fillStyle = '#ff3e8e';
    rows.forEach((row, y) => [...row].forEach((ch, xx) => ch === '#' && g.fillRect(px + xx, pz + y, 1, 1)));
}
