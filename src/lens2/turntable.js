// About's 3D models turn on hover. Each one's tile carries a sprite of frames
// rendered from the model (a full turn); while the pointer is on the tile the
// building turns slowly and follows the pointer sideways, then settles back on
// its still when the pointer leaves. Plain 2D canvas: no WebGL in the field.
import { develop } from './render.js';

const SPIN = 24; // degrees per second while hovered
const SCRUB = 200; // degrees for a pointer sweep across the tile
const sprites = new Map();

function load(src) {
  if (!sprites.has(src)) {
    sprites.set(
      src,
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      }),
    );
  }
  return sprites.get(src);
}

/**
 * Give tile `t` a turntable from `spec` ({ src, frames, cols }). `active()`
 * says whether the field is in About and still.
 */
export function attachTurntable(t, spec, active) {
  const c = document.createElement('canvas');
  c.className = 'lx-tile__turn';
  c.hidden = true;
  t.el.querySelector('.lx-tile__pics').appendChild(c);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let sprite = null;
  let angle = 0;
  let hovering = false;
  let lastX = 0;
  let raf = 0;
  let last = 0;

  t.el.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch' || !active()) return;
    hovering = true;
    lastX = e.clientX;
    load(spec.src).then((img) => {
      sprite = img;
      if (sprite && hovering) start();
    });
  });
  t.el.addEventListener('pointermove', (e) => {
    if (!hovering) return;
    angle += ((e.clientX - lastX) / Math.max(1, t.el.clientWidth)) * SCRUB;
    lastX = e.clientX;
  });
  t.el.addEventListener('pointerleave', () => (hovering = false));

  function start() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    angle = 0;
    c.hidden = true;
  }

  function tick(now) {
    raf = 0;
    if (!active()) return stop();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (hovering) {
      if (!reduced) angle += SPIN * dt;
    } else {
      // Settle on the nearest full turn, then hand back to the still.
      const home = Math.round(angle / 360) * 360;
      angle += (home - angle) * (1 - Math.exp(-dt * 7));
      if (Math.abs(home - angle) < 0.6) return stop();
    }
    draw();
    raf = requestAnimationFrame(tick);
  }

  function draw() {
    const frame = t.el.querySelector('.lx-tile__frame');
    const w = Math.max(24, Math.round(frame.clientWidth * Math.min(2, devicePixelRatio || 1)));
    const h = Math.round(w / 1.5);
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    const n = spec.frames;
    const rows = Math.ceil(n / spec.cols);
    const fw = sprite.naturalWidth / spec.cols;
    const fh = sprite.naturalHeight / rows;
    const f = ((((angle % 360) + 360) % 360) / 360) * n;
    const i = Math.floor(f) % n;
    const g = c.getContext('2d', { willReadFrequently: true });
    const blit = (k) => g.drawImage(sprite, (k % spec.cols) * fw, Math.floor(k / spec.cols) * fh, fw, fh, 0, 0, w, h);
    blit(i);
    // Cross-fade into the next frame for a smooth turn between the 5° steps.
    g.globalAlpha = f - Math.floor(f);
    blit((i + 1) % n);
    g.globalAlpha = 1;
    develop(c, 'reality', t.it.id);
    c.hidden = false;
  }
}
