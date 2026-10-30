// Constantes compartidas por las partes de Game (colores de efectos y tiempos de escenas).
export const CONFETTI = [0xffe03a, 0x23e0d6, 0xff3e8e, 0xb6ff5c, 0x7b5cff, 0xffffff];
export const FIRE = [0xffe03a, 0xff9a1f, 0xffffff, 0xff3e3e];
export const SPARKS = [0xff4fd8, 0xffffff, 0xffb3f0];
export const TURBO = [0x00e5ff, 0xffffff, 0x8af6ff];
export const NUKE = [0xffe600, 0x1b0b33, 0xffffff];
export const TRIPLE = [0x6ff6ff, 0xffffff, 0x2a8bff];
export const DECOY = [0xb46bff, 0xffffff, 0xe2dcff];
export const REPLAY = { length: 2.2, speed: 0.45 };
// Escena de la fase 2 (segundos): ruge, estalla con el cartel, la cámara vuelve, sigue la partida
export const PHASE = { roar: 0.55, rage: 1.45, back: 2.6, end: 3.2 };
// Presentación del jefe antes de la cuenta atrás: cámara encima, gesto y nombre en grande
export const BOSS_INTRO = { card: 0.75, gesture: 1.0, back: 2.7, extra: 2.6 };
// Si el rival empieza fuera de la pantalla (ordenador: pantalla apaisada), la cámara va a
// enseñarlo antes de la cuenta atrás y vuelve contigo
export const SCOUT = { at: 1.05, back: 2.3, extra: 1.5 };
// Estrellas de cada jefe: ganar · perder como mucho 2 de vida · ganar en menos de "par" segundos
export const STARS = { maxDamage: 2, par: 75, parHard: 95 };
// Modo difícil: los jefes, más duros (vida, velocidad, frecuencia de especiales, esquiva)
export const HARD = { hp: 1.35, speed: 1.08, every: 0.82, dodge: 0.1 };
// Cartel de inicio (partida rápida, supervivencia, duelo): cuándo entra cada parte (nombre,
// tema, rival) y cuánto se retrasa la cuenta atrás para que dé tiempo a leerlo
export const STAGE = { beats: [0.15, 0.55, 1.0], extra: 0.7, extraRival: 1.4 };
