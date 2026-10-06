import '../shared/base.css';
import './gallery.css';
import { site } from '../content.js';
import { concepts } from '../shared/concepts.js';

const root = document.getElementById('gallery');

root.innerHTML = `
  <header class="g-head">
    <p class="g-kicker">${site.name} — personal site concepts</p>
    <h1 class="g-title">Same person.<br /><em>Different lens.</em></h1>
    <p class="g-lede">
      Six working mocks, one idea: the sections of the site aren't separate pages. They're different ways of looking
      at the same work. All six use identical sample content, so the only thing that changes is the concept.
    </p>
    <p class="g-keys">Inside every mock: <kbd>1</kbd>–<kbd>6</kbd> or <kbd>←</kbd> <kbd>→</kbd> to switch sections.</p>
  </header>

  <ol class="g-list">
    ${concepts
      .map(
        (c, i) => `
      <li class="g-item">
        <a class="g-card" href="./${c.id}/">
          <span class="g-num">${String(i + 1).padStart(2, '0')}</span>
          <span class="g-preview" aria-hidden="true">
            <img src="previews/${c.id}.jpg" alt="" loading="lazy" onerror="this.remove()" />
          </span>
          <span class="g-body">
            <span class="g-name">${c.name}<span class="g-score">${c.score}</span></span>
            <span class="g-line">${c.line}</span>
            <span class="g-detail">${c.detail}</span>
            <span class="g-open">Open mock <span aria-hidden="true">→</span></span>
          </span>
        </a>
      </li>`,
      )
      .join('')}
  </ol>

  <section class="g-combo">
    <h2>Where this could end up</h2>
    <p>The strongest answer is probably not one concept but a design language built from several:</p>
    <dl>
      <div><dt>Viewport modes</dt><dd>define <em>how</em> you see the world.</dd></div>
      <div><dt>Layers</dt><dd>decide <em>what information</em> is visible.</dd></div>
      <div><dt>Scale</dt><dd>decides <em>where</em> the camera takes you.</dd></div>
      <div><dt>Coordinates</dt><dd>decide <em>how the work is arranged</em>.</dd></div>
      <div><dt>Translation</dt><dd>is the idea that explains why all of it works.</dd></div>
    </dl>
    <p class="g-small">Play with each mock, note what you like, then the final site can combine the best parts.</p>
  </section>

  <footer class="g-foot">
    <span>${site.draft ? 'All content is sample content.' : ''}</span>
    <span>Built with Vite + Three.js</span>
  </footer>
`;
