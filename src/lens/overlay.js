// The static drawing behind the tiles for each section: rings, grids, axes,
// the map. Colours are baked in from the section's palette (not CSS variables)
// so the outgoing and incoming drawings can sit side by side during a sweep.
import { systems, graticule, STAGES } from '../coordinates/systems.js';
import { artifacts, homes, countries } from './artifacts.js';
import { landPath } from '../shared/geo.js';
import { YEAR0, YEAR1, mapFrame, polarFrame, anchor, ringRadius } from './layout.js';
import { scaleTicks } from './meta.js';

const byId = new Map(artifacts.map((a) => [a.id, a]));

const NS = 'http://www.w3.org/2000/svg';
const f = (v) => v.toFixed(1);

const hexA = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${a})`;
};

/** `geo` is { land, countries } once the map data has loaded. */
export function overlay(mode, R, W, H, geo) {
  const land = geo?.land;
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
      const r = ringRadius(y);
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
    for (const tk of mode === 'structure' ? scaleTicks() : s.x.ticks ?? []) {
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
    const cx = U(0.5);
    const cy = V(0.5);
    ln(R.x, cy, R.x + R.w, cy, ink(0.28));
    ln(cx, R.y, cx, R.y + R.h, ink(0.28));
    for (const [x, y, a] of [[R.x + R.w, cy, 0], [R.x, cy, 180], [cx, R.y, -90], [cx, R.y + R.h, 90]]) {
      parts.push(`<path d="M-7,-4 L0,0 L-7,4" transform="translate(${f(x)} ${f(y)}) rotate(${a})" fill="none" stroke="${ink(0.5)}" stroke-width="1.2"/>`);
    }
    const it = { size: mob ? 13 : 16, cls: 'ov-serif', fill: ink(0.7) };
    text(R.x + R.w - 4, cy - 14, 'expressive', { ...it, anchor: 'end' });
    text(R.x + 4, cy - 14, 'functional', it);
    text(cx + 10, R.y + 8, 'experimental', it);
    text(cx + 10, R.y + R.h - 8, 'controlled', it);
  }


  if (mode === 'place') {
    const F = mapFrame(R);
    const { b } = F;
    const sx = F.w / (b.east - b.west);
    const sy = F.h / (b.north - b.south);
    parts.push(`<clipPath id="lx-mapclip"><rect x="${f(F.x)}" y="${f(F.y)}" width="${f(F.w)}" height="${f(F.h)}"/></clipPath>`);
    parts.push(`<g clip-path="url(#lx-mapclip)">`);
    const pj = (lon, lat) => [F.x + (lon - b.west) * sx, F.y + (b.north - lat) * sy];
    if (land) parts.push(`<path d="${landPath(land, pj)}" fill="${ink(0.1)}" stroke="${ink(0.32)}" stroke-width="0.8" stroke-linejoin="round"/>`);
    // Every country visited, shaded; islands too small to draw get a dot.
    if (geo?.countries) {
      const names = new Set(countries.map((c) => c.name));
      const visited = { type: 'FeatureCollection', features: geo.countries.features.filter((c) => names.has(c.properties.name)) };
      parts.push(`<path d="${landPath(visited, pj)}" fill="${hexA(pal.accent, 0.17)}" fill-rule="evenodd" stroke="${hexA(pal.accent, 0.45)}" stroke-width="0.7" stroke-linejoin="round"/>`);
    }
    for (const c of countries) {
      if (!c.at) continue;
      const [x, y] = pj(c.at[1], c.at[0]);
      parts.push(`<circle cx="${f(x)}" cy="${f(y)}" r="2.2" fill="${hexA(pal.accent, 0.55)}"/>`);
    }
    const g = graticule(b);
    for (const lon of g.lons) ln(F.x + (lon - b.west) * sx, F.y, F.x + (lon - b.west) * sx, F.y + F.h, ink(0.08));
    for (const lat of g.lats) ln(F.x, F.y + (b.north - lat) * sy, F.x + F.w, F.y + (b.north - lat) * sy, ink(0.08));
    // The moves between the places lived, in order: the only lines on the map.
    const home = homes.map((h) => anchor(byId.get(h.id), 'place', R));
    let d = `M${f(home[0][0])},${f(home[0][1])}`;
    for (let i = 1; i < home.length; i++) {
      const [x0, y0] = home[i - 1];
      const [x1, y1] = home[i];
      const bow = Math.min(60, Math.hypot(x1 - x0, y1 - y0) * 0.22);
      d += ` Q${f((x0 + x1) / 2)},${f(Math.min(y0, y1) - bow)} ${f(x1)},${f(y1)}`;
    }
    parts.push(`<path d="${d}" fill="none" stroke="${hexA(pal.ink, 0.6)}" stroke-width="1.3"/>`);
    parts.push('</g>');
    parts.push(`<rect x="${f(F.x)}" y="${f(F.y)}" width="${f(F.w)}" height="${f(F.h)}" fill="none" stroke="${ink(0.3)}"/>`);
    // Key, bottom left (the Pacific): the same marks the dots use.
    {
      const y = F.y + F.h - (mob ? 12 : 16);
      let x = F.x + (mob ? 10 : 14);
      const size = mob ? 8.5 : 9.5;
      const key = (shape, label, w) => {
        parts.push(shape(x, y));
        text(x + 9, y, label, { size, fill: ink(0.6) });
        x += w;
      };
      key((x0, y0) => `<circle cx="${f(x0)}" cy="${f(y0)}" r="4" fill="${pal.accent}" stroke="${pal.bg}" stroke-width="1.5"/>`, 'lived', mob ? 40 : 50);
      key((x0, y0) => `<circle cx="${f(x0)}" cy="${f(y0)}" r="3.2" fill="${pal.ink}"/>`, 'photos', mob ? 48 : 60);
      key((x0, y0) => `<rect x="${f(x0 - 3.5)}" y="${f(y0 - 3.5)}" width="7" height="7" fill="none" stroke="${pal.ink}" stroke-width="1.4"/>`, 'worked', mob ? 50 : 62);
      key((x0, y0) => `<line x1="${f(x0 - 6)}" y1="${f(y0)}" x2="${f(x0 + 5)}" y2="${f(y0)}" stroke="${hexA(pal.ink, 0.6)}" stroke-width="1.3"/>`, 'moved', mob ? 46 : 58);
      key((x0, y0) => `<rect x="${f(x0 - 5)}" y="${f(y0 - 3.5)}" width="10" height="7" fill="${hexA(pal.accent, 0.17)}" stroke="${hexA(pal.accent, 0.45)}" stroke-width="0.7"/>`, `${countries.length} countries`, 0);
    }
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
