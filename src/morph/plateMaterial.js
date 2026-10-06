// Plate material: MeshStandardMaterial with a few injected layers on the top
// face. The land layer is computed per pixel by gnomonic projection — the
// plate-local point is placed on its icosahedron face, pushed onto the sphere
// and looked up in the equirectangular land mask — so the same plates read as
// a globe when closed and as an icosahedral world map when unfolded. Land is
// drawn as a triangular dot lattice aligned to the plate edges, so dots line
// up across neighbouring plates in the net. The screen layer samples one
// shared UI canvas through a per-plate transform, so the UI only resolves
// once the plates tile the screen.
import * as THREE from 'three';
import { EDGE, RI } from './geometry.js';

const color = (hex) => new THREE.Color(hex);

/** State-driven uniforms shared by all twenty plates. */
export const shared = {
  uPlate: { value: color('#f2ede4') },
  uSide: { value: color('#d9cfbf') },
  uOcean: { value: color('#12233d') },
  uLandC: { value: color('#e8a54a') },
  uDotC: { value: color('#f2b45a') },
  uGridC: { value: color('#2b4466') },
  uRough: { value: 0.6 },
  uRoughSide: { value: 0.5 },
  uMetal: { value: 0 },
  uMetalSide: { value: 0 },
  uMap: { value: 0 },
  uHint: { value: 0 },
  uFill: { value: 0.16 },
  uGrid: { value: 0 },
  uCoast: { value: 0 },
  uDotGlow: { value: 0 },
  uUi: { value: 0 },
  uUiGlow: { value: 0 },
  uDotN: { value: 42 },
  uLandTex: { value: null },
  uScreenTex: { value: null },
};

const VERT_HEAD = /* glsl */ `
varying vec3 vLocal;
varying vec3 vLocalN;
`;

const FRAG_HEAD = /* glsl */ `
varying vec3 vLocal;
varying vec3 vLocalN;
uniform vec3 uC, uX, uY;
uniform mat3 uScreenM;
uniform sampler2D uLandTex, uScreenTex;
uniform vec3 uPlate, uSide, uOcean, uLandC, uDotC, uGridC;
uniform float uRough, uRoughSide, uMetal, uMetalSide;
uniform float uMap, uHint, uFill, uGrid, uCoast, uDotGlow, uUi, uUiGlow, uDotN;
#define MX_PI 3.141592653589793
#define MX_EDGE ${EDGE.toFixed(6)}
#define MX_RI ${RI.toFixed(6)}

vec2 mxLatLon(vec2 p) {
  vec3 s = normalize(uC + uX * p.x + uY * p.y);
  return vec2(asin(clamp(s.y, -1.0, 1.0)), atan(s.x, s.z));
}
float mxLand(vec2 ll) {
  return texture2D(uLandTex, vec2(ll.y / (2.0 * MX_PI) + 0.5, ll.x / MX_PI + 0.5)).a;
}
// Nearest point of a triangular lattice whose rows run along the plate edges.
vec3 mxLattice(vec2 p) {
  float s = MX_EDGE / uDotN;
  vec2 o = vec2(-0.5 * MX_EDGE, -MX_RI);
  float v = (p.y - o.y) / (s * 0.8660254);
  float u = (p.x - o.x) / s - 0.5 * v;
  vec2 f = floor(vec2(u, v));
  vec2 best = o;
  float bd = 1e9;
  for (int i = 0; i < 4; i++) {
    vec2 c = f + vec2(mod(float(i), 2.0), floor(float(i) * 0.5));
    vec2 q = o + vec2((c.x + 0.5 * c.y) * s, c.y * s * 0.8660254);
    float d = distance(p, q);
    if (d < bd) { bd = d; best = q; }
  }
  return vec3(best, bd);
}
`;

const FRAG_COLOR = /* glsl */ `
#include <color_fragment>
float mxFront = smoothstep(0.92, 0.995, vLocalN.z);
vec3 mxTop = uPlate;
vec3 mxGlow = vec3(0.0);
if (uMap + uHint > 0.001) {
  vec2 ll = mxLatLon(vLocal.xy);
  float land = mxLand(ll);
  vec3 lat = mxLattice(vLocal.xy);
  float landAtDot = smoothstep(0.35, 0.65, mxLand(mxLatLon(lat.xy)));
  float px = max(fwidth(vLocal.x), 1e-5);
  float s = MX_EDGE / uDotN;
  float r = s * 0.31;
  float dotA = (1.0 - smoothstep(r - px * 0.7, r + px * 0.7, lat.z)) * landAtDot;
  // When the lattice gets finer than a few pixels, fall back to a fill.
  float dotsVis = smoothstep(2.6, 4.5, s / px);
  float mark = mix(land * 0.75, dotA, dotsVis);
  // Graticule every 15°, faded towards the poles.
  vec2 deg = ll / MX_PI * 180.0;
  vec2 g = abs(fract(deg / 15.0 + 0.5) - 0.5) * 15.0;
  float lonW = max(fwidth(deg.y), 1e-4);
  float lonW2 = fwidth(mod(deg.y + 360.0, 360.0));
  lonW = min(lonW, max(lonW2, 1e-4));
  float gl = 1.0 - smoothstep(0.0, fwidth(deg.x) * 1.1, g.x);
  float gn = (1.0 - smoothstep(0.0, lonW * 1.1, g.y)) * (1.0 - smoothstep(70.0, 82.0, abs(deg.x)));
  float grid = max(gl, gn);
  float coast = 1.0 - smoothstep(0.0, fwidth(land) * 1.25 + 1e-4, abs(land - 0.5));
  vec3 mapC = uOcean;
  mapC = mix(mapC, uGridC, grid * uGrid);
  mapC = mix(mapC, uLandC, land * uFill);
  mapC = mix(mapC, uDotC, mark);
  mapC = mix(mapC, uLandC, coast * uCoast);
  mxTop = mix(mxTop, mapC, uMap);
  mxTop = mix(mxTop, mxTop * 0.82, mark * uHint);
  mxGlow += (uDotC * mark + uLandC * coast * uCoast * 0.6) * uDotGlow * uMap;
}
if (uUi > 0.001) {
  vec2 suv = (uScreenM * vec3(vLocal.xy, 1.0)).xy;
  vec4 ui = texture2D(uScreenTex, suv);
  mxTop = mix(mxTop, ui.rgb, uUi);
  mxGlow += ui.rgb * ui.a * uUiGlow * uUi;
}
diffuseColor.rgb = mix(uSide, mxTop, mxFront);
`;

/**
 * One material per plate (per-plate uniforms: its icosahedron face frame and
 * its screen transform). All plates compile to the same program.
 */
export function createPlateMaterial(face, screenM) {
  const own = {
    uC: { value: face.centroid.clone() },
    uX: { value: face.axisX.clone() },
    uY: { value: face.axisY.clone() },
    uScreenM: { value: screenM },
  };
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0 });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared, own);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERT_HEAD}`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;\nvLocalN = normal;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAG_HEAD}`)
      .replace('#include <color_fragment>', FRAG_COLOR)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(uRoughSide, uRough, mxFront);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(uMetalSide, uMetal, mxFront);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += mxGlow * mxFront;');
  };
  mat.customProgramCacheKey = () => 'morph-plate';
  return mat;
}
