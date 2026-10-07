// The static drawing behind the tiles for each section: rings, grids, axes,
// the map. Colours are baked in from the section's palette (not CSS variables)
// so the outgoing and incoming drawings can sit side by side during a sweep.
import { systems, STAGES } from '../coordinates/systems.js';
import { artifacts, homes, countries } from './artifacts.js';
import { planarRings } from '../shared/geo.js';
import { YEAR0, YEAR1, mapFrame, mapZoom, polarFrame, anchor, ringRadius } from './layout.js';
import { scaleTicks } from './meta.js';

const byId = new Map(artifacts.map((a) => [a.id, a]));

const NS = 'http://www.w3.org/2000/svg';
const f = (v) => v.toFixed(1);

const hexA = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${a})`;
};

/** `geo` is { land, countries, detail? } once the map data has loaded. */
export function overlay(mode, R, W, H, geo) {
  const pal = systems[mode].palette;
  const ink = (a) => hexA(pal.ink, a);
  const parts = [];
  // `halo` outlines the text in the background colour, for labels drawn over lines.
  const text = (x, y, s, { anchor: ta = 'start', size = 10, fill = ink(0.55), cls = 'ov-mono', base = 'middle', halo = false } = {}) =>
    parts.push(
      `<text class="${cls}" x="${f(x)}" y="${f(y)}" text-anchor="${ta}" dominant-baseline="${base}" font-size="${size}" fill="${fill}"${halo ? ` paint-order="stroke" stroke="${pal.bg}" stroke-width="3" stroke-linejoin="round"` : ''}>${s}</text>`,
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
      if (y % 2) continue;
      // Phones get a tall, narrow ellipse, so the years run up the vertical axis instead.
      if (mob) text(P.cx, P.cy - r * P.ry, String(y), { anchor: 'middle', size: 8.5, fill: ink(0.5), halo: true });
      else text(P.cx - r * P.rx, P.cy, String(y), { anchor: 'middle', size: 9.5, fill: ink(0.45) });
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
      text(x, R.y + R.h + (mob ? 13 : 15), tk.label, { anchor: 'middle', size: mob ? 8.5 : 9.5 });
    }
    for (const tk of s.y.ticks ?? []) {
      const y = V(pad(tk.at));
      ln(R.x - 5, y, R.x, y, ink(0.5));
      // Phones have no margin beside the plot, so these sit just inside it.
      if (mob) text(R.x + 5, y - 7, tk.label, { size: 8.5, halo: true });
      else text(R.x - 9, y, tk.label, { anchor: 'end', size: 9.5 });
    }
    // On phones the x axis title moves above the plot, clear of the tick labels.
    if (mob) text(R.x + R.w, R.y - 12, s.x.label, { anchor: 'end', size: 10, fill: pal.accent });
    else text(R.x + R.w, R.y + R.h + 30, s.x.label, { anchor: 'end', size: 10, fill: pal.accent });
    if (s.x.start) text(R.x, R.y + R.h + (mob ? 13 : 30), `← ${s.x.start}`, { size: mob ? 9 : 10, fill: ink(0.55) });
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
      // Every other year; every fourth on phones.
      if (y < YEAR1 && y % (mob ? 4 : 2) === (mob ? 3 : 1)) text(x + R.w / (YEAR1 - YEAR0) / 2, R.y + R.h + (mob ? 13 : 15), String(y), { anchor: 'middle', size: mob ? 8.5 : 9.5 });
    }
    ln(R.x, R.y + R.h, R.x + R.w, R.y + R.h, ink(0.5));
    if (mob) text(R.x + R.w, R.y - 12, 'Time →', { anchor: 'end', size: 10, fill: pal.accent });
    else text(R.x + R.w, R.y + R.h + 30, 'Time →', { anchor: 'end', size: 10, fill: pal.accent });
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
    const detail = useDetail(geo);
    const land = detail ? geo.detail.land : geo?.land;
    const all = detail ? geo.detail.countries : geo?.countries;
    parts.push(`<clipPath id="lx-mapclip"><rect x="${f(F.x)}" y="${f(F.y)}" width="${f(F.w)}" height="${f(F.h)}"/></clipPath>`);
    parts.push(`<g clip-path="url(#lx-mapclip)">`);
    // Land, then every country visited shaded, drawn in degrees and placed by
    // a transform: zooming and panning only change the matrix.
    parts.push(`<g class="lx-geo" transform="${geoMatrix(F)}">`);
    if (land) parts.push(`<path d="${degPath(land)}" fill="${ink(0.1)}" stroke="${ink(0.32)}" stroke-width="0.8" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`);
    if (all) parts.push(`<path d="${degPath(visitedOf(all))}" fill="${hexA(pal.accent, 0.17)}" fill-rule="evenodd" stroke="${hexA(pal.accent, 0.45)}" stroke-width="0.7" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`);
    parts.push('</g>');
    parts.push(`<g class="lx-maplines">${mapLines(F, R, pal)}</g>`);
    parts.push('</g>');
    parts.push(`<rect x="${f(F.x)}" y="${f(F.y)}" width="${f(F.w)}" height="${f(F.h)}" fill="none" stroke="${ink(0.3)}"/>`);
    parts.push(`<g class="lx-mapticks">${mapTicks(F, mob, pal)}</g>`);
    // Key, bottom left (the Pacific): the same marks the dots use.
    {
      const y = F.y + F.h - (mob ? 12 : 16);
      let x = F.x + (mob ? 10 : 14);
      const size = mob ? 8.5 : 9.5;
      parts.push(`<rect x="${f(F.x + 1)}" y="${f(y - 10)}" width="${mob ? 318 : 350}" height="20" fill="${hexA(pal.bg, 0.55)}"/>`);
      const key = (shape, label, w) => {
        parts.push(shape(x, y));
        text(x + 9, y, label, { size, fill: ink(0.6) });
        x += w;
      };
      key((x0, y0) => `<circle cx="${f(x0)}" cy="${f(y0)}" r="4" fill="${pal.accent}" stroke="${pal.bg}" stroke-width="1.5"/>`, 'lived', mob ? 45 : 50);
      key((x0, y0) => `<circle cx="${f(x0)}" cy="${f(y0)}" r="3.2" fill="${pal.ink}"/>`, 'photos', mob ? 54 : 60);
      key((x0, y0) => `<rect x="${f(x0 - 3.5)}" y="${f(y0 - 3.5)}" width="7" height="7" fill="none" stroke="${pal.ink}" stroke-width="1.4"/>`, 'worked', mob ? 54 : 62);
      key((x0, y0) => `<line x1="${f(x0 - 6)}" y1="${f(y0)}" x2="${f(x0 + 5)}" y2="${f(y0)}" stroke="${hexA(pal.ink, 0.6)}" stroke-width="1.3"/>`, 'moved', mob ? 52 : 58);
      key((x0, y0) => `<rect x="${f(x0 - 5)}" y="${f(y0 - 3.5)}" width="10" height="7" fill="${hexA(pal.accent, 0.17)}" stroke="${hexA(pal.accent, 0.45)}" stroke-width="0.7"/>`, `${countries.length} countries`, 0);
    }
  }

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'lx-ov');
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = parts.join('');
  if (mode === 'place') svg.dataset.detail = useDetail(geo) ? 'hi' : 'lo';
  return svg;
}

/* ── Travel map pieces ─────────────────────────────────────────────────────── */

/** Zoomed in close, with the finer outlines loaded, the map draws them. */
export const DETAIL_ZOOM = 2.5;
const useDetail = (geo) => !!geo?.detail && mapZoom().k >= DETAIL_ZOOM;

// Path data in degrees (x = lon, y = −lat), built once per dataset.
const degPaths = new WeakMap();
function degPath(fc) {
  let d = degPaths.get(fc);
  if (d == null) {
    d = '';
    planarRings(fc).forEach((ring) => {
      ring.forEach(([lon, lat], i) => (d += `${i ? 'L' : 'M'}${lon.toFixed(2)},${(-lat).toFixed(2)}`));
      d += 'Z';
    });
    degPaths.set(fc, d);
  }
  return d;
}

const visited = new WeakMap();
function visitedOf(all) {
  let v = visited.get(all);
  if (!v) {
    const names = new Set(countries.map((c) => c.name));
    v = { type: 'FeatureCollection', features: all.features.filter((c) => names.has(c.properties.name)) };
    visited.set(all, v);
  }
  return v;
}

/** Degrees → screen for the current view, as an SVG transform. */
function geoMatrix(F) {
  const { b } = F;
  const sx = F.w / (b.east - b.west);
  const sy = F.h / (b.north - b.south);
  return `matrix(${sx} 0 0 ${sy} ${F.x - b.west * sx} ${F.y + b.north * sy})`;
}

/** Grid spacing: the widest step that still gives five lines across the view. */
const gridStep = (span) => [30, 15, 10, 5, 2, 1, 0.5, 0.25].find((s) => span / s >= 5) ?? 0.25;
const gridLines = (lo, hi, step) => {
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(4));
  return out;
};

/** The graticule, island dots and the moves between homes, for the current view. */
function mapLines(F, R, pal) {
  const { b } = F;
  const sx = F.w / (b.east - b.west);
  const sy = F.h / (b.north - b.south);
  const pj = (lon, lat) => [F.x + (lon - b.west) * sx, F.y + (b.north - lat) * sy];
  const out = [];
  const step = gridStep(b.east - b.west);
  const grid = hexA(pal.ink, 0.08);
  for (const lon of gridLines(b.west, b.east, step)) out.push(`<line x1="${f(pj(lon, 0)[0])}" y1="${f(F.y)}" x2="${f(pj(lon, 0)[0])}" y2="${f(F.y + F.h)}" stroke="${grid}"/>`);
  for (const lat of gridLines(b.south, b.north, step)) out.push(`<line x1="${f(F.x)}" y1="${f(pj(0, lat)[1])}" x2="${f(F.x + F.w)}" y2="${f(pj(0, lat)[1])}" stroke="${grid}"/>`);
  // Islands too small for the outlines: a dot each, growing a little with the zoom.
  const r = Math.min(4, 2.2 * Math.sqrt(mapZoom().k));
  for (const c of countries) {
    if (!c.at) continue;
    const [x, y] = pj(c.at[1], c.at[0]);
    out.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${hexA(pal.accent, 0.55)}"/>`);
  }
  // The moves between the places lived, in order: the only lines on the map.
  const home = homes.map((h) => anchor(byId.get(h.id), 'place', R));
  let d = `M${f(home[0][0])},${f(home[0][1])}`;
  for (let i = 1; i < home.length; i++) {
    const [x0, y0] = home[i - 1];
    const [x1, y1] = home[i];
    const bow = Math.min(60, Math.hypot(x1 - x0, y1 - y0) * 0.22);
    d += ` Q${f((x0 + x1) / 2)},${f(Math.min(y0, y1) - bow)} ${f(x1)},${f(y1)}`;
  }
  out.push(`<path d="${d}" fill="none" stroke="${hexA(pal.ink, 0.6)}" stroke-width="1.3"/>`);
  return out.join('');
}

/** Latitude and longitude labels around the view (fewer on phones). */
function mapTicks(F, mob, pal) {
  const { b } = F;
  const step = gridStep(b.east - b.west);
  const fmt = (v, pos, neg) => `${Math.abs(v)}°${v < 0 ? neg : v > 0 ? pos : ''}`;
  const label = (x, y, s, anchor, size, halo) =>
    `<text class="ov-mono" x="${f(x)}" y="${f(y)}" text-anchor="${anchor}" dominant-baseline="middle" font-size="${size}" fill="${hexA(pal.ink, 0.55)}"${halo ? ` paint-order="stroke" stroke="${pal.bg}" stroke-width="3" stroke-linejoin="round"` : ''}>${s}</text>`;
  const out = [];
  // Phones label every other line: longitudes under the map, latitudes just inside it, clear of the key.
  const every = (v) => !mob || Math.round(v / step) % 2 === 0;
  for (const lon of gridLines(b.west, b.east, step)) {
    if (!every(lon)) continue;
    const x = F.x + ((lon - b.west) / (b.east - b.west)) * F.w;
    out.push(label(x, F.y + F.h + (mob ? 12 : 14), fmt(lon, 'E', 'W'), 'middle', mob ? 8 : 9));
  }
  for (const lat of gridLines(b.south, b.north, step)) {
    if (!every(lat)) continue;
    const y = F.y + ((b.north - lat) / (b.north - b.south)) * F.h;
    if (mob) {
      if (y < F.y + F.h - 26) out.push(label(F.x + 4, y - 6, fmt(lat, 'N', 'S'), 'start', 8, true));
    } else out.push(label(F.x - 8, y, fmt(lat, 'N', 'S'), 'end', 9));
  }
  return out.join('');
}

/** Move the drawn map to the current zoom without rebuilding it. */
export function updateMap(svg, R, W) {
  if (!svg) return;
  const pal = systems.place.palette;
  const F = mapFrame(R);
  svg.querySelector('.lx-geo')?.setAttribute('transform', geoMatrix(F));
  const lines = svg.querySelector('.lx-maplines');
  if (lines) lines.innerHTML = mapLines(F, R, pal);
  const ticks = svg.querySelector('.lx-mapticks');
  if (ticks) ticks.innerHTML = mapTicks(F, W < 760, pal);
}
