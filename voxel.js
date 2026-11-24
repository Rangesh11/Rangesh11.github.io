/* ==========================================================
   Shared 3D toolkit for the scenes (three.js r128)
   · rounded, bevelled boxes
   · a studio environment map for real reflections
   · a bloom (glow) composer with a safe fallback
   · the Rangesh character
   ========================================================== */
(() => {
  if (typeof THREE === 'undefined') return;

  const std = (color, extra = {}) =>
    new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.6, metalness: 0.05 }, extra));
  const glow = (color, intensity = 1) =>
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.35 });

  /* ---------- rounded box geometry (cached) ---------- */
  const geoCache = new Map();
  const roundedGeo = (w, h, d, r = 0.06, seg = 3) => {
    const key = [w, h, d, r, seg].join('|');
    if (geoCache.has(key)) return geoCache.get(key);
    r = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
    const s = new THREE.Shape();
    const x = -w / 2 + r, y = -h / 2 + r, iw = w - 2 * r, ih = h - 2 * r;
    s.moveTo(x, y - r);
    s.lineTo(x + iw, y - r); s.quadraticCurveTo(x + iw + r, y - r, x + iw + r, y);
    s.lineTo(x + iw + r, y + ih); s.quadraticCurveTo(x + iw + r, y + ih + r, x + iw, y + ih + r);
    s.lineTo(x, y + ih + r); s.quadraticCurveTo(x - r, y + ih + r, x - r, y + ih);
    s.lineTo(x - r, y); s.quadraticCurveTo(x - r, y - r, x, y - r);
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: true, bevelSegments: seg, steps: 1, bevelSize: r - 0.0001, bevelThickness: r, curveSegments: seg });
    g.center();
    g.computeVertexNormals();
    geoCache.set(key, g);
    return g;
  };
  const rbox = (w, h, d, mat, r = 0.06, cast = true) => {
    const m = new THREE.Mesh(roundedGeo(w, h, d, r), mat);
    m.castShadow = cast; m.receiveShadow = true;
    return m;
  };
  const box = (w, h, d, mat, cast = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.castShadow = cast; m.receiveShadow = true;
    return m;
  };
  const outline = (mesh, color = 0x05040c, opacity = 0.55) => {
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 30), new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
    mesh.add(e);
    return mesh;
  };

  /* ---------- studio environment for reflections ---------- */
  const envFor = (renderer) => {
    const pm = new THREE.PMREMGenerator(renderer);
    const room = new THREE.Scene();
    const shell = new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20), new THREE.MeshBasicMaterial({ color: 0x0e0c1c, side: THREE.BackSide }));
    room.add(shell);
    const panel = (color, w, h, pos, rot) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
      p.position.set(...pos); if (rot) p.rotation.set(...rot);
      room.add(p);
    };
    panel(0x9a96b0, 10, 4, [0, 5.8, 0], [Math.PI / 2, 0, 0]);   // soft top light
    panel(0x2f6f80, 4, 6, [-9.8, 1, -2], [0, Math.PI / 2, 0]); // cyan side
    panel(0x803450, 4, 6, [9.8, 1, 2], [0, -Math.PI / 2, 0]);  // pink side
    panel(0x7a6a40, 6, 2, [0, 2, -9.8]);                         // warm back
    const tex = pm.fromScene(room, 0.04).texture;
    pm.dispose();
    return tex;
  };

  /* ---------- bloom composer (falls back to a plain render) ---------- */
  const composerFor = (renderer, scene, camera, opts = {}) => {
    const ok = THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass;
    if (!ok) return { render: () => renderer.render(scene, camera), setSize: () => {}, bloom: null };
    const composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));
    const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), opts.strength ?? 0.8, opts.radius ?? 0.5, opts.threshold ?? 0.72);
    composer.addPass(bloom);
    return {
      bloom,
      render: () => composer.render(),
      setSize: (w, h) => { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); },
    };
  };

  /* ---------- theme helpers ---------- */
  const isLight = () => {
    const t = document.documentElement.dataset.theme;
    return t ? t === 'light' : window.matchMedia('(prefers-color-scheme: light)').matches;
  };
  const cssColor = (v, fb) => {
    try { return new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(v).trim() || fb); }
    catch (e) { return new THREE.Color(fb); }
  };

  /* ---------- the character: rounded "designer toy" Rangesh ---------- */
  const makeHero = () => {
    const hero = new THREE.Group();
    const skin = std(0x9a6542, { roughness: 0.65, envMapIntensity: 0.35 });
    const hair = std(0x0e0b12, { roughness: 0.45, metalness: 0.1 });
    const blazer = std(0x7b8292, { roughness: 0.9, envMapIntensity: 0.35 });
    const blazerDark = std(0x858c9b, { roughness: 0.85 });
    const shirt = std(0xe8e8ec, { roughness: 0.8, envMapIntensity: 0.4 });
    const pants = std(0x262a38, { roughness: 0.8 });
    const shoe = std(0x0b0b10, { roughness: 0.3, metalness: 0.2 });

    const legL = new THREE.Group(), legR = new THREE.Group();
    [legL, legR].forEach((leg, k) => {
      const l = rbox(0.22, 0.52, 0.24, pants, 0.07); l.position.y = -0.26;
      const s = rbox(0.25, 0.13, 0.34, shoe, 0.05); s.position.set(0, -0.53, 0.04);
      leg.add(l, s);
      leg.position.set(k ? 0.13 : -0.13, 0.62, 0);
      hero.add(leg);
    });

    const torso = rbox(0.64, 0.64, 0.38, blazer, 0.12); torso.position.y = 0.95;
    const shirtFront = rbox(0.17, 0.5, 0.04, shirt, 0.015, false); shirtFront.position.set(0, 0.99, 0.19);
    const collarL = rbox(0.1, 0.08, 0.04, shirt, 0.015, false); collarL.position.set(-0.07, 1.25, 0.19); collarL.rotation.z = 0.5;
    const collarR = collarL.clone(); collarR.position.x = 0.07; collarR.rotation.z = -0.5;
    const lapelL = rbox(0.08, 0.38, 0.03, blazerDark, 0.015, false); lapelL.position.set(-0.13, 1.03, 0.2); lapelL.rotation.z = -0.28;
    const lapelR = lapelL.clone(); lapelR.position.x = 0.13; lapelR.rotation.z = 0.28;
    const button = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), std(0x333340)); button.position.set(0, 0.8, 0.2);
    hero.add(torso, shirtFront, collarL, collarR, lapelL, lapelR, button);

    const armL = new THREE.Group(), armR = new THREE.Group();
    [armL, armR].forEach((arm, k) => {
      const a = rbox(0.18, 0.52, 0.22, blazer, 0.08); a.position.y = -0.24;
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), skin); h.position.y = -0.53; h.castShadow = true;
      arm.add(a, h);
      arm.position.set(k ? 0.42 : -0.42, 1.22, 0);
      hero.add(arm);
    });

    const head = new THREE.Group();
    const face = rbox(0.52, 0.52, 0.48, skin, 0.14);
    const ears = [-1, 1].map((sx) => { const e = rbox(0.06, 0.13, 0.09, skin, 0.03); e.position.set(sx * 0.27, 0.0, 0); return e; });
    const hairTop = rbox(0.58, 0.2, 0.54, hair, 0.08); hairTop.position.set(0, 0.29, -0.01);
    const hairQuiff = rbox(0.44, 0.15, 0.32, hair, 0.07); hairQuiff.position.set(0.05, 0.42, 0.07); hairQuiff.rotation.z = -0.08;
    const hairBack = rbox(0.58, 0.36, 0.14, hair, 0.06); hairBack.position.set(0, 0.08, -0.23);
    const hairSideL = rbox(0.08, 0.26, 0.42, hair, 0.03); hairSideL.position.set(-0.28, 0.13, -0.04);
    const hairSideR = hairSideL.clone(); hairSideR.position.x = 0.28;
    const eyeWhite = std(0xffffff, { roughness: 0.3 });
    const pupil = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.15, metalness: 0.2 });
    const eyes = [-0.115, 0.115].map((x) => {
      const g = new THREE.Group();
      const w = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), eyeWhite); w.scale.set(1, 0.8, 0.5);
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 8), pupil); p.position.z = 0.02; p.scale.set(1, 1, 0.6);
      g.add(w, p); g.position.set(x, 0.03, 0.235);
      return g;
    });
    const browMat = std(0x0e0b12, { roughness: 0.6 });
    const brows = [-0.115, 0.115].map((x, i) => { const b = rbox(0.12, 0.03, 0.03, browMat, 0.012, false); b.position.set(x, 0.12, 0.245); b.rotation.z = i ? -0.08 : 0.08; return b; });
    const nose = rbox(0.06, 0.09, 0.06, std(0xb87c52, { roughness: 0.55 }), 0.025, false); nose.position.set(0, -0.04, 0.25);
    const mouth = rbox(0.13, 0.025, 0.02, std(0x7a4a34), 0.01, false); mouth.position.set(0, -0.14, 0.242);
    const beard = rbox(0.4, 0.1, 0.04, std(0x2a1d18, { roughness: 0.9, transparent: true, opacity: 0.55 }), 0.03, false); beard.position.set(0, -0.2, 0.225);
    head.add(face, ...ears, hairTop, hairQuiff, hairBack, hairSideL, hairSideR, ...eyes, ...brows, nose, mouth, beard);
    head.position.y = 1.53;
    hero.add(head);

    return { hero, legL, legR, armL, armR, head };
  };

  window.RS3D = { std, glow, box, rbox, roundedGeo, outline, envFor, composerFor, isLight, cssColor, makeHero };
})();
