// Canvas textures: the laptop screen, the floating "system" windows, and the
// dotted world map that the tabletop becomes in Place mode.
import * as THREE from 'three';
import { mulberry32, hashString } from '../anim.js';

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** The laptop screen: a calm little portfolio UI. */
export function screenTexture() {
  return canvasTexture(1024, 640, (g, w, h) => {
    g.fillStyle = '#f3f1ec';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#1d1b18';
    g.font = '600 46px Inter, sans-serif';
    g.fillText('Grant Sacco', 64, 120);
    g.font = 'italic 40px "Instrument Serif", Georgia, serif';
    g.fillStyle = '#c2552d';
    g.fillText('Same person. Different lens.', 64, 176);
    const rnd = mulberry32(7);
    for (let i = 0; i < 6; i++) {
      const x = 64 + (i % 3) * 300;
      const y = 250 + Math.floor(i / 3) * 190;
      g.fillStyle = `hsl(${20 + rnd() * 30}, 30%, ${70 + rnd() * 15}%)`;
      g.fillRect(x, y, 270, 150);
      g.fillStyle = 'rgba(29,27,24,0.55)';
      g.fillRect(x, y + 160, 140, 8);
    }
  });
}

/** A floating window for Digital mode. */
export function panelTexture(title, subtitle, seed) {
  const rnd = mulberry32(hashString(seed));
  return canvasTexture(640, 400, (g, w, h) => {
    g.fillStyle = 'rgba(4,10,7,0.92)';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#5cf2b0';
    g.lineWidth = 3;
    g.strokeRect(1.5, 1.5, w - 3, h - 3);
    g.fillStyle = 'rgba(92,242,176,0.14)';
    g.fillRect(0, 0, w, 46);
    g.fillStyle = '#5cf2b0';
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.arc(24 + i * 22, 23, 6, 0, Math.PI * 2);
      g.fill();
    }
    g.font = '500 22px "JetBrains Mono", monospace';
    g.fillText(title, 100, 31);
    g.fillStyle = 'rgba(201,247,223,0.75)';
    g.font = '400 18px "JetBrains Mono", monospace';
    g.fillText(subtitle, 26, 86);
    // Content: alternating text lines, a sparkline and a node cluster.
    g.fillStyle = 'rgba(201,247,223,0.35)';
    for (let i = 0; i < 5; i++) g.fillRect(26, 118 + i * 26, 120 + rnd() * 200, 9);
    g.strokeStyle = '#5cf2b0';
    g.lineWidth = 2.5;
    g.beginPath();
    let y = 320;
    for (let x = 26; x < 380; x += 18) {
      y = Math.max(250, Math.min(370, y + (rnd() - 0.5) * 50));
      if (x === 26) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    const nodes = Array.from({ length: 6 }, () => [430 + rnd() * 180, 110 + rnd() * 260]);
    g.strokeStyle = 'rgba(92,242,176,0.5)';
    g.lineWidth = 1.5;
    nodes.forEach((a, i) => {
      const b = nodes[(i + 1) % nodes.length];
      g.beginPath();
      g.moveTo(a[0], a[1]);
      g.lineTo(b[0], b[1]);
      g.stroke();
    });
    g.fillStyle = '#5cf2b0';
    nodes.forEach(([x, yy]) => g.fillRect(x - 5, yy - 5, 10, 10));
  });
}

/** Dotted world map, equirectangular, for the tabletop in Place mode. */
export function mapTexture(isLand) {
  return canvasTexture(2048, 1024, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    // Graticule
    g.strokeStyle = 'rgba(125,141,166,0.35)';
    g.lineWidth = 1.5;
    g.setLineDash([6, 8]);
    for (let lon = -150; lon <= 150; lon += 30) {
      const x = ((lon + 180) / 360) * w;
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const y = ((90 - lat) / 180) * h;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
    g.setLineDash([]);
    // Land as halftone dots
    const step = 9;
    g.fillStyle = 'rgba(205,220,240,0.9)';
    for (let y = step / 2; y < h; y += step) {
      const lat = 90 - (y / h) * 180;
      for (let x = step / 2; x < w; x += step) {
        const lon = (x / w) * 360 - 180;
        if (isLand(lat, lon)) {
          g.beginPath();
          g.arc(x, y, 2.6, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
  });
}
