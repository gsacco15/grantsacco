// Geometry and physics for the liquid section switcher. The neck between two
// pills is the tangent-arc construction from uselayouts' Gooey Navbar; the
// difference here is that the neck height is passed in directly, so a closed
// gap can be a full-height join and an open one a pinched neck.

const n = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : 0);

/** Rounded-rect outline as an SVG path. r = { x, y, w, h }. */
export function pillPath({ x, y, w, h }, radius) {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  return (
    `M${n(x)} ${n(y + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)}` +
    `L${n(x + w - r)} ${n(y)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w)} ${n(y + r)}` +
    `L${n(x + w)} ${n(y + h - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w - r)} ${n(y + h)}` +
    `L${n(x + r)} ${n(y + h)}A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y + h - r)}Z`
  );
}

/**
 * Liquid neck joining pill `a` to pill `b` (b to the right, same height).
 * Two arcs, each tangent to both pills' corner circles, meet the facing
 * corners; `half` is the neck's half-height at its narrowest point.
 */
export function neckPath(a, b, radius, half) {
  const H = a.h;
  const mid = a.y + H / 2;
  const s = Math.min(radius, H / 2, a.w / 2, b.w / 2);
  if (s <= 0) return '';
  const c = a.x + a.w;
  const u = b.x - c;
  if (u < 0) return '';
  const d = Math.min(half, H / 2 - 0.5);
  const f = u / 2 + s;
  const p = d - H / 2 + s;
  const m = 2 * (p - s);
  if (Math.abs(m) < 1e-4) return '';
  const h = (s * s - f * f - p * p) / m;
  if (!(h > 0) || s + h < f) return '';
  const g = Math.sqrt(Math.max(0, (s + h) * (s + h) - f * f));
  const cx = (c + b.x) / 2;
  const vx = c - s;
  const vy = a.y + s;
  const ex = cx - vx;
  const ey = -g;
  const hyp = Math.hypot(ex, ey) || 1;
  const tx = vx + (s * ex) / hyp;
  const ty = vy + (s * ey) / hyp;
  const tx2 = 2 * cx - tx;
  return (
    `M${n(tx)} ${n(ty)}A${n(h)} ${n(h)} 0 0 0 ${n(tx2)} ${n(ty)}` +
    `L${n(tx2)} ${n(2 * mid - ty)}A${n(h)} ${n(h)} 0 0 0 ${n(tx)} ${n(2 * mid - ty)}Z`
  );
}

/** Damped spring on { x, v }. Returns true while still moving. */
export function spring(s, target, k, c, dt) {
  const a = -k * (s.x - target) - c * s.v;
  s.v += a * dt;
  s.x += s.v * dt;
  if (Math.abs(s.x - target) < 0.002 && Math.abs(s.v) < 0.02) {
    s.x = target;
    s.v = 0;
    return false;
  }
  return true;
}
