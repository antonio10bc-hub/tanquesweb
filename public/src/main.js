import { Game } from './core/Game.js';
import { Input } from './core/Input.js';
import { Sfx } from './core/Audio.js';
import { Hud } from './ui/Hud.js';
import { FIRST_LEVEL } from './content/index.js';

const canvas = document.getElementById('view');
const hud = new Hud();
const sfx = new Sfx();
const input = new Input(canvas, document.getElementById('joy'));
const game = new Game({ canvas, hud, input, sfx });

const unlock = () => sfx.unlock();
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

const start = () => {
    sfx.unlock();
    sfx.play('ui');
    game.startMatch(game.levelId);
};
hud.onPlay = start;
hud.onAgain = start;

game.showMenu(FIRST_LEVEL);

// Acceso desde la consola para depurar: window.game
window.game = game;
