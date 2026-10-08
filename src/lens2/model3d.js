// A small interactive 3D model for a project page, loaded only when a page
// needs one. The first is the Enovis multipurpose operations center (MPOC):
// generic massing only (the shell, entrances, dock doors and six zones with
// simple stand-in contents), nothing from the real layout. Each section shows
// it its own way, like the page's picture: a daylight view, a hidden-line
// drawing, an exploded clay build, a low dusk shot, a plan, and a digital twin
// with flows. Zones highlight from the legend or on hover.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Metres: about 268 × 70 m, roughly 200K sq ft, 11 m to the roof.
const L = 268;
const D = 70;
const H = 11;
const T = 0.6; // wall thickness

/** The six zones, as fractions of the length (x) and depth (z, 0 = front, 1 = back). */
export const ZONES = [
  { id: 'warehouse', name: 'Warehouse & shipping', rects: [[0, 0.4, 0.04, 1]], tone: '#cdc9c0', fill: 'racks' },
  { id: 'support', name: 'Support work centers', rects: [[0.4, 0.5, 0, 1]], tone: '#c3c9cc', fill: 'benches' },
  { id: 'lab', name: 'Additive & subtractive manufacturing lab', rects: [[0.5, 0.68, 0, 1]], tone: '#b7c3da', fill: 'machines' },
  { id: 'clean', name: 'Clean pack & sterilization', rects: [[0.68, 0.84, 0.3, 1]], tone: '#b9d2cc', fill: 'rooms' },
  { id: 'utilities', name: 'Utilities', rects: [[0.84, 1, 0.55, 1]], tone: '#d8cbb1', fill: 'plant' },
  { id: 'offices', name: 'Offices', rects: [[0.68, 0.84, 0, 0.3], [0.84, 1, 0, 0.55]], tone: '#d8d4cc', fill: 'desks' },
];

// Fractions → world. The front (entrances, office glazing) faces the default camera.
const wx = (f) => -L / 2 + f * L;
const wz = (f) => D / 2 - f * D;

/* ── Looks, one per section ─────────────────────────────────────────────── */

const CAMS = {
  iso: { pos: [118, 168, 330], target: [4, -8, 0] },
  far: { pos: [140, 210, 390], target: [4, 6, 0] },
  top: { pos: [0, 400, 1], target: [0, 0, 0] },
  side: { pos: [-50, 34, -350], target: [0, 4, 0] },
  low: { pos: [150, 12, 120], target: [-40, 9, -6] },
};

const LOOKS = {
  reality: { set: 'shaded', light: 'day', shadow: 0.2, edges: 0.14, roof: 'on', cam: 'iso' },
  structure: { set: 'flat', light: 'day', shadow: 0, edges: 1, roof: 'lift', cam: 'iso' },
  build: { set: 'clay', light: 'day', shadow: 0.2, edges: 0.18, roof: 'explode', cam: 'far' },
  image: { set: 'shaded', light: 'dusk', shadow: 0.42, edges: 0, roof: 'on', cam: 'low' },
  place: { set: 'flat', light: 'day', shadow: 0, edges: 0.55, roof: 'off', cam: 'top' },
  digital: { set: 'ghost', light: 'day', shadow: 0, edges: 0.7, roof: 'off', cam: 'iso', flows: true },
};

/**
 * Mount a model in `host`. `palette(mode)` gives { bg, ink, accent } for a
 * section. Returns { setMode, setHighlight, view, dispose }.
 */
export function createModel(host, { palette, highlight = null, onHover } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'lx-model';
  wrap.innerHTML = `
    <canvas class="lx-model__gl"></canvas>
    <span class="lx-model__label" hidden></span>
    <div class="lx-model__views" role="group" aria-label="Camera">
      <button type="button" data-view="iso">Iso</button><button type="button" data-view="top">Top</button><button type="button" data-view="side">Side</button>
    </div>
    <span class="lx-model__hint">Drag to turn · scroll to zoom</span>`;
  host.appendChild(wrap);
  const canvas = wrap.querySelector('canvas');
  const label = wrap.querySelector('.lx-model__label');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  const camera = new THREE.PerspectiveCamera(30, 1.5, 5, 4000);
  camera.position.set(...CAMS.iso.pos);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 90;
  controls.maxDistance = 900;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.set(0, 0, 0);

  // Lights: a hemisphere fill and a sun that casts the shadows.
  const hemi = new THREE.HemisphereLight(0xffffff, 0xcfc9bf, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -200, right: 200, top: 120, bottom: -120, near: 10, far: 900 });
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target);

  /* ── Materials: one entry per role, in three sets ────────────────────── */
  const roles = {
    wall: '#dedcd6',
    roof: '#3d3d3c',
    slab: '#d9d7d2',
    glass: '#5d6c80',
    door: '#8b96a5',
    rtu: '#b9b8b4',
    content: '#a9a8a4',
  };
  const zoneTone = Object.fromEntries(ZONES.map((z) => [z.id, z.tone]));
  const sets = { shaded: {}, flat: {}, clay: {}, ghost: {} };
  const keyFor = (role, zone) => (zone ? `${role}:${zone}` : role);
  function mat(role, zone) {
    const key = keyFor(role, zone);
    if (!sets.shaded[key]) {
      const color = zone ? (role === 'floor' ? zoneTone[zone] : '#9fa2a6') : roles[role];
      sets.shaded[key] = new THREE.MeshStandardMaterial({ color, roughness: role === 'glass' ? 0.25 : 0.85, metalness: role === 'glass' ? 0.3 : 0 });
      sets.flat[key] = new THREE.MeshBasicMaterial({ color: '#f7f6f3', polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
      sets.clay[key] = new THREE.MeshStandardMaterial({ color: '#d4d3cf', roughness: 1 });
      sets.ghost[key] = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.04, depthWrite: false });
      for (const s of Object.values(sets)) s[key].userData = { role, zone, base: s[key].color.clone() };
    }
    return sets.shaded[key];
  }

  const edgeMat = new THREE.LineBasicMaterial({ color: '#151515', transparent: true, opacity: 1 });
  const meshes = [];
  function add(geo, role, parent, { zone = null, x = 0, y = 0, z = 0, shadow = true } = {}) {
    const m = new THREE.Mesh(geo, mat(role, zone));
    m.position.set(x, y, z);
    m.castShadow = shadow;
    m.receiveShadow = true;
    m.userData = { role, zone };
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), edgeMat);
    e.raycast = () => {};
    m.add(e);
    m.userData.edges = e;
    parent.add(m);
    meshes.push(m);
    return m;
  }
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

  /* ── The building ─────────────────────────────────────────────────────── */
  const building = new THREE.Group();
  scene.add(building);
  const shellGroup = new THREE.Group(); // walls, glazing, doors, vestibules
  const roofGroup = new THREE.Group(); // roof and rooftop units
  const zoneGroup = new THREE.Group();
  building.add(shellGroup, roofGroup, zoneGroup);

  // Footprint, with a notch at the front-left corner.
  const outer = [
    [-L / 2, -D / 2], [L / 2, -D / 2], [L / 2, D / 2], [-L / 2 + 6, D / 2], [-L / 2 + 6, D / 2 - 7], [-L / 2, D / 2 - 7],
  ];
  const inner = [
    [-L / 2 + T, -D / 2 + T], [L / 2 - T, -D / 2 + T], [L / 2 - T, D / 2 - T], [-L / 2 + 6 + T, D / 2 - T], [-L / 2 + 6 + T, D / 2 - 7 - T], [-L / 2 + T, D / 2 - 7 - T],
  ];
  const toShape = (pts) => {
    const s = new THREE.Shape();
    pts.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)));
    s.closePath();
    return s;
  };
  const extrude = (shape, depth) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return g;
  };
  const wallShape = toShape(outer);
  wallShape.holes.push(new THREE.Path(inner.map(([x, z]) => new THREE.Vector2(x, -z))));
  add(extrude(wallShape, H + 1.2), 'wall', shellGroup);
  add(extrude(toShape(outer), 0.4), 'slab', building, { y: -0.4, shadow: false });
  add(extrude(toShape(inner), 0.6), 'roof', roofGroup, { y: H });

  // Rooftop units over the production and office end.
  for (let i = 0; i < 8; i++) add(box(5, 2.4, 3), 'rtu', roofGroup, { x: wx(0.52 + i * 0.058), y: H + 1.8, z: (i % 2 ? -1 : 1) * 14 });

  // Entrances: two glazed vestibules on the front.
  for (const f of [0.27, 0.6]) {
    add(box(16, 5.5, 6), 'wall', shellGroup, { x: wx(f), y: 2.75, z: D / 2 + 3 });
    add(box(13, 3.4, 0.3), 'glass', shellGroup, { x: wx(f), y: 2.2, z: D / 2 + 6.1, shadow: false });
  }
  // Office glazing: two bands along the front of the office end.
  for (const y of [3, 7.4]) add(box(L * 0.3, 1.7, 0.3), 'glass', shellGroup, { x: wx(0.845), y, z: D / 2 + 0.1, shadow: false });
  // Dock doors along the back of the warehouse, and two service doors.
  for (let i = 0; i < 14; i++) add(box(3.4, 3.8, 0.3), 'door', shellGroup, { x: wx(0.035 + i * 0.025), y: 1.9, z: -D / 2 - 0.1, shadow: false });
  for (const f of [0.88, 0.93]) add(box(3.4, 3.8, 0.3), 'door', shellGroup, { x: wx(f), y: 1.9, z: -D / 2 - 0.1, shadow: false });

  /* ── Zones: a tinted floor and simple stand-in contents each ──────────── */
  const zoneInfo = new Map();
  for (const zn of ZONES) {
    const g = new THREE.Group();
    g.userData.zone = zn.id;
    zoneGroup.add(g);
    let cx = 0;
    let cz = 0;
    let area = 0;
    for (const [x0, x1, z0, z1] of zn.rects) {
      const w = (x1 - x0) * L - 2.4;
      const d = (z1 - z0) * D - 2.4;
      const x = wx((x0 + x1) / 2);
      const z = wz((z0 + z1) / 2);
      add(box(w, 0.25, d), 'floor', g, { zone: zn.id, x, y: 0.13, z, shadow: false });
      fillZone(g, zn, x, z, w, d);
      cx += x * w * d;
      cz += z * w * d;
      area += w * d;
    }
    zoneInfo.set(zn.id, { group: g, center: new THREE.Vector3(cx / area, 6, cz / area) });
  }

  function fillZone(g, zn, x, z, w, d) {
    const put = (bw, bh, bd, px, pz) => add(box(bw, bh, bd), 'content', g, { zone: zn.id, x: px, y: bh / 2 + 0.25, z: pz });
    if (zn.fill === 'racks') {
      const rows = Math.floor(w / 6.5);
      for (let i = 0; i < rows; i++) put(1.4, 7.5, d - 16, x - w / 2 + 4 + i * 6.5, z + 3);
    } else if (zn.fill === 'benches') {
      for (let i = 0; i < 3; i++) for (let j = 0; j < 5; j++) put(4, 1.1, 1.6, x - w / 2 + 6 + i * 8, z - d / 2 + 8 + j * 11);
    } else if (zn.fill === 'machines') {
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) put(5.5, 3 + ((i + j) % 3), 5, x - w / 2 + 7 + i * 11, z - d / 2 + 10 + j * 22);
    } else if (zn.fill === 'rooms') {
      for (let i = 0; i < 3; i++) put(11, 4.2, d - 12, x - w / 2 + 7.5 + i * 13.5, z);
    } else if (zn.fill === 'plant') {
      for (let i = 0; i < 2; i++) {
        const tank = add(new THREE.CylinderGeometry(2.6, 2.6, 7, 24), 'content', g, { zone: zn.id, x: x - w / 2 + 6 + i * 7, y: 3.75, z: z - 4 });
        tank.userData.zone = zn.id;
      }
      for (let i = 0; i < 3; i++) put(6, 2.8, 4, x + 2 + i * 7.5 - w / 4, z + 9);
    } else if (zn.fill === 'desks') {
      const cols = Math.floor((w - 6) / 6);
      const rows = Math.floor((d - 6) / 5);
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) put(3.2, 0.9, 1.6, x - w / 2 + 6 + i * 6, z - d / 2 + 5 + j * 5);
    }
  }

  // Ground: catches shadows only.
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.16 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.41;
  ground.receiveShadow = true;
  scene.add(ground);

  /* ── Digital twin: materials flowing between zones ────────────────────── */
  const flowGroup = new THREE.Group();
  scene.add(flowGroup);
  const route = ['warehouse', 'support', 'lab', 'clean', 'warehouse'];
  const flowMat = new THREE.LineBasicMaterial({ color: '#93adf5', transparent: true, opacity: 0.8 });
  const packetMat = new THREE.MeshBasicMaterial({ color: '#93adf5' });
  const flows = [];
  for (let i = 0; i < route.length - 1; i++) {
    const a = zoneInfo.get(route[i]).center.clone().setY(9);
    const b = zoneInfo.get(route[i + 1]).center.clone().setY(9);
    const mid = a.clone().lerp(b, 0.5).setY(9 + a.distanceTo(b) * 0.22);
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    flowGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)), flowMat));
    const packets = [0, 0.33, 0.66].map((o) => {
      const p = new THREE.Mesh(new THREE.SphereGeometry(1.3, 12, 8), packetMat);
      flowGroup.add(p);
      return { mesh: p, o };
    });
    flows.push({ curve, packets });
  }

  /* ── State ────────────────────────────────────────────────────────────── */
  let mode = 'reality';
  let look = LOOKS.reality;
  let pinned = highlight;
  let hovered = null;
  const tween = {
    cam: new THREE.Vector3(...CAMS.iso.pos),
    target: new THREE.Vector3(),
    roofY: H,
    shellY: 0,
    roofOpacity: 1,
    moving: false,
  };
  let raf = 0;
  let last = performance.now();
  let alive = true;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function goTo(name) {
    const c = CAMS[name];
    tween.cam.set(...c.pos);
    tween.target.set(...c.target);
    tween.moving = true;
    if (reduced) {
      camera.position.copy(tween.cam);
      controls.target.copy(tween.target);
    }
  }

  function roofState() {
    const zoneShown = pinned || hovered;
    const r = look.roof;
    if (r === 'explode') return { y: H + 30, shell: 9, opacity: 1, visible: true };
    if (r === 'off') return { y: H, shell: 0, opacity: 0, visible: false };
    if (r === 'lift') return { y: H + 22, shell: 0, opacity: 0, visible: false };
    // Roof on: it lifts away when a zone is being looked at.
    return zoneShown ? { y: H + 26, shell: 0, opacity: 0.22, visible: true } : { y: H, shell: 0, opacity: 1, visible: true };
  }

  function applyLook() {
    const pal = palette(mode);
    const set = sets[look.set];
    for (const m of meshes) {
      m.material = set[keyFor(m.userData.role, m.userData.zone)];
      m.userData.edges.visible = look.edges > 0;
    }
    edgeMat.color.set(pal.ink);
    edgeMat.opacity = look.edges;
    groundMat.opacity = look.shadow;
    sun.castShadow = look.shadow > 0;
    flowGroup.visible = !!look.flows;
    flowMat.color.set(pal.accent);
    packetMat.color.set(pal.accent);
    for (const s of Object.values(sets.flat)) s.color.set(pal.bg).lerp(new THREE.Color('#ffffff'), 0.35);
    for (const s of Object.values(sets.ghost)) s.color.set(pal.ink);
    if (look.light === 'dusk') {
      // Low, warm sun from the side and little fill: long shadows, darker faces.
      hemi.intensity = 0.12;
      scene.environmentIntensity = 0.18;
      sun.color.set('#ffcf98');
      sun.intensity = 3.2;
      sun.position.set(330, 38, 60);
      renderer.toneMappingExposure = 0.9;
    } else {
      // Sun from the front-left: the long front face lit, the end walls in shade.
      hemi.intensity = 0.55;
      scene.environmentIntensity = 0.55;
      sun.color.set('#ffffff');
      sun.intensity = 2.1;
      sun.position.set(-170, 240, 210);
      renderer.toneMappingExposure = 1.0;
    }
    applyHighlight();
  }

  function applyHighlight() {
    const on = pinned || hovered;
    const pal = palette(mode);
    const accent = new THREE.Color(pal.accent);
    for (const [key, m] of Object.entries(sets[look.set])) {
      const { zone, base } = m.userData;
      if (!zone) continue;
      const hot = zone === on;
      if (look.set === 'ghost') {
        m.color.copy(hot ? accent : new THREE.Color(pal.ink));
        m.opacity = hot ? 0.45 : 0.04;
      } else if (look.set === 'flat') {
        m.color.copy(hot ? accent.clone().lerp(new THREE.Color('#ffffff'), 0.55) : new THREE.Color(pal.bg).lerp(new THREE.Color('#ffffff'), 0.35));
      } else {
        m.color.copy(hot ? accent : base);
        m.transparent = !!on && !hot;
        m.opacity = on && !hot ? 0.35 : 1;
        m.depthWrite = !(on && !hot);
      }
      m.needsUpdate = true;
      void key;
    }
    label.hidden = !on;
    if (on) label.textContent = ZONES.find((z) => z.id === on).name;
    onHover?.(on);
  }

  /** Switch to section `m`'s look and camera. */
  function setMode(m) {
    mode = m;
    look = LOOKS[m] ?? LOOKS.reality;
    applyLook();
    goTo(look.cam);
    kick();
  }

  function setHighlight(zoneId, pin = true) {
    if (pin) pinned = zoneId;
    else hovered = zoneId;
    applyHighlight();
    kick();
  }

  /* ── Interaction ──────────────────────────────────────────────────────── */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let downAt = null;
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(zoneGroup.children, true).find((h) => h.object.userData.zone);
    const z = hit?.object.userData.zone ?? null;
    if (z !== hovered) {
      hovered = z;
      canvas.style.cursor = z ? 'pointer' : 'grab';
      applyHighlight();
      kick();
    }
  });
  canvas.addEventListener('pointerleave', () => {
    if (hovered) {
      hovered = null;
      applyHighlight();
      kick();
    }
  });
  canvas.addEventListener('pointerdown', (e) => (downAt = [e.clientX, e.clientY]));
  canvas.addEventListener('click', (e) => {
    if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
    pinned = hovered && hovered !== pinned ? hovered : null;
    applyHighlight();
    kick();
  });
  wrap.querySelector('.lx-model__views').addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]');
    if (b) {
      goTo(b.dataset.view);
      kick();
    }
  });
  controls.addEventListener('start', () => (tween.moving = false));
  controls.addEventListener('change', kick);

  /* ── Frame loop (runs while something moves) ──────────────────────────── */
  function resize() {
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    kick();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(wrap);

  function frame(now) {
    raf = 0;
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const k = reduced ? 1 : 1 - Math.exp(-dt * 5);
    let busy = false;
    if (tween.moving) {
      camera.position.lerp(tween.cam, k);
      controls.target.lerp(tween.target, k);
      if (camera.position.distanceTo(tween.cam) < 0.5 && controls.target.distanceTo(tween.target) < 0.2) tween.moving = false;
      busy = true;
    }
    const rs = roofState();
    const ease = (from, to) => from + (to - from) * k;
    tween.roofY = ease(tween.roofY, rs.y);
    tween.shellY = ease(tween.shellY, rs.shell);
    tween.roofOpacity = ease(tween.roofOpacity, rs.visible ? rs.opacity : 0);
    roofGroup.position.y = tween.roofY - H;
    shellGroup.position.y = tween.shellY;
    roofGroup.visible = tween.roofOpacity > 0.02;
    for (const m of roofGroup.children) {
      const mm = m.material;
      const fade = tween.roofOpacity < 0.99;
      if (mm.transparent !== fade || (fade && Math.abs(mm.opacity - tween.roofOpacity) > 0.005)) {
        mm.transparent = fade || look.set === 'ghost';
        mm.opacity = look.set === 'ghost' ? 0.04 : tween.roofOpacity;
        mm.depthWrite = !fade;
      }
      m.userData.edges.visible = look.edges > 0 && tween.roofOpacity > 0.5;
    }
    if (Math.abs(tween.roofY - rs.y) > 0.05 || Math.abs(tween.shellY - rs.shell) > 0.05 || Math.abs(tween.roofOpacity - (rs.visible ? rs.opacity : 0)) > 0.01) busy = true;
    if (look.flows) {
      const t = now / 4000;
      for (const f of flows) for (const p of f.packets) p.mesh.position.copy(f.curve.getPoint((t + p.o) % 1));
      busy = true;
    }
    if (controls.update()) busy = true;
    // The highlighted zone's name rides above it.
    const on = pinned || hovered;
    if (on) {
      const v = zoneInfo.get(on).center.clone().setY(14).project(camera);
      label.style.transform = `translate(${(((v.x + 1) / 2) * wrap.clientWidth).toFixed(1)}px, ${(((1 - v.y) / 2) * wrap.clientHeight).toFixed(1)}px)`;
    }
    renderer.render(scene, camera);
    if (busy) kick();
  }
  function kick() {
    if (!raf && alive) raf = requestAnimationFrame(frame);
  }

  resize();
  applyLook();
  kick();

  return {
    el: wrap,
    setMode,
    setHighlight,
    get highlighted() {
      return pinned;
    },
    view: (name) => {
      goTo(name);
      kick();
    },
    dispose() {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose();
      });
      for (const s of Object.values(sets)) for (const m of Object.values(s)) m.dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      wrap.remove();
    },
  };
}
