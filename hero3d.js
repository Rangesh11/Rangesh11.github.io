/* ==========================================================
   Title screen — Rangesh's tech world (three.js)
   Point-and-click: hover an object to see what it is, click it
   and the character walks over and opens that project.
   · Xero ⇄ Facilio towers with packets both ways  → Xero quest
   · desk with live FacilioScript on the monitor   → Facilio save file
   · Source → Go API → Airbyte → Warehouse         → Vanij ETL quest
   · Docker rack with blinking LEDs                → Inventory (skills)
   · floating skill blocks                          → click to equip
   ========================================================== */
const buildHeroWorld = () => {
  const host = document.getElementById('hero3d');
  if (!host || typeof THREE === 'undefined' || !window.RS3D) return;
  const { std, glow, rbox, box, envFor, composerFor, isLight, cssColor, makeHero } = window.RS3D;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true }); } catch (e) { return; }
  if (!renderer.getContext()) return;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.82;
  host.appendChild(renderer.domElement);
  document.querySelector('.title-screen').classList.add('has-3d');

  const scene = new THREE.Scene();
  scene.environment = envFor(renderer);
  const camera = new THREE.PerspectiveCamera(32, 4, 0.1, 200);
  const fx = composerFor(renderer, scene, camera, { strength: 0.45, radius: 0.35, threshold: 0.88 });

  /* ---------- lights ---------- */
  const hemi = new THREE.HemisphereLight(0xb9b2ff, 0x120e24, 0.35);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff4e6, 1.0);
  key.position.set(-8, 14, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 1024);
  key.shadow.radius = 4;
  Object.assign(key.shadow.camera, { left: -22, right: 22, top: 9, bottom: -6, near: 1, far: 60 });
  key.shadow.bias = -0.0006;
  scene.add(key);
  const cyanRim = new THREE.PointLight(0x38d9f5, 1.4, 22, 2); cyanRim.position.set(9, 4, 3); scene.add(cyanRim);
  const pinkRim = new THREE.PointLight(0xff4d8d, 1.1, 22, 2); pinkRim.position.set(-12, 4, 3); scene.add(pinkRim);
  const deskLight = new THREE.PointLight(0x9fe7ff, 0.9, 6, 2); deskLight.position.set(-4.4, 2.2, 0.6); scene.add(deskLight);

  /* ---------- canvas-texture helpers ---------- */
  const font = (px, weight = 700) => `${weight} ${px}px "Chakra Petch", "Inter", sans-serif`;
  const canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    t.userData = { ctx: c.getContext('2d'), w, h };
    if (draw) { draw(t.userData.ctx, w, h); t.needsUpdate = true; }
    return t;
  };
  const labelPlane = (text, fg, bg, w, h, px = 64, glowy = false) => {
    const t = canvasTex(512, Math.round(512 * h / w), (g, cw, ch) => {
      if (bg) { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); }
      let size = px; g.font = font(size);
      while (size > 12 && (g.measureText(text).width > cw * 0.92 || size > ch * 0.86)) { size -= 4; g.font = font(size); }
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, cw / 2, ch / 2 + 3);
    });
    const m = new THREE.MeshStandardMaterial({ map: t, transparent: !bg, roughness: 0.5, emissive: glowy ? 0xffffff : 0x000000, emissiveMap: glowy ? t : null, emissiveIntensity: glowy ? 0.9 : 0 });
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  };

  /* ---------- floor: glossy circuit board ---------- */
  const board = rbox(46, 0.5, 5.4, std(0x141833, { roughness: 0.32, metalness: 0.55 }), 0.18);
  board.position.set(0, -0.25, -0.4);
  scene.add(board);
  const plinth = rbox(46.6, 0.7, 5.8, std(0x0a0c1c, { roughness: 0.8 }), 0.2, false);
  plinth.position.set(0, -0.8, -0.4);
  scene.add(plinth);
  const traceCols = [0x38d9f5, 0x3ef08a, 0x8b6cff];
  for (let i = 0; i < 22; i++) {
    const len = 2 + Math.random() * 6;
    const col = traceCols[i % 3];
    const t = box(len, 0.03, 0.05, glow(col, 0.9), false);
    t.position.set(-21 + Math.random() * 42, 0.015, -2.6 + Math.random() * 4.4);
    scene.add(t);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 12), glow(col, 1.4));
    pad.position.set(t.position.x + len / 2, 0.02, t.position.z);
    scene.add(pad);
  }
  for (let i = 0; i < 9; i++) {
    const chip = rbox(0.7, 0.14, 0.5, std(0x1b1a2b, { roughness: 0.25, metalness: 0.6 }), 0.04);
    chip.position.set(-19 + i * 4.6 + Math.random(), 0.07, -2.1 + Math.random() * 0.4);
    scene.add(chip);
  }

  /* ---------- hotspots: objects you can hover and click ---------- */
  const hotspots = [];
  const hotspot = (group, info) => { group.userData.hotspot = info; hotspots.push(group); };

  /* ---------- data packets with glowing trails ---------- */
  const packets = [];
  const flow = (from, to, color, n, speed) => {
    const beam = box(from.distanceTo(to), 0.03, 0.03, glow(color, 0.5), false);
    beam.position.copy(from).lerp(to, 0.5);
    beam.lookAt(to); beam.rotateY(Math.PI / 2);
    scene.add(beam);
    for (let i = 0; i < n; i++) {
      const parts = [0.22, 0.15, 0.1].map((s, k) => {
        const p = rbox(s, s, s, glow(color, 2.2 - k * 0.6), 0.04, false);
        scene.add(p);
        return p;
      });
      packets.push({ parts, from, to, t: i / n, speed });
    }
  };

  /* ---------- Xero ⇄ Facilio towers ---------- */
  const tower = (x, color, letter, name) => {
    const g = new THREE.Group();
    const base = rbox(1.7, 0.36, 1.7, std(0x23203f, { metalness: 0.5, roughness: 0.35 }), 0.1); base.position.y = 0.18;
    const body = rbox(1.25, 2.4, 1.25, std(color, { roughness: 0.25, metalness: 0.35 }), 0.16); body.position.y = 1.6;
    const glass = rbox(1.05, 1.9, 0.06, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.18 }), 0.03, false); glass.position.set(0, 1.6, 0.64);
    const mark = labelPlane(letter, '#ffffff', null, 0.9, 0.9, 380, true); mark.position.set(0, 1.65, 0.64);
    const cap = rbox(1.45, 0.18, 1.45, std(0x23203f, { metalness: 0.5, roughness: 0.35 }), 0.08); cap.position.y = 2.9;
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), glow(color, 2.4)); beacon.position.y = 3.1;
    const tag = labelPlane(name, '#f2efff', null, 1.8, 0.42, 92); tag.position.set(0, 3.45, 0);
    g.add(base, body, glass, mark, cap, beacon, tag);
    g.position.set(x, 0, -0.6);
    return g;
  };
  const syncGroup = new THREE.Group();
  syncGroup.add(tower(-14.6, 0x13a4d8, 'X', 'XERO'), tower(-9.2, 0x8b6cff, 'F', 'FACILIO'));
  const syncSign = labelPlane('⇄  TWO-WAY SYNC', '#38d9f5', null, 3, 0.45, 70, true);
  syncSign.position.set(-11.9, 3.15, -0.6);
  syncGroup.add(syncSign);
  scene.add(syncGroup);
  flow(new THREE.Vector3(-13.9, 2.25, -0.6), new THREE.Vector3(-9.9, 2.25, -0.6), 0x38d9f5, 3, 0.45);
  flow(new THREE.Vector3(-9.9, 1.45, -0.6), new THREE.Vector3(-13.9, 1.45, -0.6), 0xff4d8d, 3, 0.45);
  hotspot(syncGroup, { title: 'Xero ⇄ Facilio Integration', desc: 'Two-way sync · FacilioScript · OAuth 2.0', walkX: -8.2, open: 'xero' });

  /* ---------- desk with live code ---------- */
  const desk = new THREE.Group();
  const wood = std(0x6b5038, { roughness: 0.55, metalness: 0.05 });
  const top = rbox(3.1, 0.14, 1.45, wood, 0.05); top.position.y = 1.1;
  const legMat = std(0x2b2a3a, { metalness: 0.7, roughness: 0.3 });
  [[-1.4, -0.55], [1.4, -0.55], [-1.4, 0.55], [1.4, 0.55]].forEach(([x, z]) => {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.05, 10), legMat); l.position.set(x, 0.53, z); l.castShadow = true; desk.add(l);
  });
  const stand = rbox(0.12, 0.5, 0.12, legMat, 0.04); stand.position.set(0, 1.42, -0.38);
  const foot = rbox(0.5, 0.04, 0.3, legMat, 0.02); foot.position.set(0, 1.19, -0.38);
  const bezel = rbox(2.0, 1.15, 0.08, std(0x0c0b12, { roughness: 0.25, metalness: 0.4 }), 0.05); bezel.position.set(0, 2.17, -0.38);
  const screenTex = canvasTex(512, 280);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.88, 1.03), new THREE.MeshStandardMaterial({ map: screenTex, emissive: 0xffffff, emissiveMap: screenTex, emissiveIntensity: 0.85, roughness: 0.2 }));
  screen.position.set(0, 2.17, -0.33);
  const keyboard = rbox(1.15, 0.05, 0.36, std(0x24232f, { roughness: 0.4 }), 0.02); keyboard.position.set(0, 1.2, 0.25);
  const kbGlow = box(1.05, 0.01, 0.3, glow(0x8b6cff, 0.4), false); kbGlow.position.set(0, 1.23, 0.25);
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.11, 0.26, 18), std(0xff4d8d, { roughness: 0.3 })); mug.position.set(1.1, 1.3, 0.2); mug.castShadow = true;
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8), legMat); lamp.position.set(-1.2, 1.5, -0.4);
  const lampHead = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.22, 16, 1, true), std(0xffd23f, { side: THREE.DoubleSide, metalness: 0.3, roughness: 0.4 })); lampHead.position.set(-1.05, 1.85, -0.3); lampHead.rotation.z = -0.6;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), glow(0xfff1b8, 2.5)); bulb.position.set(-1.0, 1.78, -0.28);
  const chairSeat = rbox(0.7, 0.12, 0.7, std(0x1d1b2e, { roughness: 0.6 }), 0.06); chairSeat.position.set(0.9, 0.62, 1.1);
  const chairBack = rbox(0.7, 0.8, 0.1, std(0x1d1b2e, { roughness: 0.6 }), 0.06); chairBack.position.set(0.9, 1.05, 1.42);
  const chairPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.55, 8), legMat); chairPole.position.set(0.9, 0.3, 1.1);
  desk.add(top, stand, foot, bezel, screen, keyboard, kbGlow, mug, lamp, lampHead, bulb, chairSeat, chairBack, chairPole);
  desk.position.set(-4.4, 0, -0.5);
  scene.add(desk);
  hotspot(desk, { title: 'Implementation Engineer · Facilio', desc: 'FacilioScript · FSM · requirements → go-live', walkX: -2.4, open: 'facilio' });

  // live-typed FacilioScript
  const CODE = [
    ['#8b6cff', 'void autoAssign(Map wo) {'],
    ['#38d9f5', '  tech = findNearestTech(wo.site);'],
    ['#f2efff', '  wo.assignedTo = tech;'],
    ['#3ef08a', '  syncToXero(wo.invoice);'],
    ['#ffd23f', '  notifyClient(wo, "assigned ✓");'],
    ['#8b6cff', '}'],
  ];
  let typed = 0, typeT = 0, caret = true;
  const total = CODE.reduce((n, [, s]) => n + s.length, 0);
  const drawScreen = () => {
    const g = screenTex.userData.ctx, w = screenTex.userData.w, h = screenTex.userData.h;
    g.fillStyle = '#0b0a16'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#17132e'; g.fillRect(0, 0, w, 34);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(18 + i * 18, 17, 6, 0, 7); g.fill(); });
    g.fillStyle = '#a9a3cf'; g.font = font(18, 600); g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText('workorder.fs — FacilioScript', 82, 18);
    let left = typed, y = 60, lastX = 18, lastY = 60;
    g.font = font(22, 600);
    for (const [c, s] of CODE) {
      if (left <= 0) break;
      const part = s.slice(0, left);
      g.fillStyle = c; g.fillText(part, 18, y);
      lastX = 18 + g.measureText(part).width; lastY = y;
      left -= s.length; y += 34;
    }
    if (caret) { g.fillStyle = '#ffd23f'; g.fillRect(lastX + 2, lastY - 11, 11, 22); }
    screenTex.needsUpdate = true;
  };

  /* ---------- ETL pipeline ---------- */
  const etl = new THREE.Group();
  const node = (x, color, text, fg, w = 1.6) => {
    const g = new THREE.Group();
    const b = rbox(w, 1.05, 1.05, std(color, { roughness: 0.3, metalness: 0.3 }), 0.14); b.position.y = 0.55;
    const l = labelPlane(text, fg, null, w * 0.92, 0.5, 120); l.position.set(0, 0.55, 0.53);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), glow(0x3ef08a, 2)); led.position.set(w / 2 - 0.15, 0.95, 0.5);
    g.add(b, l, led); g.position.set(x, 0, -0.4);
    etl.add(g);
  };
  node(3.2, 0x3a3170, 'SOURCE', '#f2efff');
  node(6.0, 0x2fd17a, 'GO API', '#07140c');
  node(8.8, 0x2bbfdc, 'AIRBYTE', '#06161a', 1.7);
  const wh = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.36, 40), std(i % 2 ? 0xffb02e : 0xffd23f, { roughness: 0.22, metalness: 0.65 }));
    d.position.y = 0.2 + i * 0.42; d.castShadow = true; d.receiveShadow = true;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.79, 0.015, 6, 48), glow(0xfff1b8, 1.6)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.39 + i * 0.42;
    wh.add(d, ring);
  }
  const whTag = labelPlane('WAREHOUSE', '#f2efff', null, 2, 0.42, 92); whTag.position.set(0, 1.75, 0);
  wh.add(whTag); wh.position.set(11.6, 0, -0.4);
  etl.add(wh);
  const etlSign = labelPlane('ETL PIPELINE · VANIJ', '#ffd23f', null, 3.4, 0.45, 70, true); etlSign.position.set(7.4, 1.8, -0.4);
  etl.add(etlSign);
  scene.add(etl);
  [[4.0, 5.2], [6.8, 7.95], [9.65, 10.85]].forEach(([a, b]) => flow(new THREE.Vector3(a, 0.6, 0.2), new THREE.Vector3(b, 0.6, 0.2), 0xffd23f, 2, 0.7));
  hotspot(etl, { title: 'ETL Platform for Vanij', desc: 'Go API · Airbyte in Docker · self-service pipelines', walkX: 2.2, open: 'vanij' });

  /* ---------- Docker rack ---------- */
  const rack = new THREE.Group();
  const frame = rbox(1.45, 3, 1.15, std(0x1a2140, { roughness: 0.3, metalness: 0.6 }), 0.1); frame.position.y = 1.5;
  rack.add(frame);
  const leds = [];
  for (let r = 0; r < 6; r++) {
    const unit = rbox(1.22, 0.3, 0.06, std(0x2a3358, { roughness: 0.35, metalness: 0.5 }), 0.02, false);
    unit.position.set(0, 0.45 + r * 0.42, 0.58);
    rack.add(unit);
    for (let k = 0; k < 3; k++) {
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), glow(k === 0 ? 0x3ef08a : k === 1 ? 0x38d9f5 : 0xffd23f, 2));
      led.position.set(0.32 + k * 0.13, 0.45 + r * 0.42, 0.62);
      led.userData.phase = Math.random() * 10;
      rack.add(led); leds.push(led);
    }
    const vent = box(0.6, 0.04, 0.01, std(0x0c0f20), false); vent.position.set(-0.2, 0.45 + r * 0.42, 0.62); rack.add(vent);
  }
  const dockerTag = labelPlane('DOCKER', '#38d9f5', null, 1.6, 0.4, 100, true); dockerTag.position.set(0, 3.3, 0);
  rack.add(dockerTag);
  rack.position.set(14.6, 0, -0.7);
  scene.add(rack);
  hotspot(rack, { title: 'Docker · servers · deployment', desc: 'See the full skill inventory', walkX: 12.8, scrollTo: '#items' });

  /* ---------- floating skill blocks ---------- */
  const SKILLS = [
    ['GO', 0x2fd17a, '#07140c', 'Go'], ['VUE', 0x41b883, '#07140c', 'Vue.js'], ['JS', 0xf2c230, '#1a1400', 'JavaScript'],
    ['TS', 0x3178c6, '#ffffff', 'TypeScript'], ['PY', 0x4b8bbe, '#ffd23f', 'Python'], ['JAVA', 0xe76f00, '#ffffff', 'Java'],
    ['SQL', 0x8b6cff, '#ffffff', 'MySQL'], ['GIT', 0xf05033, '#ffffff', 'Git'],
  ];
  const skillBlocks = [];
  const xs = [-12.6, -7, -2.2, 1.8, 4.6, 7.4, 10.2, 13.4];
  SKILLS.forEach(([t, color, fg, name], i) => {
    const holder = new THREE.Group();
    const cube = rbox(0.86, 0.86, 0.86, std(color, { roughness: 0.3, metalness: 0.15, envMapIntensity: 0.6 }), 0.16);
    [[0, 0, 0.44, 0], [0, 0, -0.44, Math.PI], [0.44, 0, 0, Math.PI / 2], [-0.44, 0, 0, -Math.PI / 2]].forEach(([x, y, z, ry]) => {
      const l = labelPlane(t, fg, null, 0.74, 0.5, t.length > 3 ? 190 : 250); l.position.set(x, y, z); l.rotation.y = ry; cube.add(l);
    });
    cube.userData.skill = holder;
    holder.add(cube);
    holder.position.set(xs[i], 3.95 + (i % 2) * 0.55, 0.4);
    holder.userData = { phase: i * 0.8, baseY: holder.position.y, name, got: false, t: 0 };
    scene.add(holder);
    skillBlocks.push(holder);
  });
  let equipped = 0;

  /* ---------- the hero ---------- */
  const { hero, legL, legR, armL, armR, head } = makeHero();
  hero.scale.setScalar(1.4);
  scene.add(hero);
  const homeX = -1.6;
  let heroX = homeX, targetX = homeX, pending = null;
  hero.position.set(heroX, 0, 0.75);

  // hover ring on the floor
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.15, 48), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03;
  scene.add(ring);

  /* ---------- tooltip ---------- */
  const tip = document.createElement('div');
  tip.className = 'w3d-tip';
  tip.hidden = true;
  host.appendChild(tip);

  /* ---------- theme: night (dark) / day (light) ---------- */
  const applyTheme = () => {
    const light = isLight();
    scene.background = cssColor('--bg', light ? '#f3eee0' : '#0d0b1a');
    hemi.intensity = light ? 0.9 : 0.35;
    hemi.color.set(light ? 0xfff6e0 : 0xb9b2ff);
    key.intensity = light ? 1.3 : 1.0;
    renderer.toneMappingExposure = light ? 0.9 : 0.82;
    if (fx.bloom) { fx.bloom.strength = light ? 0.2 : 0.45; fx.bloom.threshold = light ? 0.92 : 0.88; }
  };
  applyTheme();

  /* ---------- camera ---------- */
  let camDist = 12, camX = 0, narrow = false;
  const fit = () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    fx.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    narrow = w < 700;
    const halfW = narrow ? 7.5 : 16.4;
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    camDist = Math.max(9, halfW / tanH);
    camX = narrow ? -2.6 : 0;
  };

  /* ---------- pointer ---------- */
  const mouse = new THREE.Vector2(), look = new THREE.Vector2();
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hovered = null, waveT = 0, running = false, runT = 0, lastAutoWave = 0;
  window.addEventListener('pointermove', (e) => { mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); }, { passive: true });

  const pick = (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(scene.children, true);
    for (const h of hits) {
      let o = h.object;
      while (o) {
        if (o.userData && o.userData.skill) return { skill: o.userData.skill };
        if (o.userData && o.userData.hotspot) return { spot: o };
        if (o === hero) return { hero: true };
        o = o.parent;
      }
    }
    return null;
  };
  const placeTip = (e, offY) => {
    const r = host.getBoundingClientRect();
    tip.style.transform = `translate(${Math.min(r.width - 260, Math.max(8, e.clientX - r.left + 14))}px, ${Math.max(8, e.clientY - r.top - offY)}px)`;
    tip.hidden = false;
  };

  renderer.domElement.addEventListener('pointermove', (e) => {
    const p = pick(e);
    hovered = p && p.spot ? p.spot : null;
    renderer.domElement.style.cursor = p ? 'pointer' : '';
    if (hovered) {
      const info = hovered.userData.hotspot;
      tip.innerHTML = `<b>${info.title}</b><span>${info.desc}</span><em>${info.open ? '▶ Click to open' : '▶ Click to explore'}</em>`;
      placeTip(e, 84);
    } else if (p && p.skill && !p.skill.userData.got) {
      tip.innerHTML = `<b>${p.skill.userData.name}</b><em>▶ Click to equip</em>`;
      placeTip(e, 60);
    } else tip.hidden = true;
    kick();
  });
  renderer.domElement.addEventListener('pointerleave', () => { hovered = null; tip.hidden = true; kick(); });

  const act = (info) => {
    if (info.open) {
      const card = document.querySelector(`[data-detail="${info.open}"]`);
      if (card) card.click();
    } else if (info.scrollTo) {
      const el = document.querySelector(info.scrollTo);
      if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    }
  };

  renderer.domElement.addEventListener('click', (e) => {
    const p = pick(e);
    if (!p) return;
    if (p.skill) {
      const s = p.skill;
      if (!s.userData.got) {
        s.userData.got = true; equipped++;
        if (window.SFX) window.SFX.play('coin');
        if (typeof Ach !== 'undefined') Ach.toast('🧩', 'SKILL EQUIPPED', s.userData.name, equipped === SKILLS.length ? 'All 8 skills equipped. Full loadout!' : `${equipped}/${SKILLS.length} skills equipped`);
      }
    } else if (p.hero) {
      waveT = 1.4; if (window.SFX) window.SFX.play('click');
    } else if (p.spot) {
      const info = p.spot.userData.hotspot;
      running = false;
      if (reduce) { heroX = info.walkX; act(info); }
      else { targetX = info.walkX; pending = info; if (window.SFX) window.SFX.play('hop'); }
    }
    kick();
  });

  const start = document.getElementById('press-start');
  if (start) start.addEventListener('click', () => { if (!reduce) { running = true; runT = 0; kick(); } });

  /* ---------- loop ---------- */
  let visible = false, raf = 0, last = performance.now(), time = 0;
  const perf = { n: 0, sum: 0, low: false };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  const v = new THREE.Vector3();
  const bb = new THREE.Box3();

  const loop = (now) => {
    raf = 0;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!document.hidden && dt > 0) {
      perf.n++; perf.sum += dt;
      if (perf.sum > 2) {
        if (perf.n / perf.sum < 24 && fx.bloom && !perf.low) { perf.low = true; fx.render = () => renderer.render(scene, camera); renderer.setPixelRatio(1); renderer.shadowMap.enabled = false; }
        perf.n = 0; perf.sum = 0;
      }
    }
    if (!reduce) time += dt;

    // packets with trails
    packets.forEach((p) => {
      if (!reduce) p.t = (p.t + dt * p.speed) % 1;
      p.parts.forEach((m, k) => {
        const tt = p.t - k * 0.035;
        m.visible = tt >= 0;
        m.position.lerpVectors(p.from, p.to, Math.max(0, tt));
        m.rotation.set(time * 2, time * 3, 0);
      });
    });
    leds.forEach((l) => { l.material.emissiveIntensity = reduce ? 2 : (Math.sin(time * 6 + l.userData.phase) > 0.2 ? 2.6 : 0.2); });

    // live typing on the monitor
    typeT += dt;
    if (typeT > 0.045 || reduce) {
      typeT = 0;
      typed = reduce ? total : typed + 1;
      if (typed > total + 40) typed = 0;
      caret = reduce || Math.floor(time * 2.5) % 2 === 0;
      drawScreen();
    }

    // skill blocks
    skillBlocks.forEach((s) => {
      const u = s.userData, cube = s.children[0];
      if (u.got) {
        u.t = Math.min(1, u.t + dt * 1.6);
        v.copy(hero.position); v.y += 2.4;
        s.position.lerp(v, u.t * 0.25 + 0.05);
        s.scale.setScalar(Math.max(0.001, 1 - u.t));
        s.visible = u.t < 1;
      } else {
        s.position.y = u.baseY + (reduce ? 0 : Math.sin(time * 1.8 + u.phase) * 0.18);
        cube.rotation.y = reduce ? 0.5 : time * 0.8 + u.phase;
        cube.rotation.x = reduce ? 0.25 : Math.sin(time * 0.7 + u.phase) * 0.3;
      }
    });

    // hover ring under the hovered object
    ring.material.opacity += ((hovered ? 0.85 : 0) - ring.material.opacity) * 0.2;
    if (hovered) {
      bb.setFromObject(hovered); bb.getCenter(v);
      ring.position.x += (v.x - ring.position.x) * 0.3; ring.position.z = 0.2;
      ring.scale.setScalar(Math.max(1.2, (bb.max.x - bb.min.x) / 2 + 0.2));
    }
    ring.rotation.z = time * 0.6;

    // the hero
    look.lerp(mouse, 0.08);
    head.rotation.y = look.x * 0.6;
    head.rotation.x = -look.y * 0.22;
    const walking = Math.abs(targetX - heroX) > 0.05;
    if (running) {
      runT += dt;
      const sw = Math.sin(runT * 16) * 0.9;
      legL.rotation.x = sw; legR.rotation.x = -sw; armL.rotation.x = -sw; armR.rotation.x = sw;
      hero.rotation.y = Math.PI / 2;
      hero.position.set(heroX + runT * 14, Math.abs(Math.sin(runT * 16)) * 0.15, 0.75);
      if (runT > 2.4) { running = false; hero.position.set(heroX, 0, 0.75); waveT = 1.4; }
    } else if (walking) {
      const dir = Math.sign(targetX - heroX);
      heroX += dir * Math.min(Math.abs(targetX - heroX), dt * 6);
      hero.rotation.y += (dir * Math.PI / 2 - hero.rotation.y) * 0.25;
      const sw = Math.sin(time * 14) * 0.8;
      legL.rotation.x = sw; legR.rotation.x = -sw; armL.rotation.x = -sw * 0.8; armR.rotation.x = sw * 0.8;
      hero.position.set(heroX, Math.abs(Math.sin(time * 14)) * 0.08, 0.75);
    } else {
      if (pending) { const info = pending; pending = null; waveT = 0.9; setTimeout(() => act(info), 250); }
      hero.rotation.y += ((look.x * 0.35 - 0.2) - hero.rotation.y) * 0.1;
      legL.rotation.x *= 0.8; legR.rotation.x *= 0.8;
      hero.position.set(heroX, reduce ? 0 : Math.abs(Math.sin(time * 1.6)) * 0.03, 0.75);
      if (waveT > 0) {
        waveT -= dt;
        armR.rotation.z = 2.6 + Math.sin(waveT * 14) * 0.35; armR.rotation.x = 0;
      } else {
        armR.rotation.z *= 0.85;
        const idle = reduce ? 0 : Math.sin(time * 2.2) * 0.06;
        armL.rotation.x = idle; armR.rotation.x = -idle;
      }
      if (!reduce && time - lastAutoWave > 8) { lastAutoWave = time; waveT = 1.4; }
    }

    // camera swings with scroll for depth and drifts with the pointer
    const r = host.getBoundingClientRect();
    const scrollP = Math.max(-1, Math.min(1, (r.top + r.height / 2 - innerHeight / 2) / innerHeight));
    const orbit = reduce ? 0 : scrollP * 0.32 + look.x * 0.06;
    const cx = camX + (narrow ? (heroX - homeX) * 0.6 : 0);
    camera.position.set(cx + Math.sin(orbit) * camDist, 2.7 + look.y * 0.3 - scrollP * 1.2, Math.cos(orbit) * camDist);
    camera.lookAt(cx, 1.9, 0);
    fx.render();

    const anim = !reduce || running || walking || waveT > 0 || pending || skillBlocks.some((s) => s.userData.got && s.visible);
    if (visible && anim) raf = requestAnimationFrame(loop);
  };

  fit();
  drawScreen();
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) { last = performance.now(); kick(); } }, { threshold: 0.01 }).observe(host);
  addEventListener('resize', () => { fit(); kick(); });
  addEventListener('scroll', () => { if (reduce) kick(); }, { passive: true });
  addEventListener('themechange', () => { applyTheme(); kick(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = performance.now(); kick(); } });
  if (reduce) window.addEventListener('pointermove', kick, { passive: true });
  if (!fine) tip.remove();
  kick();
};
// wait for the web font so the labels painted on objects use it
(document.fonts ? document.fonts.ready : Promise.resolve()).then(buildHeroWorld);
