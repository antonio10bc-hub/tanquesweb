import * as THREE from 'three';

// Glifos pixelados dibujados a mano (no dependen de fuentes cargadas).
const GLYPHS = {
    '!': ['##', '##', '##', '##', '..', '##'],
    '?': ['.###.', '##.##', '...##', '..##.', '.....', '..##.'],
    '+': ['......', '..##..', '######', '######', '..##..', '......'],
    'x': ['......', '##..##', '.####.', '..##..', '.####.', '##..##'],
    '2': ['####.', '...##', '..##.', '.##..', '##...', '#####'],
};

// Une varios glifos (todos de 6 filas) con una columna de separación.
const textRows = (text) =>
    GLYPHS['!'].map((_, r) => [...text].map((ch) => GLYPHS[ch][r]).join('.'));

const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;
const texCache = new Map();

function glyph(ch, color, outlineColor) {
    const key = `${ch}|${color}|${outlineColor}`;
    let entry = texCache.get(key);
    if (entry) return entry;
    const rows = textRows(ch);
    const w = rows[0].length + 2, h = rows.length + 2;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d');
    const each = (fn) => rows.forEach((row, y) => [...row].forEach((p, x) => p === '#' && fn(x, y)));
    g.fillStyle = hex(outlineColor);
    each((x, y) => g.fillRect(x, y, 3, 3));
    g.fillStyle = hex(color);
    each((x, y) => g.fillRect(x + 1, y + 1, 1, 1));
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = tex.magFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    entry = { tex, aspect: w / h };
    texCache.set(key, entry);
    return entry;
}

function makeSprite(ch, color, outlineColor, height) {
    const { tex, aspect } = glyph(ch, color, outlineColor);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    sprite.center.set(0.5, 0);
    sprite.scale.set(height * aspect, height, 1);
    sprite.renderOrder = 30;
    sprite.userData.h = height;
    sprite.userData.w = height * aspect;
    return sprite;
}

// "!" cuando aparece alguien, "?" en la última posición conocida de un enemigo oculto.
export class Markers {
    constructor(scene) {
        this.scene = scene;
        this.pops = [];
        this.ghosts = new Map();
    }

    pop(x, y, z, ch, color, outlineColor) {
        const sprite = makeSprite(ch, color, outlineColor, 0.7);
        sprite.position.set(x, y, z);
        this.scene.add(sprite);
        this.pops.push({ sprite, life: 0 });
    }

    ghost(key, x, z, color, outlineColor, alpha) {
        let g = this.ghosts.get(key);
        if (!g) {
            const group = new THREE.Group();
            const ring = new THREE.Mesh(
                new THREE.RingGeometry(0.32, 0.46, 8, 1),
                new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false })
            );
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.03;
            const sprite = makeSprite('?', color, outlineColor, 0.55);
            group.add(ring, sprite);
            this.scene.add(group);
            g = { group, ring, sprite };
            this.ghosts.set(key, g);
        }
        g.group.visible = true;
        g.group.position.set(x, 0, z);
        g.ring.material.opacity = alpha;
        g.sprite.material.opacity = alpha;
    }

    hideGhost(key) {
        const g = this.ghosts.get(key);
        if (g) g.group.visible = false;
    }

    update(dt, time) {
        for (let i = this.pops.length - 1; i >= 0; i--) {
            const p = this.pops[i];
            p.life += dt;
            const t = p.life / 0.9;
            if (t >= 1) {
                p.sprite.removeFromParent();
                p.sprite.material.dispose();
                this.pops.splice(i, 1);
                continue;
            }
            const s = t < 0.2 ? 0.4 + (t / 0.2) * 0.9 : 1.3 - Math.min(0.3, (t - 0.2) * 1.5);
            p.sprite.scale.set(p.sprite.userData.w * s, p.sprite.userData.h * s, 1);
            p.sprite.position.y += dt * 0.6;
            p.sprite.material.opacity = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
        }
        for (const g of this.ghosts.values()) {
            if (!g.group.visible) continue;
            g.sprite.position.y = 0.55 + Math.sin(time * 4) * 0.08;
            g.ring.scale.setScalar(1 + Math.sin(time * 6) * 0.12);
        }
    }

    clear() {
        for (const p of this.pops) {
            p.sprite.removeFromParent();
            p.sprite.material.dispose();
        }
        this.pops.length = 0;
        for (const g of this.ghosts.values()) {
            g.group.removeFromParent();
            g.ring.geometry.dispose();
            g.ring.material.dispose();
            g.sprite.material.dispose();
        }
        this.ghosts.clear();
    }
}
