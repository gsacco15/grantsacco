// The shared element: the item title flies from where it sat in the old form to
// where it sits in the new one, re-typesetting on the way (a cross-fade between
// two clones that travel together). Interruption-safe: a new flight starts from
// wherever the current clones are on screen.

const PROPS = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'fontVariant',
  'fontFeatureSettings',
  'letterSpacing',
  'wordSpacing',
  'lineHeight',
  'textTransform',
  'textAlign',
  'textShadow',
  'textWrap',
  'whiteSpace',
  'color',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
];

const EASING = 'cubic-bezier(0.65, 0, 0.35, 1)';

export function createFlight(k) {
  const layer = document.createElement('div');
  layer.className = 'tx-flight';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  let flyers = [];
  let token = 0;

  function clone(src) {
    const rect = src.getBoundingClientRect();
    const cs = getComputedStyle(src);
    const node = document.createElement('div');
    node.className = 'tx-flyer';
    node.textContent = src.textContent;
    for (const p of PROPS) node.style[p] = cs[p];
    node.style.left = `${rect.left}px`;
    node.style.top = `${rect.top}px`;
    node.style.width = `${rect.width}px`;
    layer.appendChild(node);
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
    return { node, rect, lh, op: 1, tf: 'none' };
  }

  // Transform that places flyer f (laid out at f.rect) onto a target rect.
  const mapTo = (f, rect, lh) =>
    `translate(${rect.left - f.rect.left}px, ${rect.top - f.rect.top}px) scale(${lh / f.lh})`;

  const visible = (r) => r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;

  function fly(fromTitle, toTitle) {
    const my = ++token;
    const dur = 1250 * k;

    // 1. Where does the title currently appear?
    let src = null;
    if (flyers.length) {
      for (const f of flyers) {
        const cs = getComputedStyle(f.node);
        f.op = parseFloat(cs.opacity);
        f.tf = cs.transform;
      }
      let best = flyers[0];
      for (const f of flyers) {
        f.node.getAnimations().forEach((a) => a.cancel());
        f.node.style.opacity = f.op;
        f.node.style.transform = f.tf;
        if (f.op > best.op) best = f;
      }
      const scale = best.tf === 'none' ? 1 : new DOMMatrixReadOnly(best.tf).a;
      src = { rect: best.node.getBoundingClientRect(), lh: best.lh * scale };
    } else if (fromTitle?.isConnected) {
      const f = clone(fromTitle);
      fromTitle.style.visibility = 'hidden';
      if (visible(f.rect)) {
        flyers.push(f);
        src = { rect: f.rect, lh: f.lh };
      } else f.node.remove();
    }

    // 2. The destination clone, laid out exactly where the new title sits.
    toTitle.style.visibility = 'hidden';
    const dest = clone(toTitle);

    for (const f of flyers) {
      f.node.animate({ transform: [f.tf, mapTo(f, dest.rect, dest.lh)] }, { duration: dur, easing: EASING, fill: 'forwards' });
      f.node.animate([{ opacity: f.op }, { opacity: 0, offset: 0.5 }, { opacity: 0 }], { duration: dur, fill: 'forwards' });
    }

    const from = src ? mapTo(dest, src.rect, src.lh) : 'translate(0px, 18px) scale(1)';
    dest.node.animate({ transform: [from, 'translate(0px, 0px) scale(1)'] }, { duration: dur, easing: EASING, fill: 'forwards' });
    const fade = dest.node.animate(
      src
        ? [{ opacity: 0 }, { opacity: 0, offset: 0.22 }, { opacity: 1, offset: 0.68 }, { opacity: 1 }]
        : [{ opacity: 0 }, { opacity: 1, offset: 0.8 }, { opacity: 1 }],
      { duration: dur, fill: 'forwards' },
    );
    flyers.push(dest);

    // 3. Land: hand back to the real title (identical rendering, so no pop).
    fade.finished
      .then(() => {
        if (my !== token) return;
        toTitle.style.visibility = '';
        flyers.forEach((f) => f.node.remove());
        flyers = [];
      })
      .catch(() => {});
  }

  return { fly };
}
