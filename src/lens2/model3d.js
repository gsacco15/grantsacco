// Small interactive 3D models for project pages, loaded only when a page
// needs one. Two so far:
//  - the Enovis multipurpose operations center (MPOC), built here in code:
//    generic massing at the building's real proportions (the shell, entrance,
//    docks and six zones with simple stand-in contents), no rooms or walls;
//  - MAPEI Houston, Grant's exterior model (a GLB) of the facility that holds
//    the dry mix plant and the admixtures plant, split here into the silo
//    tower, the plant building, the offices and the site.
// Each section shows a model its own way, like the page's picture: a daylight
// view, a hidden-line drawing, an exploded clay build, a low dusk shot, a plan,
// and a digital twin with flows. Zones highlight from the legend or on hover.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

/* ── Looks, one per section (a model can adjust them) ──────────────────── */

const LOOKS = {
  reality: { set: 'shaded', light: 'day', shadow: 0.2, edges: 0.14, roof: 'on', cam: 'iso' },
  structure: { set: 'flat', light: 'day', shadow: 0, edges: 1, roof: 'lift', cam: 'iso' },
  build: { set: 'clay', light: 'day', shadow: 0.2, edges: 0.18, roof: 'explode', cam: 'far' },
  image: { set: 'shaded', light: 'dusk', shadow: 0.42, edges: 0, roof: 'on', cam: 'low' },
  place: { set: 'flat', light: 'day', shadow: 0, edges: 0.55, roof: 'off', cam: 'top' },
  digital: { set: 'ghost', light: 'day', shadow: 0, edges: 0.7, roof: 'off', cam: 'iso', flows: true },
};

/* ── The MPOC ───────────────────────────────────────────────────────────── */

// Generic massing at the building's real proportions: one long warehouse
// building, about 852 × 180 ft (260 × 55 m) and 11 m to the roof, the MPOC
// taking all of it east of the neighbouring space at the west end. Blocks
// only: six zones with stand-in contents, a mezzanine deck, the entrance and
// the docks. No rooms, walls or names from the drawings.
const FT = 0.3048;
const H = 11; // to the roof (m)
const T = 0.6; // wall thickness (m)
const TENANT = 156; // ft: the MPOC runs east from here

// Feet → world. x runs west → east; z = 0 ft is the front (offices, entrance),
// 180 ft the dock face. The front faces the default camera.
const fx = (x) => (x - 416) * FT;
const fz = (z) => (90 - z) * FT;
const fpt = ([x, z]) => [fx(x), fz(z)];
// The shell: 832 ft along the front, 10 ft wider at each end behind that.
const SHELL = [[0, 0], [832, 0], [832, 60], [842, 60], [842, 180], [-10, 180], [-10, 60], [0, 60]];
const t = T / FT;
const INNER = [[t, t], [832 - t, t], [832 - t, 60 + t], [842 - t, 60 + t], [842 - t, 180 - t], [-10 + t, 180 - t], [-10 + t, 60 + t], [t, 60 + t]];

const MPOC = {
  /** The six zones, as rectangles in feet: [west, east, front, back]. */
  zones: [
    { id: 'warehouse', name: 'Warehouse & shipping', rects: [[160, 394, 4, 176], [394, 438, 4, 144]], tone: '#cdc9c0', fill: 'racks' },
    { id: 'support', name: 'Support work centers', rects: [[592, 678, 78, 160]], tone: '#c3c9cc', fill: 'benches', deck: [592, 646, 106, 160] },
    { id: 'lab', name: 'Additive & subtractive manufacturing lab', rects: [[684, 838, 66, 176]], tone: '#b7c3da', fill: 'machines' },
    { id: 'clean', name: 'Clean pack & sterilization', rects: [[442, 582, 8, 146]], tone: '#b9d2cc', fill: 'rooms' },
    { id: 'utilities', name: 'Utilities', rects: [[396, 466, 148, 177]], tone: '#d8cbb1', fill: 'plant' },
    { id: 'offices', name: 'Offices', rects: [[590, 824, 2, 58]], tone: '#d8d4cc', fill: 'desks' },
  ],
  cams: {
    iso: { pos: [118, 168, 330], target: [4, -8, 0] },
    far: { pos: [140, 210, 390], target: [4, 6, 0] },
    top: { pos: [0, 400, 1], target: [0, 0, 0] },
    side: { pos: [-50, 34, -350], target: [0, 4, 0] },
    low: { pos: [150, 12, 120], target: [-40, 9, -6] },
  },
  looks: {},
  // The roof lifts away to show the zones inside (and fades when one is picked).
  roof: { lift: 22, explode: [30, 9], peek: 26 },
  dim: 'fade',
  exposure: 1,
  pivot: [0, 4, 0], // what a turntable turns about
  shadowBox: [-200, 200, 120, -120],
  groundY: -0.41,
  distance: [90, 900],

  build({ add, building, shell, roof, zones }) {
    const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
    const toShape = (pts) => {
      const s = new THREE.Shape();
      pts.map(fpt).forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)));
      s.closePath();
      return s;
    };
    const extrude = (shape, depth) => {
      const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
      g.rotateX(-Math.PI / 2);
      return g;
    };
    const wallShape = toShape(SHELL);
    wallShape.holes.push(new THREE.Path(INNER.map(fpt).map(([x, z]) => new THREE.Vector2(x, -z))));
    add(extrude(wallShape, H + 1.2), 'wall', shell);
    add(extrude(toShape(SHELL), 0.4), 'slab', building, { y: -0.4, shadow: false });
    add(extrude(toShape(INNER), 0.6), 'roof', roof, { y: H });

    // The neighbouring space at the west end: a plain floor behind a demising wall.
    add(box(T, H, 180 * FT - 2 * T), 'wall', shell, { x: fx(TENANT), y: H / 2, z: 0 });
    add(box((TENANT + 10) * FT - 2 * T, 0.2, 120 * FT - 2 * T), 'context', building, { x: fx((TENANT - 10) / 2), y: 0.1, z: fz(120), shadow: false });
    add(box(TENANT * FT - T, 0.2, 60 * FT), 'context', building, { x: fx(TENANT / 2), y: 0.1, z: fz(30), shadow: false });

    // Rooftop units over the clean, lab and office end.
    for (let i = 0; i < 8; i++) add(box(5, 2.4, 3), 'rtu', roof, { x: fx(470 + i * 46), y: H + 1.8, z: (i % 2 ? -1 : 1) * 12 });

    // The entrance: a glazed vestibule at the east end of the office front, and office glazing.
    add(box(14, 5.5, 6), 'wall', shell, { x: fx(806), y: 2.75, z: fz(0) + 3 });
    add(box(11, 3.4, 0.3), 'glass', shell, { x: fx(806), y: 2.2, z: fz(0) + 6.1, shadow: false });
    for (const y of [3, 7.4]) add(box(222 * FT, 1.7, 0.3), 'glass', shell, { x: fx(700), y, z: fz(0) + 0.1, shadow: false });
    // Dock doors along the back, in two runs.
    for (const [from, n] of [[181, 9], [493, 13]]) {
      for (let i = 0; i < n; i++) add(box(2.7, 3, 0.3), 'door', shell, { x: fx(from + i * 26), y: 1.5, z: fz(180) - 0.1, shadow: false });
    }

    // Zones: a tinted floor and simple stand-in contents each.
    const centers = new Map();
    for (const zn of MPOC.zones) {
      const g = new THREE.Group();
      zones.add(g);
      let cx = 0;
      let cz = 0;
      let area = 0;
      for (const [x0, x1, z0, z1] of zn.rects) {
        const w = (x1 - x0) * FT - 1.2;
        const d = (z1 - z0) * FT - 1.2;
        const x = fx((x0 + x1) / 2);
        const z = fz((z0 + z1) / 2);
        add(box(w, 0.25, d), 'floor', g, { zone: zn.id, x, y: 0.13, z, shadow: false });
        fillZone(g, zn, x, z, w, d);
        cx += x * w * d;
        cz += z * w * d;
        area += w * d;
      }
      if (zn.deck) {
        // A mezzanine deck on columns, 4.2 m up.
        const [x0, x1, z0, z1] = zn.deck;
        const w = (x1 - x0) * FT - 1;
        const d = (z1 - z0) * FT - 1;
        const x = fx((x0 + x1) / 2);
        const z = fz((z0 + z1) / 2);
        add(box(w, 0.35, d), 'content', g, { zone: zn.id, x, y: 4.2, z });
        for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) add(box(0.4, 4.1, 0.4), 'content', g, { zone: zn.id, x: x + sx * (w / 2 - 0.4), y: 2.05, z: z + sz * (d / 2 - 0.4) });
      }
      centers.set(zn.id, new THREE.Vector3(cx / area, 0, cz / area));
    }

    // Stand-ins sized to each zone (metres; w along the building, d across it).
    function fillZone(g, zn, x, z, w, d) {
      const put = (bw, bh, bd, px, pz) => add(box(bw, bh, bd), 'content', g, { zone: zn.id, x: px, y: bh / 2 + 0.25, z: pz });
      const grid = (sx, sz, mx, mz, fn) => {
        const cols = Math.max(1, Math.floor((w - mx) / sx));
        const rows = Math.max(1, Math.floor((d - mz) / sz));
        for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) fn(x + (i - (cols - 1) / 2) * sx, z + (j - (rows - 1) / 2) * sz, i, j);
      };
      if (zn.fill === 'racks') {
        const rows = Math.floor((w - 4) / 6.5);
        for (let i = 0; i < rows; i++) put(1.4, 7.5, d - 14, x + (i - (rows - 1) / 2) * 6.5, z);
      } else if (zn.fill === 'benches') {
        grid(7, 8, 4, 6, (px, pz) => put(4, 1.1, 1.6, px, pz));
      } else if (zn.fill === 'machines') {
        grid(10, 10, 6, 8, (px, pz, i, j) => put(4.5, 2.6 + ((i + j) % 3) * 0.7, 4, px, pz));
      } else if (zn.fill === 'rooms') {
        // A clean suite: three bands of rooms to the deck, two across.
        const bw = (w - 5) / 2;
        const bd = (d - 8) / 3;
        for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) put(bw, 4.3, bd, x + (i - 0.5) * (bw + 2), z + (j - 1) * (bd + 2));
      } else if (zn.fill === 'plant') {
        for (let i = 0; i < 2; i++) add(new THREE.CylinderGeometry(2.2, 2.2, 6, 24), 'content', g, { zone: zn.id, x: x - w / 2 + 3.5 + i * 5.5, y: 3.25, z });
        for (let i = 0; i < 2; i++) put(4.5, 2.8, 4, x + 2 + i * 5.5, z);
      } else if (zn.fill === 'desks') {
        grid(6, 5, 6, 6, (px, pz) => put(3.2, 0.9, 1.6, px, pz));
      }
    }

    // Labels ride above each zone. The twin's flows: printed in the lab,
    // checked in the work centers, cleaned, packed and sterilized, then shipped.
    const labels = new Map([...centers].map(([id, c]) => [id, c.clone().setY(14)]));
    const route = ['warehouse', 'lab', 'support', 'clean', 'warehouse'];
    const flows = route.slice(1).map((id, i) => [centers.get(route[i]).clone().setY(9), centers.get(id).clone().setY(9)]);
    return { labels, flows };
  },
};

/* ── The MAPEI dry mix plant ───────────────────────────────────────────── */

// The GLB's meshes are one per material; most belong to one zone outright.
const SITE_PARTS = new Set(['ground', 'asphalt', 'concrete', 'roadline', 'green', 'blue_sign']);
const TOWER_PARTS = new Set(['tower_trim', 'tower_cladding', 'tower_seam', 'metal_light', 'silver_joint', 'yellow', 'logo']);
const OFFICE_PARTS = new Set(['office_medium', 'office_dark']);
// Steel, metal and pipe run through the tower and the plant both, so their
// pieces are sorted by where they sit (metres; x along the plant, z toward the front).
const STEEL_PARTS = new Set(['steel_mid', 'steel_dark', 'metal', 'pipe']);
const TOWER_BOX = [56, 86, 46, 73];
const ANNEX_LEFT = [-83, -62, 37, 66];
const ANNEX_RIGHT = [62, 83, 37, 66]; // mirrors the left one, under the tower
const OFFICE_BOXES = [ANNEX_LEFT, ANNEX_RIGHT, [-83, -74.5, -52, 52]]; // + the strip along the left end
const PLANT_BOX = [-84, 84, -53, 53];
const UP = new THREE.Vector3(0, 1, 0);
const inBox = (c, [x0, x1, z0, z1]) => c.x >= x0 && c.x <= x1 && c.z >= z0 && c.z <= z1;

const DRYMIX = {
  zones: [
    { id: 'tower', name: 'Silo & mixing tower', tone: '#b7c3da' },
    { id: 'plant', name: 'Production & warehouse', tone: '#cdc9c0' }, // packaging lines and the admixtures plant are inside
    { id: 'offices', name: 'Offices', tone: '#d8d4cc' },
    { id: 'site', name: 'Site', tone: '#c3c9cc', pick: false },
  ],
  cams: {
    iso: { pos: [-178, 150, 236], target: [6, -6, 10] },
    far: { pos: [-206, 196, 286], target: [6, 8, 10] },
    top: { pos: [0, 370, 5], target: [0, 0, 4] },
    side: { pos: [24, 22, 262], target: [8, 17, 0] },
    low: { pos: [168, 8, 176], target: [44, 22, 34] },
  },
  // The model is the outside only, so its roof stays on except in the exploded build.
  looks: { structure: { roof: 'on' }, place: { roof: 'on' }, digital: { roof: 'on' } },
  roof: { lift: 0, explode: [24, 0], peek: 0 },
  dim: 'tint',
  exposure: 0.8, // its own materials are pale
  pivot: [2, 8, 8],
  shadowBox: [-230, 230, 210, -210],
  groundY: -0.62,
  distance: [70, 820],

  async build({ add, building, shell, roof }, src) {
    const gltf = await new GLTFLoader().loadAsync(src);
    gltf.scene.updateMatrixWorld(true);
    const parts = [];
    gltf.scene.traverse((o) => {
      if (o.isMesh) parts.push(o);
    });
    for (const o of parts) {
      const role = o.name === 'MAPEI_official_logo' ? 'logo' : o.name;
      const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
      const comps = components(geo);
      // The right office annex mirrors the left: its steel pieces are the left one's, flipped.
      const leftAnnex = comps.filter((k) => inBox(k.c, ANNEX_LEFT));
      const mirrored = (k) => leftAnnex.some((a) => Math.abs(a.c.x + k.c.x) < 0.3 && Math.abs(a.c.y - k.c.y) < 0.3 && Math.abs(a.c.z - k.c.z) < 0.3);
      const buckets = new Map();
      for (const k of comps) {
        let zone;
        if (SITE_PARTS.has(role)) zone = 'site';
        else if (TOWER_PARTS.has(role)) zone = 'tower';
        else if (OFFICE_PARTS.has(role)) zone = 'offices';
        else if (STEEL_PARTS.has(role) && inBox(k.c, TOWER_BOX) && !mirrored(k)) zone = 'tower';
        else if (OFFICE_BOXES.some((b) => inBox(k.c, b))) zone = 'offices';
        else if (!inBox(k.c, PLANT_BOX)) zone = 'site';
        else zone = 'plant';
        // The roof, and what stands on it, lifts off in the exploded build.
        const top = role === 'roof' || role === 'roof_seam' || (zone !== 'tower' && zone !== 'site' && role !== 'walls' && k.lo.y >= 13.5);
        const key = `${zone}|${top}`;
        if (!buckets.has(key)) buckets.set(key, { zone, top, tris: [] });
        const into = buckets.get(key).tris;
        for (const t of k.tris) into.push(t);
      }
      for (const { zone, top, tris } of buckets.values()) {
        const index = geo.index.array;
        const sub = new Uint32Array(tris.length * 3);
        tris.forEach((t, i) => sub.set(index.subarray(t * 3, t * 3 + 3), i * 3));
        const indexed = new THREE.BufferGeometry();
        for (const [name, attr] of Object.entries(geo.attributes)) indexed.setAttribute(name, attr);
        indexed.setIndex(new THREE.BufferAttribute(sub, 1));
        // Creased normals: the silos read round, the boxes stay crisp.
        const shaded = toCreasedNormals(indexed, Math.PI / 6);
        add(shaded, top ? `${role}^top` : role, zone === 'site' ? building : top ? roof : shell, {
          zone,
          src: o.material,
          edgesFrom: indexed,
          shadow: zone !== 'site',
        });
      }
      o.geometry.dispose();
    }

    const v = (x, y, z) => new THREE.Vector3(x, y, z);
    return {
      labels: new Map([
        ['tower', v(71, 50, 60)],
        ['plant', v(0, 19, -6)],
        ['offices', v(-72, 19, 52)],
        ['site', v(-30, 3, 82)],
      ]),
      // Bulk trucks fill the silos; the tower mixes; bags are packed, palletized and shipped from the docks.
      flows: [
        [v(36, 2, 86), v(70, 44, 62)],
        [v(70, 8, 50), v(14, 8, 0)],
        [v(14, 8, 0), v(-36, 3, -54)],
      ],
    };
  },
};

/** Split an indexed geometry into connected pieces: each one's triangles, bounds and centre. */
function components(geo) {
  const index = geo.index.array;
  const pos = geo.attributes.position;
  const parent = new Int32Array(pos.count).map((_, i) => i);
  const find = (a) => {
    while (parent[a] !== a) a = parent[a] = parent[parent[a]];
    return a;
  };
  const join = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  for (let i = 0; i < index.length; i += 3) {
    join(index[i], index[i + 1]);
    join(index[i], index[i + 2]);
  }
  const byRoot = new Map();
  const p = new THREE.Vector3();
  for (let t = 0; t < index.length / 3; t++) {
    const r = find(index[t * 3]);
    let k = byRoot.get(r);
    if (!k) byRoot.set(r, (k = { tris: [], lo: new THREE.Vector3(Infinity, Infinity, Infinity), hi: new THREE.Vector3(-Infinity, -Infinity, -Infinity) }));
    k.tris.push(t);
    for (let j = 0; j < 3; j++) {
      p.fromBufferAttribute(pos, index[t * 3 + j]);
      k.lo.min(p);
      k.hi.max(p);
    }
  }
  return [...byRoot.values()].map((k) => ({ ...k, c: k.lo.clone().add(k.hi).multiplyScalar(0.5) }));
}

const MODELS = { mpoc: MPOC, drymix: DRYMIX };

/**
 * Mount model `id` in `host` (`src` is its file, for a model that loads one).
 * `palette(mode)` gives { bg, ink, accent } for a section; `hide` lists zones
 * to leave out (the tile stills leave out the site). Returns
 * { zones, setMode, setHighlight, view, orbit, dispose }.
 */
export function createModel(host, { id = 'mpoc', src, palette, highlight = null, onHover, hide = [] } = {}) {
  const def = MODELS[id] ?? MPOC;
  const wrap = document.createElement('div');
  wrap.className = 'lx-model is-loading';
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
  camera.position.set(...def.cams.iso.pos);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  [controls.minDistance, controls.maxDistance] = def.distance;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.set(...def.cams.iso.target);

  // Lights: a hemisphere fill and a sun that casts the shadows.
  const hemi = new THREE.HemisphereLight(0xffffff, 0xcfc9bf, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const [left, right, top, bottom] = def.shadowBox;
  Object.assign(sun.shadow.camera, { left, right, top, bottom, near: 10, far: 900 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);
  scene.add(sun.target);

  /* ── Materials: one entry per part, in four sets ─────────────────────── */
  const ROLES = {
    wall: '#dedcd6',
    roof: '#3d3d3c',
    slab: '#d9d7d2',
    context: '#cfccc5',
    glass: '#5d6c80',
    door: '#8b96a5',
    rtu: '#b9b8b4',
    content: '#a9a8a4',
  };
  const zoneTone = Object.fromEntries(def.zones.map((z) => [z.id, z.tone]));
  const sets = { shaded: {}, flat: {}, clay: {}, ghost: {} };
  // `src` is a loaded model's own material: the shaded set keeps it.
  function mat(role, zone, src) {
    const key = zone ? `${role}:${zone}` : role;
    if (!sets.shaded[key]) {
      const side = src?.side ?? THREE.FrontSide;
      if (src) {
        sets.shaded[key] = src.clone();
        // The sign sits on the cladding: draw it in front of the seams.
        if (role === 'logo') Object.assign(sets.shaded[key], { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
      }
      else {
        const color = zone ? (role === 'floor' ? zoneTone[zone] : '#9fa2a6') : ROLES[role];
        sets.shaded[key] = new THREE.MeshStandardMaterial({ color, roughness: role === 'glass' ? 0.25 : 0.85, metalness: role === 'glass' ? 0.3 : 0 });
      }
      sets.flat[key] = new THREE.MeshBasicMaterial({ color: '#f7f6f3', side, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
      sets.clay[key] = new THREE.MeshStandardMaterial({ color: '#d4d3cf', roughness: 1, side });
      sets.ghost[key] = new THREE.MeshBasicMaterial({ color: '#ffffff', side, transparent: true, opacity: 0.04, depthWrite: false });
      // A sign only shows in colour.
      if (role === 'logo') for (const s of ['flat', 'clay', 'ghost']) sets[s][key].visible = false;
      for (const s of Object.values(sets)) s[key].userData = { role, zone, base: s[key].color.clone() };
    }
    return key;
  }

  const edgeMat = new THREE.LineBasicMaterial({ color: '#151515', transparent: true, opacity: 1 });
  const meshes = [];
  const pickable = new Set(def.zones.filter((z) => z.pick !== false).map((z) => z.id));
  const picks = [];
  function add(geo, role, parent, { zone = null, x = 0, y = 0, z = 0, shadow = true, src, edgesFrom = geo } = {}) {
    const key = mat(role, zone, src);
    const m = new THREE.Mesh(geo, sets.shaded[key]);
    m.position.set(x, y, z);
    m.castShadow = shadow;
    m.receiveShadow = true;
    m.userData = { role, zone, key };
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(edgesFrom, 25), edgeMat);
    e.raycast = () => {};
    m.add(e);
    m.userData.edges = e;
    parent.add(m);
    meshes.push(m);
    if (zone && pickable.has(zone)) picks.push(m);
    return m;
  }

  /* ── The model ────────────────────────────────────────────────────────── */
  const building = new THREE.Group();
  scene.add(building);
  const shellGroup = new THREE.Group(); // walls, glazing, doors
  const roofGroup = new THREE.Group(); // the roof and what stands on it
  const zoneGroup = new THREE.Group();
  building.add(shellGroup, roofGroup, zoneGroup);
  let labels = new Map();
  let roofMeshes = [];

  // Ground: catches shadows only.
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.16 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = def.groundY;
  ground.receiveShadow = true;
  scene.add(ground);

  /* ── Digital twin: materials flowing through the model ────────────────── */
  const flowGroup = new THREE.Group();
  scene.add(flowGroup);
  const flowMat = new THREE.LineBasicMaterial({ color: '#93adf5', transparent: true, opacity: 0.8 });
  const packetMat = new THREE.MeshBasicMaterial({ color: '#93adf5' });
  const flows = [];
  function addFlows(pairs) {
    for (const [a, b] of pairs) {
      const mid = a.clone().lerp(b, 0.5).setY(Math.max(a.y, b.y) + a.distanceTo(b) * 0.22);
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      flowGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)), flowMat));
      const packets = [0, 0.33, 0.66].map((o) => {
        const p = new THREE.Mesh(new THREE.SphereGeometry(1.3, 12, 8), packetMat);
        flowGroup.add(p);
        return { mesh: p, o };
      });
      flows.push({ curve, packets });
    }
  }

  /* ── State ────────────────────────────────────────────────────────────── */
  const lookFor = (m) => ({ ...(LOOKS[m] ?? LOOKS.reality), ...def.looks[m] });
  let mode = 'reality';
  let look = lookFor(mode);
  let pinned = highlight;
  let hovered = null;
  let ready = false;
  let turn = 0; // a turntable's angle: the sun turns with the camera
  const tween = {
    cam: new THREE.Vector3(...def.cams.iso.pos),
    target: new THREE.Vector3(...def.cams.iso.target),
    roofY: 0,
    shellY: 0,
    roofOpacity: 1,
    moving: false,
  };
  let raf = 0;
  let last = performance.now();
  let alive = true;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function goTo(name) {
    const c = def.cams[name];
    tween.cam.set(...c.pos);
    tween.target.set(...c.target);
    tween.moving = true;
    if (reduced || !ready) {
      camera.position.copy(tween.cam);
      controls.target.copy(tween.target);
    }
  }

  // The roof's offset, shell offset and opacity for the current look.
  function roofState() {
    const R = def.roof;
    if (look.roof === 'explode') return { y: R.explode[0], shell: R.explode[1], opacity: 1 };
    if (look.roof === 'off') return { y: 0, shell: 0, opacity: 0 };
    if (look.roof === 'lift') return { y: R.lift, shell: 0, opacity: 0 };
    // Roof on: in the MPOC it lifts away when a zone is being looked at.
    return (pinned || hovered) && R.peek ? { y: R.peek, shell: 0, opacity: 0.22 } : { y: 0, shell: 0, opacity: 1 };
  }

  function applyLook() {
    const pal = palette(mode);
    const set = sets[look.set];
    for (const m of meshes) {
      m.material = set[m.userData.key];
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
      sun.position.set(330, 38, 60).applyAxisAngle(UP, turn);
      renderer.toneMappingExposure = 0.9 * def.exposure;
    } else {
      // Sun from the front-left: the long front face lit, the end walls in shade.
      hemi.intensity = 0.55;
      scene.environmentIntensity = 0.55;
      sun.color.set('#ffffff');
      sun.intensity = 2.1;
      sun.position.set(-170, 240, 210).applyAxisAngle(UP, turn);
      renderer.toneMappingExposure = def.exposure;
    }
    applyHighlight();
  }

  function applyHighlight() {
    const on = pinned || hovered;
    const pal = palette(mode);
    const accent = new THREE.Color(pal.accent);
    const paper = new THREE.Color(pal.bg).lerp(new THREE.Color('#ffffff'), 0.35);
    for (const m of Object.values(sets[look.set])) {
      const { zone, base } = m.userData;
      if (!zone) continue;
      const hot = zone === on;
      if (look.set === 'ghost') {
        m.color.copy(hot ? accent : new THREE.Color(pal.ink));
        m.opacity = hot ? 0.45 : 0.04;
      } else if (look.set === 'flat') {
        m.color.copy(hot ? accent.clone().lerp(new THREE.Color('#ffffff'), 0.55) : paper);
      } else if (def.dim === 'tint') {
        // A loaded model keeps its colours: the zone takes on the accent, the rest pales.
        m.color.copy(hot ? base.clone().lerp(accent, 0.6) : on ? base.clone().lerp(new THREE.Color(pal.bg), 0.55) : base);
      } else {
        m.color.copy(hot ? accent : base);
        m.transparent = !!on && !hot;
        m.opacity = on && !hot ? 0.35 : 1;
        m.depthWrite = !(on && !hot);
      }
      m.needsUpdate = true;
    }
    label.hidden = !on || !labels.has(on);
    if (on) label.textContent = def.zones.find((z) => z.id === on)?.name ?? '';
    onHover?.(on);
  }

  /** Switch to section `m`'s look and camera. */
  function setMode(m) {
    mode = m;
    look = lookFor(m);
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

  /* ── Build (a loaded model arrives a moment later) ────────────────────── */
  Promise.resolve(def.build({ add, building, shell: shellGroup, roof: roofGroup, zones: zoneGroup }, src))
    .then((out) => {
      if (!alive) return;
      labels = out.labels;
      addFlows(out.flows);
      roofMeshes = roofGroup.children.filter((o) => o.isMesh);
      for (const m of meshes) if (hide.includes(m.userData.zone)) m.visible = false;
      ready = true;
      wrap.classList.remove('is-loading');
      applyLook();
      goTo(look.cam);
      kick();
    })
    .catch((err) => {
      console.error('model', id, err);
      wrap.remove();
    });

  /* ── Interaction ──────────────────────────────────────────────────────── */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const shown = (o) => {
    for (; o; o = o.parent) if (!o.visible) return false;
    return true;
  };
  let downAt = null;
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(picks, false).find((h) => shown(h.object));
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
      if (camera.position.distanceTo(tween.cam) < 0.5 && controls.target.distanceTo(tween.target) < 0.2) {
        // Land exactly: looking straight down, the last half metre would still turn the plan.
        camera.position.copy(tween.cam);
        controls.target.copy(tween.target);
        tween.moving = false;
      }
      busy = true;
    }
    const rs = roofState();
    const ease = (from, to) => from + (to - from) * k;
    tween.roofY = ease(tween.roofY, rs.y);
    tween.shellY = ease(tween.shellY, rs.shell);
    tween.roofOpacity = ease(tween.roofOpacity, rs.opacity);
    roofGroup.position.y = tween.roofY;
    shellGroup.position.y = tween.shellY;
    roofGroup.visible = tween.roofOpacity > 0.02;
    const fade = tween.roofOpacity < 0.99;
    for (const m of roofMeshes) {
      // Ghost materials are always see-through; the highlight sets theirs.
      const mm = m.material;
      if (look.set !== 'ghost' && (mm.transparent !== fade || (fade && Math.abs(mm.opacity - tween.roofOpacity) > 0.005))) {
        mm.transparent = fade;
        mm.opacity = fade ? tween.roofOpacity : 1;
        mm.depthWrite = !fade;
      }
      m.userData.edges.visible = look.edges > 0 && tween.roofOpacity > 0.5;
    }
    if (Math.abs(tween.roofY - rs.y) > 0.05 || Math.abs(tween.shellY - rs.shell) > 0.05 || Math.abs(tween.roofOpacity - rs.opacity) > 0.01) busy = true;
    if (look.flows) {
      const t = now / 4000;
      for (const f of flows) for (const p of f.packets) p.mesh.position.copy(f.curve.getPoint((t + p.o) % 1));
      busy = true;
    }
    if (controls.update()) busy = true;
    // The highlighted zone's name rides above it.
    const on = pinned || hovered;
    if (on && labels.has(on)) {
      const v = labels.get(on).clone().project(camera);
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
    zones: def.zones,
    setMode,
    setHighlight,
    get highlighted() {
      return pinned;
    },
    /** Go to camera `name`; `jump` lands there at once (for stills). */
    view: (name, jump = false) => {
      goTo(name);
      if (jump) {
        camera.position.copy(tween.cam);
        controls.target.copy(tween.target);
        tween.moving = false;
      }
      kick();
    },
    /**
     * Turntable: look at the model's pivot from the iso view's distance and
     * height, turned `deg` about it, with the sun turning along (for stills).
     */
    orbit(deg) {
      const c = def.cams.iso;
      const t = new THREE.Vector3(...def.pivot);
      turn = THREE.MathUtils.degToRad(deg);
      tween.moving = false;
      camera.position.copy(t).add(new THREE.Vector3(...c.pos).sub(new THREE.Vector3(...c.target)).applyAxisAngle(UP, turn));
      controls.target.copy(t);
      applyLook();
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
      for (const s of Object.values(sets)) for (const m of Object.values(s)) {
        m.map?.dispose();
        m.dispose();
      }
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      wrap.remove();
    },
  };
}
