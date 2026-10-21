import * as THREE from 'three';
import { box, toon, outline, OUTLINE } from './materials.js';
import { damp, wrapAngle } from '../core/math.js';

const BAR_W = 0.78;
const PIP_GAP = 0.05;

// Tanque voxel con ojitos. Solo es visual: la simulación vive en world/Tank.js.
export class TankModel {
    constructor(palette, outlineColor, magazine = 3) {
        this.fx = { fade: { value: 1 }, flash: { value: 0 } };
        this.materials = [];
        this.t = Math.random() * 10;
        this.blink = 2;
        this.dropY = 0;
        this.barRatio = 1;

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

        this.fx.flash.value = tank.flash;
        this.fx.fade.value = fade;
        const shown = fade > 0.001 && tank.alive;
        this.root.visible = shown;
        this.shadow.visible = shown;
        this.shadow.position.set(tank.x, 0.012, tank.z);
        this.shadow.scale.setScalar(1 / (1 + this.dropY * 0.25));
        this.shadowMat.opacity = 0.3 * Math.min(1, fade * 1.5);

        const ratio = tank.hp / tank.maxHp;
        this.barRatio = damp(this.barRatio, ratio, 5, dt);
        this.bar.visible = shown && fade > 0.4;
        this.bar.position.set(tank.x, 1.55 + this.dropY, tank.z);
        this.bar.quaternion.copy(camera.quaternion);
        this.setBar(this.barFill, ratio);
        this.setBar(this.barTrail, this.barRatio);

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
