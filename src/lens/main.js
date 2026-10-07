// Concept 07 — Lens. Every piece of work is a picture on a field. Switching
// section does two things at once: the tiles move onto that section's axes
// (from Coordinates), and a render line sweeps across the screen, redrawing
// every picture, the background and the drawing in that section's visual
// language (from Viewport Modes). Click a tile to open the project, which the
// same tabs then translate.
import '../shared/base.css';
import './style.css';
import { mountChrome, mountSwitcher, prefersReducedMotion } from '../shared/chrome.js';
import { modes } from '../content.js';
import { artifacts as items, films as albums, quiet, inMore } from './artifacts.js';
import { systems } from '../coordinates/systems.js';
import { loadLand } from '../shared/geo.js';
import { Tween, ease, clamp, lerp, hexToRgb, rgbToCss } from '../anim.js';
import { render } from './render.js';
import { layout } from './layout.js';
import { overlay } from './overlay.js';
import { createPage } from './page.js';
import { RENDER, metaFor } from './meta.js';
import { createStacks } from './stacks.js';
import { createDarkroom } from './darkroom.js';

// Lens carries Grant's real work; only the pictures are stand-ins so far.
mountChrome('lens', { draft: 'Placeholder<span class="lx-wide"> images</span>' });

const MODE_IDS = modes.map((m) => m.id);
const body = document.body;
const reduced = prefersReducedMotion();
const DPR = Math.min(2, window.devicePixelRatio || 1);
const MOVE = reduced ? 0.001 : 1.15;
const SWEEP = reduced ? 0.001 : 0.95;
const STAGGER = reduced ? 0 : 0.26;

const div = (cls, parent, html) => {
  const n = document.createElement('div');
  n.className = cls;
  if (html != null) n.innerHTML = html;
  parent?.appendChild(n);
  return n;
};

/* ── Scaffold ─────────────────────────────────────────────────────────────── */

const bgOld = div('lx-bgold', body);
const ovOld = div('lx-ovwrap lx-ovwrap--old', body);
const ovNew = div('lx-ovwrap lx-ovwrap--new', body);
const dyn = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
dyn.setAttribute('class', 'lx-dyn');
dyn.setAttribute('aria-hidden', 'true');
body.appendChild(dyn);
const field = div('lx-field', body);
field.setAttribute('role', 'list');
field.setAttribute('aria-label', 'Work');
const stacks = createStacks({ albums, parent: body, onOpen: (a, frame, el) => darkroom.open(a.id, frame, el) });
const sweep = div('lx-sweep', body, '<span class="lx-sweep__tag"></span>');
sweep.setAttribute('aria-hidden', 'true');
const sweepTag = sweep.firstElementChild;
const legend = div(
  'lx-legend',
  body,
  `<span class="lx-legend__kicker"></span><h1 class="lx-legend__title"></h1><p class="lx-legend__meta"><span class="lx-legend__axes"></span><span class="lx-legend__render"></span></p>`,
);
const lg = {
  kicker: legend.querySelector('.lx-legend__kicker'),
  title: legend.querySelector('.lx-legend__title'),
  axes: legend.querySelector('.lx-legend__axes'),
  render: legend.querySelector('.lx-legend__render'),
};
const hint = div('lx-hint', body, 'Click any piece of work to open it');
const HINT = { image: 'Hover a film to skim · click to open', place: 'Click a trip to see its photos' };

// About's one quiet line, with Jaylee and Helga sitting beside it.
const quietEl = div(
  'lx-quiet',
  body,
  `<span>${quiet.line}</span><span class="lx-quiet__dogs" title="${quiet.dogs.alt}">${quiet.dogs.src.map((src) => `<img src="${src}" alt="" />`).join('')}<span class="sr-only">${quiet.dogs.alt}</span></span>`,
);

// The section's "+ more" list: work that belongs here but isn't on stage.
const more = div('lx-more', body, `<button class="lx-more__btn" type="button" aria-expanded="false"></button><ul class="lx-more__list" hidden></ul>`);
const moreBtn = more.querySelector('button');
const moreList = more.querySelector('ul');
moreBtn.addEventListener('click', () => {
  const open = moreList.hidden;
  moreList.hidden = !open;
  moreBtn.setAttribute('aria-expanded', String(open));
});
moreList.addEventListener('click', (e) => {
  const b = e.target.closest('[data-id]');
  if (!b) return;
  moreList.hidden = true;
  moreBtn.setAttribute('aria-expanded', 'false');
  openProject(b.dataset.id, null);
});
function fillMore(mode) {
  const list = items.filter((a) => inMore(a, mode));
  more.hidden = !list.length;
  moreList.hidden = true;
  moreBtn.setAttribute('aria-expanded', 'false');
  moreBtn.textContent = `+ ${list.length} more`;
  moreList.innerHTML = list.map((a) => `<li><button type="button" data-id="${a.id}"><span>${a.title}</span><span>${metaFor(a, mode)}</span></button></li>`).join('');
}

/* ── Tiles ────────────────────────────────────────────────────────────────── */

const tiles = items.map((it) => {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'lx-tile';
  el.dataset.kind = it.kind;
  el.dataset.id = it.id;
  el.setAttribute('role', 'listitem');
  el.setAttribute('aria-label', `${it.title} — open`);
  el.innerHTML = `
    <span class="lx-tile__frame">
      <span class="lx-tile__ghost lx-tile__ghost--2"></span>
      <span class="lx-tile__ghost lx-tile__ghost--1"></span>
      <span class="lx-tile__pics"><canvas></canvas><canvas></canvas></span>
    </span>
    <span class="lx-tile__cap"><span class="lx-tile__title">${it.title}</span><span class="lx-tile__meta"></span></span>`;
  field.appendChild(el);
  const t = {
    it,
    el,
    frame: el.querySelector('.lx-tile__frame'),
    pics: [...el.querySelectorAll('canvas')],
    meta: el.querySelector('.lx-tile__meta'),
    show: -1, // index of the canvas currently fully shown (-1: none yet)
    next: 0, // index of the canvas receiving the incoming render
    ready: false,
    reveal: 0,
    flipped: false,
    x: 0,
    y: 0,
    w: 1,
    h: 1,
    from: null,
    to: null,
    delay: 0,
  };
  // The film series is the photographs themselves: it opens straight into the films.
  // A film opens straight into its photographs; everything else opens its page.
  el.addEventListener('click', () => (it.film ? darkroom.open(it.film.id, it.film.cover, el) : openProject(it.id, el)));
  el.addEventListener('pointerenter', () => setHover(it.id));
  el.addEventListener('pointerleave', () => setHover(null));
  el.addEventListener('focus', () => setHover(it.id));
  el.addEventListener('blur', () => setHover(null));
  return t;
});
const tileById = new Map(tiles.map((t) => [t.it.id, t]));

const pxW = (w) => Math.max(24, Math.ceil((w * DPR) / 24) * 24);

function paint(t, idx, m) {
  const c = t.pics[idx];
  const src = render(t.it.id, m, pxW(t.to.w));
  if (c.width !== src.width || c.height !== src.height) {
    c.width = src.width;
    c.height = src.height;
  }
  c.getContext('2d').drawImage(src, 0, 0);
}

/* ── State ────────────────────────────────────────────────────────────────── */

let W = innerWidth;
let H = innerHeight;
let layouts = {};
let mode = null;
let land = null;
let T = null; // the running transition
let raf = 0;
let hovered = null;

const palette = {
  bg: new Tween(hexToRgb('#ece8e1'), ease.inOutCubic),
  ink: new Tween(hexToRgb('#1f1d1a'), ease.inOutCubic),
  muted: new Tween(hexToRgb('#8a8378'), ease.inOutCubic),
  accent: new Tween(hexToRgb('#c2552d'), ease.inOutCubic),
};

function computeLayouts() {
  layouts = Object.fromEntries(MODE_IDS.map((m) => [m, layout(m, W, H)]));
}
computeLayouts();

function applyPalette(now) {
  const bg = palette.bg.update(now);
  const ink = palette.ink.update(now);
  const muted = palette.muted.update(now);
  const accent = palette.accent.update(now);
  const s = body.style;
  s.setProperty('--bg', rgbToCss(bg));
  s.setProperty('--ink', rgbToCss(ink));
  s.setProperty('--muted', rgbToCss(muted));
  s.setProperty('--accent', rgbToCss(accent));
  s.setProperty('--line', rgbToCss(ink, 0.14));
}

/* ── Section changes ──────────────────────────────────────────────────────── */

function setMode(id) {
  const now = performance.now() / 1000;
  const first = mode == null;
  const prev = mode;
  mode = id;
  const dir = first || MODE_IDS.indexOf(id) >= MODE_IDS.indexOf(prev) ? 1 : -1;
  const L = layouts[id];

  // An interrupted sweep: each tile keeps whichever render it mostly showed.
  for (const t of tiles) {
    if (t.ready && t.reveal >= 0.5 && !t.to?.hidden) {
      t.show = t.next;
      t.pics[t.show].style.clipPath = 'none';
    }
    t.next = t.show === 0 ? 1 : 0;
    t.ready = false;
    t.reveal = 0;
    t.flipped = false;
    t.pics[t.next].style.clipPath = dir > 0 ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)';
    t.pics[t.next].style.zIndex = '2';
    if (t.show >= 0) t.pics[t.show].style.zIndex = '1';
    const target = L.tiles.get(t.it.id);
    // Sections only show their own work: tiles step out where they are as
    // the line passes, and step back in at their new place.
    t.arriving = !!t.hidden && !target.hidden;
    t.from = first || t.arriving ? { ...target } : { x: t.x, y: t.y, w: t.w, h: t.h };
    t.to = target.hidden ? { ...t.from, hidden: true, cap: false, focus: false } : target;
    if (target.hidden && (t.hidden || first)) {
      setOut(t, true);
      t.reveal = 1;
    }
  }
  const order = [...tiles].sort((a, b) => (a.to.x - b.to.x) * dir);
  stacks.layout(layouts.image);
  order.forEach((t, k) => (t.delay = first ? 0 : (k / tiles.length) * STAGGER));

  // The outgoing drawing and background stay put on the side the line hasn't reached.
  ovOld.replaceChildren(...ovNew.childNodes);
  ovNew.replaceChildren(overlay(id, L.R, W, H, land));
  bgOld.style.background = first ? systems[id].palette.bg : rgbToCss(palette.bg.value);

  const pal = systems[id].palette;
  for (const k in palette) palette[k].set(hexToRgb(pal[k]), now, first ? 0.001 : SWEEP);

  const md = modes.find((m) => m.id === id);
  lg.kicker.textContent = `${String(MODE_IDS.indexOf(id) + 1).padStart(2, '0')} · ${md.section}`;
  lg.title.textContent = systems[id].title;
  lg.axes.textContent = systems[id].readout;
  hint.textContent = HINT[id] ?? 'Click any piece of work to open it';
  quietEl.classList.toggle('is-on', id === 'reality');
  fillMore(id);
  const renderName = RENDER[id];
  lg.render.textContent = `render · ${renderName}`;
  legend.classList.remove('is-in');
  void legend.offsetWidth;
  legend.classList.add('is-in');
  sweepTag.textContent = `render ▸ ${renderName}`;

  dyn.classList.remove('is-on');
  body.dataset.mode = id;
  T = { t0: now, dir, first, prev };
  page.setMode(id, dir);
  kick();
}

/* ── Frame ────────────────────────────────────────────────────────────────── */

function frame(ms) {
  raf = 0;
  const now = ms / 1000;
  applyPalette(now);
  if (!T) return;
  const t = now - T.t0;
  const s = ease.inOutSine(clamp(t / SWEEP));
  const X = T.dir > 0 ? s * W : (1 - s) * W;
  let busy = t < SWEEP;

  for (const tl of tiles) {
    const k = ease.inOutCubic(clamp((t - tl.delay) / MOVE));
    if (k < 1) busy = true;
    tl.x = lerp(tl.from.x, tl.to.x, k);
    tl.y = lerp(tl.from.y, tl.to.y, k);
    tl.w = lerp(tl.from.w, tl.to.w, k);
    tl.h = lerp(tl.from.h, tl.to.h, k);
    place(tl);

    if (tl.reveal < 1) {
      const left = tl.x - tl.w / 2;
      const f = clamp(T.dir > 0 ? (X - left) / tl.w : (left + tl.w - X) / tl.w);
      if (tl.to.hidden) {
        // Leaving: fade out where it stands once the line reaches it.
        tl.reveal = s >= 1 ? 1 : Math.max(tl.reveal, f);
        if (tl.reveal >= 0.5 && !tl.flipped) {
          tl.flipped = true;
          setOut(tl, true);
        }
        continue;
      }
      if (tl.arriving) {
        // Arriving: appear whole, already in the new render, as the line passes.
        if (f >= 0.35 || s >= 1) {
          paint(tl, tl.next, mode);
          tl.pics[tl.next].style.clipPath = 'none';
          if (tl.show >= 0) tl.pics[tl.show].style.zIndex = '0';
          tl.show = tl.next;
          tl.reveal = 1;
          tl.arriving = false;
          flip(tl);
          setOut(tl, false);
        }
        continue;
      }
      // Render just ahead of the line so the work is spread across frames.
      if (!tl.ready && (f > 0 || Math.abs(X - tl.x) < W * 0.22 || s >= 1)) {
        paint(tl, tl.next, mode);
        tl.ready = true;
      }
      tl.reveal = s >= 1 ? 1 : Math.max(tl.reveal, f);
      const c = tl.pics[tl.next];
      const p = ((1 - tl.reveal) * 100).toFixed(2);
      c.style.clipPath = tl.reveal >= 1 ? 'none' : T.dir > 0 ? `inset(0 ${p}% 0 0)` : `inset(0 0 0 ${p}%)`;
      if (!tl.flipped && tl.reveal >= 0.5) flip(tl);
      if (tl.reveal >= 1) {
        if (tl.show >= 0) tl.pics[tl.show].style.zIndex = '0';
        tl.show = tl.next;
      }
    }
  }

  const clipOld = T.dir > 0 ? `inset(0 0 0 ${X.toFixed(1)}px)` : `inset(0 ${(W - X).toFixed(1)}px 0 0)`;
  const clipNew = T.dir > 0 ? `inset(0 ${(W - X).toFixed(1)}px 0 0)` : `inset(0 0 0 ${X.toFixed(1)}px)`;
  bgOld.style.clipPath = clipOld;
  ovOld.style.clipPath = clipOld;
  ovNew.style.clipPath = s >= 1 ? 'none' : clipNew;
  sweep.style.transform = `translateX(${X.toFixed(1)}px)`;
  sweep.classList.toggle('is-back', T.dir < 0);
  page.sweep(X, T.dir, s >= 1);
  stacks.sweep(X, T.dir, s >= 1, mode === 'image', T.prev === 'image' && mode !== 'image');
  sweep.classList.toggle('is-on', s > 0 && s < 1 && !T.first);

  if (busy) {
    raf = requestAnimationFrame(frame);
  } else {
    T = null;
    ovOld.replaceChildren();
    bgOld.style.clipPath = 'inset(0 0 0 100%)';
    drawDyn();
    warm();
  }
}

function kick() {
  if (!raf) raf = requestAnimationFrame(frame);
}

function place(tl) {
  tl.el.style.transform = `translate(${(tl.x - tl.w / 2).toFixed(1)}px, ${(tl.y - tl.h / 2).toFixed(1)}px)`;
  tl.frame.style.width = `${tl.w.toFixed(1)}px`;
  tl.frame.style.height = `${tl.h.toFixed(1)}px`;
  tl.el.style.width = `${tl.w.toFixed(1)}px`;
}

// Halfway through its reveal a tile takes on the new section's shape and caption.
function flip(tl) {
  tl.flipped = true;
  tl.el.dataset.r = mode;
  tl.el.classList.toggle('has-cap', tl.to.cap);
  tl.el.classList.toggle('is-focus', tl.to.focus);
  tl.el.classList.toggle('cap-end', tl.to.capAlign === 'end');
  tl.meta.textContent = metaFor(tl.it, mode);
}

function setOut(tl, out) {
  tl.hidden = out;
  tl.el.classList.toggle('is-out', out);
  tl.el.inert = out;
}

/* ── Leaders, anchors, links (drawn once a section settles) ───────────────── */

function drawDyn() {
  const pal = systems[mode].palette;
  const L = layouts[mode];
  const parts = [];
  for (const tl of tiles) {
    const p = L.tiles.get(tl.it.id);
    if (p.hidden) continue;
    const [ax, ay] = [p.ax, p.ay];
    // Nearest point on the picture to the anchor.
    const nx = clamp(ax, p.x - p.w / 2, p.x + p.w / 2);
    const ny = clamp(ay, p.y - p.h / 2, p.y + p.h / 2);
    const d = Math.hypot(ax - nx, ay - ny);
    if (mode === 'place' && d < 1) continue;
    if (d > 4) parts.push(`<line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" class="lx-leader" data-id="${tl.it.id}"/>`);
    parts.push(`<circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="${mode === 'place' ? 2.6 : 2.2}" class="lx-anchor" data-id="${tl.it.id}"/>`);
  }
  if (mode === 'image') {
    for (const p of L.stacks) {
      const top = p.y - p.w * 0.65;
      const nx = clamp(p.ax, p.x - p.w / 2, p.x + p.w / 2);
      const ny = clamp(p.ay, top, top + p.w * 1.3);
      if (Math.hypot(p.ax - nx, p.ay - ny) > 4) parts.push(`<line x1="${p.ax.toFixed(1)}" y1="${p.ay.toFixed(1)}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" class="lx-leader"/>`);
      parts.push(`<circle cx="${p.ax.toFixed(1)}" cy="${p.ay.toFixed(1)}" r="2.2" class="lx-anchor"/>`);
    }
  }
  if (mode === 'digital') {
    for (const it of items) {
      for (const r of it.related ?? []) {
        if (r < it.id) continue;
        const a = L.tiles.get(it.id);
        const b = L.tiles.get(r);
        if (!a || !b || a.hidden || b.hidden) continue;
        parts.unshift(`<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" class="lx-link" data-a="${it.id}" data-b="${r}"/>`);
      }
    }
  }
  dyn.setAttribute('viewBox', `0 0 ${W} ${H}`);
  dyn.style.setProperty('--dyn', pal.accent);
  dyn.style.setProperty('--dyn-ink', pal.ink);
  dyn.innerHTML = parts.join('');
  dyn.classList.add('is-on');
  if (hovered) setHover(hovered);
}

function setHover(id) {
  hovered = id;
  for (const n of dyn.querySelectorAll('[data-id], [data-a]')) {
    const on = id && (n.dataset.id === id || n.dataset.a === id || n.dataset.b === id);
    n.classList.toggle('is-hot', !!on);
  }
  field.classList.toggle('has-hover', !!id);
  for (const t of tiles) t.el.classList.toggle('is-hot', t.it.id === id);
}

/* ── Warm the render cache in idle time ───────────────────────────────────── */

let warmQueue = [];
let warmTimer = 0;
function warm() {
  const order = [...MODE_IDS].sort((a, b) => Math.abs(MODE_IDS.indexOf(a) - MODE_IDS.indexOf(mode)) - Math.abs(MODE_IDS.indexOf(b) - MODE_IDS.indexOf(mode)));
  warmQueue = order.flatMap((m) => tiles.filter((t) => !layouts[m].tiles.get(t.it.id).hidden).map((t) => [t.it.id, m, pxW(layouts[m].tiles.get(t.it.id).w)]));
  clearTimeout(warmTimer);
  const step = () => {
    if (T) return; // never compete with a running transition
    const until = performance.now() + 10;
    while (warmQueue.length && performance.now() < until) render(...warmQueue.shift());
    if (warmQueue.length) warmTimer = setTimeout(step, 30);
  };
  warmTimer = setTimeout(step, 120);
}

/* ── Project page ─────────────────────────────────────────────────────────── */

const page = createPage({
  getMode: () => mode,
  onNavigate: (id) => {
    const t = tileById.get(id);
    // A film opens its photographs over the page; anything else replaces the page.
    if (t?.it.film) darkroom.open(t.it.film.id, t.it.film.cover, null);
    else page.open(id, t?.el.querySelector('.lx-tile__frame'));
  },
  onClose: (id) => {
    field.inert = false;
    tileById.get(id)?.el.focus({ preventScroll: true });
  },
});

function openProject(id, el) {
  // The field stays visible behind the page but out of the tab order.
  field.inert = true;
  page.open(id, el?.querySelector('.lx-tile__frame') ?? null);
}

/* ── Darkroom ─────────────────────────────────────────────────────────────── */

const darkroom = createDarkroom({
  albums,
  onClose: (id, from) => (from ? from.focus({ preventScroll: true }) : stacks.focus(id)),
});

/* ── Boot ─────────────────────────────────────────────────────────────────── */

const switcher = mountSwitcher({
  items: modes.map((m) => ({ id: m.id, label: m.section, sub: m.name.toLowerCase() })),
  initial: 'reality',
  label: 'Sections',
  onChange: (id) => setMode(id),
});
page.bindSwitcher(switcher);

const query = new URLSearchParams(location.search);
const fromQuery = query.get('p');
if (fromQuery && items.some((i) => i.id === fromQuery)) openProject(fromQuery, null);
const rollQuery = query.get('roll');
if (rollQuery && (rollQuery === 'all' || albums.some((a) => a.id === rollQuery))) darkroom.open(rollQuery, 0, null);
stacks.warm();

loadLand().then((l) => {
  land = l;
  if (mode === 'place' && !T) ovNew.replaceChildren(overlay('place', layouts.place.R, W, H, land));
});

let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    W = innerWidth;
    H = innerHeight;
    computeLayouts();
    const L = layouts[mode];
    stacks.layout(layouts.image);
    for (const t of tiles) {
      const target = L.tiles.get(t.it.id);
      if (target.hidden) {
        t.to = { ...t.to, hidden: true };
        continue;
      }
      t.to = target;
      t.from = t.to;
      Object.assign(t, { x: t.to.x, y: t.to.y, w: t.to.w, h: t.to.h });
      place(t);
      if (t.show >= 0) paint(t, t.show, mode);
      t.el.classList.toggle('has-cap', t.to.cap);
      t.el.classList.toggle('cap-end', t.to.capAlign === 'end');
    }
    ovNew.replaceChildren(overlay(mode, L.R, W, H, land));
    if (!T) drawDyn();
    warm();
  }, 160);
});
