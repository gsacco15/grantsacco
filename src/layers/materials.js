// Materials, procedural textures and the small custom shaders the layers use.
import * as THREE from 'three';
import { mulberry32 } from '../anim.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function tex(c, { repeat = [1, 1], srgb = false, aniso = 4 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ── Procedural textures ─────────────────────────────────────────────────── */

// Pebbled leatherette: soft random bumps.
function leatherBump() {
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);
  const rand = mulberry32(7);
  for (let i = 0; i < 2600; i++) {
    const x = rand() * 256;
    const y = rand() * 256;
    const r = 1.2 + rand() * 2.6;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const v = 150 + rand() * 80;
    g.addColorStop(0, `rgba(${v},${v},${v},0.9)`);
    g.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return tex(c, { repeat: [5, 2.4] });
}

// Brushed metal: fine horizontal streaks in the roughness channel.
function brushedRoughness() {
  const [c, ctx] = canvas(512, 64);
  ctx.fillStyle = '#6a6a6a';
  ctx.fillRect(0, 0, 512, 64);
  const rand = mulberry32(11);
  for (let i = 0; i < 900; i++) {
    const v = 80 + rand() * 90;
    ctx.fillStyle = `rgba(${v},${v},${v},0.35)`;
    ctx.fillRect(rand() * 512, rand() * 64, 30 + rand() * 200, 1);
  }
  return tex(c, { repeat: [2, 6] });
}

// Shutter-speed dial face: engraved speeds around a satin disc.
function dialFace() {
  const [c, ctx] = canvas(512, 512);
  const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  g.addColorStop(0, '#d9d9d6');
  g.addColorStop(1, '#b9b9b6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  for (let r = 20; r < 256; r += 3) {
    ctx.beginPath();
    ctx.arc(256, 256, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  const speeds = ['B', '1', '2', '4', '8', '15', '30', '60', '125', '250', '500', '1000'];
  ctx.fillStyle = '#151515';
  ctx.font = '600 44px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  speeds.forEach((s, i) => {
    const a = (i / speeds.length) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.translate(256 + Math.cos(a) * 190, 256 + Math.sin(a) * 190);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = s === '60' ? '#b4372a' : '#151515';
    ctx.fillText(s, 0, 0);
    ctx.restore();
  });
  const t = tex(c, { srgb: true });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// Lens name ring: white engraving on black, arranged in a circle.
function lensRing() {
  const [c, ctx] = canvas(512, 512);
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = '#e8e6e0';
  ctx.font = '500 26px Inter, sans-serif';
  ctx.textAlign = 'center';
  const text = 'GS-35 · 1:2 / 50 · No. 2026 · 0415 ·  ';
  const chars = [...text];
  chars.forEach((ch, i) => {
    const a = (i / chars.length) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.translate(256 + Math.cos(a) * 222, 256 + Math.sin(a) * 222);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(ch, 0, 9);
    ctx.restore();
  });
  const t = tex(c, { srgb: true });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// Film cassette label.
function cassetteLabel() {
  const [c, ctx] = canvas(512, 256);
  ctx.fillStyle = '#e8e2d4';
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = '#c4452c';
  ctx.fillRect(0, 150, 512, 60);
  ctx.fillStyle = '#1a1a1a';
  ctx.font = '600 54px Inter, sans-serif';
  ctx.fillText('GRAIN', 30, 110);
  ctx.font = '500 34px "JetBrains Mono", monospace';
  ctx.fillText('400 · 36', 270, 108);
  ctx.fillStyle = '#e8e2d4';
  ctx.font = '500 26px "JetBrains Mono", monospace';
  ctx.fillText('135 · HOME DEV · 2019→', 30, 190);
  return tex(c, { srgb: true });
}

// Circuit board traces.
function pcbMap() {
  const [c, ctx] = canvas(512, 256);
  ctx.fillStyle = '#1e4a38';
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = '#c9a453';
  ctx.lineWidth = 3;
  const rand = mulberry32(3);
  for (let i = 0; i < 40; i++) {
    let x = rand() * 512;
    let y = rand() * 256;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 4; s++) {
      if (s % 2) x += (rand() - 0.5) * 160;
      else y += (rand() - 0.5) * 100;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = '#d8b765';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  return tex(c, { srgb: true });
}

// Soft elliptical contact shadow.
function contactShadow() {
  const [c, ctx] = canvas(256, 128);
  const g = ctx.createRadialGradient(128, 64, 0, 128, 64, 128);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(0.35, 'rgba(0,0,0,0.65)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.save();
  ctx.scale(1, 0.5);
  ctx.fillRect(0, 0, 256, 256);
  ctx.restore();
  const t = new THREE.CanvasTexture(c);
  return t;
}

/* ── Material library ────────────────────────────────────────────────────── */

export function createMaterials() {
  const rough = brushedRoughness();
  const m = {
    chrome: new THREE.MeshStandardMaterial({ color: '#d4d4d1', metalness: 1, roughness: 0.32, roughnessMap: rough }),
    chromeBright: new THREE.MeshStandardMaterial({ color: '#e6e6e3', metalness: 1, roughness: 0.16 }),
    satin: new THREE.MeshStandardMaterial({ color: '#161616', metalness: 0.55, roughness: 0.42 }),
    knurl: new THREE.MeshStandardMaterial({ color: '#1a1a1a', metalness: 0.5, roughness: 0.5, flatShading: true }),
    knurlChrome: new THREE.MeshStandardMaterial({ color: '#cfcfcc', metalness: 1, roughness: 0.3, flatShading: true }),
    leather: new THREE.MeshStandardMaterial({ color: '#141414', metalness: 0, roughness: 0.78, bumpMap: leatherBump(), bumpScale: 2.2 }),
    matte: new THREE.MeshStandardMaterial({ color: '#070707', metalness: 0, roughness: 0.95, side: THREE.DoubleSide }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#0d1820', metalness: 0, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.6 }),
    frosted: new THREE.MeshStandardMaterial({ color: '#d9dcdc', metalness: 0, roughness: 0.55 }),
    lensGlass: new THREE.MeshPhysicalMaterial({
      color: '#0a0d14',
      metalness: 0,
      roughness: 0.02,
      clearcoat: 1,
      iridescence: 1,
      iridescenceIOR: 1.35,
      iridescenceThicknessRange: [180, 520],
      envMapIntensity: 2,
    }),
    red: new THREE.MeshStandardMaterial({ color: '#c0352a', roughness: 0.4 }),
    dial: new THREE.MeshStandardMaterial({ map: dialFace(), metalness: 0.6, roughness: 0.35 }),
    lensRing: new THREE.MeshStandardMaterial({ map: lensRing(), metalness: 0.3, roughness: 0.5 }),
    // internals: base colours are kept so the palette can pull them toward clay
    steel: new THREE.MeshStandardMaterial({ color: '#9aa0a6', metalness: 0.8, roughness: 0.38 }),
    brass: new THREE.MeshStandardMaterial({ color: '#c09a52', metalness: 0.85, roughness: 0.32 }),
    cloth: new THREE.MeshStandardMaterial({ color: '#1b1b1d', metalness: 0.1, roughness: 0.55, side: THREE.DoubleSide }),
    cassette: new THREE.MeshStandardMaterial({ map: cassetteLabel(), metalness: 0.3, roughness: 0.45 }),
    cassetteCap: new THREE.MeshStandardMaterial({ color: '#2a2a2a', metalness: 0.7, roughness: 0.35 }),
    pcb: new THREE.MeshStandardMaterial({ map: pcbMap(), roughness: 0.6 }),
    chip: new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.5 }),
    battery: new THREE.MeshStandardMaterial({ color: '#c3c7cb', metalness: 0.9, roughness: 0.25 }),
    mirror: new THREE.MeshStandardMaterial({ color: '#e9ecef', metalness: 1, roughness: 0.06 }),
    iris: new THREE.MeshStandardMaterial({ color: '#2b2c2e', metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide }),
    flex: new THREE.MeshStandardMaterial({ color: '#c88a2c', roughness: 0.5, side: THREE.DoubleSide }),
    filmRoll: new THREE.MeshStandardMaterial({ color: '#7a3c1a', roughness: 0.45 }),
    opticGlass: new THREE.MeshStandardMaterial({ color: '#bfe1f2', metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.55 }),
    film: new THREE.MeshStandardMaterial({ roughness: 0.4, side: THREE.DoubleSide, alphaTest: 0.5 }),
  };
  m.contactShadow = contactShadow();
  return m;
}

/* ── Custom shaders ──────────────────────────────────────────────────────── */

/*
 * Reveal line material, used for every technical line in the scene.
 * aT     0→1 along a stroke; uReveal hides everything past it (uCenter=1 grows
 *        from the middle outward instead, for dimension lines).
 * aDist  world distance along the stroke, for dashes (uDash/uGap, uFlow scrolls).
 */
export function revealMaterial({ color = '#000', opacity = 1, dash = 0, gap = 0, center = 0, depthTest = true, depthFunc } = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uReveal: { value: 1 },
      uCenter: { value: center },
      uDash: { value: dash },
      uGap: { value: gap },
      uFlow: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aT;
      attribute float aDist;
      varying float vT;
      varying float vDist;
      void main() {
        vT = aT;
        vDist = aDist;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity, uReveal, uCenter, uDash, uGap, uFlow;
      varying float vT;
      varying float vDist;
      void main() {
        float t = mix(vT, abs(vT - 0.5) * 2.0, uCenter);
        if (t > uReveal + 1e-4) discard;
        if (uDash > 0.0 && mod(vDist - uFlow, uDash + uGap) > uDash) discard;
        gl_FragColor = vec4(uColor, uOpacity);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    depthTest,
    side: THREE.DoubleSide,
  });
  if (depthFunc !== undefined) mat.depthFunc = depthFunc;
  return mat;
}

/** Fresnel x-ray shell: faint faces, bright silhouettes. */
export function ghostMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color('#000') }, uOpacity: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
        float a = uOpacity * (0.035 + pow(f, 3.0) * 0.6);
        gl_FragColor = vec4(uColor, a);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    depthFunc: THREE.LessEqualDepth,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
}

/** Round screen-space dots that reveal left → right (the world map). */
export function dotMaterial(size) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color('#fff') },
      uOpacity: { value: 0 },
      uReveal: { value: 1 },
      uSize: { value: size },
    },
    vertexShader: /* glsl */ `
      attribute float aT;
      uniform float uSize;
      varying float vT;
      void main() {
        vT = aT;
        gl_PointSize = uSize;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity, uReveal;
      varying float vT;
      void main() {
        if (vT > uReveal) discard;
        vec2 p = gl_PointCoord - 0.5;
        float a = smoothstep(0.5, 0.25, length(p));
        gl_FragColor = vec4(uColor, uOpacity * a);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
  });
}

/**
 * Build a LineSegments geometry (pairs of points) with aT/aDist attributes.
 * `strokes` is an array of polylines (arrays of Vector3); each polyline gets
 * aT running 0→1 along its length unless `tFn(point)` overrides it.
 */
export function strokeGeometry(strokes, tFn) {
  const pos = [];
  const ts = [];
  const ds = [];
  for (const s of strokes) {
    let total = 0;
    for (let i = 1; i < s.length; i++) total += s[i].distanceTo(s[i - 1]);
    let acc = 0;
    for (let i = 1; i < s.length; i++) {
      const a = s[i - 1];
      const b = s[i];
      const len = a.distanceTo(b);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      ts.push(tFn ? tFn(a) : acc / (total || 1), tFn ? tFn(b) : (acc + len) / (total || 1));
      ds.push(acc, acc + len);
      acc += len;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(ts, 1));
  g.setAttribute('aDist', new THREE.Float32BufferAttribute(ds, 1));
  return g;
}

/** Same attributes for a plain segment-pair position array (e.g. EdgesGeometry). */
export function segmentsGeometry(positions, tFn) {
  const n = positions.length / 3;
  const ts = new Float32Array(n);
  const ds = new Float32Array(n);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let i = 0; i < n; i += 2) {
    a.fromArray(positions, i * 3);
    b.fromArray(positions, i * 3 + 3);
    ts[i] = tFn(a);
    ts[i + 1] = tFn(b);
    ds[i] = 0;
    ds[i + 1] = a.distanceTo(b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('aT', new THREE.BufferAttribute(ts, 1));
  g.setAttribute('aDist', new THREE.BufferAttribute(ds, 1));
  return g;
}
