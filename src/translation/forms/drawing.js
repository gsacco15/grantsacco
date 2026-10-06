// Procedural engineering drawing. Every item gets a deterministic part (from the
// hash of its id) drawn as a proper sheet: frame and zones, orthographic views,
// a hatched section, centre and hidden lines, dimensions, a detail bubble, a
// revision table and a red revision cloud. Returns SVG markup; strokes carry
// timing variables so the form can draw them on.
import { hashString, mulberry32 } from '../../anim.js';
import { STAGES } from '../lib.js';

export const VB = { w: 1189, h: 841 };
export const TB = { x: 735, y: 657, w: 420, h: 150 }; // title block, in sheet units

const SCALES = [
  ['5:1', 0.2],
  ['2:1', 0.5],
  ['1:1', 1],
  ['1:2', 2],
  ['1:5', 5],
  ['1:10', 10],
  ['1:20', 20],
  ['1:50', 50],
  ['1:100', 100],
  ['1:200', 200],
  ['1:500', 500],
];

const r1 = (n) => Math.round(n * 10) / 10;
const circ = (cx, cy, r) => `M${r1(cx - r)},${r1(cy)}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`;
const rect = (x, y, w, h) => `M${r1(x)},${r1(y)}h${r1(w)}v${r1(h)}h${r1(-w)}Z`;

class Sheet {
  constructor(uid, factor) {
    this.uid = uid;
    this.factor = factor;
    this.out = [];
    this.defs = [];
    this.clips = 0;
  }

  push(s) {
    this.out.push(s);
  }

  /** A real-world measurement for a length drawn in sheet units. */
  mm(v) {
    const n = v * this.factor;
    return n >= 10 ? String(Math.round(n)) : String(r1(n));
  }

  // Strokes that draw on (stroke-dashoffset on a normalised path length).
  draw(d, cls, t0, dur = 0.9) {
    this.push(`<path class="draw ${cls}" pathLength="1" style="--d:${t0.toFixed(2)};--t:${dur}" d="${d}"/>`);
  }
  // Patterned strokes and fills fade in instead.
  fade(d, cls, t0, extra = '') {
    this.push(`<path class="fade ${cls}" style="--d:${t0.toFixed(2)}" d="${d}" ${extra}/>`);
  }
  text(x, y, s, t0, cls = 't', anchor = 'middle', rot = 0) {
    const tr = rot ? ` transform="rotate(${rot} ${r1(x)} ${r1(y)})"` : '';
    this.push(
      `<text class="fade ${cls}" style="--d:${t0.toFixed(2)}" x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}"${tr}>${s}</text>`,
    );
  }

  vis(d, t0, dur = 1) {
    this.draw(d, 'v', t0, dur);
  }
  thin(d, t0, dur = 0.6) {
    this.draw(d, 'n', t0, dur);
  }
  hidden(d, t0) {
    this.fade(d, 'h', t0);
  }
  centre(d, t0) {
    this.fade(d, 'c', t0);
  }
  hatch(d, t0, clip) {
    this.fade(d, 'hatch', t0, `fill="url(#hatch-${this.uid})"${clip ? ` clip-path="url(#${clip})"` : ''}`);
  }

  arrow(x, y, ux, uy, t0) {
    const L = 13;
    const W = 3.3;
    const bx = x - ux * L;
    const by = y - uy * L;
    this.fade(`M${r1(x)},${r1(y)}L${r1(bx - uy * W)},${r1(by + ux * W)}L${r1(bx + uy * W)},${r1(by - ux * W)}Z`, 'ah', t0);
  }

  /** Horizontal dimension between two feature points, dimension line at y. */
  dimH(xa, ya, xb, yb, y, label, t0) {
    const s = Math.sign(y - (ya + yb) / 2) || 1;
    this.thin(`M${r1(xa)},${r1(ya + 5 * s)}V${r1(y + 9 * s)}M${r1(xb)},${r1(yb + 5 * s)}V${r1(y + 9 * s)}`, t0, 0.5);
    const inside = Math.abs(xb - xa) > 46;
    const pad = inside ? 0 : 24;
    this.thin(`M${r1(xa - pad)},${r1(y)}H${r1(xb + pad)}`, t0 + 0.25, 0.55);
    this.arrow(xa, y, inside ? -1 : 1, 0, t0 + 0.5);
    this.arrow(xb, y, inside ? 1 : -1, 0, t0 + 0.5);
    this.text((xa + xb) / 2, y - 7, label, t0 + 0.6);
  }

  /** Vertical dimension between two feature points, dimension line at x. */
  dimV(xa, ya, xb, yb, x, label, t0) {
    const s = Math.sign(x - (xa + xb) / 2) || 1;
    this.thin(`M${r1(xa + 5 * s)},${r1(ya)}H${r1(x + 9 * s)}M${r1(xb + 5 * s)},${r1(yb)}H${r1(x + 9 * s)}`, t0, 0.5);
    const inside = Math.abs(yb - ya) > 46;
    const pad = inside ? 0 : 24;
    this.thin(`M${r1(x)},${r1(ya - pad)}V${r1(yb + pad)}`, t0 + 0.25, 0.55);
    this.arrow(x, ya, 0, inside ? -1 : 1, t0 + 0.5);
    this.arrow(x, yb, 0, inside ? 1 : -1, t0 + 0.5);
    this.text(x - 7, (ya + yb) / 2, label, t0 + 0.6, 't', 'middle', -90);
  }

  /** Leader with arrowhead at (px, py) and text beyond a short shoulder. */
  leader(px, py, tx, ty, lines, t0, dir = 1) {
    const L = Math.hypot(px - tx, py - ty);
    this.thin(`M${r1(px)},${r1(py)}L${r1(tx)},${r1(ty)}H${r1(tx + 18 * dir)}`, t0, 0.5);
    this.arrow(px, py, (px - tx) / L, (py - ty) / L, t0 + 0.3);
    lines.forEach((s, i) => this.text(tx + 23 * dir, ty + 4.5 + i * 17, s, t0 + 0.45, 't', dir > 0 ? 'start' : 'end'));
  }

  /** Cutting-plane line ends with viewing arrows and letters. */
  cut(x, yTop, yBot, letter, t0, dir = 1) {
    for (const [y, s] of [
      [yTop, 1],
      [yBot, -1],
    ]) {
      this.draw(`M${x},${y}V${y + 22 * s}`, 'v cp', t0, 0.3);
      this.thin(`M${x},${y}H${x + 28 * dir}`, t0 + 0.2, 0.3);
      this.arrow(x + 30 * dir, y, dir, 0, t0 + 0.4);
      this.text(x + 16 * dir, y - 9 * s + (s < 0 ? 12 : 0), letter, t0 + 0.5, 'tl');
    }
  }

  clip(cx, cy, r) {
    const id = `clip-${this.uid}-${this.clips++}`;
    this.defs.push(`<clipPath id="${id}"><circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r}"/></clipPath>`);
    return id;
  }

  /** Scalloped revision cloud around a box (clockwise, bulging outward). */
  cloud(x, y, w, h, t0) {
    const r = 9;
    const pts = [];
    const edge = (x0, y0, x1, y1) => {
      const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / (r * 1.6)));
      for (let i = 1; i <= n; i++) pts.push([x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
    };
    edge(x, y, x + w, y);
    edge(x + w, y, x + w, y + h);
    edge(x + w, y + h, x, y + h);
    edge(x, y + h, x, y);
    let d = `M${r1(x)},${r1(y)}`;
    for (const [px, py] of pts) d += `A${r},${r} 0 0 1 ${r1(px)},${r1(py)}`;
    this.draw(d, 'red', t0, 1.1);
  }

  revMark(x, y, letter, t0) {
    this.draw(`M${x},${y - 14}L${x + 13},${y + 9}H${x - 13}Z`, 'red', t0, 0.5);
    this.text(x, y + 5.5, letter, t0 + 0.3, 'tred');
  }

  svg() {
    return `<defs>
      <pattern id="hatch-${this.uid}" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="8" class="hatch-line"/>
      </pattern>${this.defs.join('')}</defs>${this.out.join('')}`;
  }
}

/* ── Sheet furniture ───────────────────────────────────────────────────────── */

function frame(S) {
  S.push(`<rect class="paper" width="${VB.w}" height="${VB.h}"/>`);
  S.draw(rect(14, 14, 1161, 813), 'b', 0, 1.2);
  S.draw(rect(34, 34, 1121, 773), 'f', 0.1, 1.4);
  const cols = 8;
  const rows = 6;
  let ticks = '';
  for (let i = 1; i < cols; i++) {
    const x = r1(34 + (1121 * i) / cols);
    ticks += `M${x},14V34M${x},807V827`;
  }
  for (let j = 1; j < rows; j++) {
    const y = r1(34 + (773 * j) / rows);
    ticks += `M14,${y}H34M1155,${y}H1175`;
  }
  S.fade(ticks, 'b', 0.4);
  S.fade('M594.5,4V34M594.5,807V837M4,420.5H34M1155,420.5H1185', 'f', 0.5);
  for (let i = 0; i < cols; i++) {
    const x = 34 + (1121 * (i + 0.5)) / cols;
    S.text(x, 28, i + 1, 0.5, 'z');
    S.text(x, 822, i + 1, 0.5, 'z');
  }
  for (let j = 0; j < rows; j++) {
    const y = 34 + (773 * (j + 0.5)) / rows + 4;
    S.text(24, y, 'ABCDEF'[j], 0.5, 'z');
    S.text(1165, y, 'ABCDEF'[j], 0.5, 'z');
  }
}

function titleBlock(S, t0) {
  const { x, y, w, h } = TB;
  const g = [];
  const keep = S.out;
  S.out = g;
  S.draw(rect(x, y, w, h), 'f', t0, 1);
  const ra = y + 58;
  const rb = y + 102;
  const c1 = x + 168;
  const c2 = c1 + 84;
  const c3 = c2 + 84;
  S.thin(`M${x},${ra}H${x + w}M${x},${rb}H${x + w}`, t0 + 0.3, 0.6);
  S.thin(`M${c1},${ra}V${y + h}M${c2},${ra}V${y + h}M${c3},${ra}V${rb}`, t0 + 0.45, 0.5);
  // Projection block with the third-angle symbol.
  const px = x - 92;
  S.draw(rect(px, ra, 92, h - 58), 'n', t0 + 0.3, 0.7);
  S.text(px + 7, ra + 13, 'PROJECTION', t0 + 0.7, 'tl', 'start');
  const sy = ra + 52;
  S.thin(`M${px + 14},${sy - 14}L${px + 46},${sy - 8}V${sy + 8}L${px + 14},${sy + 14}Z`, t0 + 0.6, 0.6);
  S.thin(`${circ(px + 70, sy, 14)}${circ(px + 70, sy, 8)}`, t0 + 0.7, 0.6);
  S.centre(`M${px + 8},${sy}H${px + 88}M${px + 70},${sy - 20}V${sy + 20}`, t0 + 0.9);
  S.out = keep;
  S.push(`<g class="tbl">${g.join('')}</g>`);
}

function revTable(S, item, t0) {
  const si = STAGES.indexOf(item.stage);
  const letters = 'ABCDE';
  const desc = ['CONCEPT ISSUE', 'SKETCH ISSUE', 'PROTOTYPE ISSUE', 'AS BUILT', 'RELEASED — AS SHIPPED'];
  const rows = [];
  if (si > 0) rows.push([letters[si - 1], desc[si - 1], item.years[0], false]);
  rows.push([letters[si], desc[si], item.years[1], true]);
  const x = 815;
  const y = 34;
  const cols = [815, 855, 1045, 1105, 1155];
  const h = 20 + rows.length * 24;
  S.thin(`${rect(x, y, 340, h)}M${x},${y + 20}H1155`, t0, 0.8);
  S.thin(cols.slice(1, -1).map((c) => `M${c},${y}V${y + h}`).join(''), t0 + 0.3, 0.4);
  ['REV', 'DESCRIPTION', 'DATE', 'BY'].forEach((s, i) => S.text(cols[i] + 7, y + 14, s, t0 + 0.5, 'tl', 'start'));
  rows.forEach(([l, d, yr, red], i) => {
    const ty = y + 20 + i * 24 + 16.5;
    const cls = red ? 'tredl' : 'tv';
    S.text(cols[0] + 20, ty, l, t0 + 0.6 + i * 0.1, cls);
    S.text(cols[1] + 7, ty, d, t0 + 0.6 + i * 0.1, cls, 'start');
    S.text(cols[2] + 7, ty, yr, t0 + 0.6 + i * 0.1, cls, 'start');
    S.text(cols[3] + 7, ty, 'GS', t0 + 0.6 + i * 0.1, cls, 'start');
  });
  return letters[si];
}

/* ── Details ───────────────────────────────────────────────────────────────── */

function bubble(S, x, y, r, letter, t0) {
  S.thin(circ(x, y, r), t0, 0.7);
  const a = -Math.PI / 4;
  S.thin(`M${r1(x + Math.cos(a) * r)},${r1(y + Math.sin(a) * r)}l14,-14h10`, t0 + 0.4, 0.3);
  S.text(x + Math.cos(a) * r + 30, y + Math.sin(a) * r - 9, letter, t0 + 0.6, 'tl', 'start');
}

function detailFrame(S, cx, cy, R, letter, scale, t0) {
  S.thin(circ(cx, cy, R), t0, 0.9);
  S.text(cx, cy + R + 26, `DETAIL ${letter}`, t0 + 0.6, 'tv');
  S.text(cx, cy + R + 43, `SCALE ${scale}`, t0 + 0.7, 'tl');
}

/** Internal corner with a fillet. (qx, qy) points into the empty quadrant. */
function detailCorner(S, cx, cy, qx, qy, rf, label, t0) {
  const R = 100;
  const clip = S.clip(cx, cy, R - 1);
  const sweep = qx * qy < 0 ? 0 : 1;
  const P = (x, y) => `${r1(cx + x)},${r1(cy + y)}`;
  S.hatch(rect(cx - R, cy - R, 2 * R, 2 * R), t0 + 0.9, clip);
  S.push(
    `<path class="fade paperfill" style="--d:${(t0 + 0.9).toFixed(2)}" clip-path="url(#${clip})" d="M${P(0, qy * R)}L${P(0, qy * rf)}A${rf},${rf} 0 0 ${sweep} ${P(qx * rf, 0)}L${P(qx * R, 0)}L${P(qx * R, qy * R)}Z"/>`,
  );
  S.vis(`M${P(0, qy * R)}L${P(0, qy * rf)}A${rf},${rf} 0 0 ${sweep} ${P(qx * rf, 0)}L${P(qx * R, 0)}`, t0 + 0.3, 0.9);
  const m = rf * (1 - Math.SQRT1_2);
  S.leader(cx + qx * m, cy + qy * m, cx + qx * 52, cy + qy * 52, [label], t0 + 1.1, qx);
}

/** A rectangular groove in a surface; material below (qy = 1) or above (qy = -1). */
function detailGroove(S, cx, cy, gw, gd, labels, t0) {
  const R = 100;
  const clip = S.clip(cx, cy, R - 1);
  const x0 = cx - gw / 2;
  const x1 = cx + gw / 2;
  S.hatch(`M${cx - R},${cy}H${x0}V${cy + gd}H${x1}V${cy}H${cx + R}V${cy + R}H${cx - R}Z`, t0 + 0.9, clip);
  S.push(`<g clip-path="url(#${clip})">`);
  S.vis(`M${cx - R},${cy}H${x0}V${cy + gd}H${x1}V${cy}H${cx + R}`, t0 + 0.3, 0.9);
  S.push('</g>');
  S.dimH(x0, cy, x1, cy, cy - 30, labels[0], t0 + 1.1);
  S.leader(x1, cy + gd * 0.6, cx + 52, cy + 56, [labels[1]], t0 + 1.3, 1);
}

/* ── Archetypes ────────────────────────────────────────────────────────────── */

const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];

/** Flanged hub: front view with bolt pattern, section A–A, fillet detail. */
function hub(S, item, rnd) {
  const cx = 290;
  const cy = 395;
  const R1 = 148;
  const Rb = pick(rnd, [112, 116, 120]);
  const N = 4 + 2 * Math.round(item.axes.complexity * 2);
  const rh = 11;
  const R2 = pick(rnd, [64, 70, 76]);
  const R3 = pick(rnd, [30, 34]);
  const kw = 16;
  const kd = 9;

  // Front view.
  S.vis(circ(cx, cy, R1), 0.35, 1.1);
  S.vis(circ(cx, cy, R2), 0.5, 0.9);
  const hx = kw / 2;
  const yk = -Math.sqrt(R3 * R3 - hx * hx);
  S.vis(
    `M${cx - hx},${r1(cy + yk)}V${cy - R3 - kd}H${cx + hx}V${r1(cy + yk)}A${R3},${R3} 0 1 1 ${cx - hx},${r1(cy + yk)}`,
    0.6,
    0.8,
  );
  let holes = '';
  let crosses = '';
  for (let i = 0; i < N; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / N;
    const hxp = cx + Rb * Math.cos(a);
    const hyp = cy + Rb * Math.sin(a);
    holes += circ(hxp, hyp, rh);
    const c = rh + 6;
    crosses += `M${r1(hxp - Math.cos(a) * c)},${r1(hyp - Math.sin(a) * c)}L${r1(hxp + Math.cos(a) * c)},${r1(hyp + Math.sin(a) * c)}`;
  }
  S.vis(holes, 0.7, 1);
  S.centre(`${circ(cx, cy, Rb)}${crosses}M${cx - R1 - 18},${cy}H${cx + R1 + 18}M${cx},${cy - R1 - 16}V${cy + R1 + 16}`, 0.9);
  S.cut(cx, cy - R1 - 40, cy + R1 + 40, 'A', 1.1);
  S.text(cx, cy + R1 + 92, 'FRONT VIEW', 1.2, 'tv');

  // Section A–A.
  const t = 34;
  const L = pick(rnd, [104, 116, 128]);
  const T = t + L;
  const x0 = 640 - T / 2;
  const xs = x0 + t + Math.round(L * 0.55); // set screw over the key
  const rs = 6;
  S.hidden(`M${cx - rs},${cy - R2}V${cy - R3 - kd}M${cx + rs},${cy - R2}V${cy - R3 - kd}`, 1.0);
  const regions = [
    [x0, cy - R1, t, R1 - Rb - rh],
    [x0, cy - Rb + rh, t, Rb - rh - R3 - kd],
    [x0 + t, cy - R2, xs - rs - x0 - t, R2 - R3 - kd],
    [xs + rs, cy - R2, x0 + T - xs - rs, R2 - R3 - kd],
    [x0, cy + Rb + rh, t, R1 - Rb - rh],
    [x0, cy + R3, t, Rb - rh - R3],
    [x0 + t, cy + R3, L, R2 - R3],
  ];
  S.hatch(regions.map(([x, y, w, h]) => rect(x, y, w, h)).join(''), 1.0);
  S.vis(`M${x0},${cy - R1}H${x0 + t}V${cy - R2}H${x0 + T}V${cy + R2}H${x0 + t}V${cy + R1}H${x0}Z`, 0.45, 1.2);
  S.vis(
    `M${x0},${cy - R3 - kd}H${x0 + T}M${x0},${cy + R3}H${x0 + T}M${x0},${cy - Rb - rh}H${x0 + t}M${x0},${cy - Rb + rh}H${x0 + t}M${x0},${cy + Rb - rh}H${x0 + t}M${x0},${cy + Rb + rh}H${x0 + t}M${xs - rs},${cy - R2}V${cy - R3 - kd}M${xs + rs},${cy - R2}V${cy - R3 - kd}`,
    0.75,
    0.8,
  );
  S.centre(
    `M${x0 - 18},${cy}H${x0 + T + 18}M${x0 - 10},${cy - Rb}H${x0 + t + 10}M${x0 - 10},${cy + Rb}H${x0 + t + 10}M${xs},${cy - R2 - 12}V${cy - R3 - kd + 8}`,
    0.95,
  );
  S.text(640, cy + R1 + 92, 'SECTION A–A', 1.2, 'tv');

  // Dimensions.
  S.dimH(cx - R1, cy, cx + R1, cy, cy + R1 + 58, `Ø${S.mm(2 * R1)}`, 1.3);
  const a1 = -Math.PI / 2 + (2 * Math.PI) / N;
  S.leader(cx + Rb * Math.cos(a1) + rh * 0.7, cy + Rb * Math.sin(a1) - rh * 0.7, cx + R1 + 26, cy - R1 + 6, [
    `${N}× Ø${S.mm(2 * rh)} EQ SP`,
    `ON Ø${S.mm(2 * Rb)} PCD`,
  ], 1.5);
  S.leader(cx - R3 * 0.7, cy + R3 * 0.7, cx - R1 + 4, cy + R1 + 10, [`Ø${S.mm(2 * R3)} H7`], 1.6, -1);
  S.dimH(x0, cy + R1, x0 + T, cy + R2, cy + R1 + 40, S.mm(T), 1.45);
  S.dimH(x0, cy - R1, x0 + t, cy - R1, cy - R1 - 28, S.mm(t), 1.55);
  S.dimV(x0 + T, cy - R2, x0 + T, cy + R2, x0 + T + 46, `Ø${S.mm(2 * R2)}`, 1.6);

  // Detail B at the hub/flange corner.
  bubble(S, x0 + t, cy - R2, 24, 'B', 1.7);
  detailFrame(S, 985, 400, 100, 'B', '4:1', 1.5);
  detailCorner(S, 985, 400, 1, -1, 26, `R${S.mm(26 / 4)}`, 1.5);

  return { cloud: [cx - 30, cy - R3 - kd - 16, 60, 40] };
}

/** Bracket: front view of the upright with holes and a slot, L-section A–A. */
function plate(S, item, rnd) {
  const cx = 300;
  const cy = 380;
  const W = pick(rnd, [360, 380, 400]);
  const H = pick(rnd, [240, 260]);
  const rc = 18;
  const T = 22;
  const cols = 2 + Math.round(item.axes.complexity * 2);
  const rh = 10;
  const ins = 38;
  const sl = pick(rnd, [110, 130]);
  const sw = 34;
  const L = cx - W / 2;
  const R = cx + W / 2;
  const Tp = cy - H / 2;
  const Bt = cy + H / 2;

  // Front view.
  S.vis(
    `M${L + rc},${Tp}H${R - rc}A${rc},${rc} 0 0 1 ${R},${Tp + rc}V${Bt}H${L}V${Tp + rc}A${rc},${rc} 0 0 1 ${L + rc},${Tp}Z`,
    0.35,
    1.2,
  );
  S.vis(`M${L},${Bt - T}H${R}`, 0.55, 0.6);
  let holes = '';
  let crosses = '';
  const hy = Tp + ins;
  const hxs = Array.from({ length: cols }, (_, j) => L + ins + ((W - 2 * ins) * j) / (cols - 1));
  for (const hx of hxs) {
    holes += circ(hx, hy, rh);
    crosses += `M${r1(hx - rh - 6)},${hy}H${r1(hx + rh + 6)}M${r1(hx)},${hy - rh - 6}V${hy + rh + 6}`;
  }
  S.vis(holes, 0.65, 1);
  const sy = cy + 6;
  S.vis(
    `M${cx - sl / 2 + sw / 2},${sy - sw / 2}H${cx + sl / 2 - sw / 2}A${sw / 2},${sw / 2} 0 0 1 ${cx + sl / 2 - sw / 2},${sy + sw / 2}H${cx - sl / 2 + sw / 2}A${sw / 2},${sw / 2} 0 0 1 ${cx - sl / 2 + sw / 2},${sy - sw / 2}Z`,
    0.75,
    0.8,
  );
  S.centre(
    `${crosses}M${cx - sl / 2 - 14},${sy}H${cx + sl / 2 + 14}M${cx},${Tp - 16}V${Bt + 16}`,
    0.95,
  );
  S.hidden(`M${hxs[0] - rh},${Bt - T}V${Bt}M${hxs[0] + rh},${Bt - T}V${Bt}M${hxs[cols - 1] - rh},${Bt - T}V${Bt}M${hxs[cols - 1] + rh},${Bt - T}V${Bt}`, 1.0);
  S.cut(hxs[cols - 1], Tp - 34, Bt + 34, 'A', 1.1);
  S.text(cx, Bt + 96, 'FRONT VIEW', 1.2, 'tv');

  // Section A–A (right view): upright at the back, foot towards the viewer.
  const F = pick(rnd, [120, 136]);
  const xr = 700;
  const xl = xr - T;
  const xf = xr - F;
  const g = 54; // gusset leg
  const xm = r1((xf + xl) / 2); // foot hole, cut by the section plane
  S.hatch(
    `${rect(xl, Tp, T, hy - rh - Tp)}${rect(xl, hy + rh, T, Bt - T - hy - rh)}${rect(xm + rh, Bt - T, xr - xm - rh, T)}${rect(xf, Bt - T, xm - rh - xf, T)}`,
    1.0,
  );
  S.vis(`M${xl},${Tp}H${xr}V${Bt}H${xf}V${Bt - T}H${xl}Z`, 0.45, 1.2);
  S.vis(`M${xl},${hy - rh}H${xr}M${xl},${hy + rh}H${xr}M${xm - rh},${Bt - T}V${Bt}M${xm + rh},${Bt - T}V${Bt}`, 0.75, 0.6);
  S.vis(`M${xl},${Bt - T - g}L${xl - g},${Bt - T}`, 0.85, 0.5);
  S.centre(`M${xl - 12},${hy}H${xr + 12}M${xm},${Bt - T - 12}V${Bt + 12}`, 0.95);
  S.text(xr - F / 2, Bt + 96, 'SECTION A–A', 1.2, 'tv');

  // Dimensions.
  S.dimH(L, Bt, R, Bt, Bt + 46, S.mm(W), 1.3);
  S.dimV(L, Tp, L, Bt, L - 34, S.mm(H), 1.4);
  S.dimH(hxs[0], hy, hxs[1], hy, Tp - 26, S.mm(hxs[1] - hxs[0]), 1.5);
  S.leader(hxs[0] + rh * 0.7, hy + rh * 0.7, L + 70, cy - 40, [`${cols}× Ø${S.mm(2 * rh)} THRU`], 1.6);
  S.leader(cx + sl / 2 - 6, sy + sw / 2 - 2, cx + sl / 2 + 30, cy + 70, [`SLOT ${S.mm(sw)} × ${S.mm(sl)}`], 1.65);
  S.dimH(xf, Bt, xr, Bt, Bt + 46, S.mm(F), 1.45);
  S.dimH(xl, Tp, xr, Tp, Tp - 26, S.mm(T), 1.55);

  // Detail B at the inner corner of the L.
  bubble(S, xl, Bt - T, 22, 'B', 1.7);
  detailFrame(S, 985, 400, 100, 'B', '4:1', 1.5);
  detailCorner(S, 985, 400, -1, -1, 24, `R${S.mm(24 / 4)}`, 1.5);

  return { cloud: [cx - sl / 2 - 16, sy - sw / 2 - 14, sl + 32, sw + 28] };
}

/** Stepped shaft: front view, end view, removed section B–B through the keyway. */
function shaft(S, item, rnd) {
  const cy = 360;
  const n = 5;
  const D = [pick(rnd, [64, 70]), pick(rnd, [90, 96]), pick(rnd, [124, 132]), pick(rnd, [90, 96]), pick(rnd, [70, 76])];
  const Lr = [0.13, 0.2, 0.32, 0.2, 0.15];
  const Ltot = 520;
  const x0 = 70;
  const xs = [x0];
  Lr.forEach((l) => xs.push(xs[xs.length - 1] + l * Ltot));
  const ch = 5;

  // Profile, top edge left→right then bottom edge back (with end chamfers).
  let top = `M${x0},${cy - D[0] / 2 + ch}L${x0 + ch},${cy - D[0] / 2}`;
  for (let i = 0; i < n; i++) {
    if (i > 0) top += `V${cy - D[i] / 2}`;
    top += `H${r1(i === n - 1 ? xs[i + 1] - ch : xs[i + 1])}`;
  }
  top += `L${xs[n]},${cy - D[n - 1] / 2 + ch}V${cy + D[n - 1] / 2 - ch}L${xs[n] - ch},${cy + D[n - 1] / 2}`;
  for (let i = n - 1; i >= 0; i--) {
    top += `H${r1(i === 0 ? x0 + ch : xs[i])}`;
    if (i > 0) top += `V${cy + D[i - 1] / 2}`;
  }
  top += `L${x0},${cy + D[0] / 2 - ch}Z`;
  S.vis(top, 0.35, 1.4);
  let steps = '';
  for (let i = 1; i < n; i++) steps += `M${r1(xs[i])},${cy - Math.min(D[i], D[i - 1]) / 2}V${cy + Math.min(D[i], D[i - 1]) / 2}`;
  steps += `M${x0 + ch},${cy - D[0] / 2}V${cy + D[0] / 2}M${xs[n] - ch},${cy - D[n - 1] / 2}V${cy + D[n - 1] / 2}`;
  S.vis(steps, 0.6, 0.8);

  // Keyway on the largest step, groove on the fourth.
  const kx0 = xs[2] + 0.18 * (xs[3] - xs[2]);
  const kx1 = xs[3] - 0.18 * (xs[3] - xs[2]);
  const kw = 14;
  S.vis(
    `M${r1(kx0 + kw / 2)},${cy - kw / 2}H${r1(kx1 - kw / 2)}A${kw / 2},${kw / 2} 0 0 1 ${r1(kx1 - kw / 2)},${cy + kw / 2}H${r1(kx0 + kw / 2)}A${kw / 2},${kw / 2} 0 0 1 ${r1(kx0 + kw / 2)},${cy - kw / 2}Z`,
    0.75,
    0.7,
  );
  const gx = xs[3] + 0.62 * (xs[4] - xs[3]);
  const gw = 6;
  S.vis(`M${r1(gx)},${cy - D[3] / 2 + 3}V${cy + D[3] / 2 - 3}M${r1(gx + gw)},${cy - D[3] / 2 + 3}V${cy + D[3] / 2 - 3}`, 0.8, 0.5);
  S.hidden(
    `M${x0},${cy - 6}L${x0 + 14},${cy - 4}L${x0 + 19},${cy}L${x0 + 14},${cy + 4}L${x0},${cy + 6}M${xs[n]},${cy - 6}L${xs[n] - 14},${cy - 4}L${xs[n] - 19},${cy}L${xs[n] - 14},${cy + 4}L${xs[n]},${cy + 6}`,
    0.95,
  );
  S.centre(`M${x0 - 20},${cy}H${xs[n] + 20}M${r1((kx0 + kx1) / 2)},${cy - 14}V${cy + 14}`, 0.9);
  const kc = r1((kx0 + kx1) / 2);
  S.cut(kc, cy - D[2] / 2 - 38, cy + D[2] / 2 + 38, 'B', 1.1);
  S.text((x0 + xs[n]) / 2, cy + D[2] / 2 + 120, 'FRONT VIEW', 1.2, 'tv');

  // End view (from the right): every step shows as a ring.
  const ex = 760;
  const uniq = [...new Set(D)].sort((a, b) => b - a);
  S.vis(uniq.map((d) => circ(ex, cy, d / 2)).join(''), 0.5, 1.2);
  S.centre(`M${ex - D[2] / 2 - 16},${cy}H${ex + D[2] / 2 + 16}M${ex},${cy - D[2] / 2 - 16}V${cy + D[2] / 2 + 16}`, 0.95);
  S.text(ex, cy + D[2] / 2 + 46, 'VIEW FROM RIGHT', 1.2, 'tv');

  // Removed section B–B.
  const by = 590;
  const rB = D[2] / 2;
  const kd = 6;
  const kyy = by - Math.sqrt(rB * rB - (kw / 2) ** 2);
  const sec = `M${ex - kw / 2},${r1(kyy)}V${r1(by - rB + kd)}H${ex + kw / 2}V${r1(kyy)}A${rB},${rB} 0 1 1 ${ex - kw / 2},${r1(kyy)}Z`;
  S.hatch(sec, 1.0);
  S.vis(sec, 0.7, 1);
  S.centre(`M${ex - rB - 14},${by}H${ex + rB + 14}M${ex},${by - rB - 14}V${by + rB + 14}`, 0.95);
  S.text(ex, by + rB + 40, 'SECTION B–B', 1.2, 'tv');

  // Dimensions.
  S.dimH(x0, cy + D[0] / 2, xs[n], cy + D[n - 1] / 2, cy + D[2] / 2 + 64, S.mm(Ltot), 1.3);
  S.dimH(xs[2], cy - D[2] / 2, xs[3], cy - D[2] / 2, cy - D[2] / 2 - 30, S.mm(xs[3] - xs[2]), 1.4);
  S.dimH(xs[0], cy - D[0] / 2, xs[1], cy - D[1] / 2, cy - D[2] / 2 - 30, S.mm(xs[1] - xs[0]), 1.45);
  S.dimV(ex + D[2] / 2, cy - D[2] / 2, ex + D[2] / 2, cy + D[2] / 2, ex + D[2] / 2 + 40, `Ø${S.mm(D[2])}`, 1.5);
  S.leader(r1(kx1 - 6), cy + kw / 2 - 1, kx1 + 22, cy + D[2] / 2 + 26, [`KEYWAY ${S.mm(kw)} P9`], 1.6);

  // Detail C at the groove.
  bubble(S, gx + gw / 2, cy - D[3] / 2, 18, 'C', 1.7);
  detailFrame(S, 1000, 400, 100, 'C', '5:1', 1.5);
  detailGroove(S, 1000, 400, 30, 16, [S.mm(gw), `Ø${S.mm(D[3] - 6)}`], 1.5);

  return { cloud: [kx0 - 14, cy - kw / 2 - 14, kx1 - kx0 + 28, kw + 28] };
}

const ARCHETYPES = [plate, hub, shaft];

/** Everything the Engineer form needs for one item. */
export function drawing(item, uid) {
  const seed = hashString(item.id);
  const rnd = mulberry32(seed);
  const [scale, factor] = SCALES[Math.round(item.axes.scale * 10)];
  const S = new Sheet(uid, factor);
  frame(S);
  const part = ARCHETYPES[seed % ARCHETYPES.length](S, item, rnd);
  titleBlock(S, 0.4);
  const rev = revTable(S, item, 0.5);
  const [cx, cy, cw, chh] = part.cloud;
  S.cloud(cx, cy, cw, chh, 2.0);
  S.revMark(cx + cw + 4, cy - 6, rev, 2.4);
  return {
    svg: S.svg(),
    scale,
    rev,
    dwg: `GS-${item.id.toUpperCase().slice(0, 4)}-${String(seed % 9000 + 1000)}`,
    mark: { x: (cx + cw + 26) / VB.w, y: (cy - 30) / VB.h },
  };
}
