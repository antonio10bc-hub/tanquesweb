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
    // Enemigos de supervivencia: más débiles por separado, peligrosos en grupo
    grunt: {
        name: 'SOLDADO',
        hp: 3,
        speed: 3.0,
        radius: 0.36,
        weapon: 'cannon',
        palette: { body: 0xff3e8e, accent: 0xff9a1f, tread: 0x3a1640, barrel: 0xfff6e8, bullet: 0xff9fd0 },
    },
    scout: {
        name: 'EXPLORADOR',
        hp: 2,
        speed: 3.9,
        radius: 0.34,
        weapon: 'cannon',
        palette: { body: 0xff9a1f, accent: 0xffe03a, tread: 0x4a2410, barrel: 0xfff6e8, bullet: 0xffd08a },
    },
    brute: {
        name: 'BRUTO',
        hp: 6,
        speed: 2.6,
        radius: 0.4,
        weapon: 'cannon',
        palette: { body: 0x9b4dff, accent: 0xff3e8e, tread: 0x24123f, barrel: 0xfff6e8, bullet: 0xd6b0ff },
    },
};
