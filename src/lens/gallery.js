// Photos on a project page. A project with `photos` ([{ src, alt, caption }])
// gets a Photos button under its hero; it lays the photos over the hero (the
// picture or the 3D model) one at a time: ‹ › buttons, the arrow keys or a
// swipe step through them, Escape or the button again goes back. Photos show
// as they are (no section render), never larger than 1.6× their own size.

const MAX_SCALE = 1.6;

/** Build the viewer inside `frame`; `button` is the toggle under the hero. */
export function createGallery(frame, button) {
  const box = document.createElement('div');
  box.className = 'lx-gallery';
  box.hidden = true;
  box.innerHTML = `
    <img class="lx-gallery__img" alt="" />
    <button class="lx-gallery__nav lx-gallery__nav--prev" type="button" aria-label="Previous photo">‹</button>
    <button class="lx-gallery__nav lx-gallery__nav--next" type="button" aria-label="Next photo">›</button>
    <div class="lx-gallery__bar"><span class="lx-gallery__count"></span><span class="lx-gallery__cap"></span></div>`;
  frame.appendChild(box);
  const img = box.querySelector('img');
  const count = box.querySelector('.lx-gallery__count');
  const cap = box.querySelector('.lx-gallery__cap');
  let photos = [];
  let at = 0;
  let isOpen = false;

  function fit() {
    if (!img.naturalWidth) return;
    // Leave room for the arrows and the caption bar.
    const w = frame.clientWidth - 112;
    const h = frame.clientHeight - 64;
    const s = Math.min(w / img.naturalWidth, h / img.naturalHeight, MAX_SCALE);
    img.style.width = `${Math.round(img.naturalWidth * s)}px`;
    img.style.height = `${Math.round(img.naturalHeight * s)}px`;
  }
  img.addEventListener('load', fit);
  new ResizeObserver(() => isOpen && fit()).observe(frame);

  function showPhoto(i) {
    at = (i + photos.length) % photos.length;
    const p = photos[at];
    img.src = p.src;
    img.alt = p.alt ?? '';
    count.textContent = `${at + 1} / ${photos.length}`;
    cap.textContent = p.caption ?? '';
    box.classList.toggle('is-single', photos.length < 2);
  }

  function setOpen(on) {
    isOpen = on && photos.length > 0;
    box.hidden = !isOpen;
    frame.classList.toggle('has-photos-open', isOpen);
    button.setAttribute('aria-pressed', String(isOpen));
    if (isOpen) showPhoto(at);
  }

  button.addEventListener('click', () => setOpen(!isOpen));
  box.querySelector('.lx-gallery__nav--prev').addEventListener('click', () => showPhoto(at - 1));
  box.querySelector('.lx-gallery__nav--next').addEventListener('click', () => showPhoto(at + 1));

  // Swipe sideways to step.
  let down = null;
  box.addEventListener('pointerdown', (e) => (down = e.clientX));
  box.addEventListener('pointerup', (e) => {
    if (down == null) return;
    const dx = e.clientX - down;
    down = null;
    if (Math.abs(dx) > 40) showPhoto(at + (dx < 0 ? 1 : -1));
  });

  // While open, the arrow keys step photos (not sections) and Escape closes the photos (not the page).
  window.addEventListener(
    'keydown',
    (e) => {
      if (!isOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!['ArrowLeft', 'ArrowRight', 'Escape'].includes(e.key)) return;
      e.stopPropagation();
      e.preventDefault();
      if (e.key === 'Escape') setOpen(false);
      else showPhoto(at + (e.key === 'ArrowRight' ? 1 : -1));
    },
    true,
  );

  return {
    /** A new project's photos (closes the viewer). */
    set(list = []) {
      photos = list;
      at = 0;
      setOpen(false);
      button.hidden = !photos.length;
      button.textContent = `Photos · ${photos.length}`;
      // Warm them so stepping is instant.
      for (const p of photos) new Image().src = p.src;
    },
    close: () => setOpen(false),
    get open() {
      return isOpen;
    },
  };
}
