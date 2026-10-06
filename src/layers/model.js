// A 35 mm rangefinder camera, modelled procedurally from primitives.
// Units: 1 = 10 mm. Body centred on the origin, lens pointing +Z, top plate +Y.
// Returns the exterior (shell) and internal (structure) meshes separately so
// each can live on its own layer, plus named anchor points for annotations.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { filmStrip } from './photos.js';

export const DIM = {
  W: 13.8, // body width  (138 mm)
  D: 3.3, // body depth  (33 mm)
  R: 1.55, // plan radius of the rounded ends
  Y0: -3.85, // bottom
  YB: -3.45, // top of base plate
  YT: 2.25, // bottom of top plate
  Y1: 3.85, // top of top plate (77 mm overall)
  ZF: 1.65, // front face
  LX: 0.35, // lens axis
  LY: -0.6,
  FILM: -1.13, // film plane: flange focal distance 27.80 mm behind the mount
  LENS_R: 2.6, // focus ring radius (Ø52)
  LENS_FRONT: 4.7,
};

const { W, D, R, Y0, YB, YT, Y1, ZF, LX, LY, FILM } = DIM;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ── Geometry helpers ────────────────────────────────────────────────────── */

function stadiumShape(w, d, r) {
  const s = new THREE.Shape();
  const x = w / 2 - r;
  const y = d / 2 - r;
  s.moveTo(-x, -d / 2);
  s.lineTo(x, -d / 2);
  s.absarc(x, -y, r, -Math.PI / 2, 0, false);
  s.lineTo(w / 2, y);
  s.absarc(x, y, r, 0, Math.PI / 2, false);
  s.lineTo(-x, d / 2);
  s.absarc(-x, y, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-w / 2, -y);
  s.absarc(-x, -y, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

/** Stadium slab between y0 and y1 with a rounded (bevelled) edge of size b. */
function slab(w, d, r, y0, y1, b) {
  const shape = stadiumShape(w - 2 * b, d - 2 * b, r - b);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: y1 - y0 - 2 * b,
    bevelEnabled: b > 0,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 4,
    curveSegments: 14,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0 + b, 0);
  // outline loops where the flat caps meet the rounded edge (CAD tangent edges)
  const pts = shape.getPoints(14);
  const loops = [y0, y1].map((y) => pts.map((p) => V(p.x, y, -p.y)));
  return { g, loops };
}

/** Cylinder along Y centred on its middle. */
const cyl = (rt, rb, h, seg = 48, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);

/** Turn a Y-axis geometry into one along +Z spanning z0 → z1 at (x, y). */
function alongZ(g, x, y, z0, z1) {
  g.rotateX(Math.PI / 2);
  g.translate(x, y, (z0 + z1) / 2);
  return g;
}

/** Knurled / scalloped ring: a cylinder whose rim alternates in and out. */
function ribbed(r, h, ribs, depth) {
  const seg = ribs * 4;
  const g = new THREE.CylinderGeometry(r, r, h, seg, 1, false);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const rad = Math.hypot(x, z);
    if (rad < 1e-4) continue;
    const a = Math.atan2(x, z);
    const k = ((Math.round(((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * seg) % 4) + 4) % 4;
    const nr = k < 2 ? r : r - depth;
    p.setX(i, (x / rad) * nr);
    p.setZ(i, (z / rad) * nr);
  }
  const flat = g.toNonIndexed();
  flat.computeVertexNormals();
  return flat;
}

/** Spur gear lying flat (axis Y), with a bore and lightening holes. */
function gear(r, teeth, thick = 0.12) {
  const s = new THREE.Shape();
  const h = Math.min(0.12, r * 0.18);
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts = [
      [a, r - h],
      [a + step * 0.18, r + h * 0.6],
      [a + step * 0.42, r + h * 0.6],
      [a + step * 0.6, r - h],
    ];
    pts.forEach(([ang, rad], j) => {
      const x = Math.cos(ang) * rad;
      const y = Math.sin(ang) * rad;
      if (i === 0 && j === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    });
  }
  s.closePath();
  const bore = new THREE.Path();
  bore.absarc(0, 0, Math.max(0.07, r * 0.16), 0, Math.PI * 2, true);
  s.holes.push(bore);
  if (r > 0.6) {
    for (let k = 0; k < 4; k++) {
      const hole = new THREE.Path();
      const a = (k / 4) * Math.PI * 2 + 0.4;
      hole.absarc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.17, 0, Math.PI * 2, true);
      s.holes.push(hole);
    }
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false, curveSegments: 8 });
  g.rotateX(-Math.PI / 2);
  return g;
}

/** A simple biconvex lens element, axis Z, centred at z. */
function lensElement(r, t, sag1, sag2) {
  const pts = [];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    pts.push(new THREE.Vector2(u * r, -t / 2 - sag2 * (1 - u * u)));
  }
  for (let i = n; i >= 0; i--) {
    const u = i / n;
    pts.push(new THREE.Vector2(u * r, t / 2 + sag1 * (1 - u * u)));
  }
  return new THREE.LatheGeometry(pts, 48);
}

/* ── Build ───────────────────────────────────────────────────────────────── */

export function buildCamera(M) {
  const root = new THREE.Group();
  const shell = [];
  const structure = [];
  const loops = []; // custom outline loops for the edges layer

  function add(list, geo, mat, { pos, rot, edges = 'auto', proxy, shadow = true } = {}) {
    const mesh = new THREE.Mesh(geo, mat);
    if (pos) mesh.position.copy(pos);
    if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
    mesh.userData.edges = edges;
    if (proxy) mesh.userData.edgeProxy = proxy;
    if (list === shell && shadow) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    list.push(mesh);
    root.add(mesh);
    return mesh;
  }
  const S = (geo, mat, o) => add(shell, geo, mat, o);
  const I = (geo, mat, o) => add(structure, geo, mat, o);

  /* Body: base plate, leatherette body, top plate */
  const base = slab(W, D, R, Y0, YB, 0.1);
  S(base.g, M.chrome, { edges: 'none' });
  loops.push(...base.loops);
  const body = slab(W - 0.12, D - 0.12, R - 0.06, YB, YT, 0.03);
  S(body.g, M.leather, { edges: 'none' });
  const top = slab(W, D, R, YT, Y1, 0.16);
  S(top.g, M.chrome, { edges: 'none' });
  loops.push(...top.loops);

  /* Front windows on the top plate */
  const wy = 3.05;
  const windows = [
    { x: -4.45, w: 1.1, h: 0.72, mat: M.glass },
    { x: -1.4, w: 1.5, h: 0.66, mat: M.frosted },
    { x: 3.55, w: 2.2, h: 0.95, mat: M.glass },
  ];
  for (const win of windows) {
    S(new RoundedBoxGeometry(win.w + 0.18, win.h + 0.18, 0.1, 2, 0.04), M.satin, { pos: V(win.x, wy, ZF + 0.01) });
    S(new THREE.BoxGeometry(win.w, win.h, 0.04), win.mat, { pos: V(win.x, wy, ZF + 0.045), edges: 'none' });
  }

  /* Shutter-speed dial */
  const dial = V(-3.3, Y1, 0.3);
  S(cyl(0.98, 0.98, 0.08), M.chrome, { pos: V(dial.x, Y1 + 0.04, dial.z) });
  S(ribbed(1.0, 0.42, 60, 0.05), M.knurlChrome, { pos: V(dial.x, Y1 + 0.29, dial.z), proxy: cyl(1.0, 1.0, 0.42) });
  S(cyl(0.94, 0.94, 0.04), [M.chrome, M.dial, M.chrome], { pos: V(dial.x, Y1 + 0.52, dial.z), rot: [0, -0.9, 0] });

  /* Shutter release, with the advance lever pivoting around it */
  const rel = V(-5.35, Y1, 0.2);
  S(ribbed(0.56, 0.3, 30, 0.04), M.knurlChrome, { pos: V(rel.x, Y1 + 0.15, rel.z), proxy: cyl(0.56, 0.56, 0.3) });
  S(cyl(0.5, 0.5, 0.1), M.chrome, { pos: V(rel.x, Y1 + 0.38, rel.z) });
  S(cyl(0.3, 0.3, 0.3), M.chromeBright, { pos: V(rel.x, Y1 + 0.58, rel.z) });
  S(cyl(0.1, 0.1, 0.02, 16), M.satin, { pos: V(rel.x, Y1 + 0.74, rel.z), edges: 'none' });

  // advance lever: tapered arm, aimed along the back edge
  const arm = new THREE.Shape();
  const L = 3.05;
  arm.absarc(0, 0, 0.42, Math.PI / 2, Math.PI * 1.5, false);
  arm.lineTo(L, -0.15);
  arm.absarc(L, 0, 0.15, -Math.PI / 2, Math.PI / 2, false);
  arm.lineTo(0, 0.42);
  const armGeo = new THREE.ExtrudeGeometry(arm, { depth: 0.09, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 16 });
  armGeo.rotateX(-Math.PI / 2);
  const leverAngle = 0.67;
  S(armGeo, M.chrome, { pos: V(rel.x, Y1 + 0.3, rel.z), rot: [0, leverAngle, 0], edges: 'none' });
  const tip = V(rel.x + Math.cos(leverAngle) * L, Y1 + 0.42, rel.z - Math.sin(leverAngle) * L);
  S(cyl(0.17, 0.2, 0.36, 24), M.satin, { pos: V(tip.x, Y1 + 0.5, tip.z) });

  /* Rewind knob with folding crank */
  const rw = V(5.15, Y1, 0.2);
  S(cyl(0.55, 0.55, 0.18), M.chrome, { pos: V(rw.x, Y1 + 0.09, rw.z) });
  S(ribbed(0.8, 0.48, 36, 0.05), M.knurlChrome, { pos: V(rw.x, Y1 + 0.42, rw.z), proxy: cyl(0.8, 0.8, 0.48) });
  S(new RoundedBoxGeometry(1.1, 0.08, 0.26, 2, 0.03), M.satin, { pos: V(rw.x + 0.25, Y1 + 0.7, rw.z), rot: [0, 0.4, 0] });
  S(cyl(0.09, 0.09, 0.2, 16), M.satin, { pos: V(rw.x + 0.72, Y1 + 0.8, rw.z - 0.2) });

  /* Accessory shoe */
  const sx = 1.0;
  S(new THREE.BoxGeometry(1.9, 0.08, 1.8), M.chrome, { pos: V(sx, Y1 + 0.04, -0.05) });
  for (const s of [-1, 1]) {
    S(new THREE.BoxGeometry(0.14, 0.2, 1.8), M.chrome, { pos: V(sx + s * 0.88, Y1 + 0.16, -0.05) });
    S(new THREE.BoxGeometry(0.32, 0.05, 1.8), M.chrome, { pos: V(sx + s * 0.72, Y1 + 0.25, -0.05) });
  }

  /* Frame counter */
  S(cyl(0.36, 0.36, 0.04, 32), M.chrome, { pos: V(-1.75, Y1 + 0.02, 0.8) });
  S(cyl(0.28, 0.28, 0.07, 32), M.glass, { pos: V(-1.75, Y1 + 0.05, 0.8), edges: 'none' });

  /* Front details */
  S(alongZ(cyl(2.56, 2.56, 0.1, 64), LX, LY, ZF - 0.08, ZF + 0.02), M.chrome); // body mount flange
  S(alongZ(cyl(0.27, 0.27, 0.2, 24), LX + 2.95, LY + 1.6, ZF - 0.05, ZF + 0.15), M.chrome); // lens release
  S(alongZ(cyl(0.55, 0.55, 0.08, 40), -3.35, -2.6, ZF - 0.06, ZF + 0.02), M.chrome); // battery cap
  S(new THREE.BoxGeometry(0.7, 0.08, 0.03), M.satin, { pos: V(-3.35, -2.6, ZF + 0.03), edges: 'none' });
  S(new RoundedBoxGeometry(0.16, 0.7, 0.1, 2, 0.04), M.chrome, { pos: V(LX - 3.05, LY + 2.05, ZF + 0.02) }); // frame selector

  /* Strap lugs */
  for (const s of [-1, 1]) {
    S(alongZ(cyl(0.15, 0.15, 0.3, 16), 0, 0, -0.15, 0.15).rotateY(Math.PI / 2).translate(s * 7.0, 2.0, 0), M.chrome);
    S(new THREE.TorusGeometry(0.3, 0.05, 10, 32), M.chromeBright, { pos: V(s * 7.2, 1.78, 0), rot: [0, s * 0.5, 0], edges: 'none' });
  }

  /* Back: eyepiece */
  S(new RoundedBoxGeometry(1.15, 0.85, 0.14, 2, 0.06), M.satin, { pos: V(3.55, 3.05, -ZF - 0.04) });
  S(new THREE.BoxGeometry(0.78, 0.52, 0.04), M.glass, { pos: V(3.55, 3.05, -ZF - 0.11), edges: 'none' });

  /* Lens */
  S(alongZ(cyl(2.4, 2.4, 0.22, 64), LX, LY, ZF + 0.02, ZF + 0.24), M.chrome);
  S(new THREE.SphereGeometry(0.075, 12, 8), M.red, { pos: V(LX, LY + 2.4, ZF + 0.13), edges: 'none' });
  S(alongZ(ribbed(2.5, 0.44, 24, 0.07), LX, LY, ZF + 0.24, ZF + 0.68), M.knurlChrome, {
    proxy: alongZ(cyl(2.5, 2.5, 0.44, 64), LX, LY, ZF + 0.24, ZF + 0.68),
  });
  S(alongZ(cyl(2.42, 2.42, 0.4, 64), LX, LY, ZF + 0.68, ZF + 1.08), M.chrome);
  S(alongZ(ribbed(2.6, 0.8, 80, 0.06), LX, LY, ZF + 1.08, ZF + 1.88), M.knurl, {
    proxy: alongZ(cyl(2.6, 2.6, 0.8, 64), LX, LY, ZF + 1.08, ZF + 1.88),
  });
  // focus tab
  S(new RoundedBoxGeometry(0.5, 0.6, 0.34, 2, 0.08), M.satin, { pos: V(LX, LY - 2.75, ZF + 1.48) });
  S(alongZ(cyl(0.3, 0.3, 0.34, 24), LX, LY - 3.08, ZF + 1.31, ZF + 1.65), M.satin);
  S(alongZ(cyl(2.3, 2.38, 1.02, 64), LX, LY, ZF + 1.88, ZF + 2.9), M.chrome);
  S(alongZ(cyl(2.33, 2.33, 0.15, 64), LX, LY, ZF + 2.9, ZF + 3.05), M.satin);
  const ring = new THREE.RingGeometry(1.98, 2.33, 64);
  ring.translate(LX, LY, ZF + 3.051);
  S(ring, M.lensRing, { edges: 'none' });
  S(alongZ(cyl(1.98, 1.98, 0.7, 48, true), LX, LY, ZF + 2.35, ZF + 3.05), M.matte, { edges: 'none' });
  S(alongZ(cyl(1.98, 1.98, 0.02, 48), LX, LY, ZF + 2.3, ZF + 2.32), M.matte, { edges: 'none' });
  const capT = Math.asin(1.98 / 4);
  const cap = new THREE.SphereGeometry(4, 48, 10, 0, Math.PI * 2, 0, capT);
  cap.rotateX(Math.PI / 2);
  cap.translate(LX, LY, ZF + 2.42 - 4 * Math.cos(capT));
  S(cap, M.lensGlass, { edges: 'none' });

  /* ── Internals ─────────────────────────────────────────────────────────── */

  // film gate + rails
  const gateShape = new THREE.Shape();
  gateShape.moveTo(-2.3, -1.65);
  gateShape.lineTo(2.3, -1.65);
  gateShape.lineTo(2.3, 1.65);
  gateShape.lineTo(-2.3, 1.65);
  const gateHole = new THREE.Path();
  gateHole.moveTo(-1.8, -1.2);
  gateHole.lineTo(-1.8, 1.2);
  gateHole.lineTo(1.8, 1.2);
  gateHole.lineTo(1.8, -1.2);
  gateShape.holes.push(gateHole);
  const gate = new THREE.ExtrudeGeometry(gateShape, { depth: 0.1, bevelEnabled: false });
  gate.translate(LX, LY, FILM + 0.08);
  I(gate, M.steel);
  for (const s of [-1, 1]) I(new THREE.BoxGeometry(10.4, 0.1, 0.08), M.steel, { pos: V(-0.4, LY + s * 1.82, FILM + 0.02) });

  // film strip (a developed negative, seen through the gate)
  const filmTex = new THREE.CanvasTexture(filmStrip(['reykjavik', 'florence', 'tokyo'], { negative: true }));
  filmTex.colorSpace = THREE.SRGBColorSpace;
  filmTex.repeat.set(0.75, 1);
  filmTex.offset.set(0.06, 0);
  M.film.map = filmTex;
  I(new THREE.PlaneGeometry(8.6, 3.5), M.film, { pos: V(-0.35, LY, FILM - 0.05), edges: 'none' });

  // cassette
  const cas = V(5.0, LY, 0.0);
  I(cyl(1.2, 1.2, 4.3, 48), [M.cassette, M.cassetteCap, M.cassetteCap], { pos: cas, rot: [0, -0.6, 0] });
  for (const s of [-1, 1]) I(cyl(1.26, 1.26, 0.12, 48), M.cassetteCap, { pos: V(cas.x, LY + s * 2.2, cas.z) });
  I(cyl(0.32, 0.32, 0.35, 24), M.steel, { pos: V(cas.x, LY + 2.44, cas.z) });
  I(cyl(0.08, 0.08, Y1 - (LY + 2.6), 12), M.steel, { pos: V(cas.x, (Y1 + LY + 2.6) / 2, cas.z) });
  I(new THREE.BoxGeometry(1.0, 4.1, 0.2), M.cassetteCap, { pos: V(cas.x - 0.65, LY, FILM + 0.02) });

  // take-up spool + sprocket drum
  const spool = V(-5.3, LY, 0.2);
  I(cyl(0.55, 0.55, 4.1, 32), M.steel, { pos: spool });
  I(cyl(0.8, 0.8, 3.5, 40), M.filmRoll, { pos: spool });
  for (const s of [-1, 1]) I(cyl(1.0, 1.0, 0.07, 40), M.steel, { pos: V(spool.x, LY + s * 2.02, spool.z) });
  const spr = V(-4.0, LY, -0.76);
  I(cyl(0.38, 0.38, 3.7, 32), M.steel, { pos: spr });
  for (const s of [-1, 1])
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      I(new THREE.BoxGeometry(0.1, 0.14, 0.12), M.steel, {
        pos: V(spr.x + Math.cos(a) * 0.42, LY + s * 1.62, spr.z + Math.sin(a) * 0.42),
        rot: [0, -a, 0],
        edges: 'none',
      });
    }

  // focal-plane shutter: two cloth curtains on drums, a slit between them
  const drumZ = FILM + 0.53;
  const curtZ = FILM + 0.23;
  for (const x of [LX - 2.8, LX + 2.8]) I(cyl(0.3, 0.3, 3.5, 32), M.steel, { pos: V(x, LY, drumZ) });
  I(new THREE.PlaneGeometry(2.35, 2.9), M.cloth, { pos: V(LX - 1.625, LY, curtZ), edges: 'none' });
  I(new THREE.PlaneGeometry(1.95, 2.9), M.cloth, { pos: V(LX + 1.825, LY, curtZ), edges: 'none' });
  for (const x of [LX - 0.45, LX + 0.85]) I(new THREE.BoxGeometry(0.07, 2.95, 0.06), M.steel, { pos: V(x, LY, curtZ) });
  for (const s of [-1, 1]) I(new THREE.BoxGeometry(5.6, 0.12, 0.012), M.cloth, { pos: V(LX, LY + s * 1.6, curtZ - 0.01), edges: 'none' });

  // gear train under the top plate: advance → sprocket → shutter cocking
  const gy = 2.95;
  const gears = [
    { r: 0.95, t: 28, p: V(-5.35, gy, 0.2) },
    { r: 0.66, t: 20, p: V(-4.0, gy, -0.76) },
    { r: 0.55, t: 16, p: V(-3.05, gy, -0.05) },
    { r: 0.28, t: 10, p: V(-3.05, gy - 0.2, -0.05) },
    { r: 0.53, t: 18, p: V(-2.45, gy - 0.2, -0.6) },
  ];
  gears.forEach(({ r, t, p }, i) => I(gear(r, t), M.brass, { pos: p, rot: [0, i * 0.3, 0] }));
  I(cyl(0.06, 0.06, gy - (LY + 1.85), 10), M.steel, { pos: V(spr.x, (gy + LY + 1.85) / 2, spr.z) });
  I(cyl(0.06, 0.06, gy - 0.2 - (LY + 1.75), 10), M.steel, { pos: V(LX - 2.8, (gy - 0.2 + LY + 1.75) / 2, drumZ) });
  I(cyl(0.07, 0.07, gy - (LY + 2.05), 10), M.steel, { pos: V(spool.x, (gy + LY + 2.05) / 2, spool.z) });
  // speed cam under the dial
  I(new THREE.CylinderGeometry(0.82, 0.82, 0.1, 48, 1, false, 0.3, Math.PI * 2 - 0.6), M.steel, { pos: V(dial.x, 3.45, dial.z) });

  // rangefinder: pivoting mirror, beam-splitter prism, linkage to the lens cam
  I(new THREE.BoxGeometry(0.9, 0.7, 0.04), M.mirror, { pos: V(-4.45, wy, 1.0), rot: [0, -Math.PI / 4, 0] });
  I(new THREE.BoxGeometry(0.75, 0.75, 0.75), M.opticGlass, { pos: V(3.55, wy, 1.0), rot: [0, Math.PI / 4, 0] });
  I(alongZ(lensElement(0.42, 0.08, 0.06, 0.06), 3.55, wy, -0.1, 0.1), M.opticGlass, { edges: 'none' });
  I(new THREE.BoxGeometry(1.4, 0.55, 0.03), M.steel, { pos: V(-1.4, wy, 1.25) });
  I(alongZ(cyl(0.05, 0.05, 4.5, 10), 0, 0, -2.25, 2.25).rotateY(Math.PI / 2).translate(-2.05, 2.6, 0.8), M.steel);
  I(new THREE.BoxGeometry(0.08, 0.5, 0.08), M.steel, { pos: V(-4.45, 2.8, 0.85) });
  const camArm = new THREE.BoxGeometry(0.1, 1.25, 0.1);
  I(camArm, M.steel, { pos: V(LX - 0.15, 2.05, 1.03), rot: [-0.35, 0, -0.25] });
  I(alongZ(cyl(0.16, 0.16, 0.12, 20), 0, 0, -0.06, 0.06).rotateY(Math.PI / 2).translate(LX, 1.56, 1.25), M.brass);

  // lens internals: elements, iris, helicoid, rear cam
  const elements = [
    [ZF + 2.55, 1.9, 0.16, 0.22, 0.05],
    [ZF + 2.15, 1.7, 0.14, 0.12, 0.1],
    [ZF + 1.6, 1.45, 0.2, 0.08, 0.14],
    [ZF + 0.95, 1.4, 0.18, 0.12, 0.08],
    [ZF + 0.45, 1.55, 0.18, 0.06, 0.16],
    [ZF - 0.2, 1.5, 0.16, 0.1, 0.1],
  ];
  for (const [z, r, t, s1, s2] of elements) I(alongZ(lensElement(r, t, s1, s2), LX, LY, z, z), M.opticGlass, { edges: 'none' });
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    I(new THREE.BoxGeometry(1.1, 0.5, 0.015), M.iris, {
      pos: V(LX + Math.cos(a) * 1.05, LY + Math.sin(a) * 1.05, ZF + 1.28 + (k % 2) * 0.02),
      rot: [0, 0, a + Math.PI / 2 + 0.5],
      edges: 'none',
    });
  }
  const helix = [];
  for (let i = 0; i <= 16; i++) helix.push(new THREE.Vector2(2.18 + (i % 2) * 0.07, -0.4 + i * 0.05));
  I(alongZ(new THREE.LatheGeometry(helix, 64), LX, LY, ZF + 1.48, ZF + 1.48), M.steel, { edges: 'none' });
  I(alongZ(cyl(2.0, 2.0, 0.15, 48, true), LX, LY, ZF - 0.42, ZF - 0.27), M.brass);

  // electronics: meter board, flex, cells
  I(new THREE.BoxGeometry(5.4, 0.07, 2.2), [M.chip, M.chip, M.pcb, M.chip, M.chip, M.chip], { pos: V(LX + 0.2, -3.22, 0.25) });
  const parts = [
    [0.9, 0.12, 0.6, LX - 1.1, 0.4],
    [0.5, 0.1, 0.5, LX + 0.8, -0.3],
    [0.35, 0.08, 0.2, LX + 0.2, 0.9],
    [0.35, 0.08, 0.2, LX - 0.3, -0.5],
    [0.3, 0.08, 0.3, LX + 1.6, -0.45],
  ];
  for (const [w, h, d, x, z] of parts) I(new THREE.BoxGeometry(w, h, d), M.chip, { pos: V(x, -3.18 + h / 2, z) });
  for (const [x, z] of [
    [LX + 1.9, 0.7],
    [LX + 2.35, 0.1],
  ])
    I(cyl(0.16, 0.16, 0.4, 16), M.battery, { pos: V(x, -2.98, z) });
  I(new THREE.BoxGeometry(0.6, 5.5, 0.02), M.flex, { pos: V(3.3, -0.45, 1.32), edges: 'none' });
  for (const z of [1.0, 0.45]) I(alongZ(cyl(0.55, 0.55, 0.5, 32), -3.35, -2.6, z - 0.25, z + 0.25), M.battery);

  // optical path through the rangefinder (drawn as a dashed line)
  const opticPath = [
    [V(-4.45, wy, ZF + 0.6), V(-4.45, wy, 1.0), V(3.55, wy, 1.0), V(3.55, wy, -ZF - 0.6)],
    [V(3.55, wy, ZF + 0.6), V(3.55, wy, 1.0)],
  ];

  root.updateMatrixWorld(true);

  /* Anchors for annotations (p = point, n = outward normal for facing tests) */
  const N = (x, y, z) => V(x, y, z).normalize();
  const anchors = {
    lensFront: { p: V(LX, LY + 1.0, ZF + 2.95), n: N(0, 0, 1) },
    lensCenter: { p: V(LX, LY, ZF + 2.42), n: N(0, 0, 1) },
    focusRing: { p: V(LX - 1.84, LY + 1.84, ZF + 1.48), n: N(-1, 1, 0) },
    focusTab: { p: V(LX, LY - 3.3, ZF + 1.48), n: N(0, -1, 0.3) },
    aperture: { p: V(LX - 2.2, LY + 1.2, ZF + 0.46), n: N(-1, 0.4, 0) },
    mount: { p: V(LX + 2.4, LY - 0.6, ZF + 0.12), n: N(1, 0, 0.2) },
    speedDial: { p: V(dial.x + 0.3, Y1 + 0.55, dial.z + 0.2), n: N(0, 1, 0) },
    shutter: { p: V(rel.x, Y1 + 0.75, rel.z), n: N(0, 1, 0) },
    lever: { p: tip.clone().setY(Y1 + 0.68), n: N(0, 1, 0) },
    rewind: { p: V(rw.x, Y1 + 0.7, rw.z + 0.5), n: N(0, 1, 0.4) },
    shoe: { p: V(sx, Y1 + 0.28, 0.2), n: N(0, 1, 0) },
    counter: { p: V(-1.75, Y1 + 0.09, 0.8), n: N(0, 1, 0) },
    viewfinder: { p: V(3.55, wy, ZF + 0.07), n: N(0, 0, 1) },
    rangefinder: { p: V(-4.45, wy, ZF + 0.07), n: N(0, 0, 1) },
    illum: { p: V(-1.4, wy, ZF + 0.07), n: N(0, 0, 1) },
    lugL: { p: V(-7.45, 1.78, 0), n: N(-1, 0, 0.3) },
    lugR: { p: V(7.45, 1.78, 0), n: N(1, 0, 0.3) },
    leather: { p: V(-5.0, -1.0, ZF), n: N(0, 0, 1) },
    leatherR: { p: V(5.2, -1.6, ZF), n: N(0, 0, 1) },
    batteryCap: { p: V(-3.35, -2.6, ZF + 0.03), n: N(0, 0, 1) },
    topPlate: { p: V(-0.2, Y1, 0.9), n: N(0, 1, 0) },
    frontPlate: { p: V(1.2, 2.7, ZF), n: N(0, 0, 1) },
    base: { p: V(3.5, Y0 + 0.2, ZF), n: N(0, -0.2, 1) },
    release: { p: V(LX + 2.95, LY + 1.6, ZF + 0.15), n: N(0, 0, 1) },
    // internal
    cassette: { p: V(cas.x - 0.6, LY + 1.1, cas.z + 1.0), n: null },
    spool: { p: V(spool.x + 0.4, LY + 1.0, spool.z + 0.75), n: null },
    sprocket: { p: V(spr.x, LY + 1.3, spr.z + 0.35), n: null },
    gate: { p: V(LX + 2.0, LY + 1.4, FILM + 0.1), n: null },
    film: { p: V(LX - 2.7, LY - 1.0, FILM), n: null },
    curtain: { p: V(LX - 1.2, LY - 0.9, curtZ), n: null },
    gears: { p: V(-4.0, gy + 0.1, -0.76), n: null },
    gearBig: { p: V(-5.35, gy + 0.1, 0.2), n: null },
    mirror: { p: V(-4.45, wy, 1.0), n: null },
    prism: { p: V(3.55, wy + 0.2, 1.0), n: null },
    roller: { p: V(LX, 1.56, 1.25), n: null },
    pcb: { p: V(LX + 1.2, -3.15, 0.9), n: null },
    battery: { p: V(-3.35, -2.6, 0.7), n: null },
    iris: { p: V(LX, LY + 0.9, ZF + 1.29), n: null },
    optics: { p: V(LX, LY + 1.3, ZF + 2.15), n: null },
  };

  return { root, shell, structure, loops, opticPath, anchors };
}
