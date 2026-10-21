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
