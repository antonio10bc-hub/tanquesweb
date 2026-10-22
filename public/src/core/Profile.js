// Progreso del jugador guardado en el navegador: monedas, skins, logros y estadísticas.
// Si el almacenamiento no está disponible, todo funciona igual pero no se recuerda.
const KEY = 'tankless.profile';

const fresh = () => ({
    coins: 0,
    owned: ['none'],     // skins compradas
    skin: 'none',        // skin equipada
    achievements: {},    // id -> fecha de desbloqueo
    campaign: { beaten: [] }, // mundos de la campaña con el jefe derrotado
    stats: {
        wins: 0,
        streak: 0,          // victorias seguidas
        cratesBroken: 0,
        coinsEarned: 0,
        pickupKinds: [],    // tipos de objeto recogidos alguna vez
        bestWave: 0,        // récord de supervivencia
        bosses: 0,          // jefes normales de la campaña derrotados (sin contar el secreto)
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
                this.data = {
                    ...base, ...saved,
                    stats: { ...base.stats, ...(saved.stats || {}) },
                    campaign: { ...base.campaign, ...(saved.campaign || {}) },
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
        return this.data.owned.includes(id);
    },

    // Compra una skin si hay monedas. Devuelve true si se ha comprado.
    buy(id, price) {
        if (this.owns(id) || this.data.coins < price) return false;
        this.data.coins -= price;
        this.data.owned.push(id);
        this.save();
        return true;
    },

    equip(id) {
        if (!this.owns(id)) return false;
        this.data.skin = id;
        this.save();
        return true;
    },

    beaten(worldId) {
        return this.data.campaign.beaten.includes(worldId);
    },

    // Jefe derrotado. Devuelve true si es la primera vez.
    beat(worldId) {
        if (this.beaten(worldId)) return false;
        this.data.campaign.beaten.push(worldId);
        this.save();
        return true;
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
