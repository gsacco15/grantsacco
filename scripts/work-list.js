// The plain list of all work at /work/: the same content as the interactive
// site, as static HTML, for a quick scan and for search engines. Rendered at
// build time (and in dev) by the `work-list` plugin in vite.config.js, from
// src/lens/artifacts.js and src/content.js, so it never drifts from the site.

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const NOW = 2026;

/** "2021–24", "2025 – now", "~2022–23" (as the site writes them). */
function years(it) {
  if (it.periods) return it.periods.map((p) => years({ ...it, periods: null, years: p.years })).join(', ');
  const [a, b] = it.years;
  const t = it.tbd ? '~' : '';
  if (a == null) return `until ${b}`;
  if (b >= NOW && !it.ended && it.kind !== 'app') return `${t}${a} – now`;
  return a === b ? `${t}${a}` : `${t}${a}–${String(b).slice(2)}`;
}

const SECTIONS = [
  { id: 'experience', title: 'Experience', mode: 'reality', pick: (a) => a.kind === 'role' || a.kind === 'education' },
  { id: 'engineering', title: 'Engineering', mode: 'structure', pick: (a) => a.main === 'structure' },
  { id: 'projects', title: 'Projects', mode: 'build', pick: (a) => a.main === 'build' },
  { id: 'digital', title: 'Digital', mode: 'digital', pick: (a) => a.main === 'digital' },
  { id: 'art', title: 'Art & photography', mode: 'image', pick: (a) => a.main === 'image' && !a.film },
];

function item(a, mode) {
  const meta = [a.org, a.place?.name, years(a)].filter(Boolean).map(esc).join(' · ');
  const facts = (a.facts ?? []).map((f) => `<li>${esc(f)}</li>`).join('');
  const links = (a.links ?? []).map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`);
  return `
      <article class="w-item" id="${esc(a.id)}">
        <h3><a href="../?p=${encodeURIComponent(a.id)}#${a.main ?? mode}">${esc(a.title)}</a></h3>
        <p class="w-meta">${meta}</p>
        ${a.summary ? `<p>${esc(a.summary)}</p>` : ''}
        ${facts ? `<ul>${facts}</ul>` : ''}
        ${links.length ? `<p class="w-links">${links.join('')}</p>` : ''}
      </article>`;
}

export function renderWorkList({ artifacts, films, homes, countries, intro }, { site }) {
  const shown = artifacts.filter((a) => a.featured === 'yes' || a.featured === 'maybe');
  const byStart = (x, y) => (y.years[1] ?? 0) - (x.years[1] ?? 0) || (y.years[0] ?? 0) - (x.years[0] ?? 0);
  const sections = SECTIONS.map((s) => {
    const list = shown.filter((a) => !a.home && s.pick(a)).filter((a) => s.id !== 'experience' || a.featured === 'yes');
    const main = list.filter((a) => a.featured === 'yes').sort(byStart);
    const more = list.filter((a) => a.featured === 'maybe').sort(byStart);
    if (!main.length && !more.length) return '';
    return `
    <section class="w-section" id="${s.id}" aria-labelledby="${s.id}-h">
      <h2 id="${s.id}-h">${s.title}</h2>${main.map((a) => item(a, s.mode)).join('')}
      ${more.length ? `<details class="w-more"><summary>+ ${more.length} more</summary>${more.map((a) => item(a, s.mode)).join('')}</details>` : ''}
    </section>`;
  }).join('');

  const filmList = [...films]
    .sort((a, b) => b.year - a.year)
    .map((f) => `<li><a href="${esc(f.album ?? `../?roll=${f.id}`)}"${f.album ? ' target="_blank" rel="noopener"' : ''}>${esc(f.title)}</a> <span class="w-meta">${esc(f.place)} · ${f.year} · ${f.count} frames</span></li>`)
    .join('');
  const places = homes.map((h) => `${esc(h.name)}${h.years[0] ? ` ${h.years[0]}` : ''}`).join(' → ');
  const linkedin = site.links.find((l) => l.label === 'LinkedIn');

  return `
  <header class="w-head">
    <p class="w-back"><a href="../">← Interactive site</a></p>
    <h1>${esc(site.name)}</h1>
    <p class="w-role">Mechanical engineer · Project manager · Austin, TX</p>
    ${intro.lines.map((l) => `<p>${esc(l)}</p>`).join('')}
    ${intro.personal ? `<p class="w-personal">${esc(intro.personal)}</p>` : ''}
    <p class="w-contact">
      ${site.email ? `<a href="mailto:${esc(site.email)}">${esc(site.email)}</a>` : ''}
      ${linkedin ? `<a href="${esc(linkedin.href)}" target="_blank" rel="noopener">LinkedIn ↗</a>` : ''}
      ${site.resume ? `<a href="../${esc(site.resume)}" target="_blank" rel="noopener">Résumé (PDF) ↗</a>` : ''}
    </p>
    <nav class="w-nav" aria-label="Sections">${SECTIONS.map((s) => `<a href="#${s.id}">${s.title}</a>`).join('')}<a href="#films">Films</a><a href="#places">Places</a></nav>
  </header>
  <main>${sections}
    <section class="w-section" id="films" aria-labelledby="films-h">
      <h2 id="films-h">35mm films</h2>
      <ul class="w-films">${filmList}</ul>
    </section>
    <section class="w-section" id="places" aria-labelledby="places-h">
      <h2 id="places-h">Places</h2>
      <p>${places}</p>
      <p class="w-meta">${countries.length} countries visited</p>
    </section>
  </main>
  <footer class="w-foot"><a href="../">See it all in the interactive site →</a></footer>`;
}
