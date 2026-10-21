// Preferencias del jugador (música, sonido, vibración). Se guardan en el navegador;
// si el almacenamiento no está disponible, simplemente no se recuerdan.
const KEY = 'tanques.settings';
const DEFAULTS = { music: true, sfx: true, vibration: true };

export const Settings = {
    ...DEFAULTS,

    load() {
        try {
            Object.assign(this, DEFAULTS, JSON.parse(localStorage.getItem(KEY) || '{}'));
        } catch {
            /* sin almacenamiento: valores por defecto */
        }
        return this;
    },

    toggle(key) {
        this[key] = !this[key];
        try {
            localStorage.setItem(KEY, JSON.stringify({ music: this.music, sfx: this.sfx, vibration: this.vibration }));
        } catch {
            /* ignorar */
        }
        return this[key];
    },
};
