// Progreso del jugador guardado en el navegador: monedas, skins, logros y estadísticas.
// Si el almacenamiento no está disponible, todo funciona igual pero no se recuerda.
import { BOSS_REWARDS } from '../content/skins.js';

const KEY = 'tankless.profile';

const fresh = () => ({
    coins: 0,
    owned: ['none'],     // skins compradas
    skin: 'none',        // gorro equipado (o el tanque dorado)
    paint: 'p_default',  // pintura equipada
    trail: 't_default',  // estela de bala equipada
    achievements: {},    // id -> fecha de desbloqueo
    tutorialDone: false, // el tutorial sale solo la primera vez
    // Campaña: jefes derrotados y estrellas (1-3) por mundo; "hard" lo mismo en modo difícil
    campaign: { beaten: [], stars: {}, hard: { beaten: [], stars: {} } },
    stats: {
        wins: 0,
        streak: 0,          // victorias seguidas
        cratesBroken: 0,
        coinsEarned: 0,
        pickupKinds: [],    // tipos de objeto recogidos alguna vez
        bestWave: 0,        // récord de supervivencia
        bosses: 0,          // jefes normales de la campaña derrotados (sin contar el secreto)
        stars: 0,           // estrellas de la campaña normal
        hardBosses: 0,      // jefes derrotados en modo difícil (con el secreto)
        // Pantalla de estadísticas (sin contar tutorial ni duelos, salvo "duels")
        matches: 0, victories: 0, losses: 0, bestStreak: 0, playTime: 0, // segundos
        shots: 0, hits: 0, kills: 0, deaths: 0, pickups: 0,
        wavesCleared: 0, bossTries: 0, duels: 0,
        snipers: 0,         // francotiradores derribados (logro)
    },
});

export const Profile = {
    data: fresh(),
    listeners: [],

    load() {
        try {
            const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
            if (saved) {
                const base = fresh();
                // Quien ya jugaba antes de que existiera el tutorial no lo necesita
                if (saved.tutorialDone === undefined) saved.tutorialDone = !!((saved.stats && saved.stats.wins) || saved.coins || (saved.campaign && saved.campaign.beaten && saved.campaign.beaten.length));
                this.data = {
                    ...base, ...saved,
                    stats: { ...base.stats, ...(saved.stats || {}) },
                    campaign: {
                        ...base.campaign, ...(saved.campaign || {}),
                        hard: { ...base.campaign.hard, ...((saved.campaign || {}).hard || {}) },
                    },
                };
            }
        } catch {
            /* sin almacenamiento */
        }
        return this;
    },

    save() {
        try {
            localStorage.setItem(KEY, JSON.stringify(this.data));
        } catch {
            /* ignorar */
        }
        for (const fn of this.listeners) fn(this.data);
    },

    // Borra todo el progreso guardado (monedas, skins, logros, campaña, tutorial).
    reset() {
        try {
            localStorage.removeItem(KEY);
        } catch {
            /* ignorar */
        }
        this.data = fresh();
    },

    onChange(fn) {
        this.listeners.push(fn);
    },

    get coins() {
        return this.data.coins;
    },

    addCoins(n) {
        if (n <= 0) return;
        this.data.coins += n;
        this.data.stats.coinsEarned += n;
        this.save();
    },

    owns(id) {
        // Los trofeos de los jefes son tuyos en cuanto vences a ese jefe en modo difícil
        if (BOSS_REWARDS[id]) return this.data.campaign.hard.beaten.includes(BOSS_REWARDS[id]);
        return this.data.owned.includes(id) || id === 'p_default' || id === 't_default';
    },

    // Compra una skin si hay monedas. Devuelve true si se ha comprado.
    buy(id, price) {
        if (this.owns(id) || this.data.coins < price) return false;
        this.data.coins -= price;
        this.data.owned.push(id);
        this.save();
        return true;
    },

    // key: 'skin' (gorros), 'paint' o 'trail'
    equip(id, key = 'skin') {
        if (!this.owns(id)) return false;
        this.data[key] = id;
        this.save();
        return true;
    },

    camp(hard) {
        const c = this.data.campaign;
        c.stars ||= {};
        return hard ? c.hard : c;
    },

    beaten(worldId, hard = false) {
        return this.camp(hard).beaten.includes(worldId);
    },

    // Jefe derrotado. Devuelve true si es la primera vez.
    beat(worldId, hard = false) {
        if (this.beaten(worldId, hard)) return false;
        this.camp(hard).beaten.push(worldId);
        this.save();
        return true;
    },

    stars(worldId, hard = false) {
        return this.camp(hard).stars[worldId] || 0;
    },

    // Guarda las estrellas si mejoran el récord. Devuelve el récord.
    setStars(worldId, n, hard = false) {
        const s = this.camp(hard).stars;
        s[worldId] = Math.max(s[worldId] || 0, n);
        this.save();
        return s[worldId];
    },

    // El modo difícil se abre al terminar la campaña (al ganar al jefe secreto)
    get hardUnlocked() {
        return this.beaten('secret');
    },

    unlocked(id) {
        return !!this.data.achievements[id];
    },

    unlock(id) {
        if (this.unlocked(id)) return false;
        this.data.achievements[id] = Date.now();
        this.save();
        return true;
    },
};
