import '../shared/base.css';
import './style.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mountChrome, mountSwitcher, prefersReducedMotion } from '../shared/chrome.js';
import { items } from '../content.js';
import { Tween, ease, lerp, clamp, smoothstep, hexToRgb, rgbToCss, mulberry32 } from '../anim.js';
import { LAYERS, PRESETS, SECTIONS, PALETTES } from './config.js';
import { createMaterials, revealMaterial, ghostMaterial, strokeGeometry, segmentsGeometry } from './materials.js';
import { buildCamera, DIM } from './model.js';
import { photo, filmStrip } from './photos.js';

mountChrome('layers');

const reduced = prefersReducedMotion();
const byId = new Map(items.map((it) => [it.id, it]));
const V = (x, y, z) => new THREE.Vector3(x, y, z);

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

const camera = new THREE.PerspectiveCamera(26, innerWidth / innerHeight, 1, 400);
const TARGET = V(0.4, -0.2, 1.2);

const key = new THREE.DirectionalLight('#ffffff', 1.4);
key.position.set(-14, 22, 18);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -14, right: 14, top: 12, bottom: -12, near: 1, far: 80 });
key.shadow.bias = -0.0005;
key.shadow.normalBias = 0.03;
const rim = new THREE.DirectionalLight('#ffd2a0', 0);
rim.position.set(16, 6, -14);
const fill = new THREE.HemisphereLight('#ffffff', '#6d6255', 0.35);
scene.add(key, rim, fill);

const M = createMaterials();
const cam = buildCamera(M);
scene.add(cam.root);

// Floor: shadow catcher + soft contact shadow.
const shadowMat = new THREE.ShadowMaterial({ opacity: 0.3 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), shadowMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = DIM.Y0 - 0.01;
floor.receiveShadow = true;
scene.add(floor);
const contactMat = new THREE.MeshBasicMaterial({ map: M.contactShadow, transparent: true, depthWrite: false, opacity: 0.35 });
const contact = new THREE.Mesh(new THREE.PlaneGeometry(22, 9), contactMat);
contact.rotation.x = -Math.PI / 2;
contact.position.set(0.3, DIM.Y0 + 0.005, 0.6);
scene.add(contact);

/* ── Layer: shell (real materials ⇄ fresnel x-ray ghost) ──────────────────── */

const shellMats = new Set();
cam.shell.forEach((m) => [m.material].flat().forEach((mt) => shellMats.add(mt)));
for (const mt of shellMats) {
  mt.transparent = true;
  mt.userData.baseOpacity = mt.opacity;
}
const ghost = ghostMaterial();
const ghosts = cam.shell.map((m) => {
  const g = new THREE.Mesh(m.geometry, ghost);
  g.position.copy(m.position);
  g.rotation.copy(m.rotation);
  g.scale.copy(m.scale);
  g.renderOrder = 4;
  cam.root.add(g);
  return g;
});

/* ── Layer: structure (internal parts, pulled toward clay per palette) ────── */

const structMats = new Set();
cam.structure.forEach((m) => [m.material].flat().forEach((mt) => structMats.add(mt)));
for (const mt of structMats) {
  mt.transparent = true;
  mt.userData.baseOpacity = mt.opacity;
  mt.userData.base = mt.color.clone();
}

/* ── Layer: edges (sweep on from left to right) ───────────────────────────── */

const xT = (p) => clamp((p.x + 8) / 16);
const edgeMat = revealMaterial({ color: '#14212d' });
const edgeInnerMat = revealMaterial({ color: '#14212d', opacity: 0.55 });
function edgesFor(list, mat) {
  const pos = [];
  const tmp = new THREE.Vector3();
  for (const m of list) {
    if (m.userData.edges === 'none') continue;
    const src = m.userData.edgeProxy ?? m.geometry;
    const eg = new THREE.EdgesGeometry(src, 30);
    m.updateMatrix();
    const arr = eg.attributes.position.array;
    for (let i = 0; i < arr.length; i += 3) {
      tmp.set(arr[i], arr[i + 1], arr[i + 2]).applyMatrix4(m.matrix);
      pos.push(tmp.x, tmp.y, tmp.z);
    }
  }
  const lines = new THREE.LineSegments(segmentsGeometry(pos, xT), mat);
  lines.renderOrder = 6;
  return lines;
}
const edgesOuter = edgesFor(cam.shell, edgeMat);
const loopLines = new THREE.LineSegments(strokeGeometry(cam.loops.map((l) => [...l, l[0]]), xT), edgeMat);
const edgesInner = edgesFor(cam.structure, edgeInnerMat);
const edgeGroup = new THREE.Group();
edgeGroup.add(edgesOuter, loopLines, edgesInner);
cam.root.add(edgeGroup);
const opticMat = revealMaterial({ color: '#d2382b', dash: 0.25, gap: 0.18 });
const optic = new THREE.LineSegments(strokeGeometry(cam.opticPath), opticMat);
optic.renderOrder = 7;
edgeGroup.add(optic);

/* ── Layer: dimensions (grow from the middle) ─────────────────────────────── */

const { W, Y0, Y1, ZF, LX, LY, D } = DIM;
const DIMS = [
  // a, b (measured points), offset direction, distance, label
  { a: V(-W / 2, Y0, ZF), b: V(W / 2, Y0, ZF), off: V(0, -1, 0.4), d: 1.6, text: '138' },
  { a: V(W / 2 + 0.3, Y0, ZF), b: V(W / 2 + 0.3, Y1, ZF), off: V(1, 0, 0), d: 1.4, text: '77' },
  { a: V(LX - 2.6, LY, ZF + 1.48), b: V(LX + 2.6, LY, ZF + 1.48), off: V(0, 1, 0), d: 4.1, text: 'Ø52' },
  { a: V(-W / 2, Y1 + 0.2, -D / 2), b: V(-W / 2, Y1 + 0.2, D / 2), off: V(-1, 0.4, 0), d: 1.4, text: '33' },
];
const dimStrokes = [];
for (const dm of DIMS) {
  const o = dm.off.clone().normalize().multiplyScalar(dm.d);
  const a2 = dm.a.clone().add(o);
  const b2 = dm.b.clone().add(o);
  const ext = dm.off.clone().normalize().multiplyScalar(0.35);
  dimStrokes.push([dm.a.clone().add(ext.clone().multiplyScalar(0.4)), a2.clone().add(ext)]);
  dimStrokes.push([dm.b.clone().add(ext.clone().multiplyScalar(0.4)), b2.clone().add(ext)]);
  dimStrokes.push([a2, b2]);
  // arrowheads
  const dir = b2.clone().sub(a2).normalize();
  const side = new THREE.Vector3().crossVectors(dir, dm.off).normalize().multiplyScalar(0.18);
  const ah = dir.clone().multiplyScalar(0.45);
  dimStrokes.push([a2.clone().add(ah).add(side), a2, a2.clone().add(ah).sub(side)]);
  dimStrokes.push([b2.clone().sub(ah).add(side), b2, b2.clone().sub(ah).sub(side)]);
  dm.mid = a2.clone().lerp(b2, 0.5).add(o.clone().normalize().multiplyScalar(0.5));
}
// Dimension lines draw outward from each line's own centre.
const dimMat = revealMaterial({ color: '#d2382b', center: 1 });
const dimLines = new THREE.LineSegments(strokeGeometry(dimStrokes), dimMat);
dimLines.renderOrder = 8;
cam.root.add(dimLines);

/* ── Layer: process (sketch lines, revision cloud) ────────────────────────── */

const rnd = mulberry32(5);
const jitter = (pts, amt) => pts.map((p) => p.clone().add(V((rnd() - 0.5) * amt, (rnd() - 0.5) * amt, (rnd() - 0.5) * amt)));
const sketchStrokes = [];
for (const loop of cam.loops) {
  for (let pass = 0; pass < 2; pass++) {
    const pts = loop.filter((_, i) => i % 2 === 0);
    sketchStrokes.push(jitter([...pts, pts[0]], 0.22 + pass * 0.1));
  }
}
// rough lens circles, like a first sketch
for (let pass = 0; pass < 3; pass++) {
  const pts = [];
  const r = 2.6 + (rnd() - 0.5) * 0.3;
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2.1;
    pts.push(V(LX + Math.cos(a) * r, LY + Math.sin(a) * r, ZF + 3.1 + pass * 0.02));
  }
  sketchStrokes.push(jitter(pts, 0.12));
}
// revision cloud around the focus tab
const cloud = [];
const cc = V(LX, LY - 3.0, ZF + 1.6);
for (let i = 0; i <= 14; i++) {
  const a0 = (i / 14) * Math.PI * 2;
  for (let k = 0; k <= 6; k++) {
    const a = a0 + (k / 6) * ((Math.PI * 2) / 14);
    const bump = 1 + 0.18 * Math.sin((k / 6) * Math.PI);
    cloud.push(V(cc.x + Math.cos(a) * 1.5 * bump, cc.y + Math.sin(a) * 0.95 * bump, cc.z + 0.2));
  }
}
const processMat = revealMaterial({ color: '#ff6b1a' });
const processLines = new THREE.LineSegments(strokeGeometry([...sketchStrokes, cloud]), processMat);
processLines.renderOrder = 8;
cam.root.add(processLines);

/* ── Layer: places (a film strip unspools and arcs around the camera) ─────── */

const PLACE_FRAMES = [
  { key: 'midwest', id: 'facility', title: 'Home base' },
  { key: 'university', id: 'degree', title: 'University' },
  { key: 'reykjavik', id: 'iceland' },
  { key: 'florence', id: 'italy' },
  { key: 'tokyo', id: 'japan' },
  { key: 'workshop', id: 'bench', title: 'The workshop' },
];
const stripTex = new THREE.CanvasTexture(filmStrip(PLACE_FRAMES.map((f) => f.key), { edge: 'GRAIN 400', lead: 30 }));
stripTex.colorSpace = THREE.SRGBColorSpace;
stripTex.anisotropy = 8;
// Rises as it wraps, so the stretch behind the body clears the top plate.
const STRIP = { r: 11.5, a0: -0.3, a1: Math.PI * 1.22, h: 3.5, y: 0.4, lift: 6.8 };
const stripGeo = new THREE.PlaneGeometry(1, 1, 160, 1);
{
  const p = stripGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) + 0.5;
    const v = p.getY(i);
    const a = lerp(STRIP.a0, STRIP.a1, u);
    // start tucked at the cassette, then sweep out around the body, rising gently
    const r = lerp(5.2, STRIP.r, smoothstep(0, 0.18, u));
    p.setXYZ(i, Math.cos(a) * r, STRIP.y + v * STRIP.h + u * STRIP.lift - 1.5, Math.sin(-a) * r * 0.62 + 0.4);
  }
  stripGeo.computeVertexNormals();
}
const stripMat = new THREE.ShaderMaterial({
  uniforms: { map: { value: stripTex }, uReveal: { value: 0 }, uOpacity: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D map; uniform float uReveal, uOpacity; varying vec2 vUv;
    void main(){ if (vUv.x > uReveal) discard; vec4 c = texture2D(map, vUv); if (c.a < 0.5) discard;
      gl_FragColor = vec4(c.rgb, c.a * uOpacity);
      #include <colorspace_fragment>
    }`,
  side: THREE.DoubleSide,
  transparent: true,
});
const strip = new THREE.Mesh(stripGeo, stripMat);
strip.renderOrder = 3;
cam.root.add(strip);
// Frame centres along the strip, for labels.
const stripTotal = 300 + PLACE_FRAMES.length * 380; // px: 30 mm lead + 38 mm pitch at 10 px/mm
PLACE_FRAMES.forEach((f, i) => {
  const u = (300 + i * 380 + 190) / (stripTotal * 1.0);
  f.u = u;
  const a = lerp(STRIP.a0, STRIP.a1, u);
  const r = lerp(5.2, STRIP.r, smoothstep(0, 0.18, u));
  f.p = V(Math.cos(a) * r, STRIP.y + 0.5 * STRIP.h + u * STRIP.lift - 1.5 + 0.2, Math.sin(-a) * r * 0.62 + 0.4);
});

/* ── HTML overlay: annotations, labels, leader lines ──────────────────────── */

const el = (tag, cls, parent = document.body, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  parent.appendChild(n);
  return n;
};
const overlay = el('div', 'ly-overlay');
overlay.setAttribute('aria-hidden', 'true');
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
svg.classList.add('ly-leaders');
overlay.appendChild(svg);
const leader = (cls) => {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('class', cls);
  svg.appendChild(p);
  return p;
};

const film = byId.get('film');
const NOTES = [
  { anchor: 'lensFront', text: film.lens.reality, dx: 150, dy: -120 },
  { anchor: 'speedDial', text: byId.get('degree').lens.image, dx: -170, dy: -110 },
  { anchor: 'lever', text: film.lens.digital, dx: -220, dy: -20, desktopOnly: true },
  { anchor: 'rewind', text: `${byId.get('iceland').lens.image} — Iceland ’19`, dx: 140, dy: -110 },
  { anchor: 'leather', text: 'Shot on it: Iceland, Italy, Japan.', dx: -200, dy: 90, desktopOnly: true },
].map((n) => ({ ...n, el: el('p', 'ly-note', overlay, n.text), path: leader('ly-leader ly-leader--note') }));

const dimLabels = DIMS.map((dm) => el('span', 'ly-dim', overlay, dm.text));

const BALLOONS = [
  ['base', 'Base plate'],
  ['leather', 'Body'],
  ['topPlate', 'Top plate'],
  ['mount', 'Mount'],
  ['focusRing', 'Lens'],
  ['speedDial', 'Dial'],
  ['lever', 'Advance'],
].map(([anchor, text], i) => ({ anchor, el: el('span', 'ly-balloon', overlay, `<b>${i + 1}</b>${text}`) }));
const revTag = el('span', 'ly-rev', overlay, '<b>REV C</b> focus tab moved 4 mm · 2026');

const placeLabels = PLACE_FRAMES.map((f) => {
  const it = byId.get(f.id);
  const { lat, lon } = it.place;
  return el(
    'span',
    'ly-place',
    overlay,
    `<b>${f.title ?? it.title}</b>${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'} · ${it.years[0]}`,
  );
});

const NODES = [
  { id: 'filmlog', anchor: 'cassette', pos: V(13, 6.5, 1), label: 'film-log', sub: 'logs every roll' },
  { id: 'site', anchor: 'lensCenter', pos: V(12.5, -5, 4), label: 'this-site', sub: 'renders this camera' },
  { id: 'renders', anchor: 'topPlate', pos: V(-12, 7, 0), label: 'renders', sub: 'CAD → light' },
  { id: 'dashboard', anchor: 'pcb', pos: V(-12.5, -6, 3), label: 'dashboard', sub: 'reads the meter board' },
  { id: 'led', anchor: 'battery', pos: V(-3, -8.5, 6), label: 'led-matrix', sub: 'same firmware habits' },
].map((n) => ({
  ...n,
  el: el('span', 'ly-node', overlay, `<b>${n.label}</b>${n.sub}`),
  path: leader('ly-leader ly-leader--node'),
}));
const nodeLinks = [
  ['filmlog', 'site'],
  ['site', 'renders'],
  ['dashboard', 'led'],
  ['renders', 'dashboard'],
].map(([a, b]) => ({ a: NODES.find((n) => n.id === a), b: NODES.find((n) => n.id === b), path: leader('ly-leader ly-leader--net') }));

// Light layer: grain + vignette and a contact sheet of the photos.
const grain = el('div', 'ly-grain');
grain.setAttribute('aria-hidden', 'true');
const sheet = el('div', 'ly-sheet', document.body);
sheet.setAttribute('aria-label', 'Contact sheet');
for (const k of ['reykjavik', 'florence', 'tokyo', 'robot', 'led', 'metal']) {
  const img = el('img', '', sheet);
  img.src = photo(k).toDataURL('image/jpeg', 0.85);
  img.alt = '';
}

/* ── Layers panel ─────────────────────────────────────────────────────────── */

const panel = el('aside', 'ly-panel');
panel.setAttribute('aria-label', 'Layers');
panel.innerHTML = `
  <button class="ly-panel__head" type="button" aria-expanded="false">
    <span>Layers</span><span class="ly-panel__count"></span>
  </button>
  <ol class="ly-panel__list">
    ${LAYERS.map(
      (l, i) => `
      <li class="ly-row" data-id="${l.id}">
        <button class="ly-eye" type="button" aria-pressed="false" aria-label="Toggle ${l.name} layer">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
        <span class="ly-row__n">${String(i + 1).padStart(2, '0')}</span>
        <span class="ly-row__name">${l.name}<small>${l.desc}</small></span>
        <span class="ly-row__bar"><i></i></span>
      </li>`,
    ).join('')}
  </ol>
  <div class="ly-panel__foot"><span class="ly-panel__preset"></span><button type="button" class="ly-reset">Reset preset</button></div>`;
const rows = Object.fromEntries([...panel.querySelectorAll('.ly-row')].map((r) => [r.dataset.id, r]));
const panelHead = panel.querySelector('.ly-panel__head');
panelHead.addEventListener('click', () => {
  const open = panel.classList.toggle('is-open');
  panelHead.setAttribute('aria-expanded', String(open));
});

/* ── State ────────────────────────────────────────────────────────────────── */

const L = Object.fromEntries(LAYERS.map((l) => [l.id, new Tween(0, ease.inOutCubic)]));
const reveal = Object.fromEntries(['edges', 'dims', 'process', 'places'].map((k) => [k, new Tween(0, ease.outCubic)]));
const PAL_KEYS = ['bg', 'ink', 'muted', 'accent', 'clay'];
const pal = Object.fromEntries(PAL_KEYS.map((k) => [k, new Tween(hexToRgb(PALETTES.reality[k]))]));
const palNum = Object.fromEntries(['mono', 'film', 'env', 'shadow'].map((k) => [k, new Tween(PALETTES.reality[k])]));
let section = 'reality';
let custom = false;
let switcher = null;
const target = {};
const now = () => performance.now() / 1000;

function applyPreset(id, { instant = false } = {}) {
  section = id;
  custom = false;
  const t = now();
  const preset = PRESETS[id];
  for (const l of LAYERS) setLayer(l.id, preset[l.id] ?? 0, t, instant);
  const p = PALETTES[id];
  const dur = instant ? 0 : reduced ? 0.3 : 1.3;
  for (const k of PAL_KEYS) pal[k].set(hexToRgb(p[k]), t, dur, 0, ease.inOutSine);
  for (const k in palNum) palNum[k].set(p[k], t, dur, 0, ease.inOutSine);
  document.body.dataset.section = id;
  updatePanel();
}

function setLayer(id, v, t = now(), instant = false) {
  const prev = target[id] ?? 0;
  target[id] = v;
  // Layers leaving go first; layers arriving follow, so the scene never gets cluttered.
  const leaving = v < prev;
  const dur = instant ? 0 : reduced ? 0.25 : leaving ? 0.7 : 1.0;
  const delay = instant || reduced ? 0 : leaving ? 0 : 0.35;
  L[id].set(v, t, dur, delay);
  if (reveal[id] && v > 0 && prev === 0) {
    reveal[id].jump(0);
    reveal[id].set(1, t, instant ? 0 : reduced ? 0.3 : 1.6, delay, ease.inOutCubic);
  }
}

function updatePanel() {
  let on = 0;
  for (const l of LAYERS) {
    const v = target[l.id] ?? 0;
    if (v > 0) on++;
    rows[l.id].classList.toggle('is-on', v > 0);
    rows[l.id].querySelector('.ly-eye').setAttribute('aria-pressed', String(v > 0));
  }
  panel.querySelector('.ly-panel__count').textContent = `${on} of ${LAYERS.length} on`;
  const sec = SECTIONS.find((s) => s.id === section);
  panel.querySelector('.ly-panel__preset').textContent = custom ? 'Custom mix' : `Preset · ${sec.label}`;
  panel.classList.toggle('is-custom', custom);
  switcher?.el.classList.toggle('is-custom', custom);
}

for (const l of LAYERS) {
  rows[l.id].querySelector('.ly-eye').addEventListener('click', () => {
    const v = target[l.id] ?? 0;
    // Shell toggles between full and ghosted, everything else on/off.
    const next = l.id === 'shell' ? (v >= 1 ? 0.1 : 1) : v > 0 ? 0 : 1;
    custom = true;
    setLayer(l.id, next);
    updatePanel();
  });
}
panel.querySelector('.ly-reset').addEventListener('click', () => applyPreset(section));

/* ── Camera (fixed; a gentle drag that springs back) ──────────────────────── */

const view = { W: innerWidth, H: innerHeight };
const orbit = { az: 0, el: 0, dragging: false, px: 0, py: 0, tx: 0, ty: 0 };
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
  orbit.az = clamp(orbit.az - (e.clientX - orbit.px) * 0.3, -50, 50);
  orbit.el = clamp(orbit.el + (e.clientY - orbit.py) * 0.2, -15, 30);
  orbit.px = e.clientX;
  orbit.py = e.clientY;
});
canvas.addEventListener('pointerup', () => (orbit.dragging = false));

function placeCamera(dt) {
  if (!orbit.dragging) {
    orbit.az *= 1 - Math.min(1, dt * 2.5);
    orbit.el *= 1 - Math.min(1, dt * 2.5);
  }
  const mobile = view.W < 760;
  const az = ((-28 + orbit.az + orbit.tx * 2.5) * Math.PI) / 180;
  const el = ((20 + orbit.el - orbit.ty * 1.5) * Math.PI) / 180;
  // Keep the whole stage (camera + film arc) in frame whatever the aspect.
  const need = mobile ? Math.max(17.5 / (view.W / view.H), 20) : Math.max(30 / (view.W / view.H) / 0.78, 20);
  const dist = (need / 2 / Math.tan((camera.fov * Math.PI) / 360)) * (mobile ? 1.12 : 1);
  camera.position.set(TARGET.x + dist * Math.cos(el) * Math.sin(az), TARGET.y + dist * Math.sin(el), TARGET.z + dist * Math.cos(el) * Math.cos(az));
  camera.lookAt(TARGET);
  camera.aspect = view.W / view.H;
  const right = mobile ? 0 : 320;
  const bottom = mobile ? 150 : 40;
  camera.setViewOffset(view.W, view.H, right / 2, bottom / 2, view.W, view.H);
  camera.updateProjectionMatrix();
}

/* ── Frame ────────────────────────────────────────────────────────────────── */

const proj = new THREE.Vector3();
const toCam = new THREE.Vector3();
function screen(p) {
  proj.copy(p).applyMatrix4(cam.root.matrixWorld).project(camera);
  return [(proj.x * 0.5 + 0.5) * view.W, (-proj.y * 0.5 + 0.5) * view.H, proj.z < 1];
}
function facing(a) {
  if (!a.n) return 1;
  toCam.copy(camera.position).sub(a.p).normalize();
  return smoothstep(-0.05, 0.25, a.n.dot(toCam));
}
// SVG paths: hide outright when faded (Chromium can keep painting a path whose
// style opacity animated to 0).
const pathOpacity = (p, o) => {
  p.setAttribute('stroke-opacity', o.toFixed(3));
  p.style.display = o < 0.003 ? 'none' : '';
};
const put = (n, x, y, o) => {
  n.style.opacity = o.toFixed(3);
  n.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
};

const tmpC = new THREE.Color();
let last = performance.now();
function frame() {
  const nowMs = performance.now();
  const dt = Math.min(0.05, (nowMs - last) / 1000);
  last = nowMs;
  const t = nowMs / 1000;
  const v = Object.fromEntries(LAYERS.map((l) => [l.id, L[l.id].update(t)]));
  for (const k in reveal) reveal[k].update(t);
  for (const k of PAL_KEYS) pal[k].update(t);
  for (const k in palNum) palNum[k].update(t);

  // Palette → CSS + WebGL
  const bg = pal.bg.value;
  const ink = pal.ink.value;
  const accent = pal.accent.value;
  renderer.setClearColor(tmpC.setRGB(bg[0], bg[1], bg[2], THREE.SRGBColorSpace));
  document.body.style.cssText = `--bg:${rgbToCss(bg)};--ink:${rgbToCss(ink)};--muted:${rgbToCss(pal.muted.value)};--accent:${rgbToCss(
    accent,
  )};--line:${rgbToCss(ink, 0.14)};--light:${v.light.toFixed(3)}`;

  // Shell: real → ghost
  const real = smoothstep(0.3, 0.95, v.shell);
  const ghostA = Math.min(1, v.shell / 0.1) * (1 - real);
  for (const mt of shellMats) {
    mt.opacity = mt.userData.baseOpacity * real;
    mt.depthWrite = real > 0.98;
    mt.visible = real > 0.002;
  }
  ghost.uniforms.uOpacity.value = ghostA;
  ghost.uniforms.uColor.value.setRGB(ink[0], ink[1], ink[2], THREE.SRGBColorSpace);
  for (const g of ghosts) g.visible = ghostA > 0.002;
  for (const m of cam.shell) m.castShadow = real > 0.5;

  // Structure: visible under the ghost; pulled toward clay
  const clay = tmpC.setRGB(...pal.clay.value, THREE.SRGBColorSpace).clone();
  for (const mt of structMats) {
    mt.opacity = mt.userData.baseOpacity * v.structure;
    mt.visible = v.structure > 0.002;
    mt.depthWrite = v.structure > 0.98;
    mt.color.copy(mt.userData.base).lerp(clay, palNum.mono.value);
  }
  M.film.color.copy(new THREE.Color(1, 1, 1)).lerp(tmpC.setRGB(accent[0], accent[1], accent[2], THREE.SRGBColorSpace), palNum.film.value * 0.6);

  // Edges, dims, process, places
  for (const mt of [edgeMat, edgeInnerMat]) {
    mt.uniforms.uColor.value.setRGB(ink[0], ink[1], ink[2], THREE.SRGBColorSpace);
    mt.uniforms.uReveal.value = reveal.edges.value;
  }
  edgeMat.uniforms.uOpacity.value = v.edges;
  edgeInnerMat.uniforms.uOpacity.value = v.edges * 0.5 * smoothstep(0, 1, v.structure);
  opticMat.uniforms.uOpacity.value = v.edges * v.structure;
  opticMat.uniforms.uReveal.value = reveal.edges.value;
  opticMat.uniforms.uFlow.value = -t * 0.6;
  edgeGroup.visible = v.edges > 0.002;
  dimMat.uniforms.uOpacity.value = v.dims;
  dimMat.uniforms.uReveal.value = reveal.dims.value;
  dimLines.visible = v.dims > 0.002;
  processMat.uniforms.uOpacity.value = v.process;
  processMat.uniforms.uReveal.value = reveal.process.value;
  processMat.uniforms.uColor.value.setRGB(accent[0], accent[1], accent[2], THREE.SRGBColorSpace);
  processLines.visible = v.process > 0.002;
  stripMat.uniforms.uOpacity.value = v.places;
  stripMat.uniforms.uReveal.value = reveal.places.value;
  strip.visible = v.places > 0.002;

  // Light: a single warm key, deep shadow, dimmer environment
  scene.environmentIntensity = palNum.env.value * (1 - 0.86 * v.light);
  key.intensity = lerp(1.4, 3.6, v.light);
  key.color.setRGB(1, lerp(1, 0.84, v.light), lerp(1, 0.66, v.light));
  // Low, raking side light: the front falls into shadow, edges catch highlights.
  key.position.set(lerp(-14, -24, v.light), lerp(22, 12, v.light), lerp(18, 2, v.light));
  rim.intensity = 4.5 * v.light;
  fill.intensity = lerp(0.35, 0.02, v.light);
  shadowMat.opacity = palNum.shadow.value;
  contactMat.opacity = palNum.shadow.value * 0.9;

  placeCamera(dt);
  cam.root.updateMatrixWorld();
  renderer.render(scene, camera);

  // Overlay
  for (const n of NOTES) {
    const a = cam.anchors[n.anchor];
    const [x, y, ok] = screen(a.p);
    const o = ok && !(n.desktopOnly && isMobile()) ? v.notes * facing(a) : 0;
    const k = isMobile() ? 0.55 : 1;
    const half = isMobile() ? 72 : 108;
    const nx = clamp(x + n.dx * k, half, view.W - half);
    const ny = y + n.dy * k;
    put(n.el, nx, ny, o);
    pathOpacity(n.path, o);
    const cx = (x + nx) / 2 + n.dy * 0.15 * k;
    const cy = (y + ny) / 2 - n.dx * 0.1 * k;
    n.path.setAttribute('d', `M${x.toFixed(1)},${y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${nx.toFixed(1)},${ny.toFixed(1)}`);
  }
  DIMS.forEach((dm, i) => {
    const [x, y, ok] = screen(dm.mid);
    put(dimLabels[i], x, y, ok ? v.dims * smoothstep(0.5, 1, reveal.dims.value) : 0);
  });
  BALLOONS.forEach((b) => {
    const a = cam.anchors[b.anchor];
    const [x, y, ok] = screen(a.p);
    put(b.el, x, y, ok ? v.process * smoothstep(0.3, 0.9, reveal.process.value) : 0);
  });
  {
    const [x, y] = screen(cc);
    put(revTag, x, y + 40, v.process * smoothstep(0.7, 1, reveal.process.value));
  }
  // Frame labels hide while their frame is behind the body, edge-on at the turn,
  // or would collide with a label already shown.
  const body = screenBox();
  const shown = [];
  // Nearest frames claim their label space first.
  const order = PLACE_FRAMES.map((f, i) => {
    screen(f.p);
    return { f, i, z: proj.z };
  }).sort((a, b) => a.z - b.z);
  order.forEach(({ f, i }) => {
    const [x, y, ok] = screen(f.p);
    const behind = proj.z > body.z && x > body.x0 && x < body.x1 && y > body.y0 && y < body.y1;
    const a = lerp(STRIP.a0, STRIP.a1, f.u);
    const n = V(Math.cos(a), 0, -Math.sin(a) / 0.62).normalize();
    toCam.copy(camera.position).sub(f.p).setY(0).normalize();
    const edgeOn = Math.abs(n.dot(toCam)) < 0.3;
    const box = { x0: x - 80, x1: x + 80, y0: y - 40, y1: y };
    const clash = shown.some((b) => box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0);
    const vis = ok && !behind && !edgeOn && !clash;
    if (vis) shown.push(box);
    put(placeLabels[i], x, y, vis ? v.places * smoothstep(f.u, f.u + 0.08, reveal.places.value) : 0);
  });
  const pos2 = new Map();
  for (const n of NODES) {
    let [x, y] = screen(n.pos);
    x = clamp(x, isMobile() ? 70 : 90, view.W - (isMobile() ? 70 : 90));
    const [ax, ay] = screen(cam.anchors[n.anchor].p);
    pos2.set(n.id, [x, y]);
    put(n.el, x, y, v.connections);
    pathOpacity(n.path, v.connections * 0.9);
    n.path.setAttribute('d', `M${x.toFixed(1)},${y.toFixed(1)} L${ax.toFixed(1)},${ay.toFixed(1)}`);
  }
  for (const l of nodeLinks) {
    const [x1, y1] = pos2.get(l.a.id);
    const [x2, y2] = pos2.get(l.b.id);
    pathOpacity(l.path, v.connections * 0.5);
    l.path.setAttribute('d', `M${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)}`);
  }

  // Panel bars mirror the live opacities.
  for (const l of LAYERS) rows[l.id].style.setProperty('--v', v[l.id].toFixed(3));

  if (!document.hidden) requestAnimationFrame(frame);
}
const isMobile = () => view.W < 760;

// Screen-space box + centre depth of the camera body, for cheap occlusion tests.
const BODY_CORNERS = [];
for (const x of [-DIM.W / 2, DIM.W / 2]) for (const y of [DIM.Y0, DIM.Y1]) for (const z of [-DIM.D / 2, DIM.ZF]) BODY_CORNERS.push(V(x, y, z));
function screenBox() {
  const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity, z: 0 };
  for (const c of BODY_CORNERS) {
    const [x, y] = screen(c);
    b.x0 = Math.min(b.x0, x);
    b.x1 = Math.max(b.x1, x);
    b.y0 = Math.min(b.y0, y);
    b.y1 = Math.max(b.y1, y);
  }
  screen(V(0, 0, 0));
  b.z = proj.z;
  return b;
}

addEventListener('resize', () => {
  view.W = innerWidth;
  view.H = innerHeight;
  renderer.setSize(view.W, view.H);
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    last = performance.now();
    requestAnimationFrame(frame);
  }
});

let first = true;
switcher = mountSwitcher({
  items: SECTIONS,
  initial: 'reality',
  label: 'Layer presets',
  onChange: (id) => {
    applyPreset(id, { instant: first });
    first = false;
  },
});
updatePanel();
requestAnimationFrame(frame);
