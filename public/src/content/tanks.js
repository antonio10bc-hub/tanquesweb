// Tanques jugables y enemigos. Se instancian desde los niveles por id.
export const TANKS = {
    hero: {
        name: 'CHISPA',
        hp: 6,
        speed: 3.4,
        radius: 0.36,
        weapon: 'cannon',
        palette: { body: 0x23e0d6, accent: 0xffe03a, tread: 0x3b2d6b, barrel: 0xfff6e8, bullet: 0x8afcff },
    },
    rival: {
        name: 'BRUTO',
        hp: 6,
        speed: 3.1,
        radius: 0.36,
        weapon: 'cannon',
        palette: { body: 0xff3e8e, accent: 0xff9a1f, tread: 0x3a1640, barrel: 0xfff6e8, bullet: 0xff9fd0 },
    },
};
