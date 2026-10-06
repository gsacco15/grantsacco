// The six coordinate systems. Each one maps the same items to new positions.
// Positions are normalised (u → right, v → up, both 0–1) inside the system's frame.
import { items } from '../content.js';

export const STAGES = ['idea', 'sketch', 'prototype', 'built', 'shipped'];
const YEAR0 = 2015;
const YEAR1 = 2027; // exclusive end of the time axis

const range = (a, b, step) => {
  const out = [];
  for (let v = a; v <= b + 1e-9; v += step) out.push(+v.toFixed(4));
  return out;
};

// Which item kinds each system cares about most (used for label priority).
export const focusKind = {
  reality: 'life',
  structure: 'engineering',
  build: 'project',
  image: 'art',
  place: 'travel',
  digital: 'app',
};

export const systems = {
  reality: {
    frame: 'polar',
    title: 'Around you, by time',
    readout: 'r = year · θ = order · origin = you',
    palette: { bg: '#ece8e1', ink: '#1f1d1a', muted: '#8a8378', accent: '#c2552d' },
    rings: range(YEAR0, YEAR1 - 1, 1),
  },
  structure: {
    frame: 'cartesian',
    axes: 'box',
    title: 'Physical scale × complexity',
    readout: 'x = physical scale (log) · y = complexity',
    palette: { bg: '#f1f2ef', ink: '#14181d', muted: '#6b737c', accent: '#e0362c' },
    x: {
      label: 'Physical scale →',
      ticks: [
        { at: 0, label: '1 mm' },
        { at: 0.2, label: '1 cm' },
        { at: 0.4, label: '10 cm' },
        { at: 0.6, label: '1 m' },
        { at: 0.8, label: '10 m' },
        { at: 1, label: '100 m' },
      ],
    },
    y: {
      label: 'Complexity ↑',
      ticks: [
        { at: 0, label: 'simple' },
        { at: 0.5, label: 'moderate' },
        { at: 1, label: 'complex' },
      ],
    },
    gridU: range(0, 1, 0.1),
    gridV: range(0, 1, 0.125),
    pos: (it) => [it.axes.scale, it.axes.complexity],
  },
  build: {
    frame: 'cartesian',
    axes: 'box',
    title: 'Time × completion',
    readout: 'x = year started · y = how far it got',
    palette: { bg: '#1c1d1f', ink: '#ece8e1', muted: '#8d8a84', accent: '#ff6a1a' },
    x: {
      label: 'Time →',
      ticks: range(YEAR0, YEAR1 - 1, 2).map((y) => ({ at: (y - YEAR0) / (YEAR1 - YEAR0), label: String(y) })),
    },
    y: {
      label: 'Completion ↑',
      ticks: STAGES.map((s, i) => ({ at: (i + 0.5) / STAGES.length, label: s })),
    },
    gridU: range(0, 1, 1 / (YEAR1 - YEAR0)),
    gridV: range(0, 1, 1 / STAGES.length),
    // Trips and the degree aren't "builds": they stay plotted but unlabeled.
    quietKinds: ['travel', 'life'],
    // Positions come from buildLayout (lanes + rows), not a simple fn.
  },
  image: {
    frame: 'cartesian',
    axes: 'cross',
    title: 'Functional ↔ expressive',
    readout: 'x = functional → expressive · y = controlled → experimental',
    palette: { bg: '#0b0b0b', ink: '#eee6d8', muted: '#8b857b', accent: '#d9b37a' },
    x: { label: 'expressive', start: 'functional', ticks: [] },
    y: { label: 'experimental', start: 'controlled', ticks: [] },
    gridU: [0.5],
    gridV: [0.5],
    pos: (it) => [it.axes.expressive, it.axes.experimental],
  },
  place: {
    frame: 'map',
    title: 'Where it happened',
    readout: 'x = longitude · y = latitude',
    palette: { bg: '#0a1324', ink: '#d8e3f3', muted: '#7d8da6', accent: '#ffb648' },
    x: { label: 'Longitude →' },
    y: { label: 'Latitude ↑' },
  },
  digital: {
    frame: 'cartesian',
    axes: 'box',
    title: 'Physical ↔ digital',
    readout: 'x = physical → digital · y = experiment → finished · lines = links',
    palette: { bg: '#050706', ink: '#c9f7df', muted: '#5e8c75', accent: '#5cf2b0' },
    x: {
      label: 'digital →',
      start: 'physical',
      ticks: [],
    },
    y: {
      label: 'finished ↑',
      start: 'experiment',
      ticks: [],
    },
    gridU: range(0, 1, 0.05),
    gridV: range(0, 1, 0.0834),
    pos: (it) => [it.axes.digital, it.axes.finished],
    links: true,
  },
};

/* ── Layouts that need more than a one-line mapping ───────────────────────── */

const chrono = [...items].sort((a, b) => a.years[0] - b.years[0] || a.years[1] - b.years[1] || a.id.localeCompare(b.id));

export const yearToRing = (year) => (year - YEAR0 + 0.5) / (YEAR1 - YEAR0);

/** Polar: radius = start year, angle = golden-angle by chronological order. */
export function polarLayout() {
  const out = new Map();
  chrono.forEach((it, i) => {
    const r = 0.18 + 0.82 * yearToRing(it.years[0] + (it.years[1] - it.years[0]) * 0.25);
    const theta = -Math.PI / 2 + i * 2.39996; // golden angle
    out.set(it.id, { r, theta });
  });
  return out;
}

/**
 * Build: lanes by stage, rows inside a lane assigned greedily so labels and
 * duration bars don't collide. `pxPerUnit` lets the layout reason in pixels.
 */
export function buildLayout(plotW, labelWidths) {
  const lanes = STAGES.map(() => []);
  const sorted = [...items].sort((a, b) => a.years[0] - b.years[0]);
  const out = new Map();
  for (const it of sorted) {
    const lane = Math.max(0, STAGES.indexOf(it.stage));
    const u0 = (it.years[0] - YEAR0) / (YEAR1 - YEAR0);
    const u1 = (it.years[1] + 1 - YEAR0) / (YEAR1 - YEAR0);
    const endPx = Math.max(u1 * plotW, u0 * plotW + (labelWidths.get(it.id) ?? 140) + 22);
    const rows = lanes[lane];
    let row = rows.findIndex((last) => last < u0 * plotW - 6);
    if (row === -1) {
      row = rows.length;
      rows.push(0);
    }
    rows[row] = endPx;
    out.set(it.id, { lane, row, u0, u1 });
  }
  // Convert lane/row into v, spreading rows evenly inside each lane.
  for (const [id, p] of out) {
    const n = lanes[p.lane].length;
    const laneH = 1 / STAGES.length;
    const inner = n === 1 ? 0.5 : 0.26 + (0.48 * p.row) / (n - 1);
    p.v = p.lane * laneH + laneH * (1 - inner);
    out.set(id, p);
  }
  return out;
}

/** Fit the map crop to the items, matching the frame's aspect ratio. */
export function mapBounds(aspect) {
  const lats = items.map((i) => i.place.lat);
  const lons = items.map((i) => i.place.lon);
  let west = Math.min(...lons) - 22;
  let east = Math.max(...lons) + 22;
  let south = Math.min(...lats) - 16;
  let north = Math.max(...lats) + 10;
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
  // Keep inside the world; shift rather than squash where possible.
  if (north > 85) {
    south -= north - 85;
    north = 85;
  }
  if (south < -85) south = -85;
  if (west < -180) {
    east += -180 - west;
    west = -180;
  }
  if (east > 180) east = 180;
  return { west, east, north, south };
}

/** Graticule spacing that suits the crop. */
export function graticule(b) {
  const step = b.east - b.west > 200 ? 30 : 15;
  const lons = [];
  const lats = [];
  for (let l = Math.ceil(b.west / step) * step; l <= b.east; l += step) lons.push(l);
  for (let l = Math.ceil(b.south / step) * step; l <= b.north; l += step) lats.push(l);
  return { lons, lats, step };
}

export const relatedPairs = (() => {
  const seen = new Set();
  const pairs = [];
  for (const it of items) {
    for (const r of it.related ?? []) {
      const key = [it.id, r].sort().join('|');
      if (seen.has(key) || !items.some((x) => x.id === r)) continue;
      seen.add(key);
      pairs.push([it.id, r]);
    }
  }
  return pairs;
})();

export const travelRoute = chrono.filter((it) => it.kind === 'travel').map((it) => it.id);
