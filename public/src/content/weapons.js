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
};
