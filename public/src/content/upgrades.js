// Mejoras de supervivencia: tras cada oleada, el avión de suministros trae tres para elegir.
// Cada una sube un nivel (una estrella) y como mucho llega a 3. Duran toda la partida.
//   apply(tank, nivel, base): base son los valores del tanque al empezar la partida
import { L } from '../core/I18n.js';

export const UPGRADE_MAX = 3;

export const UPGRADES = {
    hp: {
        name: L('+1 MAX HEALTH', '+1 VIDA MÁXIMA'),
        desc: L('One more box of health (and you heal it).', 'Una casilla más de vida (y la recuperas).'),
        icon: 'up-heart',
        apply(t) {
            t.maxHp += 1;
            t.hp = Math.min(t.maxHp, t.hp + 1);
        },
    },
    reload: {
        name: L('FAST RELOAD', 'RECARGA RÁPIDA'),
        desc: L('You reload and fire sooner.', 'Recargas y disparas antes.'),
        icon: 'up-reload',
        apply(t, lvl, base) {
            t.weapon.reload = base.reload * (1 - 0.18 * lvl);
            t.weapon.interval = base.interval * (1 - 0.1 * lvl);
        },
    },
    damage: {
        name: L('MORE DAMAGE', 'MÁS DAÑO'),
        desc: L('Your shots hit harder.', 'Tus balas pegan más fuerte.'),
        icon: 'up-damage',
        apply(t, lvl, base) {
            t.weapon.damage = base.damage * (1 + 0.34 * lvl);
        },
    },
    speed: {
        name: L('FASTER TANK', 'TANQUE MÁS RÁPIDO'),
        desc: L('Your tank drives faster.', 'Tu tanque corre más.'),
        icon: 'up-speed',
        apply(t, lvl, base) {
            t.speed = base.speed * (1 + 0.1 * lvl);
        },
    },
};

// Tres al azar entre las que aún no están al máximo (menos si ya casi no quedan)
export function rollUpgrades(levels) {
    const open = Object.keys(UPGRADES).filter((id) => (levels[id] || 0) < UPGRADE_MAX);
    for (let i = open.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [open[i], open[j]] = [open[j], open[i]];
    }
    return open.slice(0, 3);
}
