// Where every tile goes in each section. The coordinate systems come from the
// Coordinates mock (same axes, same data); what's new here is that the marks
// are pictures, so they're sized by relevance and relaxed apart, each keeping a
// leader back to its exact coordinate.
import { items, albums } from '../content.js';
import { polarLayout, mapBounds, STAGES } from '../coordinates/systems.js';
import { ASPECT } from './render.js';

export const YEAR0 = 2015;
export const YEAR1 = 2027;

/** Which kinds each section brings forward. */
export const FOCUS = {
  reality: null, // everything, equally
  structure: ['engineering'],
  build: ['project'],
  image: ['art', 'travel'],
  place: ['travel'],
  digital: ['app'],
};

export const isFocus = (it, mode) => !FOCUS[mode] || FOCUS[mode].includes(it.kind);

const polar = polarLayout();

/** Plot rectangle for the current viewport. */
export function plotRect(W, H) {
  const m = W < 760;
  const top = m ? 150 : W < 1180 ? 176 : 150;
  const bottom = m ? 118 : 132;
  const left = m ? 22 : Math.max(96, W * 0.075);
  const right = m ? 22 : Math.max(72, W * 0.06);
  return { x: left, y: top, w: Math.max(120, W - left - right), h: Math.max(120, H - top - bottom) };
}

/** Map frame: letterboxed so the world never stretches too tall. */
export function mapFrame(R) {
  const MIN = 1.2;
  let F = R;
  if (R.w / R.h < MIN) {
    const h = R.w / MIN;
    F = { x: R.x, y: R.y + (R.h - h) * 0.35, w: R.w, h };
  }
  return { ...F, b: mapBounds(F.w / F.h) };
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
      const u = (it.years[0] - YEAR0 + 0.5) / (YEAR1 - YEAR0);
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
    const d = focus ? base * 0.62 : base * 0.3;
    return [d, d];
  }
  let w = mode === 'reality' ? base * 0.86 : focus ? base : base * 0.58;
  if (mode === 'image') w *= focus ? 1.3 : 1.1;
  return [w, w / ASPECT[mode]];
}

export const CAPTION_H = 30;
const hasCaption = (it, mode, W) => isFocus(it, mode) && !(W < 760 && mode === 'reality');

/** Trips step out of Art: their photographs are the rolls. */
const ART_HIDE = ['travel'];

/**
 * Push overlapping marks apart, pulling each back towards its anchor as it
 * goes. Marks are { x, y (centre), w, h, ax, ay, cap | capH, focus }; `bw`
 * widens a mark's box for a caption wider than its picture.
 */
function relax(L, R, mode, W) {
  const gap = W < 760 ? 4 : 8;
  // Collision boxes include the caption under the picture.
  const box = (t) => ({ hw: (t.bw ?? t.w) / 2, top: t.h / 2, bottom: t.h / 2 + (t.capH ?? (t.cap ? CAPTION_H : 0)) });
  // Keep the "you" origin clear in the polar view.
  const P = polarFrame(R);
  // Art's "controlled" label sits on the bottom edge, so captions stay above it.
  const bounds = { x0: R.x - 12, x1: R.x + R.w + 12, y0: R.y - 10, y1: R.y + R.h + (mode === 'image' ? -18 : 16) };

  for (let iter = 0; iter < 220; iter++) {
    let moved = false;
    for (let i = 0; i < L.length; i++) {
      const a = L[i];
      const A = box(a);
      for (let j = i + 1; j < L.length; j++) {
        const b = L[j];
        const B = box(b);
        const dx = b.x - a.x;
        const dy = b.y + (B.bottom - B.top) / 2 - (a.y + (A.bottom - A.top) / 2);
        const ox = A.hw + B.hw + gap - Math.abs(dx);
        const oy = (A.top + A.bottom) / 2 + (B.top + B.bottom) / 2 + gap - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        // Focus tiles hold their ground; the others make way.
        const wa = a.focus === b.focus ? 0.5 : a.focus ? 0.25 : 0.75;
        if (ox < oy) {
          const s = (dx === 0 ? (i % 2 ? 1 : -1) : Math.sign(dx)) * ox;
          a.x -= s * wa;
          b.x += s * (1 - wa);
        } else {
          const s = (dy === 0 ? (j % 2 ? 1 : -1) : Math.sign(dy)) * oy;
          a.y -= s * wa;
          b.y += s * (1 - wa);
        }
      }
    }
    for (const t of L) {
      const k = iter < 160 ? 0.03 : 0;
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
      const B = box(t);
      t.x = Math.min(bounds.x1 - B.hw, Math.max(bounds.x0 + B.hw, t.x));
      t.y = Math.min(bounds.y1 - B.bottom, Math.max(bounds.y0 + B.top, t.y));
    }
    if (!moved && iter > 160) break;
  }
  return L;
}

/**
 * Layout for a section: for each item { x, y (tile centre), w, h, ax, ay
 * (anchor), cap (caption shown) }. Art also returns `stacks`: one photo roll
 * per entry, plotted on the same axes.
 */
export function layout(mode, W, H) {
  if (mode === 'image') return artLayout(W, H);
  const R = plotRect(W, H);
  const L = items.map((it) => {
    const [ax, ay] = anchor(it, mode, R);
    const [w, h] = tileSize(it, mode, R, W);
    const cap = hasCaption(it, mode, W);
    return { id: it.id, it, ax, ay, x: ax, y: ay, w, h, cap, focus: isFocus(it, mode) };
  });
  relax(L, R, mode, W);
  return { R, tiles: new Map(L.map((t) => [t.id, t])) };
}

/** Print width of a photo-roll stack on the Art plot. */
export const stackCard = (W, H) => {
  const R = plotRect(W, H);
  return W < 760 ? 46 : Math.min(108, Math.max(66, Math.min(R.w, R.h * 1.7) * 0.07));
};

/**
 * Art keeps its axes (functional ↔ expressive, controlled ↔ experimental).
 * The photo rolls are plotted on them as stacks of prints, in focus with the
 * art; the rest of the work stays small on the functional side for contrast.
 */
function artLayout(W, H) {
  const R = plotRect(W, H);
  const card = stackCard(W, H);
  const L = [];
  for (const it of items) {
    if (ART_HIDE.includes(it.kind)) continue;
    const [ax, ay] = anchor(it, 'image', R);
    const [w, h] = tileSize(it, 'image', R, W);
    L.push({ id: it.id, it, ax, ay, x: ax, y: ay, w, h, cap: hasCaption(it, 'image', W), focus: isFocus(it, 'image') });
  }
  for (const a of albums) {
    const [ax, ay] = toPx(R, pad(a.axes.expressive, 0.08), pad(a.axes.experimental, 0.08));
    const m = W < 760;
    L.push({ id: a.id, album: a, ax, ay, x: ax, y: ay, w: card, h: card * 1.3, bw: Math.max(card * 1.15, m ? 76 : 132), capH: m ? 30 : 62, focus: true, stack: true });
  }
  relax(L, R, 'image', W);
  const tiles = new Map();
  for (const it of items) {
    const t = L.find((m) => m.id === it.id);
    tiles.set(it.id, t ?? { id: it.id, it, hidden: true, x: 0, y: 0, w: 1, h: 1, ax: 0, ay: 0, cap: false, focus: false });
  }
  const stacks = L.filter((m) => m.stack).map(({ id, x, y, w, ax, ay }) => ({ id, x, y, w, ax, ay }));
  return { R, tiles, stacks, card };
}
