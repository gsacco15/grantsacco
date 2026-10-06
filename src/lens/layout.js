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

/**
 * Layout for a section: for each item { x, y (tile centre), w, h, ax, ay
 * (anchor), cap (caption shown) }. Tiles start on their anchors and are pushed
 * apart until nothing overlaps, pulled back towards their anchors as they go.
 */
/** Items hung on the Art wall beside the photo rolls (everything else steps out). */
export const WALL = ['renders'];

/**
 * The Art wall: a grid of cells, one per roll, then the WALL items. Each cell
 * is { x, y, w, h } (top-left and size); `card` is the print size for a stack.
 */
export function wallCells(W, H) {
  const R = plotRect(W, H);
  const n = albums.length + WALL.length;
  const m = W < 760;
  const cols = m ? 2 : n > 6 ? 4 : 3;
  const rows = Math.ceil(n / cols);
  const top = R.y + (m ? 4 : 18);
  const cw = R.w / cols;
  const ch = (R.y + R.h - top) / rows;
  const card = Math.max(m ? 56 : 84, Math.min(m ? 96 : 150, cw * 0.4, (ch - (m ? 44 : 64)) / 1.3));
  const cells = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols);
    // Centre a short last row.
    const inRow = r === rows - 1 ? n - r * cols : cols;
    const c = i - r * cols + (cols - inRow) / 2;
    cells.push({ x: R.x + c * cw, y: top + r * ch, w: cw, h: ch });
  }
  return { R, cells, card };
}

export function layout(mode, W, H) {
  if (mode === 'image') return wallLayout(W, H);
  const R = plotRect(W, H);
  const gap = W < 760 ? 4 : 8;
  const L = items.map((it) => {
    const [ax, ay] = anchor(it, mode, R);
    const [w, h] = tileSize(it, mode, R, W);
    const cap = hasCaption(it, mode, W);
    return { id: it.id, it, ax, ay, x: ax, y: ay, w, h, cap, focus: isFocus(it, mode) };
  });
  // Collision boxes include the caption under the picture.
  const box = (t) => ({ hw: t.w / 2, top: t.h / 2, bottom: t.h / 2 + (t.cap ? CAPTION_H : 0) });
  // Keep the "you" origin clear in the polar view.
  const P = polarFrame(R);
  const bounds = { x0: R.x - 12, x1: R.x + R.w + 12, y0: R.y - 10, y1: R.y + R.h + 16 };

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
  return { R, tiles: new Map(L.map((t) => [t.id, t])) };
}

/** Art: the rolls take the wall; the WALL items hang beside them, the rest step out. */
function wallLayout(W, H) {
  const { R, cells, card } = wallCells(W, H);
  const tiles = new Map();
  for (const it of items) {
    const k = WALL.indexOf(it.id);
    if (k < 0) {
      tiles.set(it.id, { id: it.id, it, hidden: true, x: 0, y: 0, w: 1, h: 1, ax: 0, ay: 0, cap: false, focus: false });
      continue;
    }
    const cell = cells[albums.length + k];
    const w = Math.min(cell.w * 0.78, card * 1.9);
    const h = w / ASPECT.image;
    const x = cell.x + cell.w / 2;
    const y = cell.y + cell.h * 0.42;
    tiles.set(it.id, { id: it.id, it, x, y, w, h, ax: x, ay: y, cap: true, focus: true });
  }
  return { R, tiles };
}
