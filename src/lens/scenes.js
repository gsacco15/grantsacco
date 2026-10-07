// Placeholder pictures for the real artifacts, drawn procedurally until photos,
// CAD and logos arrive. Each scene draws in a 300 × 200 unit space, like the
// base scenes in pictures.js; `spec` is the artifact's `picture` entry.
import { mulberry32, hashString } from '../anim.js';
import { scenes as base, rgba, lin, rect, rr, poly, line, circle, glow } from './pictures.js';

const TAU = Math.PI * 2;

function label(g, text, x, y, { size = 20, weight = 600, color = '#161616', family = 'Inter, system-ui, sans-serif', align = 'left' } = {}) {
  g.font = `${weight} ${size}px ${family}`;
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = 'alphabetic';
  g.fillText(text, x, y);
  g.textAlign = 'left';
}

const extra = {
  // A dry mix plant: three silos on a steel tower against the sky.
  silo(g) {
    rect(g, 0, 0, 300, 200, lin(g, 0, 0, 0, 160, [[0, '#7fa6c9'], [1, '#e6eef2']]));
    glow(g, 230, 40, 90, '#ffffff', 0.6);
    rect(g, 0, 168, 300, 32, lin(g, 0, 168, 0, 200, [[0, '#8e9196'], [1, '#5e6166']]));
    // Building at the base
    rect(g, 60, 112, 190, 58, '#c9ccd0');
    rect(g, 60, 112, 190, 6, '#a9adb2');
    for (let i = 0; i < 6; i++) rect(g, 72 + i * 30, 132, 16, 36, '#8e959c');
    // Tower and silos
    rect(g, 104, 28, 96, 90, '#dfe3e6');
    for (let i = 0; i < 3; i++) {
      const x = 110 + i * 30;
      rect(g, x, 34, 24, 76, lin(g, x, 0, x + 24, 0, [[0, '#f7f9fa'], [0.6, '#d6dbdf'], [1, '#a9b0b6']]));
      g.beginPath();
      g.ellipse(x + 12, 34, 12, 4, 0, 0, TAU);
      g.fillStyle = '#eef1f3';
      g.fill();
      poly(g, [[x, 110], [x + 24, 110], [x + 15, 122], [x + 9, 122]], '#9aa2a9');
    }
    rect(g, 100, 22, 104, 8, '#5d6a76');
    for (let x = 100; x <= 204; x += 13) line(g, x, 22, x, 30, '#3d4752', 1);
    // Exterior stair and rails
    for (let k = 0; k < 7; k++) line(g, 206, 118 - k * 13, 222, 105 - k * 13, '#e8c22a', 1.4);
    line(g, 222, 118, 222, 22, '#e8c22a', 1.2);
    rect(g, 30, 150, 34, 20, '#5d7286');
    rect(g, 30, 150, 34, 3, '#e07a2f');
  },

  // An industrial building, outside: panels, glazing, a parking lot.
  building(g, rnd) {
    rect(g, 0, 0, 300, 200, lin(g, 0, 0, 0, 120, [[0, '#6f9ac2'], [1, '#dfe9f0']]));
    glow(g, 60, 30, 110, '#ffffff', 0.5);
    rect(g, 0, 150, 300, 50, lin(g, 0, 150, 0, 200, [[0, '#9a9da1'], [1, '#6d7074']]));
    for (let i = 0; i < 7; i++) line(g, 20 + i * 40, 168, 36 + i * 40, 196, '#f2f2f2', 1.4);
    poly(g, [[20, 70], [280, 82], [280, 150], [20, 150]], '#e7e9eb');
    poly(g, [[20, 70], [280, 82], [280, 90], [20, 78]], '#b9bec3');
    for (let i = 0; i < 12; i++) {
      const x = 32 + i * 20;
      line(g, x, 80 + i * 0.6, x, 150, 'rgb(0 0 0 / 0.07)', 1);
    }
    rect(g, 34, 92, 56, 58, '#c3c8cd');
    rect(g, 40, 98, 44, 24, '#5c7d99');
    rect(g, 40, 126, 44, 24, '#5c7d99');
    line(g, 62, 98, 62, 150, '#e7e9eb', 2);
    for (let i = 0; i < 6; i++) rect(g, 112 + i * 27, 116, 18, 34, '#8e959c');
    for (let i = 0; i < 4; i++) {
      const x = 30 + rnd() * 240;
      circle(g, x, 150, 7 + rnd() * 4, '#6b8a4f');
    }
  },

  // A liquid plant: tanks, piping, a blending skid.
  tanks(g) {
    rect(g, 0, 0, 300, 200, lin(g, 0, 0, 0, 200, [[0, '#2f353d'], [1, '#171a1e']]));
    glow(g, 150, 60, 170, '#fff4dc', 0.22);
    rect(g, 0, 165, 300, 35, '#1e2125');
    for (let i = 0; i < 4; i++) {
      const x = 30 + i * 62;
      const h = 92 - (i % 2) * 14;
      rect(g, x, 165 - h, 46, h, lin(g, x, 0, x + 46, 0, [[0, '#dfe4e8'], [0.55, '#aab3ba'], [1, '#6d767d']]));
      g.beginPath();
      g.ellipse(x + 23, 165 - h, 23, 6, 0, 0, TAU);
      g.fillStyle = '#e9edf0';
      g.fill();
      rect(g, x + 4, 165 - h + 14, 38, 3, 'rgb(0 0 0 / 0.15)');
      line(g, x + 23, 165 - h - 6, x + 23, 40, '#8e979e', 2.2);
    }
    line(g, 53, 40, 239, 40, '#8e979e', 2.2);
    line(g, 20, 150, 280, 150, '#c9a227', 3);
    rr(g, 220, 120, 56, 30, 3, '#3a4552');
    circle(g, 236, 135, 6, '#5cf2b0');
    circle(g, 256, 135, 6, '#e8c22a');
  },

  // An EV charger and a parked car. `logo` adds the lightning-bolt placeholder.
  charger(g, rnd, spec) {
    rect(g, 0, 0, 300, 200, lin(g, 0, 0, 0, 200, [[0, '#cfd8de'], [1, '#eef1f2']]));
    rect(g, 0, 140, 300, 60, lin(g, 0, 140, 0, 200, [[0, '#7c8086'], [1, '#55595e']]));
    for (let i = 0; i < 4; i++) line(g, 40 + i * 70, 200, 70 + i * 70, 140, '#f2f2f2', 2);
    // Car
    poly(g, [[150, 150], [168, 118], [240, 112], [272, 128], [286, 150]], '#2f3a46');
    poly(g, [[176, 122], [236, 117], [258, 130], [172, 132]], '#9fb7c9');
    circle(g, 182, 152, 12, '#15181c');
    circle(g, 262, 152, 12, '#15181c');
    circle(g, 182, 152, 5, '#8e979e');
    circle(g, 262, 152, 5, '#8e979e');
    // Pedestal
    rr(g, 70, 54, 46, 104, 6, '#f6f7f8', '#c3c9ce', 1.2);
    rr(g, 78, 64, 30, 22, 3, '#1d2b44');
    rect(g, 82, 70, 22, 3, '#5cf2b0');
    g.beginPath();
    g.moveTo(108, 100);
    g.bezierCurveTo(140, 110, 130, 150, 160, 140);
    g.strokeStyle = '#15181c';
    g.lineWidth = 3;
    g.stroke();
    if (spec.logo) {
      circle(g, 34, 34, 18, '#161616');
      poly(g, [[37, 20], [26, 37], [33, 37], [30, 48], [42, 30], [35, 30]], '#ffd23f');
      label(g, 'OnlyChargeEV', 58, 40, { size: 15, color: '#161616' });
    }
  },

  // An open-wheel electric racecar, side on (portfolio red and blue).
  racecar(g) {
    rect(g, 0, 0, 300, 200, lin(g, 0, 0, 0, 200, [[0, '#dfe3e6'], [1, '#f4f5f5']]));
    rect(g, 0, 150, 300, 50, '#c7cbcf');
    for (let x = 0; x < 300; x += 24) rect(g, x, 150, 12, 4, (x / 24) % 2 ? '#161616' : '#f4f5f5');
    poly(g, [[40, 128], [80, 110], [150, 104], [210, 98], [262, 116], [270, 132], [44, 138]], '#c8302a');
    poly(g, [[150, 104], [210, 98], [236, 106], [160, 112]], '#2b4fb8');
    poly(g, [[60, 128], [110, 118], [130, 132], [60, 136]], '#2b4fb8');
    rect(g, 250, 78, 30, 6, '#161616');
    line(g, 262, 84, 258, 116, '#161616', 2.5);
    rect(g, 16, 120, 36, 5, '#161616');
    poly(g, [[150, 104], [168, 84], [184, 84], [182, 102]], '#161616');
    circle(g, 176, 86, 7, '#e8c22a');
    for (const x of [82, 236]) {
      circle(g, x, 138, 20, '#15181c');
      circle(g, x, 138, 9, '#8e979e');
    }
  },

  // A piano pedal with the assistive mechanism clamped on.
  piano(g) {
    rect(g, 0, 0, 300, 200, lin(g, 0, 0, 0, 200, [[0, '#3a2e26'], [1, '#1c1612']]));
    glow(g, 150, 40, 170, '#ffe2b8', 0.3);
    rect(g, 20, 20, 260, 60, '#120e0b');
    for (let i = 0; i < 18; i++) rect(g, 24 + i * 14.2, 60, 12.6, 40, '#f4f1ea');
    for (let i = 0; i < 18; i++) if ([1, 2, 4, 5, 6].includes(i % 7)) rect(g, 33 + i * 14.2, 60, 8, 24, '#120e0b');
    rect(g, 20, 100, 260, 6, '#2a211b');
    rect(g, 0, 172, 300, 28, '#2a211b');
    for (const x of [118, 150, 182]) poly(g, [[x - 8, 168], [x + 8, 168], [x + 12, 176], [x - 12, 176]], '#c9a227');
    // The device: an upright lever, a bracket and a spring on the right pedal
    rect(g, 178, 110, 8, 58, '#9aa3ab');
    rr(g, 166, 154, 34, 14, 3, '#5c646b');
    for (let k = 0; k < 6; k++) line(g, 170 + k * 5, 158, 174 + k * 5, 166, '#d9dee2', 1.4);
    rr(g, 172, 102, 22, 10, 3, '#2f63a8');
  },

  // A cast-resin light: a glowing block on a base. 1.0 rougher, 2.0 refined.
  resin(g, rnd, spec) {
    rect(g, 0, 0, 300, 200, lin(g, 0, 0, 0, 200, [[0, '#1d1a17'], [1, '#0d0b0a']]));
    const refined = spec.refined;
    glow(g, 150, 100, 140, '#ffb36b', refined ? 0.55 : 0.4);
    rect(g, 0, 160, 300, 40, lin(g, 0, 160, 0, 200, [[0, '#2b231d'], [1, '#14100d']]));
    rr(g, 112, 148, 76, 14, 3, refined ? '#3b2d22' : '#4a3a2c');
    g.save();
    g.beginPath();
    if (refined) g.roundRect(118, 48, 64, 100, 12);
    else {
      g.moveTo(116, 148);
      g.lineTo(120, 58);
      g.lineTo(150, 44);
      g.lineTo(184, 62);
      g.lineTo(182, 148);
      g.closePath();
    }
    g.clip();
    g.fillStyle = lin(g, 0, 44, 0, 150, [[0, refined ? '#ffe7c2' : '#f7c98f'], [1, refined ? '#ff9a4a' : '#d9773a']]);
    g.fillRect(100, 40, 100, 120);
    for (let i = 0; i < (refined ? 3 : 9); i++) {
      g.globalAlpha = refined ? 0.2 : 0.3;
      circle(g, 120 + rnd() * 60, 60 + rnd() * 80, 4 + rnd() * (refined ? 14 : 8), '#ffffff');
    }
    g.globalAlpha = 1;
    glow(g, 150, 110, 40, '#ffffff', 0.7);
    g.restore();
  },

  // An app screen: a window with the app's own layout. Real screenshots replace it.
  app(g, rnd, spec) {
    const a = spec.accent ?? '#3d7be8';
    rect(g, 0, 0, 300, 200, lin(g, 0, 0, 300, 200, [[0, '#1b1e23'], [1, '#0f1114']]));
    glow(g, 230, 40, 160, a, 0.22);
    rr(g, 24, 18, 252, 164, 8, '#f6f5f1');
    g.save();
    g.beginPath();
    g.roundRect(24, 18, 252, 164, 8);
    g.clip();
    rect(g, 24, 18, 252, 16, '#e7e3dc');
    circle(g, 34, 26, 2.6, '#ec6a5e');
    circle(g, 43, 26, 2.6, '#f4bf4f');
    circle(g, 52, 26, 2.6, '#61c554');
    label(g, spec.label, 36, 54, { size: 15, color: '#161616' });
    rect(g, 36, 60, 30, 2, a);
    const L = spec.layout;
    if (L === 'table') {
      for (let r = 0; r < 6; r++) {
        const y = 72 + r * 17;
        circle(g, 44, y + 6, 5, rgba(a, 0.6));
        rect(g, 56, y + 2, 70 + rnd() * 40, 4, '#c9c4ba');
        rect(g, 56, y + 8, 40 + rnd() * 30, 3, '#ded9cf');
        rr(g, 214, y + 1, 46, 10, 5, r % 3 === 0 ? a : '#e2ddd3');
      }
    } else if (L === 'doc') {
      rr(g, 40, 70, 120, 104, 3, '#ffffff', '#ded9cf');
      for (let r = 0; r < 9; r++) rect(g, 50, 82 + r * 10, r % 4 === 3 ? 60 : 96, 3, '#cfc9be');
      rect(g, 50, 160, 40, 6, a);
      rr(g, 176, 74, 84, 26, 4, rgba(a, 0.15));
      rr(g, 176, 106, 84, 26, 4, '#ebe7e0');
      rr(g, 176, 138, 84, 26, 4, '#ebe7e0');
    } else if (L === 'city') {
      rect(g, 24, 64, 252, 118, '#efe9dc');
      for (let i = 0; i < 26; i++) {
        const x = 40 + (i % 9) * 26 + rnd() * 6;
        const y = 76 + Math.floor(i / 9) * 32 + rnd() * 6;
        rect(g, x, y, 14 + rnd() * 6, 16 + rnd() * 8, '#fbf8f1');
        rect(g, x + 2, y + 2, 14, 2, 'rgb(0 0 0 / 0.08)');
      }
      for (const [x, y, r] of [[150, 124, 30], [180, 110, 16]]) {
        circle(g, x, y, r, rgba(a, 0.25), a, 1.2);
      }
    } else if (L === 'gradient') {
      const sw = [['#ff7a45', '#ffd23f'], ['#2de2e6', '#3d7be8'], ['#c43d7b', '#ffb36b'], ['#5cf2b0', '#1d2b44']];
      sw.forEach(([c0, c1], i) => rr(g, 36 + i * 60, 72, 52, 96, 6, lin(g, 0, 72, 0, 168, [[0, c0], [1, c1]])));
    } else if (L === 'segment') {
      rect(g, 36, 68, 228, 106, '#d9cfc0');
      poly(g, [[36, 68], [264, 68], [230, 98], [70, 98]], 'rgb(61 123 232 / 0.35)');
      poly(g, [[70, 98], [230, 98], [264, 174], [36, 174]], 'rgb(92 242 176 / 0.35)');
      rr(g, 100, 74, 44, 22, 2, 'rgb(255 210 63 / 0.6)', '#c9a227');
      rr(g, 190, 100, 24, 60, 2, 'rgb(196 61 123 / 0.45)', '#c43d7b');
      label(g, '412 sq ft · $2,180', 150, 168, { size: 9, color: '#161616', family: 'JetBrains Mono, monospace', align: 'center' });
    } else if (L === 'twin') {
      // An isometric factory floor: machines on a line, a conveyor, live status tags.
      rect(g, 24, 64, 252, 118, '#11161d');
      const iso = (x, y, z = 0) => [150 + (x - y) * 0.87 * 9, 92 + (x + y) * 0.5 * 9 - z * 9];
      for (let i = 0; i <= 10; i++) {
        line(g, ...iso(i, 0), ...iso(i, 10), 'rgb(255 255 255 / 0.07)', 0.6);
        line(g, ...iso(0, i), ...iso(10, i), 'rgb(255 255 255 / 0.07)', 0.6);
      }
      const box = (x, y, w, d, h, c) => {
        poly(g, [iso(x, y, h), iso(x + w, y, h), iso(x + w, y + d, h), iso(x, y + d, h)], rgba(c, 0.55), c, 0.8);
        poly(g, [iso(x, y + d, 0), iso(x + w, y + d, 0), iso(x + w, y + d, h), iso(x, y + d, h)], rgba(c, 0.3), c, 0.8);
        poly(g, [iso(x + w, y, 0), iso(x + w, y + d, 0), iso(x + w, y + d, h), iso(x + w, y, h)], rgba(c, 0.18), c, 0.8);
      };
      poly(g, [iso(1, 5.6), iso(9, 5.6), iso(9, 6.4), iso(1, 6.4)], 'rgb(255 255 255 / 0.12)');
      [[1.5, 3, 1.6, 2, 1.6], [4.2, 2.6, 1.4, 2.4, 2.4], [6.8, 3, 1.6, 2, 1.2]].forEach(([x, y, w, d, h]) => box(x, y, w, d, h, a));
      box(3.6, 7.2, 2.4, 1.6, 0.9, '#9aa7b6');
      [[2.3, 4, 1.6, '#61c554'], [4.9, 3.8, 2.4, '#61c554'], [7.6, 4, 1.2, '#f4bf4f']].forEach(([x, y, h, c]) => {
        const [px, py] = iso(x, y, h + 0.9);
        circle(g, px, py, 2.4, c);
        rr(g, px + 4, py - 5, 30, 9, 2, 'rgb(255 255 255 / 0.1)');
        rect(g, px + 7, py - 2, 16 + rnd() * 6, 2.4, 'rgb(255 255 255 / 0.5)');
      });
    } else if (L === 'terminal') {
      rect(g, 24, 64, 252, 118, '#0f1114');
      for (let r = 0; r < 8; r++) {
        rect(g, 36, 76 + r * 11, 8, 3, a);
        rect(g, 50, 76 + r * 11, 60 + rnd() * 90, 3, '#5e6b78');
      }
      g.beginPath();
      for (let i = 0; i <= 24; i++) g[i ? 'lineTo' : 'moveTo'](180 + i * 3.5, 90 + 70 * Math.exp(-i / 6) + rnd() * 3);
      g.strokeStyle = a;
      g.lineWidth = 1.4;
      g.stroke();
    }
    g.restore();
  },

  // A role or a school: a quiet badge. The org's real mark can replace it.
  badge(g, rnd, spec) {
    const a = spec.accent ?? '#2b5aa6';
    rect(g, 0, 0, 300, 200, lin(g, 0, 0, 300, 200, [[0, a], [1, '#0f1114']]));
    for (let i = 0; i < 12; i++) line(g, -40 + i * 32, 200, 60 + i * 32, 0, 'rgb(255 255 255 / 0.06)', 10);
    label(g, spec.label, 26, 120, { size: spec.label.length > 6 ? 42 : 58, weight: 700, color: '#ffffff' });
    label(g, spec.sub ?? '', 28, 152, { size: 15, weight: 500, color: 'rgb(255 255 255 / 0.75)', family: 'JetBrains Mono, monospace' });
  },

  // A place lived: a skyline and the city's name.
  // A place lived: a skyline for a city, roofs and trees for a town. Shown as a
  // map pin whose caption names it, so the picture carries no label.
  home(g, rnd, spec) {
    rect(g, 0, 0, 300, 200, lin(g, 0, 0, 0, 200, [[0, '#f2a36b'], [0.6, '#f6d6a8'], [1, '#2a2f5a']]));
    glow(g, 210, 110, 90, '#fff1d6', 0.8);
    if (spec.town) {
      for (let i = 0; i < 9; i++) {
        const x = i * 36 - 10 + rnd() * 8;
        const w = 26 + rnd() * 10;
        const h = 22 + rnd() * 14;
        if (rnd() < 0.45) circle(g, x + w / 2, 128 - rnd() * 16, 16 + rnd() * 10, '#22283a');
        rect(g, x, 150 - h, w, h + 50, '#1a1b2a');
        poly(g, [[x - 4, 150 - h], [x + w / 2, 150 - h - 16 - rnd() * 6], [x + w + 4, 150 - h]], '#1a1b2a');
        if (rnd() < 0.7) rect(g, x + w / 2 - 3, 150 - h * 0.6, 6, 6, 'rgb(255 214 150 / 0.9)');
      }
    } else {
      for (let i = 0; i < 16; i++) {
        const w = 12 + rnd() * 18;
        const x = (i * 300) / 15 - 8;
        const h = 30 + rnd() * 70;
        rect(g, x, 150 - h, w, h + 50, '#1a1b2a');
        for (let k = 0; k < 6; k++) if (rnd() < 0.5) rect(g, x + 3 + rnd() * (w - 6), 150 - h + rnd() * h, 1.6, 1.6, 'rgb(255 214 150 / 0.9)');
      }
    }
    rect(g, 0, 150, 300, 50, '#14152a');
  },
};

const all = { ...base, ...extra };

/** Draw artifact `a`'s placeholder picture into a new w × h canvas (3:2). */
export function drawArtifact(a, w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.scale(w / 300, h / 200);
  const spec = a.picture ?? { scene: a.id };
  const rnd = mulberry32(hashString(a.id));
  (all[spec.scene] ?? base.film)(g, rnd, spec);
  return c;
}

