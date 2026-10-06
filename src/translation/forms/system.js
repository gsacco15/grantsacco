// SYSTEM (digital) — the item as live data: a typed-in record with the axes as
// little bars, and a graph of what it links to. Clicking a node navigates —
// moving through the work by its data.
import './system.css';
import { KIND, el, esc, itemById, pad2 } from '../lib.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const str = (s) => `<span class="sy-s">"${esc(s)}"</span>`;
const num = (n) => `<span class="sy-n">${n}</span>`;
const key = (k) => `<span class="sy-k">${k}</span>`;
const bar = (v) => `<span class="sy-bar" style="--v:${v}"><i></i></span>`;

function record(item) {
  const lines = [];
  const L = (indent, html) => {
    const i = lines.length;
    lines.push(`<span class="sy-ln" data-n="${pad2(i + 1)}" style="--i:${i};--in:${indent}">${html}</span>`);
  };
  L(0, '{');
  L(1, `${key('id')}: ${str(item.id)},`);
  L(1, `${key('kind')}: ${str(item.kind)},`);
  L(1, `${key('years')}: [${num(item.years[0])}, ${num(item.years[1])}],`);
  L(1, `${key('stage')}: ${str(item.stage)},`);
  L(1, `${key('place')}: { ${key('lat')}: ${num(item.place.lat.toFixed(2))}, ${key('lon')}: ${num(item.place.lon.toFixed(2))} },`);
  L(1, `${key('axes')}: {`);
  for (const [k, v] of Object.entries(item.axes)) L(2, `${key(k.padEnd(12, ' '))}: ${num(v.toFixed(2))}, ${bar(v)}`);
  L(1, '},');
  L(1, `${key('digital')}: ${str(item.lens.digital)},`);
  L(1, `${key('related')}: [${(item.related ?? []).map(str).join(', ')}]`);
  L(0, '}');
  return lines;
}

export default {
  id: 'digital',
  persona: 'System',
  palette: {
    bg: '#040706',
    ink: '#c9f7df',
    muted: '#5f8f76',
    line: 'rgb(201 247 223 / 0.13)',
    accent: '#5cf2b0',
    panel: 'rgb(4 7 6 / 0.8)',
  },

  mount(item, ctx) {
    const root = el('section', 'sy');
    const lines = record(item);
    const related = (item.related ?? []).map((id) => itemById.get(id)).filter(Boolean);
    // Second-degree links, faint, so the graph has some context.
    const second = [...new Set(related.flatMap((r) => r.related ?? []))].filter((id) => id !== item.id && !item.related?.includes(id)).map((id) => itemById.get(id)).filter(Boolean).slice(0, 6);

    root.innerHTML = `
      <div class="tx-bleed sy-grid" aria-hidden="true"></div>
      <div class="tx-safe sy-wrap">
        <div class="sy-code">
          <p class="sy-path">~/work/${pad2(ctx.index + 1)}-${esc(item.id)}.json <span>${KIND[item.kind].toLowerCase()} · ${lines.length} lines</span></p>
          <h1 class="sy-title">${esc(item.title)}</h1>
          <pre class="sy-pre">${lines.join('\n')}</pre>
        </div>
        <div class="sy-graph">
          <svg class="sy-links" aria-hidden="true"></svg>
          <div class="sy-nodes"></div>
          <p class="sy-hint">Click a node to follow the link →</p>
        </div>
      </div>`;

    // Graph layout: subject in the middle, related on a ring, second degree outside.
    const graph = root.querySelector('.sy-graph');
    const nodesEl = root.querySelector('.sy-nodes');
    const links = root.querySelector('.sy-links');
    const nodes = [{ it: item, r: 0, a: 0, cls: 'is-main' }];
    related.forEach((it, i) => nodes.push({ it, r: 0.3, a: (i / related.length) * Math.PI * 2 - Math.PI / 2, cls: 'is-rel' }));
    second.forEach((it, i) => nodes.push({ it, r: 0.44, a: (i / Math.max(1, second.length)) * Math.PI * 2 - Math.PI / 2 + 0.4, cls: 'is-far' }));
    nodes.forEach((n, i) => {
      const b = el('button', `sy-node ${n.cls}`, `<b>${esc(n.it.id)}</b><small>${esc(n.it.title)}</small>`);
      b.type = 'button';
      b.style.setProperty('--i', i);
      if (n.it !== item) b.addEventListener('click', () => ctx.go(n.it.id));
      else b.tabIndex = -1;
      nodesEl.appendChild(b);
      n.el = b;
    });
    const edges = [];
    for (const n of nodes.slice(1)) {
      const from = n.cls === 'is-rel' ? nodes[0] : nodes.find((m) => m.cls === 'is-rel' && (m.it.related ?? []).includes(n.it.id)) ?? nodes[0];
      const line = document.createElementNS(SVGNS, 'line');
      line.setAttribute('class', n.cls);
      line.style.setProperty('--i', edges.length);
      links.appendChild(line);
      edges.push({ a: from, b: n, line });
    }

    function layout() {
      const r = graph.getBoundingClientRect();
      const s = Math.min(r.width, r.height);
      const cx = r.width / 2;
      const cy = r.height / 2;
      for (const n of nodes) {
        n.x = cx + Math.cos(n.a) * n.r * s * 1.25;
        n.y = cy + Math.sin(n.a) * n.r * s;
        n.el.style.left = `${n.x}px`;
        n.el.style.top = `${n.y}px`;
      }
      for (const e of edges) {
        e.line.setAttribute('x1', e.a.x);
        e.line.setAttribute('y1', e.a.y);
        e.line.setAttribute('x2', e.b.x);
        e.line.setAttribute('y2', e.b.y);
      }
    }

    return {
      el: root,
      title: root.querySelector('.sy-title'),
      attached: layout,
      resize: layout,
      enter() {
        layout();
        root.classList.add('is-in');
      },
    };
  },
};

