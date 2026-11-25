/* ==========================================================
   "Meet Rangesh" — a 1-minute animated intro, played like a video.
   Built live in three.js with the same character and world, narrated
   by the browser's own text-to-speech, with captions and chapters.
   ========================================================== */
(() => {
  const dlg = document.getElementById('cinema');
  if (!dlg || typeof dlg.showModal !== 'function') return;

  const $ = (id) => document.getElementById(id);
  const stageEl = $('cin-stage'), chapterEl = $('cin-chapter'), titleEl = $('cin-title'), ccEl = $('cin-cc');
  const ctaEl = $('cin-cta'), playBtn = $('cin-play'), voiceBtn = $('cin-voice'), ccBtn = $('cin-cc-btn');
  const progressEl = $('cin-progress'), timeEl = $('cin-time'), bigPlay = $('cin-big');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canSpeak = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

  /* ---------- the script ---------- */
  const SCENES = [
    { id: 'hello', chapter: '01 · HELLO', title: "Hi, I'm Rangesh S",
      say: "Hi! I'm Rangesh, a Project Implementation Engineer at Facilio." },
    { id: 'desk', chapter: '02 · WHAT I DO', title: 'Implementation Engineer · Facilio',
      say: 'I build Field Service Management apps on the Facilio platform, with FacilioScript and Vue.js.' },
    { id: 'run', chapter: '03 · HOW I WORK', title: 'One owner. End to end.',
      say: 'I own every project end to end. Requirements, design, build, testing, and go-live. One owner, zero handoffs.' },
    { id: 'sync', chapter: '04 · PROJECT', title: 'Xero ⇄ Facilio Integration',
      say: 'I built a two-way sync between Xero and Facilio, so finance and operations always match.' },
    { id: 'etl', chapter: '05 · PROJECT', title: 'ETL Platform for Vanij',
      say: 'And a self-service ETL platform for Vanij: a Go API on top of Airbyte, running in Docker.' },
    { id: 'skills', chapter: '06 · TOOLKIT', title: 'My toolkit',
      say: 'My toolkit: FacilioScript, Go, Vue.js, JavaScript, Python, Java and SQL.' },
    { id: 'awards', chapter: '07 · WINS', title: 'Wins & problem solving',
      say: "I've won first place at project expos and paper presentations, and I hold a LeetCode rating of over sixteen fifty." },
    { id: 'cta', chapter: '08 · LET’S TALK', title: "Let's build together",
      say: 'Need someone to own your next project from first call to go-live? Let’s talk!' },
  ];
  SCENES.forEach((s) => { s.min = Math.max(5.5, s.say.split(/\s+/).length / 2.5 + 1.2); });
  const TOTAL = SCENES.reduce((n, s) => n + s.min, 0);

  /* ---------- player state ---------- */
  let voiceOn = canSpeak, ccOn = true, playing = false, idx = 0, sceneT = 0, speechDone = true, built = false;
  let world = null;
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // chapter progress segments
  const segs = SCENES.map((s, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'cinema__seg'; b.style.flexGrow = s.min;
    b.setAttribute('aria-label', `Chapter ${i + 1}: ${s.title}`);
    b.innerHTML = '<i></i>';
    b.addEventListener('click', () => goScene(i, true));
    progressEl.appendChild(b);
    return b;
  });

  /* ---------- narration ---------- */
  let voice = null;
  const pickVoice = () => {
    if (!canSpeak) return;
    const vs = speechSynthesis.getVoices();
    const pref = [/en-IN/i, /Google UK English Male/i, /Daniel/i, /Google US English/i, /en-GB/i, /en-US/i, /^en/i];
    for (const p of pref) { const v = vs.find((x) => p.test(x.lang) || p.test(x.name)); if (v) { voice = v; return; } }
  };
  if (canSpeak) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  let utterId = 0;
  const speak = (text) => {
    if (!canSpeak) { speechDone = true; return; }
    speechSynthesis.cancel();
    if (!voiceOn) { speechDone = true; return; }
    speechDone = false;
    const id = ++utterId;
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.rate = 1; u.pitch = 1.02; u.volume = 1;
    u.onend = u.onerror = () => { if (id === utterId) speechDone = true; };
    speechSynthesis.speak(u);
    // safety: never wait forever on a voice that doesn't report "end"
    setTimeout(() => { if (id === utterId) speechDone = true; }, (text.length / 11 + 4) * 1000);
  };

  /* ---------- overlay text ---------- */
  const showText = (s) => {
    chapterEl.textContent = s.chapter;
    titleEl.textContent = s.title;
    ccEl.textContent = s.say;
    [chapterEl, titleEl, ccEl].forEach((el) => { el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); });
    ccEl.hidden = !ccOn;
    ctaEl.hidden = s.id !== 'cta';
  };

  const updateBar = () => {
    let elapsed = 0;
    SCENES.forEach((s, i) => {
      const f = i < idx ? 1 : i === idx ? Math.min(1, sceneT / s.min) : 0;
      segs[i].firstChild.style.width = (f * 100) + '%';
      segs[i].classList.toggle('is-on', i === idx);
      elapsed += s.min * f;
    });
    timeEl.textContent = `${fmt(elapsed)} / ${fmt(TOTAL)}`;
  };

  const setPlaying = (p) => {
    playing = p;
    playBtn.textContent = p ? '❚❚' : '▶';
    playBtn.setAttribute('aria-label', p ? 'Pause' : 'Play');
    bigPlay.hidden = p;
    if (canSpeak) { if (p) speechSynthesis.resume(); else speechSynthesis.pause(); }
    if (p && world) world.kick();
  };

  const goScene = (i, userJump = false) => {
    if (i >= SCENES.length) { // finished
      setPlaying(false);
      idx = SCENES.length - 1; sceneT = SCENES[idx].min;
      bigPlay.textContent = '↻'; bigPlay.setAttribute('aria-label', 'Replay');
      updateBar();
      if (typeof Ach !== 'undefined') Ach.toast('🎬', 'INTRO WATCHED', 'Thanks for watching!', 'Ready to talk? Email me from the screen.');
      return;
    }
    idx = i; sceneT = 0;
    const s = SCENES[i];
    showText(s);
    if (world) world.enter(s.id, userJump);
    speak(s.say);
    if (userJump && !playing) setPlaying(true);
    updateBar();
  };

  /* ---------- controls ---------- */
  playBtn.addEventListener('click', () => {
    if (!playing && idx === SCENES.length - 1 && sceneT >= SCENES[idx].min) { goScene(0); setPlaying(true); return; }
    setPlaying(!playing);
  });
  bigPlay.addEventListener('click', () => {
    if (idx === SCENES.length - 1 && sceneT >= SCENES[idx].min) { bigPlay.textContent = '▶'; goScene(0); }
    setPlaying(true);
  });
  voiceBtn.hidden = !canSpeak;
  voiceBtn.addEventListener('click', () => {
    voiceOn = !voiceOn;
    voiceBtn.setAttribute('aria-pressed', String(voiceOn));
    voiceBtn.textContent = voiceOn ? '🔊 VOICE' : '🔇 VOICE';
    if (!voiceOn && canSpeak) { speechSynthesis.cancel(); speechDone = true; }
    else speak(SCENES[idx].say);
  });
  ccBtn.addEventListener('click', () => {
    ccOn = !ccOn; ccBtn.setAttribute('aria-pressed', String(ccOn)); ccEl.hidden = !ccOn;
  });
  const close = () => {
    setPlaying(false);
    if (canSpeak) speechSynthesis.cancel();
    if (dlg.open) dlg.close();
  };
  $('cin-close').addEventListener('click', close);
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  dlg.addEventListener('close', () => { document.documentElement.classList.remove('modal-open'); if (canSpeak) speechSynthesis.cancel(); setPlaying(false); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  dlg.addEventListener('keydown', (e) => { if (e.key === ' ' && e.target === dlg) { e.preventDefault(); playBtn.click(); } });

  const open = () => {
    dlg.showModal();
    document.documentElement.classList.add('modal-open');
    if (!built) { built = true; world = buildWorld(); }
    bigPlay.textContent = '▶';
    goScene(0);
    setPlaying(true);
    if (typeof SFX !== 'undefined') SFX.play('start');
  };
  document.querySelectorAll('[data-intro]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); open(); }));

  /* ---------- timeline tick (driven by the world's render loop, or a timer without 3D) ---------- */
  const tick = (dt) => {
    if (!playing) return;
    sceneT += dt;
    if (world) world.update(SCENES[idx].id, sceneT, SCENES[idx].min);
    if (sceneT >= SCENES[idx].min && speechDone) goScene(idx + 1);
    updateBar();
  };

  /* ==========================================================
     The 3D world for the intro
     ========================================================== */
  function buildWorld() {
    if (typeof THREE === 'undefined' || !window.RS3D) {
      // no 3D: captions over the photo, still timed like a video
      stageEl.classList.add('cinema__stage--flat');
      let last = performance.now();
      const loop = (now) => { const dt = Math.min(0.1, (now - last) / 1000); last = now; tick(dt); if (dlg.open) requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
      return { enter() {}, update() {}, kick() {} };
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

    /* text on a plane */
    const font = (px) => `700 ${px}px "Chakra Petch", "Inter", sans-serif`;
    const label = (text, fg, w, h, px = 90, glowy = true) => {
      const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
      const g = c.getContext('2d');
      let size = px; g.font = font(size);
      while (size > 12 && (g.measureText(text).width > c.width * 0.92 || size > c.height * 0.86)) { size -= 4; g.font = font(size); }
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, c.width / 2, c.height / 2 + 3);
      const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
      return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, transparent: true, emissive: glowy ? 0xffffff : 0, emissiveMap: glowy ? t : null, emissiveIntensity: glowy ? 0.8 : 0 }));
    };

    /* ground: one long circuit board through every set */
    const board = rbox(120, 0.5, 6, std(0x141833, { roughness: 0.32, metalness: 0.55 }), 0.18);
    board.position.set(48, -0.25, -0.5); scene.add(board);
    for (let i = 0; i < 40; i++) {
      const col = [0x38d9f5, 0x3ef08a, 0x8b6cff][i % 3];
      const t = box(1.5 + Math.random() * 4, 0.03, 0.05, glow(col, 0.9), false);
      t.position.set(-8 + Math.random() * 112, 0.015, -3 + Math.random() * 5);
      scene.add(t);
    }

    /* sparkles */
    const sparks = [];
    for (let i = 0; i < 70; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), new THREE.MeshBasicMaterial({ color: i % 3 ? 0xffd23f : 0x38d9f5 }));
      s.position.set(-6 + Math.random() * 112, 0.5 + Math.random() * 6, -4 + Math.random() * 3);
      s.userData.p = Math.random() * 6; scene.add(s); sparks.push(s);
    }

    /* SET · hello (x 0) */
    const hello = label("HI, I'M RANGESH", '#ffd23f', 6, 0.9, 120); hello.position.set(0, 3.6, -1.5); scene.add(hello);
    const ringHello = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.04, 8, 64), glow(0x8b6cff, 1.6)); ringHello.rotation.x = Math.PI / 2; ringHello.position.set(0, 0.05, 0.6); scene.add(ringHello);

    /* SET · desk (x 12) */
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
    const deskTag = label('FACILIO · FSM APPS', '#8b6cff', 4, 0.6, 90); deskTag.position.set(11, 3.4, -1); scene.add(deskTag);
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
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.36, 0.04), glow(0xff4d8d, 0.6)); flag.position.set(33.3, 3.0, -0.6); scene.add(flag);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 8), std(0xdddddd, { metalness: 0.5 })); pole.position.set(33, 2.3, -0.6); scene.add(pole);
    const runTag = label('ONE OWNER · END TO END', '#ffd23f', 6, 0.7, 100); runTag.position.set(27, 4.1, -1.2); scene.add(runTag);

    /* SET · Xero ⇄ Facilio (x 45) */
    const packets = [];
    const flow = (from, to, color, n, speed) => {
      for (let i = 0; i < n; i++) {
        const p = rbox(0.22, 0.22, 0.22, glow(color, 2), 0.05, false); scene.add(p);
        packets.push({ p, from, to, t: i / n, speed });
      }
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
    const syncTag = label('⇄ TWO-WAY SYNC', '#38d9f5', 3.4, 0.55, 90); syncTag.position.set(45, 3.6, -0.6); scene.add(syncTag);

    /* SET · Vanij ETL (x 58) */
    const node = (x, color, text, fg) => {
      const b = rbox(1.6, 1.05, 1.05, std(color, { roughness: 0.3, metalness: 0.3 }), 0.14); b.position.set(x, 0.55, -0.5);
      const l = label(text, fg, 1.45, 0.5, 120, false); l.position.set(x, 0.55, 0.03);
      scene.add(b, l);
    };
    node(54, 0x3a3170, 'SOURCE', '#f2efff'); node(57, 0x2fd17a, 'GO API', '#07140c'); node(60, 0x2bbfdc, 'AIRBYTE', '#06161a');
    for (let i = 0; i < 3; i++) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.36, 36), std(i % 2 ? 0xffb02e : 0xffd23f, { roughness: 0.22, metalness: 0.65 })); d.position.set(63, 0.2 + i * 0.42, -0.5); d.castShadow = true; scene.add(d); }
    [[54.8, 56.2], [57.8, 59.2], [60.8, 62.2]].forEach(([a, b]) => flow(new THREE.Vector3(a, 0.6, 0.1), new THREE.Vector3(b, 0.6, 0.1), 0xffd23f, 2, 0.8));
    const etlTag = label('ETL PIPELINE · VANIJ', '#ffd23f', 4.2, 0.6, 90); etlTag.position.set(58.5, 2.6, -0.8); scene.add(etlTag);

    /* SET · skills orbit (x 74) */
    const SK = [['FS', 0x8b6cff], ['GO', 0x2fd17a], ['VUE', 0x41b883], ['JS', 0xf2c230], ['PY', 0x4b8bbe], ['JAVA', 0xe76f00], ['SQL', 0x38d9f5]];
    const skillCubes = SK.map(([t, c]) => {
      const cube = rbox(0.6, 0.6, 0.6, std(c, { roughness: 0.3, metalness: 0.15, envMapIntensity: 0.6 }), 0.12);
      [[0, 0, 0.31, 0], [0, 0, -0.31, Math.PI], [0.31, 0, 0, Math.PI / 2], [-0.31, 0, 0, -Math.PI / 2]].forEach(([x, y, z, ry]) => {
        const l = label(t, '#ffffff', 0.5, 0.34, 200, false); l.position.set(x, y, z); l.rotation.y = ry; cube.add(l);
      });
      scene.add(cube);
      return cube;
    });
    const skillTag = label('MY TOOLKIT', '#38d9f5', 3, 0.6, 100); skillTag.position.set(74, 4.0, -1.2); scene.add(skillTag);

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
    const lc = label('LEETCODE 1650+', '#ffd23f', 3.4, 0.55, 90); lc.position.set(86.9, 3.5, -0.8); scene.add(lc);

    /* SET · call to action (x 98) */
    const ctaRing = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.06, 8, 80), glow(0x3ef08a, 1.8)); ctaRing.rotation.x = Math.PI / 2; ctaRing.position.set(98, 0.06, 0.6); scene.add(ctaRing);
    const ctaTag = label("LET'S BUILD TOGETHER", '#3ef08a', 5.6, 0.8, 110); ctaTag.position.set(98.6, 3.9, -1.2); scene.add(ctaTag);
    const confetti = [];
    for (let i = 0; i < 60; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.02), new THREE.MeshBasicMaterial({ color: [0xffd23f, 0x3ef08a, 0x38d9f5, 0xff4d8d][i % 4] }));
      c.visible = false; scene.add(c); confetti.push(c);
    }

    /* the hero */
    const { hero, legL, legR, armL, armR, head } = makeHero();
    hero.scale.setScalar(1.25);
    scene.add(hero);
    const H = { x: 0, y: 0, z: 0.6, tx: 0, ty: 0, wave: 0, cheer: 0, face: 0.3, hopFrom: null, hopTo: null, hopT: 1 };
    hero.position.set(0, 0, 0.6);

    /* camera rig */
    const cam = { x: 0, y: 2.2, z: 7, lx: 0, ly: 1.6 };
    const camT = { x: 0, y: 2.2, z: 7, lx: 0, ly: 1.6 };
    camera.position.set(cam.x, cam.y, cam.z);

    const SETS = {
      hello: { hx: 0, cam: [0, 2.0, 6.5, 0, 1.6] },
      desk: { hx: 13.2, cam: [12, 2.6, 7.5, 11.8, 1.8] },
      run: { hx: 21, cam: [27, 4.2, 12, 27, 1.6] },
      sync: { hx: 49.4, cam: [46, 2.8, 9.5, 46, 1.8] },
      etl: { hx: 52.2, cam: [57.8, 2.6, 10, 57.8, 1.2] },
      skills: { hx: 74, cam: [74, 2.4, 6.8, 74, 1.9] },
      awards: { hx: 83.0, cam: [86.2, 2.8, 9.2, 86.2, 1.6] },
      cta: { hx: 96.6, cam: [98, 2.0, 7.2, 98, 1.7] },
    };

    let cur = 'hello';
    const enter = (id, jump) => {
      cur = id;
      const s = SETS[id];
      H.tx = s.hx; H.ty = 0; H.hopT = 1; H.cheer = 0;
      [camT.x, camT.y, camT.z, camT.lx, camT.ly] = s.cam;
      if (jump || reduce) { // cut, don't travel
        H.x = s.hx; Object.assign(cam, camT);
      }
      if (id === 'hello' || id === 'cta') H.wave = 2.2;
      if (id === 'run') { H.x = s.hx; H.y = islands[0].position.y + 0.18; islands.forEach((g) => g.userData.top.material.color.set(0x2b2550)); }
      confetti.forEach((c) => { c.visible = false; });
      if (id === 'cta') confetti.forEach((c, i) => { c.visible = true; c.position.set(98 + (Math.random() - 0.5) * 6, 6 + Math.random() * 4, -1 + Math.random() * 2); c.userData.v = 1.5 + Math.random() * 2; c.userData.r = Math.random() * 6; });
    };

    const update = (id, t, dur) => {
      if (id === 'desk') drawScreen(Math.floor(t * 18));
      if (id === 'run') {
        const per = dur / 5.2;
        const k = Math.min(4, Math.floor(t / per));
        const target = islands[k];
        if (H.hopT >= 1 && Math.abs(H.x - target.position.x) > 0.1) {
          H.hopFrom = new THREE.Vector3(H.x, H.y, 0); H.hopTo = new THREE.Vector3(target.position.x, target.position.y + 0.18, 0); H.hopT = 0;
          if (typeof SFX !== 'undefined') SFX.play('hop');
        }
        islands.forEach((g, i) => g.userData.top.material.color.set(i < k ? 0x8b6cff : i === k ? (k === 4 ? 0x3ef08a : 0xffd23f) : 0x2b2550));
        if (k === 4 && H.hopT >= 1 && H.cheer <= 0 && t > per * 4 + 0.9) H.cheer = 1.2;
      }
    };

    /* render loop */
    let last = performance.now(), time = 0, raf = 0;
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    const fit = () => {
      const w = stageEl.clientWidth, h = stageEl.clientHeight;
      renderer.setSize(w, h, false); fx.setSize(w, h);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    const v = new THREE.Vector3();
    const loop = (now) => {
      raf = 0;
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      tick(dt);
      if (playing && !reduce) time += dt;

      // hero locomotion
      if (cur === 'run' && H.hopT < 1 && H.hopFrom) {
        H.hopT = Math.min(1, H.hopT + dt / 0.7);
        v.lerpVectors(H.hopFrom, H.hopTo, H.hopT);
        H.x = v.x; H.y = v.y + Math.sin(Math.PI * H.hopT) * 1.3;
        const sw = Math.sin(H.hopT * Math.PI * 4) * 0.7;
        legL.rotation.x = sw; legR.rotation.x = -sw; armL.rotation.x = -sw; armR.rotation.x = sw;
        hero.rotation.y += (Math.PI / 2 - hero.rotation.y) * 0.3;
      } else if (Math.abs(H.tx - H.x) > 0.05 && cur !== 'run') {
        const dir = Math.sign(H.tx - H.x);
        const speed = Math.max(6, Math.abs(H.tx - H.x) * 1.6);
        H.x += dir * Math.min(Math.abs(H.tx - H.x), dt * speed);
        H.y += (0 - H.y) * 0.2;
        const sw = Math.sin(time * 16) * 0.9;
        legL.rotation.x = sw; legR.rotation.x = -sw; armL.rotation.x = -sw; armR.rotation.x = sw;
        hero.rotation.y += (dir * Math.PI / 2 - hero.rotation.y) * 0.3;
      } else {
        legL.rotation.x *= 0.8; legR.rotation.x *= 0.8;
        hero.rotation.y += (H.face - hero.rotation.y) * 0.1;
        if (H.wave > 0) { H.wave -= dt; armR.rotation.z = 2.6 + Math.sin(H.wave * 14) * 0.35; armR.rotation.x = 0; }
        else { armR.rotation.z *= 0.85; const idle = Math.sin(time * 2.2) * 0.06; armL.rotation.x = idle; armR.rotation.x = -idle; }
        if (H.cheer > 0) { H.cheer -= dt; armL.rotation.z = -2.6; armR.rotation.z = 2.6; } else { armL.rotation.z *= 0.85; }
        if (cur === 'desk') { armL.rotation.x = -0.9 + Math.sin(time * 18) * 0.12; armR.rotation.x = -0.9 + Math.cos(time * 18) * 0.12; hero.rotation.y += (-Math.PI / 2 - hero.rotation.y) * 0.1; }
      }
      const bob = H.cheer > 0 ? Math.abs(Math.sin(time * 9)) * 0.4 : 0;
      hero.position.set(H.x, H.y + bob, cur === 'desk' ? 0.35 : H.z);
      head.rotation.y = Math.sin(time * 0.9) * 0.15;

      // world motion
      packets.forEach((p) => { if (playing) p.t = (p.t + dt * p.speed) % 1; p.p.position.lerpVectors(p.from, p.to, p.t); p.p.rotation.set(time * 2, time * 3, 0); });
      sparks.forEach((s) => { s.rotation.x = s.rotation.y = time + s.userData.p; s.position.y += Math.sin(time + s.userData.p) * 0.003; });
      ringHello.rotation.z = time; ctaRing.rotation.z = -time;
      skillCubes.forEach((c, i) => {
        const a = time * 0.9 + (i / skillCubes.length) * Math.PI * 2;
        c.position.set(74 + Math.cos(a) * 1.9, 1.9 + Math.sin(a * 2) * 0.35, 0.5 + Math.sin(a) * 1.2);
        c.rotation.set(time * 0.7 + i, time + i, 0);
      });
      cups.forEach((c, i) => { c.children[0].rotation.y = time * 0.8 + i; });
      flag.rotation.y = Math.sin(time * 3) * 0.3;
      confetti.forEach((c) => { if (!c.visible) return; c.position.y -= c.userData.v * dt; c.rotation.x += dt * 4; c.rotation.z += dt * 3; if (c.position.y < 0.1) c.position.y = 6 + Math.random() * 3; });

      // camera glides between sets
      const k = reduce ? 1 : Math.min(1, dt * 2.2);
      cam.x += (camT.x - cam.x) * k; cam.y += (camT.y - cam.y) * k; cam.z += (camT.z - cam.z) * k;
      cam.lx += (camT.lx - cam.lx) * k; cam.ly += (camT.ly - cam.ly) * k;
      const sway = reduce ? 0 : Math.sin(time * 0.4) * 0.6;
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
    const wrap = { enter, update, kick: () => { last = performance.now(); kick(); } };
    kick();
    return wrap;
  }
})();
