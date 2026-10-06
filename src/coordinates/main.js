import '../shared/base.css';
import './style.css';
import { mountChrome, mountSwitcher, prefersReducedMotion } from '../shared/chrome.js';
import { items, modes } from '../content.js';
import { Tween, ease, lerp, clamp, hexToRgb, rgbToCss, hashString } from '../anim.js';
import { loadLand, landPath } from '../shared/geo.js';
import {
  systems,
  polarLayout,
  buildLayout,
  mapBounds,
  graticule,
  relatedPairs,
  travelRoute,
  focusKind,
  yearToRing,
} from './systems.js';
import { thumbnail } from './thumb.js';

mountChrome('coordinates');

const SVGNS = 'http://www.w3.org/2000/svg';
const MODE_IDS = modes.map((m) => m.id);
const byId = new Map(items.map((it) => [it.id, it]));
const svgEl = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(SVGNS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  parent?.appendChild(n);
  return n;
};
const div = (cls, parent, html) => {
  const n = document.createElement('div');
  n.className = cls;
  if (html != null) n.innerHTML = html;
  parent?.appendChild(n);
  return n;
};

/* ── DOM scaffold ─────────────────────────────────────────────────────────── */

const plot = div('plot', document.body);
plot.setAttribute('aria-hidden', 'true');
const svg = svgEl('svg', { class: 'plot__svg' }, plot);
const defs = svgEl('defs', {}, svg);
defs.innerHTML = `
  <pattern id="dots" patternUnits="userSpaceOnUse" width="1.1" height="1.1">
    <circle cx="0.55" cy="0.55" r="0.26" />
  </pattern>
  <clipPath id="mapclip"><rect id="mapclip-rect" /></clipPath>
  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0,1 L9,5 L0,9" fill="none" stroke="context-stroke" stroke-width="1.4" />
  </marker>`;
const mapClipRect = defs.querySelector('#mapclip-rect');

const gMap = svgEl('g', { class: 'map', 'clip-path': 'url(#mapclip)' }, svg);
const landEl = svgEl('path', { class: 'map__land' }, gMap);
const gGrid = svgEl('g', { class: 'grid' }, svg);
const gRings = svgEl('g', { class: 'rings' }, svg);
const gRadials = svgEl('g', { class: 'radials' }, svg);
const gBars = svgEl('g', { class: 'bars' }, svg);
const gLinks = svgEl('g', { class: 'links' }, svg);
const gRoute = svgEl('g', { class: 'route' }, svg);
const gPins = svgEl('g', { class: 'pins' }, svg);
const gAxes = svgEl('g', { class: 'axes' }, svg);
const axisX = svgEl('line', { class: 'axis', 'marker-end': 'url(#arrow)' }, gAxes);
const axisY = svgEl('line', { class: 'axis', 'marker-end': 'url(#arrow)' }, gAxes);

const tickLayer = div('ticks', plot);
const axisLabels = {
  xEnd: div('axis-label axis-label--x-end', plot),
  xStart: div('axis-label axis-label--x-start', plot),
  yEnd: div('axis-label axis-label--y-end', plot),
  yStart: div('axis-label axis-label--y-start', plot),
};
const ringLabels = div('ring-labels', plot);

const you = div('you', document.body, `<span class="you__dot"></span><span class="you__name">Grant</span><span class="you__sub">origin</span>`);
you.setAttribute('aria-hidden', 'true');

const legend = div('legend', document.body);
legend.innerHTML = `
  <span class="legend__section"></span>
  <h1 class="legend__title"></h1>
  <p class="legend__readout"></p>
  <p class="legend__blurb"></p>`;
const legendEls = {
  section: legend.querySelector('.legend__section'),
  title: legend.querySelector('.legend__title'),
  readout: legend.querySelector('.legend__readout'),
  blurb: legend.querySelector('.legend__blurb'),
};

const nodeLayer = div('nodes', document.body);
nodeLayer.setAttribute('role', 'list');
nodeLayer.setAttribute('aria-label', 'Work');

const detail = document.createElement('aside');
detail.className = 'detail';
detail.setAttribute('aria-live', 'polite');
document.body.appendChild(detail);

/* ── Nodes ────────────────────────────────────────────────────────────────── */

const nodes = items.map((it, i) => {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'node';
  el.dataset.kind = it.kind;
  el.setAttribute('role', 'listitem');
  el.innerHTML = `
    <span class="node__mark"><img class="node__thumb" alt="" /></span>
    <span class="node__label"><span class="node__title">${it.title}</span><span class="node__meta"></span></span>`;
  nodeLayer.appendChild(el);
  const n = {
    it,
    i,
    el,
    mark: el.querySelector('.node__mark'),
    label: el.querySelector('.node__label'),
    meta: el.querySelector('.node__meta'),
    thumb: el.querySelector('.node__thumb'),
    x: innerWidth / 2,
    y: innerHeight / 2,
    tx: 0,
    ty: 0,
    from: [innerWidth / 2, innerHeight / 2],
    bend: ((hashString(it.id) % 1000) / 1000 - 0.5) * 0.5,
    delay: 0,
    labelBox: null,
  };
  el.addEventListener('click', () => select(n.it.id));
  el.addEventListener('pointerenter', () => hover(n.it.id));
  el.addEventListener('pointerleave', () => hover(null));
  el.addEventListener('focus', () => hover(n.it.id));
  el.addEventListener('blur', () => hover(null));
  return n;
});
const nodeById = new Map(nodes.map((n) => [n.it.id, n]));

// Thumbnails are generated lazily the first time the Art system is shown.
let thumbsReady = false;
function ensureThumbs() {
  if (thumbsReady) return;
  thumbsReady = true;
  for (const n of nodes) n.thumb.src = thumbnail(n.it.id);
}

/* ── Overlay pools ────────────────────────────────────────────────────────── */

const makeLines = (parent, count, cls) =>
  Array.from({ length: count }, () => ({ el: svgEl('line', { class: cls }, parent), cur: [0, 0, 0, 0, 0], from: [0, 0, 0, 0, 0] }));

const GRID_V = 24;
const GRID_H = 14;
const gridV = makeLines(gGrid, GRID_V, 'grid__line');
const gridH = makeLines(gGrid, GRID_H, 'grid__line');

const RING_YEARS = systems.reality.rings;
const rings = RING_YEARS.map((year) => ({
  year,
  el: svgEl('ellipse', { class: 'ring' }, gRings),
  cur: [0, 0, 0, 0, 0],
  from: [0, 0, 0, 0, 0],
}));
const ringLabelEls = RING_YEARS.filter((y) => y % 2 === 0).map((year) => {
  const n = div('ring-label', ringLabels, String(year));
  return { year, el: n };
});

const radials = nodes.map(() => svgEl('line', { class: 'radial' }, gRadials));
const bars = nodes.map(() => svgEl('line', { class: 'bar' }, gBars));
const links = relatedPairs.map(([a, b]) => ({ a, b, el: svgEl('line', { class: 'link' }, gLinks) }));
const routeEl = svgEl('path', { class: 'route__path' }, gRoute);

const axes = { x: { el: axisX, cur: [0, 0, 0, 0, 0], from: [0, 0, 0, 0, 0] }, y: { el: axisY, cur: [0, 0, 0, 0, 0], from: [0, 0, 0, 0, 0] } };

/* ── Geometry of the current viewport ─────────────────────────────────────── */

let W = innerWidth;
let H = innerHeight;
const isMobile = () => W < 760;

// Everything starts folded into the centre, then unfolds into the first system.
for (const l of [...gridV, ...gridH, axes.x, axes.y]) l.cur = [W / 2, H / 2, W / 2, H / 2, 0];
for (const r of rings) r.cur = [W / 2, H / 2, 0, 0, 0];

function plotRect() {
  const m = isMobile();
  const top = m ? 168 : 196;
  const bottom = m ? 158 : 168;
  const left = m ? 68 : Math.max(110, W * 0.09);
  const right = m ? 26 : Math.max(90, W * 0.08);
  return { x: left, y: top, w: Math.max(120, W - left - right), h: Math.max(120, H - top - bottom) };
}

const polar = polarLayout();
let buildPos = new Map();
let bounds = null;
let land = null;

function frameFor(id, R) {
  const s = systems[id];
  if (s.frame === 'polar') {
    const cx = R.x + R.w / 2;
    const cy = R.y + R.h / 2;
    const ry = R.h / 2;
    const rx = Math.min(R.w / 2, ry * 1.7);
    return { type: 'polar', cx, cy, rx, ry, R };
  }
  if (s.frame === 'map') {
    // A world map can't go much taller than wide; letterbox narrow screens.
    const MIN_ASPECT = 1.15;
    let MR = R;
    if (R.w / R.h < MIN_ASPECT) {
      const h = R.w / MIN_ASPECT;
      MR = { x: R.x, y: R.y + (R.h - h) * 0.4, w: R.w, h };
    }
    const aspect = MR.w / MR.h;
    if (!bounds || Math.abs(bounds.aspect - aspect) > 0.01) bounds = { ...mapBounds(aspect), aspect };
    return { type: 'map', R: MR, b: bounds };
  }
  return { type: 'cart', R, cross: s.axes === 'cross' };
}

const toPx = (R, u, v) => [R.x + u * R.w, R.y + (1 - v) * R.h];
const pad = (u, m = 0.04) => m + (1 - 2 * m) * u;

// Co-located items on the map fan out around their shared pin.
const clusters = (() => {
  const groups = new Map();
  for (const it of items) {
    const key = `${Math.round(it.place.lat / 3)},${Math.round(it.place.lon / 3)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(it);
  }
  const out = new Map();
  for (const list of groups.values()) {
    const lat = list.reduce((s, i) => s + i.place.lat, 0) / list.length;
    const lon = list.reduce((s, i) => s + i.place.lon, 0) / list.length;
    list.forEach((it, k) => out.set(it.id, { lat, lon, k, n: list.length, lead: list.find((x) => x.kind === 'travel') ?? list[0] }));
  }
  return out;
})();

// Big clusters get one summary label instead of a pile of overlapping ones.
const clusterLabels = (() => {
  const seen = new Map();
  for (const [, c] of clusters) if (c.n > 2) seen.set(`${c.lat},${c.lon}`, c);
  return [...seen.values()].map((c) => {
    const members = items.filter((it) => clusters.get(it.id).lat === c.lat && clusters.get(it.id).lon === c.lon);
    const names = members.map((it) => it.place.name);
    const title = names.some((nm) => /home/i.test(nm))
      ? 'Home base'
      : names.sort((a, b) => names.filter((x) => x === b).length - names.filter((x) => x === a).length)[0];
    const el = div('cluster-label', plot, `<span class="cluster-label__title">${title}</span><span class="cluster-label__meta">${c.n} items · hover a dot</span>`);
    const pos = (F) => {
      const { R, b } = F;
      const [x, y] = toPx(R, (c.lon - b.west) / (b.east - b.west), (c.lat - b.south) / (b.north - b.south));
      return [x, y + (isMobile() ? 26 : 34)];
    };
    return {
      el,
      pos,
      box: (F) => {
        const [x, y] = pos(F);
        return { x: x - 70, y, w: 140, h: 32 };
      },
    };
  });
})();

function targetFor(n, F, id) {
  const it = n.it;
  if (F.type === 'polar') {
    const p = polar.get(it.id);
    return [F.cx + Math.cos(p.theta) * p.r * F.rx, F.cy + Math.sin(p.theta) * p.r * F.ry];
  }
  if (F.type === 'map') {
    const c = clusters.get(it.id);
    const { b, R } = F;
    const [x, y] = toPx(R, (c.lon - b.west) / (b.east - b.west), (c.lat - b.south) / (b.north - b.south));
    if (c.n === 1) return [x, y];
    const r = (isMobile() ? 7 : 9) * Math.sqrt(c.k + 0.6);
    const a = c.k * 2.39996 + 0.6;
    return [x + Math.cos(a) * r, y + Math.sin(a) * r];
  }
  if (id === 'build') {
    const p = buildPos.get(it.id);
    return toPx(F.R, p.u0, p.v);
  }
  const [u, v] = systems[id].pos(it);
  const m = F.cross ? 0.06 : 0.035;
  return toPx(F.R, pad(u, m), pad(v, m));
}

/* ── Labels: greedy placement so nothing overlaps ─────────────────────────── */

const CHAR_W = { reality: 6.6, structure: 6.5, build: 6.7, image: 6.1, place: 6.4, digital: 6.4 };
const MARK = { image: [64, 42] };

function metaFor(it, id) {
  const yrs = it.years[0] === it.years[1] ? `${it.years[0]}` : `${it.years[0]}–${String(it.years[1]).slice(2)}`;
  const f = (v) => v.toFixed(2).replace(/^0/, '');
  switch (id) {
    case 'reality':
      return yrs;
    case 'structure':
      return `S ${f(it.axes.scale)} · C ${f(it.axes.complexity)}`;
    case 'build':
      return `${it.stage} · ${yrs}`;
    case 'image':
      return yrs;
    case 'place': {
      const { lat, lon } = it.place;
      return `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`;
    }
    case 'digital':
      return `d ${f(it.axes.digital)} · f ${f(it.axes.finished)}`;
    default:
      return '';
  }
}

function isQuiet(it, id) {
  if (it.id === selected) return false;
  if (systems[id].quietKinds?.includes(it.kind)) return true;
  if (id !== 'place') return false;
  const c = clusters.get(it.id);
  return c.n > 2 && it.kind !== 'travel';
}

function placeLabels(id) {
  const m = isMobile();
  const cw = CHAR_W[id] * (m ? 0.92 : 1);
  const [mw, mh] = MARK[id] ?? [10, 10];
  const placed = [];
  const hit = (box) => placed.some((p) => box.x < p.x + p.w && box.x + box.w > p.x && box.y < p.y + p.h && box.y + box.h > p.y);
  const order = [...nodes].sort((a, b) => {
    const pa = (a.it.id === selected ? -10 : 0) + (a.it.kind === focusKind[id] ? -1 : 0);
    const pb = (b.it.id === selected ? -10 : 0) + (b.it.kind === focusKind[id] ? -1 : 0);
    return pa - pb || a.i - b.i;
  });
  // Markers, ring labels and cluster labels are obstacles too.
  for (const n of nodes) placed.push({ x: n.tx - mw / 2 - 2, y: n.ty - mh / 2 - 2, w: mw + 4, h: mh + 4 });
  if (id === 'reality') {
    const P = frameFor('reality', plotRect());
    for (const rl of ringLabelEls) {
      const x = P.cx - P.rx * (0.18 + 0.82 * yearToRing(rl.year));
      placed.push({ x: x - 20, y: P.cy - 9, w: 40, h: 18 });
    }
  }
  if (id === 'place') for (const cl of clusterLabels) placed.push(cl.box(frameFor('place', plotRect())));

  const lim = { x0: 8, y0: m ? 120 : 150, x1: W - 8, y1: H - (m ? 110 : 120) };
  for (const n of order) {
    const it = n.it;
    const meta = metaFor(it, id);
    const showMeta = !m || id === 'place';
    const w = Math.max(it.title.length, showMeta ? meta.length : 0) * cw + 10;
    const h = showMeta ? (id === 'image' ? 34 : 30) : 17;
    const gap = 8;
    const cands =
      id === 'image'
        ? [
            [-w / 2, mh / 2 + 6],
            [-w / 2, -mh / 2 - h - 6],
            [mw / 2 + gap, -h / 2],
            [-mw / 2 - gap - w, -h / 2],
          ]
        : id === 'build'
          ? [
              [0, -h - 3],
              [mw / 2 + gap, -h / 2],
              [-mw / 2 - gap - w, -h / 2],
              [0, mh / 2 + 3],
            ]
          : [
              [mw / 2 + gap, -h / 2],
              [-mw / 2 - gap - w, -h / 2],
              [mw / 2 + 2, -h - 4],
              [mw / 2 + 2, 4],
              [-w - mw / 2 - 2, -h - 4],
              [-w - mw / 2 - 2, 4],
            ];
    let choice = null;
    const quiet = isQuiet(it, id);
    if (!quiet) {
      for (const [dx, dy] of cands) {
        const box = { x: n.tx + dx, y: n.ty + dy, w, h };
        if (box.x < lim.x0 || box.x + w > lim.x1 || box.y < lim.y0 || box.y + h > lim.y1 || hit(box)) continue;
        choice = [dx, dy];
        placed.push(box);
        break;
      }
    }
    n.el.classList.toggle('is-quiet', !choice);
    const [dx, dy] = choice ?? cands[0];
    n.label.style.setProperty('--dx', `${dx}px`);
    n.label.style.setProperty('--dy', `${dy}px`);
    n.label.dataset.align = dx < 0 && id !== 'image' && id !== 'build' ? 'end' : 'start';
    n.meta.textContent = meta;
    n.meta.hidden = !showMeta;
  }
}

/* ── Mode transitions ─────────────────────────────────────────────────────── */

const reduced = prefersReducedMotion();
let mode = null;
let selected = null;
let hovered = null;
const trans = { t0: 0, dur: 0.001, swapped: true };
const weights = new Tween(MODE_IDS.map(() => 0), ease.inOutCubic);
const palette = {
  bg: new Tween(hexToRgb('#ece8e1')),
  ink: new Tween(hexToRgb('#1f1d1a')),
  muted: new Tween(hexToRgb('#8a8378')),
  accent: new Tween(hexToRgb('#c2552d')),
};
let tickSet = null;
const now = () => performance.now() / 1000;

function setMode(id) {
  const t = now();
  const first = mode === null;
  mode = id;
  const s = systems[id];
  const dur = reduced ? (first ? 0.001 : 0.3) : first ? 1.5 : id === 'place' ? 2.1 : 1.65;
  trans.t0 = t;
  trans.dur = dur;
  trans.swapped = false;

  weights.set(
    MODE_IDS.map((m) => (m === id ? 1 : 0)),
    t,
    dur,
  );
  // Colours flip quickly around the midpoint so the in-between greys are brief.
  for (const k in palette) palette[k].set(hexToRgb(s.palette[k]), t, dur * 0.5, dur * 0.2, ease.inOutCubic);

  if (id === 'image') ensureThumbs();
  if (id === 'build') recomputeBuild();

  // Capture where everything is now; targets are computed per frame.
  const order = [...nodes].sort((a, b) => a.x - b.x);
  order.forEach((n, k) => {
    n.from = [n.x, n.y];
    n.delay = reduced ? 0 : (k / nodes.length) * 0.32;
  });
  for (const l of [...gridV, ...gridH, ...rings, axes.x, axes.y]) l.from = l.cur.slice();

  const md = modes.find((m) => m.id === id);
  scramble(legendEls.section, md.section);
  scramble(legendEls.title, s.title);
  scramble(legendEls.readout, s.readout);
  legendEls.blurb.textContent = md.blurb;
}

function recomputeBuild() {
  const R = plotRect();
  const cw = CHAR_W.build * (isMobile() ? 0.92 : 1);
  const widths = new Map(items.map((it) => [it.id, Math.max(it.title.length, it.stage.length + 8) * cw + 18]));
  buildPos = buildLayout(R.w, widths);
}

// Midpoint of a transition: swap the visual language (fonts, label text, ticks).
function swap() {
  trans.swapped = true;
  document.body.dataset.mode = mode;
  const R = plotRect();
  const F = frameFor(mode, R);
  for (const n of nodes) [n.tx, n.ty] = targetFor(n, F, mode);
  placeLabels(mode);
  buildTicks(mode, F);
  const s = systems[mode];
  setAxisLabel(axisLabels.xEnd, s.x?.label ?? '');
  setAxisLabel(axisLabels.yEnd, s.y?.label ?? '');
  setAxisLabel(axisLabels.xStart, s.x?.start ?? '');
  setAxisLabel(axisLabels.yStart, s.y?.start ?? '');
  axisX.setAttribute('marker-start', s.axes === 'cross' ? 'url(#arrow)' : '');
  axisY.setAttribute('marker-start', s.axes === 'cross' ? 'url(#arrow)' : '');
  if (selected) renderDetail();
}

function setAxisLabel(el, text) {
  el.classList.toggle('is-empty', !text);
  if (text) scramble(el, text);
}

function buildTicks(id, F) {
  if (tickSet) {
    const old = tickSet;
    old.el.classList.add('is-leaving');
    setTimeout(() => old.el.remove(), 700);
  }
  const s = systems[id];
  const el = div('tickset', tickLayer);
  const list = [];
  const add = (text, axis, at) => {
    const t = div(`tick tick--${axis}`, el, text);
    list.push({ el: t, axis, at });
  };
  if (F.type === 'map') {
    const g = graticule(F.b);
    for (const lon of g.lons) add(`${Math.abs(lon)}°${lon < 0 ? 'W' : lon > 0 ? 'E' : ''}`, 'x', (lon - F.b.west) / (F.b.east - F.b.west));
    for (const lat of g.lats) add(`${Math.abs(lat)}°${lat < 0 ? 'S' : lat > 0 ? 'N' : ''}`, 'y', (lat - F.b.south) / (F.b.north - F.b.south));
  } else if (F.type === 'cart') {
    for (const tk of s.x?.ticks ?? []) add(tk.label, 'x', tk.at);
    for (const tk of s.y?.ticks ?? []) add(tk.label, 'y', tk.at);
  }
  tickSet = { el, list };
  requestAnimationFrame(() => el.classList.add('is-in'));
}

/* ── Per-frame targets for overlays ───────────────────────────────────────── */

function gridTargets(F, id) {
  const s = systems[id];
  const out = { v: [], h: [], dash: '' };
  if (F.type === 'cart') {
    const { R } = F;
    const op = id === 'structure' ? 1 : id === 'build' ? 0.75 : id === 'digital' ? 0.9 : 0;
    for (const u of s.gridU) out.v.push([R.x + u * R.w, R.y, R.x + u * R.w, R.y + R.h, op]);
    for (const v of s.gridV) out.h.push([R.x, R.y + (1 - v) * R.h, R.x + R.w, R.y + (1 - v) * R.h, op]);
  } else if (F.type === 'map') {
    const { R, b } = F;
    const g = graticule(b);
    for (const lon of g.lons) {
      const x = R.x + ((lon - b.west) / (b.east - b.west)) * R.w;
      out.v.push([x, R.y, x, R.y + R.h, 0.9]);
    }
    for (const lat of g.lats) {
      const y = R.y + (1 - (lat - b.south) / (b.north - b.south)) * R.h;
      out.h.push([R.x, y, R.x + R.w, y, 0.9]);
    }
  } else {
    // Polar: the grid folds into the origin.
    out.collapse = [F.cx, F.cy];
  }
  return out;
}

function applyLine(l, target, k) {
  for (let i = 0; i < 5; i++) l.cur[i] = lerp(l.from[i], target[i], k);
  const [x1, y1, x2, y2, o] = l.cur;
  l.el.setAttribute('x1', x1.toFixed(1));
  l.el.setAttribute('y1', y1.toFixed(1));
  l.el.setAttribute('x2', x2.toFixed(1));
  l.el.setAttribute('y2', y2.toFixed(1));
  l.el.style.opacity = o.toFixed(3);
}

function poolTargets(list, pool, collapse) {
  return pool.map((_, i) => {
    if (collapse) return [collapse[0], collapse[1], collapse[0], collapse[1], 0];
    if (i < list.length) return list[i];
    const last = list[list.length - 1];
    return last ? [...last.slice(0, 4), 0] : [W / 2, H / 2, W / 2, H / 2, 0];
  });
}

function axisTargets(F, id) {
  const s = systems[id];
  const o = 14;
  if (F.type === 'polar') return { x: [F.cx, F.cy, F.cx, F.cy, 0], y: [F.cx, F.cy, F.cx, F.cy, 0] };
  const { R } = F;
  if (F.type === 'map') return { x: [R.x, R.y + R.h, R.x + R.w, R.y + R.h, 0.5], y: [R.x, R.y + R.h, R.x, R.y, 0.5] };
  if (s.axes === 'cross') {
    const cx = R.x + R.w / 2;
    const cy = R.y + R.h / 2;
    return { x: [R.x - o, cy, R.x + R.w + o, cy, 0.7], y: [cx, R.y + R.h + o, cx, R.y - o, 0.7] };
  }
  return { x: [R.x, R.y + R.h, R.x + R.w + o, R.y + R.h, 1], y: [R.x, R.y + R.h, R.x, R.y - o, 1] };
}

function ringTargets(F) {
  return rings.map((r, i) => {
    if (F.type === 'polar') {
      const k = 0.18 + 0.82 * yearToRing(r.year);
      return [F.cx, F.cy, F.rx * k, F.ry * k, 1];
    }
    // Elsewhere, time expands outward and dissolves.
    const big = Math.max(W, H) * (1 + i * 0.12);
    return [W / 2, H / 2, big, big, 0];
  });
}

/* ── Frame loop ───────────────────────────────────────────────────────────── */

let lastCss = '';
function applyPalette() {
  const bg = palette.bg.value;
  const ink = palette.ink.value;
  const css = `--bg:${rgbToCss(bg)};--ink:${rgbToCss(ink)};--muted:${rgbToCss(palette.muted.value)};--accent:${rgbToCss(
    palette.accent.value,
  )};--line:${rgbToCss(ink, 0.13)};--line-strong:${rgbToCss(ink, 0.32)}`;
  if (css !== lastCss) {
    document.body.style.cssText = css;
    lastCss = css;
  }
}

function frame(ms) {
  const t = ms / 1000;
  const R = plotRect();
  const F = frameFor(mode, R);
  const p = clamp((t - trans.t0) / trans.dur);
  const k = ease.inOutCubic(p);
  const active = p < 1;

  const w = weights.update(t);
  for (const key in palette) palette[key].update(t);
  applyPalette();

  if (!trans.swapped && p >= 0.45) swap();

  // Nodes travel on gentle curves, staggered left → right.
  const maxDelay = reduced ? 0 : 0.32;
  for (const n of nodes) {
    [n.tx, n.ty] = targetFor(n, F, mode);
    if (active) {
      const span = Math.max(0.001, trans.dur - maxDelay);
      const e = ease.inOutCubic(clamp((t - trans.t0 - n.delay) / span));
      const [fx, fy] = n.from;
      const mx = (fx + n.tx) / 2 - (n.ty - fy) * n.bend;
      const my = (fy + n.ty) / 2 + (n.tx - fx) * n.bend;
      const a = (1 - e) * (1 - e);
      const b = 2 * (1 - e) * e;
      const c = e * e;
      n.x = a * fx + b * mx + c * n.tx;
      n.y = a * fy + b * my + c * n.ty;
    } else {
      n.x = n.tx;
      n.y = n.ty;
    }
    n.el.style.transform = `translate3d(${n.x.toFixed(1)}px, ${n.y.toFixed(1)}px, 0)`;
  }

  // Grid
  const gt = gridTargets(F, mode);
  const tv = poolTargets(gt.v, gridV, gt.collapse);
  const th = poolTargets(gt.h, gridH, gt.collapse);
  const kk = active ? k : 1;
  gridV.forEach((l, i) => applyLine(l, tv[i], kk));
  gridH.forEach((l, i) => applyLine(l, th[i], kk));

  // Axes
  const at = axisTargets(F, mode);
  applyLine(axes.x, at.x, kk);
  applyLine(axes.y, at.y, kk);
  positionAxisLabels();

  // Rings (polar time)
  const rt = ringTargets(F);
  rings.forEach((r, i) => {
    for (let j = 0; j < 5; j++) r.cur[j] = lerp(r.from[j], rt[i][j], kk);
    const [cx, cy, rx, ry, o] = r.cur;
    r.el.setAttribute('cx', cx.toFixed(1));
    r.el.setAttribute('cy', cy.toFixed(1));
    r.el.setAttribute('rx', Math.max(0, rx).toFixed(1));
    r.el.setAttribute('ry', Math.max(0, ry).toFixed(1));
    r.el.style.opacity = o.toFixed(3);
  });
  const wReal = w[0];
  ringLabels.style.opacity = wReal.toFixed(3);
  if (F.type === 'polar' || wReal > 0.01) {
    const P = F.type === 'polar' ? F : frameFor('reality', R);
    for (const rl of ringLabelEls) {
      rl.el.hidden = isMobile() && rl.year % 4 !== 0;
      const kR = 0.18 + 0.82 * yearToRing(rl.year);
      rl.el.style.transform = `translate3d(${(P.cx - P.rx * kR).toFixed(1)}px, ${P.cy.toFixed(1)}px, 0)`;
    }
    you.style.opacity = wReal.toFixed(3);
    you.style.transform = `translate3d(${P.cx.toFixed(1)}px, ${P.cy.toFixed(1)}px, 0) scale(${(0.6 + 0.4 * wReal).toFixed(3)})`;
  } else {
    you.style.opacity = '0';
  }

  // Radials from the origin to each item (reality)
  gRadials.style.opacity = (wReal * 0.9).toFixed(3);
  if (wReal > 0.01) {
    const P = frameFor('reality', R);
    nodes.forEach((n, i) => {
      radials[i].setAttribute('x1', P.cx.toFixed(1));
      radials[i].setAttribute('y1', P.cy.toFixed(1));
      radials[i].setAttribute('x2', n.x.toFixed(1));
      radials[i].setAttribute('y2', n.y.toFixed(1));
    });
  }

  // Duration bars (build)
  const wBuild = w[2];
  gBars.style.opacity = wBuild.toFixed(3);
  if (wBuild > 0.01 && buildPos.size) {
    nodes.forEach((n, i) => {
      const p = buildPos.get(n.it.id);
      const len = (p.u1 - p.u0) * R.w * wBuild;
      bars[i].setAttribute('x1', n.x.toFixed(1));
      bars[i].setAttribute('y1', n.y.toFixed(1));
      bars[i].setAttribute('x2', (n.x + len).toFixed(1));
      bars[i].setAttribute('y2', n.y.toFixed(1));
    });
  }

  // Links (digital)
  const wDig = w[5];
  gLinks.style.opacity = wDig.toFixed(3);
  if (wDig > 0.01) {
    for (const l of links) {
      const a = nodeById.get(l.a);
      const b = nodeById.get(l.b);
      l.el.setAttribute('x1', a.x.toFixed(1));
      l.el.setAttribute('y1', a.y.toFixed(1));
      l.el.setAttribute('x2', b.x.toFixed(1));
      l.el.setAttribute('y2', b.y.toFixed(1));
      l.el.classList.toggle('is-hot', hovered === l.a || hovered === l.b || selected === l.a || selected === l.b);
    }
  }

  // Map, pins, route (place)
  const wPlace = w[4];
  gMap.style.opacity = wPlace.toFixed(3);
  gRoute.style.opacity = Math.pow(wPlace, 3).toFixed(3);
  gPins.style.opacity = wPlace.toFixed(3);
  if (wPlace > 0.01) drawMap(F.type === 'map' ? F : frameFor('place', R), wPlace);
  for (const cl of clusterLabels) {
    cl.el.style.opacity = Math.pow(wPlace, 2).toFixed(3);
    if (wPlace > 0.01) {
      const [x, y] = cl.pos(F.type === 'map' ? F : frameFor('place', R));
      cl.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
  }

  // Ticks
  if (tickSet) positionTicks(F);

  if (active || weights.active) requestAnimationFrame(frame);
  else running = false;
}

let running = false;
function kick() {
  if (running) return;
  running = true;
  requestAnimationFrame(frame);
}

function positionAxisLabels() {
  const [x1, y1, x2, y2, ox] = axes.x.cur;
  const [, yy1, , yy2, oy] = axes.y.cur;
  const [ax] = axes.y.cur;
  const hasXTicks = tickSet?.list.some((tk) => tk.axis === 'x');
  axisLabels.xEnd.style.transform = `translate3d(${x2.toFixed(1)}px, ${(y2 + (hasXTicks ? 34 : 12)).toFixed(1)}px, 0)`;
  axisLabels.xStart.style.transform = `translate3d(${x1.toFixed(1)}px, ${(y1 + 12).toFixed(1)}px, 0)`;
  axisLabels.yEnd.style.transform = `translate3d(${(ax + 12).toFixed(1)}px, ${(yy2 - 6).toFixed(1)}px, 0)`;
  axisLabels.yStart.style.transform = `translate3d(${(ax + 12).toFixed(1)}px, ${(yy1 - 18).toFixed(1)}px, 0)`;
  const o = Math.max(ox, oy);
  for (const k in axisLabels) axisLabels[k].style.opacity = Math.min(1, o * 1.4).toFixed(3);
}

function positionTicks(F) {
  const R = F.R ?? plotRect();
  for (const tk of tickSet.list) {
    if (tk.axis === 'x') tk.el.style.transform = `translate3d(${(R.x + tk.at * R.w).toFixed(1)}px, ${(R.y + R.h + 10).toFixed(1)}px, 0)`;
    else tk.el.style.transform = `translate3d(${(R.x - 12).toFixed(1)}px, ${(R.y + (1 - tk.at) * R.h).toFixed(1)}px, 0)`;
  }
}

/* ── Map ──────────────────────────────────────────────────────────────────── */

const pinEls = new Map();
const dotPattern = defs.querySelector('#dots');
const dotCircle = dotPattern.querySelector('circle');
let dotCell = 0;
function drawMap(F, wPlace) {
  const { R, b } = F;
  mapClipRect.setAttribute('x', R.x);
  mapClipRect.setAttribute('y', R.y);
  mapClipRect.setAttribute('width', R.w);
  mapClipRect.setAttribute('height', R.h);
  const s = R.w / (b.east - b.west);
  const sy = R.h / (b.north - b.south);
  // Keep the halftone dots ~4 px apart whatever the zoom, so they never alias into stripes.
  const cell = +(4.2 / s).toFixed(3);
  if (cell !== dotCell) {
    dotCell = cell;
    dotPattern.setAttribute('width', cell);
    dotPattern.setAttribute('height', cell);
    dotCircle.setAttribute('cx', cell / 2);
    dotCircle.setAttribute('cy', cell / 2);
    dotCircle.setAttribute('r', cell * 0.27);
  }
  // Land path is in degrees (x = lon + 180, y = 90 − lat). Scale it into the frame,
  // with a slight settle so the map seems to arrive from altitude.
  const settle = 1 + (1 - wPlace) * 0.08;
  const cx = R.x + R.w / 2;
  const cy = R.y + R.h / 2;
  landEl.setAttribute(
    'transform',
    `translate(${cx} ${cy}) scale(${settle}) translate(${-cx} ${-cy}) translate(${R.x - (b.west + 180) * s} ${R.y - (90 - b.north) * sy}) scale(${s} ${sy})`,
  );
  if (land && !landEl.getAttribute('d')) landEl.setAttribute('d', landPath(land, (lon, lat) => [lon + 180, 90 - lat]));

  // Cluster pins
  for (const [, c] of clusters) {
    const key = `${c.lat},${c.lon}`;
    if (!pinEls.has(key)) {
      const g = svgEl('g', { class: 'pin' }, gPins);
      svgEl('circle', { r: 14, class: 'pin__halo' }, g);
      svgEl('circle', { r: 2.5, class: 'pin__dot' }, g);
      pinEls.set(key, g);
    }
    const [x, y] = toPx(R, (c.lon - b.west) / (b.east - b.west), (c.lat - b.south) / (b.north - b.south));
    pinEls.get(key).setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  }

  // Route between travel items, in the order they happened.
  if (travelRoute.length > 1) {
    let d = '';
    travelRoute.forEach((id, i) => {
      const n = nodeById.get(id);
      if (i === 0) d += `M${n.x.toFixed(1)},${n.y.toFixed(1)}`;
      else {
        const prev = nodeById.get(travelRoute[i - 1]);
        const mx = (prev.x + n.x) / 2;
        const my = (prev.y + n.y) / 2 - Math.abs(n.x - prev.x) * 0.22;
        d += ` Q${mx.toFixed(1)},${my.toFixed(1)} ${n.x.toFixed(1)},${n.y.toFixed(1)}`;
      }
    });
    routeEl.setAttribute('d', d);
  }
}

loadLand().then((l) => {
  land = l;
  if (mode === 'place') kick();
});

/* ── Hover, selection, detail panel ───────────────────────────────────────── */

function hover(id) {
  hovered = id;
  document.body.classList.toggle('has-hover', !!id);
  for (const n of nodes) n.el.classList.toggle('is-hover', n.it.id === id);
  if (mode === 'digital') kick();
}

function select(id) {
  selected = id === selected ? null : id;
  for (const n of nodes) n.el.classList.toggle('is-selected', n.it.id === selected);
  document.body.classList.toggle('has-detail', !!selected);
  renderDetail();
  if (mode) placeLabels(mode);
  kick();
}

function coordinateLine(it, id) {
  const f = (v) => v.toFixed(2);
  switch (id) {
    case 'reality':
      return [['r', `${it.years[0]}`], ['θ', `#${[...polar.keys()].indexOf(it.id) + 1} in order`]];
    case 'structure':
      return [['x · scale', f(it.axes.scale)], ['y · complexity', f(it.axes.complexity)]];
    case 'build':
      return [['x · started', `${it.years[0]}`], ['y · stage', it.stage]];
    case 'image':
      return [['x · expressive', f(it.axes.expressive)], ['y · experimental', f(it.axes.experimental)]];
    case 'place':
      return [['lat', `${it.place.lat.toFixed(2)}°`], ['lon', `${it.place.lon.toFixed(2)}°`]];
    case 'digital':
      return [['x · digital', f(it.axes.digital)], ['y · finished', f(it.axes.finished)]];
    default:
      return [];
  }
}

function renderDetail() {
  if (!selected) {
    detail.classList.remove('is-open');
    return;
  }
  const it = byId.get(selected);
  const md = modes.find((m) => m.id === mode);
  const yrs = it.years[0] === it.years[1] ? it.years[0] : `${it.years[0]} – ${it.years[1]}`;
  detail.innerHTML = `
    <button class="detail__close" type="button" aria-label="Close">×</button>
    <p class="detail__kicker">${md.section} · ${it.kind}</p>
    <h2 class="detail__title">${it.title}</h2>
    <p class="detail__years">${yrs} · ${it.place.name}</p>
    <p class="detail__lens">${it.lens[mode]}</p>
    <dl class="detail__coords">${coordinateLine(it, mode)
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
      .join('')}</dl>
    ${
      it.related?.length
        ? `<p class="detail__rel-label">Related</p><div class="detail__rel">${it.related
            .filter((r) => byId.has(r))
            .map((r) => `<button type="button" data-id="${r}">${byId.get(r).title}</button>`)
            .join('')}</div>`
        : ''
    }`;
  detail.classList.add('is-open');
  detail.querySelector('.detail__close').addEventListener('click', () => select(selected));
  detail.querySelectorAll('.detail__rel button').forEach((b) => b.addEventListener('click', () => select(b.dataset.id)));
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && selected) select(selected);
});

/* ── Text scramble for relabelling ────────────────────────────────────────── */

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·→↑×—';
function scramble(el, text) {
  if (reduced || !el.textContent) {
    el.textContent = text;
    return;
  }
  const start = performance.now();
  const dur = 520;
  const token = (el._scramble = {});
  const step = () => {
    if (el._scramble !== token) return;
    const p = Math.min(1, (performance.now() - start) / dur);
    const reveal = Math.floor(p * text.length);
    let out = text.slice(0, reveal);
    for (let i = reveal; i < text.length; i++) out += text[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    el.textContent = out;
    if (p < 1) requestAnimationFrame(step);
  };
  step();
}

/* ── Boot ─────────────────────────────────────────────────────────────────── */

window.addEventListener('resize', () => {
  W = innerWidth;
  H = innerHeight;
  if (mode === 'build') recomputeBuild();
  bounds = null;
  trans.swapped = false; // re-run label placement + ticks for the new size
  kick();
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) kick();
});

mountSwitcher({
  items: modes.map((m) => ({ id: m.id, label: m.section, sub: systems[m.id].frame === 'map' ? 'map' : m.name.toLowerCase() })),
  initial: 'structure',
  label: 'Sections',
  onChange: (id) => {
    setMode(id);
    kick();
  },
});
