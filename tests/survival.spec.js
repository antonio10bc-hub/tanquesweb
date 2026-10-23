const { test, expect } = require('@playwright/test');
const { openGame, waitState, noErrors } = require('./helpers');

// Salta a la oleada n: acaba con la actual y se salta el respiro.
async function jumpToWave(page, n) {
    await page.evaluate((n) => {
        game.wave = n - 1;
        for (const t of game.world.enemies()) {
            t.hp = 0;
            t.alive = false;
        }
    }, n);
    await page.waitForFunction(() => game.waveClear);
    await page.evaluate(() => (game.waveTimer = 0));
    await page.waitForFunction((n) => game.wave === n && game.dropping.length === 0, n, { timeout: 20_000 });
}

test('supervivencia: los tipos nuevos se presentan y cada 5 oleadas llega un mini jefe', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => game.startSurvival(undefined, 'volcano'));
    await waitState(page, 'play');
    await page.evaluate(() => (game.world.player.immortal = true));

    await jumpToWave(page, 4);
    const names = await page.evaluate(() => game.world.enemies().filter((t) => t.alive).map((t) => t.def.name));
    expect(names).toContain('FRANCOTIRADOR');
    await expect(page.locator('#callout')).toHaveText('¡NUEVO: FRANCOTIRADOR!');

    await jumpToWave(page, 5);
    expect(await page.evaluate(() => game.miniBoss && game.miniBoss.def.name)).toBe('MAGMATÓN');
    await expect(page.locator('#bossbar')).toBeVisible();

    await jumpToWave(page, 6);
    expect(await page.evaluate(() => game.miniBoss)).toBeNull();
    await expect(page.locator('#bossbar')).toBeHidden();
    noErrors(errors);
});

test('el acorazado para las balas de frente pero no las de lado', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => game.startSurvival(undefined, 'meadow'));
    await waitState(page, 'play');
    const r = await page.evaluate(async () => {
        const { enemyDef } = await import('/src/content/survival.js');
        const w = game.world, pl = w.player;
        const a = w.spawn({ def: enemyDef('armored', 'meadow'), params: {} }, 'enemy', 'dummy', { x: pl.x, z: pl.z - 3 });
        a.aimYaw = 0;
        w.hitTank(a, pl, 1, 0, -1, a.x, a.z, 0xffffff, 'bullet');
        const front = a.hp;
        w.hitTank(a, pl, 1, 1, 0, a.x, a.z, 0xffffff, 'bullet');
        return [a.maxHp, front, a.hp];
    });
    expect(r[1]).toBe(r[0]);
    expect(r[2]).toBe(r[0] - 1);
    noErrors(errors);
});
