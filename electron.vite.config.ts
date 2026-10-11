import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';
import type { Plugin } from 'vite';

/**
 * The renderer's CSP forbids inline scripts. Vite's dev server injects an
 * inline React Refresh preamble, so relax script-src for `electron-vite dev`
 * only; production builds keep the strict policy from index.html.
 */
function devCsp(): Plugin {
  return {
    name: 'arcade-dev-csp',
    apply: 'serve',
    transformIndexHtml: (html) => html.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'"),
  };
}

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    plugins: [react(), devCsp()],
  },
});
