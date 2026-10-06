# Grant Sacco — personal site concepts

**Same person. Different lens.** Seven working, interactive concept mocks for a personal site. Each one is a different answer to the same question: what if the sections (About, Engineering, Projects, Art, Travel, Apps) weren't separate pages, but different ways of looking at the same work?

All seven mocks share one content file, so the only thing that changes between them is the concept.

| # | Concept | What switching sections does |
|---|---|---|
| 01 | **Scale** (`/scale/`) | Flies the camera through continuous scale (planet → city → workshop → room → desk → inside a gearbox / a film frame / a laptop screen). A powers-of-ten rail shows where you are. Scroll or press ± to zoom freely. |
| 02 | **Viewport Modes** (`/viewport/`) | Re-renders one still life of seven projects: shaded, hidden-line isometric CAD, exploded clay, a cinematic depth-of-field shot, the table as a world map, and a wireframe system view. |
| 03 | **Coordinate System** (`/coordinates/`) | Re-plots the same work on new axes: scale × complexity, time × completion, functional ↔ expressive, physical ↔ digital. The grid becomes a real map's graticule for Travel, and polar time around "you" for About. |
| 04 | **Layers** (`/layers/`) | Keeps the camera still and turns CAD-style layers on and off over one modelled film camera: shell ⇄ x-ray, internals, edges, dimensions, process marks, light, handwritten notes, a film strip of places, and a software graph. Visitors can mix their own. |
| 05 | **Translation** (`/translation/`) | Shows one project at a time, seen as a Person, Engineer, Maker, Artist, Traveller or System. Each lens is a completely different form: a story, a technical drawing, a build log, a print, a map, or live data. |
| 06 | **Object Morphing** (`/morph/`) | Rearranges twenty triangular plates into everything: a closed icosahedron, an exploded assembly, an arch, robot arm or workbench, a bronze sculpture, an unfolded (Dymaxion-style) world map, or a tiled screen. |
| 07 | **Lens** (`/lens/`) | Coordinates × Viewport Modes. Every project is a picture on one field. Switching section moves the pictures onto that section's axes while a render line sweeps across and redraws everything in its visual language: photographs, hidden-line drawings, clay, film stills, a map duotone, ASCII. Click a project to open it; the same tabs then translate that one project. In Art, photo albums are piles of prints: hover skims through a roll, click opens it as an endless, draggable contact sheet with every roll in a sidebar. |

Inside every mock: `1`–`6` or `←` `→` switch sections, and the URL hash (`#structure`, `#place`, …) links straight to a state.

The section switcher is a liquid glass tray: the active tab is an ink drop that stretches as it flows between tabs, and the tray pinches apart around the active and hovered tabs (the neck geometry is adapted from uselayouts' Gooey Navbar). A quiet **Get in touch** pill sits in the top bar; it opens a card built from `site.email`, `site.links` and `site.resume`.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173 — the gallery links to every mock
npm run build    # static site in dist/
npm run preview  # serve the build locally
```

Requires Node 18+. Built with [Vite](https://vite.dev) and [Three.js](https://threejs.org), with world outlines from [world-atlas](https://github.com/topojson/world-atlas) (Natural Earth). There is no framework and no backend.

## Make it yours

Everything personal lives in **`src/content.js`**:

- `site`: name, role, summary, links, and `draft` (set it to `false` to hide the "Sample content" tag).
- `modes`: the six perspectives and the blurb for each.
- `albums`: photo rolls (sample frames are drawn until real photos are added).
- `items`: every project, trip and app. Each item has `axes` (where it sits in each coordinate system), `lens` (the same item translated into each perspective), `place` (where it goes on the maps), `stage` and `related`.
- `experience` and `skills`, for a future plain résumé view.

**Everything in `content.js` right now is sample content.** Titles, dates, places and stories are plausible stand-ins so the systems have something to arrange.

## Layout

```
index.html, src/gallery/     the concept gallery
<concept>/index.html         one page per mock
src/<concept>/               that mock's code and styles
src/shared/                  chrome (top bar, contact card, liquid section switcher), geo helpers, concept list
src/content.js               the content every mock reads
src/anim.js                  small interruption-safe tween helpers
public/previews/             gallery thumbnails
src/lens/pictures.js         placeholder project pictures (swap for real photos)
```

## Deploy

`npm run build` produces a fully static `dist/` with relative paths. Upload it to any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages). It works at a domain root or a sub-path like `/grantsacco/`.
