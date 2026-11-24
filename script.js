/* ==========================================================
   Rangesh S — Portfolio interactions
   ========================================================== */

// ---- Edit these to show social links in the hero and Contact section ----
const LINKS = {
  linkedin: 'https://www.linkedin.com/in/rangesh-s-763890259/',
  github: 'https://github.com/Rangesh11',
  leetcode: '', // e.g. 'https://leetcode.com/u/your-handle'
};

const ROLES = [
  'Implementation Engineer',
  'End-to-End Project Owner',
  'Integration Engineer',
  'Full-Stack Developer',
  'LeetCode 1650+',
];

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* ---------- year ---------- */
$('#year').textContent = new Date().getFullYear();

/* ---------- theme toggle ---------- */
(() => {
  const root = document.documentElement;
  const current = () =>
    root.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  $('#theme-toggle').addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    window.dispatchEvent(new Event('themechange'));
  });
})();

/* ---------- nav: scrolled state, progress bar, active link ---------- */
(() => {
  const nav = $('#nav');
  const bar = $('.scroll-progress');
  const links = $$('.nav__links a');
  const sections = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);

  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 20);
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    let active = null;
    for (const s of sections) if (s.getBoundingClientRect().top < innerHeight * 0.4) active = s;
    links.forEach((a) => a.classList.toggle('is-active', active && a.getAttribute('href') === '#' + active.id));
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // mobile menu
  const burger = $('#burger');
  const menu = $('#nav-links');
  const close = () => { menu.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); };
  burger.addEventListener('click', () => {
    const open = !menu.classList.contains('is-open');
    menu.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
  });
  links.forEach((a) => a.addEventListener('click', close));
  addEventListener('keydown', (e) => e.key === 'Escape' && close());
})();

/* ---------- typing effect ---------- */
(() => {
  const el = $('#typed');
  if (reduceMotion) { el.textContent = ROLES[0]; return; }
  let r = 0, i = 0, deleting = false;
  const tick = () => {
    const word = ROLES[r];
    i += deleting ? -1 : 1;
    el.textContent = word.slice(0, i);
    let delay = deleting ? 35 : 70;
    if (!deleting && i === word.length) { deleting = true; delay = 1800; }
    else if (deleting && i === 0) { deleting = false; r = (r + 1) % ROLES.length; delay = 350; }
    setTimeout(tick, delay);
  };
  setTimeout(tick, 900);
})();

/* ---------- split headings into words for a staggered reveal ---------- */
(() => {
  $$('.section__title, .contact__title').forEach((title) => {
    let wi = 0;
    const frag = document.createDocumentFragment();
    [...title.childNodes].forEach((node) => {
      const cls = node.nodeType === 1 ? node.className : '';
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        const outer = document.createElement('span');
        outer.className = 'w';
        const inner = document.createElement('span');
        if (cls) inner.className = cls;
        inner.textContent = part;
        inner.style.setProperty('--wi', wi++);
        outer.appendChild(inner);
        frag.appendChild(outer);
      });
    });
    title.setAttribute('aria-label', title.textContent.replace(/\s+/g, ' ').trim());
    title.replaceChildren(frag);
  });
})();

/* ---------- reveal on scroll (with stagger) ---------- */
(() => {
  const items = $$('.reveal');
  // stagger siblings inside the same parent
  const groups = new Map();
  items.forEach((el) => {
    const list = groups.get(el.parentElement) || [];
    list.push(el);
    groups.set(el.parentElement, list);
  });
  groups.forEach((list) => list.forEach((el, idx) => el.style.setProperty('--rd', `${Math.min(idx, 6) * 90}ms`)));

  if (!('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('is-visible')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  items.forEach((el) => io.observe(el));
})();

/* ---------- animated counters ---------- */
(() => {
  const nums = $$('[data-count]');
  const run = (el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    if (reduceMotion) { el.textContent = target.toFixed(decimals); return; }
    const dur = 1800;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = (target * eased).toFixed(decimals);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
  }, { threshold: 0.6 });
  nums.forEach((n) => io.observe(n));
})();

/* ---------- timeline fill follows scroll ---------- */
(() => {
  const tl = $('.timeline');
  const fill = $('.timeline__fill');
  if (!tl || !fill) return;
  const update = () => {
    const r = tl.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.65 - r.top) / r.height));
    fill.style.transform = `scaleY(${p})`;
  };
  addEventListener('scroll', update, { passive: true });
  update();
})();

/* ---------- 3D tilt + spotlight on cards ---------- */
(() => {
  if (!finePointer || reduceMotion) return;
  $$('[data-tilt]').forEach((card) => {
    const max = card.classList.contains('portrait') ? 8 : 5;
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * max}deg) rotateY(${(x - 0.5) * max}deg) translateY(-4px)`;
      card.style.setProperty('--mx', `${x * 100}%`);
      card.style.setProperty('--my', `${y * 100}%`);
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
})();

/* ---------- magnetic buttons ---------- */
(() => {
  if (!finePointer || reduceMotion) return;
  $$('.magnetic').forEach((btn) => {
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${x * 0.18}px, ${y * 0.25}px)`;
    });
    btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
  });
})();

/* ---------- cursor glow ---------- */
(() => {
  if (!finePointer || reduceMotion) return;
  const glow = $('.cursor-glow');
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
  addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; glow.style.opacity = '1'; }, { passive: true });
  document.addEventListener('pointerleave', () => { glow.style.opacity = '0'; });
  const loop = () => {
    cx += (x - cx) * 0.12; cy += (y - cy) * 0.12;
    glow.style.transform = `translate(${cx - 240}px, ${cy - 240}px)`;
    requestAnimationFrame(loop);
  };
  loop();
})();

/* ---------- particle network background ---------- */
(() => {
  const canvas = $('#bg-canvas');
  const ctx = canvas.getContext('2d');
  let w, h, dpr, pts = [], color = '160,170,255';
  const mouse = { x: -9999, y: -9999 };

  const readColor = () => {
    color = getComputedStyle(document.documentElement).getPropertyValue('--particle').trim() || color;
  };
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = innerWidth * dpr;
    h = canvas.height = innerHeight * dpr;
    const count = Math.round(Math.min(80, (innerWidth * innerHeight) / 18000));
    pts = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25 * dpr, vy: (Math.random() - 0.5) * 0.25 * dpr,
      r: (Math.random() * 1.4 + 0.6) * dpr,
    }));
  };
  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    const link = 130 * dpr;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (!reduceMotion) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        // gentle push away from the pointer
        const mdx = p.x - mouse.x, mdy = p.y - mouse.y, md = Math.hypot(mdx, mdy);
        if (md < 120 * dpr && md > 0) { p.x += (mdx / md) * 0.8; p.y += (mdy / md) * 0.8; }
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color},0.55)`;
      ctx.fill();
      for (let j = i + 1; j < pts.length; j++) {
        const q = pts[j];
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < link) {
          ctx.strokeStyle = `rgba(${color},${0.16 * (1 - d / link)})`;
          ctx.lineWidth = dpr * 0.8;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
    }
    if (!reduceMotion) requestAnimationFrame(draw);
  };
  addEventListener('pointermove', (e) => { mouse.x = e.clientX * dpr; mouse.y = e.clientY * dpr; }, { passive: true });
  addEventListener('resize', () => { resize(); if (reduceMotion) draw(); });
  addEventListener('themechange', () => { readColor(); if (reduceMotion) draw(); });
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', readColor);
  readColor(); resize(); draw();
})();

/* ---------- copy email ---------- */
(() => {
  const btn = $('#copy-email');
  const hint = $('#copy-hint');
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.email);
      hint.textContent = 'Copied ✓';
    } catch (e) {
      hint.textContent = 'Copy failed — select the address';
    }
    setTimeout(() => (hint.textContent = 'Click to copy'), 2000);
  });
})();

/* ---------- social links (only those filled in above) ---------- */
(() => {
  const icons = {
    linkedin: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.3V9h3.4v1.6c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5v6.2zM5.3 7.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2zM7.1 20.5H3.5V9h3.6v11.5zM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0z"/></svg>',
    github: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.7 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.1.9 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/></svg>',
    leetcode: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M13.5 0a1.4 1.4 0 0 0-1 .4L7.1 6.2 4 9.4a5.3 5.3 0 0 0-1.3 2 5.4 5.4 0 0 0 .1 3.8 5.3 5.3 0 0 0 1.2 1.7l4.3 4.4a5.3 5.3 0 0 0 7.5.1l2.6-2.4a1.4 1.4 0 0 0-1.9-2l-2.6 2.4a2.6 2.6 0 0 1-3.7 0l-4.3-4.4a2.6 2.6 0 0 1 0-3.6l3.2-3.4 5.3-5.6A1.4 1.4 0 0 0 13.5 0zm-2.8 13a1.4 1.4 0 1 0 0 2.8h9.8a1.4 1.4 0 1 0 0-2.8z"/></svg>',
  };
  const names = { linkedin: 'LinkedIn', github: 'GitHub', leetcode: 'LeetCode' };
  $$('[data-socials]').forEach((wrap) => {
    const labeled = wrap.dataset.socials === 'labeled';
    Object.entries(LINKS).forEach(([k, url]) => {
      if (!url) return;
      const a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.rel = 'noopener';
      a.setAttribute('aria-label', names[k] + ' (opens in a new tab)');
      a.innerHTML = icons[k] + (labeled ? '<span>' + names[k] + '</span>' : '');
      wrap.appendChild(a);
    });
  });
})();

/* ---------- detail pop-up for projects and experience ---------- */
(() => {
  const modal = $('#detail');
  if (!modal || typeof modal.showModal !== 'function') return;
  const body = $('.modal__body', modal);
  const panel = $('.modal__panel', modal);
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
  modal.addEventListener('cancel', (e) => { e.preventDefault(); close(); }); // Esc key
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.closest('.modal__close')) { close(); return; } // backdrop or close button
    const related = e.target.closest('[data-open]');
    if (related) open(related.dataset.open);
  });

  // Click anywhere on a project or experience card (or its "View full details" button)
  document.addEventListener('click', (e) => {
    if (modal.contains(e.target) || e.target.closest('a')) return;
    const card = e.target.closest('[data-detail]');
    if (card) open(card.dataset.detail);
  });
})();
