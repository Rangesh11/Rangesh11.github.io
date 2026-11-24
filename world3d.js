/* ==========================================================
   Delivery Run — 3D world (three.js)
   Five floating islands, a blocky Rangesh who hops between them.
   Falls back to the flat 2D map if WebGL or three.js is missing.
   ========================================================== */
(() => {
  const host = document.getElementById('world3d');
  const map = document.getElementById('map');
  if (!host || !map || typeof THREE === 'undefined') return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NAMES = ['Discover', 'Design', 'Build', 'Test', 'Go-live'];
  const ICONS = ['1', '2', '3', '4', '⚑'];

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) { return; }
  if (!renderer.getContext()) return;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  host.appendChild(renderer.domElement);
  map.classList.add('map--3d');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 2, 0.1, 200);

  /* ---------- theme colours ---------- */
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const col = (v, fb) => { try { return new THREE.Color(css(v) || fb); } catch (e) { return new THREE.Color(fb); } };
  let C = {};
  const readTheme = () => {
    C = {
      panel: col('--panel', '#17132e'), line: col('--line', '#3a3170'), yellow: col('--yellow', '#ffd23f'),
      purple: col('--purple', '#8b6cff'), green: col('--green', '#3ef08a'), pink: col('--pink', '#ff4d8d'),
      cyan: col('--cyan', '#38d9f5'), text: col('--text', '#f2efff'), ink: col('--ink', '#05040c'),
    };
  };
  readTheme();

  /* ---------- lights ---------- */
  const hemi = new THREE.HemisphereLight(0xcfc6ff, 0x1a1530, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0.95);
  sun.position.set(-6, 14, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 50 });
  sun.shadow.bias = -0.0008;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x38d9f5, 0.35);
  rim.position.set(8, 4, -10);
  scene.add(rim);

  // shadow catcher far below the islands
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.28 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -3.2;
  ground.receiveShadow = true;
  scene.add(ground);

  /* ---------- helpers ---------- */
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.75, metalness: 0.05 }, extra));
  const box = (w, h, d, mat, cast = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.castShadow = cast; m.receiveShadow = true;
    return m;
  };
  const outline = (mesh, color = 0x05040c) => {
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 }));
    mesh.add(e);
    return mesh;
  };
  const labelTexture = (txt, fg, bg) => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 14; g.strokeRect(7, 7, 242, 242);
    g.fillStyle = fg;
    g.font = '700 150px "Chakra Petch", "Inter", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(txt, 128, 140);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    return t;
  };

  /* ---------- islands ---------- */
  const islands = [];
  const world = new THREE.Group();
  scene.add(world);
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group();
    const top = outline(box(2.4, 0.42, 2.4, std(0x2b2550)));
    top.position.y = 0;
    const soil = box(2.05, 0.7, 2.05, std(0x3a2a22, { roughness: 0.95 }));
    soil.position.y = -0.56;
    const rock = box(1.4, 0.7, 1.4, std(0x2a1e18, { roughness: 1 }));
    rock.position.y = -1.2;
    const tip = box(0.7, 0.5, 0.7, std(0x22180f, { roughness: 1 }));
    tip.position.y = -1.7;
    // the level number painted on a block sitting on the island
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), [
      std(0x1b1630), std(0x1b1630), std(0x1b1630), std(0x1b1630), std(0x1b1630), std(0x1b1630),
    ]);
    sign.castShadow = true;
    sign.position.set(0.55, 0.66, -0.55);
    outline(sign);
    g.add(top, soil, rock, tip, sign);
    // small grass tufts / pebbles for life
    for (let k = 0; k < 4; k++) {
      const p = box(0.18, 0.12 + Math.random() * 0.1, 0.18, std(0x3ef08a, { roughness: 0.6 }));
      p.position.set(-0.9 + Math.random() * 0.5, 0.27, 0.4 + Math.random() * 0.5);
      g.add(p);
    }
    g.userData = { i, top, sign, phase: i * 1.3 };
    top.userData.island = i; sign.userData.island = i;
    world.add(g);
    islands.push(g);
  }

  // goal flag on the last island
  const pole = box(0.08, 1.8, 0.08, std(0xdddddd, { metalness: 0.4, roughness: 0.4 }));
  pole.position.set(-0.75, 1.1, -0.7);
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 0.04), std(0xff4d8d, { emissive: 0x401020 }));
  flag.position.set(-0.38, 1.75, -0.7);
  flag.castShadow = true;
  islands[4].add(pole, flag);

  // stepping stones between islands
  const stones = [];
  for (let i = 0; i < 4; i++) {
    for (let k = 1; k <= 3; k++) {
      const s = outline(box(0.36, 0.2, 0.36, std(0x3a3170)));
      s.userData = { seg: i, t: k / 4, phase: Math.random() * 6 };
      world.add(s);
      stones.push(s);
    }
  }

  // floating sparkles
  const sparkles = [];
  for (let i = 0; i < 26; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), new THREE.MeshBasicMaterial({ color: i % 3 ? 0xffd23f : 0x38d9f5 }));
    s.position.set((Math.random() - 0.5) * 22, Math.random() * 5 - 0.5, (Math.random() - 0.5) * 8);
    s.userData.phase = Math.random() * 6;
    scene.add(s);
    sparkles.push(s);
  }

  /* ---------- the hero: blocky Rangesh ---------- */
  const hero = new THREE.Group();
  const skin = std(0xc68a5e, { roughness: 0.6 });
  const hair = std(0x15101c, { roughness: 0.5 });
  const blazer = std(0x9aa1b0, { roughness: 0.7 });
  const shirt = std(0xf4f4f4, { roughness: 0.6 });
  const pants = std(0x262a38, { roughness: 0.8 });
  const shoe = std(0x0b0b10, { roughness: 0.5 });

  const legL = new THREE.Group(), legR = new THREE.Group();
  [legL, legR].forEach((leg, k) => {
    const l = box(0.22, 0.5, 0.24, pants); l.position.y = -0.25;
    const s = box(0.24, 0.12, 0.32, shoe); s.position.set(0, -0.52, 0.04);
    leg.add(l, s);
    leg.position.set(k ? 0.13 : -0.13, 0.62, 0);
    hero.add(leg);
  });
  const torso = box(0.62, 0.62, 0.36, blazer); torso.position.y = 0.94;
  const shirtFront = box(0.18, 0.5, 0.02, shirt, false); shirtFront.position.set(0, 0.97, 0.185);
  hero.add(torso, shirtFront);
  const armL = new THREE.Group(), armR = new THREE.Group();
  [armL, armR].forEach((arm, k) => {
    const a = box(0.18, 0.5, 0.22, blazer); a.position.y = -0.24;
    const h = box(0.16, 0.12, 0.18, skin); h.position.y = -0.53;
    arm.add(a, h);
    arm.position.set(k ? 0.41 : -0.41, 1.22, 0);
    hero.add(arm);
  });
  const head = new THREE.Group();
  const face = box(0.52, 0.5, 0.48, skin);
  const hairTop = box(0.58, 0.2, 0.54, hair); hairTop.position.set(0, 0.3, -0.01);
  const hairQuiff = box(0.42, 0.12, 0.3, hair); hairQuiff.position.set(0.04, 0.43, 0.08);
  const hairBack = box(0.58, 0.36, 0.12, hair); hairBack.position.set(0, 0.08, -0.24);
  const hairSideL = box(0.08, 0.26, 0.4, hair); hairSideL.position.set(-0.29, 0.12, -0.04);
  const hairSideR = hairSideL.clone(); hairSideR.position.x = 0.29;
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111018 });
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.02), eyeMat); eyeL.position.set(-0.12, 0.03, 0.245);
  const eyeR = eyeL.clone(); eyeR.position.x = 0.12;
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.03, 0.02), eyeMat);
  const browL = brow.clone(); browL.position.set(-0.12, 0.12, 0.245);
  const browR = brow.clone(); browR.position.set(0.12, 0.12, 0.245);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 0.02), new THREE.MeshBasicMaterial({ color: 0x7a4a34 }));
  mouth.position.set(0, -0.13, 0.245);
  head.add(face, hairTop, hairQuiff, hairBack, hairSideL, hairSideR, eyeL, eyeR, browL, browR, mouth);
  head.position.y = 1.52;
  hero.add(head);
  hero.scale.setScalar(0.95);
  scene.add(hero);

  // soft blob shadow helper ring under the current island
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.45, 1.62, 40), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);

  /* ---------- labels (HTML, follow the islands) ---------- */
  const labelsEl = document.getElementById('world3d-labels');
  const labels = NAMES.map((n, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'w3d-label';
    b.innerHTML = '<span>' + (i < 4 ? 'LV ' + (i + 1) : 'GOAL') + '</span>' + n;
    b.addEventListener('click', () => window.goLevel && window.goLevel(i));
    labelsEl.appendChild(b);
    return b;
  });

  /* ---------- layout: wide row on desktop, zig-zag column on phones ---------- */
  let layoutWide = null;
  const positions = [];
  const layout = (wide) => {
    layoutWide = wide;
    const P = wide
      ? [[-8.4, 0, 0.6], [-4.2, 0.3, -0.9], [0, 0, 0.5], [4.2, 0.3, -0.9], [8.4, 0.2, 0.4]]
      : [[-1.5, 0, -8], [1.5, 0.2, -4], [-1.5, 0, 0], [1.5, 0.2, 4], [0, 0.2, 8]];
    positions.length = 0;
    islands.forEach((g, i) => { g.position.set(P[i][0], P[i][1], P[i][2]); positions.push(new THREE.Vector3(...P[i])); });
    stones.forEach((s) => {
      const a = positions[s.userData.seg], b = positions[s.userData.seg + 1];
      s.userData.base = a.clone().lerp(b, s.userData.t);
      s.position.copy(s.userData.base);
    });
  };

  /* ---------- camera framing ---------- */
  let yaw = 0, pitchOffset = 0, dragYaw = 0, dragging = false, lastX = 0;
  const frame = () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const wide = w / h > 1.25;
    if (wide !== layoutWide) layout(wide);
    camera.fov = wide ? 30 : 38;
    camera.updateProjectionMatrix();
  };
  const placeCamera = () => {
    const wide = layoutWide;
    const elev = wide ? 0.5 : 0.95;
    // fit the islands' real width and height into the view
    const halfW = wide ? 10.4 : 3.6;
    const halfH = wide ? 3.4 : 9.4 * Math.sin(elev) + 2.4;
    const v = THREE.MathUtils.degToRad(camera.fov / 2);
    const hfov = Math.atan(Math.tan(v) * camera.aspect);
    const dist = Math.max(halfW / Math.tan(hfov), halfH / Math.tan(v)) + 2;
    const a = yaw + dragYaw;
    camera.position.set(Math.sin(a) * dist * Math.cos(elev), Math.sin(elev) * dist + pitchOffset, Math.cos(a) * dist * Math.cos(elev));
    camera.lookAt(0, wide ? -0.2 : 0, 0);
  };

  /* ---------- level state & hero movement ---------- */
  let cur = typeof window.currentLevel === 'function' ? window.currentLevel() : 0;
  let from = null, to = null, moveT = 1, cheerT = 0;
  const heroPos = new THREE.Vector3();
  const standOn = (i) => positions[i].clone().add(new THREE.Vector3(-0.35, 0.21, 0.35));

  const paint = () => {
    islands.forEach((g, i) => {
      const done = i < cur, now = i === cur, goal = i === 4;
      const c = now ? (goal ? C.green : C.yellow) : done ? C.purple : new THREE.Color(0x2b2550);
      g.userData.top.material.color.copy(c);
      g.userData.top.material.emissive = now ? c.clone().multiplyScalar(0.18) : new THREE.Color(0);
      const fg = now ? '#0a0816' : '#ffffff';
      const bg = now ? '#' + (goal ? C.green : C.yellow).getHexString() : done ? '#' + C.purple.getHexString() : '#2b2550';
      const tex = labelTexture(done ? '✓' : ICONS[i], fg, bg);
      g.userData.sign.material.forEach((m) => { if (m.map) m.map.dispose(); m.map = tex; m.color.set(0xffffff); m.needsUpdate = true; });
      labels[i].classList.toggle('is-current', now);
      labels[i].classList.toggle('is-done', done);
    });
    stones.forEach((s) => s.material.color.copy(s.userData.seg < cur ? C.yellow : new THREE.Color(0x3a3170)));
  };

  document.addEventListener('levelchange', (e) => {
    const next = e.detail.index;
    if (next === cur && moveT >= 1) { paint(); return; }
    from = heroPos.clone();
    cur = next;
    to = standOn(cur);
    moveT = reduce || !e.detail.animate ? 1 : 0;
    if (moveT >= 1) heroPos.copy(to);
    if (cur === 4) cheerT = reduce ? 0 : 1.6;
    paint();
    kick();
  });

  /* ---------- picking: click an island ---------- */
  const ray = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let downX = 0, downY = 0;
  renderer.domElement.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; downX = e.clientX; downY = e.clientY;
    renderer.domElement.setPointerCapture(e.pointerId);
  });
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dragYaw = Math.max(-0.7, Math.min(0.7, dragYaw - (e.clientX - lastX) * 0.006));
    lastX = e.clientX;
    kick();
  });
  renderer.domElement.addEventListener('pointerup', (e) => {
    dragging = false;
    if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 6) return;
    const r = renderer.domElement.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(islands.flatMap((g) => [g.userData.top, g.userData.sign]), false)[0];
    if (hit && window.goLevel) window.goLevel(hit.object.userData.island);
  });

  /* ---------- render loop (only while visible) ---------- */
  const v3 = new THREE.Vector3();
  let visible = false, raf = 0, last = performance.now(), time = 0;
  const kick = () => { if (!raf && (visible || reduce)) raf = requestAnimationFrame(loop); };

  const loop = (now) => {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!reduce) time += dt;

    // gentle idle motion
    islands.forEach((g) => { g.position.y = positions[g.userData.i].y + (reduce ? 0 : Math.sin(time * 1.1 + g.userData.phase) * 0.12); });
    stones.forEach((s) => { s.position.y = s.userData.base.y - 0.05 + (reduce ? 0 : Math.sin(time * 2 + s.userData.phase) * 0.1); s.rotation.y = reduce ? 0 : time * 0.6 + s.userData.phase; });
    sparkles.forEach((s) => { s.position.y += reduce ? 0 : Math.sin(time + s.userData.phase) * 0.004; s.rotation.x = s.rotation.y = time + s.userData.phase; });
    flag.rotation.y = reduce ? 0 : Math.sin(time * 3) * 0.25;
    if (!dragging) dragYaw *= 0.96;
    yaw = reduce ? 0 : Math.sin(time * 0.18) * 0.16;

    // hero: hop between islands
    if (moveT < 1 && from && to) {
      moveT = Math.min(1, moveT + dt / 0.95);
      const t = moveT < 0.5 ? 2 * moveT * moveT : 1 - Math.pow(-2 * moveT + 2, 2) / 2;
      heroPos.lerpVectors(from, to, t);
      heroPos.y += Math.sin(Math.PI * moveT) * 1.6;
      const swing = Math.sin(moveT * Math.PI * 6) * 0.7;
      legL.rotation.x = swing; legR.rotation.x = -swing; armL.rotation.x = -swing; armR.rotation.x = swing;
      v3.subVectors(to, from); hero.rotation.y = Math.atan2(v3.x, v3.z);
    } else {
      legL.rotation.x = legR.rotation.x *= 0.8;
      const idle = reduce ? 0 : Math.sin(time * 2.2) * 0.06;
      armL.rotation.x = idle; armR.rotation.x = -idle;
      hero.rotation.y += (0.35 - hero.rotation.y) * 0.08; // face the camera
    }
    const isl = islands[cur];
    const bob = isl.position.y - positions[cur].y;
    hero.position.set(heroPos.x, heroPos.y + (moveT >= 1 ? bob : 0), heroPos.z);
    if (cheerT > 0 && moveT >= 1) {
      cheerT -= dt;
      hero.position.y += Math.abs(Math.sin(cheerT * 7)) * 0.5;
      armL.rotation.z = -2.6; armR.rotation.z = 2.6;
    } else { armL.rotation.z *= 0.85; armR.rotation.z *= 0.85; }
    head.rotation.y = reduce ? 0 : Math.sin(time * 0.9) * 0.15;

    ring.position.set(isl.position.x, isl.position.y + 0.22, isl.position.z);
    ring.rotation.z = reduce ? 0 : time * 0.8;
    ring.material.color.copy(cur === 4 ? C.green : C.yellow);

    placeCamera();
    renderer.render(scene, camera);

    // HTML labels follow their islands
    const w = host.clientWidth, h = host.clientHeight;
    islands.forEach((g, i) => {
      v3.copy(g.position); v3.y -= 2.25; v3.project(camera);
      labels[i].style.transform = `translate(${((v3.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v3.y) / 2 * h).toFixed(1)}px) translate(-50%, 0)`;
    });

    if (visible && !reduce) raf = requestAnimationFrame(loop);
    else if (moveT < 1 || dragging || Math.abs(dragYaw) > 0.001) raf = requestAnimationFrame(loop);
  };

  /* ---------- start ---------- */
  frame();
  layout(host.clientWidth / Math.max(1, host.clientHeight) > 1.25);
  heroPos.copy(standOn(cur));
  paint();
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) { last = performance.now(); kick(); } }, { threshold: 0.05 }).observe(host);
  addEventListener('resize', () => { frame(); heroPos.copy(moveT >= 1 ? standOn(cur) : heroPos); kick(); });
  addEventListener('themechange', () => { readTheme(); paint(); kick(); });
  if (document.fonts) document.fonts.ready.then(() => { paint(); kick(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = performance.now(); kick(); } });
  kick();
})();
