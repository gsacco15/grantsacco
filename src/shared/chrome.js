// Shared chrome for every concept mock: identity, concept navigation, a short
// note explaining what the mock demonstrates, and the section switcher.
import { site } from '../content.js';
import { concepts } from './concepts.js';

const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

export function mountChrome(conceptId) {
  const i = concepts.findIndex((c) => c.id === conceptId);
  const c = concepts[i];
  const prev = concepts[(i + concepts.length - 1) % concepts.length];
  const next = concepts[(i + 1) % concepts.length];

  const bar = el('header', 'chrome');
  bar.innerHTML = `
    <div class="chrome__id">
      <a class="chrome__name" href="../">${site.name}</a>
      <span class="chrome__concept">Concept ${String(i + 1).padStart(2, '0')} — ${c.name}</span>
      ${site.draft ? '<span class="chrome__draft">Sample content</span>' : ''}
    </div>
    <nav class="chrome__nav" aria-label="Concepts">
      <a href="../${prev.id}/" title="Previous concept: ${prev.name}" aria-label="Previous concept: ${prev.name}">←</a>
      <a href="../" title="All concepts"><span class="chrome__all-label">All concepts</span><span aria-hidden="true">&nbsp;▦</span></a>
      <a href="../${next.id}/" title="Next concept: ${next.name}" aria-label="Next concept: ${next.name}">→</a>
    </nav>`;
  document.body.appendChild(bar);

  // Collapsed by default: the one-liner is enough; the detail is a click away.
  const note = el('aside', 'note is-collapsed');
  note.innerHTML = `<strong>${c.line}</strong><p>${c.detail}</p><button class="note__toggle" type="button">What is this?</button>`;
  const toggle = note.querySelector('.note__toggle');
  toggle.addEventListener('click', () => {
    const collapsed = note.classList.toggle('is-collapsed');
    toggle.textContent = collapsed ? 'What is this?' : 'Hide note';
  });
  document.body.appendChild(note);

  document.title = `${c.name} — ${site.name}`;
  return { bar, note, concept: c };
}

/**
 * Section switcher. `items` = [{ id, label, sub }]. Calls onChange(id, prevId)
 * on every change (including the initial one). Number keys 1–n and ←/→ switch;
 * the current id is mirrored in the URL hash so states are linkable.
 */
export function mountSwitcher({ items, initial, onChange, label = 'Sections', parent = document.body }) {
  const nav = el('nav', 'switcher');
  nav.setAttribute('aria-label', label);
  const buttons = items.map((it, i) => {
    const b = el('button', 'switcher__btn');
    b.type = 'button';
    b.dataset.id = it.id;
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `<span class="switcher__key">${String(i + 1).padStart(2, '0')}</span><span class="switcher__label">${it.label}</span>${
      it.sub ? `<span class="switcher__sub">${it.sub}</span>` : ''
    }`;
    b.addEventListener('click', () => set(it.id));
    nav.appendChild(b);
    return b;
  });
  parent.appendChild(nav);

  let current = null;
  function set(id, { silent = false, fromHash = false } = {}) {
    if (!items.some((it) => it.id === id) || id === current) return;
    const prevId = current;
    current = id;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
    const active = buttons.find((b) => b.dataset.id === id);
    active?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    if (!fromHash) history.replaceState(null, '', `#${id}`);
    if (!silent) onChange(id, prevId);
  }

  const step = (d) => {
    const i = items.findIndex((it) => it.id === current);
    set(items[(i + d + items.length) % items.length].id);
  };

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable]')) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= items.length) set(items[n - 1].id);
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
  });

  window.addEventListener('hashchange', () => set(location.hash.slice(1), { fromHash: true }));

  const fromHash = location.hash.slice(1);
  set(items.some((it) => it.id === fromHash) ? fromHash : initial ?? items[0].id);

  return { set, step, get: () => current, el: nav };
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
