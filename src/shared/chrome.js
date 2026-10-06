// Shared chrome for every concept mock: identity, concept navigation, a short
// note explaining what the mock demonstrates, and the section switcher.
import { site } from '../content.js';
import { concepts } from './concepts.js';
import { pillPath, neckPath, spring } from './liquid.js';
import { mountContact } from './contact.js';

const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

export function mountChrome(conceptId) {
  const i = concepts.findIndex((c) => c.id === conceptId);
  const c = concepts[i];
  const prev = concepts[(i + concepts.length - 1) % concepts.length];
  const next = concepts[(i + 1) % concepts.length];

  const bar = el('header', 'chrome');
  bar.innerHTML = `
    <div class="chrome__id">
      <a class="chrome__name" href="../">${site.name}</a>
      <span class="chrome__concept"><span class="chrome__concept-word">Concept </span>${String(i + 1).padStart(2, '0')} — ${c.name}</span>
      ${site.draft ? '<span class="chrome__draft">Sample content</span>' : ''}
    </div>
    <div class="chrome__end">
      <nav class="chrome__nav" aria-label="Concepts">
        <a href="../${prev.id}/" title="Previous concept: ${prev.name}" aria-label="Previous concept: ${prev.name}">←</a>
        <a class="chrome__all" href="../" title="All concepts"><span class="chrome__all-label">All concepts</span><span aria-hidden="true">&nbsp;▦</span></a>
        <a href="../${next.id}/" title="Next concept: ${next.name}" aria-label="Next concept: ${next.name}">→</a>
      </nav>
    </div>`;
  document.body.appendChild(bar);
  mountContact(bar.querySelector('.chrome__end'));

  // Collapsed by default: the one-liner is enough; the detail is a click away.
  const note = el('aside', 'note is-collapsed');
  note.innerHTML = `<strong>${c.line}</strong><p>${c.detail}</p><button class="note__toggle" type="button">What is this?</button>`;
  const toggle = note.querySelector('.note__toggle');
  toggle.addEventListener('click', () => {
    const collapsed = note.classList.toggle('is-collapsed');
    toggle.textContent = collapsed ? 'What is this?' : 'Hide note';
  });
  document.body.appendChild(note);

  document.title = `${c.name} — ${site.name}`;
  return { bar, note, concept: c };
}

// Liquid switcher tuning. The glass tray is one bead per tab; beads touch at
// rest and pinch apart, joined by a neck, next to the active and hovered tabs.
const PAD = 4; // glass around each tab
const BEAD_R = 14; // glass corner radius
const INK_R = 10; // ink drop corner radius
const PUSH = 22; // px a gap opens beside the active / hovered tab
const NECK = 0.4; // neck height at full separation, as a fraction of the bead
const LEAN = 6; // px the drop leans toward a hovered tab
const LEAD = [520, 40]; // spring (stiffness, damping) for the drop's leading edge
const TRAIL = [170, 21]; // …and its trailing edge, which wobbles as it catches up

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/**
 * Section switcher. `items` = [{ id, label, sub }]. Calls onChange(id, prevId)
 * on every change (including the initial one). Number keys 1–n and ←/→ switch;
 * the current id is mirrored in the URL hash so states are linkable.
 * `caption` adds a short non-interactive label at the start of the tray.
 */
export function mountSwitcher({ items, initial, onChange, label = 'Sections', caption, parent = document.body }) {
  const nav = el('nav', 'switcher');
  nav.setAttribute('aria-label', label);
  const track = el('div', 'switcher__track');
  const glass = el('div', 'switcher__glass');
  track.appendChild(glass);
  track.insertAdjacentHTML(
    'beforeend',
    `<svg class="switcher__ink" aria-hidden="true" focusable="false">
      <defs><mask id="switcher-rim" maskUnits="userSpaceOnUse" x="-50" y="-50" width="9999" height="999">
        <rect x="-50" y="-50" width="9999" height="999" fill="#fff" /><path class="switcher__hole" fill="#000" />
      </mask></defs>
      <path class="switcher__rim" mask="url(#switcher-rim)" />
      <path class="switcher__tint" />
      <path class="switcher__drop" />
      <circle class="switcher__dot" r="2" />
    </svg>`,
  );
  const [hole, rim, tint, drop, dot] = ['hole', 'rim', 'tint', 'drop', 'dot'].map((k) => track.querySelector(`.switcher__${k}`));

  // Segments are everything that gets a glass bead: the caption, then the tabs.
  const segs = [];
  if (caption) {
    const c = el('span', 'switcher__caption', caption);
    c.setAttribute('aria-hidden', 'true');
    track.appendChild(c);
    segs.push(c);
  }
  const first = segs.length;
  const buttons = items.map((it, i) => {
    const b = el('button', 'switcher__btn');
    b.type = 'button';
    b.dataset.id = it.id;
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `<span class="switcher__key">${String(i + 1).padStart(2, '0')}</span><span class="switcher__label">${it.label}</span>${
      it.sub ? `<span class="switcher__sub">${it.sub}</span>` : ''
    }`;
    b.addEventListener('click', () => set(it.id));
    b.addEventListener('focus', () => b.matches(':focus-visible') && setHover(first + i));
    b.addEventListener('blur', () => hover === first + i && setHover(-1));
    track.appendChild(b);
    segs.push(b);
    return b;
  });
  // The same labels in the background colour, clipped to the ink drop, so text
  // inverts exactly where the drop is — half a letter at a time mid-flow.
  const inv = el('div', 'switcher__inv');
  inv.setAttribute('aria-hidden', 'true');
  const faces = buttons.map((b) => inv.appendChild(el('span', 'switcher__face', b.innerHTML)));
  track.appendChild(inv);
  nav.appendChild(track);
  parent.appendChild(nav);

  // ── Liquid state ──
  const gaps = segs.slice(1).map(() => ({ x: 0, v: 0 }));
  const L = { x: 0, v: 0 };
  const R = { x: 0, v: 0 };
  const glow = { x: 0, v: 0 };
  const tx = segs.map(() => 0);
  let base = [];
  let width0 = 0;
  let active = -1;
  let hover = -1;
  let tinted = -1;
  let snap = true;
  let raf = 0;
  let last = 0;

  function measure() {
    cancelAnimationFrame(raf);
    track.style.width = '';
    segs.forEach((s) => (s.style.transform = ''));
    const t = track.getBoundingClientRect();
    base = segs.map((s) => {
      const r = s.getBoundingClientRect();
      return { x: r.left - t.left, y: r.top - t.top, w: r.width, h: r.height };
    });
    width0 = t.width;
    faces.forEach((f, i) => {
      const b = base[first + i];
      Object.assign(f.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px` });
    });
    snap = true;
    frame(performance.now());
  }

  const lit = (i) => i >= first && (i === active || i === hover);

  function step(dt) {
    if (prefersReducedMotion()) snap = true;
    let moving = false;
    gaps.forEach((g, i) => {
      const t = lit(i) || lit(i + 1) ? 1 : 0;
      if (snap) Object.assign(g, { x: t, v: 0 });
      else moving = spring(g, t, 260, 30, dt) || moving;
    });
    let acc = 0;
    tx.forEach((_, i) => (tx[i] = acc += i ? PUSH * Math.max(0, gaps[i - 1].x) : 0));

    const a = base[active];
    let l = a.x + tx[active];
    let r = l + a.w;
    if (hover >= first && hover !== active) hover > active ? (r += LEAN) : (l -= LEAN);
    const g = hover >= first && hover !== active ? 1 : 0;
    if (snap) {
      Object.assign(L, { x: l, v: 0 });
      Object.assign(R, { x: r, v: 0 });
      Object.assign(glow, { x: g, v: 0 });
    } else {
      // The edge in the direction of travel leads; the other trails softly.
      const dir = (l + r - L.x - R.x) / 2;
      const [kl, cl] = dir > 0.5 ? TRAIL : LEAD;
      const [kr, cr] = dir < -0.5 ? TRAIL : LEAD;
      const h = dt / 4;
      for (let k = 0; k < 4; k++) {
        moving = spring(L, l, kl, cl, h) | spring(R, r, kr, cr, h) || moving;
      }
      moving = spring(glow, g, 300, 32, dt) || moving;
    }
    snap = false;
    return moving;
  }

  function draw() {
    track.style.width = `${width0 + tx[tx.length - 1]}px`;
    segs.forEach((s, i) => (s.style.transform = tx[i] ? `translateX(${tx[i]}px)` : ''));
    faces.forEach((f, i) => (f.style.transform = tx[first + i] ? `translateX(${tx[first + i]}px)` : ''));

    const beads = base.map((b, i) => ({ x: b.x + tx[i] - PAD, y: b.y - PAD, w: b.w + 2 * PAD, h: b.h + 2 * PAD }));
    let d = beads.map((b) => pillPath(b, BEAD_R)).join('');
    for (let i = 0; i < beads.length - 1; i++) {
      // Closed gaps are a full-height join; the neck pinches as the gap opens.
      const p = clamp01(gaps[i].x);
      const full = beads[i].h / 2;
      d += neckPath(beads[i], beads[i + 1], BEAD_R, full + ((beads[i].h * NECK) / 2 - full) * p * p * (3 - 2 * p));
    }
    glass.style.clipPath = `path('${d}')`;
    hole.setAttribute('d', d);
    rim.setAttribute('d', d);

    // The drop thins as it stretches and rounds into a capsule.
    const a = base[active];
    const w = Math.max(R.x - L.x, 1);
    const k = w / a.w;
    const h = a.h * Math.min(1.05, Math.max(0.62, k ** -0.4));
    const y = a.y + (a.h - h) / 2;
    const ink = pillPath({ x: L.x, y, w, h }, Math.min(h / 2, INK_R + Math.max(0, k - 1) * 28));
    drop.setAttribute('d', ink);
    inv.style.clipPath = `path('${ink}')`;
    dot.setAttribute('cx', (R.x - 9).toFixed(2));
    dot.setAttribute('cy', (y + 9).toFixed(2));

    if (hover >= first && hover !== active) tinted = hover;
    if (tinted >= 0) {
      const b = base[tinted];
      tint.setAttribute('d', pillPath({ x: b.x + tx[tinted], y: b.y, w: b.w, h: b.h }, INK_R));
      tint.style.opacity = String(0.07 * clamp01(glow.x));
    }
  }

  function frame(now) {
    raf = 0;
    if (active < 0 || !base.length) return;
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    const moving = step(dt);
    draw();
    if (moving) raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (raf || !base.length) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function setHover(i) {
    if (i === hover) return;
    hover = i;
    buttons.forEach((b, j) => b.classList.toggle('is-hover', first + j === i));
    kick();
  }

  track.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const x = e.clientX - track.getBoundingClientRect().left;
    let best = -1;
    let bd = PUSH;
    for (let i = first; i < segs.length; i++) {
      const l = base[i].x + tx[i];
      const dist = x < l ? l - x : x > l + base[i].w ? x - l - base[i].w : 0;
      if (dist < bd) [best, bd] = [i, dist];
    }
    setHover(best);
  });
  track.addEventListener('pointerleave', () => setHover(-1));

  let current = null;
  function set(id, { silent = false, fromHash = false } = {}) {
    if (!items.some((it) => it.id === id) || id === current) return;
    const prevId = current;
    current = id;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
    const idx = buttons.findIndex((b) => b.dataset.id === id);
    active = first + idx;
    if (prevId == null) measure();
    else kick();
    buttons[idx].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    if (!fromHash) history.replaceState(null, '', `#${id}`);
    if (!silent) onChange(id, prevId);
  }

  const step1 = (d) => {
    const i = items.findIndex((it) => it.id === current);
    set(items[(i + d + items.length) % items.length].id);
  };

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable], [role="dialog"]')) return;
    const k = parseInt(e.key, 10);
    if (k >= 1 && k <= items.length) set(items[k - 1].id);
    else if (e.key === 'ArrowRight') step1(1);
    else if (e.key === 'ArrowLeft') step1(-1);
  });

  window.addEventListener('hashchange', () => set(location.hash.slice(1), { fromHash: true }));

  // Re-measure when fonts land or a breakpoint changes the tab sizes.
  const ro = new ResizeObserver(() => measure());
  segs.forEach((s) => ro.observe(s));
  document.fonts?.ready.then(() => measure());

  const fromHash = location.hash.slice(1);
  set(items.some((it) => it.id === fromHash) ? fromHash : initial ?? items[0].id);

  return { set, step: step1, get: () => current, el: nav };
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
