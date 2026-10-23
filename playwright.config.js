// Pruebas del juego en un navegador de verdad (npm test). Arrancan el servidor local y juegan
// partidas cortas usando window.game (y el botón secreto, que en localhost siempre está).
const { defineConfig } = require('@playwright/test');

// SITE_DIR=dist: las pruebas van contra la versión empaquetada (npm run build)
const PORT = process.env.SITE_DIR ? 3198 : 3199;

module.exports = defineConfig({
    testDir: './tests',
    timeout: 120_000,
    expect: { timeout: 15_000 },
    fullyParallel: true,
    workers: process.env.CI ? 2 : 3,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['list'], ['github']] : 'list',
    use: {
        baseURL: `http://localhost:${PORT}`,
        browserName: 'chromium',
        viewport: { width: 390, height: 760 },
        hasTouch: true,
        locale: 'es-ES',
        serviceWorkers: 'block',
        // WebGL por software: funciona igual en una máquina sin tarjeta gráfica
        launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    },
    webServer: {
        command: `PORT=${PORT} SITE_DIR=${process.env.SITE_DIR || 'public'} node server.js`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
    },
});
