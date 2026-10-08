// Lens (v2): one quiet, consistent palette instead of six themed ones.
// Most sections are ink on paper; Art (the darkroom) and Digital (the
// terminal) invert, so the render line still turns the page as it passes.
// A single calm blue is the only accent; the pictures carry the colour.
const paper = { bg: '#f4f3f0', ink: '#151515', muted: '#77756f', accent: '#2c55c9' };
const night = { bg: '#101010', ink: '#ecebe7', muted: '#8d8b86', accent: '#93adf5' };

export const PALETTE = {
  reality: paper,
  structure: paper,
  build: paper,
  image: night,
  place: paper,
  digital: night,
};
