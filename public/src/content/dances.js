// Bailes de victoria: al ganar, la cámara se acerca a tu tanque, baila y sale volando como un
// cohete; después llega la pantalla final. Se compran en "Mi Tanque" (el cohete es gratis).
// move(t, p, fx): t en segundos desde que empieza; rellena la pose p (y, rx, ry, rz, sx, sy,
// turret, recoil) y pide efectos con fx(tipo, altura). El despegue final es común a todos
// (render/dance.js) y move se sigue llamando durante el vuelo, así un giro puede continuar.
import { L } from '../core/I18n.js';

// Segundos: el baile y el vuelo hacia arriba hasta salir de cuadro
export const DANCE = { move: 1.3, lift: 0.8 };

// Salto: altura de una parábola que dura d segundos y sube h
const hop = (t, d, h) => (t >= 0 && t <= d ? 4 * h * (t / d) * (1 - t / d) : 0);
const smooth = (k) => k * k * (3 - 2 * k);

export const DANCES = [
    {
        id: 'd_rocket', name: L('ROCKET', 'COHETE'), price: 0,
        // Se agacha temblando mientras carga y despega
        move(t, p, fx) {
            const k = Math.min(1, t / 1.1);
            p.sy = 1 - 0.2 * k;
            p.sx = 1 + 0.1 * k;
            p.rz = Math.sin(t * 70) * 0.05 * k;
            if (t < DANCE.move) fx('spark', 0.05);
        },
    },
    {
        id: 'd_spin', name: L('TORNADO', 'TORNADO'), price: 3,
        // Gira cada vez más rápido hasta despegar dando vueltas
        move(t, p, fx) {
            p.ry = t * t * 10;
            p.y = Math.min(t, DANCE.move) * 0.12;
            if (t > 0.5 && t < DANCE.move) fx('dust', 0.05);
        },
    },
    {
        id: 'd_flip', name: L('BACKFLIP', 'VOLTERETA'), price: 3,
        // Un saltito para coger impulso y una voltereta hacia atrás
        move(t, p) {
            p.y = hop(t, 0.4, 0.35) + hop(t - 0.45, 0.85, 1.5);
            const u = Math.min(1, Math.max(0, (t - 0.5) / 0.7));
            p.rx = -smooth(u) * Math.PI * 2;
            const land = (d) => Math.max(0, 1 - Math.abs(t - d) / 0.08);
            p.sy = 1 - 0.2 * Math.max(land(0.4), land(0.45));
        },
    },
    {
        id: 'd_boing', name: L('BOING', 'BOING'), price: 3,
        // Tres botes cada vez más altos, aplastándose al tocar el suelo
        move(t, p) {
            const hops = [[0, 0.32, 0.3], [0.36, 0.4, 0.6], [0.8, 0.5, 1]];
            let squash = 0;
            for (const [s, d, h] of hops) {
                p.y += hop(t - s, d, h);
                squash = Math.max(squash, 1 - Math.abs(t - (s + d)) / 0.06, 1 - Math.abs(t - s) / 0.06);
            }
            squash = Math.max(0, squash) * (t < DANCE.move ? 1 : 0);
            p.sy = 1 - 0.25 * squash + (p.y > 0.05 ? 0.12 : 0);
            p.sx = 1 + 0.18 * squash - (p.y > 0.05 ? 0.06 : 0);
        },
    },
    {
        id: 'd_heli', name: L('HELICOPTER', 'HELICÓPTERO'), price: 3,
        // La torreta gira como unas aspas y el tanque se eleva balanceándose
        move(t, p, fx) {
            p.turret = t * t * 16;
            p.y = Math.max(0, t - 0.5) * 0.6;
            p.rz = Math.sin(t * 6) * 0.1;
            if (t > 0.4 && t < DANCE.move) fx('dust', 0.05);
        },
    },
    {
        id: 'd_fireworks', name: L('FIREWORKS', 'FUEGOS ARTIFICIALES'), price: 4,
        // Barre el cielo con el cañón y lanza tres fuegos artificiales
        move(t, p, fx) {
            p.turret = Math.sin(t * 5) * 0.7;
            for (const s of [0.2, 0.55, 0.9]) {
                if (t >= s && t - s < 0.25) p.recoil = Math.max(p.recoil, 1 - (t - s) / 0.25);
                if (t >= s && !p.done[s]) {
                    p.done[s] = true;
                    fx('firework', 2.6 + s);
                }
            }
        },
    },
    {
        id: 'd_disco', name: L('DISCO', 'DISCO'), price: 4,
        // Se contonea al ritmo y suelta notas de colores
        move(t, p, fx) {
            p.rz = Math.sin(t * 14) * 0.2;
            p.ry = Math.sin(t * 7) * 0.6;
            p.y = Math.abs(Math.sin(t * 7)) * 0.18;
            if (t < DANCE.move) fx('note', 0.9);
        },
    },
];

export const DANCE_BY_ID = Object.fromEntries(DANCES.map((d) => [d.id, d]));
