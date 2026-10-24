import { Game } from './core/Game.js';
import { Input } from './core/Input.js';
import { Sfx } from './core/Audio.js';
import { Hud } from './ui/Hud.js';
import { Glossary } from './ui/Glossary.js';
import { Garage } from './ui/Garage.js';
import { Postcard } from './ui/Postcard.js';
import { Trophies } from './ui/Trophies.js';
import { ModeArt } from './ui/ModeArt.js';
import { Profile } from './core/Profile.js';
import { Achievements, achievementCount } from './core/Achievements.js';
import { trackGame, trackGarage } from './core/GameAnalytics.js';
import { L, applyHtmlTexts, switchLang } from './core/I18n.js';
import { DEV_CHANGED } from './core/Dev.js';
import { Settings } from './core/Settings.js';
import { analyticsAsk, setAnalyticsConsent } from './core/Analytics.js';

// Idioma: los textos fijos de index.html están en inglés; en español se cambian ya
applyHtmlTexts();
Profile.load();

const canvas = document.getElementById('view');
const hud = new Hud();
const sfx = new Sfx();
const input = new Input(canvas, document.getElementById('joy'));
const game = new Game({ canvas, hud, input, sfx });
// Analíticas (solo en la web publicada): antes del primer menú y del tutorial automático
trackGame(game, hud);

// Desbloqueo del audio en los gestos que los navegadores aceptan (Safari no acepta pointerdown)
const unlock = () => sfx.unlock();
for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) {
    window.addEventListener(type, unlock, { capture: true, passive: true });
}

// PARTIDA RÁPIDA: el escenario que se ve de fondo en el menú. OTRA VEZ: repite el modo
// (partida rápida con un arquetipo nuevo, o supervivencia desde la oleada 1).
hud.onPlay = () => {
    sfx.unlock();
    sfx.play('ui');
    game.startMatch(game.levelId, undefined, game.themeId);
};
document.getElementById('btn-campaign').addEventListener('click', () => {
    sfx.unlock();
    sfx.play('ui');
    game.showCampaign();
});
document.getElementById('btn-duel').addEventListener('click', () => {
    sfx.unlock();
    sfx.play('ui');
    game.startDuel();
});
document.getElementById('btn-survival').addEventListener('click', () => {
    sfx.unlock();
    sfx.play('ui');
    game.startSurvival();
});
hud.onAgain = () => {
    sfx.unlock();
    sfx.play('ui');
    game.again();
};

hud.onMenu = () => {
    sfx.play('ui');
    if (game.mode === 'tutorial') game.finishTutorial();
    game.music.stop();
    // Desde un jefe de la campaña se vuelve al mapa
    if (game.mode === 'campaign') game.showCampaign();
    else game.showMenu();
};

const achievements = new Achievements(game);
const syncProfile = () => {
    hud.setCoins(Profile.coins);
    hud.setTrophies(...achievementCount());
};
Profile.onChange(syncProfile);
syncProfile();

// Aviso de privacidad: la primera vez que se ve el menú (tras el tutorial, si sale), una vez
const consent = document.getElementById('consent');
// (en el dispositivo del autor no hay aviso ni interruptor: se mide siempre)
if (analyticsAsk()) document.querySelector('.toggle[data-key="analytics"]').classList.remove('hidden');
hud.onScreenChange = (name) => {
    const ask = name === 'menu' && Settings.analytics === null && analyticsAsk();
    consent.classList.toggle('hidden', !ask);
};
const answer = (on) => {
    sfx.play('ui');
    setAnalyticsConsent(on);
    hud.syncToggles(Settings);
    consent.classList.add('hidden');
};
document.getElementById('consent-yes').addEventListener('click', () => answer(true));
document.getElementById('consent-no').addEventListener('click', () => answer(false));

// Idioma: el botón de Ajustes cambia entre español e inglés (y recarga)
document.getElementById('btn-lang').addEventListener('click', () => {
    sfx.play('ui');
    switchLang();
});

game.showMenu();
// Aviso al encender o apagar las herramientas de desarrollo con ?dev=
if (DEV_CHANGED !== null) hud.toast(DEV_CHANGED ? L('DEV MODE ON', 'MODO DEV ACTIVADO') : L('DEV MODE OFF', 'MODO DEV APAGADO'));
// Tras cambiar de idioma se vuelve a Ajustes, que es donde estabas
try {
    if (sessionStorage.getItem('tankless.reopenSettings')) {
        sessionStorage.removeItem('tankless.reopenSettings');
        hud.showSettings(true);
    }
} catch {
    /* nada */
}
// Primera vez que se abre el juego: directo al tutorial
if (!Profile.data.tutorialDone) game.startTutorial();
document.getElementById('btn-tut-skip').addEventListener('click', () => {
    sfx.play('ui');
    game.finishTutorial();
    game.music.stop();
    game.showMenu();
});
document.getElementById('btn-tutorial').addEventListener('click', () => {
    sfx.unlock();
    sfx.play('ui');
    hud.showSettings(false);
    game.startTutorial();
});
new Glossary(sfx);
new ModeArt();
new Trophies(sfx);
const garage = new Garage(sfx);
new Postcard(garage, sfx);
trackGarage(garage);
garage.onEquip = (id) => {
    achievements.equipped(id);
    // El tanque del menú de fondo luce la skin nueva
    if (game.state === 'menu') game.showMenu(game.levelId);
};

// Ajustes > BORRAR PROGRESO: hay que pulsar dos veces (la primera solo pide confirmación)
const resetBtn = document.getElementById('btn-reset');
let resetTimer = 0;
resetBtn.addEventListener('click', () => {
    sfx.unlock();
    if (!resetBtn.classList.contains('armed')) {
        sfx.play('warn');
        resetBtn.classList.add('armed');
        resetBtn.textContent = L('SURE? PRESS AGAIN', '¿SEGURO? PULSA OTRA VEZ');
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
            resetBtn.classList.remove('armed');
            resetBtn.textContent = L('DELETE PROGRESS', 'BORRAR PROGRESO');
        }, 3000);
        return;
    }
    Profile.reset();
    location.reload();
});

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
