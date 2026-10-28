// Bailes de victoria: al ganar, la cámara se acerca a tu tanque, baila y sale de cuadro por
// arriba a su manera; después llega la pantalla final (y vuelve a caer del cielo). Se compran
// en "Mi Tanque" (el cohete es gratis). Cada baile tiene sus propios efectos: el fuego del
// despegue es solo del cohete.
//   time: segundos de baile · lift: segundos de la salida hasta perderse por arriba
//   move(t, p, fx): t en segundos desde que empieza; rellena la pose p (y, dx, dz, rx, ry, rz,
//     sx, sy, turret, recoil). Se sigue llamando durante la salida, así un giro puede continuar.
//   exit(u, p, fx, t): la salida, u de 0 a 1; se suma a lo que haya puesto move.
//   fx(tipo, altura, a): pide efectos (render/dance.js); "a" es un dato extra del efecto.
import { L } from '../core/I18n.js';

// Salto: altura de una parábola que dura d segundos y sube h
const hop = (t, d, h) => (t >= 0 && t <= d ? 4 * h * (t / d) * (1 - t / d) : 0);
const smooth = (k) => k * k * (3 - 2 * k);
const clamp01 = (k) => Math.min(1, Math.max(0, k));
// Cuánto está aplastado contra el suelo al caer en el segundo s
const squash = (t, s, w = 0.07) => Math.max(0, 1 - Math.abs(t - s) / w);
// true solo la primera vez que se cumple cond (efectos de un momento concreto)
const once = (p, key, cond) => !!cond && !p.done[key] && (p.done[key] = true);

// Fuegos artificiales: cuándo sale cada uno (los tres últimos, juntos, son el final)
const SHELLS = [0.12, 0.3, 0.46, 0.62, 0.78, 0.92, 1.06, 1.2, 1.34, 1.5, 1.66, 1.8, 2.0, 2.04, 2.08];
const SHELL_FLIGHT = 0.34;
// Disco: un golpe de ritmo
const BEAT = 0.325;

export const DANCES = [
    {
        id: 'd_rocket', name: L('ROCKET', 'COHETE'), price: 0, time: 1.3, lift: 0.8,
        // Se agacha temblando mientras carga y despega echando fuego
        move(t, p, fx) {
            const k = Math.min(1, t / 1.1);
            p.sy = 1 - 0.2 * k;
            p.sx = 1 + 0.1 * k;
            p.rz = Math.sin(t * 70) * 0.05 * k;
            if (t < this.time) fx('spark', 0.05);
        },
        exit(u, p, fx) {
            if (once(p, 'blast', true)) fx('blast', 0);
            p.y += 0.15 + 18 * u * u;
            p.sy *= 1.12;
            p.sx *= 0.92;
            fx('flame', p.y);
        },
    },
    {
        id: 'd_wave', name: L('HELLO!', '¡HOLA!'), price: 1, time: 1.5, lift: 0.8,
        // Saluda moviendo el cañón de lado a lado dando saltitos, y se va de un brinco
        move(t, p, fx) {
            p.turret = Math.sin(t * 14) * 0.9;
            p.y = Math.abs(Math.sin(t * 6.3)) * 0.14;
            p.rz = Math.sin(t * 6.3) * 0.08;
            if (once(p, 'hi', t >= 0.6)) fx('stars', 1.2);
        },
        exit(u, p, fx) {
            if (once(p, 'jump', true)) fx('whoosh', 0);
            p.y += 0.15 + 16 * u * u;
            p.turret = Math.sin(u * 30) * 0.9;
            fx('swoosh', p.y);
        },
    },
    {
        id: 'd_jelly', name: L('JELLY', 'GELATINA'), price: 1, time: 1.6, lift: 0.8,
        // Tiembla como un flan cada vez más fuerte y sale disparado como un muelle
        move(t, p, fx) {
            const k = clamp01(t / this.time), w = Math.sin(t * 20) * (0.12 + 0.25 * k);
            if (t < this.time) fx('wobble', 0);
            p.sy = 1 + w;
            p.sx = 1 - w * 0.7;
            p.rz = Math.sin(t * 13) * 0.1 * k;
            p.ry = Math.sin(t * 7) * 0.2 * k;
        },
        exit(u, p, fx) {
            if (once(p, 'go', true)) fx('boing', 0, 1.2);
            p.y += 0.1 + 17 * u * u;
            const j = Math.sin(u * 40) * (1 - u) * 0.25;
            p.sy = 1.35 + j;
            p.sx = 0.8 - j * 0.6;
            fx('bubbles', p.y);
        },
    },
    {
        id: 'd_pogo', name: L('POGO', 'POGO'), price: 1, time: 1.6, lift: 0.7,
        // Seis saltitos rapidísimos levantando polvo y el último lo lanza al cielo
        move(t, p, fx) {
            const d = 0.26, i = Math.floor(t / d);
            if (i < 6) {
                p.y = hop(t - i * d, d, 0.32);
                const flat = squash(t, (i + 1) * d, 0.05);
                p.sy = 1 - 0.3 * flat + (p.y > 0.05 ? 0.12 : 0);
                p.sx = 1 + 0.2 * flat;
            }
            for (let k = 0; k < 6; k++) if (once(p, `p${k}`, t >= (k + 1) * d)) fx('land', 0, 0.4);
        },
        exit(u, p, fx) {
            if (once(p, 'up', true)) fx('stars', 0.6);
            p.y += 0.15 + 17 * u * u;
            p.sy = 1.25;
            p.sx = 0.85;
            fx('swoosh', p.y);
        },
    },
    {
        id: 'd_bow', name: L('BOW', 'REVERENCIA'), price: 1, time: 1.8, lift: 1,
        // Dos reverencias muy educadas lanzando corazones y sube flotando entre ellos
        move(t, p, fx) {
            const bow = (s) => Math.sin(Math.PI * clamp01((t - s) / 0.55));
            const b = Math.max(bow(0.2), bow(1.0));
            p.rx = 0.55 * b;
            p.turret = -0.3 * b;
            if (once(p, 'h1', t >= 0.45)) fx('hearts', 0.8);
            if (once(p, 'h2', t >= 1.25)) fx('hearts', 0.8);
        },
        exit(u, p, fx) {
            p.y += u * 1.2 + 9 * u * u;
            p.rz = Math.sin(u * 8) * 0.15;
            if (Math.random() < 0.3) fx('hearts', p.y + 0.3, 0.3);
        },
    },
    {
        id: 'd_rocker', name: L('ROCKER', 'ROCKERO'), price: 1, time: 1.7, lift: 0.8,
        // Cabecea a toda velocidad al ritmo de la batería y salta al público
        move(t, p, fx) {
            const k = clamp01(t / 0.3);
            p.rx = Math.max(0, Math.sin(t * 17)) * 0.35 * k;
            p.rz = Math.sin(t * 8.5) * 0.08 * k;
            p.recoil = Math.max(0, Math.sin(t * 17)) ** 6;
            p.y = hop(t - 1.35, 0.35, 0.4);
            fx('note', 0.9);
            // Un acorde de guitarra eléctrica en cada cabezazo
            if (t < 1.35 && once(p, `riff${Math.floor(t / 0.37)}`, true)) fx('riff', 0);
            if (once(p, 'jump', t >= 1.35)) fx('land', 0, 0.6);
        },
        exit(u, p, fx) {
            p.y += 0.2 + 16 * u * u;
            p.rx = -u * Math.PI * 2;
            fx('note', p.y);
            fx('swoosh', p.y);
        },
    },
    {
        id: 'd_moon', name: L('MOONWALK', 'MOONWALK'), price: 2, time: 2, lift: 0.8,
        // Se desliza hacia atrás como si flotara, vuelve, gira sobre sí mismo y se queda
        // de puntillas antes de salir de un salto
        move(t, p, fx) {
            const glide = t < 1.2 ? Math.sin((t / 1.2) * Math.PI) : 0;
            p.dx = -glide * 0.7;
            p.y = Math.abs(Math.sin(t * 9)) * 0.04 * (t < 1.2 ? 1 : 0);
            p.rz = -glide * 0.06;
            p.ry = smooth(clamp01((t - 1.2) / 0.4)) * Math.PI * 2;
            if (t > 1.6) {
                p.sy = 1.12;
                p.sx = 0.92;
                p.rx = -0.12;
            }
            if (t < 1.2 && Math.random() < 0.4) fx('swoosh', -0.2);
            if (once(p, 'pose', t >= 1.6)) fx('stars', 1.1);
        },
        exit(u, p, fx) {
            if (once(p, 'jump', true)) fx('whoosh', 0);
            p.y += 0.15 + 16 * u * u;
            p.ry += u * u * 10;
            fx('glitter', p.y);
        },
    },
    {
        id: 'd_balloon', name: L('BALLOON', 'GLOBO'), price: 2, time: 1.8, lift: 1.2,
        // Infla un globo, se hincha él también y se va flotando colgado de él
        move(t, p, fx) {
            const k = smooth(clamp01(t / 1.2));
            p.sx = 1 + 0.25 * k + Math.sin(t * 9) * 0.03 * k;
            p.sy = 1 + 0.25 * k - Math.sin(t * 9) * 0.03 * k;
            p.y = smooth(clamp01((t - 1.2) / 0.6)) * 0.4;
            p.rz = Math.sin(t * 3) * 0.08 * k;
            fx('balloon', p.y + 1.1, k);
        },
        exit(u, p, fx) {
            p.y += u * 1.5 + 9 * u * u;
            p.rz = Math.sin(u * 7) * 0.18;
            p.dx += Math.sin(u * 4) * 0.4;
            fx('balloon', p.y + 1.1, 1);
        },
    },
    {
        id: 'd_spin', name: L('TORNADO', 'TORNADO'), price: 2, time: 1.7, lift: 1,
        // Gira cada vez más rápido dentro de un remolino que lo levanta y se lo lleva
        move(t, p, fx) {
            const k = clamp01(t / this.time);
            p.ry = t * t * 9;
            p.y = smooth(k) * 0.3;
            p.rz = Math.sin(t * 22) * 0.07 * k;
            p.sy = 1 + 0.1 * k;
            p.sx = 1 - 0.06 * k;
            if (once(p, 'gust', t > 0.25)) fx('gust', 0);
            fx('twister', p.y, k);
        },
        exit(u, p, fx) {
            p.y += u * 1.2 + 10 * u * u;
            p.rz += Math.sin(u * 30) * 0.12;
            fx('twister', p.y, 1);
        },
    },
    {
        id: 'd_flip', name: L('BACKFLIP', 'VOLTERETA'), price: 2, time: 2.1, lift: 0.8,
        // Saltito para coger impulso, una voltereta, una doble más alta y sale disparado
        // dando volteretas sin parar
        move(t, p, fx) {
            p.y = hop(t, 0.3, 0.3) + hop(t - 0.32, 0.62, 1.3) + hop(t - 1, 0.9, 2.4);
            p.rx = -smooth(clamp01((t - 0.36) / 0.52)) * Math.PI * 2 - smooth(clamp01((t - 1.04) / 0.8)) * Math.PI * 4;
            const land = Math.max(squash(t, 0.3), squash(t, 0.32), squash(t, 0.94), squash(t, 1), squash(t, 1.9, 0.12));
            p.sy = 1 - 0.3 * land;
            p.sx = 1 + 0.15 * land;
            for (const [k, s] of [['l1', 0.3], ['l2', 0.94], ['l3', 1.9]]) if (once(p, k, t >= s)) fx('land', 0, k === 'l1' ? 0.5 : 1);
            for (const [k, s, h] of [['s1', 0.63, 1.3], ['s2', 1.45, 2.4]]) if (once(p, k, t >= s)) fx('stars', h + 0.4);
            if (p.y > 0.4 && t < this.time) fx('swoosh', p.y);
        },
        exit(u, p, fx) {
            if (once(p, 'jump', true)) fx('whoosh', 0);
            p.y += 0.15 + 16 * u * u;
            p.rx -= u * Math.PI * 6;
            fx('swoosh', p.y);
        },
    },
    {
        id: 'd_boing', name: L('BOING', 'BOING'), price: 2, time: 2.1, lift: 0.8,
        // Botes cada vez más altos aplastándose como gelatina, coge carrerilla agachado y
        // sale botando hasta el cielo
        move(t, p, fx) {
            const hops = [[0, 0.28, 0.25], [0.31, 0.34, 0.55], [0.68, 0.42, 1], [1.13, 0.52, 1.6]];
            let flat = 0;
            hops.forEach(([s, d, h], i) => {
                p.y += hop(t - s, d, h);
                flat = Math.max(flat, squash(t, s + d), squash(t, s));
                if (once(p, `b${i}`, t >= s + d)) fx('boing', 0, 0.6 + i * 0.25);
            });
            if (t < this.time) {
                // En el aire se estira; al tocar el suelo se aplasta mucho
                const air = p.y > 0.05 ? 1 : 0;
                p.sy = 1 - 0.38 * flat + 0.16 * air;
                p.sx = 1 + 0.3 * flat - 0.08 * air;
                // Carrerilla: se va aplastando y tiembla antes del gran bote
                const w = clamp01((t - 1.68) / 0.42);
                p.sy -= 0.4 * smooth(w);
                p.sx += 0.3 * smooth(w);
                p.rz = Math.sin(t * 60) * 0.04 * w;
            }
        },
        exit(u, p, fx) {
            if (once(p, 'go', true)) fx('boing', 0, 2);
            p.y += 0.1 + 17 * u * u;
            // Sale estirado y temblando como un muelle
            const j = Math.sin(u * 38) * (1 - u) * 0.18;
            p.sy = 1.45 + j;
            p.sx = 0.78 - j * 0.6;
            fx('bubbles', p.y);
        },
    },
    {
        id: 'd_heli', name: L('HELICOPTER', 'HELICÓPTERO'), price: 3, time: 1.8, lift: 1.1,
        // La torreta gira como unas aspas, levanta el polvo del suelo, se eleva balanceándose
        // y se va volando de lado
        move(t, p, fx) {
            p.turret = t * t * 20;
            const up = smooth(clamp01((t - 0.7) / 0.6));
            p.y = up * 0.75 + Math.sin(t * 5) * 0.06 * up;
            p.rz = Math.sin(t * 4) * 0.12 * up + Math.sin(t * 60) * 0.02 * (1 - up);
            p.ry = -up * 0.6;
            const spin = clamp01(t / 0.8);
            fx('rotor', p.y + 0.55, spin);
            fx('downwash', 0, spin * Math.max(0, 1 - p.y / 3));
        },
        exit(u, p, fx) {
            const k = u * u;
            p.y += u * 1.5 + 9 * k;
            p.dx += 3 * k;
            p.rz -= 0.35 * smooth(u);
            p.rx -= 0.25 * smooth(u);
            fx('rotor', p.y + 0.55, 1);
            fx('downwash', 0, Math.max(0, 1 - p.y / 3));
        },
    },
    {
        id: 'd_break', name: L('BREAKDANCE', 'BREAKDANCE'), price: 3, time: 2.1, lift: 0.8,
        // Se tumba de lado y gira como un molino barriendo el suelo, se levanta de golpe,
        // pose congelada y sale girando
        move(t, p, fx) {
            const down = smooth(clamp01((t - 0.15) / 0.3)) * (1 - smooth(clamp01((t - 1.45) / 0.2)));
            p.rz = down * Math.PI * 0.45;
            p.y = down * 0.25;
            const spin = clamp01((t - 0.3) / 1.2);
            p.ry = spin * spin * Math.PI * 8;
            if (down > 0.6) {
                fx('downwash', 0, down);
                fx('scratch', 0);
            }
            if (t > 1.65) {
                p.rz = -0.25;
                p.sy = 0.9;
                p.sx = 1.1;
            }
            if (once(p, 'freeze', t >= 1.65)) fx('stars', 1.1);
        },
        exit(u, p, fx) {
            p.y += 0.15 + 16 * u * u;
            p.ry += u * Math.PI * 10;
            p.rz = 0;
            fx('swoosh', p.y);
        },
    },
    {
        id: 'd_hero', name: L('SUPERHERO', 'SUPERHÉROE'), price: 3, time: 1.6, lift: 0.9,
        // Pose de héroe con la capa al viento, se agacha cogiendo fuerza y sale volando
        // con el puño por delante dejando una estela
        move(t, p, fx) {
            const crouch = smooth(clamp01((t - 0.7) / 0.8));
            p.sy = 1.08 - 0.3 * crouch;
            p.sx = 1 + 0.15 * crouch;
            p.rz = Math.sin(t * 60) * 0.03 * crouch;
            p.turret = -0.4 * (1 - crouch);
            fx('cape', 0.5);
            if (crouch > 0.3) fx('spark', 0.05);
        },
        exit(u, p, fx) {
            if (once(p, 'go', true)) fx('blast', 0);
            p.y += 0.2 + 18 * u * u;
            p.rx = -0.5 * smooth(Math.min(1, u * 3));
            p.sy = 1.15;
            p.sx = 0.9;
            fx('cape', p.y);
            fx('swoosh', p.y);
        },
    },
    {
        id: 'd_fireworks', name: L('FIREWORKS', 'FUEGOS ARTIFICIALES'), price: 3, time: 2.4, lift: 0.9,
        // Barre el cielo con el cañón lanzando fuegos artificiales sin parar, con un gran final
        // de tres a la vez, y sube entre la purpurina
        move(t, p, fx) {
            p.turret = Math.sin(t * 5) * 0.7;
            SHELLS.forEach((s, i) => {
                if (t >= s && t - s < 0.2) {
                    const k = 1 - (t - s) / 0.2;
                    p.recoil = Math.max(p.recoil, k);
                    p.sy = Math.min(p.sy, 1 - 0.12 * k);
                }
                if (once(p, `l${i}`, t >= s)) fx('launch', 0.6, i);
                if (t >= s && t < s + SHELL_FLIGHT) fx('shell', 0, i + (t - s) / SHELL_FLIGHT);
                if (once(p, `f${i}`, t >= s + SHELL_FLIGHT)) fx('firework', 0, i);
            });
        },
        exit(u, p, fx) {
            p.y += 0.15 + 16 * u * u;
            p.ry += u * u * 14;
            fx('glitter', p.y);
        },
    },
    {
        id: 'd_disco', name: L('DISCO', 'DISCO'), price: 3, time: 2.6, lift: 0.9,
        // Bajo una bola de espejos y sobre una pista que se enciende al ritmo: contoneo de
        // caderas, dos vueltas de un salto y un meneo final; sube girando como la bola
        move(t, p, fx) {
            const b = t / BEAT, beat = Math.floor(b), f = b - beat;
            const kick = Math.max(0, 1 - f / 0.35); // golpe de cada tiempo
            if (t < 1.3) {
                // Caderas: de lado a lado, saltito en cada tiempo y la torreta señalando
                p.rz = Math.sin(b * Math.PI) * 0.28;
                p.dx = Math.sin(b * Math.PI) * 0.16;
                p.y = Math.abs(Math.sin(b * Math.PI)) * 0.16;
                p.turret = (beat % 2 ? 0.9 : -0.9) * smooth(Math.min(1, f / 0.3));
            } else if (t < 1.95) {
                // Dos vueltas en el aire
                const k = (t - 1.3) / 0.65;
                p.ry = smooth(k) * Math.PI * 4;
                p.y = hop(t - 1.3, 0.65, 0.55);
            } else {
                // Meneo rápido, aplastándose a cada tiempo
                p.rz = Math.sin(t * 42) * 0.14;
                p.ry = Math.sin(t * 9) * 0.5;
            }
            p.sy *= 1 - 0.14 * kick;
            p.sx *= 1 + 0.08 * kick;
            if (t < this.time + 0.3) {
                if (once(p, `beat${beat}`, true)) fx('floor', 0, beat);
                fx('ball', 2.3, t);
                fx('note', 0.9);
            }
        },
        exit(u, p, fx) {
            p.y += 0.15 + 14 * u * u;
            p.ry += u * u * 22;
            fx('glitter', p.y);
        },
    },
];

export const DANCE_BY_ID = Object.fromEntries(DANCES.map((d) => [d.id, d]));
