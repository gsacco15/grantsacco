// ENGINEER (structure) — the item as a technical drawing sheet. The drawing is
// generated per item (drawing.js); the title block is real HTML laid over the
// sheet so the title can fly in and out of it.
import './engineer.css';
import { drawing, VB, TB } from './drawing.js';
import { KIND, el, esc, pad2, sentences, yearsText } from '../lib.js';

let uid = 0;
const pct = (v, of) => `${((v / of) * 100).toFixed(3)}%`;

export default {
  id: 'structure',
  persona: 'Engineer',
  palette: {
    bg: '#e9ece9',
    ink: '#18212b',
    muted: '#66717c',
    line: 'rgb(24 33 43 / 0.15)',
    accent: '#d2382b',
    panel: 'rgb(250 251 250 / 0.75)',
  },

  mount(item, ctx) {
    const d = drawing(item, `d${uid++}`);
    const root = el('section', 'eg');
    const { x, y, w, h } = TB;
    const ra = y + 58;
    const rb = y + 102;
    const c1 = x + 168;
    const c2 = c1 + 84;
    const c3 = c2 + 84;
    const cell = (cx, cy, cw, chh, k, v, cls = '') =>
      `<div class="eg-cell ${cls}" style="left:${pct(cx, VB.w)};top:${pct(cy, VB.h)};width:${pct(cw, VB.w)};height:${pct(chh, VB.h)}"><span>${k}</span><b>${v}</b></div>`;
    const notes = sentences(item.lens.structure);

    root.innerHTML = `
      <div class="tx-safe eg-wrap">
        <div class="eg-sheet">
          <svg class="eg-svg" viewBox="0 0 ${VB.w} ${VB.h}" aria-hidden="true">${d.svg}</svg>
          <div class="eg-tb">
            <div class="eg-cell eg-cell--title" style="left:${pct(x, VB.w)};top:${pct(y, VB.h)};width:${pct(w, VB.w)};height:${pct(58, VB.h)}">
              <span>Title</span><h1 class="eg-title">${esc(item.title)}</h1>
            </div>
            ${cell(x, ra, 168, 44, 'Drawn', 'G. Sacco')}
            ${cell(c1, ra, 84, 44, 'Scale', d.scale)}
            ${cell(c2, ra, 84, 44, 'Rev', d.rev, 'is-red')}
            ${cell(c3, ra, 84, 44, 'Sheet', `${pad2(ctx.index + 1)}/${ctx.total}`)}
            ${cell(x, rb, 168, 48, 'Dwg no.', d.dwg)}
            ${cell(c1, rb, 84, 48, 'Date', yearsText(item.years))}
            ${cell(c2, rb, 168, 48, 'Kind', KIND[item.kind])}
          </div>
        </div>
        <aside class="eg-notes">
          <p class="eg-notes__h">Notes</p>
          <ol>
            ${notes.map((n) => `<li>${esc(n)}.</li>`).join('')}
            <li>All dimensions in mm unless stated.</li>
            <li>Break sharp edges 0.5 × 45°.</li>
          </ol>
          <p class="eg-notes__h">Revision</p>
          <p class="eg-rev"><b>${d.rev}</b> ${esc(item.stage)} · ${item.years[1]}</p>
        </aside>
      </div>`;

    return {
      el: root,
      title: root.querySelector('.eg-title'),
      enter() {
        root.classList.add('is-in');
      },
    };
  },
};
