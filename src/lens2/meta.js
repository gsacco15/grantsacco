// Per-section wording: what each renderer is called, and the one-line
// caption a tile carries in each section.
import { SCALE } from './artifacts.js';

export const RENDER = {
  reality: 'photograph',
  structure: 'hidden line · hatch',
  build: 'clay',
  image: 'film still · 2.39 : 1',
  place: 'tone · equirectangular',
  digital: 'ascii · terminal',
};

// Years as a label: "2021–24", "2025 – now", "until 2014"; "~" marks placeholder dates.
const NOW = 2026;
const yrs = (it) => {
  // Work in separate stints reads as each stint: "2018–19, 2021–24".
  if (it.periods) return it.periods.map((p) => yrs({ ...it, periods: null, years: p.years })).join(', ');
  const [a, b] = it.years;
  const t = it.tbd ? '~' : '';
  if (a == null) return `until ${b}`;
  if (b >= NOW && it.kind !== 'app' && it.kind !== 'film') return `${t}${a} – now`;
  return a === b ? `${t}${a}` : `${t}${a}–${String(b).slice(2)}`;
};
const f2 = (v) => v.toFixed(2).replace(/^0/, '');

/** Physical size from the 0–1 log scale axis (see SCALE: 0 = 10 cm, 1 = 1 km). */
export function physicalSize(scale) {
  const m = SCALE.min * 10 ** (scale * SCALE.decades);
  if (m < 1) return `${Math.round(m * 100)} cm`;
  return `${m < 10 ? m.toFixed(1) : Math.round(m)} m`;
}

/** Labels for Engineering's scale axis, one per decade. */
export const scaleTicks = () =>
  Array.from({ length: SCALE.decades + 1 }, (_, i) => {
    const m = SCALE.min * 10 ** i;
    return { at: i / SCALE.decades, label: m < 1 ? `${Math.round(m * 100)} cm` : m >= 1000 ? `${m / 1000} km` : `${m} m` };
  });

export function metaFor(it, mode) {
  switch (mode) {
    case 'reality':
      return yrs(it);
    case 'structure':
      return `≈ ${physicalSize(it.axes.scale)} · c ${f2(it.axes.complexity)}`;
    case 'build':
      return `${it.stage} · ${yrs(it)}`;
    case 'image':
      return `${yrs(it)} · ${it.kind}`;
    case 'place':
      if (it.film) return `${it.film.year} · ${it.film.count} photos`;
      if (it.home) return `${it.home.born ? 'born · ' : ''}${yrs(it)}`;
      return it.place.name;
    case 'digital':
      return `d ${f2(it.axes.digital)} · f ${f2(it.axes.finished)}`;
    default:
      return '';
  }
}

export { yrs };
