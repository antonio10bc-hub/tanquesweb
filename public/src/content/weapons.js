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
};
