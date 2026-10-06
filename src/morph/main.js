import '../shared/base.css';
import './style.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mountChrome, mountSwitcher, prefersReducedMotion } from '../shared/chrome.js';
import { items, modes } from '../content.js';
import { Tween, ease, clamp, smoothstep, hexToRgb, rgbToCss, hashString } from '../anim.js';
import { loadLandMask } from '../shared/geo.js';
import {
  N,
  EDGE,
  TRI_H,
  FLOOR,
  makePlateGeometry,
  makeOutlineGeometry,
  buildIco,
  unfoldMatrices,
  locateOnIco,
  archSlots,
  archSpare,
  robotSlots,
  benchSlots,
  helixSlots,
  screenSlots,
} from './geometry.js';
import { shared, createPlateMaterial } from './plateMaterial.js';

mountChrome('morph');

const reduced = prefersReducedMotion();
const byId = new Map(items.map((it) => [it.id, it]));
const DEG = Math.PI / 180;

/* ── Renderer & scene ─────────────────────────────────────────────────────── */

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.className = 'stage';
renderer.domElement.setAttribute('aria-hidden', 'true');
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 500);

const key = new THREE.DirectionalLight('#ffffff', 2);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 40 });
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;
const hemi = new THREE.HemisphereLight('#ffffff', '#7a6e60', 0.5);
scene.add(key, key.target, hemi);

const floorMat = new THREE.ShadowMaterial({ opacity: 0.3 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = FLOOR;
floor.receiveShadow = true;
scene.add(floor);

/* ── The twenty plates ────────────────────────────────────────────────────── */

const ico = buildIco();
const { slots: SCREEN, size: SCREEN_SIZE } = screenSlots();
const plateGeo = makePlateGeometry();
const outlineGeo = makeOutlineGeometry();
const outlineMat = new THREE.LineBasicMaterial({ color: '#14212d', transparent: true, opacity: 0 });

const plates = ico.faces.map((face, i) => {
  const s = SCREEN[i].screen;
  const c = Math.cos(s.rot);
  const sn = Math.sin(s.rot);
  const sx = SCREEN_SIZE.x;
  const sy = SCREEN_SIZE.y;
  // Plate-local xy → shared screen UV, so the UI only resolves when tiled.
  const screenM = new THREE.Matrix3().set(c / sx, -sn / sx, s.x / sx, sn / sy, c / sy, s.y / sy, 0, 0, 1);
  const mesh = new THREE.Mesh(plateGeo, createPlateMaterial(face, screenM));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false;
  const outline = new THREE.LineSegments(outlineGeo, outlineMat);
  mesh.add(outline);
  scene.add(mesh);
  return {
    i,
    face,
    mesh,
    pos: face.closedPos.clone(),
    quat: face.closedQuat.clone(),
    fromPos: new THREE.Vector3(),
    fromQuat: new THREE.Quaternion(),
    tPos: new THREE.Vector3(),
    tQuat: new THREE.Quaternion(),
    delay: 0,
  };
});

loadLandMask(2048).then(({ canvas }) => {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearFilter;
  shared.uLandTex.value = t;
});
shared.uScreenTex.value = screenTexture();

/* ── Formations (targets for each state) ──────────────────────────────────── */

const ARCH = [...archSlots(), archSpare()];
const BENCH = benchSlots();
const CLOSED_Y = 0.15;
const unfoldOut = Array.from({ length: N }, () => new THREE.Matrix4());
const unfoldU = new Array(N).fill(0);

// Present the net facing the camera: map the root face's plane onto XY.
const PRESENT = (() => {
  const r = ico.faces[ico.tree.root];
  const [A, B, C] = r.v.map((k) => ico.verts[k]);
  const netC = new THREE.Vector2(2.75 * EDGE, -0.5 * TRI_H);
  const [PA, PB, PC] = r.net.map((p) => p.clone().sub(netC));
  const d1 = PB.clone().sub(PA);
  const d2 = PC.clone().sub(PA);
  const det = d1.x * d2.y - d1.y * d2.x;
  const v1 = B.clone().sub(A);
  const v2 = C.clone().sub(A);
  // Solve L·d = v for the 2D→3D linear map L = [ex ey].
  const ex = v1.clone().multiplyScalar(d2.y / det).add(v2.clone().multiplyScalar(-d1.y / det));
  const ey = v1.clone().multiplyScalar(-d2.x / det).add(v2.clone().multiplyScalar(d1.x / det));
  const n = ex.clone().cross(ey).normalize();
  const O = A.clone().sub(ex.clone().multiplyScalar(PA.x)).sub(ey.clone().multiplyScalar(PA.y));
  const M = new THREE.Matrix4().makeBasis(ex.normalize(), ey.normalize(), n).setPosition(O);
  return new THREE.Matrix4().makeTranslation(0, 0.12, 0).multiply(M.invert());
})();

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);

function closedPose(p, spin, out) {
  tmpQ.setFromAxisAngle(Y, spin);
  out.pos.copy(p.face.closedPos).applyQuaternion(tmpQ);
  out.pos.y += CLOSED_Y;
  out.quat.copy(tmpQ).multiply(p.face.closedQuat);
}

const EXPLODE_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.35, 0.5, 0));
function explodedPose(p, out) {
  out.pos.copy(p.face.closedPos).addScaledVector(p.face.normal, 0.55).applyQuaternion(EXPLODE_Q);
  out.pos.y += CLOSED_Y + 0.1;
  out.quat.copy(EXPLODE_Q).multiply(p.face.closedQuat);
}

function netPose(p, out) {
  tmpM.copy(PRESENT).multiply(unfoldOut[p.i]).multiply(p.face.closedMatrix);
  tmpM.decompose(out.pos, out.quat, tmpS);
}

const BUILDS = [
  { id: 'facility', name: 'An arch', slots: () => ARCH },
  { id: 'cell', name: 'A robot arm', slots: (t) => robotSlots(Math.sin(t * 0.9)) },
  { id: 'bench', name: 'A workbench', slots: () => BENCH },
];

/* ── State config ─────────────────────────────────────────────────────────── */

const STATES = {
  reality: {
    title: 'The original object',
    caption: 'Twenty plates. Closed, they are one simple thing — and, if you look closely, a globe.',
    cam: { az: -22, el: 16, fov: 30, w: 3.6, h: 3.4, ty: 0.05 },
    pal: { bg: '#ece6dc', ink: '#1f1b17', muted: '#857c70', accent: '#b4532b' },
    mat: { plate: '#f2ede4', side: '#d7cdbd', map: 0, hint: 0.55, ui: 0, rough: 0.55, metal: 0, roughSide: 0.6, metalSide: 0 },
    light: { key: 2.4, keyPos: [-3, 6, 4], hemi: 0.55, floor: 0.26, env: 0.8 },
    outline: 0,
  },
  structure: {
    title: 'Exploded assembly',
    caption: 'Every plate pulled out along its normal. Twenty identical parts, one fixture.',
    cam: { az: 32, el: 22, fov: 2.4, w: 5.4, h: 4.6, ty: 0.25 },
    pal: { bg: '#eef1f2', ink: '#14212d', muted: '#66737f', accent: '#d2382b' },
    mat: { plate: '#ffffff', side: '#e4e9ec', map: 0, hint: 0, ui: 0, rough: 0.9, metal: 0, roughSide: 0.9, metalSide: 0 },
    light: { key: 0.6, keyPos: [-2, 8, 5], hemi: 2.2, floor: 0.06, env: 0.3 },
    outline: 1,
  },
  build: {
    title: 'Things that were built',
    caption: 'The same plates rebuild into the things on the workbench.',
    cam: { az: 14, el: 14, fov: 28, w: 8.6, h: 5.4, ty: 0.6 },
    pal: { bg: '#232426', ink: '#ebe7df', muted: '#9a958c', accent: '#ff6b1a' },
    mat: { plate: '#d9d4cb', side: '#ff6b1a', map: 0, hint: 0, ui: 0, rough: 0.7, metal: 0.05, roughSide: 0.5, metalSide: 0 },
    light: { key: 2.6, keyPos: [-4, 7, 5], hemi: 0.45, floor: 0.45, env: 0.6 },
    outline: 0,
  },
  image: {
    title: 'A sculpture',
    caption: 'Fanned into a column and turned toward the light.',
    cam: { az: -34, el: 6, fov: 24, w: 3.4, h: 4.4, ty: 0.3 },
    pal: { bg: '#0b0a09', ink: '#efe7da', muted: '#8d8578', accent: '#e3b373' },
    mat: { plate: '#2b2825', side: '#c9a46a', map: 0, hint: 0, ui: 0, rough: 0.28, metal: 0.85, roughSide: 0.25, metalSide: 1 },
    light: { key: 5.2, keyPos: [4.5, 3.2, 2.2], hemi: 0.04, floor: 0.6, env: 0.35 },
    outline: 0,
  },
  place: {
    title: 'A world map',
    caption: 'Unfolded along nineteen hinges, the object is an icosahedral map of the world — Buckminster Fuller’s trick.',
    cam: { az: 0, el: 3, fov: 26, w: 6.4, h: 3.4, ty: 0.12 },
    pal: { bg: '#0a1324', ink: '#d8e3f3', muted: '#7d8da6', accent: '#ffb648' },
    mat: { plate: '#12233d', side: '#0d1a2e', map: 1, hint: 0, ui: 0, rough: 0.8, metal: 0, roughSide: 0.7, metalSide: 0 },
    light: { key: 1.2, keyPos: [-1, 6, 6], hemi: 1.1, floor: 0.3, env: 0.5 },
    outline: 0,
  },
  digital: {
    title: 'A screen',
    caption: 'Triangles tile into a display. The interface only resolves when every plate is in place.',
    cam: { az: 0, el: 2, fov: 22, w: 7.0, h: 2.6, ty: 0.15 },
    pal: { bg: '#040706', ink: '#c9f7df', muted: '#5f8f76', accent: '#5cf2b0' },
    mat: { plate: '#040806', side: '#0e2a1c', map: 0, hint: 0, ui: 1, rough: 0.55, metal: 0, roughSide: 0.6, metalSide: 0 },
    light: { key: 0.4, keyPos: [0, 6, 6], hemi: 0.3, floor: 0.25, env: 0.2 },
    outline: 0,
  },
};

/* ── Tweened look ─────────────────────────────────────────────────────────── */

const T = {
  az: new Tween(0),
  el: new Tween(0),
  fov: new Tween(Math.log(30)),
  w: new Tween(Math.log(4)),
  h: new Tween(Math.log(4)),
  ty: new Tween(0),
  bg: new Tween(hexToRgb('#ece6dc')),
  ink: new Tween(hexToRgb('#1f1b17')),
  muted: new Tween(hexToRgb('#857c70')),
  accent: new Tween(hexToRgb('#b4532b')),
  plate: new Tween(hexToRgb('#f2ede4')),
  side: new Tween(hexToRgb('#d7cdbd')),
  map: new Tween(0),
  hint: new Tween(0),
  ui: new Tween(0),
  rough: new Tween(0.55),
  metal: new Tween(0),
  roughSide: new Tween(0.6),
  metalSide: new Tween(0),
  key: new Tween(2),
  keyPos: new Tween([-3, 6, 4]),
  hemi: new Tween(0.5),
  floor: new Tween(0.3),
  env: new Tween(0.8),
  outline: new Tween(0),
};

let state = 'reality';
let stateT0 = 0;
let stateDur = 1;
let buildIndex = 0;
let buildT0 = 0;
const now = () => performance.now() / 1000;

function setState(id, { instant = false } = {}) {
  const t = now();
  state = id;
  document.body.dataset.mode = id;
  stateT0 = t;
  stateDur = instant ? 0.001 : reduced ? 0.35 : id === 'place' ? 2.8 : 2.0;
  const s = STATES[id];
  const d = instant ? 0 : reduced ? 0.35 : 1.8;
  T.az.set(s.cam.az, t, d);
  T.el.set(s.cam.el, t, d);
  T.fov.set(Math.log(s.cam.fov), t, d);
  T.w.set(Math.log(s.cam.w), t, d);
  T.h.set(Math.log(s.cam.h), t, d);
  T.ty.set(s.cam.ty, t, d);
  for (const k of ['bg', 'ink', 'muted', 'accent']) T[k].set(hexToRgb(s.pal[k]), t, d * 0.8, d * 0.1, ease.inOutSine);
  T.plate.set(hexToRgb(s.mat.plate), t, d);
  T.side.set(hexToRgb(s.mat.side), t, d);
  for (const k of ['rough', 'metal', 'roughSide', 'metalSide']) T[k].set(s.mat[k], t, d);
  // Map and UI layers arrive late, once the plates are nearly in place.
  T.map.set(s.mat.map, t, d * 0.6, s.mat.map > 0 ? d * 0.5 : 0);
  T.ui.set(s.mat.ui, t, d * 0.6, s.mat.ui > 0 ? d * 0.75 : 0);
  T.hint.set(s.mat.hint, t, d);
  T.key.set(s.light.key, t, d);
  T.keyPos.set(s.light.keyPos, t, d);
  T.hemi.set(s.light.hemi, t, d);
  T.floor.set(s.light.floor, t, d);
  T.env.set(s.light.env, t, d);
  T.outline.set(s.outline, t, d * 0.6, s.outline ? d * 0.6 : 0);
  if (id === 'build') {
    buildIndex = 0;
    buildT0 = t;
  }
  beginMove(t, id);
  renderCaption();
}

// Capture where every plate is; give each its own delay so the move ripples.
function beginMove(t, id) {
  const order = [...plates].sort((a, b) => a.pos.y - b.pos.y || a.pos.x - b.pos.x);
  order.forEach((p, k) => {
    p.fromPos.copy(p.pos);
    p.fromQuat.copy(p.quat);
    p.delay = reduced ? 0 : (k / N) * (id === 'place' ? 0.25 : 0.45);
  });
}

/* ── Per-frame targets ────────────────────────────────────────────────────── */

const tgt = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
function target(p, t) {
  switch (state) {
    case 'reality':
      closedPose(p, t * 0.18, tgt);
      break;
    case 'structure':
      explodedPose(p, tgt);
      break;
    case 'build': {
      const slot = BUILDS[buildIndex].slots(t)[p.i];
      tgt.pos.copy(slot.pos);
      tgt.quat.copy(slot.quat);
      break;
    }
    case 'image': {
      const slot = helixSlots(t * 0.15)[p.i];
      tgt.pos.copy(slot.pos);
      tgt.quat.copy(slot.quat);
      break;
    }
    case 'place':
      netPose(p, tgt);
      break;
    case 'digital': {
      const s = SCREEN[p.i];
      tgt.pos.copy(s.pos);
      tgt.pos.y += 0.15;
      tgt.quat.copy(s.quat);
      break;
    }
  }
  return tgt;
}

function updatePlates(t) {
  // Place: fold the net open hinge by hinge, parents first, after the plates gather.
  if (state === 'place') {
    const local = t - stateT0;
    for (let i = 0; i < N; i++) {
      const dpt = ico.tree.depth[i];
      unfoldU[i] = ease.inOutCubic(clamp((local - stateDur * 0.38 - dpt * 0.14) / 0.9));
    }
    unfoldMatrices(ico, unfoldU, unfoldOut);
  }
  const span = Math.max(0.001, stateDur * (state === 'place' ? 0.45 : 0.78));
  for (const p of plates) {
    const tg = target(p, t);
    const e = ease.inOutCubic(clamp((t - stateT0 - p.delay) / span));
    if (e >= 1) {
      p.pos.copy(tg.pos);
      p.quat.copy(tg.quat);
    } else {
      p.pos.lerpVectors(p.fromPos, tg.pos, e);
      // Lift along the way so the plates arc instead of sliding through each other.
      p.pos.y += Math.sin(Math.PI * e) * 0.35;
      p.quat.slerpQuaternions(p.fromQuat, tg.quat, e);
    }
    p.mesh.matrix.compose(p.pos, p.quat, tmpS.set(1, 1, 1));
    p.mesh.matrixWorldNeedsUpdate = true;
  }
}

/* ── Camera ───────────────────────────────────────────────────────────────── */

const view = { W: innerWidth, H: innerHeight };
const orbit = { az: 0, el: 0, dragging: false, px: 0, py: 0, tx: 0, ty: 0 };
function updateCamera(dt) {
  if (!orbit.dragging) {
    orbit.az *= 1 - Math.min(1, dt * 2.5);
    orbit.el *= 1 - Math.min(1, dt * 2.5);
  }
  const mobile = view.W < 760;
  const aspect = view.W / view.H;
  const fov = Math.exp(T.fov.value);
  const freeH = view.H - (mobile ? 260 : 220);
  const fh = Math.max(Math.exp(T.h.value), Math.exp(T.w.value) / aspect) * (view.H / Math.max(200, freeH));
  const dist = fh / (2 * Math.tan((fov * DEG) / 2));
  const still = state === 'structure' || state === 'place' || state === 'digital' ? 0.3 : 1;
  const az = (T.az.value + orbit.az + orbit.tx * 3 * still) * DEG;
  const el = clamp(T.el.value + orbit.el - orbit.ty * 2 * still, -10, 80) * DEG;
  const tgtY = T.ty.value;
  camera.position.set(dist * Math.cos(el) * Math.sin(az), tgtY + dist * Math.sin(el), dist * Math.cos(el) * Math.cos(az));
  camera.lookAt(0, tgtY, 0);
  camera.fov = fov;
  camera.aspect = aspect;
  camera.near = Math.max(0.05, dist - 20);
  camera.far = dist + 30;
  const top = mobile ? 170 : 130;
  const bottom = mobile ? 90 : 90;
  camera.setViewOffset(view.W, view.H, 0, (bottom - top) / 2, view.W, view.H);
  camera.updateProjectionMatrix();
}

/* ── HTML: caption, balloons, pins, build label ───────────────────────────── */

const el = (tag, cls, parent = document.body, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  parent.appendChild(n);
  return n;
};
const caption = el('header', 'mo-caption');
caption.innerHTML = `<span class="mo-caption__k"></span><h1 class="mo-caption__t"></h1><p class="mo-caption__p"></p>`;
const capK = caption.querySelector('.mo-caption__k');
const capT = caption.querySelector('.mo-caption__t');
const capP = caption.querySelector('.mo-caption__p');

function renderCaption() {
  const md = modes.find((m) => m.id === state);
  const s = STATES[state];
  capK.textContent = `${md.section} · ${md.name}`;
  if (state === 'build') {
    const b = BUILDS[buildIndex];
    capT.textContent = b.name;
    capP.textContent = `${byId.get(b.id).title} — ${byId.get(b.id).lens.build}`;
  } else {
    capT.textContent = s.title;
    capP.textContent = s.caption;
  }
  caption.classList.remove('is-in');
  void caption.offsetWidth;
  caption.classList.add('is-in');
}

const overlay = el('div', 'mo-overlay');
overlay.setAttribute('aria-hidden', 'true');
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
svg.classList.add('mo-leaders');
overlay.appendChild(svg);

const BALLOON_FACES = [0, 3, 7, 11, 14, 18];
const balloons = BALLOON_FACES.map((f, k) => {
  const n = el('span', 'mo-balloon', overlay, `<b>${String(f + 1).padStart(2, '0')}</b>${k === 0 ? 'Plate · t 5 mm' : k === 1 ? '× 20 identical' : ''}`);
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  line.setAttribute('class', 'mo-leader');
  svg.appendChild(line);
  return { f, n, line, off: [k % 2 ? 90 : -90, -60 + (k % 3) * 40] };
});

const PINS = [
  { id: 'home', title: 'Home base', place: byId.get('facility').place },
  ...items.filter((it) => it.kind === 'travel').map((it) => ({ id: it.id, title: it.title, place: it.place })),
].map((p) => {
  const loc = locateOnIco(ico, p.place.lat, p.place.lon);
  const { lat, lon } = p.place;
  const n = el(
    'span',
    'mo-pin',
    overlay,
    `<i></i><b>${p.title}</b>${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`,
  );
  return { ...p, loc, n };
});

const APP_LABELS = items
  .filter((it) => it.kind === 'app')
  .map((it, k) => ({ it, n: el('span', 'mo-app', overlay, `<b>${it.title}</b>${it.stage} · ${it.years[0]}`), u: 0.25 + k * 0.25 }));

const proj = new THREE.Vector3();
function toScreen(v) {
  proj.copy(v).project(camera);
  return [(proj.x * 0.5 + 0.5) * view.W, (-proj.y * 0.5 + 0.5) * view.H];
}
const put = (n, x, y, o) => {
  n.style.opacity = o.toFixed(3);
  n.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
};
const pathOpacity = (p, o) => {
  p.setAttribute('stroke-opacity', o.toFixed(3));
  p.style.display = o < 0.003 ? 'none' : '';
};

function updateOverlay(t) {
  const settled = smoothstep(0.75, 1, (t - stateT0) / stateDur);
  const ob = state === 'structure' ? settled : 0;
  for (const b of balloons) {
    const p = plates[b.f];
    tmpV.set(0, 0, 0.03).applyMatrix4(p.mesh.matrix);
    const [x, y] = toScreen(tmpV);
    const nx = x + b.off[0];
    const ny = y + b.off[1];
    put(b.n, nx, ny, ob);
    pathOpacity(b.line, ob);
    b.line.setAttribute('d', `M${x.toFixed(1)},${y.toFixed(1)} L${nx.toFixed(1)},${ny.toFixed(1)}`);
  }
  const op = state === 'place' ? smoothstep(0.85, 1, (t - stateT0) / stateDur) * T.map.value : 0;
  for (const p of PINS) {
    if (!p.loc) continue;
    tmpV.copy(p.loc.local).applyMatrix4(plates[p.loc.face].mesh.matrix);
    const [x, y] = toScreen(tmpV);
    put(p.n, x, y, op);
  }
  const oa = state === 'digital' ? T.ui.value : 0;
  for (const a of APP_LABELS) {
    tmpV.set((a.u - 0.5) * SCREEN_SIZE.x, -SCREEN_SIZE.y / 2 - 0.12 + 0.15, 0);
    const [x, y] = toScreen(tmpV);
    put(a.n, x, y, oa);
  }
}

/* ── Interaction ──────────────────────────────────────────────────────────── */

const canvas = renderer.domElement;
canvas.addEventListener('pointerdown', (e) => {
  orbit.dragging = true;
  orbit.px = e.clientX;
  orbit.py = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  orbit.tx = (e.clientX / view.W - 0.5) * 2;
  orbit.ty = (e.clientY / view.H - 0.5) * 2;
  if (!orbit.dragging) return;
  orbit.az = clamp(orbit.az - (e.clientX - orbit.px) * 0.3, -60, 60);
  orbit.el = clamp(orbit.el + (e.clientY - orbit.py) * 0.2, -10, 35);
  orbit.px = e.clientX;
  orbit.py = e.clientY;
});
canvas.addEventListener('pointerup', () => (orbit.dragging = false));
addEventListener('resize', () => {
  view.W = innerWidth;
  view.H = innerHeight;
  renderer.setSize(view.W, view.H);
});

/* ── Loop ─────────────────────────────────────────────────────────────────── */

const tmpC = new THREE.Color();
let last = performance.now();
function frame() {
  const nowMs = performance.now();
  const dt = Math.min(0.05, (nowMs - last) / 1000);
  last = nowMs;
  const t = nowMs / 1000;
  for (const k in T) T[k].update(t);

  // Projects: cycle through the builds while the section is open.
  if (state === 'build' && !reduced && t - buildT0 > 6) {
    buildIndex = (buildIndex + 1) % BUILDS.length;
    buildT0 = t;
    stateT0 = t;
    stateDur = 2;
    beginMove(t, 'build');
    renderCaption();
  }

  const bg = T.bg.value;
  const ink = T.ink.value;
  renderer.setClearColor(tmpC.setRGB(bg[0], bg[1], bg[2], THREE.SRGBColorSpace));
  document.body.style.cssText = `--bg:${rgbToCss(bg)};--ink:${rgbToCss(ink)};--muted:${rgbToCss(T.muted.value)};--accent:${rgbToCss(
    T.accent.value,
  )};--line:${rgbToCss(ink, 0.14)}`;

  shared.uPlate.value.setRGB(...T.plate.value, THREE.SRGBColorSpace);
  shared.uSide.value.setRGB(...T.side.value, THREE.SRGBColorSpace);
  shared.uMap.value = T.map.value;
  shared.uHint.value = T.hint.value * (shared.uLandTex.value ? 1 : 0);
  shared.uUi.value = T.ui.value;
  shared.uUiGlow.value = T.ui.value * 0.9;
  shared.uFill.value = 0.18;
  shared.uGrid.value = 0.7;
  shared.uCoast.value = 0.8;
  shared.uDotGlow.value = 0.35;
  shared.uRough.value = T.rough.value;
  shared.uMetal.value = T.metal.value;
  shared.uRoughSide.value = T.roughSide.value;
  shared.uMetalSide.value = T.metalSide.value;
  if (!shared.uLandTex.value) shared.uMap.value = 0;

  key.intensity = T.key.value;
  key.position.set(...T.keyPos.value);
  hemi.intensity = T.hemi.value;
  floorMat.opacity = T.floor.value;
  scene.environmentIntensity = T.env.value;
  outlineMat.opacity = T.outline.value;
  outlineMat.color.setRGB(ink[0], ink[1], ink[2], THREE.SRGBColorSpace);
  outlineMat.visible = T.outline.value > 0.01;

  updatePlates(t);
  updateCamera(dt);
  renderer.render(scene, camera);
  updateOverlay(t);
  if (!document.hidden) requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    last = performance.now();
    requestAnimationFrame(frame);
  }
});

/* ── Screen texture (the UI the tiled plates display) ─────────────────────── */

function screenTexture() {
  const W = 2048;
  const H = Math.round((W * SCREEN_SIZE.y) / SCREEN_SIZE.x);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#030605';
  g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(92,242,176,0.06)';
  for (let x = 0; x < W; x += 16) g.fillRect(x, 0, 1, H);
  for (let y = 0; y < H; y += 16) g.fillRect(0, y, W, 1);
  // Keep content inside the parallelogram the two rows of plates cover.
  const x0 = W * 0.13;
  const x1 = W * 0.87;
  g.fillStyle = '#5cf2b0';
  g.font = '500 34px "JetBrains Mono", monospace';
  g.fillText('~/apps — grant sacco', x0, 70);
  g.fillStyle = 'rgba(201,247,223,0.55)';
  g.font = '400 22px "JetBrains Mono", monospace';
  g.fillText('same person · different lens · 20 plates online', x0, 108);
  const apps = items.filter((it) => it.kind === 'app');
  const cw = (x1 - x0 - 40) / apps.length;
  apps.forEach((a, k) => {
    const x = x0 + k * (cw + 20);
    const y = 150;
    const h = H - 210;
    g.strokeStyle = '#5cf2b0';
    g.lineWidth = 3;
    g.strokeRect(x, y, cw, h);
    g.fillStyle = 'rgba(92,242,176,0.14)';
    g.fillRect(x, y, cw, 46);
    g.fillStyle = '#5cf2b0';
    for (let d = 0; d < 3; d++) {
      g.beginPath();
      g.arc(x + 24 + d * 22, y + 23, 7, 0, Math.PI * 2);
      g.fill();
    }
    g.font = '500 24px "JetBrains Mono", monospace';
    g.fillText(a.id, x + 100, y + 31);
    g.fillStyle = '#eafff4';
    g.font = '600 38px Inter, sans-serif';
    g.fillText(a.title, x + 26, y + 104);
    // sparkline
    let rnd = hashString(a.id);
    g.strokeStyle = '#5cf2b0';
    g.lineWidth = 3;
    g.beginPath();
    let yy = y + h - 70;
    for (let xx = x + 26; xx < x + cw - 26; xx += 22) {
      rnd = (rnd * 1103515245 + 12345) >>> 0;
      yy = clamp(yy + ((rnd / 2 ** 32) - 0.5) * 50, y + 150, y + h - 30);
      if (xx === x + 26) g.moveTo(xx, yy);
      else g.lineTo(xx, yy);
    }
    g.stroke();
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* ── Boot ─────────────────────────────────────────────────────────────────── */

const SUBS = { reality: 'closed', structure: 'exploded', build: 'rebuilt', image: 'sculpture', place: 'unfolded', digital: 'tiled' };
let first = true;
mountSwitcher({
  items: modes.map((m) => ({ id: m.id, label: m.section, sub: SUBS[m.id] })),
  initial: 'reality',
  label: 'Sections',
  onChange: (id) => {
    setState(id, { instant: first });
    first = false;
  },
});
requestAnimationFrame(frame);
