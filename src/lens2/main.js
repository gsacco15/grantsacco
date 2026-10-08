// Concept 08 — Lens (v2): Lens with a quieter, more professional look:
// cleaner and more functional. Same content, same behaviour; only the look changes.
//
// Concept 07 — Lens. Every piece of work is a picture on a field. Switching
// section does two things at once: the tiles move onto that section's axes
// (from Coordinates), and a render line sweeps across the screen, redrawing
// every picture, the background and the drawing in that section's visual
// language (from Viewport Modes). Click a tile to open the project, which the
// same tabs then translate.
import '../shared/base.css';
import './style.css';
import { mountChrome, mountSwitcher, prefersReducedMotion } from '../shared/chrome.js';
import { modes, site } from '../content.js';
import { artifacts as items, films as albums, quiet, dogs, races, intro, inMore } from './artifacts.js';
import { systems } from '../coordinates/systems.js';
import { PALETTE } from './palette.js';
import { loadLand, loadCountries, loadDetail } from '../shared/geo.js';
import { Tween, ease, clamp, lerp, hexToRgb, rgbToCss } from '../anim.js';
import { render, forget } from './render.js';
import { preloadPictures } from './scenes.js';
import { layout, mapFrame, mapZoom, setMapZoom, MAX_ZOOM, polarFrame } from './layout.js';
import { overlay, updateMap, DETAIL_ZOOM } from './overlay.js';
import { createPage } from './page.js';
import { RENDER, metaFor } from './meta.js';
import { createStacks } from './stacks.js';
import { createDarkroom } from './darkroom.js';

// Lens carries Grant's real work; only the pictures are stand-ins so far.
mountChrome('lens2', { draft: 'Placeholder<span class="lx-wide"> images</span>' });

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
// Lens reads some axes differently from the Coordinates mock.
const READOUT = { reality: 'r = year · θ = time of year · origin = you' };
const HINT = { reality: 'Click the centre or any piece to open it', image: 'Hover a film to skim · click to open', place: 'Click a trip for photos · scroll or pinch to zoom' };

// About's one quiet line.
const quietEl = div('lx-quiet', body, `<span>${quiet.line}</span>`);

// Jaylee and Helga, sitting on their year's ring in About (named on hover).
const dogsEl = div(
  'lx-dogs',
  body,
  `<span class="lx-dogs__pics">${dogs.src.map((src) => `<img src="${src}" alt="" />`).join('')}</span><span class="lx-dogs__cap"><span>${dogs.names}</span><span>${dogs.year}</span></span>`,
);
dogsEl.setAttribute('role', 'img');
dogsEl.setAttribute('aria-label', `${dogs.names}, ${dogs.year}`);
// Races as their logos, small, on the wheel at their year and month (named on hover).
const raceEls = races.map((rc) => {
  const el = div('lx-race', body, `<img class="lx-race__pic" src="${rc.logo}" alt="" /><span class="lx-race__cap"><span>${rc.name}</span><span>${rc.when}</span></span>`);
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', `${rc.name}, ${rc.when}`);
  return el;
});

// The origin ("Grant" at the centre of About) opens a small card: headshot,
// two plain sentences, and how to reach him.
const bare = (href) => href.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
const originBtn = div('lx-origin', body);
originBtn.setAttribute('role', 'button');
originBtn.tabIndex = 0;
originBtn.setAttribute('aria-label', `About ${site.name}`);
originBtn.setAttribute('aria-haspopup', 'dialog');
originBtn.setAttribute('aria-expanded', 'false');
const introEl = div(
  'lx-intro',
  body,
  `<button class="lx-intro__close" type="button" aria-label="Close">×</button>
  <div class="lx-intro__head">
    ${intro.headshot ? `<img class="lx-intro__photo" src="${intro.headshot}" alt="${site.name}" />` : '<span class="lx-intro__photo lx-intro__photo--todo" aria-hidden="true">headshot</span>'}
    <span class="lx-intro__name">${site.name}</span>
  </div>
  ${intro.lines.map((l) => `<p class="lx-intro__line">${l}</p>`).join('')}
  <ul class="lx-intro__links">
    ${site.email ? `<li><a href="mailto:${site.email}"><span>Email</span><span>${site.email}</span></a></li>` : '<li class="is-todo"><span>Email</span><span>to add</span></li>'}
    ${site.links
      .filter((l) => l.label === 'LinkedIn')
      .map((l) => `<li><a href="${l.href}" target="_blank" rel="noopener"><span>${l.label}</span><span>${bare(l.href)} ↗</span></a></li>`)
      .join('')}
  </ul>`,
);
introEl.setAttribute('role', 'dialog');
introEl.setAttribute('aria-label', `About ${site.name}`);
introEl.hidden = true;
function setIntro(open) {
  introEl.hidden = !open;
  originBtn.setAttribute('aria-expanded', String(open));
  if (open) {
    const p = originBtn.getBoundingClientRect();
    const w = Math.min(320, innerWidth - 32);
    introEl.style.width = `${w}px`;
    // Beside the origin on wide screens, centred on phones.
    const x = innerWidth < 760 ? (innerWidth - w) / 2 : Math.min(innerWidth - w - 16, p.right + 16);
    const y = innerWidth < 760 ? Math.max(96, p.top - 40) : Math.max(96, Math.min(innerHeight - introEl.offsetHeight - 120, p.top - 40));
    introEl.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px)`;
    introEl.querySelector('.lx-intro__close').focus({ preventScroll: true });
  }
}
originBtn.addEventListener('click', () => setIntro(introEl.hidden));
originBtn.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    setIntro(introEl.hidden);
  }
});
introEl.querySelector('.lx-intro__close').addEventListener('click', () => {
  setIntro(false);
  originBtn.focus({ preventScroll: true });
});
document.addEventListener('pointerdown', (e) => {
  if (!introEl.hidden && !introEl.contains(e.target) && !originBtn.contains(e.target)) setIntro(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !introEl.hidden) {
    setIntro(false);
    originBtn.focus({ preventScroll: true });
  }
});

/** Jaylee and Helga and the race logos take their spots on About's wheel; the origin gets its button. */
function placeDogs() {
  const P = polarFrame(layouts.reality.R);
  originBtn.style.transform = `translate(${(P.cx - 46).toFixed(1)}px, ${(P.cy - 18).toFixed(1)}px)`;
  const p = layouts.reality.dogs;
  dogsEl.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
  layouts.reality.races.forEach((k, i) => (raceEls[i].style.transform = `translate(${k.x.toFixed(1)}px, ${k.y.toFixed(1)}px)`));
}

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
  if (it.worked) el.dataset.worked = '';
  if (it.home?.born) el.dataset.born = '';
  el.setAttribute('role', 'listitem');
  el.setAttribute('aria-label', `${it.title} — open`);
  el.innerHTML = `
    <span class="lx-tile__frame">
      <span class="lx-tile__ghost lx-tile__ghost--2"></span>
      <span class="lx-tile__ghost lx-tile__ghost--1"></span>
      <span class="lx-tile__pics"><canvas></canvas><canvas></canvas></span>
    </span>
    <span class="lx-tile__cap"><span class="lx-tile__title${it.phone != null ? ' has-phone' : ''}">${it.logo?.icon ? `<img class="lx-tile__icon" src="${it.logo.src}" alt="" />` : ''}<span class="lx-tile__long">${it.title}</span>${it.phone ? `<span class="lx-tile__phone">${it.phone}</span>` : ''}</span><span class="lx-tile__meta"></span>${it.logo && !it.logo.icon ? `<img class="lx-tile__logo" src="${it.logo.src}" alt="${it.logo.alt}" />` : ''}</span>`;
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

// Real pictures load once; as each arrives, its renders are redone and its tile repainted.
for (const ready of preloadPictures(items)) {
  ready.then((id) => {
    if (!id) return;
    forget(id);
    const t = tileById.get(id);
    if (t && t.show >= 0 && !T && mode) paint(t, t.show, mode);
  });
}

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
let geo = null; // { land, countries } for the Travel map
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
  // The map always opens on the whole picture.
  if (id === 'place' && mapZoom().k > 1) {
    setMapZoom(1, 0, 0);
    layouts.place = layout('place', W, H);
  }
  mapUi.classList.remove('is-on');
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
  drawOverlay(id);
  bgOld.style.background = first ? PALETTE[id].bg : rgbToCss(palette.bg.value);

  const pal = PALETTE[id];
  for (const k in palette) palette[k].set(hexToRgb(pal[k]), now, first ? 0.001 : SWEEP);

  const md = modes.find((m) => m.id === id);
  lg.kicker.textContent = `${String(MODE_IDS.indexOf(id) + 1).padStart(2, '0')} · ${md.section}`;
  lg.title.textContent = systems[id].title;
  lg.axes.textContent = READOUT[id] ?? systems[id].readout;
  hint.textContent = HINT[id] ?? 'Click any piece of work to open it';
  quietEl.classList.toggle('is-on', id === 'reality');
  placeDogs();
  dogsEl.classList.toggle('is-on', id === 'reality');
  originBtn.classList.toggle('is-on', id === 'reality');
  if (id !== 'reality') setIntro(false);
  for (const el of raceEls) el.classList.toggle('is-on', id === 'reality');
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
    // The map data may have arrived mid-sweep; draw the map with it now.
    if (mode === 'place' && geo && !ovNew.dataset.geo) drawOverlay(mode);
    if (mode === 'place') showMapUi();
    bgOld.style.clipPath = 'inset(0 0 0 100%)';
    drawDyn();
    warm();
  }
}

/** The incoming section's drawing (noting whether the map had its data yet). */
function drawOverlay(id) {
  ovNew.replaceChildren(overlay(id, layouts[id].R, W, H, geo));
  ovNew.dataset.geo = geo ? '1' : '';
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
  tl.el.classList.toggle('show-logo', !!tl.it.logo?.in.includes(mode));
  tl.el.dataset.cap = tl.to.capSide ?? '';
  tl.el.style.setProperty('--cap-dx', `${(tl.to.capDx ?? 0).toFixed(1)}px`);
  tl.el.style.setProperty('--cap-dy', `${(tl.to.capDy ?? 0).toFixed(1)}px`);
  tl.meta.textContent = metaFor(tl.it, mode);
}

function setOut(tl, out) {
  tl.hidden = out;
  tl.el.classList.toggle('is-out', out);
  tl.el.inert = out;
}

/* ── Leaders, anchors, links (drawn once a section settles) ───────────────── */

function drawDyn() {
  const pal = PALETTE[mode];
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
    // On the map the dot is the coordinate.
    if (mode === 'place') continue;
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

/* ── Travel map: zoom and pan ─────────────────────────────────────────────── */

// A layer over the map's frame takes the wheel, drags and pinches (the dots
// sit above it and stay clickable); buttons zoom in, out and back to the fit.
const mapHit = div('lx-maphit', body);
const mapUi = div(
  'lx-mapui',
  body,
  `<button type="button" data-zoom="in" aria-label="Zoom in">+</button><button type="button" data-zoom="out" aria-label="Zoom out">−</button><button type="button" data-zoom="fit" aria-label="Show the whole map">fit</button>`,
);
const fitBtn = mapUi.querySelector('[data-zoom="fit"]');
const darkroomClosed = () => document.querySelector('.dk')?.hidden !== false;

function showMapUi() {
  const F = mapFrame(layouts.place.R);
  Object.assign(mapHit.style, { left: `${F.x}px`, top: `${F.y}px`, width: `${F.w}px`, height: `${F.h}px` });
  mapUi.style.transform = `translate(${(F.x + F.w - 8).toFixed(1)}px, ${(F.y + 8).toFixed(1)}px)`;
  mapUi.classList.add('is-on');
  syncZoomUi();
}

function syncZoomUi() {
  const z = mapZoom();
  fitBtn.disabled = z.k <= 1.001;
  mapUi.querySelector('[data-zoom="in"]').disabled = z.k >= MAX_ZOOM - 0.01;
  mapUi.querySelector('[data-zoom="out"]').disabled = z.k <= 1.001;
  mapHit.classList.toggle('is-zoomed', z.k > 1.001);
}

/** Re-lay the map for the current zoom: dots, labels and drawing, without a sweep. */
let mapRaf = 0;
function mapRefresh() {
  mapRaf = 0;
  if (mode !== 'place' || T) return;
  layouts.place = layout('place', W, H);
  const L = layouts.place;
  for (const t of tiles) {
    const target = L.tiles.get(t.it.id);
    if (target.hidden) continue;
    t.to = target;
    t.from = target;
    Object.assign(t, { x: target.x, y: target.y, w: target.w, h: target.h });
    place(t);
    t.el.classList.toggle('has-cap', target.cap);
    t.el.dataset.cap = target.capSide ?? '';
    t.el.style.setProperty('--cap-dx', `${(target.capDx ?? 0).toFixed(1)}px`);
    t.el.style.setProperty('--cap-dy', `${(target.capDy ?? 0).toFixed(1)}px`);
    if (!!t.hidden !== !!target.off) setOut(t, !!target.off);
  }
  const svg = ovNew.querySelector('.lx-ov');
  const wantDetail = !!geo?.detail && mapZoom().k >= DETAIL_ZOOM;
  if (!svg || (svg.dataset.detail === 'hi') !== wantDetail) drawOverlay('place');
  else updateMap(svg, L.R, W);
  syncZoomUi();
  // Close in, fetch the finer coastlines once.
  if (mapZoom().k >= 2 && !geo?.detail && geo) {
    loadDetail().then((detail) => {
      geo = { ...geo, detail };
      kickMap();
    });
  }
}
const kickMap = () => {
  if (!mapRaf) mapRaf = requestAnimationFrame(mapRefresh);
};

/** Zoom by `factor` around the screen point (px, py), keeping that spot under it. */
function zoomAt(factor, px, py) {
  const F = mapFrame(layouts.place.R);
  const { b } = F;
  const z = mapZoom();
  const k = Math.min(MAX_ZOOM, Math.max(1, z.k * factor));
  const lon = b.west + ((px - F.x) / F.w) * (b.east - b.west);
  const lat = b.north - ((py - F.y) / F.h) * (b.north - b.south);
  const lonSpan = (F.fit.east - F.fit.west) / k;
  const latSpan = (F.fit.north - F.fit.south) / k;
  setMapZoom(k, lon - ((px - F.x) / F.w - 0.5) * lonSpan, lat + ((py - F.y) / F.h - 0.5) * latSpan);
  kickMap();
}

function panBy(dx, dy) {
  const F = mapFrame(layouts.place.R);
  const { b } = F;
  const z = mapZoom();
  const lonSpan = b.east - b.west;
  const latSpan = b.north - b.south;
  // Start from the clamped centre so panning back from an edge responds at once.
  setMapZoom(z.k, (b.west + b.east) / 2 - (dx / F.w) * lonSpan, (b.south + b.north) / 2 + (dy / F.h) * latSpan);
  kickMap();
}

// Buttons ease to their zoom over a few frames.
let zoomAnim = 0;
function animateZoom(to, px, py) {
  cancelAnimationFrame(zoomAnim);
  const from = mapZoom().k;
  const t0 = performance.now();
  let last = from;
  const step = (now) => {
    const k = clamp((now - t0) / 260);
    const target = from * (to / from) ** ease.inOutCubic(k);
    zoomAt(target / last, px, py);
    last = target;
    if (k < 1) zoomAnim = requestAnimationFrame(step);
  };
  zoomAnim = requestAnimationFrame(step);
}

mapUi.addEventListener('click', (e) => {
  const b = e.target.closest('[data-zoom]');
  if (!b || mode !== 'place') return;
  const F = mapFrame(layouts.place.R);
  const [cx, cy] = [F.x + F.w / 2, F.y + F.h / 2];
  const k = mapZoom().k;
  if (b.dataset.zoom === 'in') animateZoom(Math.min(MAX_ZOOM, k * 2), cx, cy);
  else if (b.dataset.zoom === 'out') animateZoom(Math.max(1, k / 2), cx, cy);
  else animateZoom(1, cx, cy);
});

// The wheel works anywhere over the map, dots included.
window.addEventListener(
  'wheel',
  (e) => {
    if (mode !== 'place' || T || body.classList.contains('lx-page-open') || !darkroomClosed()) return;
    const F = mapFrame(layouts.place.R);
    if (e.clientX < F.x || e.clientX > F.x + F.w || e.clientY < F.y || e.clientY > F.y + F.h) return;
    e.preventDefault();
    // Trackpad pinches arrive as ctrl+wheel with small deltas.
    const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    zoomAt(Math.exp(-d * (e.ctrlKey ? 0.01 : 0.0018)), e.clientX, e.clientY);
  },
  { passive: false },
);

// Drag to pan; two fingers pinch.
const pointers = new Map();
let pinch = null;
mapHit.addEventListener('pointerdown', (e) => {
  if (mode !== 'place' || T) return;
  mapHit.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  mapHit.classList.add('is-dragging');
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) };
  }
});
mapHit.addEventListener('pointermove', (e) => {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  const prev = { ...p };
  p.x = e.clientX;
  p.y = e.clientY;
  if (pointers.size === 2 && pinch) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    zoomAt(d / pinch.d, (a.x + b.x) / 2, (a.y + b.y) / 2);
    pinch.d = d;
  } else if (pointers.size === 1 && mapZoom().k > 1) panBy(p.x - prev.x, p.y - prev.y);
});
const endPointer = (e) => {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch = null;
  if (!pointers.size) mapHit.classList.remove('is-dragging');
};
mapHit.addEventListener('pointerup', endPointer);
mapHit.addEventListener('pointercancel', endPointer);
mapHit.addEventListener('dblclick', (e) => {
  if (mode === 'place' && !T) animateZoom(Math.min(MAX_ZOOM, mapZoom().k * 2), e.clientX, e.clientY);
});

/* ── Boot ─────────────────────────────────────────────────────────────────── */

const switcher = mountSwitcher({
  // "Digital · digital" would repeat itself; that tab's look is seen as a system.
  items: modes.map((m) => ({ id: m.id, label: m.section, sub: m.id === 'digital' ? 'system' : m.name.toLowerCase() })),
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

Promise.all([loadLand(), loadCountries()]).then(([land, countries]) => {
  geo = { ...geo, land, countries };
  if (mode === 'place' && !T) drawOverlay('place');
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
    placeDogs();
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
      t.el.dataset.cap = t.to.capSide ?? '';
      t.el.style.setProperty('--cap-dx', `${(t.to.capDx ?? 0).toFixed(1)}px`);
      t.el.style.setProperty('--cap-dy', `${(t.to.capDy ?? 0).toFixed(1)}px`);
    }
    drawOverlay(mode);
    if (mode === 'place' && !T) showMapUi();
    if (!T) drawDyn();
    warm();
  }, 160);
});
