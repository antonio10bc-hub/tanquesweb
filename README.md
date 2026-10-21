# Tanques DS

Duelo de tanques voxel para un jugador con estética retro 3D estilo Nintendo DS:
render a baja resolución escalado sin suavizado, color de 5 bits con trama (dither),
sombreado toon a 3 tonos y contornos gruesos.

```bash
npm install
npm start          # http://localhost:3000
```

No hay paso de compilación: módulos ES nativos. Three.js (`public/vendor/`, MIT) y la fuente
Press Start 2P (`public/fonts/`, SIL OFL) se sirven desde la propia web, sin dependencias externas.

**Sin conexión**: `public/sw.js` es un service worker de "primero la red": con conexión siempre
descarga lo último y guarda copia; sin conexión usa la copia. La página le pasa todo lo que ha
cargado para que lo guarde, así que no hay lista de archivos que mantener a mano.

## Cómo se juega

- **Joystick flotante** (táctil/ratón, donde toques) o **WASD / flechas**.
- **Mientras te mueves no disparas y eres invisible** para el rival.
- **Si te paras, disparas solo cada 1 s** hacia el rival (o hacia donde lo viste por última vez),
  pero **disparar te hace visible** un momento. Recibir un impacto o acercarte mucho también te delata.
- **Cargador de 3 balas**: al vaciarlo recargas durante 2 s (la recarga sigue aunque te muevas).
  Bajo la barra de vida de cada tanque se ve su munición o el progreso de la recarga.
- **Cada partida es un mapa nuevo**, generado con simetría de 180° para que ninguno tenga ventaja.
- **Objetos**: aparece uno cada vez, dura 5 s y salta a otro sitio. Nunca aparece pegado a un tanque
  y, si puede, a distancia parecida de los dos. La IA también va a por ellos.
  - **Vida**: cura 2. **Bala de fuego**: la siguiente bala hace el doble. **Escudo**: para un impacto.
  - **Turbo**: más velocidad 4 s. **Invisible**: 3,5 s sin que te vean ni disparando.
  - **Rebote**: la siguiente bala rebota 2 veces. **Radar**: ves al rival 2,5 s esté donde esté.
- **Hierba alta**: dentro solo te ven casi pegados y disparar te delata un instante. Se mueve al pasar.
- **Muros rompibles**: aguantan 3 balas.
- **Arquetipos de escenario**: cada partida elige uno (Arena clásica, Emboscada, Demolición, Fortaleza,
  Carreras, Fantasmas) que decide cuánto muro, qué materiales, cuánta hierba y qué objetos salen,
  y lo viste con uno de sus temas visuales (caramelo, nieve, playa, montaña, otoño, ciudad).
- **Música chiptune** generada según el tema, que se acelera con poca vida. **Repetición** a cámara
  lenta del golpe final. **Vibración** en móviles compatibles. **Pausa** (botón, Esc o P) con ajustes
  de música, sonido y vibración que se recuerdan.
- **Instalable y sin conexión**: "Añadir a pantalla de inicio" la abre a pantalla completa con su
  icono, y tras abrirla una vez con internet funciona también sin conexión.
- La IA juega con **las mismas reglas**: solo sabe dónde estás cuando te ve.

## Estructura

```
public/src/
  config.js            ajustes del motor (resolución, cámara, sigilo, tiempos)
  content/             DATOS del juego: añadir contenido = añadir entradas aquí
    tanks.js           tanques (vida, velocidad, arma, paleta)
    weapons.js         armas (cadencia, velocidad, daño, nº de balas, apertura)
    levels.js          arquetipos de escenario: temas + generador + objetos + rivales
    tiles.js           leyenda de los mapas
    themes.js          temas visuales (colores, clima, música): no cambian las reglas
    pickups.js         objetos (vida, fuego, escudo, turbo, invisible, rebote, radar) y reglas
  core/                bucle y estados (Game), entrada, audio y música sintetizados, repetición,
                       ajustes guardados, vibración, eventos
  world/               simulación pura: World, Tank, Arena (colisión, visión, rutas), Bullets
    MapGen.js          generador de arenas simétricas con semilla
    Pickups.js         aparición de objetos (uno a la vez, lejos de los tanques)
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

**Un arquetipo nuevo**: una entrada en `content/levels.js` con `themes`, `generator`
(`materials` con pesos de `#`, `B`, `D`; `bushes` y `bushSize` para la hierba; `pieces`, `density`)
y `pickups.kinds` con los objetos que salen y su peso.

**Un tema nuevo**: copia uno de `content/themes.js` y cambia colores, `ambient` (clima) y `music`.

**Un objeto nuevo**: añade una entrada en `content/pickups.js` (con `heal` y/o `damageMult`, o un
efecto nuevo que interpretes en `Tank.applyPickup`) y su modelo en `render/PickupView.js`.
Las reglas (duración, distancia mínima a los tanques...) están en `PICKUP_RULES`, y un nivel puede
sobreescribirlas con `pickups: { ... }` o desactivarlas con `pickups: false`.

**Mapas generados** — un nivel con `generator: { cols, rows }` genera una arena nueva en cada
partida (simetría de 180°, a veces también espejo; piezas separadas por pasillos; se descartan
los mapas sin conexión total, con densidad rara o con línea de tiro directa entre salidas).
Parámetros en `world/MapGen.js` (`pieces`, `density`, `lowBlockChance`, `mirrorChance`...).
Para repetir un mapa: `game.levelId`, `game.world.seed` y `game.themeId` lo identifican, y
`game.startMatch(arquetipo, semilla, tema)` lo recrea.

Los iconos de `public/icons/` se renderizaron con el propio motor (el tanque protagonista en baja
resolución, ampliado sin suavizado).

**Una IA nueva** — crea una clase con `update(tank, dt, world)` que rellene `tank.intent`
y regístrala en `ai/brains.js`.

**Un tema nuevo** — copia `candy` en `content/themes.js` y cambia los colores.

Para depurar: `window.game` está expuesto en la consola (`game.startMatch('base')`, `game.world`...).
