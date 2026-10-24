import { SKINS, SKIN_BY_ID, PAINTS, PAINT_BY_ID, ACHIEVEMENTS, WORLDS } from '../content/index.js';
import { PETS, PET_BY_ID } from '../content/pets.js';
import { Profile } from '../core/Profile.js';
import { L } from '../core/I18n.js';

// Postal de tu tanque: una imagen vertical (9:16, lista para historias) con tu tanque tal cual
// lo llevas (gorro, pintura y mascota) y tus récords. Se dibuja en pequeño, píxel a píxel, y se
// amplía sin suavizar, como el juego. Desde "Mi Tanque" se puede compartir o guardar.
const W = 216, H = 384, SCALE = 5;          // 1080 x 1920 al exportar
const INK = '#1b0b33', PAPER = '#fff6e8';
const LOGO = ['#ffe03a', '#ff3e8e', '#23e0d6', '#ff9a1f', '#e2dcff', '#e2dcff', '#e2dcff', '#e2dcff', '#e2dcff'];
const FONT = '"Press Start 2P", monospace';

export class Postcard {
    constructor(garage, sfx) {
        const $ = (id) => document.getElementById(id);
        this.garage = garage;
        this.sfx = sfx;
        this.el = { screen: $('postcard'), img: $('postcard-img'), share: $('postcard-share'), save: $('postcard-save') };
        $('btn-postcard').addEventListener('click', () => this.open());
        $('postcard-close').addEventListener('click', () => this.close());
        this.el.share.addEventListener('click', () => this.share());
        this.el.save.addEventListener('click', () => this.save());
    }

    async open() {
        this.sfx.play('ui');
        try {
            await document.fonts.load(`8px ${FONT}`);
        } catch {
            /* sin la fuente se dibuja con la de reserva */
        }
        this.canvas = this.draw();
        this.blob = await new Promise((ok) => this.canvas.toBlob(ok, 'image/png'));
        this.file = this.blob && new File([this.blob], 'tankless-postcard.png', { type: 'image/png' });
        this.el.img.src = this.canvas.toDataURL('image/png');
        const canShare = !!(this.file && navigator.canShare && navigator.canShare({ files: [this.file] }));
        this.el.share.classList.toggle('hidden', !canShare);
        this.el.screen.classList.remove('hidden');
    }

    close() {
        this.sfx.play('ui');
        this.el.screen.classList.add('hidden');
    }

    async share() {
        this.sfx.play('ui');
        try {
            await navigator.share({ files: [this.file], title: 'Tank-less', text: L('My tank in Tank-less! tanquesweb.vercel.app', '¡Mi tanque en Tank-less! tanquesweb.vercel.app') });
        } catch {
            /* cancelado */
        }
    }

    save() {
        this.sfx.play('reloaded');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(this.blob);
        a.download = 'tankless-postcard.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }

    // La postal en grande (lo que se comparte)
    draw() {
        const small = document.createElement('canvas');
        small.width = W;
        small.height = H;
        const g = small.getContext('2d');
        g.imageSmoothingEnabled = false;
        const rect = (x, y, w, h, c) => {
            g.fillStyle = c;
            g.fillRect(x, y, w, h);
        };
        const text = (s, x, y, c, size = 8, align = 'left') => {
            g.font = `${size}px ${FONT}`;
            g.textBaseline = 'top';
            g.textAlign = align;
            g.fillStyle = c;
            g.fillText(s, x, y);
        };

        // Mar con espuma alrededor de la postal
        rect(0, 0, W, H, '#1fb6ff');
        for (let i = 0; i < 70; i++) {
            const x = (i * 53) % W, y = (i * 97 + (i % 7) * 13) % H;
            rect(x, y, 2 + (i % 3), 2 + (i % 2), i % 4 ? '#7fd8ff' : '#ffffff');
        }
        // Papel con sombra dura y borde de tinta
        rect(16, 18, 192, 356, INK);
        rect(10, 12, 192, 356, INK);
        rect(13, 15, 186, 350, PAPER);
        // Borde de correo aéreo: rayas rojas y azules
        for (let x = 13; x < 199; x += 12) {
            rect(x, 15, 6, 3, '#ff3e5e');
            rect(x + 6, 15, 6, 3, '#2a6aff');
            rect(x, 362, 6, 3, '#2a6aff');
            rect(x + 6, 362, 6, 3, '#ff3e5e');
        }

        text(L('GREETINGS FROM', 'RECUERDOS DE'), 22, 26, INK);
        // Logo en colores con sombra de tinta
        'TANK-LESS'.split('').forEach((ch, i) => {
            text(ch, 23 + i * 15, 40, INK, 16);
            text(ch, 22 + i * 15, 38, LOGO[i], 16);
        });

        // Sello con su borde troquelado y una moneda dentro
        rect(166, 22, 32, 38, '#ffffff');
        for (let y = 22; y < 60; y += 4) rect(164, y, 2, 2, '#ffffff'), rect(198, y, 2, 2, '#ffffff');
        rect(169, 25, 26, 32, '#ff3e8e');
        rect(176, 32, 12, 12, INK);
        rect(177, 33, 10, 10, '#ffd23f');
        rect(180, 35, 4, 6, '#ff9a1f');
        text('1', 182, 47, '#ffffff', 8, 'center');

        // Ventana con tu tanque sobre el cielo nocturno del menú
        rect(20, 68, 176, 156, INK);
        rect(22, 70, 172, 152, '#3b2d6b');
        for (let i = 0; i < 26; i++) rect(24 + ((i * 37) % 166), 72 + ((i * 59) % 100), 1 + (i % 2), 1 + (i % 2), i % 3 ? '#b9b0d8' : '#ffe03a');
        const shot = this.garage.snapshot(150);
        g.drawImage(shot, 33, 72);

        // Lo que lleva puesto
        const d = Profile.data;
        const hat = (SKIN_BY_ID[d.skin] || SKINS[0]).name, paint = (PAINT_BY_ID[d.paint] || PAINTS[0]).name;
        const pet = PET_BY_ID[d.pet] || PETS[0];
        const bare = d.skin === 'none';
        text(bare ? paint : hat, 108, 230, INK, 8, 'center');
        text([bare ? null : paint, pet.build ? pet.name : null].filter(Boolean).join(' · '), 108, 242, '#7b5cff', 8, 'center');

        // Récords
        const st = d.stats;
        const rows = [
            [L('WINS', 'VICTORIAS'), st.wins],
            [L('BEST WAVE', 'MEJOR OLEADA'), st.bestWave],
            [L('BOSSES', 'JEFES'), `${st.bosses}/${WORLDS.filter((w) => !w.secret).length}`],
            [L('STARS', 'ESTRELLAS'), st.stars],
            [L('ACHIEVEMENTS', 'LOGROS'), `${Object.keys(d.achievements).length}/${ACHIEVEMENTS.length}`],
        ];
        rows.forEach(([label, value], i) => {
            const y = 260 + i * 15;
            text(label, 24, y, INK);
            text(String(value), 192, y, '#ff3e8e', 8, 'right');
            for (let x = 24; x < 192; x += 4) rect(x, y + 11, 2, 1, '#d8cfe8');
        });

        text(L('PLAY FREE AT', 'JUEGA GRATIS EN'), 108, 338, INK, 8, 'center');
        text('tanquesweb.vercel.app', 108, 350, '#2a6aff', 8, 'center');

        // Ampliada sin suavizar
        const big = document.createElement('canvas');
        big.width = W * SCALE;
        big.height = H * SCALE;
        const b = big.getContext('2d');
        b.imageSmoothingEnabled = false;
        b.drawImage(small, 0, 0, big.width, big.height);
        return big;
    }
}
