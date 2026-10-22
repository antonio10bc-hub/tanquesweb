import * as THREE from 'three';
import { PICKUPS } from '../content/index.js';
import { box, toon, outline, OUTLINE } from '../render/materials.js';
import { vibrate } from './Haptics.js';

// Tutorial de la primera partida: lo mínimo para entender el juego, de uno en uno y en una
// arena segura. Cada paso tiene un título, una frase y una condición para pasar al siguiente.
//   1 moverse · 2 disparar al pararse (y que eso te delata / recarga) · 3 esconderse
//   4 coger un objeto · 5 el muñeco despierta: primer combate de verdad
const GOAL = { x: 9.5, z: 3.5 };   // marca a la que hay que llegar
// El objeto sale en el arbusto contrario al que te hayas metido
const ITEM_LEFT = { x: 2.5, z: 4.5 }, ITEM_RIGHT = { x: 10.5, z: 4.5 };


const STEPS = [
    {
        title: 'MUÉVETE',
        text: 'ARRASTRA EL DEDO (O WASD) Y LLEGA A LA FLECHA',
        enter(tu) {
            tu.point(GOAL);
        },
        tick(tu, dt) {
            if ((tu.ping -= dt) <= 0) {
                tu.ping = 0.6;
                tu.game.waves.spawn(GOAL.x, GOAL.z, 0xffe03a, 1.2, 0.5);
                tu.game.particles.burst(GOAL.x, 0.1, GOAL.z, 6, [0xffe03a, 0xffffff], { speed: 0.6, up: 3, size: 0.1, ttl: 0.6, grav: 0 });
            }
        },
        done: (tu) => Math.hypot(tu.player.x - GOAL.x, tu.player.z - GOAL.z) < 0.8,
    },
    {
        title: 'DISPARA',
        text: 'SUELTA EL DEDO: QUIETO, TU TANQUE DISPARA SOLO',
        enter(tu) {
            tu.point(null);
            tu.dummy = tu.spawnDummy();
            tu.hits = 0;
        },
        tick(tu) {
            if (tu.hits === 1 && !tu.toldReveal) {
                tu.toldReveal = true;
                tu.game.hud.tutorialTip('¡AL DISPARAR TE VEN UN MOMENTO!', true);
            }
            if (tu.player.reloading > 0 && !tu.toldReload) {
                tu.toldReload = true;
                tu.game.hud.tutorialTip('3 BALAS Y RECARGA: MIRA LA BARRITA', false);
            }
        },
        done: (tu) => tu.hits >= 3 && tu.player.reloading > 0,
    },
    {
        title: 'ESCÓNDETE',
        text: 'MOVIÉNDOTE NADIE TE VE. EN LA HIERBA, AÚN MENOS: MÉTETE',
        enter(tu) {
            tu.game.hud.tutorialTip('', true);
            tu.inBush = 0;
        },
        tick(tu, dt) {
            tu.inBush = tu.player.inBush ? tu.inBush + dt : 0;
            if (tu.player.inBush) tu.bushSide = tu.player.x < tu.world.arena.cols / 2 ? 'left' : 'right';
        },
        done: (tu) => tu.inBush > 0.8,
    },
    {
        title: 'COGE EL OBJETO',
        text: 'LOS OBJETOS DAN VENTAJAS: ESTE HACE DE FUEGO TU SIGUIENTE BALA',
        enter(tu) {
            tu.game.hud.tutorialTip('', false);
            const sp = tu.world.pickups, at = tu.bushSide === 'left' ? ITEM_RIGHT : ITEM_LEFT;
            sp.current = { id: 999, kind: 'power', def: PICKUPS.power, x: at.x, z: at.z, life: 0 };
            tu.game.events.emit('pickupSpawn', sp.current);
            tu.got = false;
        },
        done: (tu) => tu.got,
    },
    {
        title: '¡EL MUÑECO DESPIERTA!',
        text: 'DERRÓTALO. ÉL TAMBIÉN SE ESCONDE: SOLO LO VES SI DISPARA O ESTÁ CERCA',
        enter(tu) {
            tu.point(null);
            tu.awaken();
        },
        done: () => false, // se acaba cuando gana la partida (Game.endMatch)
    },
];

export class Tutorial {
    constructor(game) {
        this.game = game;
        game.events.on('hit', (tank) => this.active && tank === this.dummy && this.hits++);
        game.events.on('pickup', (tank) => this.active && tank === this.player && (this.got = true));
    }

    get world() {
        return this.game.world;
    }

    get player() {
        return this.game.world.player;
    }

    start() {
        this.active = true;
        this.step = -1;
        this.ping = 0;
        this.wait = 0;
        this.toldReveal = this.toldReload = false;
        this.player.immortal = true; // en el tutorial no se pierde: como mucho te quedas a 1
        this.next();
    }

    stop() {
        this.active = false;
        this.game.hud.tutorial(null);
        this.point(null);
    }

    // Flecha grande que bota encima de donde hay que ir, solo en el primer paso (null: la quita)
    point(at) {
        if (!this.arrow) {
            const g = new THREE.Group(), yellow = toon(0xffe03a), hull = outline(0x1b0b33);
            const add = (w, h, d, y, mat = yellow) => {
                const m = new THREE.Mesh(box(w, h, d), mat);
                m.position.y = y;
                const o = new THREE.Mesh(box(w + OUTLINE * 2, h + OUTLINE * 2, d + OUTLINE * 2), hull);
                o.position.y = y;
                g.add(m, o);
            };
            add(0.34, 0.7, 0.34, 1.05);                     // palo
            add(0.9, 0.22, 0.9, 0.62);                      // punta, en escalones
            add(0.62, 0.2, 0.62, 0.42);
            add(0.34, 0.18, 0.34, 0.24);
            add(0.12, 0.12, 0.12, 0.12, toon(0xffffff));
            this.arrow = g;
        }
        this.target = at;
        if (at) this.game.scene.add(this.arrow);
        else this.arrow.removeFromParent();
    }

    // Anima la flecha (se llama cada fotograma desde Game.draw)
    animate(time) {
        if (!this.target || !this.arrow) return;
        this.arrow.position.set(this.target.x, 0.5 + Math.abs(Math.sin(time * 4)) * 0.6, this.target.z);
        this.arrow.rotation.y = time * 2;
        this.arrow.scale.setScalar(1.3);
    }

    next() {
        this.step++;
        const s = STEPS[this.step];
        if (!s) return;
        if (s.enter) s.enter(this);
        this.game.hud.tutorial(s.title, s.text, this.step, STEPS.length);
    }

    update(dt) {
        if (!this.active) return;
        const s = STEPS[this.step];
        if (!s) return;
        if (this.wait > 0) {
            if ((this.wait -= dt) <= 0) this.next();
            return;
        }
        if (s.tick) s.tick(this, dt);
        if (s.done(this)) {
            // Paso superado: chispa, sonido y un momento antes del siguiente
            const p = this.player;
            this.game.sfx.play('unlock');
            this.game.particles.burst(p.x, 0.8, p.z, 24, [0xffe03a, 0xffffff, 0x23e0d6], { speed: 3, up: 4, size: 0.12, ttl: 0.7, grav: 8 });
            this.game.hud.tutorialDone();
            vibrate('pickup');
            this.wait = 0.9;
        }
    }

    // Muñeco de entrenamiento: no se mueve, no dispara y siempre se ve. No se puede destruir.
    spawnDummy() {
        const w = this.world, at = w.arena.spawns.E[0];
        const d = w.spawn({ tank: 'dummy', hp: 3 }, 'enemy', 'dummy', at);
        d.immortal = true; // baja hasta 1 y ahí se queda
        d.model.dropY = 9;
        d.frozen = true;
        this.game.dropping.push({ tank: d, t: 0 });
        this.game.hud.setNames(this.player.def.name, 'MUÑECO');
        return d;
    }

    // El muñeco se convierte en un tanque de verdad (flojito) para el primer combate
    awaken() {
        const g = this.game, w = this.world, d = this.dummy;
        d.alive = false;
        d.model.root.visible = false;
        g.particles.burst(d.x, 0.6, d.z, 50, [0xe8c070, 0xc44a3a, 0xffffff, 0xff3e8e], { speed: 4, up: 6, size: 0.2, ttl: 1, grav: 10 });
        g.waves.spawn(d.x, d.z, 0xff3e8e, 2.4, 0.6);
        g.renderer.flash(0xffffff, 0.6);
        g.rig.shake(0.6);
        g.sfx.play('roar');
        const foe = w.spawn({ tank: 'rival', hp: 3 }, 'enemy', 'hunter', { x: d.x, z: d.z });
        foe.brain.p.dodge = 0.1;
        foe.reveal = 1.5;
        g.hud.setNames(this.player.def.name, foe.def.name);
        g.hud.banner('¡A LUCHAR!', 'go');
        // A partir de aquí salen objetos como en una partida normal
        Object.assign(w.pickups.rules, { lifetime: 6, firstDelay: 2 });
        w.pickups.timer = 2;
        w.forceReveal = false;
    }
}

