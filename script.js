/* ==========================================================
   Rangesh S — Portfolio · "Delivery Quest" interactions
   ========================================================== */

// ---- Social links shown on the title screen and the Continue screen ----
const LINKS = {
  linkedin: 'https://www.linkedin.com/in/rangesh-s-763890259/',
  github: 'https://github.com/Rangesh11',
  leetcode: '', // e.g. 'https://leetcode.com/u/your-handle'
};

// ---- Lines typed under the name ----
const ROLES = [
  'Implementation Engineer',
  'End-to-End Project Owner',
  'Integration Engineer',
  'Full-Stack Developer',
  'LeetCode 1650+',
];

// ---- The five levels of the Delivery Run ----
const LEVELS = [
  { name: 'LEVEL 1 · DISCOVER', text: 'Requirement calls with the client. I map how their team really works.' },
  { name: 'LEVEL 2 · DESIGN', text: 'BRD and solution documents, agreed with the client before the build.' },
  { name: 'LEVEL 3 · BUILD', text: 'Configuration, FacilioScript, integrations and custom Vue.js widgets.' },
  { name: 'LEVEL 4 · TEST', text: 'Every flow, every edge case — failed and duplicate records included.' },
  { name: 'GOAL · GO-LIVE', text: 'Handover and go-live support. Project shipped — one owner, zero handoffs.' },
];

// ---- Achievements visitors can unlock ----
const ACHIEVEMENTS = [
  { id: 'start', ico: '🎮', name: 'Press Start', desc: 'Started the game' },
  { id: 'clear', ico: '🏁', name: 'Stage Clear', desc: 'Finished the Delivery Run' },
  { id: 'save', ico: '💾', name: 'Save Loaded', desc: 'Opened a save file' },
  { id: 'quest', ico: '📜', name: 'Quest Reader', desc: 'Opened a quest' },
  { id: 'sync', ico: '⚡', name: 'Sync Master', desc: 'Scored 300+ in Sync Rush' },
  { id: 'collector', ico: '🎒', name: 'Collector', desc: 'Checked every inventory pocket' },
  { id: 'coin', ico: '🪙', name: 'Insert Coin', desc: 'Reached the Continue screen' },
];

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked: fine */ } },
};

$('#year').textContent = new Date().getFullYear();

/* ---------- theme toggle ---------- */
(() => {
  const root = document.documentElement;
  const isLight = () => root.dataset.theme
    ? root.dataset.theme === 'light'
    : window.matchMedia('(prefers-color-scheme: light)').matches;
  $('#theme-toggle').addEventListener('click', () => {
    const next = isLight() ? 'dark' : 'light';
    root.dataset.theme = next;
    store.set('theme', next);
    dispatchEvent(new Event('themechange'));
  });
})();

/* ---------- sound effects (made in the browser, off by default) ---------- */
const SFX = (() => {
  let on = store.get('sound') === 'on';
  let ac = null;
  const btn = $('#sound-btn');
  const render = () => {
    btn.textContent = on ? '🔊' : '🔇';
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
  };
  const tone = (f, d = 0.08, type = 'square', vol = 0.04, slide = 0) => {
    if (!on) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + d);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + 0.02);
    } catch (e) { /* audio blocked: stay silent */ }
  };
  const seq = (notes, step = 0.07) => notes.forEach((n, i) => setTimeout(() => tone(n, step + 0.03), i * step * 1000));
  const sounds = {
    click: () => tone(660, 0.05),
    hop: () => tone(300, 0.14, 'square', 0.035, 2.2),
    coin: () => seq([988, 1319], 0.06),
    fix: () => tone(880, 0.09, 'triangle', 0.06, 1.5),
    bad: () => tone(170, 0.2, 'sawtooth', 0.04, 0.6),
    ach: () => seq([523, 659, 784, 1047], 0.08),
    clear: () => seq([523, 659, 784, 1047, 1319], 0.09),
    start: () => seq([392, 523, 659], 0.07),
    stage: () => seq([659, 880], 0.06),
  };
  btn.addEventListener('click', () => { on = !on; store.set('sound', on ? 'on' : 'off'); render(); if (on) sounds.coin(); });
  render();
  return { play: (n) => { if (sounds[n]) sounds[n](); } };
})();
window.SFX = SFX;

/* ---------- achievements ---------- */
const Ach = (() => {
  const got = new Set((store.get('ach') || '').split(',').filter(Boolean));
  const count = $('#ach-count');
  const list = $('#ach-list');
  const btn = $('#ach-btn');
  const panel = $('#ach-panel');

  const render = () => {
    count.textContent = `${got.size}/${ACHIEVEMENTS.length}`;
    list.innerHTML = ACHIEVEMENTS.map((a) => `
      <li class="${got.has(a.id) ? 'got' : ''}">
        <span class="ico">${got.has(a.id) ? a.ico : '🔒'}</span>
        <span><b>${a.name}</b>${a.desc}</span>
      </li>`).join('');
  };

  const toast = (ico, label, title, desc) => {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<span class="toast__ico">${ico}</span><div><small>${label}</small><b>${title}</b><span class="desc">${desc}</span></div>`;
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), 4200);
  };

  const unlock = (id) => {
    if (got.has(id)) return;
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (!a) return;
    got.add(id);
    store.set('ach', [...got].join(','));
    render();
    btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump');
    toast(a.ico, 'ACHIEVEMENT UNLOCKED', a.name, a.desc);
    SFX.play('ach');
    if (got.size === ACHIEVEMENTS.length) {
      setTimeout(() => toast('👑', '100% COMPLETE', 'You saw it all!', 'Thanks for playing. Ready to hire player 1?'), 1200);
    }
  };

  btn.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (e) => {
    if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) {
      panel.hidden = true; btn.setAttribute('aria-expanded', 'false');
    }
  });

  render();
  return { unlock, toast };
})();

$('#press-start').addEventListener('click', () => { SFX.play('start'); Ach.unlock('start'); });

/* ---------- HUD: XP bar, stage label, active link, menu ---------- */
(() => {
  const fill = $('#xp-fill');
  const stageLabel = $('#hud-stage');
  const nav = $('#hud-nav');
  const burger = $('#burger');
  const links = $$('a', nav);
  const stages = $$('[data-stage]');
  const banner = $('#stage-banner');
  const seenStages = new Set(['start']);
  let bannerT = 0;
  const showBanner = (el) => {
    if (seenStages.has(el.id)) return;
    seenStages.add(el.id);
    banner.textContent = `STAGE ${el.dataset.stage}`;
    banner.classList.remove('is-on'); void banner.offsetWidth; banner.classList.add('is-on');
    clearTimeout(bannerT); bannerT = setTimeout(() => banner.classList.remove('is-on'), 1600);
    SFX.play('stage');
  };

  const onScroll = () => {
    const h = document.documentElement;
    const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
    fill.style.width = `${Math.min(100, p * 100)}%`;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      stageLabel.textContent = `STAGE ${en.target.dataset.stage}`;
      showBanner(en.target);
      links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${en.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  stages.forEach((s) => io.observe(s));

  const close = () => { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); };
  burger.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
  });
  links.forEach((a) => a.addEventListener('click', close));
})();

/* ---------- typed class line ---------- */
(() => {
  const el = $('#typed');
  if (reduceMotion) { el.textContent = ROLES[0]; return; }
  let r = 0, i = 0, del = false;
  const tick = () => {
    const word = ROLES[r];
    el.textContent = word.slice(0, i);
    if (!del && i < word.length) { i++; setTimeout(tick, 55); }
    else if (!del) { del = true; setTimeout(tick, 1700); }
    else if (i > 0) { i--; setTimeout(tick, 26); }
    else { del = false; r = (r + 1) % ROLES.length; setTimeout(tick, 300); }
  };
  setTimeout(tick, 500);
})();

/* ---------- reveal on scroll ---------- */
(() => {
  const els = $$('.stage__head, .map, .textbox, .save, .quest, .inv, .trophy, .book, .arc, .continue__box');
  els.forEach((el) => el.classList.add('reveal'));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12 });
  els.forEach((el) => io.observe(el));
})();

/* ---------- counters on the player card ---------- */
(() => {
  const els = $$('[data-count]');
  const run = (el) => {
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    if (reduceMotion) { el.textContent = target.toFixed(dec); return; }
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / 1200);
      el.textContent = (target * (1 - Math.pow(1 - t, 3))).toFixed(dec);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  setTimeout(() => els.forEach(run), 400);
})();

/* ---------- pixel starfield ---------- */
(() => {
  const c = $('#stars');
  const ctx = c.getContext('2d');
  let w, h, stars = [], color = '200,190,255';
  const readColor = () => { color = getComputedStyle(document.documentElement).getPropertyValue('--star').trim() || color; };
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round((w * h) / 9000);
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      s: Math.random() < 0.15 ? 3 : 2, v: 0.05 + Math.random() * 0.2, p: Math.random() * Math.PI * 2,
    }));
  };
  const draw = (t = 0) => {
    ctx.clearRect(0, 0, w, h);
    for (const st of stars) {
      if (!reduceMotion) { st.x -= st.v; if (st.x < -4) { st.x = w + 4; st.y = Math.random() * h; } }
      const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t / 600 + st.p));
      ctx.fillStyle = `rgba(${color},${a.toFixed(2)})`;
      ctx.fillRect(Math.round(st.x), Math.round(st.y), st.s, st.s);
    }
    if (!reduceMotion) requestAnimationFrame(draw);
  };
  readColor(); resize(); draw();
  addEventListener('resize', () => { resize(); if (reduceMotion) draw(); });
  addEventListener('themechange', () => { readColor(); if (reduceMotion) draw(); });
})();

/* ---------- the Delivery Run map ---------- */
(() => {
  const map = $('#map');
  const sprite = $('#sprite');
  const lvls = $$('.lvl', map);
  const nameEl = $('#tb-name');
  const textEl = $('#tb-text');
  const playBtn = $('#lvl-play');
  const vertical = window.matchMedia('(max-width: 640px)');
  let cur = 0, typing = null, playing = null, started = false;

  const typeText = (s) => {
    clearInterval(typing);
    if (reduceMotion) { textEl.textContent = s; return; }
    let i = 0; textEl.textContent = '';
    typing = setInterval(() => { textEl.textContent = s.slice(0, ++i); if (i >= s.length) clearInterval(typing); }, 22);
  };

  const place = (animate) => {
    const tile = $('.lvl__tile', lvls[cur]).getBoundingClientRect();
    const m = map.getBoundingClientRect();
    const sw = sprite.offsetWidth, sh = sprite.offsetHeight;
    let x, y;
    if (vertical.matches) { x = tile.left - m.left - sw - 10; y = tile.top - m.top + tile.height / 2 - sh / 2; }
    else { x = tile.left - m.left + tile.width / 2 - sw / 2; y = tile.top - m.top - sh - 8; }
    if (!animate) sprite.style.transition = 'none';
    sprite.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    if (!animate) { void sprite.offsetWidth; sprite.style.transition = ''; }
  };

  const go = (i, animate = true) => {
    i = Math.max(0, Math.min(LEVELS.length - 1, i));
    const moved = i !== cur;
    sprite.classList.toggle('is-flip', i < cur);
    cur = i;
    lvls.forEach((l, k) => { l.classList.toggle('is-current', k === cur); l.classList.toggle('is-done', k < cur); });
    map.style.setProperty('--progress', cur / (LEVELS.length - 1));
    document.dispatchEvent(new CustomEvent('levelchange', { detail: { index: cur, animate } }));
    nameEl.textContent = LEVELS[cur].name;
    typeText(LEVELS[cur].text);
    if (moved && animate && !reduceMotion) {
      sprite.classList.add('is-walking');
      clearTimeout(go.t); go.t = setTimeout(() => sprite.classList.remove('is-walking'), 900);
    }
    place(animate);
    if (cur === LEVELS.length - 1) {
      lvls[cur].classList.add('is-done');
      setTimeout(() => { sprite.classList.remove('is-cheer'); void sprite.offsetWidth; sprite.classList.add('is-cheer'); }, reduceMotion ? 0 : 900);
      Ach.unlock('clear');
    }
  };

  const stop = () => { clearInterval(playing); playing = null; playBtn.textContent = '▶ PLAY'; };
  const play = () => {
    if (playing) { stop(); return; }
    if (cur === LEVELS.length - 1) go(0, false);
    playBtn.textContent = '❚❚ PAUSE';
    playing = setInterval(() => {
      if (cur >= LEVELS.length - 1) { stop(); return; }
      go(cur + 1);
    }, 2600);
  };

  $('#lvl-prev').addEventListener('click', () => { stop(); go(cur - 1); });
  $('#lvl-next').addEventListener('click', () => { stop(); go(cur + 1); });
  playBtn.addEventListener('click', play);
  window.goLevel = (k) => { stop(); go(k); };
  window.currentLevel = () => cur;
  lvls.forEach((l, k) => l.addEventListener('click', () => { stop(); go(k); }));
  map.addEventListener('keydown', (e) => {
    if (['ArrowRight', 'ArrowDown'].includes(e.key)) { e.preventDefault(); stop(); go(cur + 1); }
    if (['ArrowLeft', 'ArrowUp'].includes(e.key)) { e.preventDefault(); stop(); go(cur - 1); }
  });
  $('.textbox').addEventListener('click', () => { clearInterval(typing); textEl.textContent = LEVELS[cur].text; });
  addEventListener('resize', () => place(false));
  if (document.fonts) document.fonts.ready.then(() => place(false));

  go(0, false);
  // Auto-play once the first time the map comes into view
  const io = new IntersectionObserver((en) => {
    if (en[0].isIntersecting && !started) { started = true; if (!reduceMotion) setTimeout(play, 700); io.disconnect(); }
  }, { threshold: 0.5 });
  io.observe(map);
})();

/* ---------- inventory pockets ---------- */
(() => {
  const tabs = $$('.inv__tabs [role="tab"]');
  const bags = $$('.bag');
  const seen = new Set();
  tabs.forEach((tab) => tab.addEventListener('click', () => {
    const p = tab.dataset.pocket;
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
    bags.forEach((b) => {
      const show = p === 'all' || b.dataset.pocket === p;
      b.hidden = !show;
      if (show && !reduceMotion) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
    });
    if (p !== 'all') seen.add(p);
    if (seen.size >= 4) Ach.unlock('collector');
  }));
})();

/* ---------- CONTINUE? countdown ---------- */
(() => {
  const el = $('#countdown');
  const box = $('#continue');
  let n = 9, timer = null;
  const tick = () => {
    n = n <= 0 ? 9 : n - 1;
    el.textContent = n;
    el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick');
  };
  new IntersectionObserver((en) => {
    if (en[0].isIntersecting) {
      Ach.unlock('coin');
      if (!reduceMotion && !timer) timer = setInterval(tick, 1000);
    } else { clearInterval(timer); timer = null; }
  }, { threshold: 0.4 }).observe(box);
})();

/* ---------- copy email ---------- */
(() => {
  const btn = $('#copy-email');
  const hint = $('#copy-hint');
  btn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(btn.dataset.email); hint.textContent = 'COPIED ✓'; }
    catch (e) { hint.textContent = 'COPY FAILED — SELECT IT'; }
    setTimeout(() => (hint.textContent = 'CLICK TO COPY'), 2000);
  });
})();

/* ---------- social links ---------- */
(() => {
  const icons = {
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.3V9h3.4v1.6c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5v6.2zM5.3 7.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2zM7.1 20.5H3.5V9h3.6v11.5zM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0z"/></svg>',
    github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.7 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.1.9 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/></svg>',
    leetcode: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 0a1.4 1.4 0 0 0-1 .4L7.1 6.2 4 9.4a5.3 5.3 0 0 0-1.3 2 5.4 5.4 0 0 0 .1 3.8 5.3 5.3 0 0 0 1.2 1.7l4.3 4.4a5.3 5.3 0 0 0 7.5.1l2.6-2.4a1.4 1.4 0 0 0-1.9-2l-2.6 2.4a2.6 2.6 0 0 1-3.7 0l-4.3-4.4a2.6 2.6 0 0 1 0-3.6l3.2-3.4 5.3-5.6A1.4 1.4 0 0 0 13.5 0zm-2.8 13a1.4 1.4 0 1 0 0 2.8h9.8a1.4 1.4 0 1 0 0-2.8z"/></svg>',
  };
  const names = { linkedin: 'LinkedIn', github: 'GitHub', leetcode: 'LeetCode' };
  $$('[data-socials]').forEach((wrap) => {
    Object.entries(LINKS).forEach(([k, url]) => {
      if (!url) return;
      const a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.rel = 'noopener';
      a.setAttribute('aria-label', names[k] + ' (opens in a new tab)');
      a.innerHTML = icons[k] + '<span>' + names[k] + '</span>';
      wrap.appendChild(a);
    });
  });
})();

/* ---------- detail pop-up for quests and save files ---------- */
(() => {
  const modal = $('#detail');
  if (!modal || typeof modal.showModal !== 'function') return;
  const body = $('.modal__body', modal);
  const panel = $('.modal__panel', modal);
  const saves = ['facilio', 'thisux'];
  let returnFocus = null;

  const open = (key) => {
    const tpl = document.getElementById('d-' + key);
    if (!tpl) return;
    body.replaceChildren(tpl.content.cloneNode(true));
    const title = $('h2', body);
    if (title) title.id = 'modal-title';
    panel.scrollTop = 0;
    if (!modal.open) {
      returnFocus = document.activeElement;
      modal.showModal();
      document.documentElement.classList.add('modal-open');
    }
    $('.modal__close', modal).focus({ preventScroll: true });
    Ach.unlock(saves.includes(key) ? 'save' : 'quest');
  };

  const close = () => {
    if (!modal.open || modal.classList.contains('is-closing')) return;
    if (reduceMotion) { modal.close(); return; }
    modal.classList.add('is-closing');
    setTimeout(() => { modal.classList.remove('is-closing'); modal.close(); }, 180);
  };

  modal.addEventListener('close', () => {
    document.documentElement.classList.remove('modal-open');
    if (returnFocus && returnFocus.focus) returnFocus.focus({ preventScroll: true });
  });
  modal.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.closest('.modal__close')) { close(); return; }
    const related = e.target.closest('[data-open]');
    if (related) open(related.dataset.open);
  });
  document.addEventListener('click', (e) => {
    if (modal.contains(e.target) || e.target.closest('a')) return;
    const card = e.target.closest('[data-detail]');
    if (card) open(card.dataset.detail);
  });
})();

/* ---------- secret: the classic cheat code ---------- */
(() => {
  const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let pos = 0;
  addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('#map')) { pos = 0; return; }
    pos = e.key === code[pos] ? pos + 1 : (e.key === code[0] ? 1 : 0);
    if (pos < code.length) return;
    pos = 0;
    Ach.toast('🪙', 'SECRET FOUND', 'Bonus coins!', 'You know the code. We should talk.');
    if (reduceMotion) return;
    for (let i = 0; i < 40; i++) {
      const c = document.createElement('span');
      c.className = 'coin'; c.textContent = '🪙';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.animationDuration = 1.6 + Math.random() * 1.6 + 's';
      c.style.animationDelay = Math.random() * 0.8 + 's';
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 4200);
    }
  });
})();

/* ---------- 3D: tilt the player card, quest cards and save files toward the pointer ---------- */
(() => {
  const fine = window.matchMedia('(pointer: fine)').matches;
  if (!fine || reduceMotion) return;
  const tilt = (el, max, extra = '') => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.classList.add('is-tilting'); el.classList.remove('is-resetting');
      el.style.transform = `perspective(900px) rotateY(${(x * max).toFixed(2)}deg) rotateX(${(-y * max).toFixed(2)}deg) ${extra}`;
    });
    el.addEventListener('pointerleave', () => {
      el.classList.remove('is-tilting'); el.classList.add('is-resetting');
      el.style.transform = '';
      setTimeout(() => el.classList.remove('is-resetting'), 500);
    });
  };
  const card = $('.player-card');
  if (card) tilt(card, 22);
  $$('.quest').forEach((q) => tilt(q, 10, 'translateZ(10px)'));
  $$('.save').forEach((s) => tilt(s, 5, 'translateZ(6px)'));
})();

/* ---------- 3D: flip trophies on tap (touch screens) and with Enter/Space ---------- */
$$('.trophy').forEach((t) => {
  t.addEventListener('click', () => t.classList.toggle('is-flipped'));
  t.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); t.classList.toggle('is-flipped'); }
  });
});

/* ---------- tidy the address bar after a fresh-files reload ---------- */
if (location.search.includes('fresh=')) history.replaceState(null, '', location.pathname + location.hash);
