// The album and city cards, opened by a dot on the Travel map or a roll in Art instead of
// leaving the site:
// - a trip (a film): a pile of prints from the roll (the cover on top, details of it underneath,
//   fanning out on hover), its name, place, year and frame count, and "Open album".
//   Google Photos only opens from that button (or the pile).
// - a place lived: Grant's drawing of the city as one print, the years and why he was
//   there, and the work done while living there (each opens its project). The card is
//   the whole thing: no separate city page from the map.
import { drawInto } from './photos.js';

const PRINTS = 3;
const TILT = [-7, 5, 0]; // degrees, bottom of the pile → top

export function createTripCard({ parent, titleOf, onWork }) {
  const el = document.createElement('div');
  el.className = 'lx-trip';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.innerHTML = `
    <button class="lx-trip__close" type="button" aria-label="Close">×</button>
    <a class="lx-trip__pile" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">
      ${TILT.map((r, k) => `<span class="lx-trip__print" style="--r:${r}deg;--k:${k}"><canvas></canvas></span>`).join('')}
    </a>
    <span class="lx-trip__city" aria-hidden="true"><span class="lx-trip__print"><img alt="" /></span></span>
    <span class="lx-trip__title"></span>
    <span class="lx-trip__meta"></span>
    <span class="lx-trip__label">While living here</span>
    <span class="lx-trip__work"></span>
    <a class="lx-trip__open" target="_blank" rel="noopener">Open album <span aria-hidden="true">↗</span></a>`;
  parent.appendChild(el);
  const $ = (s) => el.querySelector(s);
  const canvases = [...el.querySelectorAll('.lx-trip__pile canvas')];
  let film = null;
  let home = null;
  let from = null;

  function paint() {
    if (!film) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvases.forEach((c, k) => {
      const w = c.parentElement.clientWidth || 180;
      c.width = Math.round(w * dpr);
      c.height = Math.round(w * 0.78 * dpr);
      // The cover on top; details of the roll under it.
      drawInto(c, film, k === PRINTS - 1 ? film.cover : (film.cover + k + 1) % film.count);
    });
  }
  // A real cover arrived after the card opened: repaint it.
  window.addEventListener('lx-film-photo', (e) => film && e.detail === film.id && paint());

  function place() {
    // Beside the dot or roll that opened it; centred when it came from elsewhere (a chip).
    const r = from?.isConnected ? from.getBoundingClientRect() : { left: innerWidth / 2, right: innerWidth / 2, top: innerHeight / 2, bottom: innerHeight / 2, height: 0 };
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const phone = innerWidth < 760;
    const bottom = innerHeight - (phone ? 120 : 110); // above the section switcher
    let x;
    let y;
    if (phone) {
      x = (innerWidth - w) / 2;
      y = r.bottom + 14 + h <= bottom ? r.bottom + 14 : r.top - 14 - h;
    } else {
      x = r.right + 16 + w <= innerWidth - 16 ? r.right + 16 : r.left - 16 - w;
      y = r.top + r.height / 2 - h / 2;
    }
    el.style.left = `${Math.round(Math.max(16, Math.min(innerWidth - w - 16, x)))}px`;
    el.style.top = `${Math.round(Math.max(72, Math.min(bottom - h, y)))}px`;
  }

  function show(anchor) {
    from = anchor;
    el.hidden = false;
    el.classList.remove('is-in');
    void el.offsetWidth;
    el.classList.add('is-in');
    place();
  }

  function open(f, anchor) {
    film = f;
    home = null;
    el.classList.remove('is-home');
    $('.lx-trip__title').textContent = f.title;
    $('.lx-trip__meta').textContent = `${f.place === f.title ? '' : `${f.place} · `}${f.year} · ${f.count} frames on 35mm`;
    el.setAttribute('aria-label', `${f.title}, ${f.place}, ${f.year}`);
    for (const a of el.querySelectorAll('a')) a.href = f.album;
    show(anchor);
    paint();
    $('.lx-trip__open').focus({ preventScroll: true });
  }

  function openHome(it, anchor) {
    film = null;
    home = it;
    el.classList.add('is-home');
    const img = $('.lx-trip__city img');
    img.src = it.home.img ?? '';
    $('.lx-trip__city').hidden = !it.home.img;
    $('.lx-trip__title').textContent = it.title;
    // Just the years: the companies and school follow as chips.
    $('.lx-trip__meta').textContent = (it.lens?.place ?? '').split(' · ')[0];
    const work = (it.related ?? []).filter((id) => titleOf(id));
    $('.lx-trip__label').hidden = !work.length;
    $('.lx-trip__work').innerHTML = work.map((id) => `<button type="button" class="lx-chip" data-id="${id}">${titleOf(id)}</button>`).join('');
    el.setAttribute('aria-label', `${it.title}: ${it.lens?.place ?? ''}`);
    show(anchor);
    // The drawing may still be loading: place the card again once it has its size.
    if (!img.complete) img.addEventListener('load', place, { once: true });
    ($('.lx-trip__work .lx-chip') ?? $('.lx-trip__close')).focus({ preventScroll: true });
  }

  function close({ refocus = false } = {}) {
    if (el.hidden) return;
    el.hidden = true;
    if (refocus) from?.focus({ preventScroll: true });
    film = null;
    home = null;
  }

  $('.lx-trip__close').addEventListener('click', () => close({ refocus: true }));
  $('.lx-trip__work').addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    close();
    onWork(b.dataset.id);
  });
  window.addEventListener('keydown', (e) => e.key === 'Escape' && !el.hidden && close({ refocus: true }));
  // A click anywhere else (the map, a drag, another dot) closes it.
  window.addEventListener('pointerdown', (e) => !el.hidden && !el.contains(e.target) && !from?.contains(e.target) && close(), true);
  window.addEventListener('resize', () => !el.hidden && place());

  return {
    open,
    openHome,
    close,
    toggle: (f, anchor) => (!el.hidden && film?.id === f.id ? close() : open(f, anchor)),
    toggleHome: (it, anchor) => (!el.hidden && home?.id === it.id ? close() : openHome(it, anchor)),
  };
}
