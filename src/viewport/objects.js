// Seven procedurally modelled objects — one per project — for the still life.
// Every builder returns { group, parts, anchor, dims, accent } where `parts`
// lists the pieces (meshes or sub-groups) that separate in the exploded view.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

function mat(color, metalness = 0, roughness = 0.6, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
}

function mesh(geometry, material, pos = V(), rot = null) {
  const m = new THREE.Mesh(geometry, material);
  m.position.copy(pos);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Rounded boxes are too smooth for EdgesGeometry to find an outline, so each one
// carries a sharp box of the same size to draw its hidden-line edges from.
const rbox = (w, h, d, r = 0.01, s = 3) => {
  const g = new RoundedBoxGeometry(w, h, d, s, Math.min(r, w / 2, h / 2, d / 2));
  g.userData.edgeSource = new THREE.BoxGeometry(w, h, d);
  return g;
};
const cyl = (r, h, seg = 40, r2 = r) => new THREE.CylinderGeometry(r2, r, h, seg);

class Builder {
  constructor() {
    this.group = new THREE.Group();
    this.parts = [];
  }
  add(obj, explode = V(), parent = this.group, opts = {}) {
    parent.add(obj);
    this.parts.push({ obj, base: obj.position.clone(), explode, accent: !!opts.accent, label: opts.label });
    return obj;
  }
}

/* ── 1. Facility maquette ─────────────────────────────────────────────────── */

export function facility() {
  const b = new Builder();
  const white = () => mat('#f2efe9', 0, 0.85);
  b.add(mesh(rbox(1.0, 0.03, 0.72, 0.008), mat('#e3dccf', 0, 0.9), V(0, 0.015, 0)), V(0, 0, 0), undefined, { label: 'Site' });

  const hall = mesh(rbox(0.62, 0.15, 0.42, 0.004), white(), V(-0.1, 0.105, -0.03));
  b.add(hall, V(0, 0.16, 0), undefined, { label: 'Main hall', accent: true });

  // Sawtooth roof: four north-light prisms.
  const tri = new THREE.Shape();
  tri.moveTo(0, 0);
  tri.lineTo(0.155, 0);
  tri.lineTo(0, 0.07);
  tri.closePath();
  const prism = new THREE.ExtrudeGeometry(tri, { depth: 0.42, bevelEnabled: false });
  prism.translate(-0.0775, 0, -0.21);
  const roof = new THREE.Group();
  roof.position.set(-0.1, 0.18, -0.03);
  for (let i = 0; i < 4; i++) {
    const p = mesh(prism, mat('#d9d4cc', 0, 0.7), V(-0.2325 + i * 0.155, 0, 0));
    roof.add(p);
  }
  b.add(roof, V(0, 0.34, 0), undefined, { label: 'Roof' });

  b.add(mesh(rbox(0.22, 0.09, 0.26, 0.004), white(), V(0.36, 0.075, 0.12)), V(0.14, 0.1, 0.06), undefined, { label: 'Offices' });
  const silo = cyl(0.038, 0.2, 28);
  b.add(mesh(silo, mat('#c9cdd2', 0.6, 0.35), V(0.33, 0.13, -0.2)), V(0.16, 0.12, -0.08), undefined, { label: 'Silo' });
  b.add(mesh(silo, mat('#c9cdd2', 0.6, 0.35), V(0.42, 0.13, -0.2)), V(0.2, 0.12, -0.08), undefined, { label: 'Silo' });
  // Tiny trucks at the dock.
  for (let i = 0; i < 2; i++) {
    b.add(mesh(rbox(0.05, 0.035, 0.12, 0.004), mat('#2f3236', 0.2, 0.6), V(-0.32 + i * 0.09, 0.048, 0.28)), V(-0.04, 0.06, 0.12));
  }
  return { ...b, anchor: V(0, 0.32, 0), dims: [{ a: V(-0.5, 0.03, 0.36), b: V(0.5, 0.03, 0.36), dir: V(0, 0, 1), text: '1:500 · 120 m' }] };
}

/* ── 2. Robot arm (assembly cell) ─────────────────────────────────────────── */

export function robot() {
  const b = new Builder();
  const orange = () => mat('#f26a21', 0.15, 0.42);
  const dark = () => mat('#2b2d31', 0.5, 0.45);
  b.add(mesh(cyl(0.15, 0.025), dark(), V(0, 0.0125, 0)), V(0, 0, 0), undefined, { label: 'Base plate' });
  b.add(mesh(cyl(0.11, 0.08), orange(), V(0, 0.065, 0)), V(0, 0.08, 0), undefined, { label: 'J1 base', accent: true });

  const shoulder = new THREE.Group();
  shoulder.position.set(0, 0.13, 0);
  shoulder.rotation.z = -0.32;
  b.add(shoulder, V(0, 0.16, 0));
  shoulder.add(mesh(rbox(0.15, 0.1, 0.15, 0.03), orange(), V(0, 0.03, 0)));
  shoulder.add(mesh(cyl(0.055, 0.17, 32), dark(), V(0, 0.05, 0), [Math.PI / 2, 0, 0]));
  shoulder.add(mesh(rbox(0.075, 0.4, 0.085, 0.03), orange(), V(0, 0.25, 0)));

  const elbow = new THREE.Group();
  elbow.position.set(0, 0.44, 0);
  elbow.rotation.z = 1.75;
  shoulder.add(elbow);
  b.parts.push({ obj: elbow, base: elbow.position.clone(), explode: V(0, 0.12, 0) });
  elbow.add(mesh(cyl(0.05, 0.12, 32), dark(), V(0, 0, 0), [Math.PI / 2, 0, 0]));
  elbow.add(mesh(rbox(0.06, 0.32, 0.065, 0.025), orange(), V(0, 0.17, 0)));

  const wrist = new THREE.Group();
  wrist.position.set(0, 0.34, 0);
  wrist.rotation.z = 0.55;
  elbow.add(wrist);
  b.parts.push({ obj: wrist, base: wrist.position.clone(), explode: V(0, 0.1, 0) });
  wrist.add(mesh(cyl(0.034, 0.07, 28), dark(), V(0, 0.02, 0)));
  const steel = mat('#c7c9cc', 0.9, 0.25);
  wrist.add(mesh(rbox(0.012, 0.06, 0.03, 0.004), steel, V(-0.022, 0.08, 0)));
  wrist.add(mesh(rbox(0.012, 0.06, 0.03, 0.004), steel, V(0.022, 0.08, 0)));
  return { ...b, anchor: V(0.05, 0.72, 0), dims: [{ a: V(-0.15, 0.002, 0.2), b: V(0.15, 0.002, 0.2), dir: V(0, 0, 1), text: 'Ø300' }] };
}

/* ── 3. Machined flange (fixtures) ────────────────────────────────────────── */

export function flange() {
  const b = new Builder();
  const alu = () => mat('#cfd3d8', 0.85, 0.32);
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 0.21, 0, Math.PI * 2, false);
  const bore = new THREE.Path();
  bore.absarc(0, 0, 0.05, 0, Math.PI * 2, true);
  shape.holes.push(bore);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const h = new THREE.Path();
    h.absarc(Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0.022, 0, Math.PI * 2, true);
    shape.holes.push(h);
  }
  const plate = new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2, curveSegments: 48 });
  plate.rotateX(-Math.PI / 2);
  b.add(mesh(plate, alu(), V(0, 0.004, 0)), V(0, 0, 0), undefined, { label: 'Flange', accent: true });

  const hubProfile = [V(0.05, 0), V(0.088, 0), V(0.088, 0.075), V(0.08, 0.085), V(0.05, 0.085)].map((v) => new THREE.Vector2(v.x, v.y));
  const hub = new THREE.LatheGeometry(hubProfile, 56);
  b.add(mesh(hub, alu(), V(0, 0.042, 0)), V(0, 0.16, 0), undefined, { label: 'Hub' });

  const bolt = new THREE.Group();
  const steel = mat('#3a3d42', 0.8, 0.35);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const g = new THREE.Group();
    g.position.set(Math.cos(a) * 0.15, 0.06, Math.sin(a) * 0.15);
    g.add(mesh(cyl(0.016, 0.07, 18), steel, V(0, -0.02, 0)));
    g.add(mesh(cyl(0.026, 0.018, 6), steel, V(0, 0.022, 0)));
    bolt.add(g);
  }
  b.add(bolt, V(0, 0.3, 0), undefined, { label: 'M8 bolts ×6' });
  return { ...b, anchor: V(0, 0.2, 0), dims: [{ a: V(-0.21, 0.002, 0.26), b: V(0.21, 0.002, 0.26), dir: V(0, 0, 1), text: 'Ø420' }] };
}

/* ── 4. Console + cartridge (Grant 64) ────────────────────────────────────── */

export function consoleBox() {
  const b = new Builder();
  b.add(mesh(rbox(0.5, 0.05, 0.36, 0.02), mat('#3b3c40', 0.1, 0.55), V(0, 0.025, 0)), V(0, 0, 0), undefined, { label: 'Lower shell' });
  b.add(mesh(rbox(0.44, 0.012, 0.3, 0.003), mat('#1f6f43', 0.2, 0.5), V(0, 0.056, 0)), V(0, 0.1, 0), undefined, { label: 'Mainboard', accent: true });
  const top = new THREE.Group();
  top.position.set(0, 0.075, 0);
  top.add(mesh(rbox(0.5, 0.045, 0.36, 0.02), mat('#4a4b50', 0.1, 0.5)));
  top.add(mesh(rbox(0.2, 0.03, 0.06, 0.008), mat('#3b3c40', 0.1, 0.55), V(0, 0.03, -0.02)));
  for (let i = 0; i < 4; i++) top.add(mesh(rbox(0.05, 0.03, 0.02, 0.006), mat('#2b2c30', 0.1, 0.6), V(-0.135 + i * 0.09, -0.01, 0.175)));
  b.add(top, V(0, 0.22, 0), undefined, { label: 'Upper shell' });
  const cart = new THREE.Group();
  cart.position.set(0, 0.16, -0.02);
  cart.add(mesh(rbox(0.17, 0.12, 0.034, 0.012), mat('#2a2b2e', 0.1, 0.6)));
  cart.add(mesh(new THREE.PlaneGeometry(0.12, 0.07), mat('#e8d9b5', 0, 0.8), V(0, 0.012, 0.0175)));
  b.add(cart, V(0, 0.38, 0), undefined, { label: 'Cartridge' });
  return { ...b, anchor: V(0, 0.3, 0), dims: [{ a: V(-0.25, 0.002, 0.23), b: V(0.25, 0.002, 0.23), dir: V(0, 0, 1), text: '260' }] };
}

/* ── 5. Laptop (apps) ─────────────────────────────────────────────────────── */

export function laptop(screenTexture) {
  const b = new Builder();
  const silver = () => mat('#c6c8cb', 0.75, 0.32);
  b.add(mesh(rbox(0.56, 0.02, 0.38, 0.008), silver(), V(0, 0.01, 0)), V(0, 0, 0), undefined, { label: 'Base' });
  b.add(mesh(rbox(0.48, 0.004, 0.17, 0.002), mat('#2a2b2e', 0.2, 0.7), V(0, 0.022, -0.06)), V(0, 0.08, 0), undefined, { label: 'Keyboard' });
  b.add(mesh(rbox(0.15, 0.003, 0.09, 0.002), mat('#b4b6b9', 0.6, 0.35), V(0, 0.021, 0.11)), V(0, 0.05, 0.04));
  const lid = new THREE.Group();
  lid.position.set(0, 0.02, -0.19);
  lid.rotation.x = -0.32;
  lid.add(mesh(rbox(0.56, 0.36, 0.012, 0.008), silver(), V(0, 0.18, 0)));
  const screen = mesh(
    new THREE.PlaneGeometry(0.52, 0.32),
    new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveMap: screenTexture, map: screenTexture, emissiveIntensity: 0.9, roughness: 0.3 }),
    V(0, 0.18, 0.0065),
  );
  screen.castShadow = false;
  screen.userData.screen = true;
  lid.add(screen);
  b.add(lid, V(0, 0.1, -0.14), undefined, { label: 'Display', accent: true });
  return { ...b, anchor: V(0, 0.45, -0.1), dims: [{ a: V(-0.28, 0.002, 0.24), b: V(0.28, 0.002, 0.24), dir: V(0, 0, 1), text: '304' }] };
}

/* ── 6. LED matrix ────────────────────────────────────────────────────────── */

export function ledPanel() {
  const b = new Builder();
  b.add(mesh(rbox(0.32, 0.02, 0.14, 0.006), mat('#1d1e21', 0.3, 0.5), V(0, 0.01, 0)), V(0, 0, 0.0), undefined, { label: 'Stand' });
  const panel = new THREE.Group();
  panel.position.set(0, 0.29, -0.01);
  panel.rotation.x = -0.12;
  b.add(panel, V(0, 0.06, 0));

  const back = mesh(rbox(0.5, 0.5, 0.025, 0.01), mat('#17181b', 0.3, 0.5), V(0, 0, -0.012));
  panel.add(back);
  b.parts.push({ obj: back, base: back.position.clone(), explode: V(0, 0, -0.14), label: 'Back plate' });

  const N = 16;
  // Unlit so each LED shows its own colour; brightness is driven per mode.
  const led = new THREE.InstancedMesh(new THREE.BoxGeometry(0.022, 0.022, 0.006), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), N * N);
  const m4 = new THREE.Matrix4();
  const c = new THREE.Color();
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) {
      const k = i * N + j;
      m4.makeTranslation(-0.225 + i * 0.03, -0.225 + j * 0.03, 0);
      led.setMatrixAt(k, m4);
      // A soft sunset gradient with a ring — reads as "made by a person".
      const dx = i - 7.5;
      const dy = j - 7.5;
      const r = Math.hypot(dx, dy);
      const ring = Math.abs(r - 5.2) < 0.9 ? 1 : 0;
      c.setHSL(0.02 + (j / N) * 0.12, 0.9, ring ? 0.62 : 0.12 + (j / N) * 0.25);
      led.setColorAt(k, c);
    }
  led.position.z = 0.006;
  led.userData.leds = true;
  panel.add(led);
  b.parts.push({ obj: led, base: led.position.clone(), explode: V(0, 0, 0.1), label: '256 LEDs', accent: true });

  const diffuser = mesh(rbox(0.49, 0.49, 0.01, 0.004), mat('#ffffff', 0, 0.2, { transparent: true, opacity: 0.18, depthWrite: false }), V(0, 0, 0.02));
  diffuser.castShadow = false;
  diffuser.userData.glass = true;
  panel.add(diffuser);
  b.parts.push({ obj: diffuser, base: diffuser.position.clone(), explode: V(0, 0, 0.22), label: 'Diffuser' });
  return { ...b, anchor: V(0, 0.6, 0), dims: [{ a: V(-0.25, 0.002, 0.16), b: V(0.25, 0.002, 0.16), dir: V(0, 0, 1), text: '480' }] };
}

/* ── 7. Film camera ───────────────────────────────────────────────────────── */

export function filmCamera() {
  const b = new Builder();
  const black = () => mat('#1a1a1b', 0.1, 0.75);
  const chrome = () => mat('#d4d6d9', 1, 0.18);
  b.add(mesh(rbox(0.36, 0.17, 0.11, 0.025), black(), V(0, 0.085, 0)), V(0, 0, 0), undefined, { label: 'Body' });
  const top = new THREE.Group();
  top.position.set(0, 0.19, 0);
  top.add(mesh(rbox(0.36, 0.045, 0.11, 0.015), chrome()));
  top.add(mesh(cyl(0.026, 0.022, 32), chrome(), V(-0.11, 0.032, 0)));
  top.add(mesh(cyl(0.022, 0.018, 32), chrome(), V(0.12, 0.03, 0)));
  top.add(mesh(cyl(0.008, 0.012, 16), chrome(), V(0.07, 0.03, 0.01)));
  top.add(mesh(rbox(0.06, 0.03, 0.006, 0.004), mat('#0d0f12', 0.2, 0.1), V(-0.08, 0, 0.056)));
  b.add(top, V(0, 0.16, 0), undefined, { label: 'Top plate' });
  const lens = new THREE.Group();
  lens.position.set(0.02, 0.09, 0.055);
  lens.rotation.x = Math.PI / 2;
  lens.add(mesh(cyl(0.065, 0.1, 48), black(), V(0, 0.05, 0)));
  lens.add(mesh(cyl(0.068, 0.025, 48), chrome(), V(0, 0.03, 0)));
  lens.add(mesh(cyl(0.068, 0.012, 48), chrome(), V(0, 0.085, 0)));
  b.add(lens, V(0, 0, 0.2), undefined, { label: 'Lens', accent: true });
  const glass = mesh(cyl(0.05, 0.004, 48), mat('#1b2a3a', 1, 0.05), V(0.02, 0.09, 0.158), [Math.PI / 2, 0, 0]);
  b.add(glass, V(0, 0, 0.32), undefined, { label: 'Front element' });
  return { ...b, anchor: V(0, 0.33, 0), dims: [{ a: V(-0.18, 0.002, 0.2), b: V(0.18, 0.002, 0.2), dir: V(0, 0, 1), text: '136' }] };
}
