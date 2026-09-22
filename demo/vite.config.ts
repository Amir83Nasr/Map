import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const reactSrc = (p: string): string =>
  decodeURIComponent(new URL(`../packages/react/src/${p}`, import.meta.url).pathname);

// MapLibre resolves the worker via import.meta.url (sibling of the main chunk).
// Vite inlines maplibre-gl, so ship worker + shared next to assets/*.js.
const MAPLIBRE_WORKER_FILES = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'] as const;

function maplibreWorkerAssets(): Plugin {
  let outDir = 'dist';
  let configRoot = process.cwd();
  return {
    name: 'maplibre-worker-assets',
    configResolved(config) {
      outDir = config.build.outDir;
      configRoot = config.root;
    },
    closeBundle() {
      const require = createRequire(join(configRoot, 'package.json'));
      const distDir = dirname(require.resolve('maplibre-gl/dist/maplibre-gl-worker.mjs'));
      const absOut = join(configRoot, outDir);
      const dirs = [absOut];
      const assets = join(absOut, 'assets');
      if (existsSync(assets)) dirs.push(assets);
      for (const dir of dirs) {
        mkdirSync(dir, { recursive: true });
        for (const name of MAPLIBRE_WORKER_FILES) {
          copyFileSync(join(distDir, name), join(dir, name));
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), maplibreWorkerAssets()],
  base: './',
  server: { port: 5500, host: true },
  optimizeDeps: { exclude: ['maplibre-gl'] },
  resolve: {
    alias: {
      'qompick-react/styles.css': reactSrc('styles.css'),
      'qompick-react': reactSrc('index.tsx'),
    },
  },
});
