const { test, expect } = require('@playwright/test');
const { openGame, waitState, noErrors } = require('./helpers');

test('la primera vez arranca el tutorial y se puede saltar', async ({ page }) => {
    const errors = await openGame(page, null);
    await waitState(page, 'play');
    expect(await page.evaluate(() => game.mode)).toBe('tutorial');
    await page.click('#btn-tut-skip');
    await expect(page.locator('#menu')).toBeVisible();
    noErrors(errors);
});

test('el menú abre Mi Tanque, Objetos, Logros (con estadísticas) y Ajustes', async ({ page }) => {
    const errors = await openGame(page);
    for (const [btn, screen, close] of [
        ['#btn-garage', '#garage', '#btn-garage-close'],
        ['#btn-items', '#glossary', '#btn-glossary-close'],
        ['#btn-trophies', '#trophies', '#btn-trophies-close'],
        ['#btn-settings', '#settings', '#btn-settings-close'],
    ]) {
        await page.click(btn);
        await expect(page.locator(screen)).toBeVisible();
        if (screen === '#trophies') {
            await page.click('.trophy-tabs .tab[data-view="stats"]');
            await expect(page.locator('#stats-list .s-card')).toHaveCount(4);
        }
        await page.click(close);
        await expect(page.locator(screen)).toBeHidden();
    }
    noErrors(errors);
});

test('en local no se piden analíticas', async ({ page }) => {
    const errors = await openGame(page);
    await expect(page.locator('#consent')).toBeHidden();
    await expect(page.locator('.toggle[data-key="analytics"]')).toBeHidden();
    noErrors(errors);
});

test('en inglés los textos salen en inglés', async ({ browser }) => {
    const ctx = await browser.newContext({ locale: 'en-US', timezoneId: 'America/New_York', serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const errors = await openGame(page);
    await expect(page.locator('#btn-play')).toHaveText('QUICK MATCH');
    noErrors(errors);
    await ctx.close();
});

test('el idioma se cambia en Ajustes y se queda guardado', async ({ page }) => {
    const errors = await openGame(page);
    await page.click('#btn-settings');
    await expect(page.locator('#btn-lang')).toHaveText('IDIOMA: ESPAÑOL');
    await page.click('#btn-lang');
    await page.waitForFunction(() => window.game && !document.getElementById('btn-campaign').disabled);
    // Tras recargar sigue en Ajustes, ya en inglés
    await expect(page.locator('#settings')).toBeVisible();
    await expect(page.locator('#btn-lang')).toHaveText('LANGUAGE: ENGLISH');
    await page.click('#btn-settings-close');
    await expect(page.locator('#btn-play')).toHaveText('QUICK MATCH');
    await page.reload();
    await page.waitForFunction(() => window.game && !document.getElementById('btn-campaign').disabled);
    await expect(page.locator('#btn-play')).toHaveText('QUICK MATCH');
    noErrors(errors);
});
