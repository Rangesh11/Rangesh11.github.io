/* ==========================================================
   SYNC RUSH — a 60-second mini-game based on the real
   Xero <-> Facilio two-way sync. Fix FAILED records, remove
   DUPLICATES, let healthy records through.
   ========================================================== */
(() => {
  const cv = document.getElementById('g-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const q = (id) => document.getElementById(id);
  const overlay = q('g-overlay');
  const startBtn = q('g-start');
  const ui = { score: q('g-score'), combo: q('g-combo'), lives: q('g-lives'), time: q('g-time'), best: q('g-best') };
  const sfx = (n) => { if (window.SFX) window.SFX.play(n); };
  const read = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } };

  const GAME_TIME = 60;
  const LANES = 3;
  let W = 0, H = 0, dpr = 1, bw = 90, rw = 64, rh = 34;
  let state = 'idle';
  let records = [], particles = [], floaters = [];
  let score = 0, combo = 0, lives = 3, timeLeft = GAME_TIME, elapsed = 0, spawnT = 0, shake = 0, nextId = 1;
  let best = +(read('syncBest') || 0);
  let visible = false, raf = 0, last = 0, pulseL = 0, pulseR = 0;
  ui.best.textContent = best;

  /* ---------- colours from the theme ---------- */
  let C = {};
  const css = (v, fb) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || fb;
  const readTheme = () => {
    C = {
      bg: css('--bg-2', '#120f24'), panel: css('--panel', '#17132e'), line: css('--line', '#3a3170'), ink: css('--ink', '#05040c'),
      text: css('--text', '#f2efff'), muted: css('--muted', '#a9a3cf'), faint: css('--faint', '#716ba3'),
      green: css('--green', '#3ef08a'), red: '#ff5a5a', pink: css('--pink', '#ff4d8d'), yellow: css('--yellow', '#ffd23f'),
      cyan: css('--cyan', '#38d9f5'), purple: css('--purple', '#8b6cff'),
    };
  };
  readTheme();
  addEventListener('themechange', () => { readTheme(); draw(); });

  /* ---------- sizing ---------- */
  const laneY = (i) => H * (0.38 + i * 0.235);
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bw = Math.max(58, Math.min(110, W * 0.13));
    rw = W < 500 ? 52 : W > 900 ? 80 : 66; rh = W < 500 ? 32 : W > 900 ? 42 : 36;
    draw();
  };

  /* ---------- HUD ---------- */
  const mult = () => Math.min(5, 1 + Math.floor(combo / 5));
  const hud = () => {
    ui.score.textContent = score;
    ui.combo.textContent = 'x' + mult();
    ui.lives.textContent = '♥'.repeat(Math.max(0, lives)) + '♡'.repeat(Math.max(0, 3 - lives));
    ui.time.textContent = Math.ceil(timeLeft);
  };

  /* ---------- game flow ---------- */
  const start = () => {
    records = []; particles = []; floaters = [];
    score = 0; combo = 0; lives = 3; timeLeft = GAME_TIME; elapsed = 0; spawnT = 0.3; shake = 0;
    state = 'play';
    overlay.hidden = true;
    hud();
    sfx('start');
    cv.focus({ preventScroll: true });
    last = performance.now();
    kick();
  };

  const rank = (s) => s >= 400 ? 'Integration Legend' : s >= 250 ? 'Sync Specialist' : s >= 120 ? 'Integration Engineer' : 'Trainee Syncer';

  const end = (why) => {
    state = 'over';
    const newBest = score > best;
    if (newBest) { best = score; write('syncBest', String(best)); ui.best.textContent = best; }
    if (score >= 300 && typeof Ach !== 'undefined') Ach.unlock('sync');
    sfx(newBest ? 'clear' : 'bad');
    overlay.innerHTML = `
      <p class="game__over-tag">${why === 'time' ? 'TIME UP' : 'OUT OF LIVES'}</p>
      <h3>${score} <small>PTS</small></h3>
      <p class="game__rank">RANK · <b>${rank(score)}</b>${newBest ? ' · <span class="game__new">NEW BEST!</span>' : ''}</p>
      <p class="game__note">That's the job: every record synced, nothing failed, nothing doubled.</p>
      <button class="pbtn pbtn--start" id="g-again">↻ PLAY AGAIN</button>`;
    overlay.hidden = false;
    q('g-again').addEventListener('click', start);
  };

  /* ---------- records ---------- */
  const spawn = () => {
    const t = elapsed / GAME_TIME;
    const dir = Math.random() < 0.5 ? 1 : -1; // 1 = Xero -> Facilio, -1 = Facilio -> Xero
    const r = Math.random();
    const pFail = 0.24 + t * 0.12, pDup = 0.16 + t * 0.1;
    const type = r < pFail ? 'fail' : r < pFail + pDup ? 'dup' : 'ok';
    const lane = Math.floor(Math.random() * LANES);
    const travel = W - 2 * bw - rw;
    const secs = 4.6 - t * 2.0;
    records.push({
      id: nextId++, lane, dir, type, label: dir === 1 ? 'INV' : 'WO',
      num: String(1000 + Math.floor(Math.random() * 9000)),
      x: dir === 1 ? bw : W - bw - rw, y: laneY(lane) - rh / 2,
      speed: travel / secs, flash: 0, dead: false,
    });
  };

  const burst = (x, y, color, n = 12) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 160;
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0.6, color, size: 3 + Math.random() * 4 });
    }
  };
  const float = (x, y, text, color) => floaters.push({ x, y, text, color, life: 0.9 });

  const act = (rec) => {
    if (!rec || rec.dead || state !== 'play') return;
    const cx = rec.x + rw / 2, cy = rec.y + rh / 2;
    if (rec.type === 'fail') {
      combo++; const pts = 10 * mult(); score += pts;
      rec.type = 'ok'; rec.fixed = true; rec.flash = 0.35;
      burst(cx, cy, C.green); float(cx, cy - 18, '+' + pts + ' RETRIED', C.green); sfx('fix');
    } else if (rec.type === 'dup') {
      combo++; const pts = 15 * mult(); score += pts;
      rec.dead = true;
      burst(cx, cy, C.pink, 16); float(cx, cy - 18, '+' + pts + ' DEDUPED', C.pink); sfx('fix');
    } else {
      score = Math.max(0, score - 5); combo = 0;
      float(cx, cy - 18, '-5 WAS FINE', C.muted); sfx('bad');
    }
    hud();
  };

  const hitTest = (px, py) => {
    let hit = null;
    records.forEach((r) => {
      if (r.dead) return;
      const pad = 8;
      if (px >= r.x - pad && px <= r.x + rw + pad && py >= r.y - pad && py <= r.y + rh + pad) hit = r;
    });
    return hit;
  };

  cv.addEventListener('pointerdown', (e) => {
    if (state !== 'play') return;
    const r = cv.getBoundingClientRect();
    act(hitTest(e.clientX - r.left, e.clientY - r.top));
  });
  cv.addEventListener('keydown', (e) => {
    if (state !== 'play') return;
    const lane = { 1: 0, 2: 1, 3: 2 }[e.key];
    if (lane === undefined) return;
    e.preventDefault();
    // the bad record in that lane closest to its destination
    const bad = records.filter((r) => !r.dead && r.lane === lane && r.type !== 'ok');
    bad.sort((a, b) => (b.dir === 1 ? b.x : W - b.x) - (a.dir === 1 ? a.x : W - a.x));
    act(bad[0]);
  });
  startBtn.addEventListener('click', start);

  /* ---------- update ---------- */
  const update = (dt) => {
    elapsed += dt;
    timeLeft = Math.max(0, GAME_TIME - elapsed);
    spawnT -= dt;
    if (spawnT <= 0) {
      spawn();
      const t = elapsed / GAME_TIME;
      spawnT = 1.15 - t * 0.6 + Math.random() * 0.35;
    }
    records.forEach((r) => {
      if (r.dead) return;
      r.x += r.speed * dt * r.dir;
      r.flash = Math.max(0, r.flash - dt);
      const arrived = r.dir === 1 ? r.x >= W - bw - rw : r.x <= bw;
      if (!arrived) return;
      r.dead = true;
      const cx = r.dir === 1 ? W - bw : bw, cy = r.y + rh / 2;
      if (r.type === 'ok') {
        score += 2; burst(cx, cy, C.cyan, 6);
        if (r.dir === 1) pulseR = 0.4; else pulseL = 0.4;
      } else {
        lives--; combo = 0; shake = 0.35;
        burst(cx, cy, C.red, 18);
        float(cx + (r.dir === 1 ? -70 : 70), cy - 20, r.type === 'fail' ? 'SYNC FAILED!' : 'DUPLICATE SAVED!', C.red);
        sfx('bad');
      }
    });
    records = records.filter((r) => !r.dead || false);
    particles.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; p.life -= dt; });
    particles = particles.filter((p) => p.life > 0);
    floaters.forEach((f) => { f.y -= 40 * dt; f.life -= dt; });
    floaters = floaters.filter((f) => f.life > 0);
    shake = Math.max(0, shake - dt);
    pulseL = Math.max(0, pulseL - dt); pulseR = Math.max(0, pulseR - dt);
    hud();
    if (lives <= 0) end('lives');
    else if (timeLeft <= 0) end('time');
  };

  /* ---------- drawing ---------- */
  const rect = (x, y, w, h, fill, stroke, lw = 2) => {
    ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
    if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw); }
  };
  const text = (s, x, y, color, size = 12, weight = 700, align = 'center') => {
    ctx.fillStyle = color; ctx.font = `${weight} ${size}px "Chakra Petch", "Inter", sans-serif`;
    ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y);
  };

  const drawSystem = (x, label, sub, color, pulse) => {
    const pad = 8;
    rect(x + pad, 14, bw - pad * 2, H - 28, C.panel, pulse > 0 ? C.cyan : C.line, 3);
    ctx.fillStyle = color; ctx.fillRect(x + bw / 2 - 20, 30, 40, 40);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.strokeRect(x + bw / 2 - 20, 30, 40, 40);
    text(label[0], x + bw / 2, 51, '#fff', 22);
    text(label, x + bw / 2, 88, C.text, W < 500 ? 11 : 13);
    text(sub, x + bw / 2, 104, C.faint, 10, 600);
    for (let i = 0; i < LANES; i++) {
      ctx.fillStyle = C.line; ctx.fillRect(x + pad + 6, laneY(i) - 3, bw - pad * 2 - 12, 6);
    }
  };

  const drawRecord = (r, t) => {
    const blink = r.type !== 'ok' && Math.floor(t * 6) % 2 === 0;
    const base = r.type === 'fail' ? C.red : r.type === 'dup' ? C.pink : C.green;
    if (r.type === 'dup') rect(r.x + 6, r.y - 6, rw, rh, C.panel, base, 2); // the duplicate copy behind
    rect(r.x, r.y, rw, rh, r.flash > 0 ? C.green : C.panel, base, 3);
    ctx.fillStyle = base; ctx.fillRect(r.x, r.y, 6, rh);
    text(r.label, r.x + rw / 2 + 3, r.y + rh * 0.34, C.text, W < 500 ? 10 : W > 900 ? 13 : 11);
    text('#' + r.num, r.x + rw / 2 + 3, r.y + rh * 0.7, C.muted, W < 500 ? 9 : W > 900 ? 12 : 10, 600);
    if (r.type === 'fail') {
      rect(r.x + rw - 14, r.y - 10, 20, 20, blink ? C.red : '#c43b3b', C.ink, 2);
      text('!', r.x + rw - 4, r.y, '#fff', 13);
    } else if (r.type === 'dup') {
      rect(r.x + rw - 18, r.y - 10, 26, 20, blink ? C.pink : '#b8306a', C.ink, 2);
      text('×2', r.x + rw - 5, r.y, '#fff', 11);
    } else if (r.fixed) {
      text('✓', r.x + rw - 2, r.y - 2, C.green, 14);
    }
  };

  const draw = (t = performance.now() / 1000) => {
    if (!W) return;
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * 10 * shake, (Math.random() - 0.5) * 10 * shake);
    ctx.fillStyle = C.bg; ctx.fillRect(-10, -10, W + 20, H + 20);
    // grid
    ctx.fillStyle = C.line; ctx.globalAlpha = 0.25;
    for (let x = 0; x < W; x += 24) ctx.fillRect(x, 0, 1, H);
    for (let y = 0; y < H; y += 24) ctx.fillRect(0, y, W, 1);
    ctx.globalAlpha = 1;
    // lanes with moving dashes in both directions
    for (let i = 0; i < LANES; i++) {
      const y = laneY(i);
      const off = (t * 40) % 20;
      ctx.fillStyle = C.faint; ctx.globalAlpha = 0.45;
      for (let x = bw + off; x < W - bw; x += 20) ctx.fillRect(x, y - 1, 10, 2);
      ctx.globalAlpha = 1;
    }
    drawSystem(0, 'XERO', 'accounting', '#13a4d8', pulseL);
    drawSystem(W - bw, 'FACILIO', 'operations', C.purple, pulseR);
    text('⇄ TWO-WAY SYNC', W / 2, 16, C.faint, 10, 600);
    records.forEach((r) => drawRecord(r, t));
    particles.forEach((p) => { ctx.globalAlpha = Math.max(0, p.life / 0.6); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); });
    ctx.globalAlpha = 1;
    floaters.forEach((f) => { ctx.globalAlpha = Math.max(0, f.life / 0.9); text(f.text, f.x, f.y, f.color, 13); });
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  /* ---------- loop (pauses when the game scrolls out of view) ---------- */
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  const loop = (now) => {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (state === 'play' && visible && !document.hidden) update(dt);
    draw(now / 1000);
    if (visible && (state === 'play' || particles.length || floaters.length)) raf = requestAnimationFrame(loop);
  };

  new IntersectionObserver((en) => {
    visible = en[0].isIntersecting;
    if (visible) { last = performance.now(); kick(); }
  }, { threshold: 0.3 }).observe(cv);
  addEventListener('resize', resize);
  if (document.fonts) document.fonts.ready.then(() => draw());
  resize();
  hud();
})();
