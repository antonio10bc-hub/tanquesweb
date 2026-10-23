// Engancha las analíticas al juego: escucha el bus de eventos y los botones del menú, sin
// tocar la simulación. Qué se mide (ver Analytics.js):
//   app_opened · screen_viewed · modal_opened · setting_toggled
//   tutorial_step · tutorial_skipped (el funnel del tutorial: match_started/ended con mode=tutorial)
//   match_started · match_ended · match_quit (con objetos, disparos y bajas de la partida)
//   pickup_collected · wave_cleared · boss_beaten · hard_mode_unlocked
//   achievement_unlocked · item_bought · item_equipped
import { ACHIEVEMENTS } from '../content/index.js';
import { Profile } from './Profile.js';
import { initAnalytics, track } from './Analytics.js';

// Botones que abren una ventana del menú
const MODALS = { 'btn-garage': 'garage', 'btn-items': 'glossary', 'btn-trophies': 'trophies', 'btn-settings': 'settings' };
// De dónde sale la partida que empieza (el botón pulsado justo antes; 'auto': teclado o el
// tutorial que sale solo la primera vez)
const SOURCES = { 'btn-play': 'menu', 'camp-go': 'map', 'btn-again': 'again', 'btn-tutorial': 'settings', 'btn-survival': 'menu', 'btn-duel': 'menu' };

export function trackGame(game, hud) {
    const d = Profile.data;
    initAnalytics({
        pointer: matchMedia('(pointer: fine)').matches ? 'mouse' : 'touch',
        installed: matchMedia('(display-mode: standalone)').matches,
    });
    track('app_opened', {
        tutorial_done: d.tutorialDone, coins: d.coins, wins: d.stats.wins, best_wave: d.stats.bestWave,
        bosses_beaten: d.campaign.beaten.length, hard_unlocked: Profile.hardUnlocked, hard_bosses_beaten: d.campaign.hard.beaten.length,
        achievements: ACHIEVEMENTS.filter((a) => Profile.unlocked(a.id)).length, skins_owned: d.owned.length - 1,
        skin: d.skin, paint: d.paint, trail: d.trail,
    });

    const ev = game.events;
    const player = () => game.world && game.world.player;
    let match = null;   // la partida en curso
    let source = null;  // botón que la ha lanzado

    // Pantalla en la que está (menú, mapa de la campaña, partida, final)
    let screen = null;
    hud.onScreen = (name) => {
        if (name !== screen) track('screen_viewed', { screen: (screen = name) });
    };

    // Clics del menú (en captura: llegan antes que el propio botón, que puede empezar la partida)
    document.addEventListener('click', (e) => {
        const btn = e.target.closest && e.target.closest('button');
        if (!btn) return;
        if (MODALS[btn.id]) track('modal_opened', { modal: MODALS[btn.id] });
        source = SOURCES[btn.id] || null;
        if (btn.id === 'btn-tut-skip') quit('skip');
        if (btn.classList.contains('toggle')) {
            const key = btn.dataset.key;
            setTimeout(() => track('setting_toggled', { key, on: !btn.classList.contains('off') }));
        }
    }, true);

    // Lo común a los eventos de una partida
    const info = (m) => ({ mode: m.mode, level: m.level, theme: m.theme, world: m.world, hard: m.hard, rematch: m.rematch });

    ev.on('matchStart', (mode) => {
        const campaign = mode === 'campaign';
        match = {
            mode, level: game.levelId, theme: game.themeId,
            world: campaign ? game.worldId : null, hard: campaign && game.hard,
            rematch: campaign && Profile.beaten(game.worldId, game.hard),
            shots: 0, kills: 0, pickups: {}, started: performance.now(),
        };
        track('match_started', { ...info(match), source: source || 'auto' });
        source = null;
    });
    ev.on('shot', (tank) => match && tank === player() && match.shots++);
    ev.on('death', (tank, owner) => match && owner === player() && tank.team !== 'player' && match.kills++);
    ev.on('pickup', (tank, item) => {
        if (!match || tank !== player()) return;
        match.pickups[item.kind] = (match.pickups[item.kind] || 0) + 1;
        track('pickup_collected', { kind: item.kind, mode: match.mode, level: match.level });
    });
    ev.on('waveCleared', (wave) => track('wave_cleared', { wave }));
    ev.on('tutorialStep', (step, title, total) => track('tutorial_step', { step, title, total }));

    ev.on('matchEnd', ({ win, mode, wave, world }) => {
        if (!match) return;
        const m = match, p = player();
        match = null;
        const pickups = Object.values(m.pickups).reduce((a, b) => a + b, 0);
        track('match_ended', {
            ...info(m), result: win ? 'win' : 'lose',
            seconds: Math.round(game.playTime), damage_taken: game.damageTaken, hp_left: p ? Math.max(0, p.hp) : null,
            waves: mode === 'survival' ? wave - (game.waveClear ? 0 : 1) : null, coins_run: game.runCoins,
            stars: mode === 'campaign' && win ? game.lastStars : null,
            shots: m.shots, kills: m.kills, pickups, pickup_kinds: Object.keys(m.pickups),
        });
        if (mode === 'campaign' && win && game.justBeaten) {
            track('boss_beaten', { world, hard: m.hard, stars: game.lastStars, seconds: Math.round(game.playTime) });
            if (world === 'secret' && !m.hard) track('hard_mode_unlocked');
        }
    });

    // Salir a mitad de partida (desde la pausa o saltando el tutorial)
    const quit = (why) => {
        if (!match) return;
        track('match_quit', { ...info(match), why, seconds: Math.round(game.playTime), tutorial_step: match.mode === 'tutorial' ? game.tutorial.step : null });
        if (match.mode === 'tutorial') track('tutorial_skipped', { step: game.tutorial.step, why });
        match = null;
    };
    const onQuit = hud.onQuit;
    hud.onQuit = () => {
        quit('pause');
        onQuit();
    };
}

// Garaje: compras y lo que se equipa (category: skin, paint o trail)
export function trackGarage(garage) {
    garage.onBuy = (item, category) => track('item_bought', { item: item.id, category, price: item.price, coins_left: Profile.coins });
    garage.onWear = (item, category, bought) => track('item_equipped', { item: item.id, category, bought });
}

export const trackAchievement = (id) => track('achievement_unlocked', { id, total: ACHIEVEMENTS.filter((a) => Profile.unlocked(a.id)).length });
