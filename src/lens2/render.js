// The six render modes, applied to an item's picture. Same image, different
// renderer, kept restrained for Lens (v2): a natural photograph, hidden-line
// linework, neutral clay, a quiet film still, a map tone, and ASCII on a
// plain dark terminal (no phosphor glow or scanlines). All of it is plain 2D canvas
// pixel work, cached per (item, mode, width).
import { drawArtifact } from './scenes.js';
import { photo } from './photos.js';
import { artifacts } from './artifacts.js';

const byId = new Map(artifacts.map((a) => [a.id, a]));

/** A 3:2 picture for artifact `id`: a film's cover frame, or a placeholder scene. */
function picture(id, w, h) {
  const a = byId.get(id) ?? { id, picture: { scene: id } };
  if (!a.film) return drawArtifact(a, w, h);
  const f = photo(a.film, a.film.cover, w);
  const c = canvas(w, h);
  const s = Math.max(w / f.width, h / f.height);
  c.getContext('2d').drawImage(f, (w - f.width * s) / 2, (h - f.height * s) / 2, f.width * s, f.height * s);
  return c;
}
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
  if (!sources.has(key)) sources.set(key, picture(id, sw, Math.round(sw / 1.5)));
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
  // A natural, slightly muted photograph: no warm cast, a touch less saturation.
  for (let j = 0; j < d.length; j += 4) {
    const l = 0.2126 * d[j] + 0.7152 * d[j + 1] + 0.0722 * d[j + 2];
    d[j] = l + (d[j] - l) * 0.9;
    d[j + 1] = l + (d[j + 1] - l) * 0.9;
    d[j + 2] = l + (d[j + 2] - l) * 0.9;
  }
  grainAndVignette(d, w, h, hashString(id), 6, 0.1);
  g.putImageData(img, 0, 0);
}

function structure(c) {
  const { width: w, height: h } = c;
  const g = ctx(c);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const L = luminance(d, w * h);
  const E = sobel(L, w, h);
  const paper = hex('#f7f6f3');
  const ink = hex('#151515');
  for (let i = 0; i < w * h; i++) {
    const j = i * 4;
    // The picture itself, half desaturated and washed toward paper, with its
    // edges inked over: a drawing that still reads as the thing.
    const l = L[i] * 255;
    const t = 0.85 * sstep(0.14, 0.46, E[i]);
    for (let k = 0; k < 3; k++) {
      const v = mix(mix(d[j + k], l, 0.5), paper[k], 0.32);
      d[j + k] = mix(v, ink[k], t);
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
  const dark = hex('#3b3b3a');
  const light = hex('#f0f0ee');
  for (let i = 0; i < w * h; i++) {
    // Clay: the picture's own light and shade in a neutral grey, lightly
    // posterised, with a trace of its colour left so it stays recognisable.
    const q = Math.round(L[i] * 5) / 5;
    const v = mix(L[i], q, 0.3) * (1 - 0.3 * sstep(0.1, 0.4, E[i]));
    const t = Math.min(1, Math.max(0, 0.06 + v * 0.96));
    const j = i * 4;
    for (let k = 0; k < 3; k++) d[j + k] = mix(mix(dark[k], light[k], t), d[j + k], 0.22);
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
  const shadow = hex('#1d2a33');
  const light = hex('#f3e6d4');
  for (let j = 0; j < d.length; j += 4) {
    let r = d[j] / 255;
    let gg = d[j + 1] / 255;
    let b = d[j + 2] / 255;
    const l = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
    // A quiet film look: gentle contrast, light split-toning, soft halation.
    const curve = (v) => sstep(-0.1, 1.04, v);
    r = curve(r);
    gg = curve(gg);
    b = curve(b);
    const sh = (1 - l) * (1 - l) * 0.18;
    const hi = l * l * 0.1;
    r = mix(mix(r, shadow[0] / 255, sh), light[0] / 255, hi);
    gg = mix(mix(gg, shadow[1] / 255, sh), light[1] / 255, hi);
    b = mix(mix(b, shadow[2] / 255, sh), light[2] / 255, hi);
    const bl = (0.2126 * B[j] + 0.7152 * B[j + 1] + 0.0722 * B[j + 2]) / 255;
    const halo = Math.max(0, bl - 0.6) * 0.5;
    d[j] = (r + halo) * 255;
    d[j + 1] = (gg + halo * 0.85) * 255;
    d[j + 2] = (b + halo * 0.7) * 255;
  }
  grainAndVignette(d, w, h, hashString(id) ^ 0x9e3779b9, 12, 0.24);
  g.putImageData(img, 0, 0);
}

function place(c, id) {
  const { width: w, height: h } = c;
  const g = ctx(c);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const stops = [hex('#14213d'), hex('#6f87c4'), hex('#f4f3f0')];
  for (let j = 0; j < d.length; j += 4) {
    const l = Math.min(1, (0.2126 * d[j] + 0.7152 * d[j + 1] + 0.0722 * d[j + 2]) / 255 * 1.1);
    const [a, b, t] = l < 0.55 ? [stops[0], stops[1], l / 0.55] : [stops[1], stops[2], (l - 0.55) / 0.45];
    // A map tone over the picture, not instead of it.
    d[j] = mix(mix(a[0], b[0], t), d[j], 0.38);
    d[j + 1] = mix(mix(a[1], b[1], t), d[j + 1], 0.38);
    d[j + 2] = mix(mix(a[2], b[2], t), d[j + 2], 0.38);
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
  // The picture stays underneath, dimmed and cooled, so the characters read as a
  // layer on it rather than replacing it.
  const base = g.getImageData(0, 0, w, h);
  const bd = base.data;
  for (let j = 0; j < bd.length; j += 4) {
    bd[j] = 16 + bd[j] * 0.36;
    bd[j + 1] = 16 + bd[j + 1] * 0.38;
    bd[j + 2] = 18 + bd[j + 2] * 0.42;
  }
  g.putImageData(base, 0, 0);
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
      g.fillStyle = `rgb(236 235 231 / ${(0.12 + 0.5 * l).toFixed(2)})`;
      g.fillText(RAMP[ci], x, y);
    }
  }
}

const MODES = { reality, structure, build, image, place, digital };

const cache = new Map();

/** Drop everything rendered for `id` (its real picture just arrived). */
export function forget(id) {
  for (const k of [...sources.keys()]) if (k.startsWith(`${id}@`)) sources.delete(k);
  for (const k of [...cache.keys()]) if (k.startsWith(`${id}|`)) cache.delete(k);
}

/** Develop canvas `c` (a frame of item `id`) in `mode`'s look, in place. */
export function develop(c, mode, id) {
  MODES[mode](c, id);
}

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
