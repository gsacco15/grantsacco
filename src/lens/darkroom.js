// The darkroom: a film laid out as an endless contact sheet you can drag and
// scroll in any direction (after uselayouts' Infinite Canvas: a 3 × 3 wrap of
// one block, inertia, and a slight lean with speed). Every film sits in a side
// bar, plus "All films" mixed together, so you can switch without leaving;
// click a frame to enlarge it, arrow through, and Esc steps back out
// (frame → films → Art).
import { photo, photoAspect, drawInto } from './photos.js';
import { clamp } from '../anim.js';

const DPR = Math.min(2, window.devicePixelRatio || 1);
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad2 = (n) => String(n).padStart(2, '0');

function grainURL() {
  const c = document.createElement('canvas');
  c.width = c.height = 140;
  const g = c.getContext('2d');
  const img = g.createImageData(140, 140);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL();
}

export function createDarkroom({ albums, onClose }) {
  const TOTAL = albums.reduce((n, a) => n + a.count, 0);

  /** A film, or every film interleaved: { id, title, meta, frames: [{ a, i }] }. */
  function collection(id) {
    if (id === 'all') {
      const frames = [];
      const longest = Math.max(...albums.map((a) => a.count));
      for (let i = 0; i < longest; i++) for (const a of albums) if (i < a.count) frames.push({ a, i });
      return { id: 'all', title: 'All films', meta: `${albums.length} films · ${TOTAL} frames`, frames };
    }
    const a = albums.find((x) => x.id === id) ?? albums[0];
    return { id: a.id, title: a.title, meta: `${a.place} · ${a.year} · ${a.count} frames`, frames: Array.from({ length: a.count }, (_, i) => ({ a, i })) };
  }

  const root = document.createElement('div');
  root.className = 'dk';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Photo rolls');
  root.hidden = true;
  root.innerHTML = `
    <div class="dk__grain" aria-hidden="true"></div>
    <header class="dk__bar">
      <button class="dk__back" type="button"><span aria-hidden="true">←</span> Back to Art</button>
      <div class="dk__title"><span class="dk__roll"></span><span class="dk__meta"></span></div>
      <span class="dk__hint">Drag or scroll to wander · click a frame</span>
    </header>
    <nav class="dk__rolls" aria-label="Films">
      <span class="dk__label">Films</span>
      <ol><li><button type="button" data-roll="all">
            <canvas class="dk__thumb" width="${Math.round(56 * DPR)}" height="${Math.round(40 * DPR)}"></canvas>
            <span class="dk__rname">All films</span>
            <span class="dk__rcount">${TOTAL}</span>
            <span class="dk__rmeta">${albums.length} films, mixed</span>
          </button></li>${albums
        .map(
          (a) => `<li><button type="button" data-roll="${a.id}">
            <canvas class="dk__thumb" width="${Math.round(56 * DPR)}" height="${Math.round(40 * DPR)}"></canvas>
            <span class="dk__rname">${a.title}</span>
            <span class="dk__rcount">${a.count}</span>
            <span class="dk__rmeta">${a.place.split(',')[0]} · ${a.year}</span>
          </button></li>`,
        )
        .join('')}</ol>
    </nav>
    <section class="dk__canvas" tabindex="0" aria-label="Frames — drag, scroll or use the arrow keys">
      <div class="dk__matrix"></div>
    </section>
    <div class="dk__lb" hidden>
      <div class="dk__lb-scrim"></div>
      <figure class="dk__lb-fig"><canvas></canvas>
        <figcaption><span class="dk__lb-title"></span><span class="dk__lb-n"></span></figcaption>
      </figure>
      <button class="dk__lb-btn dk__lb-prev" type="button" aria-label="Previous frame">←</button>
      <button class="dk__lb-btn dk__lb-next" type="button" aria-label="Next frame">→</button>
      <button class="dk__lb-btn dk__lb-close" type="button" aria-label="Close frame">×</button>
    </div>`;
  document.body.appendChild(root);
  root.querySelector('.dk__grain').style.backgroundImage = `url(${grainURL()})`;

  const $ = (s) => root.querySelector(s);
  const canvasEl = $('.dk__canvas');
  const matrix = $('.dk__matrix');
  const lb = $('.dk__lb');
  const lbFig = $('.dk__lb-fig');
  const lbCanvas = lbFig.querySelector('canvas');
  const rollButtons = [...root.querySelectorAll('[data-roll]')];
  rollButtons.forEach((b) => {
    const c = b.querySelector('canvas');
    if (b.dataset.roll !== 'all') return drawInto(c, albums.find((a) => a.id === b.dataset.roll), 0);
    // "All films": a strip of three covers.
    const strip = document.createElement('canvas');
    strip.width = Math.ceil(c.width / 3);
    strip.height = c.height;
    albums.slice(0, 3).forEach((a, k) => {
      drawInto(strip, a, a.cover);
      c.getContext('2d').drawImage(strip, k * strip.width, 0);
    });
  });

  let col = null;
  let open = false;
  let lbIndex = -1;
  let lbFrom = null;
  let raf = 0;
  let returnTo = null;
  const pos = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  const vel = { x: 0, y: 0 };
  const block = { w: 0, h: 0 };
  const drag = { on: false, sx: 0, sy: 0, tx: 0, ty: 0, lx: 0, ly: 0, lt: 0, dist: 0 };

  /* ── Building a roll ──────────────────────────────────────────────────── */

  function build(collectionToShow, focus = 0) {
    col = collectionToShow;
    const { frames } = col;
    const vw = canvasEl.clientWidth;
    const vh = canvasEl.clientHeight;
    const m = innerWidth < 760;
    const cardW = m ? Math.round(innerWidth * 0.4) : Math.round(clamp(innerWidth * 0.13, 150, 230));
    const gap = Math.round(cardW * 0.2);
    const cellH = Math.round(cardW * 1.05) + 28;
    // One block holds the film (repeated if needed) and is at least a screen
    // in each direction, so the 3 × 3 wrap never shows an edge.
    const n = frames.length;
    const cols = Math.max(Math.ceil(Math.sqrt(n * 1.4)), Math.ceil((vw * 1.05) / (cardW + gap)));
    const rows = Math.max(Math.ceil(n / cols), Math.ceil((vh * 1.05) / (cellH + gap)));
    const cells = cols * rows;
    // The film reads in order first; any repeats that fill out the block are
    // offset row by row so the same frame never stacks in a column.
    const frameAt = (k) => (k < n ? k : (k + Math.floor(k / cols) * 3) % n);

    const blockHTML = (main) =>
      `<div class="dk__block"${main ? '' : ' aria-hidden="true"'} style="grid-template-columns:repeat(${cols}, ${cardW}px);gap:${gap}px;padding:${Math.round(gap / 2)}px">${Array.from(
        { length: cells },
        (_, k) => {
          const fi = frameAt(k);
          const { a, i } = frames[fi];
          const land = photoAspect(a, i) > 1;
          const w = land ? cardW : Math.round(cardW * 0.7);
          const h = land ? Math.round(cardW / 1.5) : Math.round(cardW * 1.05);
          const real = main && k < n;
          return `<button type="button" class="dk__card" data-k="${fi}"${real ? '' : ' tabindex="-1"'} style="height:${cellH}px" aria-label="${a.title}, frame ${i + 1} of ${a.count}">
            <span class="dk__img" style="width:${w}px;height:${h}px"><canvas width="${Math.round(w * DPR)}" height="${Math.round(h * DPR)}"></canvas></span>
            <span class="dk__cap"><b>${pad2(i + 1)}</b>${a.title}</span>
          </button>`;
        },
      ).join('')}</div>`;
    matrix.innerHTML = Array.from({ length: 9 }, (_, b) => blockHTML(b === 4)).join('');
    matrix.style.gridTemplateColumns = 'repeat(3, max-content)';
    for (const c of matrix.querySelectorAll('canvas')) {
      const { a, i } = frames[+c.closest('.dk__card').dataset.k];
      drawInto(c, a, i);
    }

    const main = matrix.children[4];
    block.w = main.offsetWidth;
    block.h = main.offsetHeight;
    // Start with the chosen frame in the middle of the screen.
    const card = main.querySelector(`.dk__card[data-k="${focus}"]`) ?? main.firstElementChild;
    const cx = block.w + card.offsetLeft + card.offsetWidth / 2;
    const cy = block.h + card.offsetTop + card.offsetHeight / 2;
    pos.x = target.x = vw / 2 - cx;
    pos.y = target.y = vh / 2 - cy;
    vel.x = vel.y = 0;
    apply();

    $('.dk__roll').textContent = col.title;
    $('.dk__meta').textContent = col.meta;
    rollButtons.forEach((b) => b.setAttribute('aria-current', String(b.dataset.roll === col.id)));
    const url = new URL(location.href);
    url.searchParams.set('roll', col.id);
    history.replaceState(null, '', url);
  }

  /* ── Motion ───────────────────────────────────────────────────────────── */

  function wrap() {
    const { w, h } = block;
    if (!w || !h) return;
    const shift = (axis, size) => {
      while (pos[axis] < -size * 1.75) {
        pos[axis] += size;
        target[axis] += size;
        drag[axis === 'x' ? 'tx' : 'ty'] += size;
      }
      while (pos[axis] > -size * 0.25) {
        pos[axis] -= size;
        target[axis] -= size;
        drag[axis === 'x' ? 'tx' : 'ty'] -= size;
      }
    };
    shift('x', w);
    shift('y', h);
  }

  function apply() {
    wrap();
    const still = reduced();
    const kx = still ? 0 : clamp(vel.x * 0.06, -2.2, 2.2);
    const ky = still ? 0 : clamp(vel.y * 0.06, -2.2, 2.2);
    matrix.style.transform = `translate3d(${pos.x.toFixed(2)}px, ${pos.y.toFixed(2)}px, 0) skew(${kx.toFixed(2)}deg, ${ky.toFixed(2)}deg)`;
  }

  function loop() {
    if (!open) {
      raf = 0;
      return;
    }
    if (!drag.on && (Math.abs(vel.x) > 0.01 || Math.abs(vel.y) > 0.01)) {
      vel.x *= 0.94;
      vel.y *= 0.94;
      target.x += vel.x;
      target.y += vel.y;
    }
    const k = reduced() ? 1 : drag.on ? 0.18 : 0.1;
    pos.x += (target.x - pos.x) * k;
    pos.y += (target.y - pos.y) * k;
    apply();
    raf = requestAnimationFrame(loop);
  }

  canvasEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    Object.assign(drag, { on: true, sx: e.clientX, sy: e.clientY, tx: target.x, ty: target.y, lx: e.clientX, ly: e.clientY, lt: performance.now(), dist: 0 });
    vel.x = vel.y = 0;
    canvasEl.setPointerCapture(e.pointerId);
    canvasEl.classList.add('is-dragging');
  });
  canvasEl.addEventListener('pointermove', (e) => {
    if (!drag.on) return;
    drag.dist += Math.hypot(e.movementX, e.movementY);
    const now = performance.now();
    const dt = Math.max(1, now - drag.lt);
    vel.x = vel.x * 0.25 + ((e.clientX - drag.lx) / dt) * 12 * 0.75;
    vel.y = vel.y * 0.25 + ((e.clientY - drag.ly) / dt) * 12 * 0.75;
    Object.assign(drag, { lx: e.clientX, ly: e.clientY, lt: now });
    target.x = drag.tx + (e.clientX - drag.sx) * 0.9;
    target.y = drag.ty + (e.clientY - drag.sy) * 0.9;
  });
  const endDrag = (e) => {
    if (!drag.on) return;
    drag.on = false;
    canvasEl.classList.remove('is-dragging');
    if (canvasEl.hasPointerCapture(e.pointerId)) canvasEl.releasePointerCapture(e.pointerId);
    if (drag.dist < 6 && e.type === 'pointerup') {
      const card = document.elementFromPoint(e.clientX, e.clientY)?.closest('.dk__card');
      if (card) openFrame(+card.dataset.k, card);
    }
  };
  canvasEl.addEventListener('pointerup', endDrag);
  canvasEl.addEventListener('pointercancel', endDrag);
  canvasEl.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const dx = -e.deltaX * 0.5;
      const dy = -e.deltaY * 0.5;
      vel.x = vel.x * 0.3 + dx * 0.7;
      vel.y = vel.y * 0.3 + dy * 0.7;
      target.x += dx;
      target.y += dy;
    },
    { passive: false },
  );
  // Keyboard: Enter on a focused frame opens it (pointer clicks go through pointerup).
  matrix.addEventListener('click', (e) => {
    const card = e.target.closest('.dk__card');
    if (card && e.detail === 0) openFrame(+card.dataset.k, card);
  });

  /* ── Enlarged frame ───────────────────────────────────────────────────── */

  function showFrame(k) {
    const n = col.frames.length;
    lbIndex = (k + n) % n;
    const { a, i } = col.frames[lbIndex];
    const aspect = photoAspect(a, i);
    const maxW = innerWidth * (innerWidth < 760 ? 0.92 : 0.74);
    const maxH = innerHeight * 0.72;
    const w = Math.min(maxW, maxH * aspect);
    const h = w / aspect;
    lbFig.style.width = `${w.toFixed(0)}px`;
    lbCanvas.style.height = `${h.toFixed(0)}px`;
    const src = photo(a, i, Math.min(2000, Math.round(w * DPR)));
    lbCanvas.width = src.width;
    lbCanvas.height = src.height;
    lbCanvas.getContext('2d').drawImage(src, 0, 0);
    $('.dk__lb-title').textContent = `${a.title} — ${a.place}, ${a.year}`;
    $('.dk__lb-n').textContent = `${pad2(i + 1)} / ${pad2(a.count)}`;
  }

  function openFrame(i, fromCard) {
    lbFrom = fromCard;
    lb.hidden = false;
    showFrame(i);
    lb.classList.add('is-in');
    $('.dk__lb-close').focus({ preventScroll: true });
    const img = fromCard?.querySelector('.dk__img');
    if (img && !reduced()) {
      const a = img.getBoundingClientRect();
      const b = lbCanvas.getBoundingClientRect();
      lbCanvas.animate(
        [{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width}, ${a.height / b.height})` }, { transform: 'none' }],
        { duration: 420, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' },
      );
    }
  }

  function closeFrame() {
    if (lb.hidden) return;
    lb.classList.remove('is-in');
    const back = lbFrom;
    setTimeout(() => (lb.hidden = true), reduced() ? 0 : 220);
    lbIndex = -1;
    back?.focus({ preventScroll: true });
  }

  function step(d) {
    showFrame(lbIndex + d);
    lbCanvas.animate([{ opacity: 0.25, transform: `translateX(${d * 18}px)` }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' });
  }

  $('.dk__lb-scrim').addEventListener('click', closeFrame);
  $('.dk__lb-close').addEventListener('click', closeFrame);
  $('.dk__lb-prev').addEventListener('click', () => step(-1));
  $('.dk__lb-next').addEventListener('click', () => step(1));

  /* ── Open, switch, close ──────────────────────────────────────────────── */

  /** Open film `id` (or 'all') centred on its frame `frame`. */
  function openRoll(id, frame = 0, from = null) {
    returnTo = from;
    const wasOpen = open;
    root.hidden = false;
    open = true;
    document.body.classList.add('dk-open');
    if (!wasOpen) {
      root.classList.remove('is-in');
      void root.offsetWidth;
      root.classList.add('is-in');
    }
    build(collection(id), id === 'all' ? 0 : frame);
    if (!raf) raf = requestAnimationFrame(loop);
    canvasEl.focus({ preventScroll: true });
  }

  function switchRoll(id) {
    if (col?.id === id) return;
    matrix.classList.add('is-swapping');
    setTimeout(
      () => {
        build(collection(id));
        matrix.classList.remove('is-swapping');
      },
      reduced() ? 0 : 180,
    );
  }

  function close() {
    if (!open) return;
    closeFrame();
    open = false;
    root.classList.remove('is-in');
    document.body.classList.remove('dk-open');
    setTimeout(() => {
      if (!open) {
        root.hidden = true;
        matrix.innerHTML = '';
      }
    }, reduced() ? 0 : 260);
    const url = new URL(location.href);
    url.searchParams.delete('roll');
    history.replaceState(null, '', url);
    const id = col?.id;
    onClose(id, returnTo);
  }

  rollButtons.forEach((b) => b.addEventListener('click', () => switchRoll(b.dataset.roll)));
  $('.dk__back').addEventListener('click', close);

  // While open, the darkroom owns the keyboard (section keys don't fire behind it).
  window.addEventListener(
    'keydown',
    (e) => {
      if (!open) return;
      e.stopPropagation();
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!lb.hidden) {
        if (e.key === 'Escape') closeFrame();
        else if (e.key === 'ArrowLeft') step(-1);
        else if (e.key === 'ArrowRight') step(1);
        else return;
        e.preventDefault();
        return;
      }
      if (e.key === 'Escape') close();
      else if (e.target.closest?.('.dk__rolls')) return;
      else if (e.key.startsWith('Arrow')) {
        const d = 160;
        if (e.key === 'ArrowLeft') target.x += d;
        if (e.key === 'ArrowRight') target.x -= d;
        if (e.key === 'ArrowUp') target.y += d;
        if (e.key === 'ArrowDown') target.y -= d;
      } else return;
      e.preventDefault();
    },
    true,
  );

  window.addEventListener('resize', () => {
    if (open && col) build(col, lbIndex >= 0 ? lbIndex : 0);
  });

  return { open: openRoll, close, isOpen: () => open };
}
