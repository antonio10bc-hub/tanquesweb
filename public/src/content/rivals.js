// Dificultad del rival de la partida rápida. Las 5 primeras partidas van de menos a más
// (fácil, fácil, fácil, normal, normal) y a partir de ahí cada partida sale al azar entre las
// tres. params se suman a los del cerebro del rival (ai/HunterBrain.js); hp, si está, cambia
// su vida.
import { L } from '../core/I18n.js';

export const RIVALS = {
    // Esquiva poco, dispara ráfagas cortas, se olvida pronto de dónde te vio y no se esconde
    easy: { name: L('EASY', 'FÁCIL'), params: { dodge: 0.1, burst: [1, 2], memory: 1.2, ambush: 0.3, greed: 0.4 }, hp: 4 },
    normal: { name: L('NORMAL', 'NORMAL'), params: {} },
    // Esquiva casi todo, te persigue más tiempo y se emboscada en la hierba
    hard: { name: L('HARD', 'DIFÍCIL'), params: { dodge: 0.72, burst: [2, 3], memory: 4.5, ambush: 2.5, greed: 0.95 } },
};

export const FIRST_RIVALS = ['easy', 'easy', 'easy', 'normal', 'normal'];

// Rival de la partida número n (empezando en 0)
export function rivalFor(n) {
    if (n < FIRST_RIVALS.length) return FIRST_RIVALS[n];
    const ids = Object.keys(RIVALS);
    return ids[(Math.random() * ids.length) | 0];
}
