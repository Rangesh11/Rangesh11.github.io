/* ==========================================================
   "Meet Rangesh" — an animated story about Rangesh, played like a video.
   Built live in three.js with the same character and world.
   Narration is pre-recorded (assets/voice/*.mp3, listed in
   assets/voice/script.js), so every visitor hears the same voice.
   One sentence is shown at a time, timed to the recording.
   ========================================================== */
(() => {
  const dlg = document.getElementById('cinema');
  const SCRIPT = window.INTRO_SCRIPT;
  if (!dlg || typeof dlg.showModal !== 'function' || !SCRIPT) return;

  const $ = (id) => document.getElementById(id);
  const stageEl = $('cin-stage'), chapterEl = $('cin-chapter'), ccEl = $('cin-cc');
  const ctaEl = $('cin-cta'), playBtn = $('cin-play'), voiceBtn = $('cin-voice'), ccBtn = $('cin-cc-btn');
  const progressEl = $('cin-progress'), timeEl = $('cin-time'), bigPlay = $('cin-big');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- timeline: every line gets its recorded length plus a short pause ---------- */
  const LINE_GAP = 0.18, SCENE_GAP = 0.45, LEAD_IN = 0.25;
  let clock = 0;
  const SCENES = SCRIPT.map((s) => {
    const start = clock;
    clock += LEAD_IN;
    const lines = s.lines.map((l, i) => {
      const line = Object.assign({}, l, { at: clock });
      clock += l.dur + (i < s.lines.length - 1 ? LINE_GAP : SCENE_GAP);
      return line;
    });
    return Object.assign({}, s, { start, end: clock, lines });
  });
  const TOTAL = clock;
  const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

  /* ---------- state ---------- */
  let voiceOn = true, ccOn = true, playing = false, t = 0, sceneIdx = -1, lineIdx = -1, built = false, world = null;
  const audio = new Audio();
  audio.preload = 'auto';

  // chapter segments in the progress bar
  const segs = SCENES.map((s, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'cinema__seg'; b.style.flexGrow = (s.end - s.start).toFixed(2);
    b.setAttribute('aria-label', `Chapter ${i + 1}: ${s.chapter}`);
    b.title = s.chapter;
    b.innerHTML = '<i></i>';
    b.addEventListener('click', () => seek(s.start + 0.01, true));
    progressEl.appendChild(b);
    return b;
  });

  const findScene = (time) => { for (let i = SCENES.length - 1; i >= 0; i--) if (time >= SCENES[i].start) return i; return 0; };
  const findLine = (s, time) => { for (let i = s.lines.length - 1; i >= 0; i--) if (time >= s.lines[i].at) return i; return -1; };

  const playLine = (line, offset = 0) => {
    if (!voiceOn || !playing) return;
    if (!audio.src.endsWith(line.src)) audio.src = line.src;
    try { audio.currentTime = Math.max(0, offset); } catch (e) { /* not seekable yet */ }
    const p = audio.play();
    if (p && p.catch) p.catch(() => { /* autoplay refused: captions still run */ });
  };
  const prefetch = (src) => { const a = new Audio(); a.preload = 'auto'; a.src = src; };

  const showLine = (s, li) => {
    if (li < 0) { ccEl.textContent = ''; return; }
    ccEl.textContent = s.lines[li].cc;
    ccEl.classList.remove('in'); void ccEl.offsetWidth; ccEl.classList.add('in');
    ccEl.hidden = !ccOn;
  };

  const enterScene = (i, jump) => {
    sceneIdx = i; lineIdx = -1;
    const s = SCENES[i];
    chapterEl.textContent = s.chapter;
    chapterEl.classList.remove('in'); void chapterEl.offsetWidth; chapterEl.classList.add('in');
    ccEl.textContent = '';
    ctaEl.hidden = s.id !== 'cta';
    if (world) world.enter(s.id, jump);
    const nxt = SCENES[i + 1];
    if (nxt) prefetch(nxt.lines[0].src);
  };

  /* advance the timeline */
  const advance = (dt) => {
    if (!playing) return;
    t = Math.min(TOTAL, t + dt);
    if (voiceOn && !audio.paused && sceneIdx >= 0 && lineIdx >= 0) {
      const l = SCENES[sceneIdx].lines[lineIdx];
      if (audio.src.endsWith(l.src) && audio.currentTime > 0) t = Math.min(TOTAL, l.at + audio.currentTime);
    }
    const si = findScene(t);
    if (si !== sceneIdx) enterScene(si, false);
    const s = SCENES[sceneIdx];
    const li = findLine(s, t);
    if (li !== lineIdx) {
      lineIdx = li;
      showLine(s, li);
      if (li >= 0) {
        playLine(s.lines[li]);
        const n = s.lines[li + 1]; if (n) prefetch(n.src);
      }
    }
    if (world) world.update(s.id, t - s.start, s.end - s.start);
    updateBar();
    if (t >= TOTAL) finish();
  };

  const updateBar = () => {
    SCENES.forEach((s, i) => {
      const f = Math.max(0, Math.min(1, (t - s.start) / (s.end - s.start)));
      segs[i].firstChild.style.width = (f * 100) + '%';
      segs[i].classList.toggle('is-on', i === sceneIdx);
    });
    timeEl.textContent = `${fmt(t)} / ${fmt(TOTAL)}`;
  };

  const setPlaying = (p) => {
    playing = p;
    playBtn.textContent = p ? '❚❚' : '▶';
    playBtn.setAttribute('aria-label', p ? 'Pause' : 'Play');
    bigPlay.hidden = p;
    if (!p) audio.pause();
    else if (voiceOn && sceneIdx >= 0 && lineIdx >= 0) {
      const line = SCENES[sceneIdx].lines[lineIdx];
      const off = t - line.at;
      if (off < line.dur) playLine(line, off);
    }
    if (p && world) world.kick();
  };

  const seek = (time, fromUser) => {
    audio.pause();
    t = Math.max(0, Math.min(TOTAL - 0.01, time));
    const si = findScene(t);
    enterScene(si, true);
    const s = SCENES[si];
    lineIdx = findLine(s, t);
    showLine(s, lineIdx);
    if (fromUser && !playing) setPlaying(true);
    else if (playing && lineIdx >= 0) { const l = s.lines[lineIdx]; if (t - l.at < l.dur) playLine(l, t - l.at); }
    updateBar();
  };

  const finish = () => {
    setPlaying(false);
    bigPlay.textContent = '↻'; bigPlay.setAttribute('aria-label', 'Replay');
    if (typeof Ach !== 'undefined') Ach.toast('🎬', 'STORY COMPLETE', 'Thanks for watching!', 'Ready to talk? Use the email button on screen.');
  };

  /* ---------- controls ---------- */
  playBtn.addEventListener('click', () => { if (t >= TOTAL) { bigPlay.textContent = '▶'; seek(0); } setPlaying(!playing); });
  bigPlay.addEventListener('click', () => { if (t >= TOTAL) { bigPlay.textContent = '▶'; seek(0); } setPlaying(true); });
  voiceBtn.addEventListener('click', () => {
    voiceOn = !voiceOn;
    voiceBtn.setAttribute('aria-pressed', String(voiceOn));
    voiceBtn.textContent = voiceOn ? '🔊 VOICE' : '🔇 VOICE';
    if (!voiceOn) audio.pause();
    else if (playing && lineIdx >= 0) { const l = SCENES[sceneIdx].lines[lineIdx]; if (t - l.at < l.dur) playLine(l, t - l.at); }
  });
  ccBtn.addEventListener('click', () => { ccOn = !ccOn; ccBtn.setAttribute('aria-pressed', String(ccOn)); ccEl.hidden = !ccOn; });
  const close = () => { setPlaying(false); audio.pause(); if (dlg.open) dlg.close(); };
  $('cin-close').addEventListener('click', close);
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  dlg.addEventListener('close', () => { document.documentElement.classList.remove('modal-open'); setPlaying(false); audio.pause(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && dlg.open && playing) setPlaying(false); });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === ' ' && !e.target.closest('button')) { e.preventDefault(); playBtn.click(); }
    if (e.key === 'ArrowRight') seek(SCENES[Math.min(SCENES.length - 1, sceneIdx + 1)].start + 0.01);
    if (e.key === 'ArrowLeft') seek(SCENES[Math.max(0, sceneIdx - 1)].start + 0.01);
  });

  const open = () => {
    dlg.showModal();
    document.documentElement.classList.add('modal-open');
    if (!built) { built = true; world = buildWorld(); }
    bigPlay.textContent = '▶';
    seek(0);
    setPlaying(true);
    // unlock audio during this click so the narration may play a moment later
    audio.src = SCENES[0].lines[0].src;
    audio.muted = true;
    const p = audio.play();
    const unmute = () => { audio.pause(); audio.currentTime = 0; audio.muted = false; };
    if (p && p.then) p.then(unmute, () => { audio.muted = false; }); else unmute();
  };
  document.querySelectorAll('[data-intro]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); open(); }));

  /* ==========================================================
     The 3D world for the story
     ========================================================== */
  function buildWorld() {
    if (typeof THREE === 'undefined' || !window.RS3D) {
      stageEl.classList.add('cinema__stage--flat');
      let last = performance.now();
      const loop = (now) => { const real = Math.min(1, (now - last) / 1000); last = now; advance(real); if (dlg.open) requestAnimationFrame(loop); };
      const kick = () => { last = performance.now(); requestAnimationFrame(loop); };
      kick();
      return { enter() {}, update() {}, kick };
    }
    const { std, glow, rbox, box, envFor, composerFor, makeHero } = window.RS3D;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    stageEl.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0b1a);
    scene.fog = new THREE.Fog(0x0d0b1a, 18, 42);
    scene.environment = envFor(renderer);
    const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 200);
    const fx = composerFor(renderer, scene, camera, { strength: 0.5, radius: 0.4, threshold: 0.85 });

    scene.add(new THREE.HemisphereLight(0xb9b2ff, 0x120e24, 0.45));
    const key = new THREE.DirectionalLight(0xfff4e6, 1.0);
    key.position.set(-6, 12, 9); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -12, right: 12, top: 10, bottom: -6, near: 1, far: 50 });
    scene.add(key); scene.add(key.target);
    const rim = new THREE.PointLight(0x38d9f5, 1.2, 18, 2); scene.add(rim);

    /* text on a plane, shrunk to fit */
    const font = (px) => `700 ${px}px "Chakra Petch", "Inter", sans-serif`;
    const label = (text, fg, w, h, px = 90, glowy = true) => {
      const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
      const g = c.getContext('2d');
      let size = px; g.font = font(size);
      while (size > 12 && (g.measureText(text).width > c.width * 0.92 || size > c.height * 0.86)) { size -= 4; g.font = font(size); }
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, c.width / 2, c.height / 2 + 3);
      const tx = new THREE.CanvasTexture(c); tx.encoding = THREE.sRGBEncoding;
      return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tx, transparent: true, emissive: glowy ? 0xffffff : 0, emissiveMap: glowy ? tx : null, emissiveIntensity: glowy ? 0.8 : 0 }));
    };
    const place = (m, x, y, z) => { m.position.set(x, y, z); scene.add(m); return m; };

    /* ground: one long circuit board through every set */
    place(rbox(180, 0.5, 6, std(0x141833, { roughness: 0.32, metalness: 0.55 }), 0.18), 78, -0.25, -0.5);
    for (let i = 0; i < 60; i++) {
      const col = [0x38d9f5, 0x3ef08a, 0x8b6cff][i % 3];
      place(box(1.5 + Math.random() * 4, 0.03, 0.05, glow(col, 0.9), false), -8 + Math.random() * 172, 0.015, -3 + Math.random() * 5);
    }
    const sparks = [];
    for (let i = 0; i < 110; i++) {
      const s = place(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), new THREE.MeshBasicMaterial({ color: i % 3 ? 0xffd23f : 0x38d9f5 })), -6 + Math.random() * 170, 0.5 + Math.random() * 6, -4 + Math.random() * 3);
      s.userData.p = Math.random() * 6; sparks.push(s);
    }

    /* SET · hello (x 0) */
    place(label("HI, I'M RANGESH", '#ffd23f', 6, 0.9, 120), 0, 3.6, -1.5);
    const ringHello = place(new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.04, 8, 64), glow(0x8b6cff, 1.6)), 0, 0.05, 0.6); ringHello.rotation.x = Math.PI / 2;

    /* SET · education (x 110) */
    const books = [[0xff4d8d, 0.22], [0x38d9f5, 0.2], [0xffd23f, 0.24], [0x8b6cff, 0.2]];
    let by = 0.1;
    books.forEach(([c, h], i) => { const b = place(rbox(1.5 - i * 0.08, h, 1.0, std(c, { roughness: 0.6 }), 0.04), 108.2 + (i % 2) * 0.06, by + h / 2, -0.6); b.rotation.y = (i - 1.5) * 0.06; by += h; });
    const capTop = place(rbox(1.3, 0.06, 1.3, std(0x16131f, { roughness: 0.5 }), 0.02), 108.25, by + 0.35, -0.6); capTop.rotation.y = 0.5;
    place(new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.3, 24), std(0x16131f, { roughness: 0.5 })), 108.25, by + 0.17, -0.6);
    const tassel = place(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), glow(0xffd23f, 1)), 108.8, by + 0.15, -0.3);
    place(label('B.E. CSE · 2022 – 2026', '#f2efff', 4.2, 0.55, 90, false), 110.2, 3.55, -1.2);
    place(label('CGPA 8.49', '#ffd23f', 2.6, 0.7, 110), 110.2, 2.85, -1.2);
    place(label('SRI ESHWAR COLLEGE OF ENGINEERING', '#a9a3cf', 4.4, 0.38, 70, false), 110.2, 2.3, -1.2);
    const lcBadge = place(rbox(1.4, 0.8, 0.2, std(0xffa116, { roughness: 0.35, metalness: 0.4 }), 0.08), 112.6, 1.1, -0.6);
    place(label('350+', '#1a1100', 1.2, 0.5, 120, false), 112.6, 1.12, -0.49);

    /* SET · internship: Connect (x 124) */
    const hub = place(new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 20), std(0xff4d8d, { roughness: 0.3, metalness: 0.2, emissive: 0xff4d8d, emissiveIntensity: 0.25 })), 125, 2.1, -0.8);
    place(label('CONNECT', '#ffffff', 1.5, 0.35, 90), 125, 2.1, -0.24);
    const peers = [['STUDENTS', -2, 3.2], ['ALUMNI', 2, 3.2], ['FACULTY', -2.2, 1.0], ['POSTS', 2.2, 1.0]].map(([n, dx, y]) => {
      const p = place(new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), std(0x38d9f5, { roughness: 0.35 })), 125 + dx, y, -0.8);
      place(label(n, '#f2efff', 1.5, 0.3, 80, false), 125 + dx, y - 0.48, -0.75);
      const from = new THREE.Vector3(125, 2.1, -0.8), to = new THREE.Vector3(125 + dx, y, -0.8);
      const link = place(box(from.distanceTo(to), 0.03, 0.03, glow(0x38d9f5, 0.7), false), 0, 0, 0);
      link.position.copy(from).lerp(to, 0.5); link.lookAt(to); link.rotateY(Math.PI / 2);
      return p;
    });
    place(label('THISUX INTERNSHIP · 2024', '#ffd23f', 4.4, 0.55, 90), 125, 4.2, -1.2);
    place(label('MongoDB · Express · React · Node', '#a9a3cf', 4.2, 0.4, 70, false), 125, 0.35, 0.4).rotation.x = -0.4;

    /* SET · desk (x 11) */
    const desk = new THREE.Group();
    const legMat = std(0x2b2a3a, { metalness: 0.7, roughness: 0.3 });
    const top = rbox(3.1, 0.14, 1.45, std(0x6b5038, { roughness: 0.55 }), 0.05); top.position.y = 1.1; desk.add(top);
    [[-1.4, -0.55], [1.4, -0.55], [-1.4, 0.55], [1.4, 0.55]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.05, 10), legMat); l.position.set(x, 0.53, z); desk.add(l); });
    const bezel = rbox(2.0, 1.15, 0.08, std(0x0c0b12, { roughness: 0.25, metalness: 0.4 }), 0.05); bezel.position.set(0, 2.17, -0.38); desk.add(bezel);
    const scr = document.createElement('canvas'); scr.width = 512; scr.height = 280;
    const scrTex = new THREE.CanvasTexture(scr); scrTex.encoding = THREE.sRGBEncoding;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.88, 1.03), new THREE.MeshStandardMaterial({ map: scrTex, emissive: 0xffffff, emissiveMap: scrTex, emissiveIntensity: 0.7 }));
    screen.position.set(0, 2.17, -0.33); desk.add(screen);
    const stand = rbox(0.12, 0.5, 0.12, legMat, 0.04); stand.position.set(0, 1.42, -0.38); desk.add(stand);
    const kb = rbox(1.15, 0.05, 0.36, std(0x24232f), 0.02); kb.position.set(0, 1.2, 0.25); desk.add(kb);
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.11, 0.26, 18), std(0xff4d8d, { roughness: 0.3 })); mug.position.set(1.1, 1.3, 0.2); desk.add(mug);
    desk.position.set(11, 0, -0.6); scene.add(desk);
    place(label('FACILIO · FSM APPS', '#8b6cff', 4, 0.6, 90), 11, 3.4, -1);
    const CODE = [['#8b6cff', 'void autoAssign(Map wo) {'], ['#38d9f5', '  tech = findNearestTech(wo);'], ['#f2efff', '  wo.assignedTo = tech;'], ['#3ef08a', '  syncToXero(wo.invoice);'], ['#ffd23f', '  notifyClient(wo, "✓");'], ['#8b6cff', '}']];
    const drawScreen = (n) => {
      const g = scr.getContext('2d');
      g.fillStyle = '#0b0a16'; g.fillRect(0, 0, 512, 280);
      g.fillStyle = '#17132e'; g.fillRect(0, 0, 512, 34);
      g.fillStyle = '#a9a3cf'; g.font = '600 18px "Chakra Petch", sans-serif'; g.textBaseline = 'middle'; g.fillText('workorder.fs — FacilioScript', 16, 18);
      g.font = '600 22px "Chakra Petch", sans-serif';
      let left = n, y = 60;
      for (const [c, s] of CODE) { if (left <= 0) break; g.fillStyle = c; g.fillText(s.slice(0, left), 18, y); left -= s.length; y += 34; }
      scrTex.needsUpdate = true;
    };
    drawScreen(0);

    /* SET · FSM client project (x 138) */
    const PH = ['BRD', 'CONFIG', 'SCRIPTS', 'GO-LIVE'];
    const bars = PH.map((n, i) => {
      const b = place(rbox(1.0, 1, 0.8, std([0x8b6cff, 0x38d9f5, 0x2fd17a, 0xffd23f][i], { roughness: 0.35, metalness: 0.2 }), 0.08), 135.6 + i * 1.5, 0.5, -0.6);
      b.userData.h = 0.9 + i * 0.55;
      place(label(n, '#f2efff', 1.3, 0.3, 80, false), 135.6 + i * 1.5, -0.05, 0.05).rotation.x = -0.35;
      return b;
    });
    const checks = PH.map((n, i) => { const c = place(label('✓', '#3ef08a', 0.6, 0.6, 300), 135.6 + i * 1.5, 0, -0.18); c.visible = false; return c; });
    place(label('FSM CUSTOMISATION · 8 MONTHS', '#ffd23f', 5, 0.6, 90), 137.9, 4.3, -1.2);
    place(label('SOLE OWNER', '#3ef08a', 2.8, 0.5, 90), 137.9, 3.65, -1.2);

    /* SET · delivery run islands (x 21 → 33) */
    const STEPS = ['REQUIREMENTS', 'DESIGN', 'BUILD', 'TEST', 'GO-LIVE'];
    const islands = STEPS.map((name, i) => {
      const g = new THREE.Group();
      const topI = rbox(1.9, 0.36, 1.9, std(0x2b2550, { roughness: 0.6, envMapIntensity: 0.5 }), 0.12);
      const soil = rbox(1.6, 0.6, 1.6, std(0x3a2a22, { roughness: 0.95 }), 0.08); soil.position.y = -0.48;
      const tag = label(name, '#f2efff', 2.2, 0.42, 80, false); tag.position.set(0, -0.42, 0.85);
      g.add(topI, soil, tag);
      g.position.set(21 + i * 3, 0.9 + (i % 2) * 0.35, -0.2);
      g.userData.top = topI;
      scene.add(g);
      return g;
    });
    const flag = place(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.36, 0.04), glow(0xff4d8d, 0.6)), 33.3, 3.0, -0.6);
    place(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 8), std(0xdddddd, { metalness: 0.5 })), 33, 2.3, -0.6);
    place(label('ONE OWNER · END TO END', '#ffd23f', 6, 0.7, 100), 27, 4.1, -1.2);

    /* SET · Xero ⇄ Facilio (x 45) */
    const packets = [];
    const flow = (from, to, color, n, speed) => {
      for (let i = 0; i < n; i++) packets.push({ p: place(rbox(0.22, 0.22, 0.22, glow(color, 2), 0.05, false), 0, 0, 0), from, to, t: i / n, speed });
    };
    const tower = (x, color, letter, name) => {
      const g = new THREE.Group();
      const body = rbox(1.25, 2.4, 1.25, std(color, { roughness: 0.25, metalness: 0.35 }), 0.16); body.position.y = 1.4;
      const mark = label(letter, '#ffffff', 0.9, 0.9, 380); mark.position.set(0, 1.45, 0.64);
      const tag = label(name, '#f2efff', 1.8, 0.42, 90, false); tag.position.set(0, 2.95, 0);
      g.add(body, mark, tag); g.position.set(x, 0, -0.6); scene.add(g);
    };
    tower(42.5, 0x13a4d8, 'X', 'XERO'); tower(47.5, 0x8b6cff, 'F', 'FACILIO');
    flow(new THREE.Vector3(43.2, 2, -0.6), new THREE.Vector3(46.8, 2, -0.6), 0x38d9f5, 3, 0.5);
    flow(new THREE.Vector3(46.8, 1.3, -0.6), new THREE.Vector3(43.2, 1.3, -0.6), 0xff4d8d, 3, 0.5);
    place(label('⇄ TWO-WAY SYNC', '#38d9f5', 3.4, 0.55, 90), 45, 3.6, -0.6);

    /* SET · Vanij ETL (x 58) */
    const node = (x, color, text, fg) => {
      place(rbox(1.6, 1.05, 1.05, std(color, { roughness: 0.3, metalness: 0.3 }), 0.14), x, 0.55, -0.5);
      place(label(text, fg, 1.45, 0.5, 120, false), x, 0.55, 0.03);
    };
    node(54, 0x3a3170, 'SOURCE', '#f2efff'); node(57, 0x2fd17a, 'GO API', '#07140c'); node(60, 0x2bbfdc, 'AIRBYTE', '#06161a');
    for (let i = 0; i < 3; i++) { const d = place(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.36, 36), std(i % 2 ? 0xffb02e : 0xffd23f, { roughness: 0.22, metalness: 0.65 })), 63, 0.2 + i * 0.42, -0.5); d.castShadow = true; }
    [[54.8, 56.2], [57.8, 59.2], [60.8, 62.2]].forEach(([a, b]) => flow(new THREE.Vector3(a, 0.6, 0.1), new THREE.Vector3(b, 0.6, 0.1), 0xffd23f, 2, 0.8));
    place(label('ETL PIPELINE · VANIJ', '#ffd23f', 4.2, 0.6, 90), 58.5, 2.6, -0.8);

    /* SET · skills orbit (x 74) */
    const SK = [['FS', 0x8b6cff], ['GO', 0x2fd17a], ['VUE', 0x41b883], ['REACT', 0x38d9f5], ['NODE', 0x6cc24a], ['PY', 0x4b8bbe], ['JAVA', 0xe76f00], ['SQL', 0x8b6cff], ['MONGO', 0x47a248], ['DOCKER', 0x2496ed]];
    const skillCubes = SK.map(([tx, c]) => {
      const cube = rbox(0.62, 0.62, 0.62, std(c, { roughness: 0.3, metalness: 0.15, envMapIntensity: 0.6 }), 0.12);
      [[0, 0, 0.32, 0], [0, 0, -0.32, Math.PI], [0.32, 0, 0, Math.PI / 2], [-0.32, 0, 0, -Math.PI / 2]].forEach(([x, y, z, ry]) => {
        const l = label(tx, '#ffffff', 0.54, 0.36, 200, false); l.position.set(x, y, z); l.rotation.y = ry; cube.add(l);
      });
      scene.add(cube);
      return cube;
    });
    place(label('MY TOOLKIT', '#38d9f5', 3, 0.6, 100), 74, 4.2, -1.2);

    /* SET · trophies (x 86) */
    const gold = std(0xffc83d, { metalness: 0.9, roughness: 0.22 });
    const cup = (x, scale = 1, mat = gold) => {
      const pts = [[0, 0], [0.32, 0], [0.32, 0.06], [0.1, 0.12], [0.08, 0.5], [0.14, 0.58], [0.34, 0.75], [0.4, 1.15], [0.37, 1.18]].map(([a, b]) => new THREE.Vector2(a, b));
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), mat); body.castShadow = true;
      const handleL = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 8, 20, Math.PI), mat); handleL.position.set(-0.42, 0.95, 0); handleL.rotation.z = Math.PI / 2;
      const handleR = handleL.clone(); handleR.position.x = 0.42; handleR.rotation.z = -Math.PI / 2;
      const ped = rbox(0.9, 0.9, 0.9, std(0x23203f, { metalness: 0.4, roughness: 0.35 }), 0.08); ped.position.y = -0.45;
      g.add(body, handleL, handleR, ped);
      g.scale.setScalar(scale); g.position.set(x, 0.9 * scale, -0.8); scene.add(g);
      return g;
    };
    const cups = [cup(84.2, 1), cup(86, 1.15), cup(87.8, 1), cup(89.6, 0.9, std(0xcd7f32, { metalness: 0.85, roughness: 0.3 }))];
    place(label('LEETCODE 1650+ · JAVA · C++', '#ffd23f', 5, 0.55, 90), 86.9, 3.5, -0.8);

    /* SET · what you get (x 152) */
    const VALUES = [['1 POINT OF CONTACT', 0x8b6cff], ['CLEAR DOCUMENTS', 0x38d9f5], ['ALL THE WAY TO GO-LIVE', 0x3ef08a]];
    const valueBlocks = VALUES.map(([n, c], i) => {
      const b = place(rbox(2.2, 0.9, 0.9, std(c, { roughness: 0.3, metalness: 0.25 }), 0.12), 149.6 + i * 2.5, 0.45, -0.6);
      const l = label(n, '#0a0816', 2.0, 0.5, 90, false); l.position.set(0, 0, 0.46); b.add(l);
      b.userData.base = 0.45;
      return b;
    });
    place(label('WHAT YOU GET', '#ffd23f', 4, 0.7, 110), 152.1, 3.4, -1.2);

    /* SET · call to action (x 98) */
    const ctaRing = place(new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.06, 8, 80), glow(0x3ef08a, 1.8)), 98, 0.06, 0.6); ctaRing.rotation.x = Math.PI / 2;
    place(label("LET'S BUILD TOGETHER", '#3ef08a', 5.6, 0.8, 110), 98.6, 3.9, -1.2);
    const confetti = [];
    for (let i = 0; i < 60; i++) {
      const c = place(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.02), new THREE.MeshBasicMaterial({ color: [0xffd23f, 0x3ef08a, 0x38d9f5, 0xff4d8d][i % 4] })), 0, 0, 0);
      c.visible = false; confetti.push(c);
    }

    /* the hero */
    const { hero, legL, legR, armL, armR, head } = makeHero();
    hero.scale.setScalar(1.25);
    scene.add(hero);
    const H = { x: 0, y: 0, z: 0.6, tx: 0, wave: 0, cheer: 0, face: 0.3, hopFrom: null, hopTo: null, hopT: 1, hopIdx: -1 };

    /* camera rig */
    const cam = { x: 0, y: 2.2, z: 7, lx: 0, ly: 1.6 }, camT = Object.assign({}, cam);
    const SETS = {
      hello: { hx: 0, cam: [0, 2.0, 6.5, 0, 1.6] },
      edu: { hx: 106.2, cam: [110, 2.6, 8.6, 110, 1.9] },
      intern: { hx: 121.4, cam: [124.6, 2.7, 9.2, 124.6, 2.0] },
      desk: { hx: 13.2, cam: [12, 2.6, 7.5, 11.8, 1.8] },
      fsm: { hx: 133.4, cam: [137.4, 2.6, 9.0, 137.4, 1.8] },
      run: { hx: 21, cam: [27, 4.2, 12, 27, 1.6] },
      sync: { hx: 49.4, cam: [46, 2.8, 9.5, 46, 1.8] },
      etl: { hx: 52.2, cam: [57.8, 2.6, 10, 57.8, 1.2] },
      skills: { hx: 74, cam: [74, 2.4, 7.4, 74, 1.9] },
      awards: { hx: 83.0, cam: [86.2, 2.8, 9.2, 86.2, 1.6] },
      value: { hx: 147.2, cam: [151.2, 2.4, 8.6, 151.2, 1.5] },
      cta: { hx: 96.6, cam: [98, 2.0, 7.2, 98, 1.7] },
    };

    let cur = 'hello';
    const enter = (id, jump) => {
      const s = SETS[id];
      const far = Math.abs(s.hx - H.x) > 25;
      cur = id;
      H.tx = s.hx; H.hopT = 1; H.hopIdx = -1; H.cheer = 0;
      [camT.x, camT.y, camT.z, camT.lx, camT.ly] = s.cam;
      if (jump || reduce || far) { H.x = s.hx; H.y = 0; Object.assign(cam, camT); }
      if (id === 'hello' || id === 'cta' || id === 'value') H.wave = 2.2;
      if (id === 'run') { H.x = s.hx; H.y = islands[0].position.y + 0.18; islands.forEach((g) => g.userData.top.material.color.set(0x2b2550)); }
      if (id === 'fsm') { bars.forEach((b) => { b.scale.y = 0.05; }); checks.forEach((c) => { c.visible = false; }); }
      confetti.forEach((c) => { c.visible = id === 'cta'; if (c.visible) { c.position.set(98 + (Math.random() - 0.5) * 6, 6 + Math.random() * 4, -1 + Math.random() * 2); c.userData.v = 1.2 + Math.random() * 1.8; } });
    };

    const update = (id, st, dur) => {
      if (id === 'desk') drawScreen(Math.floor(st * 20));
      if (id === 'fsm') {
        bars.forEach((b, i) => {
          const f = Math.max(0, Math.min(1, (st - 1 - i * (dur - 3) / 4) / 1.4));
          b.scale.y = Math.max(0.05, f * b.userData.h);
          b.position.y = (b.scale.y) / 2;
          checks[i].visible = f >= 1;
          checks[i].position.y = b.scale.y + 0.45;
        });
      }
      if (id === 'run') {
        const per = dur / 5.4;
        const k = Math.min(4, Math.floor(st / per));
        if (k !== H.hopIdx && H.hopT >= 1) {
          const target = islands[k];
          if (Math.abs(H.x - target.position.x) > 0.1) {
            H.hopFrom = new THREE.Vector3(H.x, H.y, 0); H.hopTo = new THREE.Vector3(target.position.x, target.position.y + 0.18, 0); H.hopT = 0;
            if (typeof SFX !== 'undefined') SFX.play('hop');
          }
          H.hopIdx = k;
        }
        islands.forEach((g, i) => g.userData.top.material.color.set(i < k ? 0x8b6cff : i === k ? (k === 4 ? 0x3ef08a : 0xffd23f) : 0x2b2550));
        if (k === 4 && H.hopT >= 1 && H.cheer <= 0 && st > per * 4 + 1) H.cheer = 1.4;
      }
    };

    /* render loop */
    let last = performance.now(), time = 0, raf = 0;
    const fit = () => {
      const w = stageEl.clientWidth, h = stageEl.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false); fx.setSize(w, h);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    const v = new THREE.Vector3();
    const loop = (now) => {
      raf = 0;
      const real = Math.min(1, (now - last) / 1000); last = now;
      const dt = Math.min(0.1, real);
      advance(real);
      if (playing && !reduce) time += dt;

      if (cur === 'run' && H.hopT < 1 && H.hopFrom) {
        H.hopT = Math.min(1, H.hopT + dt / 0.6);
        v.lerpVectors(H.hopFrom, H.hopTo, H.hopT);
        H.x = v.x; H.y = v.y + Math.sin(Math.PI * H.hopT) * 1.3;
        const sw = Math.sin(H.hopT * Math.PI * 4) * 0.7;
        legL.rotation.x = sw; legR.rotation.x = -sw; armL.rotation.x = -sw; armR.rotation.x = sw;
        hero.rotation.y += (Math.PI / 2 - hero.rotation.y) * 0.3;
      } else if (Math.abs(H.tx - H.x) > 0.05 && cur !== 'run') {
        const dir = Math.sign(H.tx - H.x);
        H.x += dir * Math.min(Math.abs(H.tx - H.x), dt * Math.max(7, Math.abs(H.tx - H.x) * 2));
        H.y += (0 - H.y) * 0.2;
        const sw = Math.sin(time * 15) * 0.85;
        legL.rotation.x = sw; legR.rotation.x = -sw; armL.rotation.x = -sw; armR.rotation.x = sw;
        hero.rotation.y += (dir * Math.PI / 2 - hero.rotation.y) * 0.3;
      } else {
        if (cur !== 'run') H.y += (0 - H.y) * 0.2;
        legL.rotation.x *= 0.8; legR.rotation.x *= 0.8;
        hero.rotation.y += (H.face - hero.rotation.y) * 0.1;
        if (H.wave > 0) { H.wave -= dt; armR.rotation.z = 2.6 + Math.sin(H.wave * 14) * 0.35; armR.rotation.x = 0; }
        else { armR.rotation.z *= 0.85; const idle = Math.sin(time * 2.2) * 0.06; armL.rotation.x = idle; armR.rotation.x = -idle; }
        if (H.cheer > 0) { H.cheer -= dt; armL.rotation.z = -2.6; armR.rotation.z = 2.6; } else { armL.rotation.z *= 0.85; }
        if (cur === 'desk') { armL.rotation.x = -0.9 + Math.sin(time * 18) * 0.12; armR.rotation.x = -0.9 + Math.cos(time * 18) * 0.12; hero.rotation.y += (-Math.PI / 2 - hero.rotation.y) * 0.1; }
        if (cur === 'fsm' || cur === 'edu' || cur === 'intern') { armR.rotation.z = Math.max(armR.rotation.z, 1.2 + Math.sin(time * 3) * 0.1); hero.rotation.y += (0.6 - hero.rotation.y) * 0.1; }
      }
      const bob = H.cheer > 0 ? Math.abs(Math.sin(time * 9)) * 0.4 : 0;
      hero.position.set(H.x, H.y + bob, cur === 'desk' ? 0.35 : H.z);
      head.rotation.y = Math.sin(time * 0.9) * 0.15;

      packets.forEach((p) => { if (playing) p.t = (p.t + dt * p.speed) % 1; p.p.position.lerpVectors(p.from, p.to, p.t); p.p.rotation.set(time * 2, time * 3, 0); });
      sparks.forEach((s) => { s.rotation.x = s.rotation.y = time + s.userData.p; });
      ringHello.rotation.z = time; ctaRing.rotation.z = -time;
      hub.scale.setScalar(1 + Math.sin(time * 3) * 0.05);
      peers.forEach((p, i) => { p.position.y += Math.sin(time * 2 + i) * 0.002; });
      skillCubes.forEach((c, i) => {
        const a = time * 0.7 + (i / skillCubes.length) * Math.PI * 2;
        c.position.set(74 + Math.cos(a) * 2.1, 1.9 + Math.sin(a * 2) * 0.4, 0.5 + Math.sin(a) * 1.3);
        c.rotation.set(time * 0.6 + i, time * 0.8 + i, 0);
      });
      valueBlocks.forEach((b, i) => { b.position.y = b.userData.base + Math.abs(Math.sin(time * 1.6 + i)) * 0.12; });
      cups.forEach((c, i) => { c.children[0].rotation.y = time * 0.8 + i; });
      tassel.rotation.z = Math.sin(time * 2) * 0.3;
      lcBadge.rotation.y = Math.sin(time) * 0.25;
      flag.rotation.y = Math.sin(time * 3) * 0.3;
      confetti.forEach((c) => { if (!c.visible) return; c.position.y -= c.userData.v * dt; c.rotation.x += dt * 4; c.rotation.z += dt * 3; if (c.position.y < 0.1) c.position.y = 6 + Math.random() * 3; });

      const k = reduce ? 1 : Math.min(1, dt * 3);
      cam.x += (camT.x - cam.x) * k; cam.y += (camT.y - cam.y) * k; cam.z += (camT.z - cam.z) * k;
      cam.lx += (camT.lx - cam.lx) * k; cam.ly += (camT.ly - cam.ly) * k;
      const sway = reduce ? 0 : Math.sin(time * 0.35) * 0.55;
      camera.position.set(cam.x + sway, cam.y, cam.z);
      camera.lookAt(cam.lx, cam.ly, 0);
      key.position.set(cam.lx - 6, 12, 9); key.target.position.set(cam.lx, 0, 0);
      rim.position.set(cam.lx + 5, 4, 3);

      fx.render();
      if (dlg.open) raf = requestAnimationFrame(loop);
    };

    fit();
    addEventListener('resize', fit);
    dlg.addEventListener('close', () => { cancelAnimationFrame(raf); raf = 0; });
    const kick = () => { fit(); last = performance.now(); if (!raf) raf = requestAnimationFrame(loop); };
    kick();
    return { enter, update, kick };
  }
})();
