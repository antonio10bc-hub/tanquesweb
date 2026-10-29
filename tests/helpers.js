// Utilidades comunes de las pruebas.
const { expect } = require('@playwright/test');

// Abre el juego con un perfil guardado (por defecto, el tutorial ya visto y todos los modos
// abiertos) y espera al menú. Devuelve la lista de errores de la página para comprobar al final
// que no ha habido ninguno.
async function openGame(page, profile = { tutorialDone: true, unlocked: ['campaign', 'survival', 'duel'] }) {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await page.evaluate((p) => {
        localStorage.clear();
        if (p) localStorage.setItem('tankless.profile', JSON.stringify(p));
    }, profile);
    await page.reload();
    await page.waitForFunction(() => window.game && !document.getElementById('btn-campaign').disabled);
    return errors;
}

// Espera a que la partida esté en un estado concreto (intro, play, outro, replay, end...).
async function waitState(page, state, timeout = 60_000) {
    await page.waitForFunction((s) => window.game.state === s, state, { timeout });
}

// El botón secreto: tres toques rápidos sobre tu barra de vida. Se lanzan dentro de la página
// para que vayan seguidos aunque el navegador vaya cargado (varias pruebas a la vez).
async function secretWin(page) {
    await page.evaluate(() => {
        const bar = document.querySelector('.team-p');
        for (let i = 0; i < 3; i++) bar.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
}

const profile = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('tankless.profile') || '{}'));

function noErrors(errors) {
    expect(errors, errors.join('\n')).toEqual([]);
}

module.exports = { openGame, waitState, secretWin, profile, noErrors };
