/*
 * ─────────────────────────────────────────────────────────────────────────────
 *  LENS CONTENT: Grant's real artifacts, from planning/site-artifacts.xlsx.
 *
 *  Direction (see CLAUDE.md): not a resume on a website. Show what he's built,
 *  where he's been, the problems he's worked on, the photos he's taken and the
 *  side projects he makes because he's curious. No personality words.
 *
 *  Visuals are placeholders (generated scenes / sample film frames) until real
 *  photos, CAD and the logo arrive. Years marked `tbd` are placeholders too.
 *
 *  Sections (mode ids): reality = About, structure = Engineering,
 *  build = Projects, image = Art, place = Travel, digital = Digital.
 *  `main` is the artifact's own section; `also` lists crossovers.
 *  featured: 'yes' = on stage · 'maybe' = in the section's "+ more" list ·
 *  'no' = kept as data only. `month` is the start month, the angle in About
 *  (`monthTbd` marks a placeholder month).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import dogBlackTan from './img/dog-black-tan.png';
import dogTan from './img/dog-tan.png';
import enovisLogo from './img/logos/enovis.png';
import mapeiLogo from './img/logos/mapei.png';
import onlychargeLogo from './img/logos/onlychargeev.png';
import kuLogo from './img/logos/ku.png';
import kuEngineering from './img/ku-engineering.png';
import austinMarathonLogo from './img/logos/austin-marathon.png';
import ironmanTexasLogo from './img/logos/ironman-703-texas.png';
import contactflowIcon from './img/logos/contactflow.svg';

/*
 * Logos, used sparingly: project first, company second. Company logos sit small
 * under the work in About; an app's icon sits beside its name in Digital.
 * `ratio` is width / height; `in` lists the sections that show it.
 */
const about = (src, alt, ratio) => ({ src, alt, ratio, in: ['reality'] });
const LOGO = {
  enovis: about(enovisLogo, 'Enovis', 900 / 219),
  mapei: about(mapeiLogo, 'MAPEI', 900 / 209),
  onlycharge: about(onlychargeLogo, 'OnlyChargeEV', 900 / 271),
  // Not shown under KU's tile (its picture is the school's mark); here if needed elsewhere.
  ku: about(kuLogo, 'University of Kansas School of Engineering', 540 / 125),
  contactflow: { src: contactflowIcon, alt: '', ratio: 1, in: ['digital'], icon: true },
};

/** One quiet line in About. */
export const quiet = { line: 'Based in Austin · English, Italian, learning Portuguese' };

/**
 * The card behind the origin ("Grant" at the centre of About): a headshot,
 * two plain sentences on who he is and what he does now, and how to reach him
 * (email and links come from `site` in src/content.js). Draft wording: facts
 * only, no adjectives. `headshot` is empty until the photo arrives.
 */
export const intro = {
  headshot: '',
  lines: [
    'Grant is a mechanical engineer in Austin, working on advanced manufacturing at Enovis.',
    'Before that he built plants and production lines for MAPEI in Chicago, Milan and Dallas, and started an EV charging company.',
  ],
};

/** Jaylee and Helga, sitting on About's 2021 ring (one frame from each sprite sheet). */
export const dogs = { src: [dogBlackTan, dogTan], names: 'Jaylee & Helga', year: 2021 };

/**
 * Races, as their logos (small) on About's wheel at their year and month,
 * named on hover. `ratio` is the logo's width / height; `monthTbd` marks a
 * placeholder month.
 */
export const races = [
  { id: 'austin-marathon', name: 'Austin Marathon', year: 2024, month: 2, when: '26.2 mi · February 2024', logo: austinMarathonLogo, ratio: 600 / 261 },
  { id: 'ironman-texas', name: 'IRONMAN 70.3 Texas', year: 2026, month: 4, monthTbd: true, when: '70.3 mi · spring 2026', logo: ironmanTexasLogo, ratio: 280 / 120 },
];

/**
 * Places lived, in order (the Travel map draws the moves between them).
 * `phone` is the map label on phones, where Wilmette and Chicago share a dot's
 * width: the birthplace reads "Chicago · born" and the later Chicago has none.
 */
export const homes = [
  { id: 'home-wilmette', name: 'Wilmette, IL', years: [null, 2014], lat: 42.08, lon: -87.72, note: 'Born and grew up', town: true, born: true, phone: 'Chicago · born' },
  { id: 'home-lawrence', name: 'Lawrence, KS', years: [2014, 2018], lat: 38.97, lon: -95.24, note: 'University of Kansas', town: true },
  { id: 'home-chicago', name: 'Chicago, IL', years: [2018, 2019], lat: 41.88, lon: -87.63, note: 'MAPEI Chicago', phone: '' },
  { id: 'home-milan', name: 'Milan, Italy', years: [2019, 2021], lat: 45.46, lon: 9.19, note: 'MAPEI SpA' },
  { id: 'home-dallas', name: 'Dallas, TX', years: [2021, 2025], lat: 32.78, lon: -96.8, note: 'MAPEI Corp · OnlyChargeEV' },
  { id: 'home-austin', name: 'Austin, TX', years: [2025, 2026], lat: 30.27, lon: -97.74, note: 'Since April 2025' },
];

/*
 * Every country Grant has been to (34), shaded on the Travel map. `name` is the
 * Natural Earth name the map data uses; `at` places the islands too small for
 * its outlines as a dot instead; `near` is a point that should stay on screen.
 */
export const countries = [
  { label: 'USA', name: 'United States of America' },
  { label: 'Canada', name: 'Canada', near: [43.65, -79.38] },
  { label: 'Mexico', name: 'Mexico' },
  { label: 'Bahamas', name: 'Bahamas' },
  { label: 'Dominican Republic', name: 'Dominican Rep.' },
  { label: 'Dominica', name: 'Dominica', at: [15.41, -61.37] },
  { label: 'Belize', name: 'Belize' },
  { label: 'St Lucia', name: 'Saint Lucia', at: [13.91, -60.98] },
  { label: 'Barbados', name: 'Barbados', at: [13.19, -59.54] },
  { label: 'St Kitts', name: 'St. Kitts and Nevis', at: [17.3, -62.72] },
  { label: 'Jamaica', name: 'Jamaica' },
  { label: 'Honduras', name: 'Honduras' },
  { label: 'Panama', name: 'Panama' },
  { label: 'Guatemala', name: 'Guatemala' },
  { label: 'Colombia', name: 'Colombia' },
  { label: 'Peru', name: 'Peru' },
  { label: 'Brazil', name: 'Brazil' },
  { label: 'South Africa', name: 'South Africa', near: [-33.92, 18.42] },
  { label: 'Spain', name: 'Spain' },
  { label: 'Italy', name: 'Italy' },
  { label: 'Slovenia', name: 'Slovenia' },
  { label: 'France', name: 'France' },
  { label: 'Croatia', name: 'Croatia' },
  { label: 'Hungary', name: 'Hungary' },
  { label: 'Czech Republic', name: 'Czechia' },
  { label: 'Germany', name: 'Germany' },
  { label: 'Switzerland', name: 'Switzerland' },
  { label: 'Denmark', name: 'Denmark', near: [55.68, 12.57] },
  { label: 'England (UK)', name: 'United Kingdom', near: [51.51, -0.13] },
  { label: 'Argentina', name: 'Argentina' },
  { label: 'Chile', name: 'Chile' },
  { label: 'Netherlands', name: 'Netherlands' },
  { label: 'Austria', name: 'Austria' },
  { label: 'Portugal', name: 'Portugal' },
];

/*
 * 35mm films. Frames are procedural placeholders in each film's `look` until
 * the albums are linked. `axes` places the film on Art's plot; `short` is the
 * caption on phones.
 */
export const films = [
  { id: 'film-spain', title: 'Mallorca, Ibiza & Formentera', short: 'Spain', place: 'Spain', year: 2026, count: 65, look: 'tuscan', cover: 0, lat: 39.57, lon: 2.65, axes: { expressive: 0.82, experimental: 0.5 } },
  { id: 'film-portugal', title: 'Lagos, Algarve & Lisbon', short: 'Portugal', place: 'Portugal', year: 2026, count: 64, look: 'lake', cover: 1, lat: 38.72, lon: -9.14, axes: { expressive: 0.74, experimental: 0.14 } },
  { id: 'film-acp', title: 'Argentina–Chile–Peru', short: 'Arg · Chile · Peru', place: 'Argentina, Chile, Peru', year: 2025, count: 267, look: 'nordic', cover: 0, lat: -33.45, lon: -70.67, approx: true, axes: { expressive: 0.94, experimental: 0.72 } },
  { id: 'film-mexico', title: 'Mexico', short: 'Mexico', place: 'Mexico', year: 2025, count: 84, look: 'lake', cover: 0, lat: 20.6, lon: -105.2, approx: true, axes: { expressive: 0.64, experimental: 0.52 } },
  { id: 'film-newmexico', title: 'New Mexico (Father & Son)', short: 'New Mexico', place: 'New Mexico, USA', year: 2025, count: 39, look: 'tuscan', cover: 2, lat: 35.69, lon: -105.94, approx: true, axes: { expressive: 0.4, experimental: 0.88 } },
  { id: 'film-brazil', title: 'Brazil', short: 'Brazil', place: 'Brazil', year: 2024, count: 177, look: 'lake', cover: 2, lat: -22.97, lon: -43.18, axes: { expressive: 0.76, experimental: 0.9 } },
  { id: 'film-peru', title: 'Peru', short: 'Peru', place: 'Peru', year: 2023, count: 106, look: 'nordic', cover: 3, lat: -13.53, lon: -71.97, approx: true, axes: { expressive: 0.56, experimental: 0.12 } },
  { id: 'film-palmbeach', title: 'Palm Beach', short: 'Palm Beach', place: 'Florida, USA', year: 2023, count: 39, look: 'lake', cover: 3, lat: 26.71, lon: -80.04, axes: { expressive: 0.46, experimental: 0.5 } },
  { id: 'film-mexicocity', title: 'Mexico City', short: 'Mexico City', place: 'Mexico', year: 2022, count: 59, look: 'city', cover: 0, lat: 19.43, lon: -99.13, axes: { expressive: 0.58, experimental: 0.9 } },
  { id: 'film-italy', title: 'Italy', short: 'Italy', place: 'Italy', year: 2021, count: 59, look: 'tuscan', cover: 1, lat: 41.89, lon: 12.49, axes: { expressive: 0.38, experimental: 0.12 } },
  { id: 'film-colombia', title: 'Colombia', short: 'Colombia', place: 'Colombia', year: 2022, count: 53, look: 'city', cover: 2, lat: 4.71, lon: -74.07, approx: true, axes: { expressive: 0.94, experimental: 0.26 } },
];

/** Engineering's x axis: characteristic size on a log scale, 10 cm → 1 km. */
export const SCALE = { min: 0.1, decades: 4 };
const m = (metres) => Math.log10(metres / SCALE.min) / SCALE.decades;

const ax = (scale, complexity, expressive = 0.2, experimental = 0.3, digital = 0.1, finished = 0.8) => ({ scale, complexity, expressive, experimental, digital, finished });

export const artifacts = [
  /* ── About: where the time went ─────────────────────────────────────────── */
  {
    id: 'enovis', title: 'Enovis', kind: 'role', org: 'Sr. Project Engineer, Advanced Manufacturing', years: [2025, 2026], month: 4,
    place: { name: 'Austin, TX', lat: 30.27, lon: -97.74 }, main: 'reality', also: [], featured: 'yes', stage: 'built', axes: ax(0.5, 0.9),
    summary: 'Owner rep and engineering lead for a new operations facility and an additive manufacturing center.',
    lens: { reality: '2025 – now · Austin. A 200K sq ft facility and an additive manufacturing center.' },
    picture: { scene: 'badge', label: 'Enovis', sub: 'Austin · 2025 –', accent: '#2f7f86' }, logo: LOGO.enovis, related: ['enovis-facility', 'enovis-am'],
  },
  {
    id: 'mapei-dallas', title: 'MAPEI Corp', kind: 'role', org: 'Project Engineering Manager', years: [2021, 2024], month: 7, monthTbd: true,
    place: { name: 'Dallas, TX', lat: 32.78, lon: -96.8 }, main: 'reality', also: [], featured: 'yes', stage: 'built', axes: ax(0.5, 0.85),
    summary: 'Industrial construction and manufacturing capital projects, over $30M in total.',
    // MAPEI Corp in two stints: Chicago out of school, then Dallas after Milan.
    periods: [{ years: [2018, 2019], place: 'Chicago' }, { years: [2021, 2024], place: 'Dallas' }],
    lens: { reality: 'Chicago 2018 – 19, then Dallas 2021 – 24. Over $30M of plants, expansions and equipment.' },
    picture: { scene: 'badge', label: 'MAPEI', sub: 'Dallas · 2021 – 24', accent: '#2b5aa6' }, logo: LOGO.mapei, related: ['drymix', 'palletizer', 'sitedev', 'staticmix', 'liquid'],
  },
  {
    id: 'mapei-milan', title: 'MAPEI SpA', kind: 'role', org: 'Project Engineer', years: [2019, 2021], month: 3, monthTbd: true,
    place: { name: 'Milan, Italy', lat: 45.46, lon: 9.19 }, main: 'reality', also: [], featured: 'yes', stage: 'built', axes: ax(0.5, 0.6),
    summary: 'Manufacturing operations, capital projects and static mixing R&D at the Milan headquarters.',
    lens: { reality: '2019 – 2021 · Milan. Prototyped the static mixing process that later ran in Dallas.' },
    picture: { scene: 'badge', label: 'MAPEI SpA', sub: 'Milan · 2019 – 21', accent: '#3d6fb8' }, logo: LOGO.mapei, related: ['staticmix'],
  },
  {
    id: 'mapei-chicago', title: 'MAPEI Corp (Chicago)', kind: 'role', org: 'Junior Project Engineer', years: [2018, 2019],
    // Shown on the MAPEI Corp card (its Chicago stint); kept for the Chicago home's page and "worked" mark.
    place: { name: 'Chicago, IL', lat: 41.88, lon: -87.63 }, main: 'reality', also: [], featured: 'no', stage: 'built', axes: ax(0.5, 0.4),
    summary: 'Technical studies and medium-scale capital projects for the Chicago site.',
    lens: { reality: '2018 – 2019 · Chicago. First job out of school.' },
    picture: { scene: 'badge', label: 'MAPEI', sub: 'Chicago · 2018 – 19', accent: '#5a7fb8' }, logo: LOGO.mapei, related: [],
  },
  {
    id: 'ku', title: 'University of Kansas', kind: 'education', org: 'B.S. Mechanical Engineering', years: [2014, 2018], month: 8, monthTbd: true,
    place: { name: 'Lawrence, KS', lat: 38.97, lon: -95.24 }, main: 'reality', also: [], featured: 'yes', stage: 'shipped', axes: ax(0.4, 0.55),
    summary: 'BSME. Formula SAE electric powertrain and biomechanical research.',
    lens: { reality: '2014 – 2018 · Lawrence. A racecar and a piano-pedal device on the way to a BSME.' },
    picture: { src: kuEngineering, bg: '#0167b1' }, related: ['fsae', 'pedal'],
  },

  /* ── Engineering ────────────────────────────────────────────────────────── */
  {
    id: 'enovis-facility', title: 'Operations facility build-out', kind: 'engineering', org: 'Enovis', years: [2025, 2026], month: 6, monthTbd: true,
    place: { name: 'Austin, TX', lat: 30.27, lon: -97.74 }, main: 'structure', also: ['reality'], featured: 'yes', stage: 'built', axes: ax(m(140), 0.95),
    summary: 'A 200K sq ft facility combining office, automated distribution, clean pack, sterilization and additive manufacturing, delivered as owner rep.',
    facts: ['200K sq ft', 'Budget over $10M', 'Utilities, equipment integration, controls, life safety', 'Next-phase expansion planning'],
    lens: {
      structure: '200K sq ft: office, automated distribution, clean pack, sterilization and additive manufacturing under one roof.',
      reality: 'The building he walks into every day, designed and built from the ground up.',
    },
    picture: { scene: 'facility' }, logo: LOGO.enovis, related: ['enovis', 'enovis-am'],
  },
  {
    id: 'enovis-am', title: 'Additive manufacturing center', kind: 'engineering', org: 'Enovis', years: [2025, 2026],
    place: { name: 'Austin, TX', lat: 30.27, lon: -97.74 }, main: 'structure', also: ['build'], featured: 'yes', stage: 'built', axes: ax(m(40), 0.84),
    summary: 'An industrial additive manufacturing center with EBM and SLS systems for patient-specific implants.',
    facts: ['EBM and SLS systems', 'Utilities, equipment siting, install sequencing', 'Material-flow layout', 'Production validation'],
    lens: {
      structure: 'EBM and SLS printers: utilities, siting, install sequencing, material flow and validation.',
      build: 'Empty room → utilities → printers sited and sequenced → validated for production.',
    },
    picture: { scene: 'renders' }, related: ['enovis-facility'],
  },
  {
    id: 'drymix', title: 'Automated dry mix plant', kind: 'engineering', org: 'MAPEI', years: [2022, 2023], tbd: true,
    place: { name: 'Houston, TX', lat: 29.76, lon: -95.37 }, main: 'structure', also: ['build', 'place'], featured: 'yes', stage: 'shipped', axes: ax(m(60), 0.9),
    summary: 'A ground-up automated dry mix production and packaging plant.',
    facts: ['European and North American vendors', 'Italian contractors for power and automation', 'Air permitting and FAA approval', 'On budget and on schedule'],
    lens: {
      structure: 'Silo tower, mixing, packaging: P&IDs, layouts and automation with European and Italian partners.',
      build: 'Schematics → equipment from two continents → installed → commissioned and started up.',
      place: 'Houston, travelled to from Dallas.',
    },
    picture: { scene: 'silo' }, related: ['sitedev', 'mapei-dallas'],
  },
  {
    id: 'palletizer', title: 'Robotic palletizer & bag applicator', kind: 'engineering', org: 'MAPEI', years: [2021, 2022], tbd: true,
    place: { name: 'Tempe, AZ', lat: 33.43, lon: -111.94 }, main: 'structure', also: ['build'], featured: 'yes', stage: 'shipped', axes: ax(m(6), 0.55),
    summary: 'Automated robotic palletizing and bag application added to a running dry mix plant.',
    facts: ['Doubled the plant\'s output capacity', 'Removed two manual operations', 'Prefab kept downtime minimal'],
    lens: {
      structure: 'A robot cell added to a running plant: pneumatics, electrical and mechanical, integrated live.',
      build: 'Doubled output and removed two manual steps.',
    },
    picture: { scene: 'cell' }, related: ['drymix'],
  },
  {
    id: 'sitedev', title: '315K sq ft site development', kind: 'engineering', org: 'MAPEI', years: [2022, 2024], tbd: true,
    place: { name: 'Houston, TX', lat: 29.76, lon: -95.37 }, main: 'structure', also: ['place'], featured: 'yes', stage: 'shipped', axes: ax(m(175), 0.66),
    summary: 'A speculative brownfield building turned into a full production and distribution facility.',
    facts: ['315K sq ft', 'Design-build', 'Vendor selection and contracts', 'Multiple concurrent projects'],
    lens: {
      structure: '315K sq ft of empty brownfield building turned into production and distribution.',
      place: 'Houston, travelled to from Dallas.',
    },
    picture: { scene: 'building' }, related: ['drymix'],
  },
  {
    id: 'staticmix', title: 'In-line static mixing process', kind: 'engineering', org: 'MAPEI', years: [2020, 2021], tbd: true,
    place: { name: 'Milan → Dallas', lat: 32.78, lon: -96.8 }, main: 'structure', also: ['build'], featured: 'yes', stage: 'shipped', axes: ax(m(2.5), 0.74),
    summary: 'The first production version of a new static mixing technology: prototyped in Milan, built in Dallas.',
    facts: ['Production time −35%', 'Manual operations removed', 'Enabled bulk material purchasing'],
    lens: {
      structure: 'A mixing skid procured from Europe and installed in Dallas: −35% production time.',
      build: 'Prototype and testing in Milan → first production version in Dallas.',
    },
    picture: { scene: 'capstone' }, related: ['mapei-milan'],
  },
  {
    id: 'liquid', title: 'Liquid admixtures plant expansion', kind: 'engineering', org: 'MAPEI', years: [2023, 2024], tbd: true,
    place: { name: 'Texas', lat: 32.78, lon: -96.8 }, main: 'structure', also: [], featured: 'yes', stage: 'shipped', axes: ax(m(25), 0.6),
    summary: 'A $5M expansion introducing automated blending and bulk transfer to the Southern U.S.',
    facts: ['$5M', 'Automated blending and bulk transfer', 'Design through commissioning and lifecycle'],
    lens: { structure: 'Automated blending and bulk transfer, new to the Southern U.S., $5M.' },
    picture: { scene: 'tanks' }, related: [],
  },
  ...[
    ['ev-fedex', 'FedEx Office HQ charging', 'Dallas, TX', 32.9, -96.8, '8 Enel X JuiceBox Pro 40 chargers on dual stands; trenching, concrete, electrical, permits.'],
    ['ev-stallion', 'Stallion fleet charging', 'Houston, TX', 29.76, -95.37, '5 Ford Pro 11.5 kW wall chargers across a campus; conduit, bollards, permits.'],
    ['ev-fortworth', 'Multifamily garage charging', 'Fort Worth, TX', 32.76, -97.33, '10 Xeal L2 chargers with power sharing to avoid electrical upgrades.'],
    ['ev-gateway', 'Gateway Cedars charging', 'Dallas, TX', 32.8, -96.75, 'Two dual-port ChargePoint CT4000s; electrical upgrades and permitting.'],
  ].map(([id, title, name, lat, lon, line]) => ({
    id, title, kind: 'engineering', org: 'OnlyChargeEV', years: [2023, 2024], tbd: true,
    place: { name, lat, lon }, main: 'structure', also: [], featured: 'maybe', stage: 'shipped', axes: ax(m(30), 0.4),
    summary: line, lens: { structure: line }, picture: { scene: 'charger' }, related: ['onlycharge'],
  })),

  /* ── Projects ───────────────────────────────────────────────────────────── */
  {
    id: 'onlycharge', title: 'OnlyChargeEV', kind: 'startup', org: 'Founder', years: [2022, 2024], month: 5, monthTbd: true,
    place: { name: 'Dallas, TX', lat: 32.78, lon: -96.8 }, main: 'build', also: ['reality', 'structure', 'digital'], featured: 'yes', stage: 'shipped',
    axes: { scale: m(30), complexity: 0.45, expressive: 0.3, experimental: 0.5, digital: 0.42, finished: 0.9 },
    summary: 'A commercial EV charging company across Austin, Houston, San Antonio and Dallas.',
    facts: ['Partners: ChargePoint, Ford Pro, Xeal Energy, Verdek', 'Commercial, fleet and multifamily', 'Automated payments, accounting, estimating and proposals'],
    lens: {
      build: 'Founded and scaled across four Texas cities; designed and installed the charging sites.',
      reality: '2022 – 2024 · started a company.',
      structure: 'Charging sites from site plan to trenching, power sharing and permits.',
      digital: 'Ran on automation: CRM, payments, accounting, estimating and proposals.',
    },
    picture: { scene: 'charger', logo: true }, logo: LOGO.onlycharge, related: ['ev-fedex', 'ev-stallion', 'ev-fortworth', 'ev-gateway'],
  },
  {
    id: 'fsae', title: 'Formula SAE electric racecar', kind: 'project', org: 'University of Kansas', years: [2017, 2018], month: 9, monthTbd: true,
    place: { name: 'Lawrence, KS', lat: 38.97, lon: -95.24 }, main: 'build', also: ['structure', 'reality'], featured: 'yes', stage: 'built', axes: ax(m(3), 0.8, 0.3, 0.6),
    summary: 'The electric powertrain for KU\'s Formula SAE racecar.',
    facts: ['Led 5 electrical engineers', 'In-house motor controller', 'Battery storage and management system', 'Raced at Formula SAE Electric'],
    lens: {
      build: 'Motor controller and battery system designed and built in-house, then raced.',
      structure: 'Powertrain integration across subsystems: SolidWorks, MATLAB, FEA.',
      reality: '2017 – 2018 · led a team of five on the car.',
    },
    picture: { scene: 'racecar' }, related: ['ku'],
  },
  {
    id: 'pedal', title: 'Assistive piano-pedal device', kind: 'project', org: 'KU biomechanical research', years: [2016, 2017], month: 1, monthTbd: true,
    place: { name: 'Lawrence, KS', lat: 38.97, lon: -95.24 }, main: 'build', also: ['structure', 'reality'], featured: 'yes', stage: 'shipped', axes: ax(m(0.5), 0.45, 0.45, 0.55),
    summary: 'Devices that let a paraplegic pianist operate the piano pedals.',
    facts: ['First time playing the pedals', 'Two additive prototypes, final part machined', 'Team of 4', 'National news coverage'],
    lens: {
      build: 'Two 3D-printed prototypes, then a machined final part.',
      structure: 'A pedal mechanism designed around one person\'s constraints.',
      reality: 'A pianist played the pedals for the first time.',
    },
    picture: { scene: 'piano' }, related: ['ku'], links: [{ label: 'News coverage (placeholder)', href: '#' }],
  },
  {
    id: 'resin1', title: 'Resin Light 1.0', kind: 'build', org: 'Personal', years: [2023, 2023], tbd: true,
    place: { name: 'Home workshop', lat: 32.78, lon: -96.8 }, main: 'build', also: ['image'], featured: 'yes', stage: 'prototype', axes: ax(m(0.3), 0.38, 0.14, 0.62),
    summary: 'First functional prototype of a cast-resin light: the resin is both the material and the diffuser, so the object glows.',
    facts: ['Mold design and resin casting', 'LED placement, diffusion, brightness', 'Heat management', 'Surface finish and assembly'],
    lens: {
      build: 'Built to learn how resin, light and the casting process behave in practice.',
      image: 'A glowing sculptural object instead of an exposed fixture.',
    },
    picture: { scene: 'resin', refined: false }, related: ['resin2'],
  },
  {
    id: 'resin2', title: 'Resin Light 2.0', kind: 'build', org: 'Personal', years: [2024, 2024], tbd: true,
    place: { name: 'Home workshop', lat: 32.78, lon: -96.8 }, main: 'build', also: ['image'], featured: 'yes', stage: 'built', axes: ax(m(0.3), 0.52, 0.1, 0.24),
    summary: 'A refined, production-intent version built on everything 1.0 taught.',
    facts: ['Form and lighting quality', 'Material consistency and repeatability', 'Durability, fit and finish', 'Designed to be manufactured and sold'],
    lens: {
      build: 'From a one-off prototype to a design that could realistically be manufactured and sold.',
      image: 'Cleaner form, more even glow.',
    },
    picture: { scene: 'resin', refined: true }, related: ['resin1'],
  },
  {
    id: 'ledwall', title: 'LED wall art', kind: 'build', org: 'Personal', years: [2022, 2022], tbd: true,
    place: { name: 'Home workshop', lat: 32.78, lon: -96.8 }, main: 'build', also: ['image', 'digital', 'structure'], featured: 'yes', stage: 'built',
    axes: { scale: m(1.2), complexity: 0.38, expressive: 0.24, experimental: 0.88, digital: 0.3, finished: 0.7 },
    summary: 'A series of wall pieces with concealed LEDs, layered structure and diffusers for a soft glow or gradient.',
    facts: ['Arduino controls and a custom circuit board', 'Bluetooth module', 'An app for behaviour, brightness and effects'],
    lens: {
      build: 'Designed and fabricated from the ground up, electronics hidden.',
      image: 'Soft glow and gradients from controlled spacing and diffusers.',
      digital: 'Arduino, a custom board, Bluetooth and an app to drive it.',
      structure: 'Layered structure that hides the LEDs and hardware.',
    },
    picture: { scene: 'led' }, related: ['atmos'],
  },

  /* ── Digital (apps) ───────────────────────────────────────────────────────────── */
  {
    id: 'contactflow', title: 'ContactFlow', kind: 'app', org: 'Personal', years: [2026, 2026],
    place: { name: 'Austin, TX', lat: 30.27, lon: -97.74 }, main: 'digital', also: [], featured: 'yes', stage: 'shipped', axes: ax(0.05, 0.7, 0.3, 0.5, 0.88, 0.86),
    summary: 'Paste messy people and company data; get contacts, domains, email patterns, ranked candidates and a CSV.',
    tech: 'TypeScript, React, Vite, Tailwind, Supabase, Claude', link: 'https://contact-flow-web.vercel.app',
    lens: { digital: 'Extract → find domains → discover email patterns → rank → verify → export.' },
    picture: { scene: 'app', label: 'ContactFlow', layout: 'table', accent: '#3d7be8' }, logo: LOGO.contactflow, related: [],
  },
  {
    id: 'jobpaper', title: 'JobPaper', kind: 'app', org: 'Personal', years: [2026, 2026],
    place: { name: 'Austin, TX', lat: 30.27, lon: -97.74 }, main: 'digital', also: [], featured: 'yes', stage: 'shipped', axes: ax(0.06, 0.66, 0.3, 0.5, 0.8, 0.72),
    summary: 'A ChatGPT app that turns contractor notes and photos into estimates, change orders and job reports.',
    tech: 'TypeScript, MCP, ChatGPT Apps, jsPDF, Vercel', link: 'https://job-paper.vercel.app',
    lens: { digital: 'Notes and photos in, editable documents and PDFs out.', structure: 'Built from years of running construction projects.' },
    picture: { scene: 'app', label: 'JobPaper', layout: 'doc', accent: '#c2552d' }, related: ['roomai', 'llm'],
  },
  {
    id: 'collateral', title: 'Collateral Damage', kind: 'app', org: 'Personal', years: [2026, 2026],
    place: { name: 'Austin, TX', lat: 30.27, lon: -97.74 }, main: 'digital', also: ['image'], featured: 'yes', stage: 'shipped', axes: ax(0.06, 0.76, 0.26, 0.4, 0.96, 0.6),
    summary: 'An interactive simulation explaining collateral-damage estimation with a paper city and Monte Carlo runs.',
    tech: 'TypeScript, Vite, simulation workers', link: 'https://collateral-damage.vercel.app',
    lens: { digital: 'Adjustable strike parameters, Monte Carlo runs, population estimates.', structure: 'A simulation model made explainable.', image: 'A city made of paper.' },
    picture: { scene: 'app', label: 'Collateral Damage', layout: 'city', accent: '#d9b37a' }, related: [],
  },
  {
    id: 'atmos', title: 'Atmos Studio', kind: 'app', org: 'Personal', years: [2026, 2026],
    place: { name: 'Austin, TX', lat: 30.27, lon: -97.74 }, main: 'digital', also: ['image'], featured: 'yes', stage: 'shipped', axes: ax(0.05, 0.6, 0.24, 0.66, 0.94, 0.84),
    summary: 'A nature-inspired gradient studio: 87 gradients, mesh editing, weather, Live Sky, photo palettes and AI generation.',
    tech: 'TypeScript, React, Vite, Supabase, Claude', link: 'https://gradient-ui.vercel.app',
    lens: { digital: 'Mesh editing, animation, Live Sky and palette extraction from photos.', image: '87 gradients taken from nature.' },
    picture: { scene: 'app', label: 'Atmos Studio', layout: 'gradient', accent: '#ff7a45' }, related: ['ledwall'],
  },
  {
    id: 'roomai', title: 'RoomAI', kind: 'app', org: 'Personal', years: [2025, 2025],
    place: { name: 'Austin, TX', lat: 30.27, lon: -97.74 }, main: 'digital', also: [], featured: 'yes', stage: 'prototype', axes: ax(0.08, 0.72, 0.3, 0.7, 0.66, 0.42),
    summary: 'Photograph a room; segmentation finds walls, floors, windows and doors and estimates materials and cost.',
    tech: 'Image segmentation (SAM), web app', link: 'https://luminous-horse-8a5278.netlify.app',
    lens: { digital: 'Segmentation turns one photo into quantities and costs.', structure: 'Takeoffs without a tape measure.' },
    picture: { scene: 'app', label: 'RoomAI', layout: 'segment', accent: '#5cf2b0' }, related: ['jobpaper', 'llm'],
  },
  {
    id: 'llm', title: 'Construction LLM', kind: 'app', org: 'Personal', years: [2025, 2025],
    place: { name: 'Austin, TX', lat: 30.27, lon: -97.74 }, main: 'digital', also: [], featured: 'yes', stage: 'prototype', axes: ax(0.04, 0.82, 0.25, 0.8, 0.82, 0.24),
    summary: 'Scraped and cleaned thousands of construction datasheets, then fine-tuned a quantized Llama model on them.',
    tech: 'Python, Llama 3.x, fine-tuning, quantization, scraping', link: '',
    lens: { digital: 'Scrape → clean → fine-tune → quantize: a construction-focused model, running locally.', structure: 'Thousands of datasheets as training data.' },
    picture: { scene: 'app', label: 'construction-llm', layout: 'terminal', accent: '#9b5cff' }, related: ['jobpaper', 'roomai'],
  },
  {
    // Details to come from Grant (what it models, tech, year, link); wording kept general until then.
    id: 'twin', title: 'Factory digital twin', kind: 'app', org: 'Personal', years: [2026, 2026], tbd: true,
    place: { name: 'Austin, TX', lat: 30.27, lon: -97.74 }, main: 'digital', also: [], featured: 'yes', stage: 'prototype', axes: ax(0.05, 0.8, 0.3, 0.6, 0.56, 0.56),
    summary: 'A live digital model of a factory: equipment, layout and flow.',
    tech: '', link: '',
    lens: { digital: 'The factory floor as software: equipment, layout and flow in one model.' },
    picture: { scene: 'app', label: 'Factory twin', layout: 'twin', accent: '#3fd0ff' }, related: [],
  },
];

// Every film is an artifact too: a stack in Art, a trip on the Travel map.
for (const f of films) {
  artifacts.push({
    id: f.id, title: f.title, kind: 'film', org: '35mm film', years: [f.year, f.year],
    place: { name: f.place, lat: f.lat, lon: f.lon }, main: 'image', also: ['place'],
    featured: 'yes', stage: 'shipped', axes: ax(0.6, 0.3, f.axes.expressive, f.axes.experimental, 0.1, 0.9),
    summary: `${f.count} photographs on 35mm film.`, lens: { image: `${f.count} frames.`, place: f.place },
    picture: { film: f.id }, related: [], film: f,
  });
}

// And every place lived: a home on the Travel map.
for (const h of homes) {
  artifacts.push({
    id: h.id, title: h.name, kind: 'place', org: h.note, years: h.years,
    place: { name: h.name, lat: h.lat, lon: h.lon }, main: 'place', also: [], featured: 'yes', stage: 'shipped', axes: ax(0.9, 0.3),
    summary: h.note, lens: { place: `${h.years[0] ? `${h.years[0]} – ` : 'Until '}${h.years[1] === 2026 ? 'now' : h.years[1]} · ${h.note}.` },
    picture: { scene: 'home', town: !!h.town }, related: [], home: h, phone: h.phone,
  });
}

/** Where Grant was living in `year`. */
export const homeIn = (year) => homes.find((h) => (h.years[0] ?? 0) <= year && year < h.years[1]) ?? homes[homes.length - 1];

// What happened while each place was home: the work based there, and the trips taken from it.
const near = (p, h) => Math.abs(p.lat - h.lat) < 1.5 && Math.abs(p.lon - h.lon) < 1.5;
const during = (y, h) => y[0] < h.years[1] && y[1] >= (h.years[0] ?? 0);
for (const a of artifacts) {
  if (!a.home) continue;
  // Lived and worked there: the map frames the dot in the "worked" square.
  a.worked = artifacts.some((b) => b.kind === 'role' && near(b.place, a.home) && during(b.years, a.home));
  a.related = artifacts
    .filter((b) => !b.home && (b.featured === 'yes' || b.kind === 'role'))
    .filter((b) => (b.film ? homeIn(b.film.year) === a.home : near(b.place, a.home) && during(b.years, a.home)))
    .sort((x, y) => !!x.film - !!y.film || x.years[0] - y.years[0])
    .map((b) => b.id);
}

/** Is `a` shown in `mode`? Main section or crossover, on stage (featured yes). */
export const inSection = (a, mode) => a.featured === 'yes' && (a.main === mode || a.also.includes(mode));
/** In the section's "+ more" list. */
export const inMore = (a, mode) => a.featured === 'maybe' && (a.main === mode || a.also.includes(mode));
