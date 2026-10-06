// The static drawing behind the tiles for each section: rings, grids, axes,
// the map. Colours are baked in from the section's palette (not CSS variables)
// so the outgoing and incoming drawings can sit side by side during a sweep.
import { systems, graticule, STAGES, yearToRing, travelRoute } from '../coordinates/systems.js';
import { items } from '../content.js';
import { landPath } from '../shared/geo.js';
import { YEAR0, YEAR1, mapFrame, polarFrame, anchor, wallCells } from './layout.js';

const NS = 'http://www.w3.org/2000/svg';
const f = (v) => v.toFixed(1);

const hexA = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${a})`;
};

export function overlay(mode, R, W, H, land) {
  const pal = systems[mode].palette;
  const ink = (a) => hexA(pal.ink, a);
  const parts = [];
  const text = (x, y, s, { anchor: ta = 'start', size = 10, fill = ink(0.55), cls = 'ov-mono', base = 'middle' } = {}) =>
    parts.push(
      `<text class="${cls}" x="${f(x)}" y="${f(y)}" text-anchor="${ta}" dominant-baseline="${base}" font-size="${size}" fill="${fill}">${s}</text>`,
    );
  const ln = (x1, y1, x2, y2, stroke, w = 1, extra = '') =>
    parts.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${stroke}" stroke-width="${w}" ${extra}/>`);
  const mob = W < 760;
  const U = (u) => R.x + u * R.w;
  const V = (v) => R.y + (1 - v) * R.h;
  const pad = (u, m = 0.05) => m + (1 - 2 * m) * u;

  if (mode === 'reality') {
    const P = polarFrame(R);
    for (let y = YEAR0; y < YEAR1; y++) {
      const r = 0.18 + 0.82 * yearToRing(y);
      parts.push(
        `<ellipse cx="${f(P.cx)}" cy="${f(P.cy)}" rx="${f(r * P.rx)}" ry="${f(r * P.ry)}" fill="none" stroke="${ink(y % 5 === 0 ? 0.2 : 0.09)}" stroke-width="1"/>`,
      );
      if (y % 2 === 0 && !mob) text(P.cx - r * P.rx, P.cy, String(y), { anchor: 'middle', size: 9.5, fill: ink(0.45) });
    }
    ln(P.cx - P.rx, P.cy, P.cx + P.rx, P.cy, ink(0.08), 1, 'stroke-dasharray="2 5"');
    ln(P.cx, P.cy - P.ry, P.cx, P.cy + P.ry, ink(0.08), 1, 'stroke-dasharray="2 5"');
    parts.push(`<circle cx="${f(P.cx)}" cy="${f(P.cy)}" r="5" fill="${pal.accent}"/>`);
    parts.push(`<circle cx="${f(P.cx)}" cy="${f(P.cy)}" r="12" fill="none" stroke="${hexA(pal.accent, 0.4)}"/>`);
    text(P.cx, P.cy + 24, 'Grant', { anchor: 'middle', size: 13, fill: ink(0.9), cls: 'ov-sans' });
    text(P.cx, P.cy + 39, 'origin · now', { anchor: 'middle', size: 9, fill: ink(0.5) });
  }

  if (mode === 'structure' || mode === 'digital') {
    const s = systems[mode];
    const minor = mode === 'digital' ? 0.05 : 0.025;
    for (let u = 0; u <= 1.0001; u += minor) {
      const major = Math.abs((u / 0.2) - Math.round(u / 0.2)) < 1e-6;
      ln(U(u), R.y, U(u), R.y + R.h, ink(major ? 0.16 : 0.06));
    }
    for (let v = 0; v <= 1.0001; v += minor * (R.w / R.h > 1.4 ? 1.5 : 1)) {
      ln(R.x, V(v), R.x + R.w, V(v), ink(0.06));
    }
    parts.push(`<rect x="${f(R.x)}" y="${f(R.y)}" width="${f(R.w)}" height="${f(R.h)}" fill="none" stroke="${ink(0.5)}" stroke-width="1"/>`);
    for (const tk of s.x.ticks ?? []) {
      const x = U(pad(tk.at));
      ln(x, R.y + R.h, x, R.y + R.h + 5, ink(0.5));
      if (!mob) text(x, R.y + R.h + 15, tk.label, { anchor: 'middle', size: 9.5 });
    }
    for (const tk of s.y.ticks ?? []) {
      const y = V(pad(tk.at));
      ln(R.x - 5, y, R.x, y, ink(0.5));
      if (!mob) text(R.x - 9, y, tk.label, { anchor: 'end', size: 9.5 });
    }
    text(R.x + R.w, R.y + R.h + (mob ? 14 : 30), s.x.label, { anchor: 'end', size: 10, fill: pal.accent });
    if (s.x.start) text(R.x, R.y + R.h + (mob ? 14 : 30), `← ${s.x.start}`, { size: 10, fill: ink(0.55) });
    text(R.x, R.y - 12, s.y.label, { size: 10, fill: pal.accent });
    if (s.y.start) text(R.x + 8, R.y + R.h - 10, `↓ ${s.y.start}`, { size: 10, fill: ink(0.55) });
  }

  if (mode === 'build') {
    const lanes = STAGES.length;
    for (let i = 0; i < lanes; i++) {
      const y0 = V((i + 1) / lanes);
      if (i % 2 === 0) parts.push(`<rect x="${f(R.x)}" y="${f(y0)}" width="${f(R.w)}" height="${f(R.h / lanes)}" fill="${ink(0.035)}"/>`);
      text(R.x + 6, y0 + 11, STAGES[i], { size: 9.5, fill: ink(0.5) });
    }
    for (let y = YEAR0; y <= YEAR1; y++) {
      const x = U((y - YEAR0) / (YEAR1 - YEAR0));
      ln(x, R.y, x, R.y + R.h, ink(y % 5 === 0 ? 0.18 : 0.07));
      if (y % 2 === 1 && y < YEAR1 && !mob) text(x + R.w / (YEAR1 - YEAR0) / 2, R.y + R.h + 15, String(y), { anchor: 'middle', size: 9.5 });
    }
    ln(R.x, R.y + R.h, R.x + R.w, R.y + R.h, ink(0.5));
    text(R.x + R.w, R.y + R.h + (mob ? 14 : 30), 'Time →', { anchor: 'end', size: 10, fill: pal.accent });
    text(R.x, R.y - 12, 'Completion ↑', { size: 10, fill: pal.accent });
  }

  if (mode === 'image') {
    // A dark gallery wall: a soft pool of light over each place on it.
    const { cells, card } = wallCells(W, H);
    parts.push(
      `<defs><radialGradient id="lx-pool"><stop offset="0" stop-color="${pal.ink}" stop-opacity="0.11"/><stop offset="0.6" stop-color="${pal.ink}" stop-opacity="0.035"/><stop offset="1" stop-color="${pal.ink}" stop-opacity="0"/></radialGradient></defs>`,
    );
    for (const c of cells) {
      const cx = c.x + c.w / 2;
      const cy = c.y + c.h * 0.4;
      parts.push(`<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(Math.min(c.w * 0.48, card * 1.9))}" ry="${f(c.h * 0.55)}" fill="url(#lx-pool)"/>`);
      parts.push(`<circle cx="${f(cx)}" cy="${f(c.y + 4)}" r="1.6" fill="${ink(0.35)}"/>`);
    }
  }

  if (mode === 'place') {
    const F = mapFrame(R);
    const { b } = F;
    const sx = F.w / (b.east - b.west);
    const sy = F.h / (b.north - b.south);
    parts.push(`<clipPath id="lx-mapclip"><rect x="${f(F.x)}" y="${f(F.y)}" width="${f(F.w)}" height="${f(F.h)}"/></clipPath>`);
    parts.push(`<g clip-path="url(#lx-mapclip)">`);
    if (land) {
      const d = landPath(land, (lon, lat) => [F.x + (lon - b.west) * sx, F.y + (b.north - lat) * sy]);
      parts.push(`<path d="${d}" fill="${ink(0.1)}" stroke="${ink(0.32)}" stroke-width="0.8" stroke-linejoin="round"/>`);
    }
    const g = graticule(b);
    for (const lon of g.lons) ln(F.x + (lon - b.west) * sx, F.y, F.x + (lon - b.west) * sx, F.y + F.h, ink(0.08));
    for (const lat of g.lats) ln(F.x, F.y + (b.north - lat) * sy, F.x + F.w, F.y + (b.north - lat) * sy, ink(0.08));
    // The trips in order, as one dashed route.
    const pts = travelRoute.map((id) => anchor(items.find((i) => i.id === id), 'place', R));
    if (pts.length > 1) {
      let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1];
        const [x1, y1] = pts[i];
        const mx = (x0 + x1) / 2;
        const my = Math.min(y0, y1) - Math.abs(x1 - x0) * 0.18;
        d += ` Q${f(mx)},${f(my)} ${f(x1)},${f(y1)}`;
      }
      parts.push(`<path d="${d}" fill="none" stroke="${hexA(pal.accent, 0.55)}" stroke-width="1.2" stroke-dasharray="3 5"/>`);
    }
    parts.push('</g>');
    parts.push(`<rect x="${f(F.x)}" y="${f(F.y)}" width="${f(F.w)}" height="${f(F.h)}" fill="none" stroke="${ink(0.3)}"/>`);
    if (!mob) {
      for (const lon of g.lons) text(F.x + (lon - b.west) * sx, F.y + F.h + 14, `${Math.abs(lon)}°${lon < 0 ? 'W' : lon > 0 ? 'E' : ''}`, { anchor: 'middle', size: 9 });
      for (const lat of g.lats) text(F.x - 8, F.y + (b.north - lat) * sy, `${Math.abs(lat)}°${lat < 0 ? 'S' : lat > 0 ? 'N' : ''}`, { anchor: 'end', size: 9 });
    }
  }

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'lx-ov');
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = parts.join('');
  return svg;
}
