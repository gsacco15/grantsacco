// Procedural "photographs" — small canvas paintings with grain and vignette,
// used for the film strips and the contact sheet. No image assets needed.
import { mulberry32, hashString } from '../anim.js';

const W = 360;
const H = 240;
const cache = new Map();

function grad(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

function glow(ctx, x, y, r, color, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

// A jagged horizon silhouette filled to the bottom of the frame.
function ridge(ctx, rand, base, amp, rough, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, H);
  let y = base;
  for (let x = 0; x <= W; x += 6) {
    y += (rand() - 0.5) * rough;
    y = Math.min(base + amp, Math.max(base - amp, y));
    ctx.lineTo(x, y + Math.sin(x * 0.018) * amp * 0.6);
  }
  ctx.lineTo(W, H);
  ctx.fill();
}

const painters = {
  reykjavik(ctx, rand) {
    ctx.fillStyle = grad(ctx, 0, 0, 0, H, [
      [0, '#1d2740'],
      [0.45, '#7a6f8c'],
      [0.62, '#e2a585'],
      [0.7, '#f4cf9c'],
    ]);
    ctx.fillRect(0, 0, W, H);
    glow(ctx, W * 0.68, H * 0.64, 120, 'rgba(255,214,160,0.9)', 0.8);
    ridge(ctx, rand, H * 0.6, 14, 9, '#4a4a62');
    ridge(ctx, rand, H * 0.68, 10, 6, '#262839');
    ctx.fillStyle = '#16171f';
    ctx.fillRect(0, H * 0.74, W, H);
    // the ring road, converging on the horizon
    ctx.strokeStyle = 'rgba(240,215,170,0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(W * 0.5, H * 0.74);
    ctx.lineTo(W * 0.18, H);
    ctx.moveTo(W * 0.53, H * 0.74);
    ctx.lineTo(W * 0.86, H);
    ctx.stroke();
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(W * 0.515, H * 0.75);
    ctx.lineTo(W * 0.52, H);
    ctx.stroke();
    ctx.setLineDash([]);
  },

  florence(ctx, rand) {
    ctx.fillStyle = grad(ctx, 0, 0, 0, H, [
      [0, '#e9c79a'],
      [0.55, '#e7a46a'],
      [1, '#b8643a'],
    ]);
    ctx.fillRect(0, 0, W, H);
    glow(ctx, W * 0.25, H * 0.35, 160, 'rgba(255,236,190,0.8)', 0.7);
    const cx = W * 0.56;
    const base = H * 0.6;
    // drum + dome + lantern
    ctx.fillStyle = '#9a5634';
    ctx.fillRect(cx - 54, base - 6, 108, 30);
    ctx.beginPath();
    ctx.ellipse(cx, base, 50, 66, 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,225,190,0.55)';
    ctx.lineWidth = 2;
    for (const k of [-0.62, -0.22, 0.22, 0.62]) {
      ctx.beginPath();
      ctx.ellipse(cx, base, Math.abs(50 * k), 66, 0, Math.PI, 0);
      ctx.stroke();
    }
    ctx.fillStyle = '#efe2cc';
    ctx.fillRect(cx - 7, base - 82, 14, 18);
    ctx.beginPath();
    ctx.moveTo(cx - 6, base - 82);
    ctx.lineTo(cx, base - 96);
    ctx.lineTo(cx + 6, base - 82);
    ctx.fill();
    // campanile
    ctx.fillStyle = '#c99a72';
    ctx.fillRect(W * 0.22, H * 0.28, 22, H * 0.5);
    ctx.fillStyle = '#7b4a30';
    ctx.fillRect(W * 0.22 + 6, H * 0.32, 10, 14);
    // rooftops
    for (let i = 0; i < 26; i++) {
      const x = rand() * W;
      const w = 22 + rand() * 40;
      const y = H * 0.7 + rand() * 30;
      ctx.fillStyle = ['#7a3d26', '#8f4b2d', '#5f3020', '#a35a35'][i % 4];
      ctx.beginPath();
      ctx.moveTo(x - w / 2, H);
      ctx.lineTo(x - w / 2, y);
      ctx.lineTo(x, y - 10 - rand() * 6);
      ctx.lineTo(x + w / 2, y);
      ctx.lineTo(x + w / 2, H);
      ctx.fill();
    }
  },

  tokyo(ctx, rand) {
    ctx.fillStyle = grad(ctx, 0, 0, 0, H, [
      [0, '#090b18'],
      [0.7, '#1d1531'],
      [1, '#0b0a12'],
    ]);
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) {
      const x = i * 42 + rand() * 10;
      ctx.fillStyle = i % 2 ? '#14121f' : '#100f19';
      ctx.fillRect(x, H * 0.08 + rand() * 40, 46, H * 0.62);
    }
    const neon = ['#ff3d8b', '#35e0ff', '#ffb43d', '#a46bff', '#ff5a3d'];
    for (let i = 0; i < 11; i++) {
      const x = 14 + rand() * (W - 30);
      const y = H * 0.12 + rand() * H * 0.36;
      const h = 30 + rand() * 60;
      const c = neon[i % neon.length];
      ctx.shadowColor = c;
      ctx.shadowBlur = 14;
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 7, h);
      ctx.shadowBlur = 0;
      // wet-street reflection
      ctx.globalAlpha = 0.28;
      ctx.fillRect(x, H * 0.76 + (H * 0.76 - y - h) * 0.15, 7, h * 0.5);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = 'rgba(10,10,18,0.55)';
    ctx.fillRect(0, H * 0.72, W, 4);
  },

  university(ctx, rand) {
    ctx.fillStyle = '#17181b';
    ctx.fillRect(0, 0, W, H);
    // tall window grid
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 4; c++) {
        ctx.fillStyle = `rgba(214,224,232,${0.75 - r * 0.12})`;
        ctx.fillRect(28 + c * 34, 22 + r * 40, 28, 34);
      }
    // shafts of light
    ctx.fillStyle = 'rgba(220,228,236,0.09)';
    ctx.beginPath();
    ctx.moveTo(28, 22);
    ctx.lineTo(160, 22);
    ctx.lineTo(W, H);
    ctx.lineTo(140, H);
    ctx.fill();
    // machine silhouettes (a lathe, a drill press)
    ctx.fillStyle = '#0b0b0d';
    ctx.fillRect(170, 150, 150, 34);
    ctx.fillRect(184, 184, 14, 56);
    ctx.fillRect(290, 184, 14, 56);
    ctx.beginPath();
    ctx.arc(188, 150, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(60, 120, 10, 120);
    ctx.fillRect(40, 110, 50, 22);
    ctx.fillStyle = '#26282d';
    ctx.fillRect(0, 226, W, 14);
    void rand;
  },

  workshop(ctx, rand) {
    ctx.fillStyle = grad(ctx, 0, 0, 0, H, [
      [0, '#3b2c21'],
      [1, '#20160f'],
    ]);
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let y = 16; y < H * 0.68; y += 14) for (let x = 12; x < W; x += 14) ctx.fillRect(x, y, 3, 3);
    glow(ctx, W * 0.78, H * 0.1, 170, 'rgba(255,196,120,0.85)', 0.75);
    ctx.fillStyle = '#120c08';
    const tools = [
      [40, 30, 10, 70],
      [70, 40, 6, 60],
      [100, 26, 14, 50],
      [140, 34, 8, 74],
      [230, 30, 12, 56],
      [262, 40, 6, 64],
    ];
    tools.forEach(([x, y, w, h]) => {
      ctx.fillRect(x, y, w, h);
      ctx.beginPath();
      ctx.arc(x + w / 2, y, w, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#7a5434';
    ctx.fillRect(0, H * 0.72, W, 16);
    ctx.fillStyle = '#4a321f';
    ctx.fillRect(0, H * 0.72 + 16, W, H);
    ctx.fillStyle = '#d6dadd';
    ctx.fillRect(W * 0.4, H * 0.66, 70, 12);
    void rand;
  },

  midwest(ctx, rand) {
    ctx.fillStyle = grad(ctx, 0, 0, 0, H, [
      [0, '#26304a'],
      [0.55, '#8c6f78'],
      [0.72, '#eaa868'],
    ]);
    ctx.fillRect(0, 0, W, H);
    glow(ctx, W * 0.3, H * 0.72, 140, 'rgba(255,200,140,0.7)', 0.6);
    ctx.fillStyle = '#17161c';
    const y = H * 0.66;
    ctx.beginPath();
    ctx.moveTo(30, H);
    ctx.lineTo(30, y);
    for (let x = 30; x < 300; x += 30) {
      ctx.lineTo(x + 30, y - 16);
      ctx.lineTo(x + 30, y);
    }
    ctx.lineTo(300, H);
    ctx.fill();
    ctx.fillRect(250, y - 60, 10, 60);
    ctx.fillRect(268, y - 46, 8, 46);
    ctx.fillStyle = '#ffd186';
    for (let i = 0; i < 9; i++) ctx.fillRect(40 + i * 30, y + 10, 3, 3);
    ctx.fillStyle = '#121018';
    ctx.fillRect(0, H * 0.82, W, H);
    void rand;
  },

  robot(ctx, rand) {
    ctx.fillStyle = '#07070a';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    const cols = ['255,190,120', '120,210,255', '255,240,220'];
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = `rgba(${cols[i % 3]},0.7)`;
      ctx.shadowColor = `rgba(${cols[i % 3]},1)`;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 1.5 + rand();
      ctx.beginPath();
      ctx.moveTo(30, 200 - i * 6);
      ctx.bezierCurveTo(120 + i * 8, 20 + i * 10, 220 - i * 6, 220 - i * 4, 330, 60 + i * 12);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'source-over';
  },

  led(ctx) {
    ctx.fillStyle = '#0a0a0d';
    ctx.fillRect(0, 0, W, H);
    for (let r = 0; r < 12; r++)
      for (let c = 0; c < 18; c++) {
        const x = 22 + c * 18.6;
        const y = 18 + r * 18.6;
        const v = 0.5 + 0.5 * Math.sin(c * 0.5 + r * 0.35);
        const hue = 20 + v * 30;
        glow(ctx, x, y, 9, `hsla(${hue},100%,${45 + v * 25}%,${0.25 + v * 0.75})`);
      }
  },

  metal(ctx, rand) {
    ctx.fillStyle = grad(ctx, 0, 0, W, H, [
      [0, '#2c3540'],
      [0.45, '#8a98a8'],
      [0.55, '#c8d2dc'],
      [1, '#36404c'],
    ]);
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = rand() > 0.5 ? '#fff' : '#000';
      ctx.fillRect(0, rand() * H, W, 1);
    }
    ctx.globalAlpha = 1;
    for (const [x, y, r] of [
      [90, 80, 18],
      [250, 150, 24],
      [180, 60, 10],
    ]) {
      ctx.fillStyle = '#1b2026';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r + 2, Math.PI * 0.9, Math.PI * 1.8);
      ctx.stroke();
    }
  },
};

function finish(ctx, rand) {
  // grain
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 26;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  // vignette
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** A cached 360×240 canvas for the given subject key. */
export function photo(key) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const rand = mulberry32(hashString(key));
  painters[key](ctx, rand);
  finish(ctx, rand);
  cache.set(key, c);
  return c;
}

export const PHOTO_W = W;
export const PHOTO_H = H;

/**
 * A strip of 35 mm film as a canvas: frames at a 38 mm pitch, sprocket holes
 * punched out (transparent), edge markings. `negative` inverts the frames and
 * uses an orange base, like a developed colour negative.
 */
export function filmStrip(keys, { negative = false, edge = 'GRAIN 400', lead = 0 } = {}) {
  const k = 10; // px per mm
  const pitch = 38 * k;
  const height = 35 * k;
  const leadPx = lead * k;
  const width = leadPx + keys.length * pitch;
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  ctx.fillStyle = negative ? '#b8642c' : '#0d0c0b';
  ctx.fillRect(0, 0, width, height);
  keys.forEach((key, i) => {
    const x = leadPx + i * pitch + k;
    const y = 5.5 * k;
    if (negative) {
      const src = photo(key).getContext('2d').getImageData(0, 0, W, H);
      const d = src.data;
      for (let j = 0; j < d.length; j += 4) {
        d[j] = 40 + (255 - d[j]) * 0.72;
        d[j + 1] = 14 + (255 - d[j + 1]) * 0.5;
        d[j + 2] = 4 + (255 - d[j + 2]) * 0.3;
      }
      const tmp = document.createElement('canvas');
      tmp.width = W;
      tmp.height = H;
      tmp.getContext('2d').putImageData(src, 0, 0);
      ctx.drawImage(tmp, x, y, 36 * k, 24 * k);
    } else {
      ctx.drawImage(photo(key), x, y, 36 * k, 24 * k);
    }
    ctx.fillStyle = negative ? 'rgba(60,20,6,0.85)' : 'rgba(244,166,58,0.9)';
    ctx.font = `500 ${1.5 * k}px "JetBrains Mono", monospace`;
    ctx.fillText(`${edge}  ${i * 2 + 12}`, x + 2 * k, height - 0.9 * k);
    ctx.fillText(`▸ ${i * 2 + 12}A`, x + 26 * k, 1.9 * k);
  });
  // sprocket holes: 4.75 mm pitch, punched through
  ctx.globalCompositeOperation = 'destination-out';
  for (let x = 1.2 * k; x < width; x += 4.75 * k) {
    for (const y of [2 * k, height - 4 * k]) {
      ctx.beginPath();
      ctx.roundRect(x, y, 1.98 * k, 2 * k, 0.5 * k);
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  return c;
}
