// Small, interruption-safe tween primitives. Every animated value tweens from
// wherever it currently is, so switching modes mid-transition never pops.

export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export const ease = {
  linear: (t) => t,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
};

const copy = (v) => (Array.isArray(v) ? v.slice() : v);

export class Tween {
  constructor(value, easing = ease.inOutCubic) {
    this.value = copy(value);
    this.from = copy(value);
    this.to = copy(value);
    this.start = 0;
    this.dur = 0;
    this.ease = easing;
    this.t = 1;
  }

  set(to, now, dur = 1, delay = 0, easing) {
    this.from = copy(this.value);
    this.to = copy(to);
    this.start = now + delay;
    this.dur = dur;
    if (easing) this.ease = easing;
    this.t = dur > 0 ? 0 : 1;
    if (dur <= 0) this.value = copy(to);
  }

  jump(to) {
    this.value = copy(to);
    this.from = copy(to);
    this.to = copy(to);
    this.t = 1;
  }

  get active() {
    return this.t < 1;
  }

  update(now) {
    if (this.t >= 1) return this.value;
    const raw = this.dur > 0 ? clamp((now - this.start) / this.dur) : 1;
    this.t = raw;
    const k = this.ease(raw);
    if (Array.isArray(this.value)) {
      for (let i = 0; i < this.value.length; i++) this.value[i] = lerp(this.from[i], this.to[i], k);
    } else {
      this.value = lerp(this.from, this.to, k);
    }
    return this.value;
  }
}

export function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function rgbToCss(c, a = 1) {
  const r = Math.round(c[0] * 255);
  const g = Math.round(c[1] * 255);
  const b = Math.round(c[2] * 255);
  return a === 1 ? `rgb(${r} ${g} ${b})` : `rgb(${r} ${g} ${b} / ${a})`;
}

// Deterministic pseudo-random for stable layouts.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
