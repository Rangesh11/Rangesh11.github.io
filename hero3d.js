/* ==========================================================
   Title screen — 3D voxel landscape with Rangesh, trees,
   drifting clouds and collectable coins.
   ========================================================== */
(() => {
  const host = document.getElementById('hero3d');
  if (!host || typeof THREE === 'undefined' || !window.RS3D) return;
  const { std, box, outline, makeHero } = window.RS3D;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return; }
  if (!renderer.getContext()) return;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  host.appendChild(renderer.domElement);
  document.querySelector('.title-screen').classList.add('has-3d');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 4, 0.1, 200);

  scene.add(new THREE.HemisphereLight(0xd8d0ff, 0x1a1530, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(-8, 14, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 10, bottom: -10, near: 1, far: 60 });
  sun.shadow.bias = -0.0008;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x38d9f5, 0.3);
  rim.position.set(10, 5, -8);
  scene.add(rim);

  /* ---------- ground: a strip of grass blocks ---------- */
  const ground = new THREE.Group();
  scene.add(ground);
  const grassMats = [std(0x3ec46d), std(0x36b061), std(0x44d077)];
  const dirt = std(0x4a3426, { roughness: 0.95 });
  const dirtDark = std(0x3a281d, { roughness: 1 });
  for (let x = -26; x <= 26; x++) {
    for (let z = -2; z <= 1; z++) {
      const top = box(1, 0.5, 1, grassMats[(x * 7 + z * 3 + 30) % 3]);
      top.position.set(x, 0, z);
      const d1 = box(1, 1, 1, dirt, false); d1.position.set(x, -0.75, z);
      const d2 = box(1, 1, 1, dirtDark, false); d2.position.set(x, -1.75, z);
      ground.add(top, d1, d2);
    }
  }
  // flowers & tufts
  const flowerCols = [0xffd23f, 0xff4d8d, 0x38d9f5, 0xffffff];
  for (let i = 0; i < 40; i++) {
    const f = box(0.16, 0.16, 0.16, std(flowerCols[i % 4], { roughness: 0.5 }));
    f.position.set(-25 + Math.random() * 50, 0.33, -2.2 + Math.random() * 3.2);
    ground.add(f);
  }

  /* ---------- trees ---------- */
  const tree = (x, z, s = 1) => {
    const g = new THREE.Group();
    const trunk = box(0.4, 1.6, 0.4, std(0x6b4a2f)); trunk.position.y = 1.05;
    g.add(trunk);
    const leaf = std(0x2fa35a, { roughness: 0.6 });
    const leaf2 = std(0x37b866, { roughness: 0.6 });
    [[0, 2.2, 0, 1.6], [0.5, 2.7, 0.2, 1.0], [-0.45, 2.6, -0.2, 1.0], [0, 3.15, 0, 0.9]].forEach(([lx, ly, lz, ls], k) => {
      const l = outline(box(ls, ls, ls, k % 2 ? leaf2 : leaf), 0x05040c, 0.25); l.position.set(lx, ly, lz); g.add(l);
    });
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    scene.add(g);
    return g;
  };
  tree(-13, -1.6, 1.1); tree(-7.5, -1.8, 0.85); tree(9, -1.6, 1); tree(15, -1.7, 1.2); tree(21, -1.5, 0.9); tree(-20, -1.6, 1);

  /* ---------- clouds ---------- */
  const cloudMat = std(0xffffff, { roughness: 1, transparent: true, opacity: 0.92 });
  const clouds = [];
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Group();
    const n = 3 + (i % 3);
    for (let k = 0; k < n; k++) {
      const b = box(1.2 + Math.random() * 0.8, 0.7 + Math.random() * 0.4, 1, cloudMat, false);
      b.position.set(k * 0.9, Math.random() * 0.3, Math.random() * 0.4);
      c.add(b);
    }
    c.position.set(-24 + i * 9, 5.4 + Math.random() * 1.6, -6 - Math.random() * 4);
    c.userData.speed = 0.25 + Math.random() * 0.3;
    scene.add(c);
    clouds.push(c);
  }

  /* ---------- coins ---------- */
  const coinMat = std(0xffd23f, { metalness: 0.7, roughness: 0.25, emissive: 0x3a2a00 });
  const coins = [];
  [-10, -4.5, 3.5, 6.5, 12].forEach((x, i) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.1, 20), coinMat);
    c.rotation.x = Math.PI / 2;
    c.castShadow = true;
    const holder = new THREE.Group();
    holder.add(c);
    holder.position.set(x, 1.6 + (i % 2) * 0.5, 0.2);
    holder.userData = { phase: i * 1.1, collected: false, t: 0, baseY: holder.position.y };
    c.userData.holder = holder;
    scene.add(holder);
    coins.push(holder);
  });
  let collected = 0;

  /* ---------- the hero ---------- */
  const { hero, legL, legR, armL, armR, head } = makeHero();
  hero.scale.setScalar(1.35);
  hero.position.set(0, 0.25, 0.3);
  scene.add(hero);

  /* ---------- layout & camera ---------- */
  let heroX = 0, targetHeroX = 0;
  const frame = () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // put the character in the gap between the text column and the player card on wide screens
    const wide = w > 900;
    targetHeroX = heroX = wide ? 1.2 : 0;
  };

  /* ---------- interaction ---------- */
  const mouse = new THREE.Vector2(0, 0);
  let look = new THREE.Vector2(0, 0);
  let waveT = 0, running = false, runT = 0;
  window.addEventListener('pointermove', (e) => {
    mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  }, { passive: true });
  host.addEventListener('pointerenter', () => { waveT = 1.4; });

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  renderer.domElement.addEventListener('pointerdown', (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(coins.map((c) => c.children[0]), false);
    if (hits.length) {
      const h = hits[0].object.userData.holder;
      if (!h.userData.collected) {
        h.userData.collected = true;
        collected++;
        if (window.SFX) window.SFX.play('coin');
        if (collected === coins.length && typeof Ach !== 'undefined') {
          Ach.toast('🪙', 'ALL COINS', 'Coin collector!', 'You grabbed every coin on the title screen.');
        }
      }
      return;
    }
    // clicking the hero makes him wave
    if (ray.intersectObject(hero, true).length) { waveT = 1.4; if (window.SFX) window.SFX.play('click'); }
  });

  const start = document.getElementById('press-start');
  if (start) start.addEventListener('click', () => { if (!reduce) { running = true; runT = 0; } });

  /* ---------- loop ---------- */
  let visible = false, raf = 0, last = performance.now(), time = 0;
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  const loop = (now) => {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!reduce) time += dt;

    clouds.forEach((c) => { if (!reduce) { c.position.x += c.userData.speed * dt; if (c.position.x > 30) c.position.x = -30; } });

    coins.forEach((c) => {
      const u = c.userData;
      if (u.collected) {
        u.t += dt;
        c.position.y = u.baseY + u.t * 6;
        c.children[0].rotation.z += dt * 20;
        c.scale.setScalar(Math.max(0.001, 1 - u.t * 1.6));
        c.visible = u.t < 0.7;
      } else {
        c.position.y = u.baseY + (reduce ? 0 : Math.sin(time * 2 + u.phase) * 0.15);
        c.children[0].rotation.z = reduce ? 0 : time * 2.5 + u.phase;
      }
    });

    // look toward the pointer
    look.lerp(mouse, 0.08);
    head.rotation.y = look.x * 0.7;
    head.rotation.x = -look.y * 0.25;
    hero.rotation.y = running ? Math.PI / 2 : look.x * 0.35;

    if (running) {
      runT += dt;
      const swing = Math.sin(runT * 16) * 0.9;
      legL.rotation.x = swing; legR.rotation.x = -swing; armL.rotation.x = -swing; armR.rotation.x = swing;
      hero.position.x = heroX + runT * 14;
      hero.position.y = 0.25 + Math.abs(Math.sin(runT * 16)) * 0.15;
      if (runT > 2.2) { running = false; hero.position.x = heroX; hero.position.y = 0.25; waveT = 1.4; }
    } else {
      legL.rotation.x *= 0.8; legR.rotation.x *= 0.8;
      hero.position.y = 0.25 + (reduce ? 0 : Math.abs(Math.sin(time * 1.6)) * 0.04);
      if (waveT > 0) {
        waveT -= dt;
        armR.rotation.z = 2.6 + Math.sin(waveT * 14) * 0.35;
        armR.rotation.x = 0;
      } else {
        armR.rotation.z *= 0.85;
        const idle = reduce ? 0 : Math.sin(time * 2.2) * 0.06;
        armL.rotation.x = idle; armR.rotation.x = -idle;
      }
    }
    if (!reduce && !running && waveT <= 0 && Math.floor(time) % 7 === 0 && time % 1 < dt) waveT = 1.4; // wave now and then

    // camera: low side view that drifts gently with the pointer
    camera.position.set(heroX * 0.4 + look.x * 1.2, 2.7 + look.y * 0.3, 12);
    camera.lookAt(heroX * 0.4, 1.5, 0);
    renderer.render(scene, camera);

    if (visible && (!reduce || running || waveT > 0 || coins.some((c) => c.userData.collected && c.visible))) raf = requestAnimationFrame(loop);
  };

  frame();
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) { last = performance.now(); kick(); } }, { threshold: 0.01 }).observe(host);
  addEventListener('resize', () => { frame(); kick(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = performance.now(); kick(); } });
  if (reduce) { window.addEventListener('pointermove', kick, { passive: true }); }
  kick();
})();
