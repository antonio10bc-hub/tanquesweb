import * as THREE from 'three';
import { box, toon, outline, OUTLINE } from './materials.js';
import { damp, wrapAngle } from '../core/math.js';

const BAR_W = 0.78;
const PIP_GAP = 0.05;

// Tanque voxel con ojitos. Solo es visual: la simulación vive en world/Tank.js.
export class TankModel {
    // skin: entrada de content/skins.js (gorro y/o tanque dorado), opcional.
    constructor(palette, outlineColor, magazine = 3, skin = null) {
        this.skin = skin;
        if (skin && skin.palette) palette = { ...palette, ...skin.palette };
        this.fx = { fade: { value: 1 }, flash: { value: 0 } };
        this.materials = [];
        this.t = Math.random() * 10;
        this.blink = 2;
        this.dropY = 0;
        this.barRatio = 1;
        this.lastRatio = 1;

        const own = (m) => (this.materials.push(m), m);
        const mat = (c) => own(toon(c, this.fx));
        this.outlineMat = own(outline(outlineColor, this.fx));

        this.root = new THREE.Group();
        this.body = new THREE.Group();
        this.root.add(this.body);

        // Orugas + ruedas
        for (const sx of [-0.31, 0.31]) {
            this.part(this.body, 0.24, 0.24, 0.88, mat(palette.tread), sx, 0.12, 0);
            for (const z of [-0.28, 0, 0.28]) this.part(this.body, 0.05, 0.12, 0.12, mat(palette.accent), sx * 1.42, 0.12, z, false);
        }
        // Casco
        this.part(this.body, 0.5, 0.22, 0.72, mat(palette.body), 0, 0.31, 0);
        this.part(this.body, 0.54, 0.07, 0.18, mat(palette.accent), 0, 0.42, 0.24);

        // Torreta (gira hacia el objetivo)
        this.turret = new THREE.Group();
        this.turret.position.y = 0.42;
        this.body.add(this.turret);
        this.part(this.turret, 0.44, 0.25, 0.42, mat(palette.body), 0, 0.12, -0.03);
        this.part(this.turret, 0.48, 0.07, 0.46, mat(palette.accent), 0, 0.27, -0.03);

        this.barrel = new THREE.Group();
        this.barrel.position.set(0, 0.07, 0.17);
        this.turret.add(this.barrel);
        this.part(this.barrel, 0.12, 0.12, 0.42, mat(palette.barrel), 0, 0, 0.2);
        this.part(this.barrel, 0.18, 0.18, 0.09, mat(palette.accent), 0, 0, 0.42);

        // Ojos
        this.eyes = new THREE.Group();
        this.eyes.position.set(0, 0.17, 0.19);
        this.turret.add(this.eyes);
        const white = mat(0xffffff), pupil = mat(outlineColor);
        for (const sx of [-0.12, 0.12]) {
            this.part(this.eyes, 0.11, 0.12, 0.03, white, sx, 0, 0, false);
            this.part(this.eyes, 0.05, 0.07, 0.02, pupil, sx + 0.015, -0.01, 0.02, false);
        }

        // Antena
        this.antenna = new THREE.Group();
        this.antenna.position.set(-0.15, 0.3, -0.18);
        this.turret.add(this.antenna);
        this.part(this.antenna, 0.04, 0.32, 0.04, mat(palette.tread), 0, 0.16, 0, false);
        this.part(this.antenna, 0.1, 0.1, 0.1, mat(palette.accent), 0, 0.34, 0);

        // Gorro: va sobre la tapa de la torreta y sustituye a la antena
        this.hatAnim = null;
        if (skin && skin.hat) {
            this.hat = new THREE.Group();
            this.hat.position.set(0, 0.305, -0.03);
            this.turret.add(this.hat);
            const extra = skin.hat((w, h, d, color, x, y, z, outlined = true) => this.part(this.hat, w, h, d, mat(color), x, y, z, outlined));
            this.hatAnim = extra && extra.animate;
            this.antenna.visible = false;
        }

        // Tanque dorado: aura de cubitos en órbita y un halo en el suelo
        if (skin && skin.gold) {
            this.aura = new THREE.Group();
            this.root.add(this.aura);
            const gold = mat(0xffe680), white = mat(0xffffff);
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                this.part(this.aura, 0.08, 0.08, 0.08, i % 2 ? white : gold, Math.sin(a) * 0.62, 0.3 + (i % 3) * 0.12, Math.cos(a) * 0.62, i % 2 === 0);
            }
            this.haloMat = own(new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.5, depthWrite: false }));
            this.halo = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.66, 16, 1), this.haloMat);
            this.halo.rotation.x = -Math.PI / 2;
            this.halo.position.y = 0.03;
            this.root.add(this.halo);
            this.materials.push({ dispose: () => this.halo.geometry.dispose() });
            // Pilar de luz dorada
            this.beamMat = own(new THREE.MeshBasicMaterial({ color: 0xffe680, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
            this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.4, 8, 1, true), this.beamMat);
            this.beam.position.y = 1.2;
            this.root.add(this.beam);
            this.materials.push({ dispose: () => this.beam.geometry.dispose() });
            // Anillo inclinado de cubitos girando por encima
            this.orbit = new THREE.Group();
            this.orbit.position.y = 0.9;
            this.orbit.rotation.x = 0.5;
            this.root.add(this.orbit);
            for (let i = 0; i < 10; i++) {
                const a = (i / 10) * Math.PI * 2;
                this.part(this.orbit, 0.06, 0.06, 0.06, i % 3 ? gold : white, Math.sin(a) * 0.48, 0, Math.cos(a) * 0.48, false);
            }
        }

        // Burbuja de escudo
        this.bubbleMat = own(new THREE.MeshBasicMaterial({ color: 0x6fd0ff, transparent: true, opacity: 0.35, depthWrite: false }));
        this.bubble = new THREE.Mesh(new THREE.IcosahedronGeometry(0.66, 1), this.bubbleMat);
        this.bubble.position.y = 0.35;
        this.bubble.visible = false;
        this.root.add(this.bubble);
        this.materials.push({ dispose: () => this.bubble.geometry.dispose() });

        // Sombra
        this.shadowMat = own(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
        this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 8), this.shadowMat);
        this.shadow.rotation.x = -Math.PI / 2;
        this.shadow.position.y = 0.012;
        this.materials.push({ dispose: () => this.shadow.geometry.dispose() });

        // Barra de vida flotante (siempre mirando a cámara)
        this.bar = new THREE.Group();
        const barMat = (c, order) => {
            const m = own(new THREE.MeshBasicMaterial({ color: c, depthTest: false, transparent: true }));
            return [m, order];
        };
        const plane = (w, h, [m, order]) => {
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
            mesh.renderOrder = order;
            this.materials.push({ dispose: () => mesh.geometry.dispose() });
            this.bar.add(mesh);
            return mesh;
        };
        plane(BAR_W + 0.1, 0.22, barMat(outlineColor, 20));
        this.barTrail = plane(BAR_W, 0.12, barMat(0xffffff, 21));
        this.barHeal = plane(BAR_W, 0.12, barMat(0x17d65a, 21));
        this.barFill = plane(BAR_W, 0.12, barMat(palette.body, 22));

        // Munición: una casilla por bala; al recargar, una barra que se llena.
        const ammoY = -0.2;
        plane(BAR_W + 0.1, 0.16, barMat(outlineColor, 20)).position.y = ammoY;
        const pipW = (BAR_W - PIP_GAP * (magazine - 1)) / magazine;
        const full = barMat(palette.accent, 22), empty = barMat(0x3b2d6b, 21);
        this.pips = [];
        for (let i = 0; i < magazine; i++) {
            const x = -BAR_W / 2 + pipW / 2 + i * (pipW + PIP_GAP);
            plane(pipW, 0.08, empty).position.set(x, ammoY, 0);
            const pip = plane(pipW, 0.08, full);
            pip.position.set(x, ammoY, 0);
            this.pips.push(pip);
        }
        this.reloadFill = plane(BAR_W, 0.08, barMat(0xffffff, 23));
        this.reloadFill.position.y = ammoY;
    }

    part(parent, w, h, d, material, x, y, z, outlined = true) {
        const m = new THREE.Mesh(box(w, h, d), material);
        m.position.set(x, y, z);
        parent.add(m);
        if (outlined) {
            const o = new THREE.Mesh(box(w + OUTLINE * 2, h + OUTLINE * 2, d + OUTLINE * 2), this.outlineMat);
            o.position.set(x, y, z);
            parent.add(o);
        }
        return m;
    }

    addTo(parent) {
        parent.add(this.root, this.shadow, this.bar);
    }

    sync(dt, tank, fade, camera) {
        this.t += dt;
        const moving = tank.moving && tank.alive;
        const k = tank.recoil;

        this.root.position.set(tank.x, this.dropY, tank.z);
        this.root.rotation.y = tank.yaw;
        this.turret.rotation.y = wrapAngle(tank.aimYaw - tank.yaw);

        this.body.position.y = moving ? Math.abs(Math.sin(this.t * 18)) * 0.05 : Math.sin(this.t * 3) * 0.012;
        this.body.rotation.x = moving ? 0.07 : -k * 0.12;
        this.body.scale.set(1 + k * 0.12, 1 - k * 0.15, 1 + k * 0.06);
        this.barrel.position.z = 0.17 - k * 0.14;
        this.antenna.rotation.x = Math.sin(this.t * 10) * (moving ? 0.3 : 0.08) - (moving ? 0.35 : 0);

        this.blink -= dt;
        if (this.blink < 0) this.blink = 1.5 + Math.random() * 3;
        this.eyes.scale.y = this.blink < 0.12 || !tank.alive ? 0.15 : 1;

        this.bubble.visible = tank.shield > 0;
        if (this.bubble.visible) {
            this.bubble.scale.setScalar(1 + Math.sin(this.t * 6) * 0.05);
            this.bubble.rotation.y = this.t;
            this.bubbleMat.opacity = 0.28 * fade + Math.sin(this.t * 6) * 0.05;
        }

        if (this.hatAnim) this.hatAnim(this.t, moving);
        let sheen = 0;
        if (this.aura) {
            this.aura.rotation.y = this.t * 2.2 - tank.yaw;
            this.aura.position.y = Math.sin(this.t * 3) * 0.06;
            this.halo.scale.setScalar(1 + Math.sin(this.t * 4) * 0.12);
            this.haloMat.opacity = (0.35 + Math.sin(this.t * 4) * 0.2) * fade;
            this.beamMat.opacity = (0.14 + Math.sin(this.t * 3) * 0.07) * fade;
            this.beam.rotation.y = this.t * 0.8;
            this.orbit.rotation.y = this.t * 3.4;
            // Brillo metálico que barre el tanque cada poco
            sheen = Math.max(0, Math.sin(this.t * 2.6)) ** 8 * 0.45;
        }

        this.fx.flash.value = Math.max(tank.flash, sheen);
        this.fx.fade.value = fade;
        const shown = fade > 0.001 && tank.alive;
        this.root.visible = shown;
        this.shadow.visible = shown;
        this.shadow.position.set(tank.x, 0.012, tank.z);
        this.shadow.scale.setScalar(1 / (1 + this.dropY * 0.25));
        this.shadowMat.opacity = 0.3 * Math.min(1, fade * 1.5);

        const ratio = tank.hp / tank.maxHp;
        if (ratio > this.lastRatio) this.healPulse = 1;
        this.lastRatio = ratio;
        this.healPulse = Math.max(0, (this.healPulse || 0) - dt * 2.5);
        this.barRatio = damp(this.barRatio, ratio, this.barRatio < ratio ? 3 : 5, dt);
        this.bar.visible = shown && fade > 0.4;
        this.bar.position.set(tank.x, 1.55 + this.dropY, tank.z);
        this.bar.quaternion.copy(camera.quaternion);
        // Daño: la barra cae al momento y un tramo blanco se vacía detrás.
        // Curación: un tramo verde marca lo ganado y la barra crece hasta él con un pulso.
        const healing = this.barRatio < ratio;
        this.setBar(this.barFill, healing ? this.barRatio : ratio);
        this.barTrail.visible = !healing;
        this.barHeal.visible = healing;
        if (healing) this.setBar(this.barHeal, ratio);
        else this.setBar(this.barTrail, this.barRatio);
        this.bar.scale.setScalar(1 + this.healPulse * 0.35);

        const reloading = tank.reloading > 0;
        this.pips.forEach((pip, i) => (pip.visible = !reloading && i < tank.ammo));
        this.reloadFill.visible = reloading;
        if (reloading) this.setBar(this.reloadFill, tank.reloadProgress);
    }

    setBar(mesh, r) {
        mesh.scale.x = Math.max(0.0001, r);
        mesh.position.x = -(BAR_W * (1 - r)) / 2;
    }

    dispose() {
        this.root.removeFromParent();
        this.shadow.removeFromParent();
        this.bar.removeFromParent();
        for (const m of this.materials) m.dispose();
    }
}
