# Grant Sacco: personal site

## Direction (most important)

This is **not a resume on a website**. It should feel like:

> This is Grant. Here are the things he's built, the places he's been, the problems he's worked on, the photos he's taken, and the weird side projects he makes because he's curious.

- **Show, don't tell.** The five themes (builder, field-oriented engineer, problem solver, internationally curious, active/adventurous) are proven by the projects, photography, travel, languages, sports, startup and apps. Don't add more personality words or adjectives to the site.
- **Not a resume.** No PMP, no HOA board, no skill lists as content. Personal context (family, sports, travel) supports the work quietly and never crowds it.
- **Uncluttered.** Each section shows a few hand-picked artifacts; everything else lives in a "+ more" list.

## Where things are

- `planning/site-artifacts.xlsx`: the master list of artifacts and decisions (sections, crossovers, featured, open questions, places, films, profile). Grant edits it; keep it in sync when he answers questions.
- `src/content.js`: the content the mocks read (still sample content).
- Concept mocks: `/scale`, `/viewport`, `/coordinates`, `/layers`, `/translation`, `/morph`, `/lens`. Lens (Coordinates × Viewport Modes) is the direction being developed.

## Lens decisions so far

- Sections keep their coordinate systems; a render line re-renders everything when switching.
- Sections show only their own work; tiles step out and back in at the render line.
- Art: the 35mm films are photo stacks plotted on Art's axes; clicking one opens the infinite grid with that film selected ("All films" in the sidebar).
- Travel: places lived, moves and trips, not every project.
- 3D models are welcome for physical builds (representations are fine; real photos on click).
