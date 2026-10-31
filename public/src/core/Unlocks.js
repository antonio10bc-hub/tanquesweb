// Modos que se desbloquean jugando. La partida rápida está siempre abierta; el resto:
//   campaña      → ganar 3 partidas rápidas
//   supervivencia → completar la campaña (vencer al jefe secreto, como el modo difícil)
//   duelo a dos  → ganar 5 partidas rápidas
// Una vez abierto, queda apuntado en el perfil (Profile.data.unlocked) y no se vuelve a cerrar.
// Quien ya había jugado un modo antes de que existieran los bloqueos lo conserva abierto.
import { Profile } from './Profile.js';
import { WORLDS } from '../content/index.js';
import { L } from './I18n.js';

const wins = () => Profile.data.stats.wins;
const bossesBeaten = () => WORLDS.filter((w) => Profile.beaten(w.id)).length;

export const UNLOCKS = {
    campaign: {
        name: L('CAMPAIGN', 'CAMPAÑA'),
        need: L('YOU NEED TO WIN 3 QUICK MATCHES TO UNLOCK THE CAMPAIGN', 'NECESITAS GANAR 3 PARTIDAS RÁPIDAS PARA DESBLOQUEAR LA CAMPAÑA'),
        progress: () => [wins(), 3],
        before: () => Profile.data.stats.bossTries > 0 || Profile.data.campaign.beaten.length > 0,
    },
    survival: {
        name: L('SURVIVAL', 'SUPERVIVENCIA'),
        need: L('YOU NEED TO COMPLETE THE CAMPAIGN TO UNLOCK SURVIVAL', 'NECESITAS COMPLETAR LA CAMPAÑA PARA DESBLOQUEAR LA SUPERVIVENCIA'),
        progress: () => (Profile.hardUnlocked ? [1, 1] : [Math.min(bossesBeaten(), WORLDS.length - 1), WORLDS.length]),
        before: () => Profile.data.stats.bestWave > 0 || Profile.data.stats.wavesCleared > 0,
    },
    duel: {
        name: L('TWO-PLAYER DUEL', 'DUELO A DOS'),
        need: L('YOU NEED TO WIN 5 QUICK MATCHES TO UNLOCK THE TWO-PLAYER DUEL', 'NECESITAS GANAR 5 PARTIDAS RÁPIDAS PARA DESBLOQUEAR EL DUELO A DOS'),
        progress: () => [wins(), 5],
        before: () => Profile.data.stats.duels > 0,
    },
};

// ¿Está abierto? (y si acaba de cumplirse, se apunta para siempre)
export function isUnlocked(id) {
    // Cerrado a mano desde el panel de depuración (aunque ya se cumpla lo suyo)
    if ((Profile.data.devLocked || []).includes(id)) return false;
    const list = (Profile.data.unlocked ||= []);
    if (list.includes(id)) return true;
    const u = UNLOCKS[id], [have, need] = u.progress();
    if (have < need && !u.before()) return false;
    list.push(id);
    Profile.save();
    return true;
}

// Panel de depuración: abrir o cerrar un modo a mano
export function forceUnlock(id, open) {
    const d = Profile.data;
    d.devLocked = (d.devLocked || []).filter((x) => x !== id);
    d.unlocked = (d.unlocked || []).filter((x) => x !== id);
    if (open) d.unlocked.push(id);
    else d.devLocked.push(id);
    Profile.save();
}
