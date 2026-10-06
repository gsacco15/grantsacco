// ARTIST (image) — the item as a print. A procedural photograph, deterministic
// per item, "develops" up out of black like a darkroom print. Three kinds of
// picture depending on what the item is: a landscape, a raking-light still life
// of objects, or long-exposure light trails.
import './artist.css';
import { hashString, mulberry32 } from '../../anim.js';
import { el, esc, pad2 } from '../lib.js';

const W = 1500;
const H = 1000;
const PALETTES = [
  ['#1d2b44', '#e6a77a', '#f6d7b0', '#2a1d22'],
  ['#9fb2ba', '#e9ecea', '#6d7a80', '#20262a'],
  ['#0f2f3d', '#3f8a9b', '#d9efe9', '#071a22'],
  ['#c7744a', '#f0c48b', '#fbe9cf', '#4a2416'],
  ['#2a2238', '#b6788a', '#f2c9a7', '#140f1c'],
  ['#1e2a1f', '#6f8b5b', '#d5dcc0', '#0d130e'],
];

function landscape(g, rnd, pal) {
  const horizon = H * (0.5 + rnd() * 0.18);
  const sky = g.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, pal[0]);
  sky.addColorStop(1, pal[2]);
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  const sx = W * (0.25 + rnd() * 0.5);
  const sy = horizon - H * (0.05 + rnd() * 0.18);
  const sun = g.createRadialGradient(sx, sy, 0, sx, sy, W * 0.5);
  sun.addColorStop(0, 'rgba(255,246,228,1)');
  sun.addColorStop(0.05, 'rgba(255,236,206,0.8)');
  sun.addColorStop(1, 'rgba(255,236,206,0)');
  g.fillStyle = sun;
  g.fillRect(0, 0, W, H);
  for (let l = 0; l < 4; l++) {
    const base = horizon + (l * (H - horizon)) / 4;
    g.beginPath();
    g.moveTo(0, H);
    let y = base - rnd() * H * 0.1;
    for (let x = 0; x <= W; x += W / 30) {
      y += (rnd() - 0.5) * H * 0.05;
      g.lineTo(x, Math.min(H, Math.max(horizon - H * 0.16, y)));
    }
    g.lineTo(W, H);
    g.closePath();
    g.globalAlpha = 0.45 + l * 0.18;
    g.fillStyle = l === 3 ? pal[3] : pal[1];
    g.fill();
  }
  g.globalAlpha = 1;
}

function stillLife(g, rnd, pal) {
  // A tabletop under a single raking light: long shadows, soft falloff.
  const wall = g.createLinearGradient(0, 0, W, H * 0.6);
  wall.addColorStop(0, pal[2]);
  wall.addColorStop(1, pal[1]);
  g.fillStyle = wall;
  g.fillRect(0, 0, W, H);
  const table = H * 0.62;
  g.fillStyle = pal[0];
  g.globalAlpha = 0.9;
  g.fillRect(0, table, W, H - table);
  g.globalAlpha = 1;
  const light = g.createRadialGradient(W * 0.2, table - 200, 0, W * 0.2, table - 200, W * 0.9);
  light.addColorStop(0, 'rgba(255,240,215,0.55)');
  light.addColorStop(1, 'rgba(0,0,0,0.35)');
  g.fillStyle = light;
  g.fillRect(0, 0, W, H);
  const n = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const x = W * (0.2 + (i / n) * 0.65 + rnd() * 0.05);
    const w = 70 + rnd() * 160;
    const h = 90 + rnd() * 260;
    const round = rnd() > 0.5;
    // shadow
    g.fillStyle = 'rgba(0,0,0,0.38)';
    g.beginPath();
    g.moveTo(x, table);
    g.lineTo(x + w, table);
    g.lineTo(x + w + h * 1.6, table + 34);
    g.lineTo(x + h * 1.6, table + 34);
    g.fill();
    // object
    const body = g.createLinearGradient(x, 0, x + w, 0);
    body.addColorStop(0, pal[2]);
    body.addColorStop(0.35, pal[1]);
    body.addColorStop(1, pal[3]);
    g.fillStyle = body;
    if (round) {
      g.beginPath();
      g.ellipse(x + w / 2, table - h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      g.fill();
    } else g.fillRect(x, table - h, w, h);
  }
}

function lightTrails(g, rnd, pal) {
  g.fillStyle = '#07070b';
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'lighter';
  const cols = [pal[1], pal[2], '#ffb36b', '#6bd7ff'];
  for (let i = 0; i < 14; i++) {
    g.strokeStyle = cols[i % cols.length];
    g.globalAlpha = 0.5;
    g.shadowColor = cols[i % cols.length];
    g.shadowBlur = 24;
    g.lineWidth = 2 + rnd() * 5;
    g.beginPath();
    const y0 = H * (0.3 + rnd() * 0.5);
    g.moveTo(-50, y0);
    g.bezierCurveTo(W * 0.3, y0 - rnd() * 400, W * 0.6, y0 + rnd() * 300, W + 50, H * (0.2 + rnd() * 0.6));
    g.stroke();
  }
  g.shadowBlur = 0;
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
}

function paint(item) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  const rnd = mulberry32(hashString(item.id));
  const pal = PALETTES[Math.floor(rnd() * PALETTES.length)];
  if (item.kind === 'app') lightTrails(g, rnd, pal);
  else if (item.kind === 'engineering' || item.kind === 'project') stillLife(g, rnd, pal);
  else landscape(g, rnd, pal);
  // Grain + vignette
  const img = g.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * 28;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.5)');
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
  return c;
}

const APERTURES = ['f/1.8', 'f/2.8', 'f/4', 'f/5.6', 'f/8', 'f/11'];
const SPEEDS = ['1/30', '1/60', '1/125', '1/250', '1/500', '4″'];

export default {
  id: 'image',
  persona: 'Artist',
  palette: {
    bg: '#0b0a09',
    ink: '#efe7da',
    muted: '#8d8578',
    line: 'rgb(239 231 218 / 0.14)',
    accent: '#e3b373',
    panel: 'rgb(12 11 10 / 0.75)',
  },

  mount(item, ctx) {
    const root = el('section', 'ar');
    const h = hashString(item.id);
    const frame = 1 + (h % 36);
    const exposure = item.kind === 'app' ? `${APERTURES[4]} · ${SPEEDS[5]}` : `${APERTURES[h % 4]} · ${SPEEDS[(h >> 3) % 5]}`;
    root.innerHTML = `
      <div class="tx-bleed ar-room" aria-hidden="true"></div>
      <div class="tx-safe ar-wrap">
        <figure class="ar-print">
          <div class="ar-paper"><canvas class="ar-img" width="${W}" height="${H}" role="img" aria-label="${esc(item.title)}, as a photograph"></canvas></div>
          <figcaption class="ar-cap">
            <h1 class="ar-title">${esc(item.title)}</h1>
            <p class="ar-line">${esc(item.lens.image)}</p>
            <p class="ar-meta"><span>Frame ${pad2(frame)}</span><span>${exposure} · 400</span><span>${item.years[0]}</span><span>${pad2(ctx.index + 1)} / ${ctx.total}</span></p>
          </figcaption>
        </figure>
      </div>`;
    const canvas = root.querySelector('.ar-img');
    // Paint off the critical path so the transition starts immediately.
    requestAnimationFrame(() => canvas.getContext('2d').drawImage(paint(item), 0, 0));

    return {
      el: root,
      title: root.querySelector('.ar-title'),
      enter() {
        root.classList.add('is-in');
      },
    };
  },
};
