import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const reactSrc = (p: string): string =>
  decodeURIComponent(new URL(`../packages/react/src/${p}`, import.meta.url).pathname);

export default defineConfig({
  plugins: [react()],
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
