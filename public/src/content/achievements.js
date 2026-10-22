// Logros. Los que tienen "progress" muestran una barra (valor actual, objetivo) a partir de
// las estadísticas guardadas; el resto se consiguen con una hazaña concreta (core/Achievements.js).
import { PICKUPS } from './pickups.js';

const KINDS = Object.keys(PICKUPS).length;

export const ACHIEVEMENTS = [
    { id: 'first_win', name: 'PRIMERA VICTORIA', desc: 'Gana una partida rápida.' },
    { id: 'untouched', name: 'INTOCABLE', desc: 'Gana una partida rápida sin recibir ni un impacto.' },
    { id: 'clutch', name: 'AL LÍMITE', desc: 'Gana una partida con 1 de vida.' },
    { id: 'streak3', name: 'EN RACHA', desc: 'Gana 3 partidas rápidas seguidas.', progress: (s) => [s.streak, 3] },
    { id: 'nuke_kill', name: 'APOCALIPSIS', desc: 'Destruye a un rival con la bomba nuclear.' },
    { id: 'bounce_kill', name: 'CARAMBOLA', desc: 'Remata a un rival con una bala rebotada.' },
    { id: 'bush_kill', name: 'EMBOSCADA', desc: 'Remata a un rival desde la hierba alta.' },
    { id: 'demolisher', name: 'DEMOLEDOR', desc: 'Rompe 25 muros.', progress: (s) => [s.cratesBroken, 25] },
    { id: 'collector', name: 'COLECCIONISTA', desc: `Recoge los ${KINDS} tipos de objeto.`, progress: (s) => [s.pickupKinds.length, KINDS] },
    { id: 'wave5', name: 'SUPERVIVIENTE', desc: 'Supera 5 oleadas en supervivencia.', progress: (s) => [s.bestWave, 5] },
    { id: 'wave10', name: 'IMPARABLE', desc: 'Supera 10 oleadas en supervivencia.', progress: (s) => [s.bestWave, 10] },
    { id: 'rich', name: 'HUCHA', desc: 'Consigue 5 monedas de oro.', progress: (s) => [s.coinsEarned, 5] },
    { id: 'fashion', name: 'A LA MODA', desc: 'Ponte un gorro en Mi Tanque.' },
    { id: 'golden', name: 'TODO ORO', desc: 'Equipa el tanque dorado.' },
    { id: 'boss1', name: 'CAZAJEFES', desc: 'Derrota a tu primer jefe de la campaña.' },
    { id: 'bosses', name: 'LEYENDA', desc: 'Derrota a los 8 jefes de la campaña.', progress: (s) => [s.bosses, 8] },
    { id: 'prisma', name: 'MÁS ALLÁ DEL ARCOÍRIS', desc: 'Derrota al jefe secreto.' },
    { id: 'stars_all', name: 'PERFECCIONISTA', desc: 'Consigue las 27 estrellas de la campaña.', progress: (s) => [s.stars, 27] },
    { id: 'nightmare', name: 'PESADILLA', desc: 'Derrota a los 9 jefes en modo difícil.', progress: (s) => [s.hardBosses, 9] },
];
