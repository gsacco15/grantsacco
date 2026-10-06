// TRAVELLER (place) — the item as a place on a map. The world zooms in to where
// it happened; related items are drawn as routes; switching project flies the
// map from the old place to the new one.
import './traveller.css';
import { items } from '../../content.js';
import { loadLand, landPath } from '../../shared/geo.js';
import { el, esc, dms, haversineKm, itemById, pad2, yearsText } from '../lib.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const HOME = itemById.get('facility').place;
const WORLD = { x: 0, y: 8, w: 360, h: 150 };
const toXY = (p) => [p.lon + 180, 90 - p.lat];
let landD = null;
const landReady = loadLand().then((land) => (landD = landPath(land, (lon, lat) => [lon + 180, 90 - lat])));

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** The view for an item: its place plus related places, padded, at least ~40° wide. */
function viewFor(item, aspect) {
  const pts = [item.place, ...(item.related ?? []).map((id) => itemById.get(id)?.place).filter(Boolean)].map(toXY);
  let x0 = Math.min(...pts.map((p) => p[0]));
  let x1 = Math.max(...pts.map((p) => p[0]));
  let y0 = Math.min(...pts.map((p) => p[1]));
  let y1 = Math.max(...pts.map((p) => p[1]));
  let w = Math.max(72, (x1 - x0) * 1.95);
  let h = Math.max(w / aspect, (y1 - y0) * 1.8);
  w = Math.max(w, h * aspect);
  // Keep the subject right of centre: the info card sits on the left.
  const [, py] = toXY(item.place);
  const cx = (x0 + x1) / 2 - (aspect > 1 ? w * 0.13 : 0);
  const cy = aspect > 1 ? (y0 + y1) / 2 : py + h * 0.12;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

export default {
  id: 'place',
  persona: 'Traveller',
  palette: {
    bg: '#091222',
    ink: '#e2e9f3',
    muted: '#8191a8',
    line: 'rgb(226 233 243 / 0.14)',
    accent: '#ffb648',
    panel: 'rgb(9 18 34 / 0.78)',
  },

  mount(item, ctx) {
    const root = el('section', 'tv');
    const related = (item.related ?? []).map((id) => itemById.get(id)).filter((it) => it && it.place);
    // Places already labelled (rounded to ~1°), so co-located items don't stack labels.
    const taken = new Set([`${Math.round(item.place.lat)},${Math.round(item.place.lon)}`]);
    const claim = (p) => {
      const key = `${Math.round(p.lat)},${Math.round(p.lon)}`;
      if (taken.has(key)) return false;
      taken.add(key);
      return true;
    };
    const km = Math.round(haversineKm(item.place, HOME));
    root.innerHTML = `
      <div class="tx-bleed tv-map">
        <svg class="tv-svg" xmlns="${SVGNS}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <g class="tv-grat"></g>
          <path class="tv-land"/>
          <g class="tv-routes"></g>
        </svg>
        <div class="tv-pins" aria-hidden="true"></div>
      </div>
      <div class="tx-safe tv-wrap">
        <article class="tv-card">
          <p class="tv-kicker">Traveller · No. ${pad2(ctx.index + 1)} · ${yearsText(item.years)}</p>
          <h1 class="tv-title">${esc(item.title)}</h1>
          <p class="tv-place">${esc(item.place.name)}</p>
          <p class="tv-coords">${dms(item.place.lat, 'N', 'S')}<br/>${dms(item.place.lon, 'E', 'W')}</p>
          <p class="tv-line">${esc(item.lens.place)}</p>
          <dl class="tv-facts">
            <div><dt>From home base</dt><dd>${km < 50 ? 'right here' : `${km.toLocaleString()} km`}</dd></div>
            <div><dt>Connected places</dt><dd>${related.length}</dd></div>
          </dl>
        </article>
      </div>`;

    const svg = root.querySelector('.tv-svg');
    const land = root.querySelector('.tv-land');
    const grat = root.querySelector('.tv-grat');
    const routes = root.querySelector('.tv-routes');
    const pinLayer = root.querySelector('.tv-pins');

    // Graticule every 15°
    let gd = '';
    for (let lon = -180; lon <= 180; lon += 15) gd += `M${lon + 180},0V180`;
    for (let lat = -75; lat <= 75; lat += 15) gd += `M0,${90 - lat}H360`;
    grat.innerHTML = `<path d="${gd}"/>`;
    const setLand = () => land.setAttribute('d', landD);
    if (landD) setLand();
    else landReady.then(setLand);

    // Routes from this place to related places: gentle arcs, drawn on.
    const [ax, ay] = toXY(item.place);
    related.forEach((r, i) => {
      const [bx, by] = toXY(r.place);
      const dist = Math.hypot(bx - ax, by - ay);
      const p = document.createElementNS(SVGNS, 'path');
      p.setAttribute('d', `M${ax},${ay} Q${(ax + bx) / 2},${(ay + by) / 2 - dist * 0.28} ${bx},${by}`);
      p.style.setProperty('--i', i);
      routes.appendChild(p);
    });

    // Pins (HTML, so labels stay crisp at any zoom)
    const pins = [
      { it: item, cls: 'is-main' },
      ...related.map((it) => ({ it, cls: 'is-rel' })),
      ...items.filter((it) => it !== item && !related.includes(it)).map((it) => ({ it, cls: 'is-other' })),
    ].map((p) => {
      const labelled = p.cls === 'is-main' || (p.cls === 'is-rel' && claim(p.it.place));
      const n = el('span', `tv-pin ${p.cls}`, labelled ? `<i></i><b>${esc(p.it.title)}</b><small>${esc(p.it.place.name)}</small>` : '<i></i>');
      if (p.cls === 'is-rel') {
        n.addEventListener('click', () => ctx.go(p.it.id));
        n.setAttribute('title', `See ${p.it.title}`);
      }
      pinLayer.appendChild(n);
      return { ...p, n, xy: toXY(p.it.place) };
    });

    // Camera over the map: tween the viewBox.
    let view = ctx.handoff?.view ?? { ...WORLD };
    let raf = 0;
    const apply = () => {
      svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
      const r = svg.getBoundingClientRect();
      const s = Math.max(r.width / view.w, r.height / view.h);
      const ox = r.left + (r.width - view.w * s) / 2;
      const oy = r.top + (r.height - view.h * s) / 2;
      for (const p of pins) {
        const x = ox + (p.xy[0] - view.x) * s;
        const y = oy + (p.xy[1] - view.y) * s;
        p.n.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      }
    };
    function flyTo(target, dur) {
      cancelAnimationFrame(raf);
      const from = { ...view };
      const t0 = performance.now();
      // Far moves pull back a little mid-flight, like a camera on a long pan.
      const far = Math.hypot(target.x + target.w / 2 - (from.x + from.w / 2), target.y - from.y) / Math.max(from.w, target.w);
      const bump = Math.min(0.9, far * 0.9);
      const step = () => {
        const t = Math.min(1, (performance.now() - t0) / dur);
        const e = ease(t);
        const lift = 1 + bump * Math.sin(Math.PI * t);
        const w = (from.w + (target.w - from.w) * e) * lift;
        const h = (from.h + (target.h - from.h) * e) * lift;
        const cx = from.x + from.w / 2 + (target.x + target.w / 2 - from.x - from.w / 2) * e;
        const cy = from.y + from.h / 2 + (target.y + target.h / 2 - from.y - from.h / 2) * e;
        view = { x: cx - w / 2, y: cy - h / 2, w, h };
        apply();
        if (t < 1) raf = requestAnimationFrame(step);
      };
      step();
    }
    const aspect = () => {
      const r = root.getBoundingClientRect();
      return Math.max(0.5, r.width / Math.max(1, r.height));
    };

    return {
      el: root,
      title: root.querySelector('.tv-title'),
      attached() {
        apply();
      },
      enter() {
        root.classList.add('is-in');
        flyTo(viewFor(item, aspect()), 1900 * ctx.k);
      },
      handoff: () => ({ view: { ...view } }),
      resize() {
        flyTo(viewFor(item, aspect()), 1);
      },
      destroy() {
        cancelAnimationFrame(raf);
      },
    };
  },
};
