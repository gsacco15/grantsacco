// Project picker: "‹ 04 / 17  Automated assembly cell ▾ ›" with an index of
// every item. The lens stays put; only the subject changes.
import { KIND, el, esc, pad2, yearsText } from './lib.js';

export function createPicker({ items, onPick }) {
  const root = el('div', 'tx-picker');
  root.innerHTML = `
    <button class="tx-picker__step" type="button" data-step="-1" aria-label="Previous project" title="Previous project  [">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5"/></svg>
    </button>
    <button class="tx-picker__cur" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="tx-index">
      <span class="tx-picker__n"></span>
      <span class="tx-picker__t"></span>
      <svg class="tx-picker__caret" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>
    </button>
    <button class="tx-picker__step" type="button" data-step="1" aria-label="Next project" title="Next project  ]">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg>
    </button>
    <div class="tx-index" id="tx-index" role="dialog" aria-label="All projects">
      <div class="tx-index__head"><span>Index — ${items.length} projects</span><span>same lens, new subject</span></div>
      <ol class="tx-index__list">
        ${items
          .map(
            (it, i) => `<li><button type="button" data-id="${it.id}">
              <span class="tx-index__n">${pad2(i + 1)}</span>
              <span class="tx-index__t">${esc(it.title)}</span>
              <span class="tx-index__k">${KIND[it.kind]}</span>
              <span class="tx-index__y">${yearsText(it.years)}</span>
            </button></li>`,
          )
          .join('')}
      </ol>
    </div>`;

  const cur = root.querySelector('.tx-picker__cur');
  const num = root.querySelector('.tx-picker__n');
  const title = root.querySelector('.tx-picker__t');
  const index = root.querySelector('.tx-index');
  index.inert = true;
  let current = null;

  const open = (state) => {
    root.classList.toggle('is-open', state);
    cur.setAttribute('aria-expanded', String(state));
    index.inert = !state;
    if (state) index.querySelector('[aria-current="true"]')?.focus({ preventScroll: true });
  };

  const step = (d) => {
    const i = items.findIndex((it) => it.id === current);
    onPick(items[(i + d + items.length) % items.length].id);
  };

  cur.addEventListener('click', () => open(!root.classList.contains('is-open')));
  root.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => step(+b.dataset.step)));
  index.addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    open(false);
    onPick(b.dataset.id);
    cur.focus({ preventScroll: true });
  });
  document.addEventListener('pointerdown', (e) => {
    if (root.classList.contains('is-open') && !root.contains(e.target)) open(false);
  });
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Escape' && root.classList.contains('is-open')) {
      open(false);
      cur.focus({ preventScroll: true });
    } else if (e.key === '[') step(-1);
    else if (e.key === ']') step(1);
  });

  function set(id) {
    const i = items.findIndex((it) => it.id === id);
    const changed = current !== null && current !== id;
    current = id;
    num.textContent = `${pad2(i + 1)} / ${items.length}`;
    title.textContent = items[i].title;
    cur.setAttribute('aria-label', `Project ${i + 1} of ${items.length}: ${items[i].title}. Show all projects`);
    index.querySelectorAll('[data-id]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.id === id)));
    if (changed) {
      title.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], {
        duration: 500,
        easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
      });
    }
  }

  return { el: root, set, step };
}
