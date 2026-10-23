// Objetos que aparecen en la arena. Cada uno describe su efecto con datos que interpreta
// Tank.applyPickup; "useful" le dice a la IA si le merece la pena ir a por él.
// Su modelo 3D está en render/PickupView.js y su efecto visual en core/Game.js.
// "desc" es el texto del glosario del menú: se construye con los propios valores del objeto.
import { L } from '../core/I18n.js';
export const PICKUPS = {
    heal: {
        name: L('HEALTH', 'VIDA'),
        heal: 2,              // cura sin pasar del máximo
        color: 0x17d65a, accent: 0xffffff,
        useful: (t) => t.hp < t.maxHp,
        desc: (d) => L(`Heals ${d.heal} health, up to your maximum.`, `Te cura ${d.heal} puntos de vida, sin pasar del máximo.`),
    },
    power: {
        name: L('FIRE SHOT', 'BALA DE FUEGO'),
        damageMult: 2,        // tu SIGUIENTE bala hace el doble (sale grande y en llamas)
        color: 0xffc21a, accent: 0xff6a00,
        useful: (t) => t.damageMult === 1,
        desc: (d) => L(`Your next shot comes out big and on fire and deals ${d.damageMult} times the damage. While you carry it, your cannon spits flames.`, `Tu siguiente bala sale grande y en llamas y hace ${d.damageMult} veces más daño. Mientras la llevas, tu cañón echa fuego.`),
    },
    shield: {
        name: L('SHIELD', 'ESCUDO'),
        shield: 1,            // absorbe el siguiente impacto
        color: 0x3fa9ff, accent: 0xd6f0ff,
        useful: (t) => t.shield === 0,
        desc: () => L('A bubble protects you and stops the next hit you take.', 'Una burbuja te protege y para el siguiente impacto que recibas.'),
    },
    turbo: {
        name: L('TURBO', 'TURBO'),
        turbo: 4,             // segundos con más velocidad
        speedMult: 1.6,
        color: 0x00e5ff, accent: 0xffffff,
        useful: (t) => t.turbo <= 0,
        desc: (d) => L(`You go much faster for ${d.turbo} seconds.`, `Vas mucho más rápido durante ${d.turbo} segundos.`),
    },
    bounce: {
        name: L('BOUNCE', 'REBOTE'),
        bounce: 5,            // tu siguiente bala rebota en las paredes este número de veces
        color: 0xff4fd8, accent: 0xffffff,
        useful: (t) => t.bounceNext === 0,
        desc: (d) => L(`Your next shot bounces off the walls ${d.bounce} times. Perfect for firing from behind a wall.`, `Tu siguiente bala rebota ${d.bounce} veces en las paredes. Ideal para disparar desde detrás de un muro.`),
    },
    radar: {
        name: L('RADAR', 'RADAR'),
        radar: 2.5,           // segundos viendo a los rivales estén donde estén
        color: 0x7dff4a, accent: 0x0b3d22,
        useful: (t) => t.radar <= 0,
        desc: (d) => L(`For ${d.radar} seconds you can see the rival wherever it is, even when it hides.`, `Durante ${String(d.radar).replace('.', ',')} segundos ves al rival esté donde esté, aunque se esconda.`),
    },
    triple: {
        name: L('TRIPLE SHOT', 'TRIPLE DISPARO'),
        triple: 3,            // balas de tu siguiente disparo, en abanico
        spread: 0.22,         // apertura entre ellas (rad)
        color: 0x6ff6ff, accent: 0x2a8bff,
        useful: (t) => !t.tripleNext,
        desc: (d) => L(`Your next shot fans out: ${d.triple} bullets at once. If you carry fire or bounce, all ${d.triple} get it.`, `Tu siguiente disparo sale en abanico: ${d.triple} balas a la vez. Si llevas fuego o rebote, las ${d.triple} lo llevan.`),
    },
    decoy: {
        name: L('DECOY', 'SEÑUELO'),
        decoy: { life: 6, cloak: 1.5 }, // segundos que dura la copia / que tú eres invisible al soltarla
        color: 0xb46bff, accent: 0xffffff,
        useful: (t) => !t.def.boss,
        desc: (d) => L(`You leave an exact copy of your tank that shows itself and draws rivals for ${d.decoy.life} seconds. You turn invisible for a moment to slip away.`, `Dejas una copia exacta de tu tanque que se delata y atrae a los rivales durante ${d.decoy.life} segundos. Tú te vuelves invisible un momento para escabullirte.`),
    },
    nuke: {
        name: L('NUKE', 'BOMBA NUCLEAR'),
        nuke: { radius: 3, damage: 4, flight: 1.4 }, // radio en tiles, daño a tanques, segundos en el aire
        color: 0xffe600, accent: 0x1b0b33,
        useful: (t) => !t.nukeNext,
        desc: (d) => L(`Your next shot lobs a bomb over the walls to where you last saw the rival. It flattens ${d.nuke.radius} tiles around: breaks every wall, even the ones bullets can't, burns the grass and deals ${d.nuke.damage} damage. Careful, to you too!`, `Tu siguiente disparo lanza una bomba por encima de los muros a la última posición donde viste al rival. Arrasa ${d.nuke.radius} casillas a la redonda: rompe todos los muros, hasta los que no se rompen a balazos, quema la hierba y hace ${d.nuke.damage} de daño. ¡Cuidado, a ti también!`),
    },
};

// Reglas de aparición: siempre hay como mucho un objeto en la arena.
// Un arquetipo puede sobreescribirlas y elegir qué objetos salen con "kinds" (id: peso).
export const PICKUP_RULES = {
    kinds: { heal: 1, power: 1 },
    firstDelay: 3,        // segundos desde el inicio hasta el primer objeto
    lifetime: 5,          // segundos que dura en el suelo antes de saltar a otro sitio
    swapDelay: 0.35,      // pausa entre que desaparece y aparece el siguiente
    respawnDelay: 2,      // pausa tras recogerlo
    minTankDist: 3.5,     // nunca aparece a menos de esto de ningún tanque
    minPrevDist: 4,       // ni cerca de donde estaba el anterior
    fairness: 2.5,        // diferencia máxima de distancia jugador/rival para ser "justo"
    radius: 0.45,         // radio de recogida (se suma al del tanque)
    blinkTime: 1.5,       // parpadea los últimos segundos antes de irse
};
