// Objetos que aparecen en la arena. Cada uno describe su efecto con datos que interpreta
// Tank.applyPickup; "useful" le dice a la IA si le merece la pena ir a por él.
// Su modelo 3D está en render/PickupView.js y su efecto visual en core/Game.js.
export const PICKUPS = {
    heal: {
        name: 'VIDA',
        heal: 2,              // cura sin pasar del máximo
        color: 0x17d65a, accent: 0xffffff,
        useful: (t) => t.hp < t.maxHp,
    },
    power: {
        name: 'BALA DE FUEGO',
        damageMult: 2,        // tu SIGUIENTE bala hace el doble (sale grande y en llamas)
        color: 0xffc21a, accent: 0xff6a00,
        useful: (t) => t.damageMult === 1,
    },
    shield: {
        name: 'ESCUDO',
        shield: 1,            // absorbe el siguiente impacto
        color: 0x3fa9ff, accent: 0xd6f0ff,
        useful: (t) => t.shield === 0,
    },
    turbo: {
        name: 'TURBO',
        turbo: 4,             // segundos con más velocidad
        speedMult: 1.6,
        color: 0x00e5ff, accent: 0xffffff,
        useful: (t) => t.turbo <= 0,
    },
    cloak: {
        name: 'INVISIBLE',
        cloak: 3.5,           // segundos invisible aunque dispares (solo te ven pegados a ti)
        color: 0xe2dcff, accent: 0x1b0b33,
        useful: (t) => t.cloak <= 0,
    },
    bounce: {
        name: 'REBOTE',
        bounce: 2,            // tu siguiente bala rebota en las paredes este número de veces
        color: 0xff4fd8, accent: 0xffffff,
        useful: (t) => t.bounceNext === 0,
    },
    radar: {
        name: 'RADAR',
        radar: 2.5,           // segundos viendo a los rivales estén donde estén
        color: 0x7dff4a, accent: 0x0b3d22,
        useful: (t) => t.radar <= 0,
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
