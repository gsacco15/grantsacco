// Per-section wording: what each renderer is called, and the one-line
// caption a tile carries in each section.

export const RENDER = {
  reality: 'photograph · natural grade',
  structure: 'hidden line · hatch',
  build: 'clay · exploded',
  image: 'film still · 2.39 : 1 · grain',
  place: 'duotone · equirectangular',
  digital: 'ascii · phosphor',
};

const yrs = (it) => (it.years[0] === it.years[1] ? `${it.years[0]}` : `${it.years[0]}–${String(it.years[1]).slice(2)}`);
const f2 = (v) => v.toFixed(2).replace(/^0/, '');

/** Physical size from the 0–1 log scale axis (0 = 1 mm, 1 = 100 m). */
export function physicalSize(scale) {
  const m = 10 ** (scale * 5 - 3);
  if (m < 0.01) return `${Math.round(m * 1000)} mm`;
  if (m < 1) return `${Math.round(m * 100)} cm`;
  return `${m < 10 ? m.toFixed(1) : Math.round(m)} m`;
}

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
      return it.place.name;
    case 'digital':
      return `d ${f2(it.axes.digital)} · f ${f2(it.axes.finished)}`;
    default:
      return '';
  }
}

export { yrs };
