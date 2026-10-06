// The six render modes, applied to an item's picture. Same image, different
// renderer: a graded photograph, hidden-line linework, clay, a film still, a
// map duotone, and ASCII on a phosphor screen. All of it is plain 2D canvas
// pixel work, cached per (item, mode, width).
import { drawPicture } from './pictures.js';
import { mulberry32, hashString } from '../anim.js';

/** Frame aspect (w / h) each mode presents its pictures at. */
export const ASPECT = { reality: 3 / 2, structure: 4 / 3, build: 3 / 2, image: 2.39, place: 1, digital: 4 / 3 };

const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const sstep = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;

const sources = new Map();
function source(id, w, h) {
  // Pictures are 3:2. Draw one big enough to cover w × h, then centre-crop.
  const sw = Math.ceil(Math.max(w, h * 1.5));
  const key = `${id}@${sw}`;
  if (!sources.has(key)) sources.set(key, drawPicture(id, sw, Math.round(sw / 1.5)));
  const src = sources.get(key);
  const c = canvas(w, h);
  c.getContext('2d').drawImage(src, Math.round((src.width - w) / 2), Math.round((src.height - h) / 2), w, h, 0, 0, w, h);
  return c;
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

const ctx = (c) => c.getContext('2d', { willReadFrequently: true });

function luminance(d, n) {
  const L = new Float32Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) L[i] = (0.2126 * d[j] + 0.7152 * d[j + 1] + 0.0722 * d[j + 2]) / 255;
  return L;
}

function boxBlur(L, w, h) {
  const out = new Float32Array(L.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      let k = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          s += L[yy * w + xx];
          k++;
        }
      }
      out[y * w + x] = s / k;
    }
  }
  return out;
}

function sobel(L, w, h) {
  const out = new Float32Array(L.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const a = L[i - w - 1];
      const b = L[i - w];
      const c = L[i - w + 1];
      const d = L[i - 1];
      const f = L[i + 1];
      const g = L[i + w - 1];
      const hh = L[i + w];
      const k = L[i + w + 1];
      const gx = c + 2 * f + k - a - 2 * d - g;
      const gy = g + 2 * hh + k - a - 2 * b - c;
      out[i] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return out;
}

function grainAndVignette(d, w, h, seed, grain, vignette) {
  const rnd = mulberry32(seed);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const j = (y * w + x) * 4;
      const dx = x / w - 0.5;
      const dy = y / h - 0.5;
      const v = 1 - vignette * sstep(0.18, 0.75, Math.sqrt(dx * dx + dy * dy) * 1.25);
      const n = (rnd() - 0.5) * grain;
      d[j] = d[j] * v + n;
      d[j + 1] = d[j + 1] * v + n;
      d[j + 2] = d[j + 2] * v + n;
    }
  }
}

/* ── Modes ────────────────────────────────────────────────────────────────── */

function reality(c, id) {
  const { width: w, height: h } = c;
  const g = ctx(c);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let j = 0; j < d.length; j += 4) {
    d[j] = d[j] * 1.03 + 5;
    d[j + 1] = d[j + 1] * 1.01 + 2;
    d[j + 2] = d[j + 2] * 0.95;
  }
  grainAndVignette(d, w, h, hashString(id), 14, 0.22);
  g.putImageData(img, 0, 0);
}

function structure(c) {
  const { width: w, height: h } = c;
  const g = ctx(c);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const L = luminance(d, w * h);
  const E = sobel(L, w, h);
  const paper = hex('#fbfbf8');
  const ink = hex('#14181d');
  const lineW = Math.max(1, Math.round(w / 300));
  const gap = 7 * lineW;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const edge = sstep(0.12, 0.42, E[i]);
      // Light section hatching in the darkest regions only.
      const hatch = (x + y) % gap < lineW ? 0.32 * sstep(0.3, 0.12, L[i]) : 0;
      const t = Math.min(1, Math.max(edge, hatch));
      const j = i * 4;
      d[j] = mix(paper[0], ink[0], t);
      d[j + 1] = mix(paper[1], ink[1], t);
      d[j + 2] = mix(paper[2], ink[2], t);
    }
  }
  g.putImageData(img, 0, 0);
}

function build(c) {
  const { width: w, height: h } = c;
  const g = ctx(c);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const L = luminance(d, w * h);
  const E = sobel(boxBlur(L, w, h), w, h);
  const dark = hex('#48433d');
  const light = hex('#f1eadf');
  for (let i = 0; i < w * h; i++) {
    // Soft posterise: clay reads in a few broad values, not gradients.
    const steps = 5;
    const q = Math.round(L[i] * steps) / steps;
    const v = mix(L[i], q, 0.7) * (1 - 0.45 * sstep(0.1, 0.4, E[i]));
    const t = Math.min(1, Math.max(0, 0.16 + v * 1.2));
    const j = i * 4;
    d[j] = mix(dark[0], light[0], t);
    d[j + 1] = mix(dark[1], light[1], t);
    d[j + 2] = mix(dark[2], light[2], t);
  }
  g.putImageData(img, 0, 0);
}

function image(c, id) {
  const { width: w, height: h } = c;
  // Halation: a blurred bright pass, added back warm.
  const small = canvas(Math.max(8, Math.round(w / 10)), Math.max(6, Math.round(h / 10)));
  const sg = small.getContext('2d');
  sg.imageSmoothingQuality = 'high';
  sg.drawImage(c, 0, 0, small.width, small.height);
  const blur = canvas(w, h);
  const bg = ctx(blur);
  bg.imageSmoothingQuality = 'high';
  bg.drawImage(small, 0, 0, w, h);
  const B = bg.getImageData(0, 0, w, h).data;

  const g = ctx(c);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const teal = hex('#0d3c47');
  const warm = hex('#ffcf9c');
  for (let j = 0; j < d.length; j += 4) {
    let r = d[j] / 255;
    let gg = d[j + 1] / 255;
    let b = d[j + 2] / 255;
    const l = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
    // Saturation up, S-curve contrast.
    r = l + (r - l) * 1.18;
    gg = l + (gg - l) * 1.18;
    b = l + (b - l) * 1.18;
    const curve = (v) => sstep(-0.16, 1.02, v);
    r = curve(r);
    gg = curve(gg);
    b = curve(b);
    const sh = (1 - l) * (1 - l) * 0.38;
    const hi = l * l * 0.22;
    r = mix(mix(r, teal[0] / 255, sh), warm[0] / 255, hi);
    gg = mix(mix(gg, teal[1] / 255, sh), warm[1] / 255, hi);
    b = mix(mix(b, teal[2] / 255, sh), warm[2] / 255, hi);
    const bl = (0.2126 * B[j] + 0.7152 * B[j + 1] + 0.0722 * B[j + 2]) / 255;
    const halo = Math.max(0, bl - 0.55) * 0.9;
    d[j] = (r + halo * 1.0) * 255;
    d[j + 1] = (gg + halo * 0.55) * 255;
    d[j + 2] = (b + halo * 0.3) * 255;
  }
  grainAndVignette(d, w, h, hashString(id) ^ 0x9e3779b9, 26, 0.6);
  g.putImageData(img, 0, 0);
}

function place(c, id) {
  const { width: w, height: h } = c;
  const g = ctx(c);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const stops = [hex('#071022'), hex('#2d5b88'), hex('#ffcf7a')];
  for (let j = 0; j < d.length; j += 4) {
    const l = Math.min(1, (0.2126 * d[j] + 0.7152 * d[j + 1] + 0.0722 * d[j + 2]) / 255 * 1.1);
    const [a, b, t] = l < 0.55 ? [stops[0], stops[1], l / 0.55] : [stops[1], stops[2], (l - 0.55) / 0.45];
    d[j] = mix(a[0], b[0], t);
    d[j + 1] = mix(a[1], b[1], t);
    d[j + 2] = mix(a[2], b[2], t);
  }
  grainAndVignette(d, w, h, hashString(id) ^ 0x51ed27, 10, 0.3);
  g.putImageData(img, 0, 0);
}

const RAMP = ' .:-=+*#%@';
function digital(c) {
  const { width: w, height: h } = c;
  const g = ctx(c);
  const src = g.getImageData(0, 0, w, h).data;
  const L = luminance(src, w * h);
  const E = sobel(L, w, h);
  // Normalise to the picture's own range so dark and bright scenes read alike.
  const sorted = Float32Array.from(L).sort();
  const lo = sorted[Math.floor(sorted.length * 0.05)];
  const hi = sorted[Math.floor(sorted.length * 0.97)];
  for (let i = 0; i < L.length; i++) L[i] = Math.min(1, Math.max(0, (L[i] - lo) / Math.max(0.05, hi - lo)));
  // ~40 columns on a tile, finer on a large hero.
  const cw = Math.max(4, Math.round(w / Math.min(110, Math.max(40, w / 8))));
  const ch = Math.round(cw * 1.55);
  g.fillStyle = '#040605';
  g.fillRect(0, 0, w, h);
  g.font = `500 ${Math.round(ch * 0.95)}px "JetBrains Mono", ui-monospace, monospace`;
  g.textBaseline = 'top';
  for (let y = 0; y + ch <= h + ch / 2; y += ch) {
    for (let x = 0; x + cw <= w + cw / 2; x += cw) {
      let s = 0;
      let e = 0;
      let k = 0;
      for (let yy = y; yy < Math.min(h, y + ch); yy += 2) {
        for (let xx = x; xx < Math.min(w, x + cw); xx += 2) {
          s += L[yy * w + xx];
          e += E[yy * w + xx];
          k++;
        }
      }
      const l = Math.min(1, 0.5 * (s / k) ** 1.4 + Math.min(0.6, (e / k) * 0.9));
      const ci = Math.round(l * (RAMP.length - 1));
      if (ci === 0) continue;
      g.fillStyle = l > 0.82 ? '#5cf2b0' : `rgb(201 247 223 / ${(0.22 + 0.78 * l).toFixed(2)})`;
      g.fillText(RAMP[ci], x, y);
    }
  }
  // Scanlines
  g.fillStyle = 'rgb(0 0 0 / 0.28)';
  const step = Math.max(2, Math.round(h / 90));
  for (let y = 0; y < h; y += step * 2) g.fillRect(0, y, w, step);
}

const MODES = { reality, structure, build, image, place, digital };

const cache = new Map();

/**
 * Item `id` rendered in `mode` at `w` px wide. Height comes from the mode's
 * frame aspect unless `aspect` is given.
 */
export function render(id, mode, w, aspect = ASPECT[mode]) {
  const W = Math.max(16, Math.round(w));
  const key = `${id}|${mode}|${W}|${aspect.toFixed(3)}`;
  let c = cache.get(key);
  if (!c) {
    const H = Math.max(12, Math.round(W / aspect));
    c = source(id, W, H);
    MODES[mode](c, id);
    cache.set(key, c);
  }
  return c;
}
