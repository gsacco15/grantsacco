// Concept 05 — Translation.
// One project at a time, "seen as" six different people. Each lens re-renders the
// same item in a completely different form (drawing, build log, print, map,
// story, data). The title is the one thing that survives: it flies between forms.
import '../shared/base.css';
import './style.css';
import { mountChrome, mountSwitcher, prefersReducedMotion } from '../shared/chrome.js';
import { items, modes } from '../content.js';
import { FORMS, ORDER } from './forms/index.js';
import { el, indexOf, itemById, pad2 } from './lib.js';
import { createPicker } from './picker.js';
import { createFlight } from './flight.js';

const body = document.body;
const k = prefersReducedMotion() ? 0.25 : 1; // time multiplier for every animation
body.style.setProperty('--k', String(k));

mountChrome('translation');

const layer = el('main', 'tx-layer');
body.appendChild(layer);
const flight = createFlight(k);

const query = new URLSearchParams(location.search).get('item');
const state = { lens: null, item: itemById.has(query) ? query : 'cell', inst: null };

const picker = createPicker({ items, onPick: goItem });
body.appendChild(picker.el);

// "translated: ENGINEER → ARTIST"
const indicator = el(
  'div',
  'tx-trans',
  '<span class="tx-trans__k"></span><span class="tx-trans__from"></span><span class="tx-trans__rail" aria-hidden="true"><i></i></span><span class="tx-trans__to"></span>',
);
indicator.setAttribute('role', 'status');
body.appendChild(indicator);
let dimTimer;

function indicate(label, from, to) {
  const [kEl, fromEl, , toEl] = indicator.children;
  kEl.textContent = label;
  fromEl.textContent = from;
  toEl.textContent = to;
  indicator.classList.toggle('has-from', Boolean(from));
  indicator.classList.add('is-live');
  const rail = indicator.querySelector('i');
  rail.getAnimations().forEach((a) => a.cancel());
  rail.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
    duration: 1400 * k,
    easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
    fill: 'forwards',
  });
  clearTimeout(dimTimer);
  dimTimer = setTimeout(() => indicator.classList.remove('is-live'), 3400 * k);
}

function syncUrl() {
  const url = new URL(location.href);
  url.searchParams.set('item', state.item);
  history.replaceState(null, '', `${url.pathname}${url.search}${location.hash}`);
}

function retire(inst, handoff) {
  inst.el.classList.add('is-leaving');
  inst.el.classList.toggle('is-handoff', handoff);
  inst.el.inert = true;
  inst.leave?.();
  setTimeout(() => {
    inst.destroy?.();
    inst.el.remove();
  }, 900 * k + 200);
}

/** Mount the current (lens, item) pair and retire whatever was there. */
function render() {
  const def = FORMS[state.lens];
  const item = itemById.get(state.item);
  const prev = state.inst;
  const same = Boolean(prev) && prev.def === def;
  const handoff = same ? (prev.handoff?.() ?? null) : null;

  body.dataset.form = def.id;
  for (const [key, value] of Object.entries(def.palette)) {
    if (key !== 'title') body.style.setProperty(`--${key}`, value);
  }

  const inst = def.mount(item, { k, handoff, soft: same, go: goItem, index: indexOf(item.id), total: items.length });
  inst.def = def;
  inst.el.classList.add('tx-form');
  inst.el.setAttribute('aria-label', `${item.title}, seen as ${def.persona}`);
  inst.title.classList.add('tx-title');
  inst.title.style.color = def.palette.title ?? def.palette.ink;
  layer.appendChild(inst.el);
  inst.attached?.();

  flight.fly(prev?.title, inst.title);
  if (prev) retire(prev, Boolean(handoff));
  state.inst = inst;
  requestAnimationFrame(() => requestAnimationFrame(() => inst.el.isConnected && inst.enter()));
}

function goItem(id) {
  if (id === state.item || !itemById.has(id)) return;
  const from = indexOf(state.item);
  state.item = id;
  picker.set(id);
  syncUrl();
  render();
  indicate(`as ${FORMS[state.lens].persona}`, `No. ${pad2(from + 1)}`, `No. ${pad2(indexOf(id) + 1)}`);
}

async function boot() {
  // Line-splitting and the title flight measure text, so wait for the fonts.
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);
  picker.set(state.item);
  syncUrl();

  const switcher = mountSwitcher({
    label: 'See as',
    initial: 'structure',
    items: ORDER.map((id) => ({
      id,
      label: FORMS[id].persona,
      sub: modes.find((m) => m.id === id).section.toLowerCase(),
    })),
    onChange(id, prevId) {
      state.lens = id;
      render();
      if (prevId) indicate('translated', FORMS[prevId].persona, FORMS[id].persona);
      else indicate('seen as', '', FORMS[id].persona);
    },
  });
  const caption = el('span', 'tx-seeas', 'See as');
  caption.setAttribute('aria-hidden', 'true');
  switcher.el.prepend(caption);

  // Palette transitions only after the first paint, so the page doesn't fade in from grey.
  requestAnimationFrame(() => requestAnimationFrame(() => body.classList.add('tx-ready')));

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => state.inst?.resize?.(), 160);
  });
}

boot();
