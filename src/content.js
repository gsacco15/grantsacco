/*
 * ─────────────────────────────────────────────────────────────────────────────
 *  CONTENT — the only file you need to edit to make this site yours.
 *
 *  EVERYTHING BELOW IS SAMPLE CONTENT. Titles, dates, places, and stories are
 *  stand-ins so the system has something to arrange. Replace them with the real
 *  thing, then set `site.draft` to false to hide the "sample content" tag.
 *
 *  How the site uses an item:
 *    - `axes` positions it in every coordinate system (all values 0 → 1).
 *    - `lens` is the same item translated into each perspective.
 *    - `place` drops it on the globe in PLACE mode.
 *    - `related` draws the links between nodes in DIGITAL mode.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const site = {
  name: 'Grant Sacco',
  role: 'Mechanical engineer, maker, photographer',
  tagline: 'Same person. Different lens.',
  // One or two sentences that open the plain-view résumé.
  summary:
    'I design and build physical systems — manufacturing lines, machines, fixtures — and spend the rest of my time making things with cameras, code, and whatever is on the workbench.',
  basedIn: 'United States',
  email: '', // e.g. 'hello@yourdomain.com' — leave empty to hide
  resume: '', // e.g. 'resume.pdf' placed in /public — leave empty to hide
  links: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/grant-t-sacco' },
    { label: 'GitHub', href: 'https://github.com/gsacco15' },
    // { label: 'Instagram', href: 'https://instagram.com/…' },
  ],
  draft: true,
};

/*
 * The six perspectives. `section` is the conventional name a visitor would
 * expect; `name` is the viewport mode the site actually switches to.
 * `blurb` is the short paragraph shown in the corner for that mode.
 */
export const modes = [
  {
    id: 'reality',
    name: 'Reality',
    section: 'About',
    blurb:
      'Everything arranged by time, orbiting the person in the middle. I studied mechanical engineering and never stopped wanting to know how things are made — and how to make them better looking while I am at it.',
  },
  {
    id: 'structure',
    name: 'Structure',
    section: 'Engineering',
    blurb:
      'The same work, plotted by physical scale against complexity. From a 30 mm fixture pin to a full production facility.',
  },
  {
    id: 'build',
    name: 'Build',
    section: 'Projects',
    blurb:
      'Plotted by when it started and how far it got. Ideas, sketches, prototypes, and the things that actually shipped.',
  },
  {
    id: 'image',
    name: 'Image',
    section: 'Art',
    blurb: 'Functional to expressive, controlled to experimental. Film, renders, and the occasional happy accident.',
  },
  {
    id: 'place',
    name: 'Place',
    section: 'Travel',
    blurb: 'Where everything happened — the work, the trips, and the rolls of film in between.',
  },
  {
    id: 'digital',
    name: 'Digital',
    section: 'Digital',
    blurb: 'Physical to digital, experimental to finished — and the connections between all of it.',
  },
];

/*
 * kind: 'engineering' | 'project' | 'art' | 'travel' | 'app' | 'life'
 * stage (BUILD mode): 'idea' | 'sketch' | 'prototype' | 'built' | 'shipped'
 *
 * axes — every value is 0 → 1:
 *   scale         physical size of the thing (log-ish: 0 = millimetres, 1 = buildings)
 *   complexity    how many interacting parts / disciplines
 *   expressive    0 = purely functional, 1 = purely expressive
 *   experimental  0 = tightly controlled, 1 = loose / experimental
 *   digital       0 = entirely physical, 1 = entirely digital
 *   finished      0 = experiment, 1 = polished and finished
 * (completion for BUILD mode is derived from `stage`.)
 */
export const items = [
  {
    id: 'degree',
    title: 'B.S. Mechanical Engineering',
    kind: 'life',
    years: [2015, 2019],
    place: { name: 'University', lat: 40.0, lon: -83.0 },
    stage: 'shipped',
    axes: { scale: 0.4, complexity: 0.55, expressive: 0.2, experimental: 0.3, digital: 0.25, finished: 1 },
    lens: {
      reality: 'Four years of learning why things break — and how to stop them.',
      structure: 'Thermo, dynamics, machine design, controls. Senior focus: mechanical design.',
      build: 'Built a lot of things that only had to survive until the demo.',
      image: 'Started carrying a camera to the machine shop.',
      place: 'Where the engineering started.',
      digital: 'First MATLAB scripts. First realisation that code is a tool like any other.',
    },
    related: ['capstone'],
  },
  {
    id: 'capstone',
    title: 'Capstone test rig',
    kind: 'engineering',
    years: [2018, 2019],
    place: { name: 'University', lat: 40.0, lon: -83.0 },
    stage: 'built',
    axes: { scale: 0.45, complexity: 0.6, expressive: 0.15, experimental: 0.55, digital: 0.3, finished: 0.6 },
    lens: {
      reality: 'Team of five, one semester, a lot of late nights in the lab.',
      structure: 'Welded steel frame, instrumented load path, data acquisition at 1 kHz.',
      build: 'Sketch → CAD → weldment → instrumented → tested to failure (on purpose).',
      image: 'The best photos were of the parts that broke.',
      place: 'Built in the university fabrication lab.',
      digital: 'Wrote the logging script that turned raw strain into pass/fail.',
    },
    related: ['degree', 'fixtures'],
  },
  {
    id: 'facility',
    title: 'Manufacturing facility build-out',
    kind: 'engineering',
    years: [2023, 2025],
    place: { name: 'Midwest, USA', lat: 41.5, lon: -87.6 },
    stage: 'shipped',
    axes: { scale: 0.96, complexity: 0.95, expressive: 0.1, experimental: 0.25, digital: 0.3, finished: 0.92 },
    lens: {
      reality: 'The biggest thing I have worked on. Empty building to running production.',
      structure: 'Equipment layout, utilities, material flow, commissioning. Multiple lines, one schedule.',
      build: 'Concept layout → detailed design → install → commission → hand-off to production.',
      image: 'A clean floor before the first machine lands is its own kind of beautiful.',
      place: 'An empty building that is now a working facility.',
      digital: 'Fed the layout and status data that the shop-floor dashboard runs on.',
    },
    related: ['cell', 'dashboard'],
  },
  {
    id: 'cell',
    title: 'Automated assembly cell',
    kind: 'engineering',
    years: [2022, 2023],
    place: { name: 'Midwest, USA', lat: 41.5, lon: -87.6 },
    stage: 'shipped',
    axes: { scale: 0.72, complexity: 0.86, expressive: 0.12, experimental: 0.35, digital: 0.45, finished: 0.88 },
    lens: {
      reality: 'First time I owned a machine from napkin sketch to production.',
      structure: 'Robot, conveyance, vision check, guarding, and the PLC handshake between them.',
      build: 'Concept → FMEA → CAD → build → debug → validated at rate.',
      image: 'Long exposures of the robot path look like drawings.',
      place: 'Installed on a production floor.',
      digital: 'Station data feeds a live dashboard.',
    },
    related: ['facility', 'fixtures', 'dashboard'],
  },
  {
    id: 'fixtures',
    title: 'Tooling & fixture library',
    kind: 'engineering',
    years: [2021, 2022],
    place: { name: 'Midwest, USA', lat: 41.5, lon: -87.6 },
    stage: 'shipped',
    axes: { scale: 0.18, complexity: 0.5, expressive: 0.2, experimental: 0.3, digital: 0.2, finished: 0.85 },
    lens: {
      reality: 'Small parts that save a lot of time.',
      structure: 'Locating schemes, GD&T, quick-change bases. Standardised across lines.',
      build: 'Design → print prototype → machine final → verify on the line.',
      image: 'Anodised aluminium under a single soft light.',
      place: 'In use on lines in several buildings.',
      digital: 'Parametric CAD templates so new fixtures start 80% done.',
    },
    related: ['cell', 'printer'],
  },
  {
    id: 'led',
    title: 'LED matrix build',
    kind: 'project',
    years: [2021, 2021],
    place: { name: 'Home workshop', lat: 41.9, lon: -87.7 },
    stage: 'built',
    axes: { scale: 0.22, complexity: 0.55, expressive: 0.65, experimental: 0.7, digital: 0.6, finished: 0.7 },
    lens: {
      reality: 'Built because I wanted something on the wall that was mine.',
      structure: '1,024 addressable LEDs, laser-cut diffuser grid, 5 V / 20 A supply.',
      build: 'Breadboard → hand-soldered panel → enclosure → firmware.',
      image: 'Mostly an excuse to photograph light.',
      place: 'Lives on the workshop wall.',
      digital: 'Microcontroller firmware plus a small app to push animations to it.',
    },
    related: ['g64', 'site'],
  },
  {
    id: 'g64',
    title: 'Grant 64',
    kind: 'project',
    years: [2020, 2020],
    place: { name: 'Home workshop', lat: 41.9, lon: -87.7 },
    stage: 'built',
    axes: { scale: 0.14, complexity: 0.45, expressive: 0.7, experimental: 0.6, digital: 0.55, finished: 0.75 },
    lens: {
      reality: 'Childhood console, restored and modified. Partly engineering, mostly nostalgia.',
      structure: 'Recapped, region-modded, video output upgraded, new shell.',
      build: 'Teardown → diagnose → parts → mods → reassemble → play.',
      image: 'Translucent plastic and backlight, shot on film.',
      place: 'Built at home.',
      digital: 'Where the interest in how software meets hardware started.',
    },
    related: ['led'],
  },
  {
    id: 'printer',
    title: '3D printer tuning & printed parts',
    kind: 'project',
    years: [2020, 2022],
    place: { name: 'Home workshop', lat: 41.9, lon: -87.7 },
    stage: 'prototype',
    axes: { scale: 0.2, complexity: 0.4, expressive: 0.35, experimental: 0.8, digital: 0.4, finished: 0.4 },
    lens: {
      reality: 'The printer is never finished. That is the point.',
      structure: 'Frame stiffening, input shaping, tolerance test coupons, material tests.',
      build: 'Forever in prototype. Hundreds of parts, a few dozen keepers.',
      image: 'Layer lines up close are surprisingly good texture.',
      place: 'Corner of the workshop.',
      digital: 'Slicer profiles in version control.',
    },
    related: ['fixtures', 'led'],
  },
  {
    id: 'bench',
    title: 'Workbench',
    kind: 'project',
    years: [2018, 2018],
    place: { name: 'Home workshop', lat: 41.9, lon: -87.7 },
    stage: 'built',
    axes: { scale: 0.42, complexity: 0.2, expressive: 0.4, experimental: 0.3, digital: 0.05, finished: 0.8 },
    lens: {
      reality: 'The first thing I built for the shop was the place to build things.',
      structure: 'Laminated top, knock-down joinery, 300 kg rated.',
      build: 'Sketch on paper → cut list → one long weekend.',
      image: 'Every mark on it is a project.',
      place: 'The middle of the workshop.',
      digital: 'Fully analogue. Pencil and tape measure.',
    },
    related: ['printer'],
  },
  {
    id: 'film',
    title: 'Grain — film series',
    kind: 'art',
    years: [2019, 2026],
    place: { name: 'Everywhere', lat: 41.9, lon: -87.6 },
    stage: 'built',
    axes: { scale: 0.6, complexity: 0.3, expressive: 0.9, experimental: 0.55, digital: 0.15, finished: 0.75 },
    lens: {
      reality: 'Thirty-six frames at a time. It makes me slow down.',
      structure: 'Medium and 35 mm, home-developed, scanned at high resolution.',
      build: 'Shoot → develop → scan → edit → print.',
      image: 'Light, grain, and the shapes in between.',
      place: 'Every place on this globe has a roll attached to it.',
      digital: 'A small app keeps track of every roll.',
    },
    related: ['filmlog', 'iceland', 'japan'],
  },
  {
    id: 'renders',
    title: 'Renders & CAD as art',
    kind: 'art',
    years: [2022, 2026],
    place: { name: 'Home studio', lat: 41.9, lon: -87.7 },
    stage: 'built',
    axes: { scale: 0.3, complexity: 0.5, expressive: 0.75, experimental: 0.75, digital: 0.85, finished: 0.65 },
    lens: {
      reality: 'The engineering models are beautiful. I started treating them that way.',
      structure: 'Production CAD, re-lit and re-materialled. Nothing faked.',
      build: 'Model → materials → lighting → render → grade.',
      image: 'Machined surfaces, soft light, shallow depth of field.',
      place: 'Made at the desk.',
      digital: 'The same pipeline now renders parts of this site.',
    },
    related: ['site', 'fixtures'],
  },
  {
    id: 'iceland',
    title: 'Iceland',
    kind: 'travel',
    years: [2019, 2019],
    place: { name: 'Reykjavík, Iceland', lat: 64.15, lon: -21.94 },
    stage: 'shipped',
    axes: { scale: 0.99, complexity: 0.3, expressive: 0.85, experimental: 0.65, digital: 0.05, finished: 0.7 },
    lens: {
      reality: 'Ring road, ten days, very little sleep.',
      structure: 'Basalt columns are the best engineering drawing nature ever made.',
      build: 'Planned for months, improvised for ten days.',
      image: 'The best light I have ever shot in.',
      place: '64.15° N, 21.94° W — and everywhere along the ring road.',
      digital: 'Mapped every stop afterwards.',
    },
    related: ['film'],
  },
  {
    id: 'italy',
    title: 'Italy',
    kind: 'travel',
    years: [2017, 2017],
    place: { name: 'Florence, Italy', lat: 43.77, lon: 11.26 },
    stage: 'shipped',
    axes: { scale: 0.85, complexity: 0.4, expressive: 0.8, experimental: 0.4, digital: 0.05, finished: 0.7 },
    lens: {
      reality: 'First big trip abroad.',
      structure: "Brunelleschi's dome: a structure that should not have been possible in 1436.",
      build: 'Saw how things were built before CAD.',
      image: 'Stone, gold light, and a lot of photos of doors.',
      place: '43.77° N, 11.26° E.',
      digital: 'Analogue trip. No regrets.',
    },
    related: ['film'],
  },
  {
    id: 'japan',
    title: 'Japan',
    kind: 'travel',
    years: [2024, 2024],
    place: { name: 'Tokyo, Japan', lat: 35.68, lon: 139.69 },
    stage: 'shipped',
    axes: { scale: 0.97, complexity: 0.7, expressive: 0.7, experimental: 0.5, digital: 0.3, finished: 0.75 },
    lens: {
      reality: 'Two weeks. Trains, workshops, and very good food.',
      structure: 'Visited factories. Lean manufacturing where it was born.',
      build: 'Brought back ideas and a suitcase of hand tools.',
      image: 'Neon at night, quiet temples in the morning.',
      place: '35.68° N, 139.69° E.',
      digital: 'Transit systems that run like software.',
    },
    related: ['film', 'facility'],
  },
  {
    id: 'site',
    title: 'This website',
    kind: 'app',
    years: [2026, 2026],
    place: { name: 'The internet', lat: 41.9, lon: -87.7 },
    stage: 'prototype',
    axes: { scale: 0.05, complexity: 0.7, expressive: 0.8, experimental: 0.9, digital: 1, finished: 0.45 },
    lens: {
      reality: 'An attempt to show that all of this is one person.',
      structure: 'Three.js scene, one morphing point object, six coordinate systems, zero page loads.',
      build: 'Brainstorm → concept → working prototype. You are looking at it.',
      image: 'Every mode has its own visual language.',
      place: 'Everywhere at once.',
      digital: 'Vite + Three.js. Same content, translated six ways.',
    },
    related: ['renders', 'led', 'filmlog'],
  },
  {
    id: 'dashboard',
    title: 'Shop-floor dashboard',
    kind: 'app',
    years: [2024, 2025],
    place: { name: 'Midwest, USA', lat: 41.5, lon: -87.6 },
    stage: 'shipped',
    axes: { scale: 0.08, complexity: 0.65, expressive: 0.3, experimental: 0.35, digital: 0.9, finished: 0.85 },
    lens: {
      reality: 'Built it because I was tired of walking the floor to check status.',
      structure: 'Station data → database → live web dashboard. Uptime, rate, alarms.',
      build: 'Spreadsheet → prototype → used daily by the team.',
      image: 'Mostly about making the information calm to look at.',
      place: 'Running on screens across the facility.',
      digital: 'Live data, simple stack, zero training needed.',
    },
    related: ['facility', 'cell'],
  },
  {
    id: 'filmlog',
    title: 'Film log app',
    kind: 'app',
    years: [2025, 2026],
    place: { name: 'Home studio', lat: 41.9, lon: -87.7 },
    stage: 'sketch',
    axes: { scale: 0.04, complexity: 0.4, expressive: 0.55, experimental: 0.7, digital: 0.95, finished: 0.3 },
    lens: {
      reality: 'Every roll, every camera, every place it was shot.',
      structure: 'Roll → frames → metadata → map. Small schema, big archive.',
      build: 'Sketches and a working prototype on my phone.',
      image: 'Contact sheets, digitised.',
      place: 'Tags every frame with where it was taken.',
      digital: 'Mobile-first, offline-first.',
    },
    related: ['film', 'site'],
  },
];

/*
 * Photo albums (rolls). SAMPLE: there are no real photos yet, so every album
 * draws `count` procedural frames in its `look`. `photos` is where the real
 * image paths will go once they exist; `cover` is the frame shown on top of
 * the stack; `axes` places the roll on Art's plot (0 → 1, like items).
 */
export const albums = [
  { id: 'iceland-19', title: 'Ring Road', place: 'Iceland', year: 2019, count: 24, look: 'nordic', cover: 0, axes: { expressive: 0.88, experimental: 0.62 }, photos: [] },
  { id: 'florence-17', title: 'Stone & Gold', place: 'Florence, Italy', year: 2017, count: 18, look: 'tuscan', cover: 0, axes: { expressive: 0.72, experimental: 0.3 }, photos: [] },
  { id: 'tokyo-24', title: 'After Dark', place: 'Tokyo, Japan', year: 2024, count: 20, look: 'neon', cover: 0, axes: { expressive: 0.8, experimental: 0.84 }, photos: [] },
  { id: 'lake-23', title: 'Lake Effect', place: 'Lake Michigan', year: 2023, count: 16, look: 'lake', cover: 0, axes: { expressive: 0.62, experimental: 0.18 }, photos: [] },
  { id: 'shop-22', title: 'Shop Notes', place: 'Home workshop', year: 2022, count: 14, look: 'workshop', cover: 0, axes: { expressive: 0.42, experimental: 0.58 }, photos: [] },
  { id: 'city-21', title: 'Roll 042', place: 'Chicago', year: 2021, count: 18, look: 'city', cover: 0, axes: { expressive: 0.66, experimental: 0.48 }, photos: [] },
];

/* Plain-view extras. These only appear in the résumé view. */
export const experience = [
  {
    role: 'Manufacturing Engineer',
    org: 'Company name',
    years: '2021 — Present',
    points: [
      'Led equipment layout and commissioning for a new production facility.',
      'Owned an automated assembly cell from concept through validation at rate.',
      'Standardised tooling and fixtures across lines.',
    ],
  },
  {
    role: 'Engineering Intern',
    org: 'Company name',
    years: '2018 — 2019',
    points: ['Designed test fixtures and wrote data-logging tools for validation testing.'],
  },
];

export const skills = [
  { group: 'Engineering', list: ['Mechanical design', 'GD&T', 'DFM / DFA', 'Automation', 'Commissioning', 'FMEA'] },
  { group: 'Tools', list: ['SolidWorks', 'AutoCAD', 'PLC basics', 'Python', 'JavaScript', 'Three.js'] },
  { group: 'Making', list: ['Fabrication', '3D printing', 'Electronics', 'Film photography', 'Rendering'] },
];
