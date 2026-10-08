# Grant Sacco: personal site

## Direction (most important)

This is **not a resume on a website**. It should feel like:

> This is Grant. Here are the things he's built, the places he's been, the problems he's worked on, the photos he's taken, and the weird side projects he makes because he's curious.

- **Show, don't tell.** The five themes (builder, field-oriented engineer, problem solver, internationally curious, active/adventurous) are proven by the projects, photography, travel, languages, sports, startup and apps. Don't add more personality words or adjectives to the site.
- **Not a resume.** No PMP, no HOA board, no skill lists as content. Personal context (family, sports, travel) supports the work quietly and never crowds it.
- **Uncluttered.** Each section shows a few hand-picked artifacts; everything else lives in a "+ more" list.
- **One quiet line, at most.** About carries "Based in Austin · English, Italian, learning Portuguese" and nothing more like it. Jaylee and Helga (the family dogs) sit on the 2021 ring in About as one small sprite each (named on hover), never as a tile.
- **Keep personal tags off the work.** No languages on the Travel map; no sports on films or trips.

## Where things are

- `planning/site-artifacts.xlsx`: the master list of artifacts and decisions (sections, crossovers, featured, open questions, places, films, profile). Grant edits it; keep it in sync when he answers questions.
- `src/lens/artifacts.js`: Lens's real content (roles, engineering, projects, apps, films, places lived), taken from the workbook. Pictures are placeholders until real photos, CAD and the logo arrive; `tbd` marks placeholder dates. A real image goes in as `picture: { src, bg }` (cover-cropped to 3:2 and re-rendered in every lens); the KU tile is the first.
- `src/content.js`: sample content for mocks 1–6 (Lens only takes the section names from it).
- Concept mocks: `/scale`, `/viewport`, `/coordinates`, `/layers`, `/translation`, `/morph`, `/lens`, `/lens2`. Lens (Coordinates × Viewport Modes) is the direction being developed.
- `/lens2` (Lens v2, `src/lens2/`) is a copy of Lens with a quieter, more professional look: one palette (ink, paper, one calm blue; Art and Digital dark), one sans and one mono, hairlines instead of shadows and glows, plain prints instead of polaroids, technical labels instead of handwriting, restrained picture renders (colour kept). It shares Lens's content (`src/lens2/artifacts.js` re-exports `src/lens/artifacts.js`), so content changes go in one place; behaviour changes need making in both copies until one version is chosen.

## Lens decisions so far

- Company names and logos: project first, company second. Logos are small and sparing: company logos (Enovis, MAPEI, OnlyChargeEV, in `src/lens/img/logos/`) sit under the work in About only (KU's tile already is the school's mark, so it carries no logo underneath; the small KU logo stays in the folder for use elsewhere); an app's icon (ContactFlow) sits beside its name in Digital only. No big branded tiles. Check what can be shown publicly about Enovis before launch.

- Sections keep their coordinate systems; a render line re-renders everything when switching. The sixth section is called **Digital** (was Apps): apps, code, electronics and controls.
- About is a calendar wheel: rings are years, the angle is the time of year (January at the top, clockwise), each piece at its start month. Only career, school and a few key projects live there (no trips, no AWC; MAPEI Corp's card carries both stints, Chicago 2018–19 and Dallas 2021–24). The time of year is cued simply ("Jan" at the top and a "through the year" arrow), with no month names. Races are their logos, small, on the wheel at their year and month, named on hover (Austin Marathon, full 26.2, Feb 2024; IRONMAN 70.3 Texas, spring 2026).
- Clicking the origin ("Grant" at the centre of About) opens a small card: headshot, two plain sentences (who he is, what he does now; facts only, `intro` in `src/lens/artifacts.js`), and email and LinkedIn (from `site` in `src/content.js`). The headshot and the email are still to come.
- Axis labels, ticks and year marks are part of the look: phones keep them too, just fewer and smaller (never drop them entirely).
- Sections show only their own work; tiles step out and back in at the render line.
- Art: the 35mm films are photo stacks plotted on Art's axes; clicking one opens the infinite grid with that film selected ("All films" in the sidebar).
- Travel is a clean map of small dots, not pictures: places lived (Wilmette → Lawrence 2014–18 → Chicago 2018–19 → Milan 2019–21 → Dallas 2021–25 → Austin since April 2025), trips (one per film, "photos") and the Houston work sites. Not every project. The only lines are the moves between places lived. Homes are labelled; trips and work sites are labelled on hover, and clicking a trip opens its photos. Each home's page lists what happened while living there.
- Homes where Grant also worked (Chicago, Milan, Dallas, Austin) are framed by the "worked" square; Wilmette carries a "born" ring and label. On phones Wilmette reads "Chicago · born" and the later Chicago goes unlabelled.
- The map zooms and pans (wheel, pinch, drag, double-click, + / − / fit buttons) and always opens on the whole fitted view; finer coastlines load once zoomed in.
- The 34 countries visited (`countries` in `src/lens/artifacts.js`, Countries sheet in the workbook) are shaded on the map; the four islands too small for its outlines are dots.
- 3D models are welcome for physical builds (representations are fine; real photos on click).
- The first one is the Enovis MPOC (multipurpose operations center), `src/lens2/model3d.js`, shown live on the Lens v2 pages for the operations facility build-out and the additive manufacturing center (that one opens with the lab highlighted). Generic massing only: the shell, entrances, dock doors, rooftop units and six zones (Offices; Utilities; Clean pack & sterilization; Warehouse & shipping; Additive & subtractive manufacturing lab; Support work centers) with simple stand-in contents. Nothing from the real floor plan, and Grant's plan and snapshots never go in the repo (it's public). Each tab shows it differently (daylight, hidden-line, exploded clay, dusk, plan, digital twin with flows); zones highlight from the legend or on hover. The tile pictures are stills of the model (`src/lens/img/models/`).
