import '../shared/base.css';
import './style.css';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mountChrome, mountSwitcher, prefersReducedMotion } from '../shared/chrome.js';
import { items, modes } from '../content.js';
import { ease, lerp, clamp, hexToRgb, rgbToCss } from '../anim.js';
import { loadLandMask } from '../shared/geo.js';
import { MODE_IDS, config } from './modes.js';
import * as build from './objects.js';
import { screenTexture, panelTexture, mapTexture } from './textures.js';

mountChrome('viewport');

const DEG = Math.PI / 180;
const byId = new Map(items.map((it) => [it.id, it]));
const reduced = prefersReducedMotion();

/* ── Renderer, scene, camera ──────────────────────────────────────────────── */

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
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
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.05, 200);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bokeh = new BokehPass(scene, camera, { focus: 3, aperture: 0, maxblur: 0.014 });
composer.addPass(bokeh);
composer.addPass(new OutputPass());

/* ── Lights ───────────────────────────────────────────────────────────────── */

const hemi = new THREE.HemisphereLight('#ffffff', '#b9ae9f', 1);
const amb = new THREE.AmbientLight('#ffffff', 0.1);
const key = new THREE.DirectionalLight('#ffffff', 2.5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -4.5;
key.shadow.camera.right = 4.5;
key.shadow.camera.top = 3;
key.shadow.camera.bottom = -3;
key.shadow.camera.near = 0.5;
key.shadow.camera.far = 20;
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;
key.shadow.radius = 4;
scene.add(hemi, amb, key, key.target);

/* ── Table, grid, map ─────────────────────────────────────────────────────── */

const TABLE = { w: 6.8, d: 3.3 };
const MAP = { w: 6.8, d: 3.4 };
const tableMat = new THREE.MeshStandardMaterial({ color: '#d9ccb6', roughness: 0.82, metalness: 0 });
const table = new THREE.Mesh(new RoundedBoxGeometry(TABLE.w, 0.14, TABLE.d, 4, 0.05), tableMat);
table.position.y = -0.07;
table.receiveShadow = true;
scene.add(table);

const gridMat = new THREE.LineBasicMaterial({ color: '#15191e', transparent: true, opacity: 0, depthWrite: false });
{
  const pts = [];
  const step = 0.2;
  for (let x = -TABLE.w / 2 + 0.2; x <= TABLE.w / 2 - 0.2 + 1e-6; x += step) pts.push(x, 0.001, -TABLE.d / 2 + 0.2, x, 0.001, TABLE.d / 2 - 0.2);
  for (let z = -TABLE.d / 2 + 0.2; z <= TABLE.d / 2 - 0.2 + 1e-6; z += step) pts.push(-TABLE.w / 2 + 0.2, 0.001, z, TABLE.w / 2 - 0.2, 0.001, z);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  scene.add(new THREE.LineSegments(g, gridMat));
}

const mapMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
const mapPlane = new THREE.Mesh(new THREE.PlaneGeometry(MAP.w, MAP.d), mapMat);
mapPlane.rotation.x = -Math.PI / 2;
mapPlane.position.y = 0.002;
scene.add(mapPlane);
loadLandMask(1024).then(({ isLand }) => {
  mapMat.map = mapTexture(isLand);
  mapMat.needsUpdate = true;
});

const lonLatToTable = (lat, lon) => new THREE.Vector3((lon / 180) * (MAP.w / 2), 0, (-lat / 90) * (MAP.d / 2));

/* ── Objects ──────────────────────────────────────────────────────────────── */

const screenTex = screenTexture();
// Two rows on the table. `shot` is how the Image camera frames each one.
const OBJECTS = [
  { key: 'facility', item: 'facility', make: build.facility, pos: [-2.3, -0.6], rot: 0.35, name: 'Facility maquette', shot: { az: 32, el: 22, box: [2.1, 1.3] } },
  { key: 'robot', item: 'cell', make: build.robot, pos: [-1.45, 0.62], rot: -0.6, name: 'Robot arm', shot: { az: -40, el: 8, box: [1.5, 1.2] } },
  { key: 'flange', item: 'fixtures', make: build.flange, pos: [-0.65, -0.6], rot: 0, name: 'Fixture flange', shot: { az: 24, el: 26, box: [1.1, 0.7] } },
  { key: 'console', item: 'g64', make: build.consoleBox, pos: [0.15, 0.62], rot: -0.25, name: 'Console', shot: { az: -34, el: 9, box: [1.15, 0.72] } },
  { key: 'laptop', item: 'site', make: () => build.laptop(screenTex), pos: [0.95, -0.6], rot: -0.18, name: 'Laptop', shot: { az: -22, el: 16, box: [1.25, 0.8] } },
  { key: 'camera', item: 'film', make: build.filmCamera, pos: [1.75, 0.62], rot: -0.45, name: 'Film camera', shot: { az: -30, el: 5, box: [1.3, 0.8] } },
  { key: 'led', item: 'led', make: build.ledPanel, pos: [2.45, -0.55], rot: -0.35, name: 'LED matrix', shot: { az: -24, el: 12, box: [1.3, 0.85] } },
];
const S = 1.4; // object scale on the table
const S_MAP = 0.42; // object scale as map tokens

const edgeMat = new THREE.LineBasicMaterial({ color: '#15191e', transparent: true, opacity: 0 });
const edgeSelMat = new THREE.LineBasicMaterial({ color: '#e0362c', transparent: true, opacity: 0 });
const tmpColor = new THREE.Color();

const objects = OBJECTS.map((def, index) => {
  const built = def.make();
  const group = built.group;
  scene.add(group);
  const meshes = [];
  group.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    // Push solids back a hair so their outlines never z-fight in hidden-line mode.
    m.polygonOffset = true;
    m.polygonOffsetFactor = 1;
    m.polygonOffsetUnits = 1;
    o.userData.real = { color: m.color.clone(), metalness: m.metalness, roughness: m.roughness };
    o.userData.isAccent = built.parts.some((p) => p.accent && (p.obj === o || p.obj.getObjectById(o.id)));
    meshes.push(o);
    if (!o.userData.glass && !o.isInstancedMesh) {
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry.userData.edgeSource ?? o.geometry, 28), edgeMat);
      edges.raycast = () => {};
      o.add(edges);
      o.userData.edges = edges;
    }
  });
  const it = byId.get(def.item);
  const home = new THREE.Vector3(def.pos[0], 0, def.pos[1]);
  return {
    ...def,
    index,
    it,
    group,
    parts: built.parts,
    anchor: built.anchor,
    dims: built.dims,
    meshes,
    home,
    placePos: new THREE.Vector3(),
    panel: null,
  };
});
const objByKey = new Map(objects.map((o) => [o.key, o]));

// Place mode: the co-located projects fan out around a shared "home base" pin;
// the film camera tours the trips instead.
const travel = items.filter((it) => it.kind === 'travel').sort((a, b) => a.years[0] - b.years[0]);
const homeObjs = objects.filter((o) => o.key !== 'camera');
const homeBase = (() => {
  const v = new THREE.Vector3();
  homeObjs.forEach((o) => v.add(lonLatToTable(o.it.place.lat, o.it.place.lon)));
  return v.multiplyScalar(1 / homeObjs.length);
})();
homeObjs.forEach((o, i) => {
  const a = (i / homeObjs.length) * Math.PI * 2 - Math.PI / 2;
  o.placePos.set(homeBase.x + Math.cos(a) * 0.4, 0, homeBase.z + Math.sin(a) * 0.32);
});
const route = travel.map((it) => lonLatToTable(it.place.lat, it.place.lon));

// Travel pins rise out of the map.
const pinMat = new THREE.MeshStandardMaterial({ color: '#ffb648', emissive: '#ffb648', emissiveIntensity: 0.6, roughness: 0.4 });
const pins = travel.map((it) => {
  const g = new THREE.Group();
  g.position.copy(lonLatToTable(it.place.lat, it.place.lon));
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 8), pinMat);
  needle.position.y = 0.11;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.03, 20, 14), pinMat);
  head.position.y = 0.23;
  g.add(needle, head);
  g.scale.setScalar(0.0001);
  scene.add(g);
  return { it, group: g };
});

// Route line between trips (drawn on the map)
const routeMat = new THREE.LineDashedMaterial({ color: '#ffb648', dashSize: 0.05, gapSize: 0.04, transparent: true, opacity: 0, depthWrite: false });
{
  const pts = [];
  const all = [homeBase, ...route];
  for (let i = 0; i < all.length - 1; i++) {
    const a = all[i];
    const b = all[i + 1];
    for (let s = 0; s <= 24; s++) {
      const t = s / 24;
      const p = a.clone().lerp(b, t);
      p.y = 0.01 + Math.sin(Math.PI * t) * 0.0;
      p.z -= Math.sin(Math.PI * t) * a.distanceTo(b) * 0.12;
      pts.push(p);
    }
  }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.Line(g, routeMat);
  line.computeLineDistances();
  scene.add(line);
}

/* ── Digital: floating windows + network ──────────────────────────────────── */

const panelGeo = new THREE.PlaneGeometry(0.64, 0.4);
const STACK = {
  facility: 'layout.dwg → mes.db',
  robot: 'plc ↔ vision ↔ hmi',
  flange: 'fixture.sldprt · params',
  console: 'rom · firmware · mods',
  laptop: 'vite · three.js · live',
  led: 'firmware · anim push',
  camera: 'film-log · roll #148',
};
for (const o of objects) {
  const mat = new THREE.MeshBasicMaterial({ map: panelTexture(`${o.key}.app`, STACK[o.key], o.key), transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(panelGeo, mat);
  mesh.renderOrder = 5;
  scene.add(mesh);
  o.panel = mesh;
}
const netPairs = [];
for (const o of objects) {
  for (const r of o.it.related ?? []) {
    const other = objects.find((x) => x.it.id === r);
    if (other && o.index < other.index) netPairs.push([o, other]);
  }
}
// Everything digital routes through the website/laptop too.
for (const o of objects) if (o.key !== 'laptop' && !netPairs.some(([a, b]) => (a === o && b.key === 'laptop') || (b === o && a.key === 'laptop'))) netPairs.push([o, objByKey.get('laptop')]);
const netGeo = new THREE.BufferGeometry();
netGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(netPairs.length * 6), 3));
const netMat = new THREE.LineBasicMaterial({ color: '#5cf2b0', transparent: true, opacity: 0, depthWrite: false });
const net = new THREE.LineSegments(netGeo, netMat);
net.frustumCulled = false;
scene.add(net);

/* ── Build: assembly lines ────────────────────────────────────────────────── */

const explodeParts = objects.flatMap((o) => o.parts.filter((p) => p.explode.lengthSq() > 0).map((p) => ({ o, p })));
const asmGeo = new THREE.BufferGeometry();
asmGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(explodeParts.length * 6), 3));
const asmMat = new THREE.LineDashedMaterial({ color: '#ff6a1a', dashSize: 0.025, gapSize: 0.02, transparent: true, opacity: 0, depthWrite: false });
const asm = new THREE.LineSegments(asmGeo, asmMat);
asm.frustumCulled = false;
scene.add(asm);

/* ── Structure: dimension lines ───────────────────────────────────────────── */

const dimList = objects.flatMap((o) => o.dims.map((d) => ({ o, d })));
const dimGeo = new THREE.BufferGeometry();
dimGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(dimList.length * 6 * 5), 3));
const dimMat = new THREE.LineBasicMaterial({ color: '#e0362c', transparent: true, opacity: 0, depthWrite: false });
const dims = new THREE.LineSegments(dimGeo, dimMat);
dims.frustumCulled = false;
scene.add(dims);

/* ── HTML layer ───────────────────────────────────────────────────────────── */

const el = (tag, cls, parent = document.body, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  parent.appendChild(n);
  return n;
};

const header = el('header', 'vp-header');
header.innerHTML = `
  <span class="vp-header__kicker">Viewport · <span data-k="index"></span> · <span data-k="section"></span></span>
  <h1 class="vp-header__mode" data-k="mode"></h1>
  <p class="vp-header__render" data-k="render"></p>
  <p class="vp-header__cam" data-k="cam"></p>`;
const hk = Object.fromEntries([...header.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));

const labelLayer = el('div', 'vp-labels');
labelLayer.setAttribute('aria-hidden', 'true');
for (const o of objects) {
  o.label = el('button', 'vp-label', labelLayer, `<span class="vp-label__title"></span><span class="vp-label__meta"></span>`);
  // Front-row labels hang below their object so they never cover the back row.
  o.below = o.pos[1] > 0;
  o.label.classList.toggle('is-below', o.below);
  o.label.type = 'button';
  o.label.tabIndex = -1;
  o.label.addEventListener('click', () => select(o.key));
  o.label.addEventListener('pointerenter', () => setHover(o.key));
  o.label.addEventListener('pointerleave', () => setHover(null));
}
const dimLabels = dimList.map(({ d }) => el('span', 'vp-dim', labelLayer, d.text));
const balloons = objects.flatMap((o) =>
  o.parts
    .filter((p) => p.label)
    .map((p, i) => ({ o, p, el: el('span', 'vp-balloon', labelLayer, `<b>${i + 1}</b>${p.label}`) })),
);
const pinLabels = pins.map(({ it }) => {
  const { lat, lon } = it.place;
  return el(
    'span',
    'vp-pin',
    labelLayer,
    `<b>${it.title}</b>${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`,
  );
});
const homeLabel = el('span', 'vp-pin vp-pin--home', labelLayer, `<b>Home base</b>${homeObjs.length} projects`);
const tourLabel = el('span', 'vp-pin vp-pin--tour', labelLayer, `<b>Film camera</b>on tour`);

const titleBlock = el('div', 'vp-titleblock');
titleBlock.setAttribute('aria-hidden', 'true');
titleBlock.innerHTML = `
  <div><span>Project</span><b>Grant Sacco — work</b></div>
  <div><span>View</span><b>Iso · hidden line</b></div>
  <div><span>Scale</span><b>1 : 10</b></div>
  <div><span>Drawn</span><b>G. Sacco</b></div>
  <div><span>Sheet</span><b>02 / 06</b></div>
  <div><span>Rev</span><b>C</b></div>`;

const film = el('div', 'vp-film');
film.setAttribute('aria-hidden', 'true');
film.innerHTML = '<i class="vp-film__bar"></i><i class="vp-film__bar vp-film__bar--b"></i><i class="vp-film__grain"></i>';

const caption = el('div', 'vp-caption');
caption.innerHTML = `
  <button type="button" class="vp-caption__nav" data-d="-1" aria-label="Previous subject">‹</button>
  <div><p class="vp-caption__frame"></p><p class="vp-caption__text"></p></div>
  <button type="button" class="vp-caption__nav" data-d="1" aria-label="Next subject">›</button>`;
caption.querySelectorAll('.vp-caption__nav').forEach((b) => b.addEventListener('click', () => cycleShot(+b.dataset.d)));

const inspector = el('aside', 'vp-inspector');
inspector.innerHTML = `
  <p class="vp-inspector__h">Outliner</p>
  <ol class="vp-outliner">${objects
    .map((o) => `<li><button type="button" data-key="${o.key}"><span>${String(o.index + 1).padStart(2, '0')}</span>${o.name}</button></li>`)
    .join('')}</ol>
  <p class="vp-inspector__h">Properties</p>
  <div class="vp-props"></div>`;
const props = inspector.querySelector('.vp-props');
inspector.querySelectorAll('.vp-outliner button').forEach((b) => {
  b.addEventListener('click', () => select(b.dataset.key));
  b.addEventListener('pointerenter', () => setHover(b.dataset.key));
  b.addEventListener('pointerleave', () => setHover(null));
});

/* ── Mode state (everything is a weighted blend of mode configs) ──────────── */

let mode = 'reality';
let selected = 'camera';
let hovered = null;
let shotKey = 'camera';
const wFrom = MODE_IDS.map(() => 0);
const wTo = MODE_IDS.map(() => 0);
const w = MODE_IDS.map(() => 0);
const trans = { t0: 0, dur: 0.001, swapped: true };
const rgb = Object.fromEntries(
  MODE_IDS.map((id) => {
    const c = config[id];
    return [
      id,
      {
        bg: hexToRgb(c.bg),
        ink: hexToRgb(c.palette.ink),
        muted: hexToRgb(c.palette.muted),
        accent: hexToRgb(c.palette.accent),
        table: hexToRgb(c.table),
        solid: c.solid ? hexToRgb(c.solid) : null,
        keyColor: hexToRgb(c.light.keyColor),
        edge: hexToRgb(c.edge.color),
      },
    ];
  }),
);

function setMode(id) {
  const t = performance.now() / 1000;
  const first = trans.dur === 0.001 && wTo.every((v) => v === 0);
  for (let i = 0; i < w.length; i++) wFrom[i] = w[i];
  MODE_IDS.forEach((m, i) => (wTo[i] = m === id ? 1 : 0));
  const prev = mode;
  mode = id;
  trans.t0 = t;
  trans.dur = first ? 0.001 : reduced ? 0.35 : id === 'place' || prev === 'place' ? 2.2 : 1.8;
  trans.swapped = false;
}

function blend(fn) {
  let s = 0;
  for (let i = 0; i < MODE_IDS.length; i++) if (w[i] > 1e-4) s += w[i] * fn(config[MODE_IDS[i]], MODE_IDS[i]);
  return s;
}
function blendRgb(key, out = [0, 0, 0], fallback) {
  out[0] = out[1] = out[2] = 0;
  for (let i = 0; i < MODE_IDS.length; i++) {
    if (w[i] <= 1e-4) continue;
    const c = rgb[MODE_IDS[i]][key] ?? fallback;
    out[0] += w[i] * c[0];
    out[1] += w[i] * c[1];
    out[2] += w[i] * c[2];
  }
  return out;
}

/* ── Camera rig: dolly-zoom between perspective and near-orthographic ─────── */

const view = { W: innerWidth, H: innerHeight };
const orbit = { az: 0, el: 0, vaz: 0, vel: 0, dragging: false, px: 0, py: 0 };
const parallax = { x: 0, y: 0, tx: 0, ty: 0 };

function shotTarget() {
  const o = objByKey.get(shotKey);
  const p = o.group.position;
  return [p.x + o.anchor.x * S * 0.4, (0.08 + o.anchor.y * 0.42) * S, p.z];
}

function insetsFor(id) {
  const mobile = view.W < 760;
  if (id === 'image') return { top: 0, bottom: mobile ? 120 : 140, right: 0 };
  return { top: mobile ? 170 : 150, bottom: mobile ? 110 : 120, right: mobile || id === 'image' ? 0 : 300 };
}

const camState = { az: 0, el: 0, fov: 30, fh: 4, tx: 0, ty: 0, tz: 0, top: 0, bottom: 0, right: 0 };
function updateCamera(dt) {
  const { W, H } = view;
  const c = camState;
  const shot = objByKey.get(shotKey).shot;
  // Portrait screens look down the length of the table instead of across it.
  const cam = (cfg) => (W / H < 0.8 && cfg.cam.mobile ? { ...cfg.cam, ...cfg.cam.mobile } : cfg.cam);
  c.az = blend((cfg, id) => (id === 'image' ? shot.az : cam(cfg).az));
  c.el = blend((cfg, id) => (id === 'image' ? shot.el : cam(cfg).el));
  c.fov = Math.exp(blend((cfg) => Math.log(cfg.cam.fov)));
  const st = shotTarget();
  c.tx = blend((cfg, id) => (id === 'image' ? st[0] : cfg.cam.target[0]));
  c.ty = blend((cfg, id) => (id === 'image' ? st[1] : cfg.cam.target[1]));
  c.tz = blend((cfg, id) => (id === 'image' ? st[2] : cfg.cam.target[2]));
  c.top = blend((cfg, id) => insetsFor(id).top);
  c.bottom = blend((cfg, id) => insetsFor(id).bottom);
  c.right = blend((cfg, id) => insetsFor(id).right * (id === 'image' ? 0 : 1));

  const freeW = Math.max(200, W - c.right);
  const freeH = Math.max(200, H - c.top - c.bottom);
  // Frame height needed so each mode's box fits the free area, blended in log space.
  c.fh = Math.exp(
    blend((cfg, id) => {
      const [bw, bh] = id === 'image' ? shot.box : cam(cfg).box;
      return Math.log(Math.max((bh * H) / freeH, (bw * H) / freeW) * 1.04);
    }),
  );

  // Drag orbit springs back; a little pointer parallax keeps it alive.
  if (!orbit.dragging) {
    orbit.az += (0 - orbit.az) * Math.min(1, dt * 3);
    orbit.el += (0 - orbit.el) * Math.min(1, dt * 3);
  }
  parallax.x += (parallax.tx - parallax.x) * Math.min(1, dt * 2.5);
  parallax.y += (parallax.ty - parallax.y) * Math.min(1, dt * 2.5);
  const still = w[1] + w[4]; // ortho + top-down stay precise
  const az = (c.az + orbit.az + parallax.x * 3 * (1 - still)) * DEG;
  const el = clamp(c.el + orbit.el + parallax.y * 2 * (1 - still), -5, 89.5) * DEG;

  const dist = c.fh / (2 * Math.tan((c.fov * DEG) / 2));
  const target = new THREE.Vector3(c.tx, c.ty, c.tz);
  camera.position.set(target.x + dist * Math.cos(el) * Math.sin(az), target.y + dist * Math.sin(el), target.z + dist * Math.cos(el) * Math.cos(az));
  camera.up.set(0, 1, 0);
  if (el > 89 * DEG) camera.up.set(-Math.sin(az), 0, -Math.cos(az));
  camera.lookAt(target);
  camera.fov = c.fov;
  camera.aspect = W / H;
  camera.near = Math.max(0.02, dist - 12);
  camera.far = dist + 14;
  // Shift the projection so the scene centres in the space the UI leaves free.
  camera.setViewOffset(W, H, (c.right / 2) * 1, (c.bottom - c.top) / 2, W, H);
  camera.updateProjectionMatrix();
  return dist;
}

/* ── Per-frame scene update ───────────────────────────────────────────────── */

const v3 = new THREE.Vector3();
const v3b = new THREE.Vector3();
const out3 = [0, 0, 0];
let last = performance.now();
let elapsed = 0;

function updateScene(t) {
  const wR = w[0];
  const wS = w[1];
  const wB = w[2];
  const wI = w[3];
  const wP = w[4];
  const wD = w[5];

  // Background + UI palette
  const bg = blendRgb('bg');
  renderer.setClearColor(tmpColor.setRGB(bg[0], bg[1], bg[2], THREE.SRGBColorSpace));
  const ink = blendRgb('ink', [0, 0, 0]);
  const muted = blendRgb('muted', [0, 0, 0]);
  const accent = blendRgb('accent', [0, 0, 0]);
  document.body.style.cssText = `--bg:${rgbToCss(bg)};--ink:${rgbToCss(ink)};--muted:${rgbToCss(muted)};--accent:${rgbToCss(
    accent,
  )};--line:${rgbToCss(ink, 0.14)};--w-image:${wI.toFixed(3)};--w-structure:${wS.toFixed(3)};--w-chrome:${(1 - wI * 0.82).toFixed(3)}`;

  // Lights
  hemi.intensity = blend((c) => c.light.hemi);
  amb.intensity = blend((c) => c.light.amb);
  key.intensity = blend((c) => c.light.key);
  key.color.setRGB(...blendRgb('keyColor', out3), THREE.SRGBColorSpace);
  key.position.set(
    blend((c) => c.light.keyPos[0]),
    blend((c) => c.light.keyPos[1]),
    blend((c) => c.light.keyPos[2]),
  );
  scene.environmentIntensity = blend((c) => c.light.env);
  renderer.toneMappingExposure = blend((c) => c.exposure);

  // Table, grid, map
  tableMat.color.setRGB(...blendRgb('table', out3), THREE.SRGBColorSpace);
  gridMat.opacity = blend((c) => c.grid) * 0.45;
  gridMat.color.setRGB(...(wD > wS ? rgb.digital.edge : rgb.structure.edge), THREE.SRGBColorSpace);
  mapMat.opacity = wP;
  routeMat.opacity = Math.pow(wP, 3) * 0.9;

  // Edges
  edgeMat.opacity = blend((c) => c.edge.opacity);
  edgeMat.color.setRGB(...blendRgb('edge', out3), THREE.SRGBColorSpace);
  edgeSelMat.opacity = Math.max(edgeMat.opacity, 0.001);
  edgeSelMat.color.setRGB(...accent, THREE.SRGBColorSpace);
  edgeMat.visible = edgeMat.opacity > 0.01;
  edgeSelMat.visible = edgeMat.visible;

  const emissive = blend((c) => c.emissive);
  const tourT = (t / 9) % 1;

  for (const o of objects) {
    // Object transform: home on the table, spread for Build, on the map for Place.
    const place = o.key === 'camera' ? tourPoint(tourT) : o.placePos;
    const px = o.home.x * (1 - wB * 0.04 - wP) + place.x * wP;
    const pz = o.home.z * (1 - wP) + place.z * wP;
    o.group.position.set(px, wD * 0.14, pz);
    o.group.rotation.y = o.rot * (1 - wP * 0.5);
    o.group.scale.setScalar(S * (1 - wP) + S_MAP * wP);

    // Exploded parts
    for (const p of o.parts) p.obj.position.copy(p.base).addScaledVector(p.explode, wB);

    // Materials: real → hidden-line white → clay → dark system solids.
    const sel = o.key === selected;
    for (const m of o.meshes) {
      const r = m.userData.real;
      const mat = m.material;
      if (m.userData.glass) {
        mat.opacity = 0.18 * (1 - wS - wD);
        continue;
      }
      if (m.isInstancedMesh) {
        mat.color.setScalar(0.08 + 0.8 * Math.min(1, emissive));
        continue;
      }
      if (m.userData.screen) {
        // Screens go dark glass in the drawing and the clay model.
        mat.color.setScalar(1 - 0.9 * (wS + wB * 0.6));
        mat.emissiveIntensity = emissive;
        continue;
      }
      let cr = 0;
      let cg = 0;
      let cb = 0;
      for (let i = 0; i < MODE_IDS.length; i++) {
        if (w[i] <= 1e-4) continue;
        const id = MODE_IDS[i];
        let c = rgb[id].solid;
        if (id === 'build' && m.userData.isAccent) c = rgb.build.accent;
        if (!c) {
          cr += w[i] * r.color.r;
          cg += w[i] * r.color.g;
          cb += w[i] * r.color.b;
        } else {
          // solid colours are sRGB triplets; convert to linear for the material
          tmpColor.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
          cr += w[i] * tmpColor.r;
          cg += w[i] * tmpColor.g;
          cb += w[i] * tmpColor.b;
        }
      }
      mat.color.setRGB(cr, cg, cb);
      const flat = wS + wB + wD;
      mat.metalness = r.metalness * (1 - flat);
      mat.roughness = r.roughness * (1 - flat) + flat * 0.9;
      if (mat.emissive && (m.userData.screen || m.isInstancedMesh)) mat.emissiveIntensity = emissive;
      if (m.userData.edges) m.userData.edges.material = sel && (wS > 0.5 || wD > 0.5) ? edgeSelMat : edgeMat;
    }

    // Digital windows float above each object.
    if (o.panel) {
      o.panel.material.opacity = Math.pow(wD, 1.5);
      o.panel.visible = wD > 0.01;
      o.panel.position.set(o.group.position.x, 1.0 + o.anchor.y * 0.25 + (o.index % 2) * 0.46, o.group.position.z);
      o.panel.scale.setScalar(0.7 + 0.3 * wD);
      o.panel.lookAt(camera.position);
    }
  }

  // Pins rise in Place mode.
  for (const p of pins) p.group.scale.set(1, Math.max(0.0001, wP), 1).multiplyScalar(Math.max(0.0001, Math.min(1, wP * 1.4)));

  // Network lines
  netMat.opacity = Math.pow(wD, 2) * 0.55;
  if (wD > 0.01) {
    const arr = netGeo.attributes.position.array;
    netPairs.forEach(([a, b], i) => {
      arr.set([a.panel.position.x, a.panel.position.y - 0.25, a.panel.position.z, b.panel.position.x, b.panel.position.y - 0.25, b.panel.position.z], i * 6);
    });
    netGeo.attributes.position.needsUpdate = true;
  }

  // Assembly lines
  asmMat.opacity = Math.pow(wB, 2) * 0.8;
  if (wB > 0.01) {
    const arr = asmGeo.attributes.position.array;
    explodeParts.forEach(({ p }, i) => {
      const parent = p.obj.parent;
      parent.updateWorldMatrix(true, false);
      v3.copy(p.base).applyMatrix4(parent.matrixWorld);
      v3b.copy(p.obj.position).applyMatrix4(parent.matrixWorld);
      arr.set([v3.x, v3.y, v3.z, v3b.x, v3b.y, v3b.z], i * 6);
    });
    asmGeo.attributes.position.needsUpdate = true;
    asm.computeLineDistances();
  }

  // Dimension lines: main line, two extension lines, two architectural ticks.
  dimMat.opacity = Math.pow(wS, 2);
  dimMat.color.setRGB(...rgb.structure.accent, THREE.SRGBColorSpace);
  if (wS > 0.01) {
    const arr = dimGeo.attributes.position.array;
    let k = 0;
    const push = (a, b) => {
      arr.set([a.x, a.y, a.z, b.x, b.y, b.z], k);
      k += 6;
    };
    for (const { o, d } of dimList) {
      o.group.updateWorldMatrix(true, false);
      const m = o.group.matrixWorld;
      const off = d.dir.clone().multiplyScalar(0.08);
      const a = d.a.clone().applyMatrix4(m);
      const b = d.b.clone().applyMatrix4(m);
      const a2 = d.a.clone().add(off).applyMatrix4(m);
      const b2 = d.b.clone().add(off).applyMatrix4(m);
      push(a2, b2);
      push(a, a2.clone().add(a2.clone().sub(a).multiplyScalar(0.3)));
      push(b, b2.clone().add(b2.clone().sub(b).multiplyScalar(0.3)));
      const tick = b2.clone().sub(a2).normalize().multiplyScalar(0.025).add(off.clone().normalize().multiplyScalar(0.025));
      push(a2.clone().sub(tick), a2.clone().add(tick));
      push(b2.clone().sub(tick), b2.clone().add(tick));
    }
    dimGeo.attributes.position.needsUpdate = true;
  }

  // Depth of field in Image mode.
  bokeh.enabled = wI > 0.01;
  if (bokeh.enabled) {
    const st = shotTarget();
    bokeh.uniforms.focus.value = camera.position.distanceTo(v3.set(st[0], st[1], st[2]));
    bokeh.uniforms.aperture.value = 0.022 * Math.pow(wI, 2);
    bokeh.uniforms.maxblur.value = 0.012;
  }
}

function tourPoint(t) {
  // Loop: trip 1 → trip 2 → trip 3 → back, pausing at each stop.
  const n = route.length;
  const seg = t * n;
  const i = Math.floor(seg);
  const local = ease.inOutCubic(clamp((seg - i - 0.35) / 0.65));
  const a = route[i % n];
  const b = route[(i + 1) % n];
  return v3b.copy(a).lerp(b, local).clone();
}

/* ── Labels ───────────────────────────────────────────────────────────────── */

const proj = new THREE.Vector3();
function toScreen(p) {
  proj.copy(p).project(camera);
  return [(proj.x * 0.5 + 0.5) * view.W, (-proj.y * 0.5 + 0.5) * view.H, proj.z < 1];
}

function place(elm, p, opacity, clampToView = false) {
  let [x, y, ok] = toScreen(p);
  if (clampToView) {
    // Keep centred labels fully on screen (narrow phones especially).
    const half = (elm._w ??= elm.offsetWidth) / 2 + 8;
    x = clamp(x, half, view.W - half);
  }
  elm.style.opacity = ok ? opacity.toFixed(3) : '0';
  elm.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
}

function updateLabels() {
  const wS = w[1];
  const wB = w[2];
  const wI = w[3];
  const wP = w[4];
  const wD = w[5];
  const labelOpacity = 1 - Math.min(1, wI * 1.6 + wP * 1.6 + wD * 1.6);
  for (const o of objects) {
    o.group.updateWorldMatrix(true, true);
    const a = o.below ? v3b.set(0, 0, 0.3).applyMatrix4(o.group.matrixWorld) : o.anchor.clone().applyMatrix4(o.group.matrixWorld);
    if (!o.below) a.y += 0.05 + wB * 0.32;
    place(o.label, a, labelOpacity, true);
    o.label.classList.toggle('is-hover', hovered === o.key);
    o.label.classList.toggle('is-selected', selected === o.key);
  }
  dimList.forEach(({ o, d }, i) => {
    const mid = d.a.clone().add(d.b).multiplyScalar(0.5).add(d.dir.clone().multiplyScalar(0.13));
    place(dimLabels[i], mid.applyMatrix4(o.group.matrixWorld), Math.pow(wS, 3));
  });
  const focus = hovered ?? selected;
  for (const b of balloons) {
    const vis = wB > 0.5 && b.o.key === focus ? (wB - 0.5) * 2 : 0;
    b.p.obj.updateWorldMatrix(true, false);
    const pos = new THREE.Vector3().setFromMatrixPosition(b.p.obj.matrixWorld);
    place(b.el, pos, vis);
  }
  const pinVis = Math.pow(wP, 3);
  pins.forEach((p, i) => place(pinLabels[i], v3.copy(p.group.position).setY(0.25), pinVis));
  place(homeLabel, v3.copy(homeBase).setZ(homeBase.z + 0.42), pinVis);
  place(tourLabel, v3.copy(objByKey.get('camera').group.position).setZ(objByKey.get('camera').group.position.z + 0.2), pinVis);
}

/* ── Header, inspector, caption ───────────────────────────────────────────── */

const SHOT_ORDER = ['camera', 'led', 'laptop', 'console', 'flange', 'robot', 'facility'];
function cycleShot(d) {
  const i = SHOT_ORDER.indexOf(shotKey);
  shotKey = SHOT_ORDER[(i + d + SHOT_ORDER.length) % SHOT_ORDER.length];
  selected = shotKey;
  renderProps();
  renderCaption();
}

function renderCaption() {
  const o = objByKey.get(shotKey);
  caption.querySelector('.vp-caption__frame').textContent = `Frame ${String(SHOT_ORDER.indexOf(shotKey) + 1).padStart(2, '0')} · ${o.name}`;
  caption.querySelector('.vp-caption__text').textContent = o.it.lens.image;
}

function metaFor(o, id) {
  const it = o.it;
  const yrs = it.years[0] === it.years[1] ? it.years[0] : `${it.years[0]}–${String(it.years[1]).slice(2)}`;
  switch (id) {
    case 'reality':
      return yrs;
    case 'structure':
      return `DWG-${String(o.index + 1).padStart(2, '0')} · ${o.meshes.length} bodies`;
    case 'build':
      return `${o.parts.length} parts · ${it.stage}`;
    default:
      return '';
  }
}

function swap() {
  trans.swapped = true;
  document.body.dataset.mode = mode;
  const c = config[mode];
  const md = modes.find((m) => m.id === mode);
  hk.index.textContent = String(MODE_IDS.indexOf(mode) + 1).padStart(2, '0');
  hk.section.textContent = md.section;
  hk.mode.textContent = c.name;
  hk.render.textContent = `${c.render} · ${c.scale}`;
  for (const o of objects) {
    o.label.querySelector('.vp-label__title').textContent = mode === 'structure' ? `${String(o.index + 1).padStart(2, '0')} ${o.name}` : o.it.title;
    o.label.querySelector('.vp-label__meta').textContent = metaFor(o, mode);
    o.label._w = undefined;
  }
  if (mode === 'image') {
    if (!SHOT_ORDER.includes(selected)) selected = 'camera';
    shotKey = selected;
    renderCaption();
  }
  renderProps();
}

function renderProps() {
  const o = objByKey.get(selected);
  inspector.querySelectorAll('.vp-outliner button').forEach((b) => b.classList.toggle('is-selected', b.dataset.key === selected));
  if (!o) {
    props.innerHTML = '<p class="vp-props__empty">Select an object.</p>';
    return;
  }
  const it = o.it;
  const md = modes.find((m) => m.id === mode);
  const rows = {
    reality: [
      ['Years', `${it.years[0]}–${it.years[1]}`],
      ['Where', it.place.name],
    ],
    structure: [
      ['Bodies', o.meshes.length],
      ['Envelope', o.dims[0]?.text ?? '—'],
      ['Complexity', it.axes.complexity.toFixed(2)],
    ],
    build: [
      ['Parts', o.parts.length],
      ['Stage', it.stage],
      ['Started', it.years[0]],
    ],
    image: [
      ['Lens', '50 mm'],
      ['Aperture', 'f/1.8'],
      ['Expressive', it.axes.expressive.toFixed(2)],
    ],
    place: [
      ['Place', it.place.name],
      ['Lat / Lon', `${it.place.lat.toFixed(2)}°, ${it.place.lon.toFixed(2)}°`],
    ],
    digital: [
      ['Stack', STACK[o.key]],
      ['Digital', it.axes.digital.toFixed(2)],
      ['Links', (it.related ?? []).length],
    ],
  }[mode];
  props.innerHTML = `
    <p class="vp-props__kicker">${md.section} · ${it.kind}</p>
    <h2 class="vp-props__title">${it.title}</h2>
    <p class="vp-props__lens">${it.lens[mode]}</p>
    <dl class="vp-props__rows">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
}

/* ── Interaction ──────────────────────────────────────────────────────────── */

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function pick(x, y) {
  ndc.set((x / view.W) * 2 - 1, -(y / view.H) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(
    objects.map((o) => o.group),
    true,
  );
  for (const h of hits) {
    const o = objects.find((ob) => ob.group.getObjectById(h.object.id));
    if (o) return o.key;
  }
  return null;
}

function setHover(k) {
  hovered = k;
  renderer.domElement.style.cursor = k ? 'pointer' : orbit.dragging ? 'grabbing' : 'grab';
}

function select(k) {
  selected = k;
  if (mode === 'image' && SHOT_ORDER.includes(k)) {
    shotKey = k;
    renderCaption();
  }
  document.body.classList.toggle('has-selection', !!k);
  renderProps();
}

const canvas = renderer.domElement;
let downAt = null;
canvas.addEventListener('pointerdown', (e) => {
  orbit.dragging = true;
  orbit.px = e.clientX;
  orbit.py = e.clientY;
  downAt = [e.clientX, e.clientY];
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  parallax.tx = (e.clientX / view.W - 0.5) * 2;
  parallax.ty = (e.clientY / view.H - 0.5) * 2;
  if (orbit.dragging) {
    orbit.az -= (e.clientX - orbit.px) * 0.25;
    orbit.el = clamp(orbit.el + (e.clientY - orbit.py) * 0.2, -20, 25);
    orbit.px = e.clientX;
    orbit.py = e.clientY;
  } else if (e.pointerType === 'mouse') setHover(pick(e.clientX, e.clientY));
});
canvas.addEventListener('pointerup', (e) => {
  orbit.dragging = false;
  if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 5) {
    const k = pick(e.clientX, e.clientY);
    if (k) select(k);
  }
  downAt = null;
});

addEventListener('resize', () => {
  for (const o of objects) o.label._w = undefined;
  view.W = innerWidth;
  view.H = innerHeight;
  renderer.setSize(view.W, view.H);
  composer.setSize(view.W, view.H);
});

/* ── Loop ─────────────────────────────────────────────────────────────────── */

function tick() {
  const nowMs = performance.now();
  const dt = Math.min(0.05, (nowMs - last) / 1000);
  last = nowMs;
  elapsed += dt;
  const t = elapsed;
  const now = nowMs / 1000;
  const p = clamp((now - trans.t0) / trans.dur);
  const k = ease.inOutCubic(p);
  for (let i = 0; i < w.length; i++) w[i] = lerp(wFrom[i], wTo[i], k);
  if (!trans.swapped && p >= 0.5) swap();

  updateCamera(dt);
  updateScene(t);
  const c = camState;
  hk.cam.textContent = `fov ${c.fov.toFixed(1)}° · az ${(c.az + orbit.az).toFixed(1)}° · el ${(c.el + orbit.el).toFixed(1)}° · ${c.fov < 4 ? 'orthographic' : 'perspective'}`;
  if (bokeh.enabled) composer.render(dt);
  else renderer.render(scene, camera);
  updateLabels();
  if (!document.hidden) requestAnimationFrame(tick);
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    last = performance.now();
    requestAnimationFrame(tick);
  }
});

mountSwitcher({
  items: MODE_IDS.map((id) => ({ id, label: config[id].name, sub: modes.find((m) => m.id === id).section.toLowerCase() })),
  initial: 'reality',
  label: 'Viewport mode',
  onChange: (id) => setMode(id),
});
select(selected);
requestAnimationFrame(tick);
