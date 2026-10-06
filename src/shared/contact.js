// Quiet contact pill for the top bar. Hover or focus runs a two-beat move
// (after uselayouts' Get In Touch): the label lifts away while a monogram and
// a handwritten "you" roll in, then they merge and "Let's talk" writes in.
// Clicking opens a small card with the ways to reach out.
import { site } from '../content.js';

const START_TO_END_MS = 460;

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const initials = (name) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
const bare = (href) => href.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

export function mountContact(parent) {
  const root = document.createElement('div');
  root.className = 'contact';

  const rows = [];
  if (site.email) {
    rows.push(
      `<li class="contact__row"><a href="mailto:${site.email}"><span class="contact__k">Email</span><span class="contact__v">${site.email}</span></a><button class="contact__copy" type="button" data-copy="${site.email}">Copy</button></li>`,
    );
  }
  for (const l of site.links) {
    rows.push(
      `<li class="contact__row"><a href="${l.href}" target="_blank" rel="noopener"><span class="contact__k">${l.label}</span><span class="contact__v">${bare(l.href)}</span><span class="contact__arrow" aria-hidden="true">↗</span></a></li>`,
    );
  }
  if (site.resume) {
    rows.push(
      `<li class="contact__row"><a href="${site.resume}" target="_blank" rel="noopener"><span class="contact__k">Résumé</span><span class="contact__v">PDF</span><span class="contact__arrow" aria-hidden="true">↗</span></a></li>`,
    );
  }

  root.innerHTML = `
    <button class="contact__btn" type="button" data-phase="idle" aria-expanded="false" aria-controls="contact-card" aria-label="Get in touch">
      <span class="contact__idle" aria-hidden="true">Get in touch</span>
      <span class="contact__live" aria-hidden="true">
        <span class="contact__cluster">
          <span class="contact__me">${initials(site.name)}</span>
          <span class="contact__plus">+</span>
          <span class="contact__you">you</span>
        </span>
        <span class="contact__talk">Let’s talk</span>
      </span>
    </button>
    <div class="contact__card" id="contact-card" role="dialog" aria-label="Contact ${site.name}" inert>
      <p class="contact__hello">Say hello<span>.</span></p>
      <p class="contact__lede">Projects, questions, collaborations. Always happy to talk shop.</p>
      <ul class="contact__list">${rows.join('')}</ul>
      ${
        site.draft && !site.email
          ? '<p class="contact__todo">Sample: add an email in <code>src/content.js</code> and it appears here.</p>'
          : ''
      }
    </div>`;
  parent.appendChild(root);

  const btn = root.querySelector('.contact__btn');
  const card = root.querySelector('.contact__card');

  // ── Two-beat hover / focus sequence ──
  let phase = 'idle';
  let timer = 0;
  let hovered = false;
  let focused = false;
  let open = false;
  const setPhase = (p) => {
    phase = p;
    btn.dataset.phase = p;
  };
  const start = () => {
    if (phase !== 'idle') return;
    clearTimeout(timer);
    if (reduced()) return setPhase('end');
    setPhase('start');
    timer = setTimeout(() => setPhase('end'), START_TO_END_MS);
  };
  const end = () => {
    if (hovered || focused || open) return;
    clearTimeout(timer);
    setPhase('idle');
  };
  btn.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch') return;
    hovered = true;
    start();
  });
  btn.addEventListener('pointerleave', () => {
    hovered = false;
    end();
  });
  btn.addEventListener('focus', () => {
    focused = true;
    start();
  });
  btn.addEventListener('blur', () => {
    focused = false;
    end();
  });

  // ── Card ──
  const setOpen = (v, { restoreFocus = false } = {}) => {
    open = v;
    root.classList.toggle('is-open', v);
    btn.setAttribute('aria-expanded', String(v));
    card.inert = !v;
    if (v) start();
    else {
      end();
      if (restoreFocus) btn.focus();
    }
  };
  btn.addEventListener('click', () => setOpen(!open));
  document.addEventListener('pointerdown', (e) => open && !root.contains(e.target) && setOpen(false));
  document.addEventListener('keydown', (e) => {
    if (open && e.key === 'Escape') setOpen(false, { restoreFocus: root.contains(document.activeElement) });
  });
  card.addEventListener('click', async (e) => {
    const copy = e.target.closest('[data-copy]');
    if (!copy) return;
    try {
      await navigator.clipboard.writeText(copy.dataset.copy);
      copy.textContent = 'Copied';
    } catch {
      copy.textContent = 'Copy failed';
    }
    setTimeout(() => (copy.textContent = 'Copy'), 1600);
  });

  return { el: root, open: () => setOpen(true), close: () => setOpen(false) };
}
