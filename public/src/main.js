import { Game } from './core/Game.js';
import { Input } from './core/Input.js';
import { Sfx } from './core/Audio.js';
import { Hud } from './ui/Hud.js';

const canvas = document.getElementById('view');
const hud = new Hud();
const sfx = new Sfx();
const input = new Input(canvas, document.getElementById('joy'));
const game = new Game({ canvas, hud, input, sfx });

const unlock = () => sfx.unlock();
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

// JUGAR: el escenario que se ve de fondo en el menú. OTRA VEZ: un arquetipo nuevo.
hud.onPlay = () => {
    sfx.unlock();
    sfx.play('ui');
    game.startMatch(game.levelId, undefined, game.themeId);
};
hud.onAgain = () => {
    sfx.unlock();
    sfx.play('ui');
    game.startMatch();
};

game.showMenu();

// Acceso desde la consola para depurar: window.game
window.game = game;

// Modo sin conexión: registra el service worker y le pasa todo lo cargado para que lo guarde.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', async () => {
        try {
            await navigator.serviceWorker.register('./sw.js');
            const reg = await navigator.serviceWorker.ready;
            const urls = performance.getEntriesByType('resource').map((e) => e.name);
            reg.active?.postMessage({ type: 'cache-urls', urls: [location.href, ...urls] });
        } catch {
            /* sin service worker el juego funciona igual, solo que necesita conexión */
        }
    });
}
