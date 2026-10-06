import '../shared/base.css';
import './style.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mountChrome, mountSwitcher, prefersReducedMotion } from '../shared/chrome.js';
import { items, modes, site } from '../content.js';
import { ease, lerp, clamp, smoothstep, hexToRgb, rgbToCss } from '../anim.js';
import { loadLandMask } from '../shared/geo.js';
import {
  R_EARTH,
  earthDir,
  earthQ,
  buildEarth,
  buildCity,
  buildBuilding,
  buildRoom,
  buildGearbox,
  buildLightbox,
  buildLaptop,
  buildDeskClutter,
  photoCanvas,
  canvasTex,
  sketchCanvas,
  appsScreenCanvas,
} from './world.js';

mountChrome('scale');

const reduced = prefersReducedMotion();
const byId = new Map(items.map((it) => [it.id, it]));

/* ── Renderer ─────────────────────────────────────────────────────────────── */

const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.className = 'stage';
renderer.domElement.setAttribute('aria-hidden', 'true');
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const FOV = 42;
const camera = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 0.0005, 20000);
const hemi = new THREE.HemisphereLight('#dfe8ff', '#3a3530', 1);
const sun = new THREE.DirectionalLight('#fff1dc', 2);
const amb = new THREE.AmbientLight('#ffffff', 0.1);
scene.add(hemi, sun, sun.target, amb);

/* ── The world, in metres ─────────────────────────────────────────────────── */
// Each layer: content group (in its own units), absolute origin (m), unit (m per
// local unit). Every frame it is placed relative to the camera focus.

const landMask = loadLandMask(1024);
const earth = buildEarth(landMask);
const city = buildCity();
const building = buildBuilding();
const room = buildRoom((i) => canvasTex(photoCanvas(`pin-${i}`, 256, 170)));
const gearbox = buildGearbox();
const FRAME_ITEMS = ['film', 'iceland', 'renders', 'italy', 'japan', 'g64'].map((id) => byId.get(id));
const lightbox = buildLightbox((id) => canvasTex(photoCanvas(id, 1024, 683)), FRAME_ITEMS);
const apps = items.filter((it) => it.kind === 'app');
const laptop = buildLaptop(canvasTex(appsScreenCanvas(apps)));
const clutter = buildDeskClutter(canvasTex(sketchCanvas()));

const DESK_Y = 0.75;
const layers = [
  { name: 'earth', obj: earth.group, origin: new THREE.Vector3(0, -R_EARTH, 0), unit: R_EARTH },
  { name: 'city', obj: city.group, origin: new THREE.Vector3(0, 0, 0), unit: 1 },
  { name: 'building', obj: building.group, origin: new THREE.Vector3(0, 0, 0), unit: 1 },
  { name: 'room', obj: room.group, origin: new THREE.Vector3(0, 0, 0), unit: 1 },
  { name: 'gearbox', obj: gearbox.group, origin: new THREE.Vector3(-0.42, DESK_Y, -0.12), unit: 1 },
  { name: 'lightbox', obj: lightbox.group, origin: new THREE.Vector3(0.1, DESK_Y, 0.12), unit: 1, rotY: -0.08 },
  { name: 'laptop', obj: laptop.group, origin: new THREE.Vector3(0.48, DESK_Y, -0.12), unit: 1, rotY: -0.38 },
  { name: 'clutter', obj: clutter.group, origin: new THREE.Vector3(0, DESK_Y, 0), unit: 1 },
];
for (const l of layers) {
  if (l.rotY) l.obj.rotation.y = l.rotY;
  scene.add(l.obj);
}
const layer = Object.fromEntries(layers.map((l) => [l.name, l]));

// World-space helpers for things inside layers (computed with the true metre transform).
function worldOf(l, local) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), l.rotY ?? 0);
  return local.clone().applyQuaternion(q).multiplyScalar(l.unit).add(l.origin);
}
const screenFrame = (() => {
  // Place the laptop at true scale once to read the screen's world pose.
  const l = layer.laptop;
  l.obj.position.copy(l.origin);
  l.obj.scale.setScalar(1);
  l.obj.updateMatrixWorld(true);
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  laptop.screen.getWorldPosition(pos);
  laptop.screen.getWorldQuaternion(quat);
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
  return { pos, normal, up };
})();

/* ── Scale stops (keyframes) ──────────────────────────────────────────────── */

const backFrom = (yaw, pitch) => {
  const y = (yaw * Math.PI) / 180;
  const p = (pitch * Math.PI) / 180;
  return new THREE.Vector3(Math.cos(p) * Math.sin(y), Math.sin(p), Math.cos(p) * Math.cos(y));
};
const Y = new THREE.Vector3(0, 1, 0);
const NORTH = new THREE.Vector3(0, 0, -1);

// Travel view: look at the globe from over the Atlantic so home and the trips show.
const travelBack = earthDir(42, -38);
const travelUp = new THREE.Vector3(0, 1, 0).applyQuaternion(earthQ);

const STOPS = {
  planet: { label: 'The planet', F: new THREE.Vector3(0, -R_EARTH, 0), h: 2.45 * R_EARTH, back: travelBack, up: travelUp, parent: null },
  city: { label: 'The city', F: new THREE.Vector3(17, 0, 11), h: 9000, back: backFrom(0, 89.95), up: NORTH, parent: 'planet' },
  building: { label: 'The workshop', F: new THREE.Vector3(17, 2.5, 11), h: 72, back: backFrom(34, 36), up: Y, parent: 'city' },
  room: { label: 'The room', F: new THREE.Vector3(0.05, 1.12, 0.05), h: 2.9, back: backFrom(30, 15), up: Y, parent: 'building' },
  desk: { label: 'The desk', F: new THREE.Vector3(0.03, 0.78, 0.0), h: 0.95, back: backFrom(8, 54), up: Y, parent: 'room' },
  machine: {
    label: 'Inside the gearbox',
    F: worldOf(layer.gearbox, gearbox.center),
    h: 0.125,
    back: backFrom(28, 40),
    up: Y,
    parent: 'desk',
  },
  film: {
    label: 'A single frame',
    F: worldOf(layer.lightbox, lightbox.framePos(0)),
    h: 0.031,
    back: backFrom(0, 89.95),
    // Align the frame with the screen: the lightbox is turned slightly on the desk.
    up: new THREE.Vector3(-Math.sin(layer.lightbox.rotY), 0, -Math.cos(layer.lightbox.rotY)),
    parent: 'desk',
  },
  screen: {
    label: 'The screen',
    F: screenFrame.pos.clone(),
    h: 0.205,
    back: screenFrame.normal.clone(),
    up: screenFrame.up.clone(),
    parent: 'desk',
  },
};
for (const [k, s] of Object.entries(STOPS)) s.id = k;

const SECTION_STOP = { place: 'planet', reality: 'room', build: 'desk', structure: 'machine', image: 'film', digital: 'screen' };

// Per-stop look: background, UI palette, vignette and lighting.
const LOOK = {
  planet: { ui: '#05070d', bg: '#03050b', ink: '#e3eaf6', muted: '#8291aa', accent: '#ffb648', vig: 0, hemi: 0.4, sun: 1.0, amb: 0.1 },
  city: { ui: '#0b1322', bg: '#0a1220', ink: '#e6edf7', muted: '#8593a8', accent: '#ffb648', vig: 0.35, hemi: 0.9, sun: 0.5, amb: 0.2 },
  building: { ui: '#1d2533', bg: '#1c2433', ink: '#eef1f6', muted: '#97a1b1', accent: '#ffb648', vig: 0.25, hemi: 1.2, sun: 2.4, amb: 0.15 },
  room: { ui: '#f1ece4', bg: '#2a2622', ink: '#1d1b18', muted: '#6f6a62', accent: '#c2552d', vig: 0.15, hemi: 1.15, sun: 2.0, amb: 0.2 },
  desk: { ui: '#f1ece4', bg: '#2a2622', ink: '#1d1b18', muted: '#6f6a62', accent: '#c2552d', vig: 0.3, hemi: 1.1, sun: 2.2, amb: 0.2 },
  machine: { ui: '#101318', bg: '#0d1014', ink: '#e7edf4', muted: '#93a0b2', accent: '#7cc0ff', vig: 0.78, hemi: 0.8, sun: 2.8, amb: 0.15 },
  film: { ui: '#140c0a', bg: '#100707', ink: '#f4ece2', muted: '#b7a597', accent: '#ff8a5c', vig: 0.72, hemi: 0.6, sun: 1.2, amb: 0.2 },
  screen: { ui: '#050806', bg: '#040605', ink: '#c9f7df', muted: '#6c9a84', accent: '#5cf2b0', vig: 0.55, hemi: 0.5, sun: 0.8, amb: 0.1 },
};
const LOOK_RGB = Object.fromEntries(
  Object.entries(LOOK).map(([k, v]) => [k, { bg: hexToRgb(v.bg), ui: hexToRgb(v.ui), ink: hexToRgb(v.ink), muted: hexToRgb(v.muted), accent: hexToRgb(v.accent) }]),
);

/* ── Flight: zoom about a point through the tree of stops ─────────────────── */

const ancestors = (id) => {
  const out = [];
  for (let s = id; s; s = STOPS[s].parent) out.push(s);
  return out;
};
function treePath(a, b) {
  const up = ancestors(a);
  const down = ancestors(b);
  const lca = up.find((s) => down.includes(s));
  return [...up.slice(0, up.indexOf(lca) + 1), ...down.slice(0, down.indexOf(lca)).reverse()];
}

const cam = { F: STOPS.room.F.clone(), h: STOPS.room.h, back: STOPS.room.back.clone(), up: STOPS.room.up.clone() };
const flight = { keys: null, cum: null, total: 0, t0: 0, dur: 0, from: 'room', to: 'room' };
let current = 'room';

const state = (s) => ({ F: s.F.clone(), h: s.h, back: s.back.clone(), up: s.up.clone(), stop: s.id });

function segWeight(a, b) {
  return Math.abs(Math.log10(b.h / a.h)) + (a.back.angleTo(b.back) / Math.PI) * 0.9 + Math.min(2, a.F.distanceTo(b.F) / Math.max(a.h, b.h)) * 0.5;
}

function flyTo(stopId) {
  // Start from wherever the camera is, then follow the tree to the target.
  const near = nearestStop();
  let path = treePath(near, stopId);
  if (path.length > 1 || near !== stopId) path = path.slice(1);
  const keys = [{ F: cam.F.clone(), h: cam.h, back: cam.back.clone(), up: cam.up.clone(), stop: near }, ...path.map((id) => state(STOPS[id]))];
  const cum = [0];
  for (let i = 1; i < keys.length; i++) cum.push(cum[i - 1] + Math.max(0.05, segWeight(keys[i - 1], keys[i])));
  flight.keys = keys;
  flight.cum = cum;
  flight.total = cum[cum.length - 1];
  flight.t0 = performance.now() / 1000;
  flight.dur = reduced ? 0.4 : clamp(1.1 + flight.total * 0.55, 1.6, 6.5);
  flight.to = stopId;
  orbit.az = orbit.el = 0;
}

const tmpQ = new THREE.Quaternion();
function slerpDir(a, b, t, out) {
  tmpQ.setFromUnitVectors(a, b);
  const q = new THREE.Quaternion().slerp(tmpQ, t);
  return out.copy(a).applyQuaternion(q);
}

// Which stops are we between right now (for the palette and the scale readout)?
const zone = { a: 'room', b: 'room', u: 1 };

function updateFlight(now) {
  if (!flight.keys) return;
  const p = clamp((now - flight.t0) / flight.dur);
  const s = (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2) * flight.total;
  let i = 1;
  while (i < flight.keys.length - 1 && flight.cum[i] < s) i++;
  const a = flight.keys[i - 1];
  const b = flight.keys[i];
  const u = clamp((s - flight.cum[i - 1]) / Math.max(1e-6, flight.cum[i] - flight.cum[i - 1]));

  // Log-linear zoom; the focus follows so the target point stays put on screen.
  cam.h = Math.exp(lerp(Math.log(a.h), Math.log(b.h), u));
  const k = Math.abs(b.h - a.h) > 1e-9 ? Math.abs(cam.h - a.h) / Math.abs(b.h - a.h) : ease.inOutCubic(u);
  cam.F.copy(a.F).lerp(b.F, k);
  const uo = smoothstep(0, 1, u);
  slerpDir(a.back, b.back, uo, cam.back);
  slerpDir(a.up, b.up, uo, cam.up);

  zone.a = a.stop;
  zone.b = b.stop;
  zone.u = u;
  if (p >= 1) {
    flight.keys = null;
    current = flight.to;
    zone.a = zone.b = current;
    zone.u = 1;
    onArrive();
  }
}

function nearestStop() {
  if (!flight.keys) return current;
  return zone.u < 0.5 ? zone.a : zone.b;
}

/* ── Free zoom (wheel / pinch / + −) and drag-orbit ───────────────────────── */

const orbit = { az: 0, el: 0, dragging: false, px: 0, py: 0, travelAz: 0, travelEl: 0 };
let zoomTarget = null;
renderer.domElement.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    if (flight.keys) return;
    zoomTarget = clamp((zoomTarget ?? cam.h) * Math.exp(e.deltaY * 0.0022), 0.004, 6e7);
  },
  { passive: false },
);
addEventListener('keydown', (e) => {
  if (flight.keys) return;
  if (e.key === '+' || e.key === '=') zoomTarget = clamp((zoomTarget ?? cam.h) / 1.6, 0.004, 6e7);
  if (e.key === '-' || e.key === '_') zoomTarget = clamp((zoomTarget ?? cam.h) * 1.6, 0.004, 6e7);
});
const canvas = renderer.domElement;
canvas.addEventListener('pointerdown', (e) => {
  orbit.dragging = true;
  orbit.px = e.clientX;
  orbit.py = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!orbit.dragging) return;
  const dx = (e.clientX - orbit.px) * 0.25;
  const dy = (e.clientY - orbit.py) * 0.2;
  orbit.px = e.clientX;
  orbit.py = e.clientY;
  if (current === 'planet' && !flight.keys) {
    orbit.travelAz -= dx;
    orbit.travelEl = clamp(orbit.travelEl + dy, -60, 60);
  } else {
    orbit.az = clamp(orbit.az - dx, -35, 35);
    orbit.el = clamp(orbit.el + dy, -20, 20);
  }
});
canvas.addEventListener('pointerup', () => (orbit.dragging = false));

/* ── Frame ────────────────────────────────────────────────────────────────── */

const view = { W: innerWidth, H: innerHeight };
const v = new THREE.Vector3();
const backV = new THREE.Vector3();
const upV = new THREE.Vector3();
const right = new THREE.Vector3();
let last = performance.now();
let elapsed = 0;

function insets() {
  const mobile = view.W < 760;
  return { right: mobile ? 0 : 380, left: mobile ? 0 : 120, top: mobile ? 150 : 110, bottom: mobile ? 270 : 120 };
}

function render() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  elapsed += dt;
  updateFlight(now / 1000);

  if (zoomTarget != null && !flight.keys) {
    cam.h = Math.exp(lerp(Math.log(cam.h), Math.log(zoomTarget), Math.min(1, dt * 8)));
    if (Math.abs(Math.log(cam.h / zoomTarget)) < 0.002) zoomTarget = null;
  }
  if (!orbit.dragging) {
    orbit.az *= 1 - Math.min(1, dt * 3);
    orbit.el *= 1 - Math.min(1, dt * 3);
  }

  // Orientation: base + drag offset (+ free orbit around the globe in Travel).
  backV.copy(cam.back);
  upV.copy(cam.up);
  const travelW = current === 'planet' && !flight.keys ? 1 : 0;
  const az = orbit.az + orbit.travelAz * travelW;
  const el = orbit.el + orbit.travelEl * travelW;
  if (az || el) {
    right.crossVectors(upV, backV).normalize();
    backV.applyAxisAngle(upV, (az * Math.PI) / 180);
    right.crossVectors(upV, backV).normalize();
    backV.applyAxisAngle(right, (-el * Math.PI) / 180);
  }
  // Keep `up` perpendicular to the view.
  upV.addScaledVector(backV, -upV.dot(backV)).normalize();

  // Portrait screens back off so wide subjects still fit.
  const aspect = view.W / view.H;
  const ins = insets();
  const freeW = view.W - ins.left - ins.right;
  const freeH = view.H - ins.top - ins.bottom;
  const fitK = Math.max(view.H / freeH, (1.55 * view.H) / Math.max(200, freeW)) * 0.92;
  const h = cam.h * fitK;

  // Floating origin: render space is metres / h, centred on the focus.
  const dist = 0.5 / Math.tan((FOV * Math.PI) / 360);
  camera.position.copy(backV).multiplyScalar(dist);
  camera.up.copy(upV);
  camera.lookAt(0, 0, 0);
  camera.aspect = aspect;
  camera.setViewOffset(view.W, view.H, (ins.right - ins.left) / 2, (ins.bottom - ins.top) / 2, view.W, view.H);
  camera.updateProjectionMatrix();

  for (const l of layers) {
    l.obj.position.copy(v.copy(l.origin).sub(cam.F).multiplyScalar(1 / h));
    l.obj.scale.setScalar(l.unit / h);
  }

  // What's visible at this scale.
  const H = cam.h;
  const eFade = smoothstep(5e4, 3e5, H);
  earth.group.visible = eFade > 0.002;
  earth.fade(eFade);
  const cFade = 1 - smoothstep(1.6e5, 5e5, H);
  city.group.visible = cFade > 0.002 && H > 10;
  city.fade(cFade);
  building.group.visible = H < 5e4 && H > 0.05;
  building.fade(smoothstep(11, 34, H));
  room.group.visible = H < 400;
  const props = H < 40;
  for (const n of ['gearbox', 'lightbox', 'laptop', 'clutter']) layer[n].obj.visible = props;
  gearbox.xray(smoothstep(0.16, 0.42, H));
  gearbox.update(elapsed);

  // Look: blend the two stops we're between.
  const A = LOOK[zone.a];
  const B = LOOK[zone.b];
  const RA = LOOK_RGB[zone.a];
  const RB = LOOK_RGB[zone.b];
  const u = smoothstep(0, 1, zone.u);
  const mix3 = (a, b) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
  const bg = mix3(RA.bg, RB.bg);
  renderer.setClearColor(new THREE.Color().setRGB(bg[0], bg[1], bg[2], THREE.SRGBColorSpace));
  const ink = mix3(RA.ink, RB.ink);
  document.body.style.cssText = `--bg:${rgbToCss(mix3(RA.ui, RB.ui))};--ink:${rgbToCss(ink)};--muted:${rgbToCss(mix3(RA.muted, RB.muted))};--accent:${rgbToCss(
    mix3(RA.accent, RB.accent),
  )};--line:${rgbToCss(ink, 0.16)};--vig:${lerp(A.vig, B.vig, u).toFixed(3)}`;
  hemi.intensity = lerp(A.hemi, B.hemi, u);
  sun.intensity = lerp(A.sun, B.sun, u);
  amb.intensity = lerp(A.amb, B.amb, u);
  sun.position.set(-0.6, 1, 0.5);

  renderer.render(scene, camera);
  updateHud(h);
  if (!document.hidden) requestAnimationFrame(render);
}

/* ── HUD: powers-of-ten rail, readout, pins, section panel ────────────────── */

const el = (tag, cls, parent = document.body, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  parent.appendChild(n);
  return n;
};

const vignette = el('div', 'sc-vignette');
vignette.setAttribute('aria-hidden', 'true');

const readout = el('div', 'sc-readout');
readout.innerHTML = `<span class="sc-readout__k">In view</span><h1 class="sc-readout__what"></h1><p class="sc-readout__size"></p>`;
const readWhat = readout.querySelector('.sc-readout__what');
const readSize = readout.querySelector('.sc-readout__size');

const LOG_MIN = -2;
const LOG_MAX = 7.5;
const rail = el('nav', 'sc-rail');
rail.setAttribute('aria-label', 'Scale');
rail.innerHTML = `<div class="sc-rail__track"></div><div class="sc-rail__now"></div>`;
for (let p = Math.ceil(LOG_MIN); p <= Math.floor(LOG_MAX); p++) {
  const t = el('span', 'sc-rail__tick', rail, `10<sup>${p}</sup>`);
  t.style.setProperty('--y', String(railY(p)));
}
const SECTION_LABEL = Object.fromEntries(modes.map((m) => [m.id, m.section]));
for (const [sec, stop] of Object.entries(SECTION_STOP)) {
  const b = el('button', 'sc-rail__stop', rail, `<i></i><span>${SECTION_LABEL[sec]}</span>`);
  b.type = 'button';
  b.dataset.sec = sec;
  b.style.setProperty('--y', String(railY(Math.log10(STOPS[stop].h))));
  // Engineering and Apps sit close on the rail; ease their labels apart.
  if (sec === 'digital') b.style.setProperty('--nudge', '-7px');
  if (sec === 'structure') b.style.setProperty('--nudge', '6px');
  b.addEventListener('click', () => switcher.set(sec));
}
const railNow = rail.querySelector('.sc-rail__now');
function railY(log) {
  return 1 - (log - LOG_MIN) / (LOG_MAX - LOG_MIN);
}

function fmtLen(m) {
  if (m >= 1000) return `${(m / 1000).toLocaleString(undefined, { maximumFractionDigits: m >= 1e5 ? 0 : 1 })} km`;
  if (m >= 1) return `${m.toFixed(m >= 10 ? 0 : 1)} m`;
  if (m >= 0.01) return `${(m * 100).toFixed(m >= 0.1 ? 0 : 1)} cm`;
  return `${(m * 1000).toFixed(1)} mm`;
}
const sup = (n) => String(n).replace(/-/g, '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);

// Labels for the globe pins in Travel
const pinLabels = earth.pins.map((p) => {
  const n = el('span', 'sc-pin', document.body, `<b>${p.title}</b>${p.id === 'home' ? 'where the work happens' : `${p.place.lat.toFixed(1)}°, ${p.place.lon.toFixed(1)}°`}`);
  n.setAttribute('aria-hidden', 'true');
  return n;
});
const pinWorld = new THREE.Vector3();
const toCam = new THREE.Vector3();

let lastWhat = '';
function updateHud() {
  const H = cam.h;
  const lg = Math.log10(H);
  railNow.style.setProperty('--y', String(clamp(railY(lg), 0, 1)));
  const near = STOPS[nearestStop()];
  // Name what's in view by the nearest stop in log-scale, not just the flight endpoints.
  let best = near;
  let bestD = Infinity;
  for (const s of Object.values(STOPS)) {
    const d = Math.abs(Math.log10(s.h) - lg) + (ancestors(near.id).includes(s.id) || ancestors(s.id).includes(near.id) ? 0 : 3);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  if (best.label !== lastWhat) {
    readWhat.textContent = best.label;
    lastWhat = best.label;
  }
  readSize.textContent = `view ≈ ${fmtLen(H)} · 10${sup(Math.round(lg))} m`;

  // Pins on the globe face the camera?
  const eVis = smoothstep(1e6, 3e6, H) * (current === 'planet' && !flight.keys ? 1 : smoothstep(0.7, 1, flight.keys ? zoneProgressToPlanet() : 0));
  earth.pins.forEach((p, i) => {
    pinWorld.copy(p.local).applyQuaternion(earthQ).multiplyScalar(R_EARTH).add(layer.earth.origin);
    const n = pinWorld.clone().sub(layer.earth.origin).normalize();
    toCam.copy(camera.position).multiplyScalar(cam.h).add(cam.F).sub(pinWorld).normalize();
    const facing = n.dot(toCam);
    const rp = pinWorld.sub(cam.F).multiplyScalar(1 / (cam.h * lastFitK())).project(camera);
    const x = (rp.x * 0.5 + 0.5) * view.W;
    const y = (-rp.y * 0.5 + 0.5) * view.H;
    pinLabels[i].style.opacity = (eVis * smoothstep(0.05, 0.25, facing)).toFixed(3);
    pinLabels[i].style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  });
}
function lastFitK() {
  const ins = insets();
  return Math.max(view.H / (view.H - ins.top - ins.bottom), (1.55 * view.H) / Math.max(200, view.W - ins.left - ins.right)) * 0.92;
}
function zoneProgressToPlanet() {
  return zone.b === 'planet' ? zone.u : 0;
}

/* ── Section panel ────────────────────────────────────────────────────────── */

const panel = el('aside', 'sc-panel');
panel.setAttribute('aria-live', 'polite');
let frameIndex = 0;

const SECTION_ITEMS = {
  reality: () => [...items].sort((a, b) => b.years[0] - a.years[0]).slice(0, 6),
  build: () => items.filter((it) => it.kind === 'project'),
  structure: () => items.filter((it) => it.kind === 'engineering'),
  image: () => FRAME_ITEMS,
  place: () => items.filter((it) => it.kind === 'travel'),
  digital: () => apps,
};

function renderPanel(sec) {
  const md = modes.find((m) => m.id === sec);
  const list = SECTION_ITEMS[sec]();
  const yrs = (it) => (it.years[0] === it.years[1] ? it.years[0] : `${it.years[0]}–${String(it.years[1]).slice(2)}`);
  let extra = '';
  if (sec === 'image') {
    const it = FRAME_ITEMS[frameIndex];
    extra = `<div class="sc-frame"><button type="button" data-d="-1" aria-label="Previous frame">‹</button><div><p class="sc-frame__n">Frame ${String(frameIndex + 1).padStart(
      2,
      '0',
    )} / 06</p><p class="sc-frame__t">${it.title}</p><p class="sc-frame__c">${it.lens.image}</p></div><button type="button" data-d="1" aria-label="Next frame">›</button></div>`;
  }
  panel.innerHTML = `
    <p class="sc-panel__kicker">${md.section} · ${md.name.toLowerCase()} scale</p>
    <h2 class="sc-panel__title">${STOPS[SECTION_STOP[sec]].label}</h2>
    <p class="sc-panel__blurb">${sec === 'reality' ? site.summary : md.blurb}</p>
    ${extra}
    <ul class="sc-panel__list">${list
      .map((it) => `<li><span class="sc-panel__yr">${yrs(it)}</span><span><b>${it.title}</b>${it.lens[sec]}</span></li>`)
      .join('')}</ul>`;
  panel.querySelectorAll('.sc-frame button').forEach((b) => b.addEventListener('click', () => stepFrame(+b.dataset.d)));
}

function stepFrame(d) {
  frameIndex = (frameIndex + d + 6) % 6;
  STOPS.film.F.copy(worldOf(layer.lightbox, lightbox.framePos(frameIndex)));
  renderPanel('image');
  flyTo('film');
}

function onArrive() {
  document.body.classList.remove('is-flying');
}

/* ── Boot ─────────────────────────────────────────────────────────────────── */

addEventListener('resize', () => {
  view.W = innerWidth;
  view.H = innerHeight;
  renderer.setSize(view.W, view.H);
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    last = performance.now();
    requestAnimationFrame(render);
  }
});

let firstSwitch = true;
const switcher = mountSwitcher({
  items: modes.map((m) => ({ id: m.id, label: m.section, sub: fmtLen(STOPS[SECTION_STOP[m.id]].h) })),
  initial: 'reality',
  label: 'Sections',
  onChange: (sec) => {
    renderPanel(sec);
    rail.querySelectorAll('.sc-rail__stop').forEach((b) => b.classList.toggle('is-active', b.dataset.sec === sec));
    document.body.dataset.section = sec;
    const stop = SECTION_STOP[sec];
    if (firstSwitch) {
      // Arrive from orbit on first load: the whole idea in one move.
      firstSwitch = false;
      Object.assign(cam, { F: STOPS.planet.F.clone(), h: STOPS.planet.h, back: STOPS.planet.back.clone(), up: STOPS.planet.up.clone() });
      current = 'planet';
      zone.a = zone.b = 'planet';
      if (stop === 'planet') return;
    }
    document.body.classList.add('is-flying');
    flyTo(stop);
  },
});

requestAnimationFrame(render);
