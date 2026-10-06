// MAKER (build) — the item as a build log: where it got to on the stage track,
// the steps it took (parsed from the item's own "A → B → C" text), and how long
// it was on the bench.
import './maker.css';
import { KIND, STAGES, YEAR_MAX, YEAR_MIN, cap, duration, el, esc, pad2, parseSteps, yearsText } from '../lib.js';

const SPAN = YEAR_MAX - YEAR_MIN + 1;

export default {
  id: 'build',
  persona: 'Maker',
  palette: {
    bg: '#1e1f21',
    ink: '#ece8e0',
    muted: '#8f8a82',
    line: 'rgb(236 232 224 / 0.13)',
    accent: '#ff6b1a',
    panel: 'rgb(30 31 33 / 0.78)',
  },

  mount(item, ctx) {
    const root = el('section', 'mk');
    const reached = STAGES.indexOf(item.stage);
    const parsed = parseSteps(item.lens.build);
    const steps = parsed ? parsed.steps : [item.lens.build.replace(/\.$/, '')];
    const remark = parsed?.remark ?? '';
    const yrs = duration(item.years);
    const left = ((item.years[0] - YEAR_MIN) / SPAN) * 100;
    const width = (yrs / SPAN) * 100;

    root.innerHTML = `
      <div class="tx-bleed mk-floor" aria-hidden="true"></div>
      <div class="tx-safe mk-wrap">
        <header class="mk-head">
          <p class="mk-kicker">Build log · No. ${pad2(ctx.index + 1)} · ${KIND[item.kind]}</p>
          <h1 class="mk-title">${esc(item.title)}</h1>
          <p class="mk-sub">${yearsText(item.years, ' → ')} · ${yrs} ${yrs === 1 ? 'year' : 'years'} on the bench</p>
        </header>

        <ol class="mk-track" style="--reached:${reached}" aria-label="Stage: ${item.stage}">
          ${STAGES.map(
            (s, i) => `<li class="${i < reached ? 'is-done' : i === reached ? 'is-now' : ''}" style="--i:${i}">
              <span class="mk-track__dot"></span><span class="mk-track__label">${s}</span>${i === reached ? '<span class="mk-track__now">Now</span>' : ''}
            </li>`,
          ).join('')}
          <span class="mk-track__rail" aria-hidden="true"><i></i></span>
        </ol>

        <ol class="mk-steps">
          ${steps
            .map(
              (s, i) => `<li style="--i:${i}">
                <span class="mk-steps__n">${pad2(i + 1)}</span>
                <span class="mk-steps__t">${esc(cap(s))}</span>
                <span class="mk-steps__punch" aria-hidden="true"></span>
              </li>`,
            )
            .join('')}
        </ol>
        ${remark ? `<p class="mk-remark">${esc(remark)}</p>` : ''}

        <div class="mk-time" aria-label="${yearsText(item.years)}">
          <div class="mk-time__axis"><span class="mk-time__bar" style="left:${left}%;width:${width}%"></span></div>
          <div class="mk-time__labels"><span>${YEAR_MIN}</span><span>${YEAR_MAX}</span></div>
        </div>
      </div>`;

    return {
      el: root,
      title: root.querySelector('.mk-title'),
      enter() {
        root.classList.add('is-in');
      },
    };
  },
};
