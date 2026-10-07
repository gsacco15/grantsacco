// Where every tile goes in each section. The coordinate systems are the ones
// from the Coordinates mock; what's new here is that the marks are pictures of
// real artifacts, each section shows only its own (plus deliberate crossovers),
// and marks are relaxed apart while keeping a leader to their exact coordinate.
import { artifacts, films, countries, dogs, inSection } from './artifacts.js';
import { STAGES } from '../coordinates/systems.js';
import { ASPECT } from './render.js';
import { metaFor } from './meta.js';

export const YEAR0 = 2014;
export const YEAR1 = 2027;

/**
 * An artifact is in focus in its own section; crossovers are drawn smaller.
 * About and Art are curated whole, so everything in them is in focus; on the
 * Travel map the places lived are.
 */
export const isFocus = (a, mode) => {
  if (mode === 'reality' || mode === 'image') return true;
  if (mode === 'place') return a.kind === 'place';
  return a.main === mode;
};

/** Radius (0–1) of a year's ring in the About orbit. */
export const ringRadius = (year) => 0.18 + 0.82 * ((year - YEAR0 + 0.5) / (YEAR1 - YEAR0));

// About: radius = start year, angle = golden angle in chronological order.
const polar = (() => {
  const list = artifacts.filter((a) => inSection(a, 'reality')).sort((a, b) => a.years[0] - b.years[0] || a.id.localeCompare(b.id));
  const out = new Map();
  list.forEach((a, i) => out.set(a.id, { r: ringRadius(a.years[0] ?? YEAR0), theta: -Math.PI / 2 + i * 2.39996 }));
  return out;
})();

/**
 * Fit the Travel map to the places in it (with room around them) and to the
 * countries visited (just kept on screen), at the frame's aspect ratio.
 */
function mapBounds(aspect) {
  const pts = artifacts.filter((a) => inSection(a, 'place')).map((a) => a.place);
  const keep = countries.map((c) => c.near ?? c.at).filter(Boolean);
  let west = Math.min(...pts.map((p) => p.lon - 14), ...keep.map(([, lon]) => lon - 3));
  let east = Math.max(...pts.map((p) => p.lon + 14), ...keep.map(([, lon]) => lon + 3));
  let south = Math.min(...pts.map((p) => p.lat - 10), ...keep.map(([lat]) => lat - 3));
  let north = Math.max(...pts.map((p) => p.lat + 8), ...keep.map(([lat]) => lat + 3));
  const lonSpan = east - west;
  const latSpan = north - south;
  if (lonSpan / latSpan > aspect) {
    const need = lonSpan / aspect - latSpan;
    south -= need / 2;
    north += need / 2;
  } else {
    const need = latSpan * aspect - lonSpan;
    west -= need / 2;
    east += need / 2;
  }
  if (north > 85) {
    south -= north - 85;
    north = 85;
  }
  if (south < -85) south = -85;
  return { west, east, north, south };
}

/** Plot rectangle for the current viewport. */
export function plotRect(W, H) {
  const m = W < 760;
  const top = m ? 150 : W < 1180 ? 176 : 150;
  const bottom = m ? 118 : 132;
  const left = m ? 22 : Math.max(96, W * 0.075);
  const right = m ? 22 : Math.max(72, W * 0.06);
  return { x: left, y: top, w: Math.max(120, W - left - right), h: Math.max(120, H - top - bottom) };
}

/*
 * The Travel map can be zoomed and panned. `zoom` is the magnification over the
 * fitted view (1 = everything in view, as the section opens) and the centre
 * of the view in degrees; the view never leaves the fitted bounds.
 */
export const MAX_ZOOM = 16;
let zoom = { k: 1, lon: 0, lat: 0 };
export const mapZoom = () => zoom;
export function setMapZoom(k, lon, lat) {
  zoom = { k: Math.min(MAX_ZOOM, Math.max(1, k)), lon, lat };
}

/** Map frame: letterboxed so the world never stretches too tall. `b` is the view's bounds. */
export function mapFrame(R) {
  const MIN = 1.2;
  let F = R;
  if (R.w / R.h < MIN) {
    const h = R.w / MIN;
    F = { x: R.x, y: R.y + (R.h - h) * 0.35, w: R.w, h };
  }
  const fit = mapBounds(F.w / F.h);
  if (zoom.k <= 1) return { ...F, fit, b: fit };
  const lonSpan = (fit.east - fit.west) / zoom.k;
  const latSpan = (fit.north - fit.south) / zoom.k;
  const lon = Math.min(fit.east - lonSpan / 2, Math.max(fit.west + lonSpan / 2, zoom.lon));
  const lat = Math.min(fit.north - latSpan / 2, Math.max(fit.south + latSpan / 2, zoom.lat));
  return { ...F, fit, b: { west: lon - lonSpan / 2, east: lon + lonSpan / 2, south: lat - latSpan / 2, north: lat + latSpan / 2 } };
}

export const polarFrame = (R) => {
  const cx = R.x + R.w / 2;
  const cy = R.y + R.h / 2;
  const ry = R.h / 2;
  return { cx, cy, ry, rx: Math.min(R.w / 2, ry * 1.75) };
};

const toPx = (R, u, v) => [R.x + u * R.w, R.y + (1 - v) * R.h];
const pad = (u, m = 0.05) => m + (1 - 2 * m) * u;

/** Exact coordinate of `it` in `mode` (where its leader points). */
export function anchor(it, mode, R) {
  switch (mode) {
    case 'reality': {
      const P = polarFrame(R);
      const p = polar.get(it.id);
      return [P.cx + Math.cos(p.theta) * p.r * P.rx, P.cy + Math.sin(p.theta) * p.r * P.ry];
    }
    case 'structure':
      return toPx(R, pad(it.axes.scale), pad(it.axes.complexity));
    case 'build': {
      const u = ((it.years[0] ?? YEAR0) - YEAR0 + 0.5) / (YEAR1 - YEAR0);
      const lane = Math.max(0, STAGES.indexOf(it.stage));
      return toPx(R, u, (lane + 0.5) / STAGES.length);
    }
    case 'image':
      return toPx(R, pad(it.axes.expressive, 0.08), pad(it.axes.experimental, 0.08));
    case 'place': {
      const F = mapFrame(R);
      const { b } = F;
      return toPx(F, (it.place.lon - b.west) / (b.east - b.west), (it.place.lat - b.south) / (b.north - b.south));
    }
    case 'digital':
      return toPx(R, pad(it.axes.digital), pad(it.axes.finished));
    default:
      return [R.x + R.w / 2, R.y + R.h / 2];
  }
}

/** Tile size (picture only) for `it` in `mode`. */
export function tileSize(it, mode, R, W) {
  const m = W < 760;
  const base = Math.min(150, Math.max(m ? 50 : 66, Math.min(R.w, R.h * 1.7) * (m ? 0.15 : 0.092)));
  const focus = isFocus(it, mode);
  if (mode === 'place') {
    // The map is dots: places lived, then trips (photos), then work sites.
    const d = (it.kind === 'place' ? 12 : it.film ? 9 : 8) * (m ? 0.85 : 1);
    return [d, d];
  }
  let w = mode === 'reality' ? base * 0.86 : focus ? base : base * 0.6;
  if (mode === 'image') w *= focus ? 1.3 : 1.1;
  return [w, w / ASPECT[mode]];
}

// Trips and work sites on the map are labelled on hover, so it stays readable.
const hasCaption = (it, mode, W) => isFocus(it, mode) && !(W < 760 && mode === 'reality');

// Captions are measured in the fonts they're set in, so marks are kept apart
// by their labels as well as their pictures.
const ctx = document.createElement('canvas').getContext('2d');
const FONTS = {
  sans: "600 12px Inter, ui-sans-serif, system-ui, sans-serif",
  mono: "500 10.5px 'JetBrains Mono', ui-monospace, monospace",
  serif: "italic 400 15px 'Instrument Serif', Georgia, serif",
  meta: "400 9.5px 'JetBrains Mono', ui-monospace, monospace",
};
const textWidth = (s, font, spacing = 0) => {
  ctx.font = font;
  return ctx.measureText(s).width + s.length * spacing;
};
// .lx-tile__cap max-width (narrower on phones, where the meta line is hidden).
const capMax = (W) => (W < 760 ? 150 : 200);

/** Width and height of `it`'s caption in `mode`. */
function captionSize(it, mode, W) {
  const m = W < 760;
  const mono = mode === 'structure' || mode === 'digital';
  const serif = mode === 'image';
  // On phones only the sans titles shrink (12px → 10.5px).
  const k = m && !mono && !serif ? 0.875 : 1;
  const name = m && it.phone ? it.phone : it.title;
  const title = mono ? name.toUpperCase() : name;
  const font = mono ? FONTS.mono : serif ? FONTS.serif : FONTS.sans;
  const tw = textWidth(title, font, mono ? 0.42 : 0) * k;
  const mw = m ? 0 : textWidth(metaFor(it, mode), FONTS.meta, 0.38);
  const lines = Math.ceil(tw / capMax(W));
  const lineH = (serif ? 18 : mono ? 12.6 : 14.4) * k;
  return { cw: Math.min(capMax(W), Math.max(tw, mw)) + 4, capH: 7 + lines * lineH + (m ? 0 : 12) };
}

/** Caption size for a film's stack on the Art plot (title over place · year). */
function stackCaption(f, card, W) {
  const m = W < 760;
  const size = m ? 13 : Math.min(17, Math.max(13, card * 0.17));
  const max = m ? 110 : 220; // .pk__cap max-width
  const tw = textWidth(m ? f.short ?? f.title : f.title, `italic 400 ${size}px 'Instrument Serif', Georgia, serif`);
  const mw = m ? 0 : textWidth(`${f.place.split(',')[0]} · ${f.year}`.toUpperCase(), FONTS.meta, 0.76);
  const lines = Math.ceil(tw / max);
  return { cw: Math.min(max, Math.max(tw, mw)) + 6, capH: (m ? 10 : 20) + lines * size * 1.1 + (m ? 2 : 17) };
}

/** Every artifact gets an entry; ones not in the section are marked hidden. */
function withHidden(L) {
  const tiles = new Map(L.map((t) => [t.id, t]));
  for (const it of artifacts) {
    if (!tiles.has(it.id)) tiles.set(it.id, { id: it.id, it, hidden: true, x: 0, y: 0, w: 1, h: 1, ax: 0, ay: 0, cap: false, focus: false });
  }
  return tiles;
}

/**
 * Push overlapping marks apart, pulling each back towards its anchor as it
 * goes. Marks are { x, y (centre), w, h, ax, ay, focus }, plus the caption
 * under the picture: `cw` × `capH`, hung from the picture's left edge, right
 * edge (`capAlign: 'end'`) or centre. `bw` widens a mark's box symmetrically.
 */
function relax(L, R, mode, W, obstacles = []) {
  // Map dots only need nudging off each other; pictures need breathing room.
  const gap = mode === 'place' ? 2 : W < 760 ? 4 : 8;
  const box = (t) => {
    const hw = t.w / 2;
    let l = -(t.bw ?? t.w) / 2;
    let r = (t.bw ?? t.w) / 2;
    if (t.cw) {
      if (t.capAlign === 'center') {
        l = Math.min(l, -t.cw / 2);
        r = Math.max(r, t.cw / 2);
      } else if (t.capAlign === 'end') l = Math.min(l, hw - t.cw);
      else r = Math.max(r, -hw + t.cw);
    }
    return { l, r, top: t.h / 2, bottom: t.h / 2 + (t.capH ?? 0) };
  };
  // Keep the "you" origin clear in the polar view.
  const P = polarFrame(R);
  // Art's "controlled" label sits on the bottom edge, so captions stay above it.
  // On phones the x axis title sits just above the plot, so marks stay below it.
  const bounds = { x0: R.x - 12, x1: R.x + R.w + 12, y0: R.y + (W < 760 ? 4 : -10), y1: R.y + R.h + (mode === 'image' ? -18 : 16) };
  const boxes = L.map(box);

  for (let iter = 0; iter < 260; iter++) {
    let moved = false;
    for (let i = 0; i < L.length; i++) {
      const a = L[i];
      const A = boxes[i];
      for (let j = i + 1; j < L.length; j++) {
        const b = L[j];
        const B = boxes[j];
        const ox = Math.min(a.x + A.r, b.x + B.r) - Math.max(a.x + A.l, b.x + B.l) + gap;
        const oy = Math.min(a.y + A.bottom, b.y + B.bottom) - Math.max(a.y - A.top, b.y - B.top) + gap;
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        // Focus tiles hold their ground; the others make way.
        const wa = a.focus === b.focus ? 0.5 : a.focus ? 0.25 : 0.75;
        if (ox < oy) {
          const dx = b.x + (B.l + B.r) / 2 - (a.x + (A.l + A.r) / 2);
          const s = (dx === 0 ? (i % 2 ? 1 : -1) : Math.sign(dx)) * ox;
          a.x -= s * wa;
          b.x += s * (1 - wa);
        } else {
          const dy = b.y + (B.bottom - B.top) / 2 - (a.y + (A.bottom - A.top) / 2);
          const s = (dy === 0 ? (j % 2 ? 1 : -1) : Math.sign(dy)) * oy;
          a.y -= s * wa;
          b.y += s * (1 - wa);
        }
      }
    }
    // Fixed labels (Art's axis names) push marks off without moving.
    L.forEach((a, i) => {
      const A = boxes[i];
      for (const o of obstacles) {
        const ox = Math.min(a.x + A.r, o.x1) - Math.max(a.x + A.l, o.x0) + gap;
        const oy = Math.min(a.y + A.bottom, o.y1) - Math.max(a.y - A.top, o.y0) + gap;
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        if (ox < oy) a.x += (a.x + (A.l + A.r) / 2 < (o.x0 + o.x1) / 2 ? -1 : 1) * ox;
        else a.y += (a.y + (A.bottom - A.top) / 2 < (o.y0 + o.y1) / 2 ? -1 : 1) * oy;
      }
    });
    L.forEach((t, i) => {
      const k = iter < 190 ? 0.03 : 0;
      t.x += (t.ax - t.x) * k;
      t.y += (t.ay - t.y) * k;
      if (mode === 'reality') {
        // Push out of the origin marker.
        const dx = t.x - P.cx;
        const dy = t.y - P.cy;
        const r = Math.hypot(dx, dy) || 1;
        const min = t.w * 0.6 + 34;
        if (r < min) {
          t.x = P.cx + (dx / r) * min;
          t.y = P.cy + (dy / r) * min;
        }
      }
      const B = boxes[i];
      t.x = Math.min(bounds.x1 - B.r, Math.max(bounds.x0 - B.l, t.x));
      t.y = Math.min(bounds.y1 - B.bottom, Math.max(bounds.y0 + B.top, t.y));
    });
    if (!moved && iter > 190) break;
  }
  return L;
}

/** A tile entry for `it` in `mode`, at its anchor, with its caption measured. */
function mark(it, mode, R, W) {
  const [ax, ay] = anchor(it, mode, R);
  const [w, h] = tileSize(it, mode, R, W);
  const cap = hasCaption(it, mode, W);
  // Captions near the right edge hang to the left so they stay on screen.
  const capAlign = mode === 'place' ? 'center' : ax > W * 0.64 ? 'end' : 'start';
  const t = { id: it.id, it, ax, ay, x: ax, y: ay, w, h, cap, capAlign, focus: isFocus(it, mode) };
  if (cap) Object.assign(t, captionSize(it, mode, W));
  return t;
}

/**
 * Layout for a section: for each item { x, y (tile centre), w, h, ax, ay
 * (anchor), cap (caption shown) }. Art also returns `stacks`: one photo roll
 * per entry, plotted on the same axes.
 */
export function layout(mode, W, H) {
  if (mode === 'image') return artLayout(W, H);
  if (mode === 'place') return mapLayout(W, H);
  const R = plotRect(W, H);
  const L = artifacts.filter((a) => inSection(a, mode)).map((it) => mark(it, mode, R, W));
  relax(L, R, mode, W);
  const out = { R, tiles: withHidden(L) };
  if (mode === 'reality') out.dogs = dogSpot(L, R, W);
  return out;
}

/**
 * Where Jaylee and Helga sit on their year's ring in About: near the top or
 * bottom of the ellipse, where the ring runs flat enough to sit on, at the
 * point furthest from every tile and caption, and off the axes the year
 * labels run along (left on desktop, up on phones).
 */
function dogSpot(L, R, W) {
  const P = polarFrame(R);
  const r = ringRadius(dogs.year);
  const m = W < 760;
  const [w, h] = m ? [40, 26] : [52, 34];
  const boxes = L.map((t) => {
    const x0 = t.capAlign === 'end' ? t.x + t.w / 2 - Math.max(t.w, t.cw ?? 0) : t.x - t.w / 2;
    return { x0, x1: x0 + Math.max(t.w, t.cw ?? 0), y0: t.y - t.h / 2, y1: t.y + t.h / 2 + (t.capH ?? 0) };
  });
  // The "Grant · origin · now" label under the centre.
  boxes.push({ x0: P.cx - 40, x1: P.cx + 40, y0: P.cy - 14, y1: P.cy + 46 });
  const gap = (a, b) => Math.hypot(Math.max(0, a.x0 - b.x1, b.x0 - a.x1), Math.max(0, a.y0 - b.y1, b.y0 - a.y1));
  let best = null;
  for (let deg = -140; deg <= 140; deg += 2.5) {
    // Around the bottom (90°) and the top (270°) of the ellipse.
    for (const base of [90, 270]) {
      const a = base + (deg / 140) * 50;
      if (m && Math.abs(a - 270) < 12) continue;
      const th = (a * Math.PI) / 180;
      const x = P.cx + Math.cos(th) * r * P.rx;
      const y = P.cy + Math.sin(th) * r * P.ry;
      const box = { x0: x - w / 2, x1: x + w / 2, y0: y - h, y1: y };
      const score = Math.min(...boxes.map((b) => gap(box, b))) - Math.abs(deg) * 0.02;
      if (!best || score > best.score) best = { x, y, score };
    }
  }
  return { x: best.x, y: best.y };
}

/** Print width of a photo-roll stack on the Art plot. */
export const stackCard = (W, H) => {
  const R = plotRect(W, H);
  return W < 760 ? 46 : Math.min(108, Math.max(66, Math.min(R.w, R.h * 1.7) * 0.07));
};

/**
 * Art keeps its axes (functional ↔ expressive, controlled ↔ experimental).
 * The films are plotted on them as stacks of prints; the other Art members
 * (lights, wall art, visual apps) are tiles beside them.
 */
function artLayout(W, H) {
  const R = plotRect(W, H);
  const card = stackCard(W, H);
  const L = [];
  for (const it of artifacts) {
    if (it.kind === 'film' || !inSection(it, 'image')) continue;
    L.push(mark(it, 'image', R, W));
  }
  for (const f of films) {
    const [ax, ay] = toPx(R, pad(f.axes.expressive, 0.08), pad(f.axes.experimental, 0.08));
    // Captions sit centred under the pile, or hang left of it near the right edge.
    const capAlign = ax > W * 0.8 ? 'end' : 'center';
    L.push({ id: f.id, film: f, ax, ay, x: ax, y: ay, w: card * 1.1, h: card * 1.3, capAlign, ...stackCaption(f, card, W), focus: true, stack: true });
  }
  // Keep the axis names readable: functional, expressive, experimental, controlled.
  const size = W < 760 ? 13 : 16;
  const font = `italic 400 ${size}px 'Instrument Serif', Georgia, serif`;
  const cx = R.x + R.w / 2;
  const cy = R.y + R.h / 2;
  const name = (s, x, y, end = false) => {
    const w = textWidth(s, font) + 6;
    const x0 = end ? x - w : x - 3;
    return { x0, x1: x0 + w, y0: y - size * 0.7, y1: y + size * 0.6 };
  };
  const names = [
    name('functional', R.x + 4, cy - 14),
    name('expressive', R.x + R.w - 4, cy - 14, true),
    name('experimental', cx + 10, R.y + 8),
    name('controlled', cx + 10, R.y + R.h - 8),
  ];
  relax(L, R, 'image', W, names);
  const stacks = L.filter((t) => t.stack).map(({ id, x, y, ax, ay, capAlign }) => ({ id, x, y, w: card, ax, ay, capAlign }));
  return { R, tiles: withHidden(L.filter((t) => !t.stack)), stacks, card };
}

/**
 * Travel is a map of dots at their true coordinates, nudged only where they
 * would sit on top of each other. Places lived are labelled, each label put on
 * the first side of its dot (right, left, above, below) that's clear of the
 * other dots and labels; trips and work sites are labelled on hover.
 */
function mapLayout(W, H) {
  const R = plotRect(W, H);
  const F = mapFrame(R);
  const all = artifacts.filter((a) => inSection(a, 'place')).map((it) => {
    const [ax, ay] = anchor(it, 'place', R);
    const [w, h] = tileSize(it, 'place', R, W);
    // Zoomed in, dots beyond the edge of the view step out.
    const off = ax < F.x - 2 || ax > F.x + F.w + 2 || ay < F.y - 2 || ay > F.y + F.h + 2;
    return { id: it.id, it, ax, ay, x: ax, y: ay, w, h, cap: false, focus: isFocus(it, 'place'), off };
  });
  const L = all.filter((t) => !t.off);
  relax(L, R, 'place', W);

  // Hover labels hang on the side with more room.
  for (const t of L) t.capSide = t.x > F.x + F.w * 0.75 ? 'l' : 'r';

  // Every place a label could go: beside its dot (nudged up or down), then
  // above or below. Each keeps clear of the dots and inside the map, and reads
  // as its own dot's when no other dot is nearer the point it hangs from.
  const dots = L.map((t) => ({ x0: t.x - t.w / 2 - 3, y0: t.y - t.h / 2 - 1, x1: t.x + t.w / 2 + 3, y1: t.y + t.h / 2 + 1 }));
  const hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  const inside = (b) => b.x0 >= F.x + 2 && b.x1 <= F.x + F.w - 2 && b.y0 >= F.y + 2 && b.y1 <= F.y + F.h - 2;
  const labelled = L.filter((t) => hasCaption(t.it, 'place', W) && !(W < 760 && t.it.phone === '')).map((t) => {
    const { cw, capH } = captionSize(t.it, 'place', W);
    const h = capH - 7;
    const r = t.w / 2;
    const raw = [];
    for (const dy of [0, -9, 9, -16, 16]) {
      raw.push(['r', t.x + r + 6, t.y - h / 2 + dy, 0, dy, t.x + r + 6, t.y + dy]);
      raw.push(['l', t.x - r - 6 - cw, t.y - h / 2 + dy, 0, dy, t.x - r - 6, t.y + dy]);
    }
    for (const dx of [0, cw * 0.35, -cw * 0.35]) {
      raw.push(['t', t.x - cw / 2 + dx, t.y - r - 3 - h, dx, 0, t.x + dx, t.y - r - 3]);
      raw.push(['b', t.x - cw / 2 + dx, t.y + r + 3, dx, 0, t.x + dx, t.y + r + 3]);
    }
    const options = raw
      .map(([side, x0, y0, dx, dy, px, py], i) => {
        const box = { x0, y0, x1: x0 + cw, y1: y0 + h };
        const mine = Math.hypot(px - t.x, py - t.y);
        const own = !L.some((o) => o !== t && Math.hypot(px - o.x, py - o.y) < mine);
        return { side, dx, dy, box, cost: i + (own ? 0 : 60) };
      })
      .filter((o) => inside(o.box) && !dots.some((d) => hit(o.box, d)))
      .sort((a, b) => a.cost - b.cost);
    return { t, options };
  });

  // Choose them together: a short search for the set that labels the most
  // places at the lowest cost (own dot, preferred side), labels never touching.
  const pad = (b) => ({ x0: b.x0 - 3, y0: b.y0 - 1, x1: b.x1 + 3, y1: b.y1 + 1 });
  let best = { n: -1, cost: Infinity, pick: [] };
  let steps = 0;
  const pick = [];
  (function search(i, n, cost) {
    if (++steps > 40000) return;
    if (i === labelled.length) {
      if (n > best.n || (n === best.n && cost < best.cost)) best = { n, cost, pick: [...pick] };
      return;
    }
    if (n + (labelled.length - i) < best.n) return;
    for (const o of labelled[i].options) {
      if (pick.some((p) => p && hit(pad(p.box), o.box))) continue;
      pick.push(o);
      search(i + 1, n + 1, cost + o.cost);
      pick.pop();
    }
    pick.push(null);
    search(i + 1, n, cost);
    pick.pop();
  })(0, 0, 0);
  best.pick.forEach((o, i) => {
    if (o) Object.assign(labelled[i].t, { cap: true, capSide: o.side, capDx: o.dx, capDy: o.dy });
  });
  return { R, tiles: withHidden(all) };
}
