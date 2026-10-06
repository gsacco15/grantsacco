// One continuous world, in real metres, from the planet down to the inside of a
// gearbox. Each layer is modelled in its own convenient units and placed at an
// absolute origin; main.js re-expresses everything relative to the camera every
// frame so float precision never runs out (a "floating origin").
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { items } from '../content.js';
import { latLonToVec3 } from '../shared/geo.js';
import { mulberry32, hashString } from '../anim.js';

export const R_EARTH = 6.371e6;
export const HOME = { lat: 41.9, lon: -87.7 };
const DEG = Math.PI / 180;

const std = (color, metalness = 0, roughness = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
const box = (w, h, d, mat, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
};
const rbox = (w, h, d, r, mat, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat);
  m.position.set(x, y, z);
  return m;
};

/** Rotation that puts HOME at +Y with north pointing to −Z. */
export const earthQ = (() => {
  const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -HOME.lon * DEG);
  const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), (HOME.lat - 90) * DEG);
  return qx.multiply(qy);
})();

export function earthDir(lat, lon) {
  return new THREE.Vector3(...latLonToVec3(lat, lon)).applyQuaternion(earthQ);
}

/* ── Planet ───────────────────────────────────────────────────────────────── */

export function buildEarth(isLandPromise) {
  const g = new THREE.Group();
  g.quaternion.copy(earthQ);

  const ocean = new THREE.Mesh(new THREE.SphereGeometry(0.995, 96, 64), new THREE.MeshBasicMaterial({ color: '#0a1428', transparent: true }));
  g.add(ocean);

  // Atmosphere: a back-faced fresnel glow.
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(1.08, 64, 48),
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uOpacity: { value: 1 } },
      // Includes keep it compatible with the logarithmic depth buffer.
      vertexShader: `#include <common>
        #include <logdepthbuf_pars_vertex>
        varying vec3 vN; varying vec3 vV;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv;
        #include <logdepthbuf_vertex>
        }`,
      fragmentShader: `#include <logdepthbuf_pars_fragment>
        uniform float uOpacity; varying vec3 vN; varying vec3 vV;
        void main(){
        #include <logdepthbuf_fragment>
        float f = pow(1.0 - abs(dot(vN, vV)), 2.2); gl_FragColor = vec4(vec3(0.35,0.55,1.0) * f * 1.4, f * uOpacity); }`,
    }),
  );
  g.add(atmo);

  // Graticule
  const grat = [];
  for (let lat = -60; lat <= 60; lat += 30)
    for (let lon = 0; lon < 360; lon += 3) grat.push(...latLonToVec3(lat, lon, 1.001), ...latLonToVec3(lat, lon + 3, 1.001));
  for (let lon = 0; lon < 360; lon += 30)
    for (let lat = -87; lat < 87; lat += 3) grat.push(...latLonToVec3(lat, lon, 1.001), ...latLonToVec3(lat + 3, lon, 1.001));
  const gratGeo = new THREE.BufferGeometry();
  gratGeo.setAttribute('position', new THREE.Float32BufferAttribute(grat, 3));
  const gratMat = new THREE.LineBasicMaterial({ color: '#3a5a8c', transparent: true, opacity: 0.35 });
  g.add(new THREE.LineSegments(gratGeo, gratMat));

  // Land as a field of dots (filled in once the mask loads).
  const landMat = new THREE.PointsMaterial({ color: '#cfe0ff', size: 2.2, sizeAttenuation: false, transparent: true });
  const land = new THREE.Points(new THREE.BufferGeometry(), landMat);
  g.add(land);
  isLandPromise.then(({ isLand }) => {
    const pts = [];
    const N = 90000;
    const ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = ga * i;
      const x = Math.cos(th) * r;
      const z = Math.sin(th) * r;
      const lat = Math.asin(y) / DEG;
      const lon = Math.atan2(x, z) / DEG;
      if (isLand(lat, lon)) pts.push(x * 1.001, y * 1.001, z * 1.001);
    }
    land.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    land.geometry.computeBoundingSphere(); // the empty placeholder's sphere would cull it
  });

  // Pins: home + every place in the content.
  const pinMat = new THREE.PointsMaterial({ color: '#ffb648', size: 9, sizeAttenuation: false, transparent: true });
  const places = [{ id: 'home', title: 'Home base', place: { name: 'Home', ...HOME } }, ...items.filter((it) => it.kind === 'travel')];
  const pinPos = places.flatMap((p) => latLonToVec3(p.place.lat, p.place.lon, 1.004));
  const pinGeo = new THREE.BufferGeometry();
  pinGeo.setAttribute('position', new THREE.Float32BufferAttribute(pinPos, 3));
  g.add(new THREE.Points(pinGeo, pinMat));

  return {
    group: g,
    pins: places.map((p) => ({ ...p, local: new THREE.Vector3(...latLonToVec3(p.place.lat, p.place.lon, 1.004)) })),
    fade(o) {
      ocean.material.opacity = o;
      atmo.material.uniforms.uOpacity.value = o;
      gratMat.opacity = 0.35 * o;
      landMat.opacity = o;
      pinMat.opacity = o;
    },
  };
}

/* ── City (metres, dusk) ──────────────────────────────────────────────────── */

export function buildCity() {
  const g = new THREE.Group();
  const rnd = mulberry32(42);

  // Ground disc with soft edge so it melts into the sky.
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const cx = c.getContext('2d');
  const grad = cx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(24,30,40,1)');
  grad.addColorStop(0.7, 'rgba(18,24,34,0.95)');
  grad.addColorStop(1, 'rgba(18,24,34,0)');
  cx.fillStyle = grad;
  cx.fillRect(0, 0, 256, 256);
  const groundTex = new THREE.CanvasTexture(c);
  groundTex.colorSpace = THREE.SRGBColorSpace;
  const groundMat = new THREE.MeshBasicMaterial({ map: groundTex, transparent: true, depthWrite: false });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(9000, 64), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.2;
  ground.renderOrder = -1;
  g.add(ground);

  // Blocks of buildings on a street grid, thinning out with distance.
  const block = 95;
  const R = 5200;
  const mats = [];
  const tmp = new THREE.Object3D();
  const cityMat = std('#aeb6c2', 0.1, 0.85, { transparent: true });
  mats.push(cityMat);
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), cityMat, 9000);
  let n = 0;
  for (let bx = -R; bx <= R && n < 9000; bx += block)
    for (let bz = -R; bz <= R && n < 9000; bz += block) {
      const d = Math.hypot(bx, bz);
      if (d > R) continue;
      // Keep the workshop's own lot clear.
      if (bx > -60 && bx < 110 && bz > -60 && bz < 90) continue;
      const density = Math.max(0, 1 - d / R) ** 0.6;
      if (rnd() > density * 0.92) continue;
      const k = 1 + Math.floor(rnd() * 3);
      for (let j = 0; j < k && n < 9000; j++) {
        const w = 18 + rnd() * 40;
        const dd = 18 + rnd() * 40;
        const h = (6 + rnd() ** 3 * 70) * (0.4 + density);
        tmp.position.set(bx + (rnd() - 0.5) * (block - w - 14), 0, bz + (rnd() - 0.5) * (block - dd - 14));
        tmp.scale.set(w, h, dd);
        tmp.rotation.y = 0;
        tmp.updateMatrix();
        inst.setMatrixAt(n++, tmp.matrix);
      }
    }
  inst.count = n;
  g.add(inst);

  // Street lights along the grid lines.
  const lights = [];
  for (let x = -R; x <= R; x += block)
    for (let z = -R; z <= R; z += 24) {
      const z2 = z + (rnd() - 0.5) * 6;
      if (Math.hypot(x, z2) < R && rnd() < 0.55) lights.push(x - block / 2, 2, z2, z2, 2, x - block / 2);
    }
  const lightGeo = new THREE.BufferGeometry();
  lightGeo.setAttribute('position', new THREE.Float32BufferAttribute(lights, 3));
  const lightMat = new THREE.PointsMaterial({ color: '#ffc27a', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.9 });
  g.add(new THREE.Points(lightGeo, lightMat));

  return {
    group: g,
    fade(o) {
      groundMat.opacity = o;
      cityMat.opacity = o;
      lightMat.opacity = 0.9 * o;
      inst.visible = o > 0.01;
    },
  };
}

/* ── The workshop building + interior (metres) ────────────────────────────── */

// Building footprint: x ∈ [−3, 37], z ∈ [−0.9, 24.1]; the desk is at the origin
// in the studio corner against the back wall.
export function buildBuilding() {
  const g = new THREE.Group();
  const shell = [];
  const fadeMats = [];
  const wallMat = std('#d9d4cb', 0, 0.9, { transparent: true });
  const roofMat = std('#c7c2ba', 0.05, 0.8, { transparent: true });
  const glassMat = std('#ffd9a3', 0, 0.3, { emissive: '#ffb55e', emissiveIntensity: 0.9, transparent: true });
  fadeMats.push(wallMat, roofMat, glassMat);

  const W = 40;
  const D = 25;
  const H = 6.5;
  const x0 = -3;
  const z0 = -0.9;
  const cx = x0 + W / 2;
  const cz = z0 + D / 2;

  // Site
  g.add(box(90, 0.2, 70, std('#3b3f45', 0, 1), cx, -0.16, cz + 6));
  const rnd = mulberry32(7);
  const treeMat = std('#4f6a52', 0, 0.9);
  const trunkMat = std('#5b4a3c', 0, 0.9);
  for (let i = 0; i < 22; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 34 + rnd() * 10;
    const t = new THREE.Group();
    t.position.set(cx + Math.cos(a) * r * 1.2, 0, cz + Math.sin(a) * r);
    const h = 5 + rnd() * 5;
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.6 + rnd(), h, 10), treeMat);
    crown.position.y = h / 2 + 1.5;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.6, 6), trunkMat);
    trunk.position.y = 0.8;
    t.add(crown, trunk);
    g.add(t);
  }
  for (let i = 0; i < 6; i++) g.add(rbox(1.9, 1.4, 4.4, 0.3, std(['#2f3237', '#8a2f22', '#c9c9c9'][i % 3], 0.4, 0.5), x0 + 6 + i * 3.2, 0.7, z0 + D + 7));

  // Back + left walls stay (they are the studio's walls); front, right and roof fade.
  g.add(box(W, H, 0.25, wallMat, cx, H / 2, z0 - 0.125));
  g.add(box(0.25, H, D, wallMat, x0 - 0.125, H / 2, cz));
  const outerWallMat = std('#d9d4cb', 0, 0.9, { transparent: true });
  fadeMats.push(outerWallMat);
  const front = box(W, H, 0.25, outerWallMat, cx, H / 2, z0 + D + 0.125);
  const right = box(0.25, H, D, outerWallMat, x0 + W + 0.125, H / 2, cz);
  shell.push(front, right);
  // Window band on the front + a big door.
  for (let i = 0; i < 9; i++) shell.push(box(2.6, 1.1, 0.05, glassMat, x0 + 3 + i * 4.2, 4.2, z0 + D + 0.27));
  shell.push(box(5, 4.2, 0.08, std('#6d7178', 0.5, 0.5, { transparent: true }), x0 + W - 6, 2.1, z0 + D + 0.3));
  fadeMats.push(shell[shell.length - 1].material);

  // Sawtooth roof: north-light prisms with glazing.
  const tri = new THREE.Shape();
  tri.moveTo(0, 0);
  tri.lineTo(5, 0);
  tri.lineTo(0, 2.2);
  tri.closePath();
  const prism = new THREE.ExtrudeGeometry(tri, { depth: D, bevelEnabled: false });
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Mesh(prism, roofMat);
    p.position.set(x0 + i * 5, H, z0);
    shell.push(p);
    const glass = box(0.06, 2.2, D, glassMat, x0 + i * 5 + 0.03, H + 1.1, cz);
    shell.push(glass);
  }
  shell.forEach((m) => m.parent || g.add(m));
  // A flat ceiling slab under the roof so it reads solid from outside.
  const slab = box(W, 0.2, D, roofMat, cx, H, cz);
  shell.push(slab);
  g.add(slab);

  return {
    group: g,
    /** Opacity of the exterior shell (roof, front and right walls) — it lifts away as you fly in. */
    fade(shellOpacity) {
      for (const m of fadeMats) if (m !== wallMat) m.opacity = shellOpacity;
      for (const m of shell) m.visible = shellOpacity > 0.01;
    },
  };
}

export function buildRoom(photoTexture) {
  const g = new THREE.Group();
  // Studio corner floor (wood) + workshop floor (concrete)
  g.add(box(7.5, 0.04, 6, std('#b48c63', 0, 0.75), 0.75, -0.02, 2.1));
  g.add(box(30, 0.03, 25, std('#8d8f92', 0, 0.95), 21, -0.03, 11.6));
  // Window on the left wall (glowing)
  g.add(box(0.05, 1.6, 2.2, std('#fff2d6', 0, 0.2, { emissive: '#ffe7bd', emissiveIntensity: 1.2 }), -2.86, 1.7, 1.2));
  // Shelf with books & boxes on the back wall
  const shelfMat = std('#6b5643', 0, 0.8);
  g.add(box(1.8, 0.04, 0.28, shelfMat, -1.2, 1.75, -0.74));
  g.add(box(1.8, 0.04, 0.28, shelfMat, -1.2, 2.2, -0.74));
  const rnd = mulberry32(11);
  for (let i = 0; i < 14; i++) {
    const h = 0.18 + rnd() * 0.12;
    g.add(box(0.04 + rnd() * 0.03, h, 0.2, std(['#2f3b4a', '#a4442d', '#d8cfbd', '#3d5a45'][i % 4], 0, 0.8), -2.0 + i * 0.075, 1.77 + h / 2, -0.74));
  }
  // Pinboard of photos
  g.add(box(1.2, 0.8, 0.02, std('#c9b79a', 0, 0.95), 0.9, 1.65, -0.88));
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.16), new THREE.MeshStandardMaterial({ map: photoTexture(i), roughness: 0.6 }));
    p.position.set(0.55 + (i % 3) * 0.35, 1.82 - Math.floor(i / 3) * 0.32, -0.865);
    p.rotation.z = (rnd() - 0.5) * 0.12;
    g.add(p);
  }
  // Desk
  const wood = std('#8a6a4c', 0, 0.6);
  g.add(box(1.6, 0.04, 0.78, wood, 0, 0.73, -0.05));
  const legMat = std('#2b2c2f', 0.6, 0.4);
  for (const [x, z] of [
    [-0.76, -0.4],
    [0.76, -0.4],
    [-0.76, 0.3],
    [0.76, 0.3],
  ])
    g.add(box(0.035, 0.71, 0.035, legMat, x, 0.355, z));
  // Chair
  const chair = new THREE.Group();
  chair.position.set(0.15, 0, 0.75);
  chair.rotation.y = 0.35;
  chair.add(rbox(0.46, 0.06, 0.46, 0.02, std('#2c2d31', 0.1, 0.6), 0, 0.47, 0));
  chair.add(rbox(0.46, 0.5, 0.05, 0.02, std('#2c2d31', 0.1, 0.6), 0, 0.78, 0.22));
  chair.add(box(0.04, 0.45, 0.04, legMat, 0, 0.22, 0));
  g.add(chair);
  // Lamp
  const lamp = new THREE.Group();
  lamp.position.set(-0.74, 0.75, -0.38);
  lamp.scale.setScalar(0.8);
  lamp.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.02, 24), legMat));
  const arm = box(0.015, 0.45, 0.015, legMat, 0.06, 0.22, 0);
  arm.rotation.z = -0.3;
  lamp.add(arm);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 24, 1, true), std('#2b2c2f', 0.6, 0.4, { side: THREE.DoubleSide }));
  head.position.set(0.17, 0.42, 0);
  head.rotation.z = 2.2;
  lamp.add(head);
  g.add(lamp);
  // Workshop beyond: a bench, a lathe-ish machine, a rack
  g.add(box(2.4, 0.9, 0.8, std('#5d6066', 0.4, 0.6), 7, 0.45, 0));
  g.add(box(1.6, 1.4, 0.9, std('#3f6f8c', 0.3, 0.5), 11, 0.7, 1));
  g.add(box(0.8, 2.2, 0.6, std('#c9541f', 0.2, 0.6), 14.5, 1.1, -0.4));
  for (let i = 0; i < 4; i++) g.add(box(2.8, 0.05, 0.6, legMat, 18, 0.5 + i * 0.5, -0.4));
  return { group: g };
}

/* ── Desk props ───────────────────────────────────────────────────────────── */

function gearShape(r, teeth, depth, internal = false) {
  const s = new THREE.Shape();
  const n = teeth * 4;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const phase = i % 4;
    const rr = phase === 1 || phase === 2 ? r + (internal ? -depth : depth) / 2 : r - (internal ? -depth : depth) / 2;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  return s;
}

/** Planetary gearbox: housing (x-ray when inside) + animated gear train. Units: metres. */
export function buildGearbox() {
  const g = new THREE.Group();
  const steel = std('#c9ced6', 0.9, 0.28);
  const dark = std('#3a3e45', 0.7, 0.4);
  const brass = std('#c9a35a', 0.9, 0.3);
  const ext = (shape, depth, mat) => {
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.0006, bevelThickness: 0.0006, bevelSegments: 1, curveSegments: 48 });
    geo.rotateX(-Math.PI / 2);
    return new THREE.Mesh(geo, mat);
  };

  // Ring gear (internal teeth)
  const ring = new THREE.Shape();
  ring.absarc(0, 0, 0.068, 0, Math.PI * 2, false);
  ring.holes.push(gearShape(0.056, 48, 0.006, true));
  const ringMesh = ext(ring, 0.014, steel);
  ringMesh.position.y = 0.032;
  g.add(ringMesh);

  const sun = ext(gearShape(0.017, 14, 0.006), 0.016, brass);
  sun.position.y = 0.031;
  g.add(sun);
  const planets = [];
  const carrier = new THREE.Group();
  carrier.position.y = 0.031;
  g.add(carrier);
  for (let i = 0; i < 3; i++) {
    const p = ext(gearShape(0.0175, 15, 0.006), 0.016, steel);
    const a = (i / 3) * Math.PI * 2;
    const holder = new THREE.Group();
    holder.position.set(Math.cos(a) * 0.0365, 0, Math.sin(a) * 0.0365);
    holder.add(p);
    carrier.add(holder);
    planets.push(p);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.03, 16), dark);
    pin.position.set(holder.position.x, 0.006, holder.position.z);
    carrier.add(pin);
  }
  const plate = ext(
    (() => {
      const s = new THREE.Shape();
      s.absarc(0, 0, 0.045, 0, Math.PI * 2, false);
      const h = new THREE.Path();
      h.absarc(0, 0, 0.008, 0, Math.PI * 2, true);
      s.holes.push(h);
      return s;
    })(),
    0.004,
    dark,
  );
  // Carrier plate sits under the planets so the mesh reads from above.
  carrier.add(plate);
  plate.position.y = -0.008;

  // Shaft + bearings
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 24), steel);
  shaft.position.y = 0.06;
  g.add(shaft);
  for (const y of [0.012, 0.075]) {
    const race = new THREE.Mesh(new THREE.TorusGeometry(0.013, 0.003, 12, 40), steel);
    race.rotation.x = Math.PI / 2;
    race.position.y = y;
    g.add(race);
    for (let i = 0; i < 10; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 12, 8), std('#e8ebef', 1, 0.12));
      const a = (i / 10) * Math.PI * 2;
      b.position.set(Math.cos(a) * 0.013, y, Math.sin(a) * 0.013);
      g.add(b);
    }
  }

  // Housing: base flange + shell + cap. Fades to an x-ray when you go inside.
  const shellMat = std('#59606b', 0.6, 0.45, { transparent: true, side: THREE.DoubleSide, depthWrite: true });
  const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.008, 64), shellMat);
  flange.position.y = 0.004;
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.07, 64, 1, true), shellMat);
  shell.position.y = 0.043;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.006, 64), shellMat);
  cap.position.y = 0.081;
  const edgeMat = new THREE.LineBasicMaterial({ color: '#9fb4cc', transparent: true, opacity: 0 });
  for (const m of [flange, shell, cap]) {
    g.add(m);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 20), edgeMat));
  }
  // Bolts around the flange
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.006, 6), dark);
    b.position.set(Math.cos(a) * 0.083, 0.011, Math.sin(a) * 0.083);
    g.add(b);
  }

  return {
    group: g,
    center: new THREE.Vector3(0, 0.035, 0),
    update(t) {
      sun.rotation.y = t * 1.2;
      carrier.rotation.y = -t * 1.2 * (14 / (14 + 48));
      for (const p of planets) p.rotation.y = -t * 1.2 * (14 / 15) * 0.9;
    },
    xray(o) {
      // o = 1 → solid housing, 0 → ghosted with outlines
      shellMat.opacity = 0.12 + 0.88 * o;
      shellMat.depthWrite = o > 0.6;
      edgeMat.opacity = (1 - o) * 0.8;
    },
  };
}

/** Lightbox with a strip of six slides. Units: metres. */
export function buildLightbox(frameTexture, frameItems) {
  const g = new THREE.Group();
  g.add(rbox(0.27, 0.014, 0.19, 0.004, std('#e9e9e6', 0, 0.5), 0, 0.007, 0));
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.17), new THREE.MeshBasicMaterial({ color: '#fffdf6', toneMapped: false }));
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.0142;
  g.add(glow);

  const pitch = 0.038;
  const strip = new THREE.Group();
  strip.position.y = 0.0146;
  g.add(strip);
  // Film base: translucent amber with sprocket holes drawn into a texture.
  // High resolution: at the Art stop a single frame fills the screen.
  const c = document.createElement('canvas');
  c.width = 4096;
  c.height = 640;
  const cx = c.getContext('2d');
  cx.fillStyle = 'rgba(60,35,18,0.92)';
  cx.fillRect(0, 0, 4096, 640);
  cx.fillStyle = 'rgba(255,250,240,0.95)';
  for (let x = 24; x < 4096; x += 4096 / 48) {
    cx.beginPath();
    cx.roundRect(x, 40, 36, 56, 6);
    cx.roundRect(x, 544, 36, 56, 6);
    cx.fill();
  }
  cx.fillStyle = 'rgba(255,190,90,0.85)';
  cx.font = '600 34px monospace';
  for (let i = 0; i < 6; i++) cx.fillText(`${14 + i}  ▸  GS 400`, 120 + i * (4096 / 6), 622);
  const baseTex = new THREE.CanvasTexture(c);
  baseTex.colorSpace = THREE.SRGBColorSpace;
  const base = new THREE.Mesh(new THREE.PlaneGeometry(pitch * 6 + 0.006, 0.035), new THREE.MeshBasicMaterial({ map: baseTex, transparent: true, toneMapped: false }));
  base.rotation.x = -Math.PI / 2;
  strip.add(base);
  const frames = [];
  for (let i = 0; i < 6; i++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.036, 0.024), new THREE.MeshBasicMaterial({ map: frameTexture(frameItems[i % frameItems.length].id), toneMapped: false }));
    f.rotation.x = -Math.PI / 2;
    f.position.set(-pitch * 2.5 + i * pitch, 0.0002, 0);
    strip.add(f);
    frames.push(f);
  }
  return { group: g, frames, framePos: (i) => new THREE.Vector3(-pitch * 2.5 + i * pitch, 0.015, 0) };
}

/** Laptop with an "apps" screen. Units: metres. Returns the screen frame for the camera. */
export function buildLaptop(screenTexture) {
  const g = new THREE.Group();
  const alu = std('#c4c7cb', 0.8, 0.3);
  g.add(rbox(0.31, 0.012, 0.215, 0.005, alu, 0, 0.006, 0));
  g.add(box(0.27, 0.002, 0.1, std('#26272a', 0.2, 0.7), 0, 0.0125, -0.035));
  const lid = new THREE.Group();
  lid.position.set(0, 0.012, -0.107);
  lid.rotation.x = -0.28;
  g.add(lid);
  lid.add(rbox(0.31, 0.2, 0.007, 0.005, alu, 0, 0.1, 0));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.181), new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false }));
  screen.position.set(0, 0.1, 0.0037);
  lid.add(screen);
  return { group: g, screen };
}

/** A few more things on the desk so it feels lived-in. Units: metres. */
export function buildDeskClutter(sketchTexture) {
  const g = new THREE.Group();
  const nb = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.01, 0.15), [
    std('#2a2c30'),
    std('#2a2c30'),
    new THREE.MeshStandardMaterial({ map: sketchTexture, roughness: 0.9 }),
    std('#2a2c30'),
    std('#2a2c30'),
    std('#2a2c30'),
  ]);
  nb.position.set(-0.12, 0.005, 0.17);
  nb.rotation.y = 0.18;
  g.add(nb);
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.036, 0.095, 32), std('#e7e1d6', 0, 0.5));
  mug.position.set(0.66, 0.0475, 0.2);
  g.add(mug);
  const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 12), std('#c2552d', 0.2, 0.4));
  pen.rotation.z = Math.PI / 2;
  pen.rotation.y = 0.5;
  pen.position.set(0.0, 0.006, 0.2);
  g.add(pen);
  return { group: g };
}

/* ── Procedural images ────────────────────────────────────────────────────── */

const PAL = [
  ['#1d2b44', '#e6a77a', '#f6d7b0', '#2a1d22'],
  ['#9fb2ba', '#e9ecea', '#6d7a80', '#2b3135'],
  ['#0f2f3d', '#3f8a9b', '#d9efe9', '#071a22'],
  ['#c7744a', '#f0c48b', '#fbe9cf', '#5a2c1c'],
  ['#130f26', '#c43d7b', '#ffb36b', '#07060f'],
  ['#1e2a1f', '#6f8b5b', '#d5dcc0', '#0d130e'],
];

export function photoCanvas(seed, w = 512, h = 342) {
  const rnd = mulberry32(hashString(String(seed)));
  const pal = PAL[Math.floor(rnd() * PAL.length)];
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const horizon = h * (0.45 + rnd() * 0.3);
  const sky = g.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, pal[0]);
  sky.addColorStop(1, pal[2]);
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  const sx = w * (0.2 + rnd() * 0.6);
  const sy = horizon - h * (0.08 + rnd() * 0.25);
  const sun = g.createRadialGradient(sx, sy, 0, sx, sy, w * 0.45);
  sun.addColorStop(0, 'rgba(255,245,225,0.95)');
  sun.addColorStop(0.08, 'rgba(255,235,205,0.75)');
  sun.addColorStop(1, 'rgba(255,235,205,0)');
  g.fillStyle = sun;
  g.fillRect(0, 0, w, h);
  for (let l = 0; l < 3; l++) {
    const base = horizon + (l * (h - horizon)) / 3.5;
    g.beginPath();
    g.moveTo(0, h);
    let y = base - rnd() * h * 0.12;
    for (let x = 0; x <= w; x += w / 16) {
      y += (rnd() - 0.5) * h * 0.08;
      g.lineTo(x, Math.min(h, Math.max(horizon - h * 0.2, y)));
    }
    g.lineTo(w, h);
    g.closePath();
    g.globalAlpha = 0.55 + l * 0.2;
    g.fillStyle = l === 2 ? pal[3] : pal[1];
    g.fill();
  }
  g.globalAlpha = 1;
  const img = g.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rnd() - 0.5) * 30;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  const v = g.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.4)');
  g.fillStyle = v;
  g.fillRect(0, 0, w, h);
  return c;
}

export function canvasTex(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function sketchCanvas() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 366;
  const g = c.getContext('2d');
  g.fillStyle = '#f3efe6';
  g.fillRect(0, 0, 512, 366);
  g.strokeStyle = 'rgba(40,40,60,0.75)';
  g.lineWidth = 2;
  const rnd = mulberry32(3);
  const jitter = (x, y) => [x + (rnd() - 0.5) * 3, y + (rnd() - 0.5) * 3];
  g.beginPath();
  g.arc(...jitter(170, 180), 90, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.arc(...jitter(170, 180), 40, 0, Math.PI * 2);
  g.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.beginPath();
    g.arc(170 + Math.cos(a) * 66, 180 + Math.sin(a) * 66, 9, 0, Math.PI * 2);
    g.stroke();
  }
  g.strokeStyle = 'rgba(194,85,45,0.9)';
  g.beginPath();
  g.moveTo(60, 300);
  g.lineTo(280, 300);
  g.stroke();
  g.fillStyle = 'rgba(194,85,45,0.9)';
  g.font = '20px Caveat, cursive';
  g.fillText('Ø180 — check runout', 300, 306);
  g.fillStyle = 'rgba(40,40,60,0.8)';
  g.fillText('planet carrier v3', 320, 80);
  return c;
}

export function appsScreenCanvas(apps) {
  const c = document.createElement('canvas');
  c.width = 1280;
  c.height = 800;
  const g = c.getContext('2d');
  g.fillStyle = '#060908';
  g.fillRect(0, 0, 1280, 800);
  // Faint pixel grid
  g.fillStyle = 'rgba(92,242,176,0.05)';
  for (let x = 0; x < 1280; x += 16) g.fillRect(x, 0, 1, 800);
  for (let y = 0; y < 800; y += 16) g.fillRect(0, y, 1280, 1);
  g.fillStyle = '#5cf2b0';
  g.font = '500 30px "JetBrains Mono", monospace';
  g.fillText('~/apps', 64, 86);
  g.fillStyle = 'rgba(201,247,223,0.6)';
  g.font = '400 20px "JetBrains Mono", monospace';
  g.fillText(`${apps.length} running · same person, different lens`, 64, 122);
  apps.forEach((a, i) => {
    const x = 64 + i * 392;
    const y = 180;
    g.strokeStyle = '#5cf2b0';
    g.lineWidth = 2;
    g.strokeRect(x, y, 360, 520);
    g.fillStyle = 'rgba(92,242,176,0.12)';
    g.fillRect(x, y, 360, 44);
    g.fillStyle = '#5cf2b0';
    for (let k = 0; k < 3; k++) {
      g.beginPath();
      g.arc(x + 22 + k * 20, y + 22, 6, 0, Math.PI * 2);
      g.fill();
    }
    g.font = '500 20px "JetBrains Mono", monospace';
    g.fillText(a.id, x + 96, y + 29);
    g.fillStyle = '#e8fff3';
    g.font = '600 30px Inter, sans-serif';
    g.fillText(a.title, x + 24, y + 100);
    g.fillStyle = 'rgba(201,247,223,0.6)';
    g.font = '400 18px "JetBrains Mono", monospace';
    g.fillText(`${a.stage} · ${a.years[0]}`, x + 24, y + 134);
    const rnd = mulberry32(hashString(a.id));
    g.fillStyle = 'rgba(201,247,223,0.25)';
    for (let k = 0; k < 6; k++) g.fillRect(x + 24, y + 176 + k * 28, 120 + rnd() * 190, 10);
    g.strokeStyle = '#5cf2b0';
    g.beginPath();
    let yy = y + 440;
    for (let xx = x + 24; xx < x + 336; xx += 16) {
      yy = Math.max(y + 380, Math.min(y + 490, yy + (rnd() - 0.5) * 40));
      if (xx === x + 24) g.moveTo(xx, yy);
      else g.lineTo(xx, yy);
    }
    g.stroke();
  });
  return c;
}
