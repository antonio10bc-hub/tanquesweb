// Temas visuales. Solo cambian el aspecto (y la música y el clima), nunca las reglas:
// la jugabilidad la deciden los arquetipos de content/levels.js.
//
//  sea / foam / island          lo que rodea a la arena (mar, lava, dunas, espacio...)
//  walls.wall / block / crate   muro alto, bloque bajo y muro rompible (top/side/height)
//  bush                         colores de la hierba alta
//  flowers                      opcional: florecitas decorando el suelo
//  clouds                       color de las nubes (null: sin nubes)
//  ambient                      clima: 'snow' | 'rain' | 'dust' | 'embers' | 'petals' | 'stars' | 'sparkle' | null
//  music                        raíz MIDI, escala, tempo y timbre del secuenciador
//  rainbow                      opcional: suelo y muros cambian de color sin parar (mundo secreto)
//  sound                        acústica: tipo de suelo (ruido de las orugas) y eco
//  specials                     casillas especiales del mapa: ice (manchas de hielo) y
//                               barrels (barriles explosivos)
export const THEMES = {
    snow: {
        name: 'NIEVE',
        sound: { ground: 'snow' },
        specials: { ice: [2, 3] },
        sea: 0x4aa8ff, foam: 0xffffff, island: 0x7f9cff, outline: 0x1b1f4a,
        floor: [0xdde9ff, 0xc8dbfa], floorJitter: 0.03,
        dust: 0xffffff, scorch: 0x6a7aa8, clouds: 0xffffff,
        walls: {
            wall: { top: 0xffffff, side: 0x4f7fe0, height: 1.0 },
            block: { top: 0x9fefff, side: 0x2f7ae0, height: 0.55 },
            crate: { top: 0x6fe6ff, side: 0x1fa6d6, height: 0.8 },
        },
        bush: [0x2e9a72, 0x1f7a5c, 0xe8f6ff],
        light: { sun: 0xffffff, sky: 0xe6eeff, ground: 0x5a6fd6, sunIntensity: 2.2, hemiIntensity: 1.2 },
        ambient: { kind: 'snow', colors: [0xffffff, 0xe6f2ff], rate: 40 },
        music: { root: 62, scale: 'minor', tempo: 116, lead: 'triangle' },
    },
    desert: {
        name: 'DESIERTO',
        sound: { ground: 'sand' },
        specials: { barrels: [2, 3] },
        sea: 0xe9a95a, foam: 0xffe6b0, island: 0xc7703a, outline: 0x3a1a14,
        floor: [0xf9d98e, 0xf0c977], floorJitter: 0.04,
        dust: 0xfff0c4, scorch: 0x7a4a2a, clouds: 0xfff6e6,
        walls: {
            wall: { top: 0xf4bb70, side: 0xc4703a, height: 1.0 },
            block: { top: 0x63d25d, side: 0x2c8a3c, height: 0.7 },   // cactus
            crate: { top: 0xb8763a, side: 0x7a4824, height: 0.75 },  // barriles
        },
        bush: [0xd9c25a, 0xb8a040, 0xeedc74],
        light: { sun: 0xfff0d0, sky: 0xffe2b0, ground: 0xd96a3a, sunIntensity: 2.5, hemiIntensity: 1.05 },
        ambient: { kind: 'dust', colors: [0xfff0c4, 0xf4d08a], rate: 22 },
        music: { root: 57, scale: 'phrygian', tempo: 118, lead: 'square' },
    },
    candy: {
        name: 'CARAMELO',
        sound: { ground: 'candy' },
        sea: 0x1fb6ff, foam: 0xeafcff, island: 0xb04bff, outline: 0x1b0b33,
        floor: [0x8af06a, 0x6fdc5a], floorJitter: 0.035,
        dust: 0xf4ffd8, scorch: 0x2c1a45, clouds: 0xffffff,
        walls: {
            wall: { top: 0xffd23f, side: 0xff7a2f, height: 1.0 },
            block: { top: 0x6ff6ff, side: 0x7b5cff, height: 0.55 },
            crate: { top: 0xff8fd8, side: 0xc04bd8, height: 0.8 },
        },
        bush: [0x2fd4b0, 0x1fae96, 0x5cf0c8],
        light: { sun: 0xfff2d8, sky: 0xd6c8ff, ground: 0x7a4cff, sunIntensity: 2.3, hemiIntensity: 1.15 },
        ambient: { kind: 'sparkle', colors: [0xffffff, 0xff8fd8, 0x6ff6ff], rate: 8 },
        music: { root: 57, scale: 'major', tempo: 128, lead: 'square' },
    },
    volcano: {
        name: 'VOLCÁN',
        sound: { ground: 'rock', echo: 0.12 },
        specials: { barrels: [1, 3] },
        sea: 0xff5a1f, foam: 0xffd23f, island: 0x2e2232, outline: 0x120a12,
        floor: [0x544350, 0x47384a], floorJitter: 0.05,
        dust: 0x8a7a80, scorch: 0x140c10, clouds: 0x4a3a48,
        walls: {
            wall: { top: 0x6e5a6c, side: 0x2e2232, height: 1.1 },
            block: { top: 0x9a5cff, side: 0x3a1a6b, height: 0.6 },   // obsidiana
            crate: { top: 0x8a4a3a, side: 0x4a2420, height: 0.8 },   // roca con grietas
        },
        bush: [0xff3e1f, 0xff8a1f, 0xffd23f],                          // hierba de fuego
        light: { sun: 0xffb08a, sky: 0xff8a6a, ground: 0x6a1a2a, sunIntensity: 2.2, hemiIntensity: 1.2 },
        ambient: { kind: 'embers', colors: [0xff5a1f, 0xffd23f, 0xff9a1f], rate: 30 },
        music: { root: 52, scale: 'phrygian', tempo: 132, lead: 'sawtooth' },
    },
    beach: {
        name: 'PLAYA',
        sound: { ground: 'sand' },
        specials: { barrels: [1, 2] },
        sea: 0x12d6e6, foam: 0xffffff, island: 0xf0b45a, outline: 0x3a1c2e,
        floor: [0xffe6a6, 0xf8d68c], floorJitter: 0.03,
        dust: 0xfff1c9, scorch: 0x8a5a3a, clouds: 0xffffff,
        walls: {
            wall: { top: 0xd8b48a, side: 0x9a6e52, height: 1.0 },
            block: { top: 0xff8a73, side: 0xe0506a, height: 0.55 },
            crate: { top: 0xff9a3c, side: 0xb85a2a, height: 0.8 },
        },
        bush: [0x7ad94a, 0x4fb83a, 0xb6ff5c],
        light: { sun: 0xfff4d6, sky: 0xc8f4ff, ground: 0xff9a6b, sunIntensity: 2.4, hemiIntensity: 1.1 },
        ambient: { kind: 'sparkle', colors: [0xffffff, 0xfff4b0], rate: 10 },
        music: { root: 60, scale: 'major', tempo: 132, lead: 'square' },
    },
    meadow: {
        name: 'PRADERA',
        sound: { ground: 'grass' },
        specials: { barrels: [1, 2] },
        sea: 0x3fb8ff, foam: 0xf0fbff, island: 0x8a5a34, outline: 0x1c2410,
        floor: [0x9ae86e, 0x86d85e], floorJitter: 0.04,
        dust: 0xf4ffd8, scorch: 0x3a2a18, clouds: 0xffffff,
        walls: {
            wall: { top: 0x47b85a, side: 0x2a7d3a, height: 1.0 },    // setos
            block: { top: 0xe2e2ea, side: 0x9a9aac, height: 0.5 },   // piedras
            crate: { top: 0xffd86b, side: 0xd6a842, height: 0.75 },  // balas de paja
        },
        bush: [0x3fbf4a, 0xff6fb5, 0xffe03a, 0x2e9e40],               // hierba con flores
        flowers: [0xff6fb5, 0xffe03a, 0xffffff, 0xb46bff],
        light: { sun: 0xfff6dc, sky: 0xdaf2ff, ground: 0x5a9a3a, sunIntensity: 2.3, hemiIntensity: 1.15 },
        ambient: { kind: 'petals', colors: [0xff9fd0, 0xffffff, 0xffe680], rate: 10 },
        music: { root: 60, scale: 'major', tempo: 122, lead: 'triangle' },
    },
    city: {
        name: 'CIUDAD DE NOCHE',
        sound: { ground: 'metal', echo: 0.18 },
        specials: { barrels: [2, 3] },
        sea: 0x0c1033, foam: 0x4a5cff, island: 0x232642, outline: 0x05040f,
        floor: [0x3c4160, 0x343854], floorJitter: 0.05,
        dust: 0x9aa4ff, scorch: 0x0e0d1c, clouds: 0x2a2f5a,
        walls: {
            wall: { top: 0x2ef2ff, side: 0x3a2d8c, height: 1.2 },    // edificios con neón
            block: { top: 0xffd23f, side: 0xff7a2f, height: 0.55 },  // taxis
            crate: { top: 0xff4fa3, side: 0x8a2a6a, height: 0.75 },  // cajas de neón
        },
        bush: [0x3ad97a, 0x2bb35f, 0x7dff9e],
        light: { sun: 0x9aa8ff, sky: 0x6a5aff, ground: 0xff4fa3, sunIntensity: 1.6, hemiIntensity: 1.5 },
        ambient: { kind: 'rain', colors: [0x8fa3ff, 0xc9d0ff], rate: 55 },
        music: { root: 52, scale: 'minor', tempo: 140, lead: 'sawtooth' },
    },
    space: {
        name: 'ESPACIO',
        sound: { ground: 'metal', echo: 0.32 },
        specials: { ice: [1, 2] },
        sea: 0x080420, foam: 0x8a7aff, island: 0x4a3f6b, outline: 0x05030f,
        floor: [0x66739a, 0x5a668a], floorJitter: 0.03,
        dust: 0xc8d4ff, scorch: 0x1a1430, clouds: null,
        walls: {
            wall: { top: 0xd0dcff, side: 0x5a66a8, height: 1.0 },    // módulos de la estación
            block: { top: 0xff4fd8, side: 0x8a2fd6, height: 0.6 },   // cristales
            crate: { top: 0xffa63a, side: 0xc4561a, height: 0.75 },  // contenedores
        },
        bush: [0x7dff4a, 0x3fd6ff, 0xb46bff],                          // plantas alienígenas
        light: { sun: 0xe6e0ff, sky: 0xb0a0ff, ground: 0x2a1a6a, sunIntensity: 2.1, hemiIntensity: 1.3 },
        ambient: { kind: 'stars', colors: [0xffffff, 0xc8d4ff, 0xffe680], rate: 35 },
        music: { root: 50, scale: 'dorian', tempo: 104, lead: 'triangle' },
    },
    // Mundo secreto de la campaña: una pista de arcoíris flotando en el cielo de noche
    rainbow: {
        name: 'ARCOÍRIS',
        sound: { ground: 'candy', echo: 0.24 },
        sea: 0x1a0640, foam: 0xff8fd8, island: 0x7b5cff, outline: 0x12052e,
        floor: [0xffffff, 0xf2eaff], floorJitter: 0,
        dust: 0xffffff, scorch: 0x3a1a6b, clouds: 0xffd6f4,
        walls: {
            wall: { top: 0xffffff, side: 0xd8d0ff, height: 1.0 },
            block: { top: 0xffffff, side: 0xd8d0ff, height: 0.6 },
            crate: { top: 0xfff2fb, side: 0xff8fd8, height: 0.8 },
        },
        bush: [0xff6fb5, 0x6ff6ff, 0xffe03a, 0xb46bff, 0x7dff4a],
        light: { sun: 0xffffff, sky: 0xf0e0ff, ground: 0x7b5cff, sunIntensity: 2.2, hemiIntensity: 1.3 },
        ambient: { kind: 'sparkle', colors: [0xff3e8e, 0xffe03a, 0x23e0d6, 0x7b5cff, 0x7dff4a, 0xffffff], rate: 24 },
        music: { root: 62, scale: 'major', tempo: 150, lead: 'square' },
        rainbow: true,
    },
};
