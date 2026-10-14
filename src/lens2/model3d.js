// Small interactive 3D models for project pages, loaded only when a page
// needs one. Two so far:
//  - the Enovis multipurpose operations center (MPOC), from Grant's concept
//    model of the facility (walls, doors, rooms, mezzanine, roof framing),
//    sorted into six zones;
//  - MAPEI Houston, Grant's exterior model (a GLB) of the facility that holds
//    the dry mix plant and the admixtures plant, split here into the silo
//    tower, the plant building, the offices and the site;
//  - the KU assistive piano-pedal device, a GLB of its parts, which the
//    Projects tab pulls apart into an exploded assembly.
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

// Grant's concept model of the facility (a trace of the drawings, approximate),
// converted to plain geometry (`mpoc-plan.json`): walls with their door
// openings, solids (roof deck and framing, stairs, guards, furniture), floor
// slabs, columns and room floors, each tagged with one of the six zones. No
// names or numbers. The warehouse floor and the lab are not rooms in the
// drawings: the warehouse is everything west of the clean suite, and the lab's
// place (the east end, with stand-in machines) is a guess.
const MPOC = {
  zones: [
    { id: 'warehouse', name: 'Warehouse & shipping', tone: '#cdc9c0' },
    { id: 'support', name: 'Support work centers', tone: '#c3c9cc' },
    { id: 'lab', name: 'Additive & subtractive manufacturing lab', tone: '#b7c3da' },
    { id: 'clean', name: 'Clean pack & sterilization', tone: '#b9d2cc' },
    { id: 'utilities', name: 'Utilities', tone: '#d8cbb1' },
    { id: 'offices', name: 'Offices', tone: '#d8d4cc' },
  ],
  // Seen from the dock side, as Grant's model opens; the plan puts the offices at the top.
  cams: {
    iso: { pos: [48, 206, 316], target: [2, 4, 6] },
    far: { pos: [60, 256, 392], target: [2, 12, 6] },
    top: { pos: [0, 400, 1], target: [0, 0, 0] },
    side: { pos: [-40, 30, -340], target: [0, 4, 0] },
    low: { pos: [150, 10, 118], target: [-30, 7, 14] },
  },
  looks: {},
  // The roof lifts away to show the zones inside (and fades when one is picked).
  roof: { lift: 22, explode: [30, 9], peek: 26 },
  dim: 'fade',
  exposure: 0.92, // its finishes are pale
  pivot: [0, 4, 0], // what a turntable turns about
  shadowBox: [-200, 200, 150, -150],
  groundY: -1.4,
  distance: [40, 900],

  async build({ add, building, shell, roof, zones }, src) {
    const data = await (await fetch(src)).json();
    const ROT = new THREE.Matrix4();
    const M = new THREE.Matrix4();
    const mats = data.mats.map(([color, roughness, metalness, opacity]) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness, metalness, side: THREE.DoubleSide });
      if (opacity < 1) Object.assign(m, { transparent: true, opacity, depthWrite: false });
      return m;
    });

    // Triangles gather by (material, zone, layer) and become one mesh each.
    const buckets = new Map();
    const push = (key, info, arr) => {
      if (!buckets.has(key)) buckets.set(key, { ...info, pos: [] });
      const into = buckets.get(key).pos;
      for (let i = 0; i < arr.length; i++) into.push(arr[i]);
    };
    const boxTris = (sx, sy, sz, matrix) => new THREE.BoxGeometry(sx, sy, sz).applyMatrix4(matrix).toNonIndexed().attributes.position.array;
    const target = (layer, zone) => (layer === 'roof' ? roof : zone ? zones : layer === 'site' ? building : shell);
    const keyOf = (mat, zone, layer) => `${layer}|${zone}|${mat}`;
    const addPiece = (mat, zone, layer, arr) => push(keyOf(mat, zone, layer), { mat, zone, layer }, arr);

    // Walls: solid between the openings, a lintel above each; dock doors get a closed panel.
    for (const [x1, z1, x2, z2, t, h, base, mat, zone, isShell, ops] of data.walls) {
      const L = Math.hypot(x2 - x1, z2 - z1);
      if (L < 0.01) continue;
      const ux = (x2 - x1) / L;
      const uz = (z2 - z1) / L;
      ROT.makeRotationY(Math.atan2(-uz, ux));
      const layer = isShell ? 'shell' : 'part';
      const piece = (s0, s1, y0, y1, m = mat, thick = t) => {
        if (s1 - s0 < 0.01 || y1 - y0 < 0.01) return;
        const s = (s0 + s1) / 2;
        M.makeTranslation(x1 + ux * s, base + (y0 + y1) / 2, z1 + uz * s).multiply(ROT);
        addPiece(m, zone, layer, boxTris(s1 - s0, y1 - y0, thick, M));
      };
      let at = 0;
      for (const [c, w, bottom, oh, garage, pm] of ops) {
        const a = Math.max(0, c - w / 2);
        const b = Math.min(L, c + w / 2);
        piece(at, a, 0, h);
        piece(a, b, bottom + oh, h); // lintel
        piece(a, b, 0, bottom); // sill
        if (garage) piece(a, b, bottom, bottom + oh, pm, Math.min(0.12, t));
        at = Math.max(at, b);
      }
      piece(at, L, 0, h);
    }

    // Solids: their own vertices and triangles, turned and placed.
    const v = new THREE.Vector3();
    for (const [px, py, pz, rot, verts, faces, mat, zone, isRoof] of data.blocks) {
      M.makeTranslation(px, py, pz).multiply(ROT.makeRotationY(rot));
      const arr = new Float32Array(faces.length * 3);
      faces.forEach((vi, i) => {
        v.set(verts[vi * 3], verts[vi * 3 + 1], verts[vi * 3 + 2]).applyMatrix4(M);
        arr.set([v.x, v.y, v.z], i * 3);
      });
      addPiece(mat, zone, isRoof ? 'roof' : zone ? 'part' : 'shell', arr);
    }

    // Slabs: top at their level, thickness below.
    const shape = (pts) => {
      const s = new THREE.Shape();
      pts.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)));
      return s;
    };
    for (const [poly, holes, top, thick, mat, zone] of data.slabs) {
      const s = shape(poly);
      for (const hp of holes) s.holes.push(new THREE.Path(hp.map(([x, z]) => new THREE.Vector2(x, -z))));
      const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.01, thick), bevelEnabled: false });
      g.rotateX(-Math.PI / 2);
      g.translate(0, top - thick, 0);
      addPiece(mat, zone, zone ? 'part' : 'site', (g.index ? g.toNonIndexed() : g).attributes.position.array);
    }

    // Columns.
    for (const [x, y, z, w, d, h, mat] of data.cols) {
      M.makeTranslation(x, y + h / 2, z);
      addPiece(mat, null, 'shell', boxTris(w, h, d, M));
    }

    // The lab's stand-in machines (its place is a guess).
    const lab = data.rooms.find(([cat]) => cat === 'lab')[1];
    const [lx0, lx1] = [Math.min(...lab.map((p) => p[0])), Math.max(...lab.map((p) => p[0]))];
    const [lz0, lz1] = [Math.min(...lab.map((p) => p[1])), Math.max(...lab.map((p) => p[1]))];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        const hgt = 2.6 + ((i + j) % 3) * 0.7;
        M.makeTranslation(lx0 + 8 + i * ((lx1 - lx0 - 16) / 3), hgt / 2, lz0 + 7 + j * ((lz1 - lz0 - 14) / 2));
        push('machines', { mat: 'content', zone: 'lab', layer: 'part' }, boxTris(4.5, hgt, 4, M));
      }
    }

    for (const b of buckets.values()) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.computeVertexNormals();
      const role = b.mat === 'content' ? 'content' : `${b.layer === 'roof' ? 'r' : 'm'}${b.mat}`;
      add(g, role, target(b.layer, b.zone), { zone: b.zone, src: b.mat === 'content' ? undefined : mats[b.mat], shadow: b.layer !== 'site' });
    }

    // Room floors, tinted by zone: what the legend and hover light up.
    const centers = new Map();
    for (const [cat, poly, y] of data.rooms) {
      const g = new THREE.ExtrudeGeometry(shape(poly), { depth: 0.02, bevelEnabled: false });
      g.rotateX(-Math.PI / 2);
      g.translate(0, y + 0.1, 0);
      add(g, 'floor', zones, { zone: cat, shadow: false });
      let a = 0;
      let cx = 0;
      let cz = 0;
      for (let i = 0; i < poly.length; i++) {
        const [xa, za] = poly[i];
        const [xb, zb] = poly[(i + 1) % poly.length];
        const cross = xa * zb - xb * za;
        a += cross;
        cx += (xa + xb) * cross;
        cz += (za + zb) * cross;
      }
      const c = centers.get(cat) ?? { x: 0, z: 0, a: 0 };
      if (Math.abs(a) > 1e-6) {
        c.x += cx / 3;
        c.z += cz / 3;
        c.a += a;
      }
      centers.set(cat, c);
    }
    const centre = (id) => {
      const c = centers.get(id);
      return new THREE.Vector3(c.x / c.a, 0, c.z / c.a);
    };

    // Labels ride above each zone. The twin's flows: printed in the lab,
    // checked in the work centers, cleaned, packed and sterilized, then shipped.
    const labels = new Map(MPOC.zones.map((z) => [z.id, centre(z.id).setY(14)]));
    const route = ['warehouse', 'lab', 'support', 'clean', 'warehouse'];
    const flows = route.slice(1).map((id, i) => [centre(route[i]).setY(9), centre(id).setY(9)]);
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

/* ── The assistive piano-pedal device ──────────────────────────────────── */

// A visual reconstruction of the KU device (a GLB, one mesh per part, in
// metres), shown 250× so it sits at the same scale as the buildings: a
// hand-pushed shaft with a T-grip that presses an inclined pedal plate on a
// base, with a spring to return it. The parts group into six zones by name;
// the Projects tab pulls them apart into an exploded assembly.
const PEDAL_SCALE = 250;
const PEDAL_GROUPS = [
  ['grip', /grip|tbar|shaft_top_handle/],
  ['shaft', /actuating_shaft|stainless_collar/],
  ['pivot', /hinge|pillow_block|rod_fork|pivot|mount_bracket|swivel|shoulder_ring/],
  ['pedal', /pedal|foot_plate|tread/],
  ['spring', /spring|washer|fastener/],
  ['base', /floor_pad|base|lower_mechanism/],
];

const PEDAL = {
  zones: [
    { id: 'grip', name: 'T-grip handle', tone: '#b7c3da' },
    { id: 'shaft', name: 'Actuating shaft', tone: '#c3c9cc' },
    { id: 'pivot', name: 'Pivot & linkage', tone: '#d8cbb1' },
    { id: 'pedal', name: 'Inclined pedal plate', tone: '#cdc9c0' },
    { id: 'spring', name: 'Spring return', tone: '#b9d2cc' },
    { id: 'base', name: 'Base plate', tone: '#d8d4cc' },
  ],
  cams: {
    iso: { pos: [96, 80, 122], target: [0, 16, 2] },
    far: { pos: [250, 210, 430], target: [0, 104, 0] },
    top: { pos: [0, 400, 4], target: [0, 0, 2] },
    side: { pos: [470, 110, 30], target: [0, 100, 0] },
    low: { pos: [64, 12, 112], target: [0, 15, 8] },
  },
  // A device, not a building: no roof; the exploded build pulls the parts apart.
  looks: { structure: { roof: 'on' }, place: { roof: 'on' }, digital: { roof: 'on' } },
  roof: { lift: 0, explode: [0, 0], peek: 0 },
  explode: { grip: [0, 34, 0], shaft: [0, 18, 0], pivot: [0, 9, -8], pedal: [0, 4, 0], spring: [0, 2, 16], base: [0, -3, 0] },
  dim: 'tint',
  exposure: 1,
  pivot: [0, 14, 0],
  shadowBox: [-160, 160, 160, -160],
  groundY: -0.3,
  distance: [40, 900],

  async build({ add, shell }, src) {
    const gltf = await new GLTFLoader().loadAsync(src);
    gltf.scene.updateMatrixWorld(true);
    const scale = new THREE.Matrix4().makeScale(PEDAL_SCALE, PEDAL_SCALE, PEDAL_SCALE);
    const parts = new Map(PEDAL.zones.map((z) => [z.id, new THREE.Group()]));
    for (const g of parts.values()) shell.add(g);
    const meshes = [];
    gltf.scene.traverse((o) => {
      if (o.isMesh) meshes.push(o);
    });
    for (const o of meshes) {
      const zone = PEDAL_GROUPS.find(([, re]) => re.test(o.name))?.[0] ?? 'base';
      const indexed = o.geometry.clone().applyMatrix4(scale.clone().multiply(o.matrixWorld));
      add(toCreasedNormals(indexed, Math.PI / 6), o.material.name || 'part', parts.get(zone), { zone, src: o.material, edgesFrom: indexed });
      o.geometry.dispose();
    }
    // Labels over each part; the twin's flow is the push: down the shaft,
    // through the pivot into the pedal plate, and the spring pushing back.
    const box = (id) => new THREE.Box3().setFromObject(parts.get(id));
    const top = (id) => {
      const b = box(id);
      return b.getCenter(new THREE.Vector3()).setY(b.max.y + 3);
    };
    const labels = new Map(PEDAL.zones.map((z) => [z.id, top(z.id)]));
    const shaft = box('shaft');
    const c = (id) => box(id).getCenter(new THREE.Vector3());
    const flows = [
      [shaft.getCenter(new THREE.Vector3()).setY(shaft.max.y), shaft.getCenter(new THREE.Vector3()).setY(shaft.min.y), 0],
      [c('pivot'), c('pedal'), 0.12],
      [c('spring'), c('pedal'), 0.12],
    ];
    return { labels, flows, parts };
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

const MODELS = { mpoc: MPOC, drymix: DRYMIX, pedal: PEDAL };

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
  let parts = new Map(); // zone → group, for a model that explodes by part

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
    // An arc over the model, unless the flow gives its own lift (0: straight).
    for (const [a, b, lift] of pairs) {
      const mid = a.clone().lerp(b, 0.5);
      if (lift == null) mid.setY(Math.max(a.y, b.y) + a.distanceTo(b) * 0.22);
      else mid.y += a.distanceTo(b) * lift;
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
      parts = out.parts ?? new Map();
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
    // A model that explodes by part moves each part out along its own offset.
    for (const [zone, g] of parts) {
      const off = look.roof === 'explode' ? def.explode?.[zone] : null;
      const to = new THREE.Vector3(...(off ?? [0, 0, 0]));
      if (g.position.distanceTo(to) > 0.02) {
        g.position.lerp(to, k);
        busy = true;
      }
    }
    if (look.flows) {
      const t = now / 4000;
      for (const f of flows) for (const p of f.packets) p.mesh.position.copy(f.curve.getPoint((t + p.o) % 1));
      busy = true;
    }
    if (controls.update()) busy = true;
    // The highlighted zone's name rides above it.
    const on = pinned || hovered;
    if (on && labels.has(on)) {
      const v = labels.get(on).clone().add(parts.get(on)?.position ?? new THREE.Vector3()).project(camera);
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
