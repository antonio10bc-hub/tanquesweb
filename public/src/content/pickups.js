// Objetos que aparecen en la arena. Cada uno describe su efecto con datos que interpreta
// Tank.applyPickup; "useful" le dice a la IA si le merece la pena ir a por él.
// Su modelo 3D está en render/PickupView.js y su efecto visual en core/Game.js.
// "desc" es el texto del glosario del menú: se construye con los propios valores del objeto.
export const PICKUPS = {
    heal: {
        name: 'VIDA',
        heal: 2,              // cura sin pasar del máximo
        color: 0x17d65a, accent: 0xffffff,
        useful: (t) => t.hp < t.maxHp,
        desc: (d) => `Te cura ${d.heal} puntos de vida, sin pasar del máximo.`,
    },
    power: {
        name: 'BALA DE FUEGO',
        damageMult: 2,        // tu SIGUIENTE bala hace el doble (sale grande y en llamas)
        color: 0xffc21a, accent: 0xff6a00,
        useful: (t) => t.damageMult === 1,
        desc: (d) => `Tu siguiente bala sale grande y en llamas y hace ${d.damageMult} veces más daño. Mientras la llevas, tu cañón echa fuego.`,
    },
    shield: {
        name: 'ESCUDO',
        shield: 1,            // absorbe el siguiente impacto
        color: 0x3fa9ff, accent: 0xd6f0ff,
        useful: (t) => t.shield === 0,
        desc: () => 'Una burbuja te protege y para el siguiente impacto que recibas.',
    },
    turbo: {
        name: 'TURBO',
        turbo: 4,             // segundos con más velocidad
        speedMult: 1.6,
        color: 0x00e5ff, accent: 0xffffff,
        useful: (t) => t.turbo <= 0,
        desc: (d) => `Vas mucho más rápido durante ${d.turbo} segundos.`,
    },
    cloak: {
        name: 'INVISIBLE',
        cloak: 3.5,           // segundos invisible aunque dispares (solo te ven pegados a ti)
        color: 0xe2dcff, accent: 0x1b0b33,
        useful: (t) => t.cloak <= 0,
        desc: (d) => `Durante ${String(d.cloak).replace('.', ',')} segundos nadie te ve, ni siquiera al disparar. Solo si te tocan.`,
    },
    bounce: {
        name: 'REBOTE',
        bounce: 2,            // tu siguiente bala rebota en las paredes este número de veces
        color: 0xff4fd8, accent: 0xffffff,
        useful: (t) => t.bounceNext === 0,
        desc: (d) => `Tu siguiente bala rebota ${d.bounce} veces en las paredes. Ideal para disparar desde detrás de un muro.`,
    },
    radar: {
        name: 'RADAR',
        radar: 2.5,           // segundos viendo a los rivales estén donde estén
        color: 0x7dff4a, accent: 0x0b3d22,
        useful: (t) => t.radar <= 0,
        desc: (d) => `Durante ${String(d.radar).replace('.', ',')} segundos ves al rival esté donde esté, aunque se esconda.`,
    },
    nuke: {
        name: 'BOMBA NUCLEAR',
        nuke: { radius: 3, damage: 4, flight: 1.4 }, // radio en tiles, daño a tanques, segundos en el aire
        color: 0xffe600, accent: 0x1b0b33,
        useful: (t) => !t.nukeNext,
        desc: (d) => `Tu siguiente disparo lanza una bomba por encima de los muros a la última posición donde viste al rival. Arrasa ${d.nuke.radius} casillas a la redonda: rompe todos los muros, hasta los que no se rompen a balazos, quema la hierba y hace ${d.nuke.damage} de daño. ¡Cuidado, a ti también!`,
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
