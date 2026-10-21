// Bus de eventos mínimo: desacopla simulación de efectos (sonido, partículas, HUD...).
export class EventBus {
    constructor() {
        this.handlers = new Map();
    }

    on(type, fn) {
        let list = this.handlers.get(type);
        if (!list) this.handlers.set(type, (list = []));
        list.push(fn);
        return () => this.off(type, fn);
    }

    off(type, fn) {
        const list = this.handlers.get(type);
        if (!list) return;
        const i = list.indexOf(fn);
        if (i >= 0) list.splice(i, 1);
    }

    emit(type, a, b, c, d) {
        const list = this.handlers.get(type);
        if (!list) return;
        for (let i = 0; i < list.length; i++) list[i](a, b, c, d);
    }
}
