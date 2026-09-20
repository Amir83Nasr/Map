import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  base: './',
  server: { host: true, port: 3000 },
  optimizeDeps: { exclude: ['maplibre-gl/dist/maplibre-gl-worker.mjs'] },
});
