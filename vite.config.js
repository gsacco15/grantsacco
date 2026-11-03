import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// The site is one page: Lens (v2) at the root. The earlier concept mocks stay in
// the repo for reference (each still runs in `npm run dev` at /<name>/) but are
// not built or linked from the site.
export const concepts = ['scale', 'viewport', 'coordinates', 'layers', 'translation', 'morph', 'lens', 'lens2'];
const root = import.meta.dirname;

export default defineConfig({
  // Relative base so the build works on any host or a custom domain.
  base: './',
  build: {
    rollupOptions: {
      input: { main: resolve(root, 'index.html') },
    },
  },
});
