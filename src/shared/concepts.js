// The concept mocks: the original six in ranked order, then the follow-ups.
// Used by the gallery and the shared chrome.
export const concepts = [
  {
    id: 'scale',
    name: 'Scale',
    score: '9.8',
    line: 'Navigation changes your physical scale.',
    detail:
      'No page loads. Picking a section flies the camera through continuous scale: out past the room, the city, and the planet for Travel; down into the machine for Engineering; through the screen for Apps.',
  },
  {
    id: 'viewport',
    name: 'Viewport Modes',
    score: '9.7',
    line: 'One viewport. The renderer itself changes.',
    detail:
      'Like switching from shaded to wireframe in CAD. Reality, Structure, Build, Image, Place, Digital — the same objects, re-rendered in a different visual language each time.',
  },
  {
    id: 'coordinates',
    name: 'Coordinate System',
    score: '9.5',
    line: 'Each section re-plots the same work on new axes.',
    detail:
      'Engineering plots scale against complexity. Art plots functional against expressive. Travel turns the grid into a real map. About throws the axes away and arranges everything by time, around you.',
  },
  {
    id: 'layers',
    name: 'Layers',
    score: '9.4',
    line: 'Nothing moves. Layers turn on and off.',
    detail:
      'One object, one camera. Each section is a preset of CAD-style layers: the shell fades to 10% and structure appears, or every technical mark disappears and the materials and light come back.',
  },
  {
    id: 'translation',
    name: 'Translation',
    score: '9.2',
    line: 'One project, translated into six languages.',
    detail:
      'Pick a project, then see it as an engineer, a maker, an artist, a traveller, a person, or a piece of software. The information changes form, not just style.',
  },
  {
    id: 'morph',
    name: 'Object Morphing',
    score: '8.9',
    line: 'One object of twenty parts becomes everything.',
    detail:
      'Twenty triangular plates. Closed, they are a simple object. They explode into an assembly, rebuild into an arch, fan into a sculpture, unfold into a world map, and tile into a screen.',
  },
  {
    id: 'lens',
    name: 'Lens',
    score: 'new',
    line: 'The work, re-plotted and re-rendered for every section.',
    detail:
      'Coordinates decide where each piece of work sits; viewport modes decide how it looks. A render line sweeps across and redraws everything: linework for Engineering, clay for Projects, film stills for Art, a map for Travel, ASCII for Apps. Open any project and the same tabs translate it.',
  },
];
