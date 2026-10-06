import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Multi-page build: a gallery at the root plus one standalone page per concept.
// Pages whose entry script doesn't exist yet are skipped, so the build stays green
// while mocks land one at a time.
export const concepts = ['scale', 'viewport', 'coordinates', 'layers', 'translation', 'morph'];
const root = import.meta.dirname;
const ready = concepts.filter((c) => existsSync(resolve(root, c, 'index.html')) && existsSync(resolve(root, 'src', c, 'main.js')));

export default defineConfig({
  // Relative base so the build works on GitHub Pages (/grantsacco/) or a custom domain.
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        ...Object.fromEntries(ready.map((c) => [c, resolve(root, c, 'index.html')])),
      },
    },
  },
});
