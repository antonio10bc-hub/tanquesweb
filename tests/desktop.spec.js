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

test('en el ordenador la cámara enseña al rival que no se ve y un eco marca por dónde queda mientras está fuera', async ({ page }) => {
    const errors = await openGame(page);
    await page.click('#btn-play');
    expect(await page.evaluate(() => !!game.scout)).toBe(true);
    await waitState(page, 'play');
    // El rival sale arriba, fuera de la pantalla: eco en el borde
    await expect(page.locator('#echoes .echo')).toHaveCount(1);
    // En cuanto entra en la vista (aunque siga escondido) el eco se quita
    await page.evaluate(() => {
        const e = game.world.enemies()[0], p = game.world.player;
        e.frozen = true;
        e.x = p.x + 2;
        e.z = p.z - 1;
    });
    await expect(page.locator('#echoes .echo')).toHaveCount(0);
    noErrors(errors);
});

test('suministros: se eligen con las flechas y Enter, y la pausa va por encima', async ({ page }) => {
    const errors = await openGame(page);
    await page.click('#btn-survival');
    await waitState(page, 'play');
    await page.evaluate(() => game.hud.showUpgrades(['a', 'b', 'c'].map((id) => ({ id, name: id, desc: id, icon: 'heal', level: 0 })), (id) => (window.picked = id)));
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.up-card').nth(2)).toHaveClass(/sel/);
    await page.keyboard.press('Escape');
    await expect(page.locator('#pause')).toBeVisible();
    await page.keyboard.press('Enter'); // en pausa no elige nada
    expect(await page.evaluate(() => window.picked)).toBeUndefined();
    await page.click('#btn-resume');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => window.picked)).toBe('b');
    noErrors(errors);
});

test('los menús se recorren con las flechas y Enter', async ({ page }) => {
    const errors = await openGame(page);
    const focused = () => page.evaluate(() => document.activeElement.id);
    // La primera flecha enseña el botón principal; luego se va al más cercano
    await page.keyboard.press('ArrowDown');
    expect(await focused()).toBe('btn-play');
    for (let i = 0; i < 4 && (await focused()) !== 'btn-garage'; i++) await page.keyboard.press('ArrowUp');
    expect(await focused()).toBe('btn-garage');
    // Mi Tanque: izquierda/derecha siguen cambiando de objeto; abajo baja hasta Volver
    await page.keyboard.press('Enter');
    await expect(page.locator('#garage')).toBeVisible();
    await expect(page.locator('#garage-count')).toHaveText(/^1 /);
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#garage-count')).toHaveText(/^2 /);
    // (el botón de comprar está desactivado sin monedas: el foco empieza en las pestañas)
    await page.keyboard.press('ArrowDown');
    expect(await page.evaluate(() => document.activeElement.classList.contains('tab'))).toBe(true);
    for (let i = 0; i < 5 && (await focused()) !== 'btn-garage-close'; i++) await page.keyboard.press('ArrowDown');
    expect(await focused()).toBe('btn-garage-close');
    await page.keyboard.press('Enter');
    await expect(page.locator('#garage')).toBeHidden();
    // De vuelta en el menú, el foco sigue en Mi Tanque; a Ajustes y de vuelta
    await page.keyboard.press('ArrowRight');
    for (let i = 0; i < 4 && (await focused()) !== 'btn-settings'; i++) await page.keyboard.press('ArrowUp');
    expect(await focused()).toBe('btn-settings');
    await page.keyboard.press('Enter');
    await expect(page.locator('#settings')).toBeVisible();
    await page.keyboard.press('ArrowDown');
    for (let i = 0; i < 8 && (await focused()) !== 'btn-settings-close'; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.locator('#settings')).toBeHidden();
    // Partida: en pausa también, y las flechas no mueven nada del menú mientras juegas
    await page.click('#btn-play');
    await waitState(page, 'play');
    await page.keyboard.press('Escape');
    await page.keyboard.press('ArrowDown');
    expect(await focused()).toBe('btn-resume');
    for (let i = 0; i < 4 && (await focused()) !== 'btn-quit'; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.locator('#menu')).toBeVisible();
    noErrors(errors);
});

test('ajustes del ordenador: tamaño de interfaz, controles y paneles a los lados en partida', async ({ page }) => {
    const errors = await openGame(page);
    const ui = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ui').trim());
    await page.click('#btn-settings');
    await expect(page.locator('#btn-uisize')).toHaveText(/NORMAL/);
    await page.click('#btn-uisize');
    await expect(page.locator('#btn-uisize')).toHaveText(/GRANDE/);
    expect(await ui()).toBe('1.75');
    await page.click('#btn-uisize'); // pequeña
    await page.click('#btn-uisize'); // normal otra vez
    expect(await ui()).toBe('1.5');
    // Tamaño del píxel: fino por defecto (más de las ~216 líneas de normal en 1080p), grande menos
    const lines = () => page.evaluate(() => game.renderer.height);
    await expect(page.locator('#btn-pixel')).toHaveText(/FINO/);
    expect(await lines()).toBeGreaterThan(216);
    await page.click('#btn-pixel');
    await expect(page.locator('#btn-pixel')).toHaveText(/GRANDE/);
    expect(await lines()).toBeLessThan(216);
    await page.click('#btn-pixel');
    expect(await lines()).toBe(216);
    await page.click('#btn-pixel');
    // Controles: Escape vuelve a Ajustes, no al menú
    await page.click('#btn-controls');
    await expect(page.locator('#controls .c-row').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#controls')).toBeHidden();
    await expect(page.locator('#settings')).toBeVisible();
    await page.click('#btn-settings-close');
    // En partida, con sitio a los lados: minimapa y estado
    await page.click('#btn-survival');
    await waitState(page, 'play');
    await expect(page.locator('#side-l')).toBeVisible();
    await expect(page.locator('#side-mode-h')).toHaveText('OLEADA');
    // Irse a otra ventana pausa la partida
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect(page.locator('#pause')).toBeVisible();
    noErrors(errors);
});

test('con mando: el stick mueve el tanque, Start pausa y A pulsa en los menús', async ({ page }) => {
    // Un mando de mentira que la prueba maneja desde window.pad
    await page.addInitScript(() => {
        const pad = { index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
        window.pad = pad;
        navigator.getGamepads = () => [pad];
    });
    const errors = await openGame(page);
    const press = async (b) => {
        await page.evaluate((b) => (window.pad.buttons[b].pressed = true), b);
        await page.waitForTimeout(80);
        await page.evaluate((b) => (window.pad.buttons[b].pressed = false), b);
        await page.waitForTimeout(80);
    };
    await page.click('#btn-play');
    await waitState(page, 'play');
    await page.evaluate(() => (window.pad.axes[0] = 1));
    await page.waitForFunction(() => game.input.move.x > 0.9);
    await page.evaluate(() => (window.pad.axes[0] = 0));
    await press(9);
    await expect(page.locator('#pause')).toBeVisible();
    // En la pausa: abajo hasta Salir y A
    await page.evaluate(() => (window.pad.buttons[13].pressed = true));
    await page.waitForFunction(() => document.activeElement.id === 'btn-resume');
    await page.evaluate(() => (window.pad.buttons[13].pressed = false));
    for (let i = 0; i < 4 && (await page.evaluate(() => document.activeElement.id)) !== 'btn-quit'; i++) await press(13);
    await press(0);
    await expect(page.locator('#menu')).toBeVisible();
    noErrors(errors);
});
