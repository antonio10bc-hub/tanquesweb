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
    // Sin esperar al avión de suministros (tiene su propia prueba)
    await page.evaluate(() => {
        game.supply = null;
        game.plane.stop();
        game.hud.hideUpgrades();
        game.waveTimer = 0;
    });
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
    // Monedas: superar la oleada n da n (aquí se han superado la 4 y la 5 al saltar)
    expect(await page.evaluate(() => game.runCoins)).toBe(3 + 4 + 5);
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

test('en la oleada 25 llega el jefe secreto y vencerlo da su logro', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => game.startSurvival(undefined, 'space'));
    await waitState(page, 'play');
    await page.evaluate(() => (game.world.player.immortal = true));
    await jumpToWave(page, 25);
    expect(await page.evaluate(() => game.miniBoss && game.miniBoss.def.secretBoss)).toBe(true);
    await expect(page.locator('#bb-name')).toHaveText('PRISMA');
    await page.evaluate(() => {
        const b = game.miniBoss;
        game.world.hitTank(b, game.world.player, 99, 0, 1, b.x, b.z, 0xffffff, 'nuke');
    });
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('tankless.profile')).achievements.pocket_prism);
    noErrors(errors);
});

test('tras cada oleada pasa el avión de suministros y la mejora elegida se aplica', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => game.startSurvival(undefined, 'meadow'));
    await waitState(page, 'play');
    await page.evaluate(() => {
        game.world.player.immortal = true;
        for (const t of game.world.enemies()) {
            t.hp = 0;
            t.alive = false;
        }
    });
    await expect(page.locator('.up-card')).toHaveCount(3, { timeout: 15_000 });
    const id = await page.evaluate(() => game.supply.options[0]);
    await page.keyboard.press('Digit1');
    await page.waitForFunction(() => game.wave === 2, null, { timeout: 15_000 });
    expect(await page.evaluate((id) => game.upgrades[id], id)).toBe(1);
    await expect(page.locator('#upgrade')).toBeHidden();
    noErrors(errors);
});
