// Renderiza el tanque voxel del juego en una pose de acción, como hoja de sprites
// Uso (con el servidor en :3123): node tools/render-loader-tank.cjs public/img/loader-tank.png '{"w":300,"h":170,"n":10,"cam":[-0.1,1.15,3.3],"look":[0.2,0.55,0],"yaw":1.05,"aim":0.85,"pitch":-0.08,"lift":0.03,"fov":28}'
const { chromium } = require('playwright');
const fs = require('fs');
const out = process.argv[2];
const cfg = JSON.parse(process.argv[3] || '{}');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => console.log(m.text()));
  await p.goto('http://localhost:3123/', { waitUntil: 'load' });
  const data = await p.evaluate(async (cfg) => {
    const THREE = await import('three');
    const { TankModel } = await import('/src/render/TankModel.js');
    const { TANKS } = await import('/src/content/index.js');
    const { box, toon } = await import('/src/render/materials.js');
    const W = cfg.w || 160, H = cfg.h || 120, N = cfg.n || 8;
    const gl = new THREE.WebGLRenderer({ antialias: false, alpha: true, preserveDrawingBuffer: true });
    gl.setPixelRatio(1); gl.setSize(W, H, false);
    gl.outputColorSpace = THREE.LinearSRGBColorSpace; gl.setClearColor(0, 0);
    const scene = new THREE.Scene();
    const sun = new THREE.DirectionalLight(0xfff2d8, 2.4); sun.position.set(-4, 10, 6);
    scene.add(sun, new THREE.HemisphereLight(0xd6c8ff, 0x7a4cff, 1.2));
    const cam = new THREE.PerspectiveCamera(cfg.fov || 28, W / H, 0.1, 60);
    cam.position.set(...cfg.cam); cam.lookAt(...cfg.look);
    const m = new TankModel(TANKS.hero.palette, 0x1b0b33, 3, null, {});
    scene.add(m.root);
    const yaw = cfg.yaw, aim = cfg.aim;
    const f = { x: 0, z: 0, yaw, aimYaw: aim, moving: false, alive: true, recoil: 0, flash: 0, shield: 0, hp: 3, maxHp: 3, ammo: 3, reloading: 0, angry: false };
    // Fogonazo, humo, bala y polvo: cubos del mismo estilo
    const cube = (s, c) => { const o = new THREE.Mesh(box(s, s, s), toon(c)); o.visible = false; scene.add(o); return o; };
    const flash = [cube(0.3, 0xfff6e8), cube(0.22, 0xffe03a), cube(0.2, 0xffe03a), cube(0.16, 0xff8a1e), cube(0.16, 0xff8a1e)];
    const smoke = [0, 1, 2, 3].map(() => cube(0.16, 0xe2dcff));
    const dust = [0, 1, 2, 3, 4, 5].map(() => cube(0.12, 0xb7aed6));
    const bullet = cube(0.2, 0x8afcff);
    const tip = new THREE.Vector3(), dir = new THREE.Vector3();
    const frames = [];
    for (let i = 0; i < N; i++) {
      const ph = i / N;
      f.recoil = Math.max(0, 1 - i * 0.4);
      m.t = 0.3; m.blink = 2;
      m.sync(0, f, 1, cam);
      m.bar.visible = false; m.shadow.visible = false;
      // Pose: morro arriba, saltando un bache, con la torreta girada hacia nosotros
      m.root.rotation.set(cfg.pitch || 0, yaw, cfg.roll || 0, 'YXZ');
      m.root.position.y = (cfg.lift || 0) + (i % 2 ? 0.02 : 0);
      m.antenna.rotation.x = -0.5 + (i % 2 ? 0.25 : -0.1);
      m.root.updateMatrixWorld(true);
      m.barrel.getWorldPosition(tip);
      dir.set(0, 0, 1).applyQuaternion(m.barrel.getWorldQuaternion(new THREE.Quaternion()));
      const muzzle = tip.clone().addScaledVector(dir, 0.55 - f.recoil * 0.14);
      // Fogonazo en los dos primeros fotogramas
      flash.forEach((c, j) => {
        c.visible = i < 2;
        const spread = i === 0 ? 1 : 0.6;
        const side = new THREE.Vector3(-dir.z, 0, dir.x);
        const offs = [[0.15, 0, 0], [0.35, 0.08, 0.1], [0.32, -0.08, -0.12], [0.5, 0.12, -0.05], [0.48, -0.1, 0.12]][j];
        c.position.copy(muzzle).addScaledVector(dir, offs[0] * spread).addScaledVector(side, offs[2] * spread);
        c.position.y += offs[1] * spread;
        c.rotation.set(j, j * 2, 0);
        c.scale.setScalar(i === 0 ? 0.9 : 0.55);
      });
      smoke.forEach((c, j) => {
        const k = (i - 1 + j * 0.5) / 5;
        c.visible = i >= 1 && k < 1;
        c.position.copy(muzzle).addScaledVector(dir, 0.1 + k * 0.3);
        c.position.y += k * 0.3 + j * 0.04;
        c.position.x += (j - 1.5) * 0.08;
        c.scale.setScalar(0.8 + k * 1.2);
        c.rotation.set(k * 2 + j, k + j, 0);
      });
      bullet.visible = i >= 1 && i < 5;
      bullet.position.copy(muzzle).addScaledVector(dir, (i - 0.5) * 0.9);
      bullet.rotation.set(i, i, 0);
      // Polvo de las orugas, detrás
      const back = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      dust.forEach((c, j) => {
        const k = ((ph + j / dust.length) % 1);
        c.visible = true;
        c.position.set(0, 0.06 + k * 0.35, 0).addScaledVector(back, 0.5 + k * 0.7);
        c.position.addScaledVector(new THREE.Vector3(-back.z, 0, back.x), (j % 2 ? 0.3 : -0.3) * (1 + k));
        c.scale.setScalar(1.3 - k * 1.1);
        c.rotation.set(k * 3, j, 0);
      });
      gl.render(scene, cam);
      frames.push(gl.domElement.toDataURL('image/png'));
    }
    return { frames, W, H };
  }, cfg);
  // Hoja horizontal
  const sheet = await b.newPage();
  const png = await sheet.evaluate(async ({ frames, W, H }) => {
    const c = document.createElement('canvas'); c.width = W * frames.length; c.height = H;
    const x = c.getContext('2d');
    for (let i = 0; i < frames.length; i++) { const im = new Image(); im.src = frames[i]; await im.decode(); x.drawImage(im, i * W, 0); }
    return c.toDataURL('image/png');
  }, data);
  fs.writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
  await b.close();
})();
