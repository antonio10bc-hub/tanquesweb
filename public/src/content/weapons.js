// Armas. Un tanque referencia su arma por id.
//  interval        segundos entre disparos mientras estás quieto
//  firstShotDelay  pausa mínima entre soltar el joystick y el primer disparo
//  count/spread    proyectiles por disparo y apertura (rad) entre ellos
export const WEAPONS = {
    cannon: {
        interval: 0.5,
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
