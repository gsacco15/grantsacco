// Sample photographs for the albums, drawn procedurally per album "look" so
// the stacks and the darkroom have real-feeling rolls to show. Every frame is
// deterministic (album + index), mixes landscape and portrait, and gets a
// light film treatment: grade, grain, vignette and the odd light leak.
import { mulberry32, hashString } from '../anim.js';
import { rgba, lin, rad, rect, rr, poly, line, circle, glow } from './pictures.js';

const TAU = Math.PI * 2;
const pick = (rnd, list) => list[Math.floor(rnd() * list.length)];

/** Frame aspect (w / h): mostly 3:2 landscape, some 2:3 portrait. */
export function photoAspect(album, i) {
  const rnd = mulberry32(hashString(`${album.id}#${i}`) ^ 0x2f6b);
  return rnd() < 0.28 ? 2 / 3 : 3 / 2;
}

function hills(g, rnd, W, H, y0, layers, colors, amp = 0.09) {
  for (let l = 0; l < layers; l++) {
    const base = y0 + l * H * 0.07;
    g.beginPath();
    g.moveTo(0, H);
    let y = base - rnd() * H * amp;
    const step = W / 14;
    for (let x = 0; x <= W + step; x += step) {
      y += (rnd() - 0.5) * H * amp * 0.8;
      y = Math.min(base + H * amp, Math.max(base - H * amp * 1.5, y));
      g.lineTo(x, y);
    }
    g.lineTo(W, H);
    g.closePath();
    g.fillStyle = colors[Math.min(l, colors.length - 1)];
    g.fill();
  }
}

function sky(g, W, H, top, bottom, horizon = 0.62) {
  rect(g, 0, 0, W, H, lin(g, 0, 0, 0, H * horizon, [[0, top], [1, bottom]]));
}

function water(g, rnd, W, H, y, c0, c1, glint) {
  rect(g, 0, y, W, H - y, lin(g, 0, y, 0, H, [[0, c0], [1, c1]]));
  for (let i = 0; i < 18; i++) {
    const yy = y + 2 + i * ((H - y) / 18);
    const x = W * (0.3 + rnd() * 0.4);
    line(g, x - W * (0.05 + rnd() * 0.12), yy, x + W * (0.05 + rnd() * 0.12), yy, glint, 0.8);
  }
}

/* ── Looks: each a few compositions ───────────────────────────────────────── */

const looks = {
  nordic: [
    (g, r, W, H) => {
      sky(g, W, H, '#93a7b3', '#e3e9eb');
      glow(g, W * 0.7, H * 0.35, W * 0.4, '#ffffff', 0.5);
      hills(g, r, W, H, H * 0.5, 3, ['#8a9ca7', '#62737d', '#3a454c'], 0.12);
      water(g, r, W, H, H * 0.72, '#7f939d', '#36444c', 'rgb(255 255 255 / 0.35)');
    },
    (g, r, W, H) => {
      sky(g, W, H, '#a5b5be', '#dde4e7');
      poly(g, [[0, H * 0.45], [W * 0.3, H * 0.32], [W * 0.7, H * 0.3], [W, H * 0.44], [W, H * 0.85], [0, H * 0.85]], lin(g, 0, H * 0.3, 0, H * 0.85, [[0, '#3c444b'], [1, '#22272c']]));
      rect(g, W * 0.45, H * 0.3, W * 0.1, H * 0.56, lin(g, 0, H * 0.3, 0, H * 0.86, [[0, '#f5f8f9'], [1, '#c9d6dc']]));
      glow(g, W * 0.5, H * 0.86, W * 0.32, '#ffffff', 0.75);
      rect(g, 0, H * 0.85, W, H * 0.15, '#1d2124');
    },
    (g, r, W, H) => {
      sky(g, W, H, '#b9c4c9', '#eef1f1', 0.55);
      rect(g, 0, H * 0.55, W, H * 0.12, '#cfd8dc');
      for (let i = 0; i < 4; i++) {
        const x = W * (0.12 + i * 0.22 + r() * 0.06);
        const h = H * (0.14 + r() * 0.18);
        poly(g, [[x, H * 0.62], [x + W * 0.02, H * 0.62 - h], [x + W * 0.07, H * 0.62 - h * 0.9], [x + W * 0.09, H * 0.62]], '#2a2f33');
      }
      rect(g, 0, H * 0.62, W, H * 0.38, lin(g, 0, H * 0.62, 0, H, [[0, '#2b3034'], [1, '#121416']]));
      for (let i = 0; i < 10; i++) line(g, r() * W, H * (0.64 + r() * 0.3), r() * W, H * (0.64 + r() * 0.3), 'rgb(255 255 255 / 0.12)', 0.6);
    },
    (g, r, W, H) => {
      sky(g, W, H, '#7f9bb0', '#e9dccb', 0.7);
      hills(g, r, W, H, H * 0.62, 1, ['#8d9a7a'], 0.04);
      rect(g, 0, H * 0.7, W, H * 0.3, lin(g, 0, H * 0.7, 0, H, [[0, '#7c8a5e'], [1, '#4a5735']]));
      const x = W * (0.3 + r() * 0.4);
      const y = H * 0.66;
      rect(g, x, y, W * 0.12, H * 0.07, '#f1ece2');
      poly(g, [[x - W * 0.01, y], [x + W * 0.06, y - H * 0.06], [x + W * 0.13, y]], '#b23b2c');
      rect(g, x + W * 0.09, y - H * 0.1, W * 0.015, H * 0.06, '#f1ece2');
      poly(g, [[x + W * 0.085, y - H * 0.1], [x + W * 0.0975, y - H * 0.13], [x + W * 0.11, y - H * 0.1]], '#b23b2c');
    },
  ],
  tuscan: [
    (g, r, W, H) => {
      sky(g, W, H, '#f6d6a8', '#f2ad6c', 0.7);
      glow(g, W * 0.25, H * 0.3, W * 0.45, '#fff1d6', 0.7);
      const cx = W * (0.45 + r() * 0.2);
      const by = H * 0.56;
      rect(g, cx - W * 0.13, by - H * 0.02, W * 0.26, H * 0.08, '#dcc19a');
      g.beginPath();
      g.ellipse(cx, by, W * 0.13, H * 0.17, 0, Math.PI, TAU);
      g.fillStyle = lin(g, cx - W * 0.13, 0, cx + W * 0.13, 0, [[0, '#d0683f'], [1, '#9d4428']]);
      g.fill();
      rect(g, cx - W * 0.015, by - H * 0.22, W * 0.03, H * 0.05, '#efe3cf');
      for (let i = 0; i < 16; i++) {
        const w = W * (0.06 + r() * 0.08);
        const x = (i * W) / 15 - W * 0.03;
        const top = H * (0.62 + r() * 0.14);
        rect(g, x, top, w, H - top, pick(r, ['#d9a066', '#e6b882', '#c98a52', '#efd0a0']));
        poly(g, [[x - 2, top], [x + w / 2, top - H * 0.025], [x + w + 2, top]], '#b8573a');
      }
    },
    (g, r, W, H) => {
      sky(g, W, H, '#f3dcb4', '#f7e9cf', 0.5);
      hills(g, r, W, H, H * 0.5, 3, ['#c9b07a', '#a8975a', '#7d7a3e'], 0.07);
      for (let i = 0; i < 5; i++) {
        const x = W * (0.15 + i * 0.17 + r() * 0.05);
        const h = H * (0.18 + r() * 0.1);
        g.beginPath();
        g.ellipse(x, H * 0.62 - h / 2, W * 0.018, h / 2, 0, 0, TAU);
        g.fillStyle = '#2f4a2c';
        g.fill();
      }
    },
    (g, r, W, H) => {
      rect(g, 0, 0, W, H, lin(g, 0, 0, W, H, [[0, '#e9c48f'], [1, '#c98a52']]));
      for (let i = 0; i < 40; i++) rect(g, r() * W, r() * H, W * 0.05, H * 0.008, 'rgb(120 70 30 / 0.12)');
      const aw = W * 0.44;
      const ax = (W - aw) / 2;
      const ay = H * 0.24;
      g.beginPath();
      g.moveTo(ax, H);
      g.lineTo(ax, ay + aw / 2);
      g.arc(ax + aw / 2, ay + aw / 2, aw / 2, Math.PI, 0);
      g.lineTo(ax + aw, H);
      g.closePath();
      g.fillStyle = '#5a3a24';
      g.fill();
      for (let k = 1; k < 4; k++) line(g, ax + (aw * k) / 4, ay + aw * 0.2, ax + (aw * k) / 4, H, 'rgb(0 0 0 / 0.35)', 1.2);
      poly(g, [[0, 0], [W * 0.55, 0], [W * 0.1, H], [0, H]], 'rgb(60 30 10 / 0.22)');
      circle(g, ax + aw * 0.78, H * 0.68, W * 0.012, '#c9a227');
    },
  ],
  neon: [
    (g, r, W, H) => {
      rect(g, 0, 0, W, H, lin(g, 0, 0, 0, H, [[0, '#0a0c22'], [1, '#1d1440']]));
      poly(g, [[0, 0], [W * 0.36, 0], [W * 0.44, H * 0.6], [0, H]], '#120f24');
      poly(g, [[W, 0], [W * 0.64, 0], [W * 0.56, H * 0.6], [W, H]], '#120f24');
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) {
        const side = i % 2 ? 1 : -1;
        const x = side < 0 ? W * (0.04 + r() * 0.28) : W * (0.66 + r() * 0.28);
        const y = H * (0.06 + r() * 0.4);
        const c = pick(r, ['#ff3d8b', '#2de2e6', '#ffd23f', '#ff8a3d', '#9b5cff']);
        const w = W * 0.04;
        const h = H * (0.14 + r() * 0.16);
        glow(g, x + w / 2, y + h / 2, h * 0.9, c, 0.35);
        rect(g, x, y, w, h, c);
        rect(g, x + w / 2 - w * 0.25, H * 0.72, w * 0.5, H * 0.28, lin(g, 0, H * 0.72, 0, H, [[0, rgba(c, 0.45)], [1, rgba(c, 0)]]));
      }
      g.restore();
    },
    (g, r, W, H) => {
      rect(g, 0, 0, W, H, '#07060f');
      g.save();
      g.globalCompositeOperation = 'lighter';
      const c = pick(r, ['#ff3d8b', '#2de2e6', '#ffd23f']);
      glow(g, W * 0.5, H * 0.5, Math.max(W, H) * 0.6, c, 0.4);
      for (let k = 0; k < 4; k++) {
        const y = H * (0.2 + k * 0.17);
        rr(g, W * 0.3, y, W * 0.4, H * 0.1, 3, null, c, Math.max(2, W * 0.012));
        line(g, W * 0.36, y + H * 0.05, W * 0.64, y + H * 0.05, c, Math.max(1.5, W * 0.008));
      }
      g.restore();
      for (let i = 0; i < 60; i++) line(g, r() * W, r() * H, r() * W + 2, r() * H + H * 0.06, 'rgb(200 220 255 / 0.12)', 0.6);
    },
    (g, r, W, H) => {
      rect(g, 0, 0, W, H, lin(g, 0, 0, 0, H, [[0, '#14122a'], [1, '#2a1f3d']]));
      for (let i = 0; i < 8; i++) poly(g, [[W * (0.08 + i * 0.11), H * 0.7], [W * (0.14 + i * 0.11), H * 0.7], [W * (0.1 + i * 0.12), H], [W * (0.02 + i * 0.12), H]], 'rgb(240 240 255 / 0.55)');
      for (let i = 0; i < 6; i++) {
        const x = W * (0.12 + r() * 0.76);
        const y = H * (0.52 + r() * 0.12);
        g.beginPath();
        g.arc(x, y, W * 0.045, Math.PI, TAU);
        g.fillStyle = pick(r, ['#ff3d8b', '#2de2e6', '#f2f2f2', '#ffd23f']);
        g.fill();
        rect(g, x - 0.8, y, 1.6, H * 0.12, '#05040c');
        rect(g, x - W * 0.012, y + H * 0.02, W * 0.024, H * 0.12, '#05040c');
      }
      g.save();
      g.globalCompositeOperation = 'lighter';
      glow(g, W * 0.8, H * 0.2, W * 0.4, '#ff3d8b', 0.35);
      g.restore();
    },
  ],
  lake: [
    (g, r, W, H) => {
      sky(g, W, H, '#7fa8c9', '#f4e3cf', 0.6);
      glow(g, W * 0.6, H * 0.58, W * 0.35, '#fff1d6', 0.9);
      rect(g, 0, H * 0.6, W, H * 0.002 + 1, 'rgb(255 255 255 / 0.5)');
      water(g, r, W, H, H * 0.6, '#5d87a6', '#1f3e56', 'rgb(255 236 210 / 0.45)');
    },
    (g, r, W, H) => {
      sky(g, W, H, '#c9d6de', '#eef1f2', 0.55);
      water(g, r, W, H, H * 0.55, '#8fa9b8', '#3f5d70', 'rgb(255 255 255 / 0.3)');
      poly(g, [[W * 0.18, H], [W * 0.42, H], [W * 0.53, H * 0.55], [W * 0.5, H * 0.55]], '#3a3330');
      for (let i = 0; i < 9; i++) {
        const t = i / 9;
        const x = W * (0.3 + t * 0.215);
        line(g, x, H * (1 - t * 0.45), x, H * (1 - t * 0.45) + H * 0.05 * (1 - t), '#2a2421', 1.4);
      }
      rect(g, W * 0.505, H * 0.43, W * 0.025, H * 0.12, '#f2efe8');
      rect(g, W * 0.505, H * 0.47, W * 0.025, H * 0.02, '#b23b2c');
      glow(g, W * 0.517, H * 0.43, W * 0.05, '#fff6c8', 0.9);
    },
    (g, r, W, H) => {
      sky(g, W, H, '#dfe7ec', '#f6f7f6', 0.5);
      rect(g, 0, H * 0.5, W, H * 0.5, lin(g, 0, H * 0.5, 0, H, [[0, '#cbd9e0'], [1, '#93aebb']]));
      for (let i = 0; i < 14; i++) {
        const x = r() * W;
        const y = H * (0.55 + r() * 0.42);
        const s = W * (0.02 + r() * 0.06) * (y / H);
        poly(g, [[x - s, y], [x - s * 0.4, y - s * 0.5], [x + s * 0.6, y - s * 0.4], [x + s, y]], '#f5f8f9', 'rgb(120 150 165 / 0.6)', 0.6);
      }
    },
  ],
  workshop: [
    (g, r, W, H) => {
      rect(g, 0, 0, W, H, '#2b2e32');
      for (let x = 0; x < W; x += W / 14) line(g, x, 0, x, H, '#34383d', 0.6);
      for (let y = 0; y < H; y += W / 14) line(g, 0, y, W, y, '#34383d', 0.6);
      glow(g, W * 0.3, H * 0.2, Math.max(W, H) * 0.8, '#ffe2b8', 0.18);
      for (let i = 0; i < 4; i++) {
        const x = W * (0.1 + r() * 0.6);
        const y = H * (0.1 + r() * 0.65);
        const w = W * (0.15 + r() * 0.18);
        const h = H * (0.06 + r() * 0.1);
        rr(g, x + 3, y + 4, w, h, 3, 'rgb(0 0 0 / 0.45)');
        rr(g, x, y, w, h, 3, pick(r, ['#2f63a8', '#b5443a', '#9aa3ab', '#c9a227', '#3a3f45']));
        circle(g, x + w * 0.2, y + h / 2, Math.min(w, h) * 0.18, '#111', 'rgb(255 255 255 / 0.3)', 0.6);
      }
    },
    (g, r, W, H) => {
      rect(g, 0, 0, W, H, lin(g, 0, 0, 0, H, [[0, '#2c241e'], [1, '#14100d']]));
      glow(g, W * 0.62, H * 0.3, Math.max(W, H) * 0.6, '#ffc98a', 0.55);
      line(g, W * 0.3, H * 0.75, W * 0.55, H * 0.32, '#3a3f45', Math.max(2, W * 0.015));
      line(g, W * 0.55, H * 0.32, W * 0.66, H * 0.28, '#3a3f45', Math.max(2, W * 0.015));
      poly(g, [[W * 0.6, H * 0.24], [W * 0.76, H * 0.3], [W * 0.68, H * 0.38]], '#4a4f56');
      rect(g, 0, H * 0.75, W, H * 0.25, lin(g, 0, H * 0.75, 0, H, [[0, '#6a4a31'], [1, '#2e1f14']]));
      rr(g, W * 0.38, H * 0.62, W * 0.22, H * 0.13, 4, lin(g, W * 0.38, 0, W * 0.6, 0, [[0, '#d9dee2'], [1, '#6c757c']]));
      circle(g, W * 0.49, H * 0.685, Math.min(W, H) * 0.035, '#111');
    },
    (g, r, W, H) => {
      rect(g, 0, 0, W, H, rad(g, W * 0.5, H * 0.45, Math.max(W, H) * 0.8, [[0, '#3a3e44'], [1, '#0d0e10']]));
      const cx = W / 2;
      const cy = H / 2;
      const R = Math.min(W, H) * 0.34;
      g.beginPath();
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * TAU;
        const rr2 = i % 2 ? R * 0.86 : R;
        g.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2);
      }
      g.closePath();
      g.fillStyle = rad(g, cx - R * 0.3, cy - R * 0.3, R * 1.6, [[0, '#f4f7f9'], [0.5, '#9aa3ab'], [1, '#3c4248']]);
      g.fill();
      circle(g, cx, cy, R * 0.3, '#0c0d0e', 'rgb(255 255 255 / 0.5)', 1);
    },
  ],
  city: [
    (g, r, W, H) => {
      sky(g, W, H, '#2a2f5a', '#f2a36b', 0.75);
      for (let i = 0; i < 18; i++) {
        const w = W * (0.04 + r() * 0.07);
        const x = (i * W) / 16 - W * 0.02;
        const h = H * (0.18 + r() * 0.42);
        rect(g, x, H * 0.78 - h, w, h, '#1a1b2a');
        for (let k = 0; k < 14; k++) if (r() < 0.45) rect(g, x + w * (0.15 + r() * 0.7), H * 0.78 - h + r() * h * 0.95, 1.6, 1.6, 'rgb(255 214 150 / 0.9)');
      }
      water(g, r, W, H, H * 0.78, '#2c2f4a', '#0f1020', 'rgb(255 190 130 / 0.35)');
    },
    (g, r, W, H) => {
      rect(g, 0, 0, W, H, lin(g, 0, 0, 0, H, [[0, '#9fb3c4'], [1, '#d9d2c6']]));
      for (let i = 0; i < 6; i++) rect(g, i * (W / 5), H * 0.1, W * 0.12, H * 0.9, i % 2 ? '#5b4a3f' : '#6d5a4c');
      rect(g, 0, H * 0.28, W, H * 0.06, '#2b2f33');
      for (let x = 0; x < W; x += W / 18) {
        line(g, x, H * 0.28, x + W / 36, H * 0.34, '#2b2f33', 1.2);
        line(g, x + W / 36, H * 0.28, x, H * 0.34, '#2b2f33', 1.2);
      }
      for (let x = W * 0.05; x < W; x += W * 0.22) rect(g, x, H * 0.34, W * 0.025, H * 0.66, '#2b2f33');
      rect(g, 0, H * 0.9, W, H * 0.1, '#3a3d40');
    },
    (g, r, W, H) => {
      sky(g, W, H, '#c7d3dd', '#f1ede6', 0.55);
      for (let i = 0; i < 9; i++) rect(g, i * (W / 8), H * (0.2 + r() * 0.15), W * 0.1, H * 0.4, pick(r, ['#8a8f96', '#a7aab0', '#6c7178']));
      rect(g, 0, H * 0.55, W, H * 0.45, lin(g, 0, H * 0.55, 0, H, [[0, '#5f7f8c'], [1, '#2e4550']]));
      g.beginPath();
      g.moveTo(0, H * 0.52);
      g.quadraticCurveTo(W / 2, H * 0.38, W, H * 0.52);
      g.lineWidth = Math.max(3, H * 0.025);
      g.strokeStyle = '#b5443a';
      g.stroke();
      for (let x = W * 0.08; x < W; x += W * 0.09) line(g, x, H * 0.52 - Math.sin((x / W) * Math.PI) * H * 0.13, x, H * 0.55, '#b5443a', 1.2);
    },
  ],
};

/* ── Film treatment ───────────────────────────────────────────────────────── */

const GRADE = {
  nordic: [0.97, 1.0, 1.04],
  tuscan: [1.05, 1.0, 0.92],
  neon: [1.02, 0.98, 1.06],
  lake: [1.0, 1.01, 1.03],
  workshop: [1.05, 1.0, 0.94],
  city: [1.03, 1.0, 0.98],
};

function treat(c, album, i) {
  const { width: w, height: h } = c;
  const g = c.getContext('2d', { willReadFrequently: true });
  const rnd = mulberry32(hashString(`${album.id}~${i}`));
  // A light leak on some frames.
  if (rnd() < 0.22) {
    g.save();
    g.globalCompositeOperation = 'screen';
    const x = rnd() < 0.5 ? 0 : w;
    g.fillStyle = rad(g, x, h * rnd(), w * 0.6, [[0, 'rgb(255 214 170 / 0.3)'], [1, 'rgb(255 214 170 / 0)']]);
    g.fillRect(0, 0, w, h);
    g.restore();
  }
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const [kr, kg, kb] = GRADE[album.look] ?? [1, 1, 1];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const j = (y * w + x) * 4;
      const dx = x / w - 0.5;
      const dy = y / h - 0.5;
      const v = 1 - 0.32 * Math.min(1, Math.max(0, (Math.sqrt(dx * dx + dy * dy) - 0.25) * 2.2));
      const n = (rnd() - 0.5) * 22;
      d[j] = d[j] * kr * v + n;
      d[j + 1] = d[j + 1] * kg * v + n;
      d[j + 2] = d[j + 2] * kb * v + n;
    }
  }
  g.putImageData(img, 0, 0);
}

const cache = new Map();

/** Frame `i` of `album`, `w` px wide (height from the frame's aspect). Cached. */
export function photo(album, i, w) {
  const W = Math.max(16, Math.round(w));
  const key = `${album.id}|${i}|${W}`;
  let c = cache.get(key);
  if (c) return c;
  const aspect = photoAspect(album, i);
  const H = Math.round(W / aspect);
  c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const UW = aspect > 1 ? 300 : 200;
  const UH = aspect > 1 ? 200 : 300;
  g.scale(W / UW, H / UH);
  const rnd = mulberry32(hashString(`${album.id}/${i}`));
  const set = looks[album.look] ?? looks.lake;
  // Reframe every shot a little: zoom, offset, sometimes mirrored.
  const z = 1 + rnd() * 0.5;
  const ox = -(z - 1) * UW * rnd();
  const oy = -(z - 1) * UH * (0.2 + rnd() * 0.6);
  if (rnd() < 0.45) {
    g.translate(UW, 0);
    g.scale(-1, 1);
  }
  g.translate(ox, oy);
  g.scale(z, z);
  set[(i + Math.floor(rnd() * set.length)) % set.length](g, rnd, UW, UH);
  g.setTransform(1, 0, 0, 1, 0, 0);
  // Different light on different frames.
  const tint = pick(rnd, [null, null, 'rgb(255 170 90 / 0.22)', 'rgb(90 140 255 / 0.18)', 'rgb(230 90 160 / 0.16)', 'rgb(255 240 200 / 0.2)']);
  if (tint) {
    g.save();
    g.globalCompositeOperation = 'soft-light';
    g.fillStyle = tint;
    g.fillRect(0, 0, W, H);
    g.restore();
  }
  treat(c, album, i);
  cache.set(key, c);
  return c;
}

/** Draw frame `i` into `target`, cropped to fill it. */
export function drawInto(target, album, i, { contain = false } = {}) {
  const src = photo(album, i, Math.max(target.width, contain ? target.width : target.height * photoAspect(album, i)));
  const g = target.getContext('2d');
  const s = contain ? Math.min(target.width / src.width, target.height / src.height) : Math.max(target.width / src.width, target.height / src.height);
  const w = src.width * s;
  const h = src.height * s;
  if (contain) g.clearRect(0, 0, target.width, target.height);
  g.drawImage(src, (target.width - w) / 2, (target.height - h) / 2, w, h);
}
