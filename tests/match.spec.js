const { test, expect } = require('@playwright/test');
const { openGame, waitState, secretWin, profile, noErrors } = require('./helpers');

test('partida rápida: se gana, sale la repetición y da una moneda', async ({ page }) => {
    const errors = await openGame(page);
    await page.click('#btn-play');
    await waitState(page, 'play');
    await secretWin(page);
    await waitState(page, 'end');
    // Primero la moneda vuela al contador y luego sale el final
    await expect(page.locator('#end-title')).toHaveText('¡VICTORIA!', { timeout: 20_000 });
    const p = await profile(page);
    expect(p.coins).toBe(1);
    expect(p.stats.matches).toBe(1);
    expect(p.stats.victories).toBe(1);
    noErrors(errors);
});

test('jefe: el botón secreto primero lo pasa a fase 2, luego lo derrota y paga una moneda por estrella', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => game.startBoss('w1'));
    await waitState(page, 'play');
    await secretWin(page);
    await page.waitForFunction(() => game.boss.brain.phase === 2);
    await page.waitForFunction(() => !game.cutscene, null, { timeout: 30_000 });
    await secretWin(page);
    await waitState(page, 'end');
    // Primero la ceremonia de las monedas y luego el final con las estrellas
    await expect(page.locator('#end-title')).toHaveText('¡JEFE DERROTADO!', { timeout: 20_000 });
    const p = await profile(page);
    expect(p.campaign.beaten).toContain('w1');
    const stars = p.campaign.stars.w1;
    expect(stars).toBeGreaterThanOrEqual(1);
    expect(p.coins).toBe(stars);
    noErrors(errors);
});

test('duelo a dos: arranca con los dos mandos', async ({ page }) => {
    const errors = await openGame(page);
    await page.click('#btn-duel');
    await waitState(page, 'play');
    expect(await page.evaluate(() => [game.mode, game.input2.enabled])).toEqual(['duel', true]);
    noErrors(errors);
});

test('la repetición del golpe final incluye los ataques del jefe', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => game.startBoss('w7'));
    await waitState(page, 'play');
    await page.evaluate(() => (game.boss.brain.cd = 0));
    await page.waitForFunction(() => game.world.hazards.list.length > 0, null, { timeout: 40_000 });
    await page.evaluate(() => {
        game.boss.brain.phase = 2;
        game.world.hitTank(game.boss, game.world.player, 99, 0, 1, game.boss.x, game.boss.z, 0xffffff, 'bullet');
    });
    await waitState(page, 'replay', 20_000);
    await page.waitForFunction(() => game.hazardView.views.size > 0, null, { timeout: 10_000 });
    noErrors(errors);
});
