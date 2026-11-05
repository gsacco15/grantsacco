import { resolve } from 'node:path';
import { createServer, defineConfig } from 'vite';
import { renderWorkList } from './scripts/work-list.js';

// The site is Lens (v2) at the root, plus /work/: every project as a plain list. The earlier concept mocks stay in
// the repo for reference (each still runs in `npm run dev` at /<name>/) but are
// not built or linked from the site.
export const concepts = ['scale', 'viewport', 'coordinates', 'layers', 'translation', 'morph', 'lens', 'lens2'];
const root = import.meta.dirname;

/**
 * /work/ is plain HTML filled in from the site's own content (src/lens/artifacts.js
 * and src/content.js) wherever the page carries <!--work-list-->: through the dev
 * server while developing, and through a short-lived one at build time.
 */
function workList() {
  let dev = null;
  return {
    name: 'work-list',
    configureServer(server) {
      dev = server;
    },
    async transformIndexHtml(html) {
      if (!html.includes('<!--work-list-->')) return html;
      const temp = dev ? null : await createServer({ configFile: false, root, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false } });
      const vite = dev ?? temp;
      try {
        const data = await vite.ssrLoadModule('/src/lens/artifacts.js');
        const content = await vite.ssrLoadModule('/src/content.js');
        return html.replace('<!--work-list-->', renderWorkList(data, content));
      } finally {
        await temp?.close();
      }
    },
  };
}

export default defineConfig({
  // Relative base so the build works on any host or a custom domain.
  base: './',
  plugins: [workList()],
  build: {
    rollupOptions: {
      input: { main: resolve(root, 'index.html'), work: resolve(root, 'work/index.html') },
    },
  },
});
