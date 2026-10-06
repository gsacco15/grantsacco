// Procedural "photographs" so the Art system has imagery before real photos exist.
// Deterministic per item: same id → same picture.
import { mulberry32, hashString } from '../anim.js';

const PALETTES = [
  ['#1d2b44', '#e6a77a', '#f6d7b0', '#2a1d22'], // dusk
  ['#b9c4c9', '#e9ecea', '#6d7a80', '#2b3135'], // fog
  ['#0f2f3d', '#3f8a9b', '#d9efe9', '#071a22'], // sea
  ['#c7744a', '#f0c48b', '#fbe9cf', '#5a2c1c'], // desert
  ['#130f26', '#c43d7b', '#ffb36b', '#07060f'], // neon
  ['#1e2a1f', '#6f8b5b', '#d5dcc0', '#0d130e'], // forest
  ['#2b2b2b', '#9a9a9a', '#efefef', '#111111'], // monochrome
];

export function thumbnail(id, w = 144, h = 96) {
  const rnd = mulberry32(hashString(id));
  const pal = PALETTES[Math.floor(rnd() * PALETTES.length)];
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');

  // Sky
  const horizon = h * (0.45 + rnd() * 0.3);
  const sky = g.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, pal[0]);
  sky.addColorStop(1, pal[2]);
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);

  // Sun / light source
  const sx = w * (0.2 + rnd() * 0.6);
  const sy = horizon - h * (0.08 + rnd() * 0.25);
  const sun = g.createRadialGradient(sx, sy, 0, sx, sy, w * 0.45);
  sun.addColorStop(0, 'rgba(255,245,225,0.95)');
  sun.addColorStop(0.08, 'rgba(255,235,205,0.75)');
  sun.addColorStop(1, 'rgba(255,235,205,0)');
  g.fillStyle = sun;
  g.fillRect(0, 0, w, h);

  // Layered ridges / forms
  const layers = 2 + Math.floor(rnd() * 2);
  for (let l = 0; l < layers; l++) {
    const base = horizon + (l * (h - horizon)) / (layers + 0.5);
    g.beginPath();
    g.moveTo(0, h);
    let y = base - rnd() * h * 0.12;
    for (let x = 0; x <= w; x += w / 12) {
      y += (rnd() - 0.5) * h * 0.09;
      g.lineTo(x, Math.min(h, Math.max(horizon - h * 0.2, y)));
    }
    g.lineTo(w, h);
    g.closePath();
    g.globalAlpha = 0.55 + l * 0.2;
    g.fillStyle = l === layers - 1 ? pal[3] : pal[1];
    g.fill();
  }
  g.globalAlpha = 1;

  // Grain
  const img = g.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rnd() - 0.5) * 34;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);

  // Vignette
  const v = g.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.45)');
  g.fillStyle = v;
  g.fillRect(0, 0, w, h);

  return c.toDataURL('image/jpeg', 0.86);
}
