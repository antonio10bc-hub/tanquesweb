// Armas. Un tanque referencia su arma por id.
//  interval        segundos entre disparos mientras estás quieto
//  magazine        disparos antes de tener que recargar
//  reload          segundos de recarga al vaciar el cargador (sigue corriendo aunque te muevas)
//  firstShotDelay  pausa mínima entre soltar el joystick y el primer disparo
//  count/spread    proyectiles por disparo y apertura (rad) entre ellos
export const WEAPONS = {
    cannon: {
        interval: 1.0,
        magazine: 3,
        reload: 2.0,
        firstShotDelay: 0.1,
        speed: 10,
        damage: 1,
        range: 12,
        count: 1,
        spread: 0.14,
        size: 0.24,
        muzzle: 0.62,
    },
    // Cañón de los jefes: balas más gordas, cargador de 4 y algo más de alcance
    bossCannon: {
        interval: 0.85,
        magazine: 4,
        reload: 2.4,
        firstShotDelay: 0.15,
        speed: 9,
        damage: 1,
        range: 13,
        count: 1,
        spread: 0.14,
        size: 0.34,
        muzzle: 1.15,
    },
    // Drones de la ROBOPATRULLA: disparan poco, molestan mucho
    droneGun: {
        interval: 1.4,
        magazine: 2,
        reload: 2.8,
        firstShotDelay: 0.25,
        speed: 9,
        damage: 1,
        range: 10,
        count: 1,
        spread: 0.14,
        size: 0.2,
        muzzle: 0.58,
    },
    // Francotirador de supervivencia: un disparo lento de preparar, pero rapidísimo y de lejos
    sniper: {
        interval: 2.4,
        magazine: 1,
        reload: 2.4,
        firstShotDelay: 0.6,
        speed: 16,
        damage: 1,
        range: 16,
        count: 1,
        spread: 0.14,
        size: 0.2,
        muzzle: 0.95,
    },
    // Minador: cargador corto (su arma de verdad son las minas)
    minerGun: {
        interval: 1.1,
        magazine: 2,
        reload: 2.4,
        firstShotDelay: 0.15,
        speed: 9.5,
        damage: 1,
        range: 11,
        count: 1,
        spread: 0.14,
        size: 0.24,
        muzzle: 0.62,
    },
    // Mini jefes de supervivencia (más pequeños que los de la campaña)
    miniBossCannon: {
        interval: 0.95,
        magazine: 3,
        reload: 2.4,
        firstShotDelay: 0.15,
        speed: 9,
        damage: 1,
        range: 13,
        count: 1,
        spread: 0.14,
        size: 0.3,
        muzzle: 0.82,
    },
};
