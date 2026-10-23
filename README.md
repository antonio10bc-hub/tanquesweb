# Tank-less

Duelo de tanques voxel para un jugador con estética retro 3D estilo Nintendo DS:
render a baja resolución escalado sin suavizado, color de 5 bits con trama (dither),
sombreado toon a 3 tonos y contornos gruesos.

```bash
npm install
npm start          # http://localhost:3000
npm test           # pruebas en Chromium (la primera vez: npx playwright install chromium)
```

**Pruebas** (`tests/`, Playwright): abren el juego en un navegador de verdad y juegan partidas
cortas con `window.game` y el botón secreto (tutorial, menús, partida rápida, jefe con fase 2 y
monedas, duelo, repetición con ataques de jefe, supervivencia con mini jefe y escudo del
acorazado). GitHub Actions las pasa en cada push a `main` (`.github/workflows/tests.yml`).

En local no hay paso de compilación: módulos ES nativos. La web publicada sí se empaqueta:
Vercel ejecuta `npm run build` (`scripts/build.mjs`, esbuild), que copia `public/` en `dist/` y
junta los ~70 módulos de `src/` en un único `src/main.js` minificado (la primera carga pasa de
unas 70 peticiones a 5). Para probarla en local: `npm run build && SITE_DIR=dist npm start`. Three.js (`public/vendor/`, MIT) y la fuente
Press Start 2P (`public/fonts/`, SIL OFL) se sirven desde la propia web, sin dependencias externas.

**Sin conexión**: `public/sw.js` es un service worker de "primero la red": con conexión siempre
descarga lo último y guarda copia; sin conexión usa la copia. La página le pasa todo lo que ha
cargado para que lo guarde, así que no hay lista de archivos que mantener a mano.

## Cómo se juega

La primera vez que se abre empieza un **tutorial** muy corto (se puede saltar y repetir desde
Ajustes): moverse, disparar al pararse (y que eso te delata y recargas), esconderse en la hierba,
coger un objeto y, al final, el muñeco de entrenamiento despierta y es tu primer combate.

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
  - **Turbo**: más velocidad 4 s.
  - **Rebote**: la siguiente bala rebota 5 veces. **Triple disparo**: el siguiente disparo sale en abanico de 3 balas. **Señuelo**: deja una copia de tu tanque que atrae a los rivales 6 s mientras te vuelves invisible un momento. **Radar**: ves al rival 2,5 s esté donde esté.
  - **Bomba nuclear**: el siguiente disparo lanza una bomba por encima de los muros a la última
    posición donde viste al rival; un círculo rojo avisa de dónde cae. Arrasa 3 casillas a la
    redonda: rompe todos los muros del interior (también los que aguantan las balas; el borde no),
    quema la hierba y hace 4 de daño (también a quien la lanza).
- **Hierba alta**: dentro solo te ven casi pegados y disparar te delata un instante. Se mueve al pasar.
- **Muros rompibles**: aguantan 3 balas.
- **Casillas especiales** según el tema: **hielo** (nieve, espacio) en el que resbalas y **bloques de
  TNT** (desierto, volcán, ciudad, playa, pradera: rojos, con un cartel de llama encima) que revientan de un disparo, dañan a los
  tanques cercanos, rompen muros y estallan en cadena.
- **Cuatro modos**: **Partida rápida** (duelo contra un rival), **Campaña**, **Duelo a dos** (dos
  personas en el mismo móvil, cada una con su joystick en su mitad de la pantalla; en el ordenador,
  WASD y flechas; como los dos miran la misma pantalla, escondido se ve solo una sombra tenue) y
  **Supervivencia** (cada
  oleada trae un enemigo más, hasta 8; recuperas 2 de vida al superar cada oleada y se guarda tu
  récord). Los tipos de enemigo van llegando de uno en uno y se presentan la primera vez:
  soldado, explorador (rápido), francotirador (dispara de muy lejos), minador (deja minas que
  pitan antes de estallar), acorazado (su escudo para las balas de frente; la bala de fuego lo
  atraviesa) y bruto. Todos se visten del escenario: colores propios y un adorno (nieve,
  cactus, piruleta, roca de lava, sombrilla, flor, sirena de policía, cúpula espacial). Cada 5
  oleadas llega un **mini jefe**: el jefe de la campaña de ese escenario en pequeño, con su
  ataque especial y su barra de vida (`content/survival.js`). Tras cada oleada pasa un **avión de
  suministros** que suelta una caja: eliges una de tres mejoras (+1 vida máxima, recarga rápida,
  más daño, escudo al empezar cada oleada, imán que atrae los objetos, tanque más rápido), cada una hasta 3 estrellas por partida. En la oleada 25 aparece el **jefe
  secreto**: PRISMA en pequeño, con los ataques de todos los jefes, su música y un logro propio.
- **Campaña**: un mapa voxel vertical que se recorre de abajo arriba, un mundo por temática (pradera,
  playa, desierto, caramelo, nieve, ciudad, volcán, espacio), cada uno sobre su propio mar y unidos
  por un camino de piedras. Cada isla tiene su forma y su pieza (`ui/islands.js`): pradera con
  molino e islote, archipiélago de islotes con palmeras, duna alargada con pirámide y oasis,
  lóbulos de gominola con una piruleta gigante, montaña nevada, manzana de rascacielos con muelle,
  volcán con río de lava, asteroide con cráteres y rocas flotando, y una nube para el arcoíris. En cada mundo espera un **jefe**: un tanque gigante tematizado con su
  ataque especial, que anuncia antes de lanzarlo (embestida, ola gigante que se esquiva detrás de un
  muro, tormenta de arena con remolinos, lluvia de caramelos, carámbanos, drones, lluvia de lava,
  láser que cortan los muros). A mitad de vida pasa a la **fase 2**: ruge, se enfada, va más rápido
  y su ataque se vuelve más fuerte. Se desbloquean en orden; al ganar a los 8 se apartan las nubes
  de lo alto del mapa y aparece el **mundo arcoíris** con el jefe secreto, PRISMA, que usa los
  ataques de todos. Cada jefe se **presenta** antes de la cuenta atrás (primer plano, gesto y su
  nombre en grande con franjas) y da hasta **3 estrellas**: ganar, perder 2 de vida como mucho y
  ganar en menos de 75 s. Al terminar la campaña aparece una **calavera** en el mapa: el **modo
  difícil**, con calaveras que brotan en los bordes de la arena y los jefes con aura maligna, más vida, más velocidad
  y especiales más seguidos (con su propio progreso y estrellas).
- **Monedas y skins**: las monedas de oro se ganan al ganar una partida rápida (1),
  al superar oleadas de supervivencia (la oleada n da n: 1, 3, 6... en total) y en la campaña,
  una por cada estrella nueva de un jefe (normal o difícil). En **Mi Tanque** se compran y equipan, en tres pestañas: 14 gorros voxel y el **tanque
  dorado** (aura, pilar de luz, chispas y balas de oro), 7 **pinturas** y 9 **estelas de bala**
  (arcoíris, llamarada, estrellas, burbujas, confeti, corazones, eléctrica, nevada, sombra), con una bala de muestra en el escaparate.
  Los gorros se ven a escala 1.4. Primero los genéricos y después los trofeos de los jefes, con marco rojo y dorado.
  Cada jefe vencido en **modo difícil** regala su gorro y su
  pintura (sombrero de paja, gorro cangrejo, aguijón, magdalena, muñeco de nieve, gorra de
  policía, minivolcán, antenas marcianas y corona prismática): no se compran, y en Mi Tanque
  dicen a quién hay que vencer.
- **Logros**: 28 (todos los modos tienen alguno, también el tutorial y el duelo), con aviso al conseguirlos y pantalla propia con barras de progreso.
- **Arquetipos de escenario**: cada partida elige uno (Arena clásica, Emboscada, Demolición, Fortaleza,
  Carreras, Fantasmas) que decide cuánto muro, qué materiales, cuánta hierba y qué objetos salen,
  y lo viste con uno de sus temas visuales (nieve, desierto, caramelo, volcán, playa, pradera,
  ciudad de noche, espacio). La bomba nuclear puede salir en cualquiera.
- **Música chiptune** generada según el tema, que se acelera con poca vida. **Repetición** a cámara
  lenta del golpe final. **Vibración** en móviles compatibles. **Pausa** (botón, Esc o P) con ajustes
  de música, sonido y vibración que se recuerdan.
- **Glosario de objetos**: el botón OBJETOS del menú va rotando los objetos en 3D y abre una lista
  con cada uno animado igual que en la partida y su explicación (sale de `desc` en `content/pickups.js`).
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
    pickups.js         objetos (vida, fuego, escudo, turbo, rebote, triple, señuelo, radar, bomba) y reglas
    skins.js           gorros y tanque dorado (precio, construcción voxel)
    achievements.js    logros
    campaign.js        campaña: mundos, jefes (tanque, piezas, ataque, dificultad) y su arena
  core/                bucle y estados (Game), entrada, audio y música sintetizados, repetición,
                       ajustes guardados, vibración, eventos
  world/               simulación pura: World, Tank, Arena (colisión, visión, rutas), Bullets
    Hazards.js         peligros de los jefes: impactos con aviso, charcos, olas y láseres
    MapGen.js          generador de arenas simétricas con semilla
    Pickups.js         aparición de objetos (uno a la vez, lejos de los tanques)
  ai/                  cerebros: PlayerBrain, HunterBrain, BossBrain (+ bossAttacks.js) y su registro
  render/              pipeline retro, cámara, modelo de tanque, partículas, marcadores, HazardView
  ui/                  capa DOM: Hud (menús, vida, avisos), Glossary (objetos), Garage (Mi Tanque),
                       Trophies (logros), CampaignMap (el mapa de la campaña, en 3D)
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

**Una skin nueva**: una entrada en `content/skins.js` con `hat(add)` (cubos sobre la torreta) o
`gold`/`palette`, y su `price`. El progreso (monedas, skins, logros, récords) lo guarda `core/Profile.js`.

**Un logro nuevo**: una entrada en `content/achievements.js` (con `progress` si es acumulativo) y, si
es una hazaña, su comprobación en `core/Achievements.js`.

**Un tema nuevo**: copia uno de `content/themes.js` y cambia colores, `ambient` (clima) y `music`.

**Un jefe nuevo**: una entrada en `WORLDS` de `content/campaign.js` (tanque con `deco`, `attack` y
su tema). Si el ataque es nuevo, añádelo en `ai/bossAttacks.js` usando los peligros de
`world/Hazards.js` (o uno nuevo, con su dibujo en `render/HazardView.js`).

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

## Idioma

Inglés por defecto; español si el navegador está en español (cualquiera de sus idiomas preferidos)
o la zona horaria es de España. `public/src/core/I18n.js` lo decide una vez al cargar. En el código
cada texto es `L('ENGLISH', 'ESPAÑOL')`; en `index.html` el texto escrito es el inglés y el español
va en `data-es` (o `data-es-aria` para las etiquetas accesibles).

## Analíticas

PostHog (región EU), solo en la web publicada (https, nunca en `localhost`). Eventos anónimos,
sin clics automáticos ni grabaciones: `public/src/core/Analytics.js` (arranque y `track`) y
`public/src/core/GameAnalytics.js` (qué se mide, escuchando el bus de eventos y los botones):
`app_opened`, `screen_viewed`, `modal_opened`, `setting_toggled`, `tutorial_step`,
`tutorial_skipped`, `match_started`, `match_ended`, `match_quit`, `pickup_collected`,
`wave_cleared`, `boss_beaten`, `hard_mode_unlocked`, `achievement_unlocked`, `item_bought` e
`item_equipped`. Todos llevan `app: tankless` (el proyecto de PostHog es compartido con los
otros juegos). Salen por `/ingest` (rewrite en `vercel.json`) para esquivar los bloqueadores;
el service worker no los toca.

En el dispositivo del autor (el que abrió el juego con `?dev=tanqueloco`, ver `Dev.js`) se mide siempre, sin aviso ni interruptor, y todos los eventos llevan `author: true` para poder filtrarlos en PostHog.
