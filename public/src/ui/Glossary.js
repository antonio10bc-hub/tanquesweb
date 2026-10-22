import * as THREE from 'three';
import { PICKUPS } from '../content/index.js';
import { PickupView } from '../render/PickupView.js';

const DEG = Math.PI / 180;
const RULES = { lifetime: Infinity, blinkTime: 0 };
const CYCLE = 1.6; // segundos que el botón del menú muestra cada objeto

// Visor 3D pequeño para los objetos fuera de la partida: usa los mismos modelos y la misma
// animación que en el juego (PickupView) y copia cada render a un canvas 2D pixelado.
class PickupPreview {
    constructor(px) {
        THREE.ColorManagement.enabled = false;
        this.gl = new THREE.WebGLRenderer({ antialias: false, alpha: true });
        this.gl.setPixelRatio(1);
        this.gl.setSize(px, px, false);
        this.gl.outputColorSpace = THREE.LinearSRGBColorSpace;
        this.gl.setClearColor(0x000000, 0);
        this.scene = new THREE.Scene();
        const sun = new THREE.DirectionalLight(0xfff2d8, 2.3);
        sun.position.set(-4, 10, 6);
        this.scene.add(sun, new THREE.HemisphereLight(0xd6c8ff, 0x7a4cff, 1.15));
        this.view = new PickupView(this.scene);
        // Misma inclinación que la cámara del juego, más cerca
        this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
        const d = 2.9, pitch = 58 * DEG;
        this.camera.position.set(0, Math.sin(pitch) * d + 0.35, Math.cos(pitch) * d);
        this.camera.lookAt(0, 0.5, 0);
    }

    draw(ctx, kind, life, time) {
        this.view.sync({ kind, def: PICKUPS[kind], x: 0, z: 0, life }, RULES, time);
        this.gl.render(this.scene, this.camera);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(this.gl.domElement, 0, 0);
    }
}

// Botón del menú que va rotando los objetos + pantalla de glosario con todos ellos.
export class Glossary {
    constructor(sfx, px = 48) {
        const $ = (id) => document.getElementById(id);
        this.sfx = sfx;
        this.preview = new PickupPreview(px);
        this.kinds = Object.keys(PICKUPS);
        this.menu = $('menu');
        this.screen = $('glossary');
        this.btnCtx = $('btn-items').querySelector('canvas').getContext('2d');
        this.rows = this.kinds.map((kind) => this.buildRow($('glossary-list'), kind, px));
        this.isOpen = false;
        this.index = 0;
        this.shownAt = 0;
        this.openedAt = 0;

        $('btn-items').addEventListener('click', () => this.open());
        $('btn-glossary-close').addEventListener('click', () => this.close());
        window.addEventListener('keydown', (e) => e.code === 'Escape' && this.isOpen && this.close());

        this.tick = this.tick.bind(this);
        requestAnimationFrame(this.tick);
    }

    buildRow(list, kind, px) {
        const def = PICKUPS[kind];
        const row = document.createElement('div');
        row.className = 'g-row';
        const canvas = Object.assign(document.createElement('canvas'), { width: px, height: px, className: 'g-icon' });
        const text = document.createElement('div');
        text.className = 'g-text';
        const name = document.createElement('h3');
        name.textContent = def.name;
        name.style.color = `#${def.color.toString(16).padStart(6, '0')}`;
        const desc = document.createElement('p');
        desc.textContent = def.desc ? def.desc(def) : '';
        text.append(name, desc);
        row.append(canvas, text);
        list.appendChild(row);
        return { kind, ctx: canvas.getContext('2d') };
    }

    open() {
        this.sfx.unlock();
        this.sfx.play('ui');
        this.isOpen = true;
        this.openedAt = performance.now() / 1000;
        this.screen.classList.remove('hidden');
        this.screen.querySelector('.glossary-list').scrollTop = 0;
    }

    close() {
        this.sfx.play('ui');
        this.isOpen = false;
        this.screen.classList.add('hidden');
    }

    tick(nowMs) {
        requestAnimationFrame(this.tick);
        const now = nowMs / 1000;
        if (this.isOpen) {
            // Cada fila aparece con el mismo "pop" que al surgir en la arena, en cascada
            this.rows.forEach((r, i) => this.preview.draw(r.ctx, r.kind, now - this.openedAt - i * 0.08, now + i * 0.7));
        } else if (!this.menu.classList.contains('hidden')) {
            if (now - this.shownAt >= CYCLE) {
                this.index = (this.index + 1) % this.kinds.length;
                this.shownAt = now;
            }
            this.preview.draw(this.btnCtx, this.kinds[this.index], now - this.shownAt, now);
        }
    }
}
