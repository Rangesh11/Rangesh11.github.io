/* ==========================================================
   Title screen — Rangesh's tech world (three.js)
   Every object maps to real work or skills:
   · Xero ⇄ Facilio towers with packets flowing both ways (two-way sync)
   · a desk with FacilioScript on the monitor (Facilio delivery)
   · an ETL pipeline: Source → Go API → Airbyte → Warehouse (Vanij)
   · a Docker server rack with blinking lights
   · floating skill blocks you can click to "equip"
   ========================================================== */
const buildHeroWorld = () => {
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

  /* ---------- lights (kept soft so nothing washes out) ---------- */
  scene.add(new THREE.HemisphereLight(0xb9b2ff, 0x120e24, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 0.75);
  key.position.set(-8, 14, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -24, right: 24, top: 10, bottom: -10, near: 1, far: 60 });
  key.shadow.bias = -0.0008;
  scene.add(key);
  const cyanRim = new THREE.DirectionalLight(0x38d9f5, 0.45);
  cyanRim.position.set(12, 6, -6);
  scene.add(cyanRim);
  const pinkRim = new THREE.DirectionalLight(0xff4d8d, 0.25);
  pinkRim.position.set(-12, 4, -6);
  scene.add(pinkRim);

  /* ---------- helpers ---------- */
  const glow = (color, intensity = 0.9) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 });
  const tex = (draw, w = 256, h = 128) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
    t.userData = { canvas: c };
    return t;
  };
  const font = (px, weight = 700) => `${weight} ${px}px "Chakra Petch", "Inter", sans-serif`;
  const labelTex = (text, fg, bg, size = 64) => tex((g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.font = font(size); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 4);
  });
  // a box with a label on its front face
  const labeledBox = (w, h, d, color, text, fg = '#ffffff', size = 64) => {
    const side = std(color);
    const front = new THREE.MeshStandardMaterial({ map: labelTex(text, fg, '#' + new THREE.Color(color).getHexString(), size), roughness: 0.6 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, side, side, front, side]);
    m.castShadow = true; m.receiveShadow = true;
    return outline(m, 0x05040c, 0.5);
  };

  /* ---------- ground: a circuit board ---------- */
  const boardMat = std(0x161a33, { roughness: 0.9 });
  const board = box(48, 0.5, 5, boardMat);
  board.position.set(0, -0.25, -0.4);
  scene.add(board);
  const edge = box(48, 0.9, 5, std(0x0d1022, { roughness: 1 }), false);
  edge.position.set(0, -0.95, -0.4);
  scene.add(edge);
  // glowing traces
  const traceCols = [0x38d9f5, 0x3ef08a, 0x8b6cff];
  for (let i = 0; i < 18; i++) {
    const len = 2 + Math.random() * 6;
    const t = new THREE.Mesh(new THREE.BoxGeometry(len, 0.04, 0.06), glow(traceCols[i % 3], 0.6));
    t.position.set(-22 + Math.random() * 44, 0.02, -2.4 + Math.random() * 4.2);
    scene.add(t);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.18), glow(traceCols[i % 3], 0.8));
    pad.position.set(t.position.x + len / 2, 0.03, t.position.z);
    scene.add(pad);
  }
  // little chips on the board
  for (let i = 0; i < 10; i++) {
    const chip = box(0.6, 0.16, 0.45, std(0x1d1b2e, { roughness: 0.5 }));
    chip.position.set(-20 + i * 4.4 + Math.random(), 0.08, -1.9 + Math.random() * 0.5);
    scene.add(chip);
  }

  /* ---------- packets: small glowing cubes travelling along a path ---------- */
  const packets = [];
  const flow = (from, to, color, n, speed, label) => {
    for (let i = 0; i < n; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), glow(color, 1.1));
      p.userData = { from, to, t: i / n, speed };
      scene.add(p);
      packets.push(p);
    }
    if (label) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(from.distanceTo(to), 0.04, 0.04), glow(color, 0.35));
      beam.position.copy(from).lerp(to, 0.5);
      beam.lookAt(to); beam.rotateY(Math.PI / 2);
      scene.add(beam);
    }
  };

  /* ---------- Xero ⇄ Facilio towers (two-way sync) ---------- */
  const tower = (x, color, letter, name) => {
    const g = new THREE.Group();
    const base = box(1.6, 0.4, 1.6, std(0x23203f)); base.position.y = 0.2;
    const body = labeledBox(1.2, 2.4, 1.2, color, letter, '#ffffff', 96); body.position.y = 1.6;
    const cap = box(1.4, 0.2, 1.4, std(0x23203f)); cap.position.y = 2.9;
    const name1 = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), new THREE.MeshBasicMaterial({ map: labelTex(name, '#f2efff', '#17132e', 54), transparent: true }));
    name1.position.set(0, 3.35, 0);
    g.add(base, body, cap, name1);
    g.position.set(x, 0, -0.6);
    scene.add(g);
    return g;
  };
  tower(-14.6, 0x13a4d8, 'X', 'XERO');
  tower(-9.2, 0x8b6cff, 'F', 'FACILIO');
  flow(new THREE.Vector3(-13.9, 2.2, -0.6), new THREE.Vector3(-9.9, 2.2, -0.6), 0x38d9f5, 4, 0.45, true);
  flow(new THREE.Vector3(-9.9, 1.5, -0.6), new THREE.Vector3(-13.9, 1.5, -0.6), 0xff4d8d, 4, 0.45, true);
  const syncSign = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.5), new THREE.MeshBasicMaterial({ map: labelTex('⇄ TWO-WAY SYNC', '#38d9f5', '#0d0b1a', 40), transparent: true }));
  syncSign.position.set(-11.9, 3.1, -0.6);
  scene.add(syncSign);

  /* ---------- desk with FacilioScript on the monitor ---------- */
  const desk = new THREE.Group();
  const top = box(3, 0.16, 1.4, std(0x5a4632, { roughness: 0.7 })); top.position.y = 1.1;
  const legMat = std(0x2b2a3a);
  [[-1.35, -0.55], [1.35, -0.55], [-1.35, 0.55], [1.35, 0.55]].forEach(([x, z]) => { const l = box(0.12, 1.05, 0.12, legMat); l.position.set(x, 0.53, z); desk.add(l); });
  const stand = box(0.14, 0.5, 0.14, std(0x1b1a26)); stand.position.set(0, 1.42, -0.35);
  const screenTex = tex((g, w, h) => {
    g.fillStyle = '#0d0b1a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd23f'; g.font = font(20); g.textAlign = 'left'; g.textBaseline = 'top';
    g.fillText('workorder.fs', 14, 10);
    const lines = [['#8b6cff', 'void autoAssign(wo) {'], ['#38d9f5', '  tech = findNearest(wo);'], ['#f2efff', '  wo.assign(tech);'], ['#3ef08a', '  notify(client, "✓");'], ['#8b6cff', '}']];
    lines.forEach(([c, s], i) => { g.fillStyle = c; g.font = font(17, 600); g.fillText(s, 14, 38 + i * 17); });
  }, 256, 128);
  const screen = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.05, 0.08), [
    std(0x111018), std(0x111018), std(0x111018), std(0x111018),
    new THREE.MeshStandardMaterial({ map: screenTex, emissive: 0xffffff, emissiveMap: screenTex, emissiveIntensity: 0.55 }), std(0x111018),
  ]);
  screen.position.set(0, 2.15, -0.35); screen.castShadow = true;
  outline(screen, 0x05040c, 0.8);
  const keyboard = box(1.1, 0.06, 0.35, std(0x24232f)); keyboard.position.set(0, 1.21, 0.25);
  const mug = box(0.22, 0.28, 0.22, std(0xff4d8d)); mug.position.set(1.05, 1.32, 0.2);
  desk.add(top, stand, screen, keyboard, mug);
  desk.position.set(-4.4, 0, -0.5);
  scene.add(desk);

  /* ---------- ETL pipeline: Source → Go API → Airbyte → Warehouse ---------- */
  const node = (x, color, text, w = 1.5, size = 52, fg = '#ffffff') => {
    const n = labeledBox(w, 1.1, 1.1, color, text, fg, size);
    n.position.set(x, 0.55, -0.4);
    scene.add(n);
    return n;
  };
  node(3.2, 0x3a3170, 'SOURCE', 1.6, 44);
  node(6.0, 0x3ef08a, 'GO API', 1.6, 48, '#0a0816');
  node(8.8, 0x38d9f5, 'AIRBYTE', 1.7, 44, '#0a0816');
  // warehouse: a stack of database discs
  const wh = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.38, 24), std(i % 2 ? 0xffb02e : 0xffd23f, { roughness: 0.5 }));
    d.position.y = 0.22 + i * 0.42; d.castShadow = true;
    wh.add(d);
  }
  const whLabel = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.45), new THREE.MeshBasicMaterial({ map: labelTex('WAREHOUSE', '#f2efff', '#17132e', 46), transparent: true }));
  whLabel.position.set(0, 1.75, 0);
  wh.add(whLabel);
  wh.position.set(11.6, 0, -0.4);
  scene.add(wh);
  const etlY = 0.6;
  [[4.0, 5.2], [6.8, 7.95], [9.65, 10.85]].forEach(([a, b]) => {
    flow(new THREE.Vector3(a, etlY, 0.25), new THREE.Vector3(b, etlY, 0.25), 0xffd23f, 2, 0.7, true);
  });
  const etlSign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5), new THREE.MeshBasicMaterial({ map: labelTex('ETL PIPELINE', '#ffd23f', '#0d0b1a', 44), transparent: true }));
  etlSign.position.set(7.4, 1.75, -0.4);
  scene.add(etlSign);

  /* ---------- Docker server rack with blinking lights ---------- */
  const rack = new THREE.Group();
  const frame = labeledBox(1.4, 3, 1.1, 0x1d2440, 'DOCKER', '#38d9f5', 40);
  frame.position.y = 1.5;
  rack.add(frame);
  const leds = [];
  for (let r = 0; r < 6; r++) {
    const unit = box(1.2, 0.3, 0.05, std(0x2a3358), false);
    unit.position.set(0, 0.45 + r * 0.42, 0.57);
    rack.add(unit);
    for (let k = 0; k < 3; k++) {
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), glow(k === 0 ? 0x3ef08a : k === 1 ? 0x38d9f5 : 0xffd23f, 1));
      led.position.set(0.35 + k * 0.14, 0.45 + r * 0.42, 0.6);
      led.userData.phase = Math.random() * 10;
      rack.add(led); leds.push(led);
    }
  }
  rack.position.set(14.6, 0, -0.7);
  scene.add(rack);

  /* ---------- floating skill blocks (click to equip) ---------- */
  const SKILLS = [
    ['GO', 0x3ef08a, '#0a0816', 'Go'], ['VUE', 0x41b883, '#0a0816', 'Vue.js'], ['JS', 0xffd23f, '#0a0816', 'JavaScript'],
    ['TS', 0x3178c6, '#ffffff', 'TypeScript'], ['PY', 0x4b8bbe, '#ffd23f', 'Python'], ['JAVA', 0xe76f00, '#ffffff', 'Java'],
    ['SQL', 0x8b6cff, '#ffffff', 'MySQL'], ['GIT', 0xf05033, '#ffffff', 'Git'],
  ];
  const skillBlocks = [];
  const xs = [-12.6, -7, -2.2, 1.8, 4.6, 7.4, 10.2, 13.4];
  SKILLS.forEach(([t, color, fg, name], i) => {
    const holder = new THREE.Group();
    const faceTex = labelTex(t, fg, '#' + new THREE.Color(color).getHexString(), t.length > 3 ? 70 : 96);
    const mat = new THREE.MeshStandardMaterial({ map: faceTex, emissive: color, emissiveIntensity: 0.18, roughness: 0.45 });
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), mat);
    cube.castShadow = true;
    outline(cube, 0x05040c, 0.7);
    cube.userData.holder = holder;
    holder.add(cube);
    holder.position.set(xs[i], 3.9 + (i % 2) * 0.6, 0.4);
    holder.userData = { phase: i * 0.8, baseY: holder.position.y, name, got: false, t: 0 };
    scene.add(holder);
    skillBlocks.push(holder);
  });
  let equipped = 0;

  /* ---------- the hero ---------- */
  const { hero, legL, legR, armL, armR, head } = makeHero();
  hero.scale.setScalar(1.35);
  scene.add(hero);
  const homeX = -1.6;
  hero.position.set(homeX, 0, 0.6);

  /* ---------- camera fit ---------- */
  let camDist = 12, camX = 0;
  const fit = () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const halfW = w < 700 ? 7.5 : 16.2; // phones show the desk area; wide screens show the whole world
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    camDist = Math.max(9, halfW / tanH);
    camX = w < 700 ? -2.4 : 0; // phones centre on the desk and the character
  };

  /* ---------- interaction ---------- */
  const mouse = new THREE.Vector2();
  const look = new THREE.Vector2();
  let waveT = 0, running = false, runT = 0, lastAutoWave = 0;
  window.addEventListener('pointermove', (e) => { mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); }, { passive: true });
  host.addEventListener('pointerenter', () => { waveT = 1.4; });

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  renderer.domElement.addEventListener('pointerdown', (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(skillBlocks.map((s) => s.children[0]), false)[0];
    if (hit) {
      const s = hit.object.userData.holder;
      if (!s.userData.got) {
        s.userData.got = true; equipped++;
        if (window.SFX) window.SFX.play('coin');
        if (typeof Ach !== 'undefined') {
          Ach.toast('🧩', 'SKILL EQUIPPED', s.userData.name, equipped === SKILLS.length ? 'All 8 skills equipped. Full loadout!' : `${equipped}/${SKILLS.length} skills equipped`);
        }
      }
      kick();
      return;
    }
    if (ray.intersectObject(hero, true).length) { waveT = 1.4; if (window.SFX) window.SFX.play('click'); kick(); }
  });
  const start = document.getElementById('press-start');
  if (start) start.addEventListener('click', () => { if (!reduce) { running = true; runT = 0; kick(); } });

  /* ---------- loop ---------- */
  let visible = false, raf = 0, last = performance.now(), time = 0;
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  const loop = (now) => {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!reduce) time += dt;

    packets.forEach((p) => {
      const u = p.userData;
      if (!reduce) u.t = (u.t + dt * u.speed) % 1;
      p.position.lerpVectors(u.from, u.to, u.t);
      p.rotation.y = time * 3;
    });
    leds.forEach((l) => { l.material.emissiveIntensity = reduce ? 1 : (Math.sin(time * 6 + l.userData.phase) > 0.2 ? 1.3 : 0.15); });

    skillBlocks.forEach((s) => {
      const u = s.userData;
      const cube = s.children[0];
      if (u.got) {
        // fly into the hero, then hide
        u.t = Math.min(1, u.t + dt * 1.6);
        const target = hero.position.clone().add(new THREE.Vector3(0, 2.2, 0));
        s.position.lerp(target, u.t * 0.25 + 0.05);
        s.scale.setScalar(Math.max(0.001, 1 - u.t));
        s.visible = u.t < 1;
      } else {
        s.position.y = u.baseY + (reduce ? 0 : Math.sin(time * 1.8 + u.phase) * 0.18);
        cube.rotation.y = reduce ? 0.5 : time * 0.9 + u.phase;
        cube.rotation.x = reduce ? 0.3 : Math.sin(time * 0.7 + u.phase) * 0.35;
      }
    });

    look.lerp(mouse, 0.08);
    head.rotation.y = look.x * 0.7;
    head.rotation.x = -look.y * 0.25;

    if (running) {
      runT += dt;
      const swing = Math.sin(runT * 16) * 0.9;
      legL.rotation.x = swing; legR.rotation.x = -swing; armL.rotation.x = -swing; armR.rotation.x = swing;
      hero.rotation.y = Math.PI / 2;
      hero.position.x = homeX + runT * 14;
      hero.position.y = Math.abs(Math.sin(runT * 16)) * 0.15;
      if (runT > 2.4) { running = false; hero.position.set(homeX, 0, 0.6); waveT = 1.4; }
    } else {
      hero.rotation.y += ((look.x * 0.35 - 0.25) - hero.rotation.y) * 0.1;
      legL.rotation.x *= 0.8; legR.rotation.x *= 0.8;
      hero.position.y = reduce ? 0 : Math.abs(Math.sin(time * 1.6)) * 0.03;
      if (waveT > 0) {
        waveT -= dt;
        armR.rotation.z = 2.6 + Math.sin(waveT * 14) * 0.35; armR.rotation.x = 0;
      } else {
        armR.rotation.z *= 0.85;
        const idle = reduce ? 0 : Math.sin(time * 2.2) * 0.06;
        armL.rotation.x = idle; armR.rotation.x = -idle;
      }
      if (!reduce && time - lastAutoWave > 7) { lastAutoWave = time; waveT = 1.4; }
    }

    camera.position.set(look.x * 1.2 + camX, 2.6 + look.y * 0.3, camDist);
    camera.lookAt(camX, 1.9, 0);
    renderer.render(scene, camera);

    if (visible && (!reduce || running || waveT > 0 || skillBlocks.some((s) => s.userData.got && s.visible))) raf = requestAnimationFrame(loop);
  };

  fit();
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) { last = performance.now(); kick(); } }, { threshold: 0.01 }).observe(host);
  addEventListener('resize', () => { fit(); kick(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = performance.now(); kick(); } });
  if (document.fonts) document.fonts.ready.then(() => kick());
  if (reduce) window.addEventListener('pointermove', kick, { passive: true });
  kick();
};
// wait for the web font so the labels painted on the blocks use it
(document.fonts ? document.fonts.ready : Promise.resolve()).then(buildHeroWorld);
