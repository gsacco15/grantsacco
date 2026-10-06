// The project page. Opening a tile flies its picture into a large hero; the
// section tabs keep working, so switching section re-renders the hero (the
// same render line passes over it) and translates the text: an engineer's
// spec, a build stage, a place, a set of links. Notes are a light layer of
// handwritten annotations on the picture that can be toggled.
import { items, modes } from '../content.js';
import { systems, STAGES } from '../coordinates/systems.js';
import { loadLand, landPath } from '../shared/geo.js';
import { clamp } from '../anim.js';
import { render, ASPECT } from './render.js';
import { RENDER, physicalSize, yrs } from './meta.js';

const byId = new Map(items.map((it) => [it.id, it]));
const MODE_IDS = modes.map((m) => m.id);
const DPR = Math.min(2, window.devicePixelRatio || 1);
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// The page shows every mode at 3:2 except the film still, which letterboxes.
const heroAspect = (mode) => (mode === 'image' ? ASPECT.image : 1.5);

const KIND = { engineering: 'Engineering', project: 'Project', art: 'Art', travel: 'Travel', app: 'App', life: 'Life' };
const SEEN = { reality: 'a person', structure: 'an engineer', build: 'a maker', image: 'an artist', place: 'a traveller', digital: 'a system' };

const bar = (v) => `<span class="lx-bar"><span style="width:${Math.round(v * 100)}%"></span></span><span class="lx-num">${v.toFixed(2).replace(/^0/, '')}</span>`;

function facts(it, mode) {
  const rows = [];
  const row = (k, v) => rows.push(`<div><dt>${k}</dt><dd>${v}</dd></div>`);
  switch (mode) {
    case 'reality':
      row('When', yrs(it));
      row('Where', it.place.name);
      row('What', KIND[it.kind]);
      break;
    case 'structure':
      row('Size', `≈ ${physicalSize(it.axes.scale)}`);
      row('Complexity', bar(it.axes.complexity));
      row('Discipline', KIND[it.kind]);
      break;
    case 'build': {
      const at = STAGES.indexOf(it.stage);
      row('Stage', `<span class="lx-stages">${STAGES.map((s, i) => `<span class="${i <= at ? 'is-done' : ''} ${i === at ? 'is-now' : ''}">${s}</span>`).join('')}</span>`);
      row('Started', String(it.years[0]));
      row('Last touched', String(it.years[1]));
      break;
    }
    case 'image':
      row('Expressive', bar(it.axes.expressive));
      row('Experimental', bar(it.axes.experimental));
      row('Year', yrs(it));
      break;
    case 'place': {
      const { lat, lon, name } = it.place;
      row('Place', name);
      row('Coordinates', `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`);
      row('Map', `<svg class="lx-mini" viewBox="0 0 360 180" data-lat="${lat}" data-lon="${lon}"></svg>`);
      break;
    }
    case 'digital':
      row('Digital', bar(it.axes.digital));
      row('Finished', bar(it.axes.finished));
      row('Links', `${(it.related ?? []).length} connected`);
      break;
  }
  return rows.join('');
}

/** Three handwritten notes on the hero, worded for the section. */
function notes(it, mode) {
  const size = physicalSize(it.axes.scale);
  const n = {
    reality: [`${yrs(it)}`, it.place.name, 'me, mostly'],
    structure: [`≈ ${size} overall`, `complexity ${it.axes.complexity.toFixed(2)}`, 'datum A'],
    build: [`stage: ${it.stage}`, `started ${it.years[0]}`, 'v1 → v2'],
    image: ['the light, here', `${Math.round(it.axes.expressive * 100)}% expressive`, 'crop 2.39 : 1'],
    place: [it.place.name, `${it.place.lat.toFixed(1)}°, ${it.place.lon.toFixed(1)}°`, 'been here'],
    digital: [`${(it.related ?? []).length} links`, `d = ${it.axes.digital.toFixed(2)}`, 'live'],
  };
  return n[mode];
}

export function createPage({ getMode, onNavigate, onClose }) {
  const root = document.createElement('section');
  root.className = 'lx-page';
  root.setAttribute('aria-label', 'Project');
  root.hidden = true;
  root.innerHTML = `
    <div class="lx-page__scrim"></div>
    <div class="lx-page__scrim lx-page__scrim--old"></div>
    <div class="lx-page__inner">
      <button class="lx-page__back" type="button"><span aria-hidden="true">←</span> All work</button>
      <figure class="lx-page__hero">
        <div class="lx-page__frame">
          <canvas></canvas><canvas></canvas>
          <div class="lx-notes" aria-hidden="true">
            <svg class="lx-notes__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path class="lx-notes__dim" d="M6 92 H94 M6 89 V95 M94 89 V95" />
              <path class="lx-notes__arrow" d="M16 14 C 24 18, 30 26, 34 34" />
              <path class="lx-notes__arrow" d="M86 70 C 80 66, 74 62, 68 58" />
            </svg>
            <span class="lx-note lx-note--dim"></span>
            <span class="lx-note lx-note--a"></span>
            <span class="lx-note lx-note--b"></span>
          </div>
        </div>
        <figcaption class="lx-page__cap">
          <span class="lx-page__render"></span>
          <button class="lx-page__notes" type="button" aria-pressed="true">Notes</button>
        </figcaption>
        <nav class="lx-page__pager" aria-label="Projects">
          <button type="button" data-step="-1">← <span></span></button>
          <button type="button" data-step="1"><span></span> →</button>
        </nav>
      </figure>
      <div class="lx-page__text">
        <span class="lx-page__kicker"></span>
        <h2 class="lx-page__title"></h2>
        <p class="lx-page__line"></p>
        <dl class="lx-page__facts"></dl>
        <div class="lx-page__seen">
          <span class="lx-page__label">The same project, seen as…</span>
          <ol class="lx-page__lenses"></ol>
        </div>
        <div class="lx-page__related"></div>
      </div>
    </div>`;
  document.body.appendChild(root);

  const $ = (s) => root.querySelector(s);
  const frameEl = $('.lx-page__frame');
  const pics = [...frameEl.querySelectorAll('canvas')];
  const textEl = $('.lx-page__text');
  const heroEl = $('.lx-page__hero');
  const backEl = $('.lx-page__back');
  const scrim = $('.lx-page__scrim');
  const scrimOld = $('.lx-page__scrim--old');
  const el = {
    kicker: $('.lx-page__kicker'),
    title: $('.lx-page__title'),
    line: $('.lx-page__line'),
    facts: $('.lx-page__facts'),
    lenses: $('.lx-page__lenses'),
    related: $('.lx-page__related'),
    render: $('.lx-page__render'),
    notesBtn: $('.lx-page__notes'),
    noteDim: $('.lx-note--dim'),
    noteA: $('.lx-note--a'),
    noteB: $('.lx-note--b'),
    prev: $('[data-step="-1"] span'),
    next: $('[data-step="1"] span'),
  };

  let id = null;
  let open = false;
  let show = 0;
  let nextIdx = 1;
  let reveal = 1;
  let pendingMode = null; // hero render waiting to be revealed
  let textTarget = null; // section the text should switch to when the line passes
  let textMode = null;
  let shownMode = null; // section the page fully shows
  let regions = null; // which parts already took the incoming palette
  let switcher = null;
  let land = null;
  loadLand().then((l) => {
    land = l;
    drawMini();
  });

  const heroPx = () => Math.min(1800, Math.round(frameEl.clientWidth * DPR));

  function paint(idx, mode) {
    const src = render(id, mode, heroPx(), heroAspect(mode));
    const c = pics[idx];
    c.width = src.width;
    c.height = Math.round(src.width / 1.5);
    const g = c.getContext('2d');
    // The film still letterboxes inside the 3:2 frame.
    g.fillStyle = '#000';
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(src, 0, Math.round((c.height - src.height) / 2));
    c.dataset.mode = mode;
  }

  const VARS = ['--bg', '--ink', '--muted', '--accent', '--line'];
  function setVars(node, mode) {
    const p = systems[mode].palette;
    const n = parseInt(p.ink.slice(1), 16);
    const vals = [p.bg, p.ink, p.muted, p.accent, `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / 0.14)`];
    VARS.forEach((v, i) => node.style.setProperty(v, vals[i]));
  }
  const clearVars = (node) => VARS.forEach((v) => node.style.removeProperty(v));

  function fillText(mode) {
    textMode = mode;
    const it = byId.get(id);
    const md = modes.find((m) => m.id === mode);
    el.kicker.textContent = `${md.section} · seen as ${SEEN[mode]}`;
    el.title.textContent = it.title;
    el.line.textContent = it.lens[mode];
    el.facts.innerHTML = facts(it, mode);
    el.lenses.innerHTML = MODE_IDS.map(
      (m) =>
        `<li class="${m === mode ? 'is-current' : ''}"><button type="button" data-mode="${m}"><span class="lx-lens__who">${modes.find((x) => x.id === m).section}</span><span class="lx-lens__line">${it.lens[m]}</span></button></li>`,
    ).join('');
    const rel = (it.related ?? []).map((r) => byId.get(r)).filter(Boolean);
    el.related.innerHTML = rel.length
      ? `<span class="lx-page__label">Related</span>${rel.map((r) => `<button type="button" class="lx-chip" data-id="${r.id}">${r.title}</button>`).join('')}`
      : '';
    el.render.textContent = `render · ${RENDER[mode]}`;
    const [a, b, c] = notes(it, mode);
    el.noteDim.textContent = a;
    el.noteA.textContent = b;
    el.noteB.textContent = c;
    frameEl.dataset.mode = mode;
    drawMini();
  }

  function drawMini() {
    const svg = root.querySelector('.lx-mini');
    if (!svg || !land) return;
    const lat = +svg.dataset.lat;
    const lon = +svg.dataset.lon;
    const pj = (lo, la) => [lo + 180, 90 - la];
    const [x, y] = pj(lon, lat);
    svg.innerHTML = `<path d="${landPath(land, pj)}" class="lx-mini__land"/><circle cx="${x}" cy="${y}" r="9" class="lx-mini__ring"/><circle cx="${x}" cy="${y}" r="3.5" class="lx-mini__dot"/>`;
  }

  function fillPager() {
    const i = items.findIndex((x) => x.id === id);
    el.prev.textContent = items[(i - 1 + items.length) % items.length].title;
    el.next.textContent = items[(i + 1) % items.length].title;
  }

  /** Open `pid`. `fromEl` is the tile frame to fly out of (optional). */
  function openPage(pid, fromEl) {
    const mode = getMode();
    const switching = open;
    id = pid;
    root.hidden = false;
    document.body.classList.add('lx-page-open');
    open = true;
    show = 0;
    nextIdx = 1;
    reveal = 1;
    pendingMode = null;
    textTarget = null;
    shownMode = mode;
    endSweep();
    pics[1].style.clipPath = 'inset(0 100% 0 0)';
    pics[0].style.clipPath = 'none';
    pics.forEach((c, i) => {
      c.style.visibility = 'visible';
      c.style.zIndex = String(i + 1);
    });
    paint(0, mode);
    fillText(mode);
    fillPager();
    const url = new URL(location.href);
    url.searchParams.set('p', pid);
    history.replaceState(null, '', url);
    if (!switching) {
      root.classList.remove('is-in');
      void root.offsetWidth;
      root.classList.add('is-in');
      fly(fromEl, frameEl, false);
      $('.lx-page__back').focus({ preventScroll: true });
    } else {
      textEl.classList.remove('is-swap');
      void textEl.offsetWidth;
      textEl.classList.add('is-swap');
    }
    root.querySelector('.lx-page__inner').scrollTop = 0;
    warmHero();
  }

  function closePage() {
    if (!open) return;
    const pid = id;
    open = false;
    const tile = document.querySelector(`.lx-tile[data-id="${pid}"] .lx-tile__frame`);
    root.classList.remove('is-in');
    root.classList.add('is-out');
    fly(frameEl, tile, true);
    const done = () => {
      root.classList.remove('is-out');
      if (!open) {
        root.hidden = true;
        document.body.classList.remove('lx-page-open');
      }
    };
    setTimeout(done, reduced() ? 0 : 420);
    const url = new URL(location.href);
    url.searchParams.delete('p');
    history.replaceState(null, '', url);
    onClose(pid);
  }

  // A copy of the picture travels between the tile and the hero.
  function fly(fromEl, toEl, closing) {
    if (!fromEl || !toEl || reduced()) return;
    const a = fromEl.getBoundingClientRect();
    const b = toEl.getBoundingClientRect();
    if (!a.width || !b.width) return;
    const ghost = document.createElement('canvas');
    const src = pics[show];
    ghost.width = src.width;
    ghost.height = src.height;
    ghost.getContext('2d').drawImage(src, 0, 0);
    ghost.className = 'lx-fly';
    const [start, end] = closing ? [b, a] : [a, b];
    Object.assign(ghost.style, { left: `${end.left}px`, top: `${end.top}px`, width: `${end.width}px`, height: `${end.height}px` });
    document.body.appendChild(ghost);
    const dx = start.left - end.left;
    const dy = start.top - end.top;
    const sx = start.width / end.width;
    const sy = start.height / end.height;
    if (!closing) frameEl.classList.add('is-flying');
    const anim = ghost.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 1 },
        { transform: 'none', opacity: closing ? 0.6 : 1 },
      ],
      { duration: closing ? 380 : 560, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' },
    );
    anim.onfinish = () => {
      ghost.remove();
      frameEl.classList.remove('is-flying');
    };
  }

  // Pre-render the other sections' heroes so switching is instant.
  let warmTimer = 0;
  function warmHero() {
    clearTimeout(warmTimer);
    const queue = MODE_IDS.filter((m) => m !== getMode());
    const step = () => {
      if (!open || !queue.length) return;
      const m = queue.shift();
      render(id, m, heroPx(), heroAspect(m));
      warmTimer = setTimeout(step, 60);
    };
    warmTimer = setTimeout(step, 700);
  }

  /** Section changed: queue a re-render that the sweep will reveal. */
  function setMode(mode) {
    if (!open || !id) return;
    if (reveal >= 0.5 && pendingMode) {
      show = nextIdx;
      pics[show].style.clipPath = 'none';
    }
    const from = textMode ?? shownMode;
    nextIdx = show === 0 ? 1 : 0;
    paint(nextIdx, mode);
    pics[nextIdx].style.clipPath = 'inset(0 100% 0 0)';
    pics[nextIdx].style.zIndex = '2';
    pics[show].style.zIndex = '1';
    pics[nextIdx].style.visibility = 'visible';
    pendingMode = mode;
    textTarget = mode;
    reveal = 0;
    // Each part of the page keeps the outgoing palette until the line reaches it.
    regions = { hero: false, text: false, back: false };
    for (const n of [heroEl, textEl, backEl]) setVars(n, from);
    scrim.style.background = systems[mode].palette.bg;
    scrimOld.style.background = systems[from].palette.bg;
    scrimOld.style.display = 'block';
  }

  function endSweep() {
    regions = null;
    for (const n of [heroEl, textEl, backEl]) clearVars(n);
    scrim.style.background = '';
    scrimOld.style.display = 'none';
  }

  /** Called every frame of a sweep with the line's x position. */
  function sweep(X, dir, done) {
    if (!open || !textTarget) return;
    const passed = (r) => done || (dir > 0 ? X > r : X < r);
    const box = (n) => n.getBoundingClientRect();
    scrimOld.style.clipPath = dir > 0 ? `inset(0 0 0 ${X.toFixed(1)}px)` : `inset(0 ${(innerWidth - X).toFixed(1)}px 0 0)`;

    if (pendingMode) {
      const r = box(frameEl);
      const f = done ? 1 : clamp(dir > 0 ? (X - r.left) / r.width : (r.right - X) / r.width);
      reveal = Math.max(reveal, f);
      const p = ((1 - reveal) * 100).toFixed(2);
      pics[nextIdx].style.clipPath = reveal >= 1 ? 'none' : dir > 0 ? `inset(0 ${p}% 0 0)` : `inset(0 0 0 ${p}%)`;
      if (reveal >= 1) {
        pics[show].style.zIndex = '0';
        pics[show].style.visibility = 'hidden';
        show = nextIdx;
        pendingMode = null;
      }
    }
    const hr = box(heroEl);
    if (!regions.hero && passed(hr.left + hr.width / 2)) {
      regions.hero = true;
      setVars(heroEl, textTarget);
      frameEl.dataset.mode = textTarget;
      el.render.textContent = `render · ${RENDER[textTarget]}`;
      const [a, b, c] = notes(byId.get(id), textTarget);
      el.noteDim.textContent = a;
      el.noteA.textContent = b;
      el.noteB.textContent = c;
    }
    const br = box(backEl);
    if (!regions.back && passed(br.left + br.width / 2)) {
      regions.back = true;
      setVars(backEl, textTarget);
    }
    const tr = box(textEl);
    if (!regions.text && passed(dir > 0 ? tr.left : tr.right)) {
      regions.text = true;
      setVars(textEl, textTarget);
      fillText(textTarget);
      textEl.classList.remove('is-swap');
      void textEl.offsetWidth;
      textEl.classList.add('is-swap');
    }
    if (done) {
      shownMode = textTarget;
      textTarget = null;
      endSweep();
    }
  }

  $('.lx-page__back').addEventListener('click', closePage);
  $('.lx-page__scrim').addEventListener('click', closePage);
  el.notesBtn.addEventListener('click', () => {
    const on = el.notesBtn.getAttribute('aria-pressed') !== 'true';
    el.notesBtn.setAttribute('aria-pressed', String(on));
    frameEl.classList.toggle('notes-off', !on);
  });
  root.addEventListener('click', (e) => {
    const lens = e.target.closest('[data-mode]');
    if (lens && switcher) switcher.set(lens.dataset.mode);
    const chip = e.target.closest('.lx-chip');
    if (chip) onNavigate(chip.dataset.id);
    const step = e.target.closest('[data-step]');
    if (step) {
      const i = items.findIndex((x) => x.id === id);
      onNavigate(items[(i + +step.dataset.step + items.length) % items.length].id);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (open && e.key === 'Escape' && !document.querySelector('.contact.is-open')) closePage();
  });

  return {
    open: openPage,
    close: closePage,
    setMode,
    sweep,
    bindSwitcher: (s) => (switcher = s),
    isOpen: () => open,
  };
}
