// Temas visuales. Solo cambian el aspecto (y la música y el clima), nunca las reglas:
// la jugabilidad la deciden los arquetipos de content/levels.js.
//
//  walls.wall / block / crate   muro alto, bloque bajo y muro rompible (top/side/height)
//  bush                         colores de la hierba alta
//  ambient                      partículas de clima: 'snow' | 'leaves' | 'sparkle' | null
//  music                        raíz MIDI, escala, tempo y timbre del secuenciador
export const THEMES = {
    candy: {
        name: 'CARAMELO',
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
        ambient: null,
        music: { root: 57, scale: 'major', tempo: 128, lead: 'square' },
    },
    snow: {
        name: 'NIEVE',
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
    beach: {
        name: 'PLAYA',
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
    mountain: {
        name: 'MONTAÑA',
        sea: 0x2f63d9, foam: 0xdfe8ff, island: 0x5d4f8a, outline: 0x17132e,
        floor: [0xa9c97f, 0x96b86e], floorJitter: 0.05,
        dust: 0xe9efd8, scorch: 0x3a3352, clouds: 0xffffff,
        walls: {
            wall: { top: 0xf1f4fa, side: 0x6f7396, height: 1.15 },
            block: { top: 0xb0a6c8, side: 0x6b6188, height: 0.6 },
            crate: { top: 0xd1924e, side: 0x8f5a2e, height: 0.8 },
        },
        bush: [0x2f8f4e, 0x22703c, 0x3fae5e],
        light: { sun: 0xfff6e6, sky: 0xcfd8ff, ground: 0x4b3f80, sunIntensity: 2.2, hemiIntensity: 1.15 },
        ambient: { kind: 'snow', colors: [0xffffff], rate: 8 },
        music: { root: 55, scale: 'dorian', tempo: 112, lead: 'square' },
    },
    autumn: {
        name: 'OTOÑO',
        sea: 0x3a9fd8, foam: 0xf3fbff, island: 0x8f4a32, outline: 0x2a1220,
        floor: [0xf5bb4f, 0xeaa23d], floorJitter: 0.05,
        dust: 0xffe2a8, scorch: 0x4a2418, clouds: 0xfff3e6,
        walls: {
            wall: { top: 0xeedcb8, side: 0xa8714c, height: 1.0 },
            block: { top: 0xff8a1f, side: 0xd2561a, height: 0.55 },
            crate: { top: 0xffe08a, side: 0xd6a842, height: 0.8 },
        },
        bush: [0xd93b2b, 0xff6b2b, 0xffa63a],
        light: { sun: 0xffe6c0, sky: 0xffd6b8, ground: 0x8a3b5a, sunIntensity: 2.3, hemiIntensity: 1.1 },
        ambient: { kind: 'leaves', colors: [0xff8a1f, 0xd93b2b, 0xffc23a], rate: 14 },
        music: { root: 57, scale: 'minor', tempo: 120, lead: 'square' },
    },
    city: {
        name: 'CIUDAD',
        sea: 0x1e2a66, foam: 0x8fa3ff, island: 0x3b3f63, outline: 0x0d0b1f,
        floor: [0x575d7f, 0x4d5272], floorJitter: 0.04,
        dust: 0xc9d0ff, scorch: 0x1b1a2e, clouds: 0xd9deff,
        walls: {
            wall: { top: 0x2ef2ff, side: 0x4b38c9, height: 1.2 },
            block: { top: 0xffd23f, side: 0xff7a2f, height: 0.55 },
            crate: { top: 0xdcab6e, side: 0xa8743f, height: 0.75 },
        },
        bush: [0x3ad97a, 0x2bb35f, 0x7dff9e],
        light: { sun: 0xf0e6ff, sky: 0xb9c4ff, ground: 0xff4fa3, sunIntensity: 2.1, hemiIntensity: 1.25 },
        ambient: null,
        music: { root: 52, scale: 'minor', tempo: 140, lead: 'sawtooth' },
    },
};
