// Logros. Los que tienen "progress" muestran una barra (valor actual, objetivo) a partir de
// las estadísticas guardadas; el resto se consiguen con una hazaña concreta (core/Achievements.js).
import { PICKUPS } from './pickups.js';
import { L } from '../core/I18n.js';

const KINDS = Object.keys(PICKUPS).length;

export const ACHIEVEMENTS = [
    { id: 'graduate', name: L('GRADUATE', 'GRADUADO'), desc: L('Complete the tutorial.', 'Completa el tutorial.') },
    { id: 'duelist', name: L('DUELIST', 'DUELISTA'), desc: L('Finish a two-player duel.', 'Termina un duelo a dos.') },
    { id: 'rivals', name: L('ETERNAL RIVALS', 'RIVALES ETERNOS'), desc: L('Play 5 two-player duels.', 'Juega 5 duelos a dos.'), progress: (s) => [s.duels, 5] },
    { id: 'first_win', name: L('FIRST WIN', 'PRIMERA VICTORIA'), desc: L('Win a quick match.', 'Gana una partida rápida.') },
    { id: 'untouched', name: L('UNTOUCHABLE', 'INTOCABLE'), desc: L('Win a quick match without taking a single hit.', 'Gana una partida rápida sin recibir ni un impacto.') },
    { id: 'clutch', name: L('CLUTCH', 'AL LÍMITE'), desc: L('Win a match with 1 health left.', 'Gana una partida con 1 de vida.') },
    { id: 'streak3', name: L('ON A ROLL', 'EN RACHA'), desc: L('Win 3 quick matches in a row.', 'Gana 3 partidas rápidas seguidas.'), progress: (s) => [s.streak, 3] },
    { id: 'nuke_kill', name: L('APOCALYPSE', 'APOCALIPSIS'), desc: L('Destroy a rival with the nuke.', 'Destruye a un rival con la bomba nuclear.') },
    { id: 'bounce_kill', name: L('TRICK SHOT', 'CARAMBOLA'), desc: L('Finish off a rival with a bounced shot.', 'Remata a un rival con una bala rebotada.') },
    { id: 'bush_kill', name: L('AMBUSH', 'EMBOSCADA'), desc: L('Finish off a rival from the tall grass.', 'Remata a un rival desde la hierba alta.') },
    { id: 'demolisher', name: L('DEMOLISHER', 'DEMOLEDOR'), desc: L('Break 25 walls.', 'Rompe 25 muros.'), progress: (s) => [s.cratesBroken, 25] },
    { id: 'collector', name: L('COLLECTOR', 'COLECCIONISTA'), desc: L(`Collect all ${KINDS} kinds of item.`, `Recoge los ${KINDS} tipos de objeto.`), progress: (s) => [s.pickupKinds.filter((k) => k in PICKUPS).length, KINDS] }, // solo los que siguen en el juego
    { id: 'wave5', name: L('SURVIVOR', 'SUPERVIVIENTE'), desc: L('Clear 5 waves in survival.', 'Supera 5 oleadas en supervivencia.'), progress: (s) => [s.bestWave, 5] },
    { id: 'wave10', name: L('UNSTOPPABLE', 'IMPARABLE'), desc: L('Clear 10 waves in survival.', 'Supera 10 oleadas en supervivencia.'), progress: (s) => [s.bestWave, 10] },
    { id: 'wave20', name: L('IMMORTAL', 'INMORTAL'), desc: L('Clear 20 waves in survival.', 'Supera 20 oleadas en supervivencia.'), progress: (s) => [s.bestWave, 20] },
    { id: 'flanker', name: L('FLANKER', 'POR EL FLANCO'), desc: L('Destroy an ARMORED tank in survival.', 'Derriba a un ACORAZADO en supervivencia.') },
    { id: 'sniper_hunter', name: L('COUNTER-SNIPER', 'CONTRAFRANCOTIRADOR'), desc: L('Destroy 10 SNIPERS in survival.', 'Derriba a 10 FRANCOTIRADORES en supervivencia.'), progress: (s) => [s.snipers, 10] },
    { id: 'deminer', name: L('BOMB SQUAD', 'ARTIFICIERO'), desc: L('Clear a wave with a MINER without any mine hurting you.', 'Supera una oleada con MINADOR sin que te dañe ninguna mina.') },
    { id: 'giant_slayer', name: L('GIANT SLAYER', 'MATAGIGANTES'), desc: L('Defeat a survival mini boss without taking damage in that wave.', 'Vence a un mini jefe de supervivencia sin recibir daño en esa oleada.') },
    { id: 'rich', name: L('PIGGY BANK', 'HUCHA'), desc: L('Earn 5 gold coins.', 'Consigue 5 monedas de oro.'), progress: (s) => [s.coinsEarned, 5] },
    { id: 'fashion', name: L('FASHIONISTA', 'A LA MODA'), desc: L('Put on a hat in My Tank.', 'Ponte un gorro en Mi Tanque.') },
    { id: 'golden', name: L('ALL GOLD', 'TODO ORO'), desc: L('Equip the golden tank.', 'Equipa el tanque dorado.') },
    { id: 'boss1', name: L('BOSS HUNTER', 'CAZAJEFES'), desc: L('Defeat your first campaign boss.', 'Derrota a tu primer jefe de la campaña.') },
    { id: 'bosses', name: L('LEGEND', 'LEYENDA'), desc: L('Defeat all 8 campaign bosses.', 'Derrota a los 8 jefes de la campaña.'), progress: (s) => [s.bosses, 8] },
    { id: 'pocket_prism', name: L('POCKET PRISM', 'PRISMA DE BOLSILLO'), desc: L('Defeat the secret boss of survival (wave 25).', 'Derrota al jefe secreto de supervivencia (oleada 25).') },
    { id: 'prisma', name: L('BEYOND THE RAINBOW', 'MÁS ALLÁ DEL ARCOÍRIS'), desc: L('Defeat the secret boss.', 'Derrota al jefe secreto.') },
    { id: 'stars_all', name: L('PERFECTIONIST', 'PERFECCIONISTA'), desc: L('Earn all 27 campaign stars.', 'Consigue las 27 estrellas de la campaña.'), progress: (s) => [s.stars, 27] },
    { id: 'nightmare', name: L('NIGHTMARE', 'PESADILLA'), desc: L('Defeat all 9 bosses in hard mode.', 'Derrota a los 9 jefes en modo difícil.'), progress: (s) => [s.hardBosses, 9] },
];
