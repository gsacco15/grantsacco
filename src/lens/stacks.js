// Photo rolls on Art's plot, as piles of prints. Hover fans the pile out from
// one hand-held corner (after uselayouts' Polaroid Stack) and skims the roll:
// moving across the pile flips the top print through every frame. Click opens
// the film straight into the darkroom. The render line deals the piles onto
// the plot as it passes, and picks them up again on the way out.
import { drawInto } from './photos.js';
import { clamp, mulberry32, hashString } from '../anim.js';

const CARDS = 5;
const FAN = [-21, -11, 10, 20, 0]; // degrees, bottom of the pile → top
const DPR = Math.min(2, window.devicePixelRatio || 1);

const shortYear = (y) => `’${String(y).slice(2)}`;
const shortPlace = (p) => p.split(',')[0];

export function createStacks({ albums, parent, onOpen }) {
  const wall = document.createElement('div');
  wall.className = 'pk-wall';
  wall.setAttribute('role', 'list');
  wall.setAttribute('aria-label', 'Films');
  parent.appendChild(wall);

  const stacks = albums.map((a, ai) => {
    const rnd = mulberry32(hashString(a.id));
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'pk';
    el.setAttribute('role', 'listitem');
    el.setAttribute('aria-label', `${a.title} — ${a.place}, ${a.year}. ${a.count} photos. Open film`);
    el.style.setProperty('--d', `${ai * 70}ms`);
    // Bottom of the pile first; the last card is the one on top.
    const frames = [3, 2, 1, 4, a.cover].map((k) => k % a.count);
    el.innerHTML = `
      <span class="pk__pile">
        ${frames
          .map((_, k) => {
            const top = k === CARDS - 1;
            const r = top ? (rnd() - 0.5) * 4 : (rnd() - 0.5) * 16;
            const dx = top ? 0 : (rnd() - 0.5) * 10;
            const dy = top ? 0 : (rnd() - 0.5) * 6;
            return `<span class="pk__card${top ? ' pk__card--top' : ''}" style="--r:${r.toFixed(1)}deg;--dx:${dx.toFixed(1)}px;--dy:${dy.toFixed(1)}px;--fan:${FAN[k]}deg;--k:${k}">
              <span class="pk__photo"><canvas></canvas></span>
              <span class="pk__foot">${top ? `<span class="pk__hand">${shortPlace(a.place)} ${shortYear(a.year)}</span><span class="pk__n">${a.count}</span>` : ''}</span>
            </span>`;
          })
          .join('')}
      </span>
      <span class="pk__skim" aria-hidden="true"><span></span></span>
      <span class="pk__cap"><span class="pk__title">${a.title}</span><span class="pk__meta">${shortPlace(a.place)} · ${a.year}</span></span>`;
    wall.appendChild(el);
    const cards = [...el.querySelectorAll('.pk__card')];
    const s = {
      a,
      el,
      cards,
      frames,
      top: cards[CARDS - 1].querySelector('canvas'),
      count: el.querySelector('.pk__n'),
      skimBar: el.querySelector('.pk__skim span'),
      frame: a.cover,
      inn: false,
      size: 0,
      cx: 0,
    };

    const skimTo = (i) => {
      if (i === s.frame) return;
      s.frame = i;
      drawInto(s.top, a, i);
      s.count.textContent = `${String(i + 1).padStart(2, '0')}/${a.count}`;
      s.skimBar.style.left = `${((i / Math.max(1, a.count - 1)) * 100).toFixed(1)}%`;
    };
    const reset = () => {
      skimTo(a.cover);
      s.count.textContent = String(a.count);
    };
    el.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'touch') el.classList.add('is-fanned');
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const r = el.getBoundingClientRect();
      skimTo(Math.min(a.count - 1, Math.floor(clamp((e.clientX - r.left) / r.width) * a.count)));
    });
    el.addEventListener('pointerleave', () => {
      el.classList.remove('is-fanned');
      reset();
    });
    el.addEventListener('focus', () => el.matches(':focus-visible') && el.classList.add('is-fanned'));
    el.addEventListener('blur', () => {
      el.classList.remove('is-fanned');
      reset();
    });
    el.addEventListener('click', () => onOpen(a, s.frame, el));
    return s;
  });

  function paintCards(s) {
    const pw = Math.round(s.size * 0.9 * DPR);
    s.cards.forEach((card, k) => {
      const c = card.querySelector('canvas');
      c.width = pw;
      c.height = Math.round(pw * 1.04);
      drawInto(c, s.a, k === CARDS - 1 ? s.frame : s.frames[k]);
    });
  }

  /** Place every pile at its spot on the Art plot ({ stacks: [{ id, x, y, capAlign }], card }). */
  function layout({ stacks: spots, card }) {
    for (const s of stacks) {
      const p = spots.find((q) => q.id === s.a.id);
      if (!p) continue;
      s.cx = p.x;
      const resized = Math.abs(s.size - card) > 0.5;
      s.size = card;
      s.el.style.setProperty('--w', `${card.toFixed(1)}px`);
      s.el.style.transform = `translate(${(p.x - card / 2).toFixed(1)}px, ${(p.y - card * 0.65).toFixed(1)}px)`;
      s.el.classList.toggle('cap-end', p.capAlign === 'end');
      if (resized) paintCards(s);
    }
  }

  /** Deal piles in as the line passes them (entering), or pick them up (leaving). */
  function sweep(X, dir, done, entering, leaving) {
    if (!entering && !leaving) return;
    wall.classList.toggle('is-live', entering);
    for (const s of stacks) {
      const passed = done || (dir > 0 ? X > s.cx : X < s.cx);
      if (!passed) continue;
      if (entering && !s.inn) {
        s.inn = true;
        s.el.classList.add('is-in');
        s.el.tabIndex = 0;
      } else if (leaving && s.inn) {
        s.inn = false;
        s.el.classList.remove('is-in', 'is-fanned');
        s.el.tabIndex = -1;
      }
    }
  }

  // Warm every roll's frames at print size so skimming never stutters.
  function warm() {
    const queue = stacks.flatMap((s) => Array.from({ length: s.a.count }, (_, i) => [s, i]));
    const scratch = document.createElement('canvas');
    const step = () => {
      const until = performance.now() + 8;
      while (queue.length && performance.now() < until) {
        const [s, i] = queue.shift();
        if (!s.size) continue;
        scratch.width = s.top.width;
        scratch.height = s.top.height;
        drawInto(scratch, s.a, i);
      }
      if (queue.length) setTimeout(step, 40);
    };
    setTimeout(step, 400);
  }

  stacks.forEach((s) => (s.el.tabIndex = -1));
  return {
    layout,
    sweep,
    warm,
    el: wall,
    focus: (id) => stacks.find((s) => s.a.id === id)?.el.focus({ preventScroll: true }),
  };
}
