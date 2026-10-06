// Geometry for the twenty-plate object: one shared plate mesh, the icosahedron
// it closes into (vertices at the poles, so it doubles as a globe), the flat
// icosahedral net it unfolds into (with a hinge tree for true unfolding), and
// the other formations the same plates rebuild into.
import * as THREE from 'three';
import { latLonToVec3 } from '../shared/geo.js';

export const N = 20;
export const EDGE = 1;
export const TRI_H = (Math.sqrt(3) / 2) * EDGE;
export const RC = EDGE / Math.sqrt(3); // circumradius of a face
export const RI = RC / 2; // inradius of a face
export const THICK = 0.05;
export const GAP = 0.022; // inset from the ideal triangle, so neighbours never touch
export const FLOOR = -1.3;
const BEVEL = 0.009;
const CORNER = 0.03;
const DEG = Math.PI / 180;

// Seam longitude of the net, chosen by scanning for the fewest land cuts that
// keep the travel pins intact (Americas and Western Europe stay whole).
export const NET_LON0 = -125;

/* ── Plate mesh ─────────────────────────────────────────────────────────── */

/** Points of a rounded equilateral triangle with the given inradius (CCW, v0 up). */
function roundedTri(inradius, corner, seg) {
  const pts = [];
  const cr = 2 * (inradius - corner);
  for (const a of [90, 210, 330]) {
    const cx = cr * Math.cos(a * DEG);
    const cy = cr * Math.sin(a * DEG);
    for (let s = 0; s <= seg; s++) {
      const t = (a - 60 + (120 * s) / seg) * DEG;
      pts.push(new THREE.Vector2(cx + corner * Math.cos(t), cy + corner * Math.sin(t)));
    }
  }
  return pts;
}

/** A thin bevelled triangular plate. Local frame: centroid at origin, top face at z = +THICK/2. */
export function makePlateGeometry() {
  const shape = new THREE.Shape(roundedTri(RI - GAP - BEVEL, CORNER, 5));
  const depth = THICK - 2 * BEVEL;
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelSegments: 2,
    curveSegments: 5,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

/** Crisp outlines of the top and bottom faces, for the drafting view. */
export function makeOutlineGeometry() {
  const pts = roundedTri(RI - GAP - BEVEL * 0.3, CORNER, 4);
  const pos = [];
  for (const z of [THICK / 2 + 0.002, -THICK / 2 - 0.002]) {
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      pos.push(a.x, a.y, z, b.x, b.y, z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

/* ── Frames ─────────────────────────────────────────────────────────────── */

const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _g = new THREE.Vector3();
const _m = new THREE.Matrix4();

/**
 * Pose (position + quaternion) that maps the canonical plate onto triangle
 * ABC (CCW seen from the side the top face should face). The plate's top face
 * lies on the triangle's plane.
 */
export function poseFromTri(A, B, C, outPos, outQuat) {
  _g.copy(A).add(B).add(C).multiplyScalar(1 / 3);
  _y.copy(A).sub(_g).normalize();
  _z.copy(B).sub(A).cross(_x.copy(C).sub(A)).normalize();
  _x.copy(_y).cross(_z);
  _m.makeBasis(_x, _y, _z);
  outQuat.setFromRotationMatrix(_m);
  outPos.copy(_g).addScaledVector(_z, -THICK / 2);
}

/** Plate frame that keeps the plate in a plane given by two in-plane axes, rotated by `spin` about its normal. */
export function poseInPlane(center, axisX, axisY, spin, outPos, outQuat) {
  _z.copy(axisX).cross(axisY).normalize();
  _x.copy(axisX).multiplyScalar(Math.cos(spin)).addScaledVector(axisY, Math.sin(spin));
  _y.copy(_z).cross(_x);
  _m.makeBasis(_x, _y, _z);
  outQuat.setFromRotationMatrix(_m);
  outPos.copy(center);
}

/* ── Icosahedron + net ──────────────────────────────────────────────────── */

export function buildIco() {
  const R = (EDGE / 4) * Math.sqrt(10 + 2 * Math.sqrt(5));
  const lat = Math.atan(0.5) / DEG;
  const V = [latLonToVec3(90, 0, R)];
  for (let i = 0; i < 5; i++) V.push(latLonToVec3(lat, NET_LON0 + 72 * i, R));
  for (let i = 0; i < 5; i++) V.push(latLonToVec3(-lat, NET_LON0 + 36 + 72 * i, R));
  V.push(latLonToVec3(-90, 0, R));
  const verts = V.map((p) => new THREE.Vector3(...p));

  // Faces carry their vertex ids and their 2D spot in the classic net:
  // 5 caps around the north pole, a 10-triangle strip, 5 caps around the south.
  const U = (i) => 1 + (i % 5);
  const L = (i) => 6 + (i % 5);
  const n2 = (x, y) => new THREE.Vector2(x * EDGE, y * TRI_H);
  const faces = [];
  for (let i = 0; i < 5; i++) faces.push({ v: [0, U(i), U(i + 1)], net: [n2(i + 0.5, 1), n2(i, 0), n2(i + 1, 0)] });
  for (let i = 0; i < 5; i++) faces.push({ v: [U(i), L(i), U(i + 1)], net: [n2(i, 0), n2(i + 0.5, -1), n2(i + 1, 0)] });
  for (let i = 0; i < 5; i++)
    faces.push({ v: [L(i), L(i + 1), U(i + 1)], net: [n2(i + 0.5, -1), n2(i + 1.5, -1), n2(i + 1, 0)] });
  for (let i = 0; i < 5; i++)
    faces.push({ v: [11, L(i + 1), L(i)], net: [n2(i + 1, -2), n2(i + 1.5, -1), n2(i + 0.5, -1)] });

  const netCenter = new THREE.Vector2(2.75 * EDGE, -0.5 * TRI_H);
  faces.forEach((f, i) => {
    f.index = i;
    const [A, B, C] = f.v.map((k) => verts[k]);
    f.centroid = A.clone().add(B).add(C).multiplyScalar(1 / 3);
    f.normal = B.clone().sub(A).cross(C.clone().sub(A)).normalize();
    if (f.normal.dot(f.centroid) < 0) throw new Error('ico face winding');
    f.axisY = A.clone().sub(f.centroid).normalize();
    f.axisX = f.axisY.clone().cross(f.normal);
    f.closedPos = new THREE.Vector3();
    f.closedQuat = new THREE.Quaternion();
    poseFromTri(A, B, C, f.closedPos, f.closedQuat);
    f.closedMatrix = new THREE.Matrix4().compose(f.closedPos, f.closedQuat, new THREE.Vector3(1, 1, 1));
    // Net pose: in the world XY plane, facing +Z, centred on the origin.
    const P = f.net.map((p) => new THREE.Vector3(p.x - netCenter.x, p.y - netCenter.y, 0));
    f.netPos = new THREE.Vector3();
    f.netQuat = new THREE.Quaternion();
    poseFromTri(P[0], P[1], P[2], f.netPos, f.netQuat);
    f.netCentroid2 = new THREE.Vector2((P[0].x + P[1].x + P[2].x) / 3, (P[0].y + P[1].y + P[2].y) / 3);
  });

  const tree = buildHingeTree(faces, verts, 7);
  return { R, verts, faces, tree, netSize: new THREE.Vector2(5.5 * EDGE, 3 * TRI_H) };
}

/**
 * Hinge tree over the net's shared edges (19 hinges for 20 faces). Each
 * non-root face rotates about the edge it shares with its parent; folding the
 * angles to zero closes the icosahedron, opening them lays out the net.
 */
function buildHingeTree(faces, verts, root) {
  const key = (p) => `${Math.round(p.x * 1000)},${Math.round(p.y * 1000)}`;
  const shared = (a, b) => {
    const ka = a.net.map(key);
    const out = [];
    b.net.forEach((p, j) => {
      const i = ka.indexOf(key(p));
      if (i >= 0) out.push([a.v[i], b.v[j]]);
    });
    return out;
  };
  const parent = new Array(faces.length).fill(-1);
  const depth = new Array(faces.length).fill(0);
  const hinge = new Array(faces.length).fill(null);
  const order = [root];
  const seen = new Set([root]);
  for (let q = 0; q < order.length; q++) {
    const p = faces[order[q]];
    for (const f of faces) {
      if (seen.has(f.index)) continue;
      const s = shared(p, f);
      if (s.length !== 2) continue;
      seen.add(f.index);
      order.push(f.index);
      parent[f.index] = p.index;
      depth[f.index] = depth[p.index] + 1;
      const A = verts[s[0][0]];
      const B = verts[s[1][0]];
      const axis = B.clone().sub(A).normalize();
      const angle = Math.acos(THREE.MathUtils.clamp(f.normal.dot(p.normal), -1, 1));
      // Pick the sign that brings this face's normal onto its parent's.
      const test = f.normal.clone().applyAxisAngle(axis, angle);
      const sign = test.dot(p.normal) > 0.999 ? 1 : -1;
      hinge[f.index] = { point: A.clone(), axis, angle: sign * angle };
    }
  }
  const maxDepth = Math.max(...depth);
  return { root, parent, depth, hinge, order, maxDepth };
}

const _rot = new THREE.Matrix4();
const _t1 = new THREE.Matrix4();
const _t2 = new THREE.Matrix4();

/**
 * Hinge kinematics: fills `out[i]` (Matrix4, ico space) with the transform of
 * each face for per-face unfold amounts u[i] ∈ [0, 1] (0 closed, 1 flat).
 */
export function unfoldMatrices(ico, u, out) {
  const { order, parent, hinge } = ico.tree;
  for (const i of order) {
    const p = parent[i];
    if (p < 0) {
      out[i].identity();
      continue;
    }
    const h = hinge[i];
    _rot.makeRotationAxis(h.axis, h.angle * u[i]);
    _t1.makeTranslation(h.point.x, h.point.y, h.point.z);
    _t2.makeTranslation(-h.point.x, -h.point.y, -h.point.z);
    out[i].copy(out[p]).multiply(_t1).multiply(_rot).multiply(_t2);
  }
  return out;
}

/** Which face a lat/lon falls on, and where on that plate (local coords, top face). */
export function locateOnIco(ico, lat, lon) {
  const d = new THREE.Vector3(...latLonToVec3(lat, lon, 1));
  for (const f of ico.faces) {
    const nd = f.normal.dot(d);
    if (nd <= 0) continue;
    const q = d.clone().multiplyScalar(f.normal.dot(f.centroid) / nd);
    const [A, B, C] = f.v.map((k) => ico.verts[k]);
    // Inside test via same-side cross products.
    const inside = [
      [A, B],
      [B, C],
      [C, A],
    ].every(([p0, p1]) => p1.clone().sub(p0).cross(q.clone().sub(p0)).dot(f.normal) >= -1e-9);
    if (!inside) continue;
    const rel = q.sub(f.centroid);
    return { face: f.index, local: new THREE.Vector3(rel.dot(f.axisX), rel.dot(f.axisY), THICK / 2) };
  }
  return null;
}

/* ── Strips: the building block of every other formation ───────────────── */

/**
 * A straight strip of n triangles along +x starting at the origin; the first
 * triangle points up (or down when startDown). Returns [{x, y, rot}] centroids
 * in strip coordinates with the plate's in-plane rotation.
 */
export function strip(n, startDown = false) {
  const out = [];
  for (let j = 0; j < n; j++) {
    const down = (j % 2 === 0) === startDown;
    const x = startDown ? ((j + 1) * EDGE) / 2 : (j * EDGE) / 2 + EDGE / 2;
    out.push({ x, y: down ? (2 * TRI_H) / 3 : TRI_H / 3, rot: down ? Math.PI : 0 });
  }
  return out;
}

/** Transform strip slots by a 2D rotation + translation. */
export function place2D(slots, angle, ox, oy) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return slots.map((p) => ({ x: ox + c * p.x - s * p.y, y: oy + s * p.x + c * p.y, rot: p.rot + angle }));
}

/** World-space corners of a plate pose (top face), for bounds. */
const CANON = [new THREE.Vector3(0, RC, 0), new THREE.Vector3(-EDGE / 2, -RI, 0), new THREE.Vector3(EDGE / 2, -RI, 0)];
export function plateCorners(pos, quat, out, offset = 0) {
  for (let k = 0; k < 3; k++) out[offset + k].copy(CANON[k]).applyQuaternion(quat).add(pos);
}

/* ── Formations ─────────────────────────────────────────────────────────── */

const XY_X = new THREE.Vector3(1, 0, 0);
const XY_Y = new THREE.Vector3(0, 1, 0);

/** Segmental arch: 19 voussoirs bent from a strip (flat joints at both springers) + one fallen spare. */
export function archSlots() {
  const s = strip(19, true);
  const xMid = (s[0].x + s[18].x) / 2;
  const rRef = (xMid - s[0].x) / (Math.PI / 3);
  const rIn = rRef - TRI_H / 2;
  const slots = s.map((p) => {
    const phi = Math.PI / 2 + (xMid - p.x) / rRef;
    const r = rIn + p.y;
    return { x: r * Math.cos(phi), y: r * Math.sin(phi), rot: p.rot + phi - Math.PI / 2 };
  });
  // Rest the springers on the floor.
  let minY = Infinity;
  const tmp = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  for (const sl of slots) {
    q.setFromAxisAngle(_z.set(0, 0, 1), sl.rot);
    plateCorners(pos.set(sl.x, sl.y, 0), q, tmp);
    for (const t of tmp) minY = Math.min(minY, t.y);
  }
  const lift = FLOOR + GAP * 2 - minY;
  return slots.map((sl) => {
    const P = new THREE.Vector3(sl.x, sl.y + lift, 0);
    const Q = new THREE.Quaternion();
    poseInPlane(P, XY_X, XY_Y, sl.rot, P, Q);
    return { pos: P, quat: Q };
  });
}

export function archSpare() {
  const P = new THREE.Vector3(3.9, FLOOR + THICK / 2, -1.1);
  const Q = new THREE.Quaternion();
  poseInPlane(P, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), 0.5, P, Q);
  return { pos: P, quat: Q };
}

/**
 * Articulated robot arm in the XY plane: a 4-plate pedestal, two 6-plate
 * links, a 2-plate wrist and a 2-plate gripper. `sway` moves the joints.
 */
export function robotSlots(sway = 0) {
  const base = [
    { x: 0.5, y: TRI_H / 3, rot: 0 },
    { x: 1.5, y: TRI_H / 3, rot: 0 },
    { x: 1.0, y: (2 * TRI_H) / 3, rot: Math.PI },
    { x: 1.0, y: TRI_H + TRI_H / 3, rot: 0 },
  ].map((p) => ({ ...p, x: p.x - 1 }));
  const a1 = (66 + sway * 5) * DEG;
  const a2 = (-14 - sway * 7) * DEG;
  const a3 = (-80 + sway * 6) * DEG;
  // Shoulder sits just above the pedestal apex.
  const sx = -0.42;
  const sy = 2 * TRI_H + 0.08;
  const upper = place2D(strip(6), a1, sx, sy);
  const ex = sx + Math.cos(a1) * 3.5 * EDGE - Math.sin(a1) * TRI_H * 0.5;
  const ey = sy + Math.sin(a1) * 3.5 * EDGE + Math.cos(a1) * TRI_H * 0.5;
  const fore = place2D(strip(6), a2, ex + 0.05, ey - TRI_H * 0.55);
  const wx = ex + 0.05 + Math.cos(a2) * 3.5 * EDGE;
  const wy = ey - TRI_H * 0.55 + Math.sin(a2) * 3.5 * EDGE;
  const wrist = place2D(strip(2), a3, wx - 0.1, wy + 0.15);
  const tx = wx - 0.1 + Math.cos(a3) * 1.5 * EDGE - Math.sin(a3) * TRI_H * 0.5;
  const ty = wy + 0.15 + Math.sin(a3) * 1.5 * EDGE + Math.cos(a3) * TRI_H * 0.5;
  const grip = 0.32 + 0.06 * sway;
  const fingers = [-1, 1].map((sgn) => {
    const ox = tx + Math.cos(a3 + Math.PI / 2) * grip * sgn;
    const oy = ty + Math.sin(a3 + Math.PI / 2) * grip * sgn;
    const along = 0.42;
    return { x: ox + Math.cos(a3) * along, y: oy + Math.sin(a3) * along, rot: a3 + Math.PI / 2 + Math.PI };
  });
  const all = [...base, ...upper, ...fore, ...wrist, ...fingers];
  return all.map((sl) => {
    const P = new THREE.Vector3(sl.x - 1.2, sl.y + FLOOR + GAP * 2, 0);
    const Q = new THREE.Quaternion();
    poseInPlane(P, XY_X, XY_Y, sl.rot, P, Q);
    return { pos: P, quat: Q };
  });
}

/** Workbench: a 12-plate top (two rows) on two splayed 4-plate trestles. */
export function benchSlots() {
  const legH = 2 * TRI_H;
  const foot = FLOOR + GAP * 2;
  const topY = foot + legH + THICK / 2 + 0.035;
  const rowA = strip(6);
  const rowB = strip(6, true).map((p) => ({ ...p, y: p.y + TRI_H }));
  const top = [...rowA, ...rowB].map((p) => {
    const P = new THREE.Vector3(p.x - 1.75, topY, -(p.y - TRI_H));
    const Q = new THREE.Quaternion();
    poseInPlane(P, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), p.rot, P, Q);
    return { pos: P, quat: Q };
  });
  // Trestles: 4-plate strips turned 60° so both ends sit flat (feet splay outward).
  const left = place2D(strip(4, true), Math.PI / 3, -1.85, foot - TRI_H / 2);
  const right = place2D(strip(4), (2 * Math.PI) / 3, 2.6, foot);
  const legs = [...left, ...right].map((sl) => {
    const P = new THREE.Vector3(sl.x, sl.y, 0);
    const Q = new THREE.Quaternion();
    poseInPlane(P, XY_X, XY_Y, sl.rot, P, Q);
    return { pos: P, quat: Q };
  });
  return [...top, ...legs];
}

/** Sculpture: a twisting column of horizontal plates, each course turned and fanned. */
export function helixSlots(t = 0) {
  const out = [];
  for (let k = 0; k < N; k++) {
    const f = k / (N - 1);
    const turn = k * 15 * DEG + t;
    const r = 0.16 + 0.1 * Math.sin(f * Math.PI);
    const P = new THREE.Vector3(Math.cos(turn) * r, FLOOR + 0.09 + k * 0.152, Math.sin(turn) * r);
    // Horizontal plate, turned about the column axis, tilted outward a touch.
    const tilt = (10 + 14 * Math.sin(f * Math.PI)) * DEG;
    const Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const turnQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -turn);
    const tiltQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(Math.sin(turn), 0, -Math.cos(turn)), tilt);
    Q.premultiply(turnQ).premultiply(tiltQ);
    out.push({ pos: P, quat: Q });
  }
  return out;
}

/** Screen: two rows of ten tiling a 5 × 2 rhombic parallelogram, centred on the origin. */
export function screenSlots() {
  const rows = [strip(10), strip(10).map((p) => ({ ...p, x: p.x + EDGE / 2, y: p.y + TRI_H }))];
  const size = new THREE.Vector2(6 * EDGE, 2 * TRI_H);
  const slots = [];
  for (const row of rows) {
    for (const p of row) {
      const P = new THREE.Vector3(p.x - size.x / 2, p.y - size.y / 2, 0);
      const Q = new THREE.Quaternion();
      poseInPlane(P, XY_X, XY_Y, p.rot, P, Q);
      slots.push({ pos: P, quat: Q, screen: { x: p.x, y: p.y, rot: p.rot } });
    }
  }
  return { slots, size };
}
