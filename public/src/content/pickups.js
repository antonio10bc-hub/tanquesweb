// Objetos que aparecen en la arena. Para uno nuevo: añade una entrada con su efecto
// (Tank.applyPickup interpreta heal / damageMult) y su modelo en render/PickupView.js.
export const PICKUPS = {
    heal: {
        name: 'VIDA',
        weight: 1,
        heal: 2,              // puntos de vida que cura (sin pasar del máximo)
        label: '+2',
        color: 0xff3e6e,
        accent: 0xffffff,
    },
    power: {
        name: 'DAÑO x2',
        weight: 1,
        damageMult: 2,        // multiplica el daño de tu SIGUIENTE bala
        label: 'x2',
        color: 0xffc21a,
        accent: 0xff6a00,
    },
};

// Reglas de aparición: siempre hay como mucho un objeto en la arena.
export const PICKUP_RULES = {
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
