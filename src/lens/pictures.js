// Placeholder "photographs" for every item, drawn procedurally so the render
// modes have something real to work on before actual photos exist. Each scene
// is drawn clean (no grain) in a 300 × 200 unit space; the render modes add
// grain, grade, linework and so on afterwards. Replace with real photos by
// dropping images into `photos` (see `sourceFor` in render.js).
import { mulberry32, hashString } from '../anim.js';

const TAU = Math.PI * 2;

export const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${a})`;
};

export function lin(g, x0, y0, x1, y1, stops) {
  const l = g.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) l.addColorStop(o, c);
  return l;
}

export function rad(g, x, y, r, stops, r0 = 0) {
  const l = g.createRadialGradient(x, y, r0, x, y, r);
  for (const [o, c] of stops) l.addColorStop(o, c);
  return l;
}

export function rect(g, x, y, w, h, fill) {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
}

export function rr(g, x, y, w, h, r, fill, stroke, lw = 1) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (stroke) {
    g.lineWidth = lw;
    g.strokeStyle = stroke;
    g.stroke();
  }
}

export function poly(g, pts, fill, stroke, lw = 1) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (stroke) {
    g.lineWidth = lw;
    g.strokeStyle = stroke;
    g.stroke();
  }
}

export function line(g, x0, y0, x1, y1, stroke, lw = 1, cap = 'butt') {
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.lineCap = cap;
  g.lineWidth = lw;
  g.strokeStyle = stroke;
  g.stroke();
}

export function circle(g, x, y, r, fill, stroke, lw = 1) {
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (stroke) {
    g.lineWidth = lw;
    g.strokeStyle = stroke;
    g.stroke();
  }
}

export function glow(g, x, y, r, hex, a = 1) {
  g.fillStyle = rad(g, x, y, r, [
    [0, rgba(hex, a)],
    [0.35, rgba(hex, a * 0.35)],
    [1, rgba(hex, 0)],
  ]);
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Layered ridgelines from y0 down, with a little noise. */
export function ridges(g, rnd, y0, layers, colors, amp = 18) {
  for (let l = 0; l < layers; l++) {
    const base = y0 + l * 12;
    g.beginPath();
    g.moveTo(0, 200);
    let y = base - rnd() * amp;
    for (let x = 0; x <= 300; x += 12) {
      y += (rnd() - 0.5) * amp * 0.7;
      y = Math.min(base + amp, Math.max(base - amp * 1.4, y));
      g.lineTo(x, y);
    }
    g.lineTo(300, 200);
    g.closePath();
    g.fillStyle = colors[Math.min(l, colors.length - 1)];
    g.fill();
  }
}

/* ── Scenes ───────────────────────────────────────────────────────────────── */

const scenes = {
  degree(g, rnd) {
    rect(g, 0, 0, 300, 200, lin(g, 0, 0, 0, 150, [[0, '#6f9ac2'], [1, '#f2dcc0']]));
    glow(g, 236, 58, 90, '#fff2d6', 0.9);
    // Trees either side
    for (let i = 0; i < 9; i++) {
      const x = i < 5 ? 6 + i * 13 : 234 + (i - 5) * 16;
      circle(g, x, 118 - rnd() * 14, 16 + rnd() * 8, i % 2 ? '#3e5a35' : '#4c6b3e');
    }
    // Building
    rect(g, 64, 86, 172, 66, '#e9e1d3');
    rect(g, 200, 86, 36, 66, '#d6ccbb');
    poly(g, [[54, 86], [150, 46], [246, 86]], '#f1ebdf', '#c7bca9', 1.5);
    poly(g, [[78, 80], [150, 54], [222, 80]], null, '#cdbfa8', 1);
    rect(g, 54, 84, 192, 7, '#d8ceba');
    for (let i = 0; i < 6; i++) {
      const x = 80 + i * 27;
      rect(g, x, 92, 11, 54, lin(g, x, 0, x + 11, 0, [[0, '#fbf7ef'], [0.6, '#e2d8c6'], [1, '#bfb29c']]));
      rect(g, x - 2, 91, 15, 4, '#efe7da');
      rect(g, x - 2, 144, 15, 4, '#efe7da');
    }
    rect(g, 140, 112, 20, 34, '#5a4a3a');
    for (let s = 0; s < 3; s++) rect(g, 58 - s * 8, 148 + s * 5, 184 + s * 16, 5, s % 2 ? '#d2c7b4' : '#e3dacb');
    rect(g, 0, 163, 300, 37, lin(g, 0, 163, 0, 200, [[0, '#7c9653'], [1, '#3f5a2a']]));
    poly(g, [[132, 163], [168, 163], [196, 200], [104, 200]], '#d9cdb5');
  },

  capstone(g, rnd) {
    rect(g, 0, 0, 300, 200, lin(g, 0, 0, 0, 200, [[0, '#2f353d'], [1, '#14171b']]));
    for (let x = 0; x < 300; x += 50) line(g, x, 0, x, 150, '#3a414a', 1);
    glow(g, 150, 150, 140, '#fff4dc', 0.28);
    rect(g, 0, 160, 300, 40, lin(g, 0, 160, 0, 200, [[0, '#24282d'], [1, '#121417']]));
    const steel = (x, y, w, h) => {
      rect(g, x, y, w, h, '#6d7b87');
      rect(g, x, y, w, Math.min(2, h), '#9eaab4');
      rect(g, x, y, Math.min(2, w), h, '#8e9aa4');
    };
    steel(86, 38, 12, 128);
    steel(202, 38, 12, 128);
    steel(80, 34, 140, 14);
    steel(74, 158, 152, 12);
    g.save();
    g.lineCap = 'square';
    line(g, 98, 156, 140, 112, '#6d7b87', 7);
    line(g, 202, 156, 160, 112, '#6d7b87', 7);
    g.restore();
    rect(g, 143, 48, 14, 46, lin(g, 143, 0, 157, 0, [[0, '#d7dde2'], [1, '#89939b']]));
    rect(g, 147, 94, 6, 18, '#c9cfd4');
    rect(g, 142, 110, 16, 7, '#e07a2f');
    rect(g, 146, 117, 8, 33, '#d27b3a');
    rect(g, 138, 150, 24, 8, '#4a5560');
    for (let i = 0; i < 12; i++) poly(g, [[74 + i * 13, 170], [80 + i * 13, 170], [74 + i * 13 + 10, 158], [68 + i * 13 + 10, 158]], i % 2 ? '#1c1d1f' : '#e8c22a');
    g.beginPath();
    g.moveTo(157, 70);
    g.bezierCurveTo(200, 60, 230, 120, 250, 128);
    g.lineWidth = 2;
    g.strokeStyle = '#111';
    g.stroke();
    rect(g, 236, 128, 50, 4, '#3c4249');
    rect(g, 240, 132, 3, 32, '#3c4249');
    rect(g, 280, 132, 3, 32, '#3c4249');
    rr(g, 242, 104, 40, 24, 2, '#0e1114', '#3c4249');
    g.beginPath();
    for (let i = 0; i <= 18; i++) g[i ? 'lineTo' : 'moveTo'](245 + i * 1.9, 122 - Math.min(14, i * i * 0.05) - rnd() * 2);
    g.strokeStyle = '#5cf2b0';
    g.lineWidth = 1;
    g.stroke();
  },

  facility(g) {
    const vx = 150;
    const vy = 96;
    rect(g, 0, 0, 300, 200, '#4b5158');
    poly(g, [[0, 0], [300, 0], [vx + 30, vy - 22], [vx - 30, vy - 22]], lin(g, 0, 0, 0, 80, [[0, '#2c3137'], [1, '#535a62']]));
    for (let k = 0; k < 7; k++) {
      const t = k / 7;
      const y = lerp(0, vy - 22, t * t);
      const half = lerp(150, 30, t * t);
      line(g, vx - half, y, vx + half, y, '#2a2e33', 1.6 - t);
      poly(g, [[vx - half * 0.18, y + 1], [vx + half * 0.18, y + 1], [vx + half * 0.14, y + 6 - t * 4], [vx - half * 0.14, y + 6 - t * 4]], '#f4f7f9');
    }
    poly(g, [[0, 200], [300, 200], [vx + 30, vy + 14], [vx - 30, vy + 14]], lin(g, 0, 200, 0, vy, [[0, '#8f9398'], [1, '#6a6e74']]));
    rect(g, vx - 30, vy - 22, 60, 36, '#7d848c');
    rect(g, vx - 9, vy - 6, 18, 20, '#ffffff');
    glow(g, vx, vy + 4, 70, '#ffffff', 0.55);
    poly(g, [[96, 200], [104, 200], [vx - 6, vy + 14], [vx - 7, vy + 14]], '#e8c22a');
    poly(g, [[196, 200], [204, 200], [vx + 7, vy + 14], [vx + 6, vy + 14]], '#e8c22a');
    for (let k = 0; k < 5; k++) {
      const t = 1 - k / 5;
      const s = 0.25 + t * 0.75;
      for (const side of [-1, 1]) {
        const x = vx + side * (30 + 120 * s);
        const top = vy - 22 - 74 * s;
        const bottom = vy + 14 + 86 * s;
        rect(g, x - 3 * s, top, 6 * s, bottom - top, '#3a3f45');
        if (k % 2 === 0) {
          const mx = vx + side * (18 + 80 * s);
          const mw = 30 * s;
          const mh = 26 * s;
          const my = vy + 14 + 70 * s - mh;
          rect(g, side < 0 ? mx - mw : mx, my, mw, mh, '#5d7286');
          rect(g, side < 0 ? mx - mw : mx, my, mw, 4 * s, '#e07a2f');
          rect(g, side < 0 ? mx - mw * 0.7 : mx + mw * 0.2, my + 8 * s, mw * 0.5, mh * 0.35, '#9fd3e6');
        }
      }
    }
  },

  cell(g) {
    rect(g, 0, 0, 300, 200, lin(g, 0, 0, 0, 200, [[0, '#1b1f24'], [1, '#2c3239']]));
    poly(g, [[118, 0], [182, 0], [250, 160], [50, 160]], 'rgb(255 250 235 / 0.07)');
    rect(g, 0, 152, 300, 48, '#22262b');
    rect(g, 0, 156, 300, 3, '#e8c22a');
    for (const x0 of [8, 236]) {
      rect(g, x0, 40, 56, 112, 'rgb(150 160 170 / 0.12)');
      g.save();
      g.beginPath();
      g.rect(x0, 40, 56, 112);
      g.clip();
      for (let i = -112; i < 56; i += 6) {
        line(g, x0 + i, 40, x0 + i + 112, 152, 'rgb(170 180 190 / 0.35)', 0.6);
        line(g, x0 + i + 112, 40, x0 + i, 152, 'rgb(170 180 190 / 0.35)', 0.6);
      }
      g.restore();
      rect(g, x0, 38, 4, 116, '#e8c22a');
      rect(g, x0 + 52, 38, 4, 116, '#e8c22a');
    }
    rect(g, 40, 138, 220, 12, '#15171a');
    for (let x = 46; x < 258; x += 14) circle(g, x, 150, 3, '#3a3f46');
    for (const x of [62, 104, 214]) rr(g, x, 128, 16, 10, 1, '#9aa5ae');
    // Robot arm
    rr(g, 118, 118, 40, 22, 4, '#d4651f');
    g.beginPath();
    g.ellipse(138, 118, 22, 6, 0, 0, TAU);
    g.fillStyle = '#ef8a3e';
    g.fill();
    const arm = (x0, y0, x1, y1, w) => {
      line(g, x0, y0, x1, y1, '#e8742a', w, 'round');
      line(g, x0, y0 - w * 0.3, x1, y1 - w * 0.3, '#ff9d55', w * 0.25, 'round');
    };
    arm(138, 112, 116, 66, 18);
    arm(116, 66, 186, 54, 13);
    arm(186, 54, 198, 84, 9);
    circle(g, 138, 112, 8, '#2a2d31');
    circle(g, 116, 66, 8, '#2a2d31');
    circle(g, 186, 54, 6, '#2a2d31');
    rect(g, 192, 84, 14, 6, '#3a3f45');
    rect(g, 192, 90, 3, 10, '#3a3f45');
    rect(g, 203, 90, 3, 10, '#3a3f45');
    rr(g, 191, 100, 16, 10, 1, '#c3ccd3');
    rect(g, 278, 30, 10, 10, '#d23b2f');
    rect(g, 278, 40, 10, 10, '#e2a62a');
    rect(g, 278, 50, 10, 10, '#38d07a');
    glow(g, 283, 55, 22, '#38d07a', 0.8);
    rect(g, 281, 60, 4, 92, '#4a4f56');
  },

  fixtures(g) {
    rect(g, 0, 0, 300, 200, '#2b2e32');
    for (let x = 0; x < 300; x += 15) line(g, x, 0, x, 200, '#33373c', 0.8);
    for (let y = 0; y < 200; y += 15) line(g, 0, y, 300, y, '#33373c', 0.8);
    glow(g, 90, 40, 220, '#ffffff', 0.12);
    const block = (x, y, w, h, base, hi, lo) => {
      rr(g, x + 5, y + 6, w, h, 6, 'rgb(0 0 0 / 0.45)');
      rr(g, x, y, w, h, 6, lin(g, x, y, x + w, y + h, [[0, hi], [0.5, base], [1, lo]]));
      rr(g, x + 3, y + 3, w - 6, h - 6, 4, null, 'rgb(255 255 255 / 0.18)', 1);
    };
    const hole = (x, y, r, cb) => {
      if (cb) circle(g, x, y, r * 1.7, '#1a1c1f', 'rgb(255 255 255 / 0.25)', 0.8);
      circle(g, x, y, r, '#0c0d0e', 'rgb(255 255 255 / 0.35)', 0.8);
    };
    block(26, 26, 116, 82, '#2f63a8', '#5a8fd4', '#1d3f6e');
    for (const [x, y] of [[46, 46], [122, 46], [46, 88], [122, 88]]) hole(x, y, 4, true);
    hole(84, 67, 9, false);
    block(162, 36, 112, 58, '#2a2d33', '#4a4f57', '#16181b');
    for (let i = 0; i < 4; i++) hole(182 + i * 24, 65, 3.5, i % 2 === 0);
    block(58, 124, 150, 56, '#b5443a', '#de6a5d', '#7a2a23');
    rr(g, 92, 145, 82, 12, 6, '#5c1d18', 'rgb(255 255 255 / 0.25)');
    for (const x of [74, 192]) {
      circle(g, x, 152, 5, lin(g, x - 5, 147, x + 5, 157, [[0, '#ffffff'], [1, '#8c949b']]));
      circle(g, x, 152, 5, null, '#555', 0.6);
    }
    g.save();
    g.translate(240, 150);
    g.rotate(-0.5);
    rr(g, -10, -6, 80, 12, 2, '#b9c0c6');
    rect(g, -6, -3, 70, 2, '#7b848b');
    rr(g, -14, -26, 12, 26, 2, '#a6aeb5');
    g.restore();
  },

  led(g) {
    rect(g, 0, 0, 300, 200, lin(g, 0, 0, 0, 200, [[0, '#141519'], [1, '#0c0c0f']]));
    glow(g, 150, 100, 170, '#ff8a3d', 0.32);
    rr(g, 72, 22, 156, 156, 4, '#6b4a2f');
    rr(g, 80, 30, 140, 140, 2, '#0a0a0c');
    const N = 16;
    const c = 140 / N;
    const color = (i, j) => {
      const u = (i + 0.5) / N;
      const v = (j + 0.5) / N;
      const d = Math.hypot(u - 0.5, (v - 0.48) * 1.1);
      if (v > 0.62) return (Math.sin(u * 12 + v * 30) > 0.2 ? '#2de2e6' : '#126c7a');
      if (d < 0.2) return v > 0.56 ? '#ff5e3a' : '#ffd23f';
      return v < 0.3 ? '#5b2a86' : '#c43d7b';
    };
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const x = 80 + i * c + c / 2;
        const y = 30 + j * c + c / 2;
        const col = color(i, j);
        glow(g, x, y, c * 0.9, col, 0.35);
        rr(g, x - c * 0.3, y - c * 0.3, c * 0.6, c * 0.6, 1, col);
      }
    }
  },

  g64(g) {
    rect(g, 0, 0, 300, 200, lin(g, 0, 0, 0, 200, [[0, '#1b1430'], [1, '#2c1d47']]));
    glow(g, 150, 100, 150, '#2fd1c5', 0.35);
    rect(g, 0, 142, 300, 58, lin(g, 0, 142, 0, 200, [[0, '#1a1526'], [1, '#0d0a14']]));
    rr(g, 118, 70, 64, 30, 3, '#8c8a92');
    rect(g, 124, 76, 52, 12, lin(g, 124, 0, 176, 0, [[0, '#ff3d8b'], [0.5, '#ffd23f'], [1, '#2de2e6']]));
    rr(g, 66, 94, 168, 52, 10, 'rgb(107 79 163 / 0.88)');
    rr(g, 82, 104, 120, 30, 3, 'rgb(40 120 70 / 0.35)');
    for (let i = 0; i < 6; i++) rect(g, 90 + i * 18, 110, 10, 6, 'rgb(20 20 20 / 0.5)');
    rr(g, 66, 94, 168, 52, 10, null, 'rgb(255 255 255 / 0.35)', 1.2);
    line(g, 76, 97, 224, 97, 'rgb(255 255 255 / 0.45)', 1.2);
    circle(g, 214, 132, 3, '#ff3b3b');
    glow(g, 214, 132, 10, '#ff3b3b', 0.7);
    // Controller and cable
    g.beginPath();
    g.moveTo(222, 140);
    g.bezierCurveTo(250, 150, 210, 168, 232, 160);
    g.strokeStyle = '#2a2236';
    g.lineWidth = 2;
    g.stroke();
    rr(g, 196, 152, 84, 32, 14, '#3d3550', 'rgb(255 255 255 / 0.2)');
    rect(g, 208, 164, 14, 4, '#15121c');
    rect(g, 213, 159, 4, 14, '#15121c');
    circle(g, 258, 162, 3.5, '#e8443a');
    circle(g, 266, 168, 3.5, '#e8c22a');
    circle(g, 250, 170, 3.5, '#38d07a');
    circle(g, 258, 176, 3.5, '#3d7be8');
  },

  printer(g) {
    rect(g, 0, 0, 300, 200, lin(g, 0, 0, 0, 200, [[0, '#3c312a'], [1, '#221b16']]));
    glow(g, 50, 20, 180, '#ffc98a', 0.4);
    rect(g, 0, 166, 300, 34, lin(g, 0, 166, 0, 200, [[0, '#6a4a31'], [1, '#3e2a1b']]));
    rect(g, 78, 150, 144, 18, '#1d1e21');
    const ext = (x, y, w, h) => {
      rect(g, x, y, w, h, lin(g, x, y, x + w, y, [[0, '#c3c8cd'], [1, '#7e858b']]));
      if (w < h) rect(g, x + w / 2 - 0.5, y, 1, h, '#5d646a');
      else rect(g, x, y + h / 2 - 0.5, w, 1, '#5d646a');
    };
    ext(88, 28, 9, 124);
    ext(203, 28, 9, 124);
    ext(88, 26, 124, 9);
    ext(97, 68, 106, 7);
    rect(g, 102, 138, 96, 8, '#b8945a');
    // Printed vase, layer by layer
    for (let y = 138; y > 100; y -= 1.6) {
      const t = (138 - y) / 38;
      const w = 18 + Math.sin(t * 3.2) * 8 + t * 6;
      rect(g, 150 - w, y - 1.6, w * 2, 1.4, Math.round(y) % 2 ? '#2a9d8f' : '#34b3a3');
    }
    rr(g, 138, 60, 26, 26, 2, '#26282c');
    circle(g, 151, 73, 7, '#e07a2f');
    circle(g, 151, 73, 2, '#26282c');
    poly(g, [[147, 86], [155, 86], [151, 94]], '#c9a227');
    circle(g, 246, 40, 18, '#e8742a');
    circle(g, 246, 40, 6, '#2a2c30');
    g.beginPath();
    g.moveTo(232, 48);
    g.bezierCurveTo(200, 70, 170, 40, 158, 60);
    g.strokeStyle = '#e8742a';
    g.lineWidth = 1.2;
    g.stroke();
  },

  bench(g, rnd) {
    rect(g, 0, 0, 300, 130, '#c9a978');
    for (let y = 8; y < 126; y += 9) for (let x = 6; x < 300; x += 9) circle(g, x, y, 1.3, '#9c7f52');
    glow(g, 150, 10, 200, '#fff3d9', 0.45);
    const tool = (x, y, color) => {
      rect(g, x - 2, y, 4, 46, color);
    };
    // Hammer
    rect(g, 40, 22, 5, 52, '#8a5a32');
    rr(g, 30, 16, 26, 10, 2, '#4a4f56');
    // Wrenches
    for (let i = 0; i < 3; i++) {
      const x = 86 + i * 14;
      rect(g, x - 2.5, 22, 5, 50 - i * 6, '#9aa3ab');
      circle(g, x, 22, 6 - i, null, '#9aa3ab', 3);
    }
    // Screwdrivers
    for (let i = 0; i < 4; i++) {
      const x = 150 + i * 12;
      tool(x, 40, '#b7bec4');
      rr(g, x - 4, 20, 8, 22, 3, ['#d23b2f', '#e8c22a', '#2f63a8', '#38a06a'][i]);
    }
    // Saw
    poly(g, [[214, 24], [282, 30], [282, 52], [214, 70]], '#c3c9ce');
    rr(g, 196, 26, 22, 40, 6, '#8a5a32');
    for (let x = 216; x < 282; x += 4) line(g, x, 70 - (x - 214) * 0.27, x + 2, 73 - (x - 214) * 0.27, '#8b9196', 1);
    // Bench top in perspective
    poly(g, [[0, 132], [300, 132], [300, 160], [0, 160]], lin(g, 0, 132, 0, 160, [[0, '#d39a5d'], [1, '#b47a41']]));
    for (let i = 1; i < 6; i++) line(g, 0, 132 + i * 4.6, 300, 132 + i * 4.6, 'rgb(90 55 25 / 0.35)', 0.6);
    for (let i = 0; i < 18; i++) {
      const y = 134 + rnd() * 24;
      const x = rnd() * 260;
      line(g, x, y, x + 20 + rnd() * 40, y + (rnd() - 0.5) * 2, 'rgb(120 75 35 / 0.35)', 0.5);
    }
    rect(g, 0, 160, 300, 16, '#8a5a32');
    rect(g, 0, 176, 300, 24, '#2b1d12');
    rr(g, 18, 112, 46, 24, 3, '#3d4249');
    rect(g, 10, 120, 10, 6, '#3d4249');
    line(g, 8, 140, 30, 140, '#9aa3ab', 3, 'round');
    rr(g, 214, 112, 22, 22, 3, '#e9e4dc');
    rr(g, 236, 118, 6, 10, 3, null, '#e9e4dc', 2.5);
    rr(g, 120, 124, 40, 10, 1, '#6d7b87');
    line(g, 176, 136, 206, 130, '#e8c22a', 2.4, 'round');
  },

  film(g, rnd) {
    rect(g, 0, 0, 300, 200, lin(g, 0, 0, 0, 120, [[0, '#1d2b44'], [0.7, '#e6a77a'], [1, '#f6d7b0']]));
    glow(g, 196, 104, 120, '#fff0d4', 0.95);
    circle(g, 196, 104, 10, '#fff7e6');
    ridges(g, rnd, 108, 3, ['#8a6a6a', '#4a3a44', '#2a1d22']);
    rect(g, 0, 150, 300, 50, lin(g, 0, 150, 0, 200, [[0, '#3a2a30'], [1, '#160f12']]));
    for (let i = 0; i < 14; i++) line(g, 160 + rnd() * 70, 152 + i * 3.4, 200 + rnd() * 60, 152 + i * 3.4, 'rgb(255 220 180 / 0.35)', 0.8);
  },

  renders(g) {
    rect(g, 0, 0, 300, 200, rad(g, 150, 80, 220, [[0, '#3a3e44'], [1, '#0d0e10']]));
    rect(g, 0, 150, 300, 50, lin(g, 0, 150, 0, 200, [[0, 'rgb(255 255 255 / 0.06)'], [1, 'rgb(0 0 0 / 0)']]));
    g.beginPath();
    g.ellipse(150, 160, 70, 9, 0, 0, TAU);
    g.fillStyle = 'rgb(0 0 0 / 0.5)';
    g.fill();
    const gear = (cx, cy, R, teeth, depth, fill) => {
      g.beginPath();
      for (let i = 0; i < teeth * 2; i++) {
        const a0 = (i / (teeth * 2)) * TAU;
        const a1 = ((i + 1) / (teeth * 2)) * TAU;
        const r = i % 2 ? R - depth : R;
        g.lineTo(cx + Math.cos(a0 + 0.04) * r, cy + Math.sin(a0 + 0.04) * r);
        g.lineTo(cx + Math.cos(a1 - 0.04) * r, cy + Math.sin(a1 - 0.04) * r);
      }
      g.closePath();
      g.fillStyle = fill;
      g.fill();
    };
    gear(232, 62, 34, 12, 6, 'rgb(120 128 136 / 0.45)');
    gear(150, 98, 60, 18, 9, rad(g, 128, 76, 90, [[0, '#f4f7f9'], [0.45, '#9aa3ab'], [1, '#3c4248']]));
    circle(g, 150, 98, 30, rad(g, 140, 88, 40, [[0, '#d9dee2'], [1, '#5c646b']]));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      circle(g, 150 + Math.cos(a) * 41, 98 + Math.sin(a) * 41, 7, '#16181b', 'rgb(255 255 255 / 0.4)', 0.8);
    }
    circle(g, 150, 98, 11, '#0c0d0e', 'rgb(255 255 255 / 0.5)', 1);
    rect(g, 147, 85, 6, 5, '#0c0d0e');
    g.save();
    g.globalAlpha = 0.5;
    g.beginPath();
    g.ellipse(124, 70, 24, 6, -0.6, 0, TAU);
    g.fillStyle = '#ffffff';
    g.fill();
    g.restore();
  },

  iceland(g, rnd) {
    rect(g, 0, 0, 300, 200, lin(g, 0, 0, 0, 130, [[0, '#9aacb7'], [1, '#dde4e7']]));
    ridges(g, rnd, 84, 2, ['#7f929e', '#5b6b75'], 14);
    poly(g, [[0, 96], [70, 80], [112, 60], [190, 58], [232, 76], [300, 92], [300, 160], [0, 160]], lin(g, 0, 58, 0, 160, [[0, '#3a4148'], [1, '#22272c']]));
    for (let i = 0; i < 9; i++) line(g, 20 + i * 34, 90 - (i > 2 && i < 6 ? 26 : 6), 14 + i * 34, 160, 'rgb(0 0 0 / 0.25)', 1);
    rect(g, 140, 58, 22, 104, lin(g, 0, 58, 0, 160, [[0, '#f4f7f8'], [1, '#c9d6dc']]));
    for (let i = 0; i < 6; i++) line(g, 143 + i * 3.4, 60, 143 + i * 3.4, 160, 'rgb(150 175 185 / 0.5)', 0.6);
    glow(g, 151, 160, 60, '#ffffff', 0.7);
    rect(g, 0, 160, 300, 40, '#1d2023');
    // Basalt columns in the foreground
    for (let i = 0; i < 16; i++) {
      const x = i * 19 - 4;
      if (x > 92 && x < 196) continue;
      const h = 40 + ((i * 37) % 23) + rnd() * 10;
      rect(g, x, 200 - h, 18, h, i % 2 ? '#30353a' : '#3a4046');
      poly(g, [[x, 200 - h], [x + 18, 200 - h], [x + 15, 196 - h], [x + 3, 196 - h]], '#596168');
    }
  },

  italy(g, rnd) {
    rect(g, 0, 0, 300, 200, lin(g, 0, 0, 0, 140, [[0, '#f6d6a8'], [1, '#f2ad6c']]));
    glow(g, 70, 70, 120, '#fff1d6', 0.7);
    ridges(g, rnd, 104, 1, ['#c99c78'], 10);
    rect(g, 92, 48, 16, 86, '#e8dcc6');
    for (let y = 52; y < 134; y += 10) rect(g, 92, y, 16, 3, '#6f8f73');
    poly(g, [[90, 48], [100, 36], [110, 48]], '#b8573a');
    const cx = 172;
    rect(g, cx - 38, 100, 76, 20, '#dcc19a');
    for (let i = 0; i < 6; i++) rect(g, cx - 32 + i * 12, 104, 5, 10, '#a98a62');
    g.beginPath();
    g.ellipse(cx, 100, 40, 46, 0, Math.PI, TAU);
    g.closePath();
    g.fillStyle = lin(g, cx - 40, 0, cx + 40, 0, [[0, '#d0683f'], [1, '#9d4428']]);
    g.fill();
    for (let i = -3; i <= 3; i++) {
      g.beginPath();
      g.ellipse(cx, 100, Math.abs(i) * 12, 46, 0, i < 0 ? Math.PI : Math.PI * 1.5, i < 0 ? Math.PI * 1.5 : TAU);
      g.strokeStyle = '#f2e6d4';
      g.lineWidth = 1.4;
      g.stroke();
    }
    rect(g, cx - 5, 46, 10, 10, '#efe3cf');
    poly(g, [[cx - 6, 46], [cx, 36], [cx + 6, 46]], '#a98a62');
    for (let i = 0; i < 26; i++) {
      const w = 14 + rnd() * 20;
      const x = (i * 300) / 26 - 6 + rnd() * 6;
      const top = 118 + rnd() * 26;
      rect(g, x, top, w, 200 - top, ['#d9a066', '#e6b882', '#c98a52', '#efd0a0'][i % 4]);
      poly(g, [[x - 2, top], [x + w / 2, top - 6], [x + w + 2, top]], '#b8573a');
      for (let k = 0; k < 2; k++) rect(g, x + 3 + k * (w / 2), top + 10, 3, 5, '#6a4a32');
    }
    for (const x of [14, 270, 288]) {
      g.beginPath();
      g.ellipse(x, 120, 6, 32, 0, 0, TAU);
      g.fillStyle = '#2f4a2c';
      g.fill();
    }
  },

  japan(g, rnd) {
    rect(g, 0, 0, 300, 200, lin(g, 0, 0, 0, 200, [[0, '#0a0c22'], [1, '#1d1440']]));
    poly(g, [[0, 0], [110, 0], [132, 120], [0, 200]], '#120f24');
    poly(g, [[300, 0], [190, 0], [168, 120], [300, 200]], '#120f24');
    poly(g, [[0, 200], [300, 200], [168, 120], [132, 120]], lin(g, 0, 120, 0, 200, [[0, '#1a1730'], [1, '#0b0a18']]));
    const signs = [
      [20, 20, 14, 70, '#ff3d8b'],
      [60, 40, 10, 56, '#2de2e6'],
      [92, 56, 8, 40, '#ffd23f'],
      [266, 24, 14, 74, '#2de2e6'],
      [230, 44, 10, 54, '#ff3d8b'],
      [200, 62, 8, 38, '#ff8a3d'],
    ];
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const [x, y, w, h, c] of signs) {
      glow(g, x + w / 2, y + h / 2, h * 0.8, c, 0.35);
      rect(g, x, y, w, h, c);
      for (let k = 0; k < 4; k++) rect(g, x + 2, y + 6 + k * (h / 4.4), w - 4, 3, 'rgb(255 255 255 / 0.6)');
      // Reflection on the wet street
      const rx = x + w / 2 + (150 - (x + w / 2)) * 0.25;
      rect(g, rx - w / 2, 150, w, 50, lin(g, 0, 150, 0, 200, [[0, rgba(c, 0.45)], [1, rgba(c, 0)]]));
    }
    g.restore();
    for (let i = 0; i < 9; i++) {
      const x = 120 + i * 7;
      line(g, x, 22, x + 3.5, 22, '#000', 0.5);
      circle(g, x, 28 + Math.sin(i) * 1.5, 3, '#ff4a2e');
      glow(g, x, 28, 9, '#ff4a2e', 0.5);
    }
    for (let i = 0; i < 6; i++) rect(g, 136 + rnd() * 26, 112 + rnd() * 6, 2, 9, '#05040c');
  },

  site(g) {
    rect(g, 0, 0, 300, 200, lin(g, 0, 0, 0, 200, [[0, '#ddd8cf'], [1, '#c1b9ad']]));
    rr(g, 34, 28, 236, 160, 8, 'rgb(0 0 0 / 0.18)');
    rr(g, 30, 22, 240, 160, 8, '#f6f5f1');
    g.save();
    g.beginPath();
    g.roundRect(30, 22, 240, 160, 8);
    g.clip();
    rect(g, 30, 22, 240, 16, '#e7e3dc');
    circle(g, 40, 30, 2.6, '#ec6a5e');
    circle(g, 49, 30, 2.6, '#f4bf4f');
    circle(g, 58, 30, 2.6, '#61c554');
    rr(g, 110, 26, 90, 8, 4, '#f6f5f1');
    g.fillStyle = '#161616';
    g.font = '600 19px Inter, system-ui, sans-serif';
    g.fillText('Same person.', 46, 70);
    g.fillStyle = '#d2491f';
    g.font = 'italic 21px "Instrument Serif", Georgia, serif';
    g.fillText('Different lens.', 46, 92);
    for (let i = 0; i < 4; i++) {
      rr(g, 46 + i * 52, 106, 46, 32, 3, ['#1d2b44', '#c7744a', '#2f63a8', '#1e2a1f'][i]);
      rect(g, 46 + i * 52, 141, 30, 2, '#b9b4ab');
    }
    rr(g, 96, 156, 108, 18, 9, '#e5e1d9', '#cfc9be');
    rr(g, 120, 158, 24, 14, 6, '#161616');
    g.restore();
  },

  dashboard(g) {
    rect(g, 0, 0, 300, 200, lin(g, 0, 0, 0, 200, [[0, '#2a3038'], [1, '#161a1f']]));
    poly(g, [[132, 172], [168, 172], [176, 192], [124, 192]], '#0b0d10');
    rr(g, 28, 18, 244, 156, 6, '#0a0c0f');
    rect(g, 34, 24, 232, 144, '#10151b');
    rect(g, 34, 24, 232, 12, '#171e26');
    g.font = '500 6px "JetBrains Mono", monospace';
    g.fillStyle = '#7d8da6';
    g.fillText('LINE 2 · LIVE', 40, 32);
    const kpi = (x, label, value, color) => {
      rr(g, x, 42, 68, 34, 3, '#171e26');
      g.font = '500 5px "JetBrains Mono", monospace';
      g.fillStyle = '#7d8da6';
      g.fillText(label, x + 6, 51);
      g.font = '600 15px "JetBrains Mono", monospace';
      g.fillStyle = color;
      g.fillText(value, x + 6, 69);
    };
    kpi(40, 'UPTIME', '98.2%', '#5cf2b0');
    kpi(114, 'UNITS/HR', '412', '#e8eef5');
    kpi(188, 'ALARMS', '3', '#ffb648');
    rr(g, 40, 82, 142, 78, 3, '#171e26');
    g.beginPath();
    const pts = [];
    for (let i = 0; i <= 20; i++) pts.push([46 + i * 6.5, 140 - 30 * Math.sin(i * 0.45) * Math.exp(-i * 0.02) - i * 1.2]);
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.strokeStyle = '#5cf2b0';
    g.lineWidth = 1.4;
    g.stroke();
    g.lineTo(176, 154);
    g.lineTo(46, 154);
    g.closePath();
    g.fillStyle = 'rgb(92 242 176 / 0.12)';
    g.fill();
    rr(g, 188, 82, 72, 78, 3, '#171e26');
    for (let i = 0; i < 24; i++) circle(g, 198 + (i % 6) * 10.5, 96 + Math.floor(i / 6) * 14, 3, i === 13 ? '#ff5c5c' : i === 7 ? '#ffb648' : '#2fbf83');
  },

  filmlog(g) {
    rect(g, 0, 0, 300, 200, rad(g, 150, 100, 220, [[0, '#fbfaf6'], [1, '#d9d4ca']]));
    g.save();
    g.translate(54, 120);
    g.rotate(-0.42);
    rect(g, -10, -16, 190, 32, 'rgb(160 90 40 / 0.55)');
    for (let i = 0; i < 5; i++) rect(g, i * 36, -10, 30, 20, 'rgb(60 30 15 / 0.45)');
    for (let i = 0; i < 24; i++) {
      rect(g, -6 + i * 8, -14, 4, 3, '#fbfaf6');
      rect(g, -6 + i * 8, 11, 4, 3, '#fbfaf6');
    }
    g.restore();
    rr(g, 112, 20, 84, 168, 14, 'rgb(0 0 0 / 0.2)');
    rr(g, 108, 14, 84, 168, 14, '#111214');
    rr(g, 112, 18, 76, 160, 11, '#1b1d21');
    g.font = '600 7px Inter, system-ui, sans-serif';
    g.fillStyle = '#f2f2f2';
    g.fillText('Roll 042', 120, 36);
    g.font = '500 4.5px "JetBrains Mono", monospace';
    g.fillStyle = '#8a8f96';
    g.fillText('PORTRA 400 · 36 EXP', 120, 44);
    const tones = ['#1d2b44', '#e6a77a', '#3f8a9b', '#c7744a', '#6f8b5b', '#b9c4c9', '#c43d7b', '#2b3135', '#f0c48b', '#0f2f3d', '#d5dcc0', '#9a9a9a'];
    for (let i = 0; i < 12; i++) {
      const x = 118 + (i % 3) * 22;
      const y = 52 + Math.floor(i / 3) * 28;
      rect(g, x, y, 20, 24, tones[i]);
      rect(g, x, y + 14, 20, 10, 'rgb(0 0 0 / 0.25)');
    }
  },
};

const lerp = (a, b, t) => a + (b - a) * t;

/** Draw item `id`'s scene into a new w × h canvas (3:2 recommended). */
export function drawPicture(id, w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.scale(w / 300, h / 200);
  const rnd = mulberry32(hashString(id));
  (scenes[id] ?? scenes.film)(g, rnd);
  return c;
}
