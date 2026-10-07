// World geography helpers shared by the mocks: Natural Earth land outlines
// (via world-atlas), a rasterised land mask for fast lat/lon lookups, and
// simple projections.
import { feature } from 'topojson-client';

let landPromise;

/** GeoJSON MultiPolygon feature of the world's land (110m resolution). */
export function loadLand() {
  landPromise ??= import('world-atlas/land-110m.json').then((m) => {
    const topo = m.default ?? m;
    return feature(topo, topo.objects.land);
  });
  return landPromise;
}

let countriesPromise;
let detailPromise;

/** GeoJSON FeatureCollection of the world's countries (110m), named in `properties.name`. */
export function loadCountries() {
  countriesPromise ??= import('world-atlas/countries-110m.json').then((m) => {
    const topo = m.default ?? m;
    return feature(topo, topo.objects.countries);
  });
  return countriesPromise;
}

/** Finer (50m) land and countries, for a map zoomed in close. Loaded on first use. */
export function loadDetail() {
  detailPromise ??= Promise.all([import('world-atlas/land-50m.json'), import('world-atlas/countries-50m.json')]).then(([l, c]) => {
    const land = l.default ?? l;
    const ctry = c.default ?? c;
    return { land: feature(land, land.objects.land), countries: feature(ctry, ctry.objects.countries) };
  });
  return detailPromise;
}

/** Iterate every ring of every polygon as arrays of [lon, lat]. */
export function forEachRing(land, fn) {
  const geoms = land.type === 'FeatureCollection' ? land.features.map((f) => f.geometry) : [land.geometry];
  for (const g of geoms) {
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    for (const poly of polys) for (const ring of poly) fn(ring);
  }
}

/**
 * Rings ready for flat (equirectangular) drawing. The source data wraps across
 * the antimeridian (Chukotka, Fiji…), which smears a band across a flat map.
 * Such rings are unwrapped into continuous longitudes and drawn a second time
 * shifted by ±360° so each half lands on the correct side. Rings that encircle
 * a pole (Antarctica) are left as-is.
 */
export function planarRings(land) {
  const out = [];
  forEachRing(land, (ring) => {
    let crosses = false;
    const un = [ring[0].slice()];
    for (let i = 1; i < ring.length; i++) {
      let lon = ring[i][0];
      const prev = un[i - 1][0];
      while (lon - prev > 180) lon -= 360;
      while (lon - prev < -180) lon += 360;
      if (lon !== ring[i][0]) crosses = true;
      un.push([lon, ring[i][1]]);
    }
    const winding = un[un.length - 1][0] - un[0][0];
    if (!crosses || Math.abs(winding) > 180) {
      out.push(ring);
      return;
    }
    out.push(un);
    const lo = Math.min(...un.map((p) => p[0]));
    const hi = Math.max(...un.map((p) => p[0]));
    if (lo < -180) out.push(un.map(([x, y]) => [x + 360, y]));
    if (hi > 180) out.push(un.map(([x, y]) => [x - 360, y]));
  });
  return out;
}

/**
 * Rasterise land into an equirectangular mask. Returns { isLand(lat, lon),
 * canvas } where the canvas is white land on transparent.
 */
export async function loadLandMask(width = 1024) {
  const land = await loadLand();
  const height = width / 2;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  planarRings(land).forEach((ring) => {
    ring.forEach(([lon, lat], i) => {
      const x = ((lon + 180) / 360) * width;
      const y = ((90 - lat) / 180) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
  });
  ctx.fill('evenodd');
  const data = ctx.getImageData(0, 0, width, height).data;
  const isLand = (lat, lon) => {
    const x = Math.min(width - 1, Math.max(0, Math.floor(((((lon + 180) % 360) + 360) % 360) / 360 * width)));
    const y = Math.min(height - 1, Math.max(0, Math.floor(((90 - lat) / 180) * height)));
    return data[(y * width + x) * 4 + 3] > 127;
  };
  return { isLand, canvas, width, height };
}

const DEG = Math.PI / 180;

/** Unit-sphere position. lon 0 faces +Z, north is +Y. */
export function latLonToVec3(lat, lon, r = 1) {
  const la = lat * DEG;
  const lo = lon * DEG;
  return [r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo)];
}

export function vec3ToLatLon(x, y, z) {
  const r = Math.hypot(x, y, z) || 1;
  return [Math.asin(y / r) / DEG, Math.atan2(x, z) / DEG];
}

/** Equirectangular projection into a w×h box, optionally cropped to bounds. */
export function equirect(w, h, bounds = { west: -180, east: 180, north: 90, south: -90 }) {
  const sx = w / (bounds.east - bounds.west);
  const sy = h / (bounds.north - bounds.south);
  return (lon, lat) => [(lon - bounds.west) * sx, (bounds.north - lat) * sy];
}

/** SVG path data for land, using a projection fn(lon, lat) → [x, y]. */
export function landPath(land, project) {
  let d = '';
  planarRings(land).forEach((ring) => {
    ring.forEach(([lon, lat], i) => {
      const [x, y] = project(lon, lat);
      d += `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
    });
    d += 'Z';
  });
  return d;
}
