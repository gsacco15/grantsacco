// PERSON (reality / about) — the item as a story: a large pull-quote in his own
// words, set like an editorial page, with a handwritten margin note and the
// item's place on a simple life line.
import './person.css';
import { items } from '../../content.js';
import { KIND, STAGES, YEAR_MAX, YEAR_MIN, cap, el, esc, itemById, pad2, splitLines, yearsText } from '../lib.js';

const ASIDE = {
  idea: 'just an idea — for now',
  sketch: 'still sketching…',
  prototype: 'still a prototype. on purpose.',
  built: 'built it ✓',
  shipped: 'shipped ✓',
};

const SPAN = YEAR_MAX - YEAR_MIN + 1;
const xOf = (year) => (year - YEAR_MIN + 0.5) / SPAN;

export default {
  id: 'reality',
  persona: 'Person',
  palette: {
    bg: '#f1ebdf',
    ink: '#2a2420',
    muted: '#8a7e70',
    line: 'rgb(42 36 32 / 0.16)',
    accent: '#b4532a',
    panel: 'rgb(255 252 245 / 0.72)',
  },

  mount(item, ctx) {
    const root = el('section', 'pp');
    const see = itemById.get(item.related[0]);

    // Life line: every item at its start year, stacked when years collide.
    const levels = {};
    const dots = items
      .map((it) => {
        const l = (levels[it.years[0]] = (levels[it.years[0]] ?? -1) + 1);
        const cur = it.id === item.id ? ' is-current' : '';
        return `<button type="button" class="pp-dot${cur}" data-id="${it.id}" style="--x:${xOf(it.years[0])};--l:${l}"
          aria-label="${esc(it.title)}, ${it.years[0]}" title="${esc(it.title)} — ${it.years[0]}"></button>`;
      })
      .join('');
    const years = Array.from({ length: SPAN }, (_, i) => YEAR_MIN + i)
      .map((y) => `<span class="${y >= item.years[0] && y <= item.years[1] ? 'is-on' : ''}" style="--x:${xOf(y)}">${String(y).slice(2)}</span>`)
      .join('');
    const spanL = (item.years[0] - YEAR_MIN) / SPAN;
    const spanW = (item.years[1] - item.years[0] + 1) / SPAN;

    root.innerHTML = `
      <div class="tx-bleed pp-paper" aria-hidden="true"></div>
      <div class="tx-safe pp-grid">
        <aside class="pp-meta">
          <p class="pp-no">No. ${pad2(ctx.index + 1)} <span>of ${ctx.total}</span></p>
          <p class="pp-years">${item.years[0]}${item.years[1] !== item.years[0] ? `<span>–</span>${item.years[1]}` : ''}</p>
          <dl>
            <div><dt>Kind</dt><dd>${KIND[item.kind]}</dd></div>
            <div><dt>Where</dt><dd>${esc(item.place.name)}</dd></div>
            <div><dt>Stage</dt><dd>${cap(item.stage)}</dd></div>
          </dl>
        </aside>
        <article class="pp-main">
          <p class="pp-kicker">In his own words</p>
          <h1 class="pp-title">${esc(item.title)}</h1>
          <blockquote class="pp-quote">
            <span class="pp-mark" aria-hidden="true">“</span>
            <p class="pp-q">${esc(item.lens.reality)}</p>
            <svg class="pp-under" aria-hidden="true"><path pathLength="1"/></svg>
          </blockquote>
        </article>
        <aside class="pp-hand" aria-label="Margin note">
          <svg class="pp-arrow" viewBox="0 0 150 70" aria-hidden="true">
            <path pathLength="1" d="M140 62 C 110 66, 60 58, 14 16" />
            <path pathLength="1" d="M14 16 L 17 33 M14 16 L 30 21" />
          </svg>
          <p>${yearsText(item.years, ' – ')}, ${ASIDE[item.stage]}</p>
          ${see ? `<button type="button" data-id="${see.id}">see also → ${esc(see.title)}</button>` : ''}
        </aside>
        <div class="pp-life">
          <p class="pp-life__label">On the life line <span>${YEAR_MIN}–${YEAR_MAX}</span></p>
          <div class="pp-life__axis">
            <span class="pp-life__span" style="left:${spanL * 100}%;width:${spanW * 100}%"></span>
            ${dots}
          </div>
          <div class="pp-life__years" aria-hidden="true">${years}</div>
        </div>
      </div>`;

    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-id]');
      if (b) ctx.go(b.dataset.id);
    });

    const quote = root.querySelector('.pp-q');
    const under = root.querySelector('.pp-under');

    // Hand-drawn underline beneath the last line of the quote. Measured from
    // layout (offsets), not boxes: the lines are still translated down pre-reveal.
    function underline() {
      const lines = quote.querySelectorAll('.ln__in');
      const last = lines[lines.length - 1];
      if (!last) return;
      const ln = last.parentElement;
      const range = document.createRange();
      range.selectNodeContents(last);
      const textW = range.getBoundingClientRect().width;
      const w = Math.max(40, textW * 0.92);
      const x = ln.offsetLeft + textW * 0.04;
      const y = ln.offsetTop + ln.offsetHeight - 4;
      under.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:14px`;
      under.firstElementChild.setAttribute(
        'd',
        `M2 8 C ${w * 0.25} 4, ${w * 0.5} 11, ${w * 0.72} 6 S ${w - 8} 4, ${w - 2} 7`,
      );
    }

    return {
      el: root,
      title: root.querySelector('.pp-title'),
      attached() {
        splitLines(quote);
        underline();
      },
      enter() {
        root.classList.add('is-in');
      },
      resize() {
        quote.textContent = item.lens.reality;
        splitLines(quote);
        underline();
      },
    };
  },
};
