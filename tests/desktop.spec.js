// En el ordenador (ratón y teclado, pantalla apaisada): interfaz agrandada, ayudas con teclas
// y duelo en una sola vista. El resto de pruebas van en un móvil.
const { test, expect } = require('@playwright/test');
const { openGame, waitState, noErrors } = require('./helpers');

test.use({ viewport: { width: 1920, height: 1080 }, hasTouch: false });

test('en el ordenador la interfaz se agranda y cabe entera', async ({ page }) => {
    const errors = await openGame(page);
    expect(await page.evaluate(() => document.documentElement.classList.contains('pc'))).toBe(true);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ui').trim())).toBe('1.5');
    for (const [btn, screen, close] of [
        [null, '#menu', null],
        ['#btn-garage', '#garage', '#btn-garage-close'],
        ['#btn-items', '#glossary', '#btn-glossary-close'],
        ['#btn-trophies', '#trophies', '#btn-trophies-close'],
        ['#btn-settings', '#settings', '#btn-settings-close'],
    ]) {
        if (btn) await page.click(btn);
        // Ninguna pieza de la pantalla se sale por arriba ni por abajo
        const out = await page.evaluate((s) => [...document.querySelectorAll(`${s} > *`)]
            .map((el) => el.getBoundingClientRect())
            .filter((r) => r.height && (r.top < 0 || r.bottom > innerHeight)).length, screen);
        expect(out, screen).toBe(0);
        if (close) await page.click(close);
    }
    // Vibrar no existe en un ordenador
    await page.click('#btn-settings');
    await expect(page.locator('#settings .toggle[data-key="vibration"]')).toBeHidden();
    noErrors(errors);
});

test('en el ordenador las ayudas hablan de teclas y el duelo se juega en una vista', async ({ page }) => {
    const errors = await openGame(page);
    await page.click('#btn-play');
    await waitState(page, 'play');
    await expect(page.locator('#hint')).toContainText('WASD');
    await page.keyboard.press('Escape');
    await page.click('#btn-quit');
    await page.click('#btn-duel');
    await waitState(page, 'play');
    await expect(page.locator('#hud')).toHaveClass(/duel-shared/);
    await expect(page.locator('#hud')).not.toHaveClass(/duel-mode/);
    await expect(page.locator('.duel-label.p2')).toContainText('FLECHAS');
    noErrors(errors);
});
