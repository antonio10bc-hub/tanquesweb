# Tanques DS

Duelo de tanques voxel para un jugador con estética retro 3D estilo Nintendo DS:
render a baja resolución escalado sin suavizado, color de 5 bits con trama (dither),
sombreado toon a 3 tonos y contornos gruesos.

```bash
npm install
npm start          # http://localhost:3000
```

No hay paso de compilación: módulos ES nativos + Three.js desde CDN (import map en `public/index.html`).

## Cómo se juega

- **Joystick flotante** (táctil/ratón, donde toques) o **WASD / flechas**.
- **Mientras te mueves no disparas y eres invisible** para el rival.
- **Si te paras, disparas solo cada 1 s** hacia el rival (o hacia donde lo viste por última vez),
  pero **disparar te hace visible** un momento. Recibir un impacto o acercarte mucho también te delata.
- **Cargador de 3 balas**: al vaciarlo recargas durante 2 s (la recarga sigue aunque te muevas).
  Bajo la barra de vida de cada tanque se ve su munición o el progreso de la recarga.
- **Cada partida es un mapa nuevo**, generado con simetría de 180° para que ninguno tenga ventaja.
- La IA juega con **las mismas reglas**: solo sabe dónde estás cuando te ve.

## Estructura

```
public/src/
  config.js            ajustes del motor (resolución, cámara, sigilo, tiempos)
  content/             DATOS del juego: añadir contenido = añadir entradas aquí
    tanks.js           tanques (vida, velocidad, arma, paleta)
    weapons.js         armas (cadencia, velocidad, daño, nº de balas, apertura)
    levels.js          niveles (mapa ASCII, tema, jugador, lista de enemigos + IA)
    tiles.js           leyenda de los mapas
    themes.js          paletas visuales
  core/                bucle y estados (Game), entrada, audio sintetizado, eventos
  world/               simulación pura: World, Tank, Arena (colisión, visión, rutas), Bullets
    MapGen.js          generador de arenas simétricas con semilla
  ai/                  cerebros: PlayerBrain, HunterBrain y su registro (brains.js)
  render/              pipeline retro, cámara, modelo de tanque, partículas, marcadores
  ui/Hud.js            capa DOM (menús, vida, aviso de sigilo)
```

Principios:

- **Simulación separada de la presentación.** `world/` no conoce sonido, cámara ni HUD:
  emite eventos (`shot`, `hit`, `death`, `bulletWall`) y `Game` reacciona con efectos.
- **Un tanque = datos + cerebro.** El cerebro solo decide hacia dónde moverse (`tank.intent`);
  las reglas (disparo automático, visibilidad) son comunes a jugador e IA.
- **Rendimiento:** muros, suelo, balas y partículas van en `InstancedMesh`; balas y
  partículas usan pools con arrays planos (sin crear objetos por frame); geometrías compartidas.

## Añadir contenido

**Un tanque nuevo** — en `content/tanks.js`:
```js
tanque: { name: 'MOLE', hp: 10, speed: 2.4, radius: 0.4, weapon: 'escopeta',
          palette: { body: 0xb6ff5c, accent: 0x7b5cff, tread: 0x22183a, barrel: 0xffffff, bullet: 0xd8ff9a } },
```

**Un arma nueva** — en `content/weapons.js`:
```js
escopeta: { interval: 0.8, magazine: 2, reload: 1.5, firstShotDelay: 0.1, speed: 9, damage: 1, range: 6,
            count: 3, spread: 0.25, size: 0.2, muzzle: 0.62 },
```

**Un nivel nuevo** — en `content/levels.js` (todas las filas del mismo ancho;
`#` muro, `B` bloque bajo, `.` suelo, cualquier otra letra es un punto de aparición):
```js
dos: {
    name: 'DOBLE PROBLEMA', theme: 'candy',
    map: [ '#########', '#E.....E#', '#..B.B..#', '#.......#', '#...P...#', '#########' ],
    player: { tank: 'hero', spawn: 'P' },
    enemies: [
        { tank: 'rival', spawn: 'E', brain: 'hunter' },
        { tank: 'tanque', spawn: 'E', brain: 'hunter', params: { dodge: 0.8, burst: [1, 2] } },
    ],
},
```

**Mapas generados** — un nivel con `generator: { cols, rows }` genera una arena nueva en cada
partida (simetría de 180°, a veces también espejo; piezas separadas por pasillos; se descartan
los mapas sin conexión total, con densidad rara o con línea de tiro directa entre salidas).
Parámetros en `world/MapGen.js` (`pieces`, `density`, `lowBlockChance`, `mirrorChance`...).
Para repetir un mapa: `game.world.seed` muestra la semilla y `game.startMatch('base', semilla)` lo recrea.

**Una IA nueva** — crea una clase con `update(tank, dt, world)` que rellene `tank.intent`
y regístrala en `ai/brains.js`.

**Un tema nuevo** — copia `candy` en `content/themes.js` y cambia los colores.

Para depurar: `window.game` está expuesto en la consola (`game.startMatch('base')`, `game.world`...).
