// Layer definitions, section presets and palettes for the Layers concept.
// A preset is nothing more than a set of layer opacities plus a palette.

export const LAYERS = [
  { id: 'shell', name: 'Shell', desc: 'exterior · materials' },
  { id: 'structure', name: 'Structure', desc: 'internal components' },
  { id: 'edges', name: 'Edges', desc: 'outlines · hidden lines' },
  { id: 'dims', name: 'Dimensions', desc: 'measured · mm' },
  { id: 'process', name: 'Process', desc: 'sketch · assembly · rev' },
  { id: 'light', name: 'Light', desc: 'key light · grain' },
  { id: 'notes', name: 'Notes', desc: 'handwritten' },
  { id: 'places', name: 'Places', desc: 'film strip · route' },
  { id: 'connections', name: 'Connections', desc: 'software graph' },
];

export const PRESETS = {
  reality: { shell: 1, notes: 1 },
  structure: { shell: 0.1, structure: 1, edges: 1, dims: 1 },
  build: { shell: 0.3, structure: 1, process: 1 },
  image: { shell: 1, light: 1 },
  place: { shell: 1, places: 1 },
  digital: { shell: 0.2, edges: 1, connections: 1 },
};

// Switcher items. Ids match the shared mode ids so hashes line up across mocks.
export const SECTIONS = [
  { id: 'reality', label: 'About', sub: 'shell · notes' },
  { id: 'structure', label: 'Engineering', sub: 'x-ray · dims' },
  { id: 'build', label: 'Projects', sub: 'process' },
  { id: 'image', label: 'Art', sub: 'light' },
  { id: 'place', label: 'Travel', sub: 'places' },
  { id: 'digital', label: 'Digital', sub: 'connections' },
];

/*
 * Palettes. bg/ink/muted/accent drive both CSS and WebGL.
 * clay   — the neutral that internal parts are tinted toward
 * mono   — how far internal parts are pulled from real materials to clay
 * film   — how far the internal film strip is tinted to the accent
 * env    — studio environment strength (the Light layer then darkens it)
 * shadow — contact-shadow strength
 */
export const PALETTES = {
  reality: { bg: '#ebe5d9', ink: '#211c17', muted: '#7b7164', accent: '#b4532b', clay: '#d8cfbf', mono: 0.2, film: 0, env: 1, shadow: 0.34 },
  structure: { bg: '#eef1f2', ink: '#14212d', muted: '#66737f', accent: '#d2382b', clay: '#e4e9ec', mono: 0.92, film: 1, env: 1.05, shadow: 0.16 },
  build: { bg: '#27282a', ink: '#ebe7df', muted: '#9a958c', accent: '#ff6b1a', clay: '#8a8a88', mono: 0.85, film: 0.8, env: 0.8, shadow: 0.5 },
  image: { bg: '#0b0a09', ink: '#f0e7d9', muted: '#8f8678', accent: '#e8b06f', clay: '#4a4642', mono: 0, film: 0, env: 0.9, shadow: 0.6 },
  place: { bg: '#0c1626', ink: '#e6eaf1', muted: '#8391a6', accent: '#f4a63a', clay: '#5d6c82', mono: 0.4, film: 0, env: 0.85, shadow: 0.55 },
  digital: { bg: '#050907', ink: '#c6f4da', muted: '#5d8c73', accent: '#5cffae', clay: '#24402f', mono: 1, film: 1, env: 0.7, shadow: 0.6 },
};
