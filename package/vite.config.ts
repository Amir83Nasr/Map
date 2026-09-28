import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({ entryRoot: 'src', outDir: 'dist', include: ['src'] })],
  build: {
    lib: {
      entry: 'src/index.tsx',
      name: 'AmirMap',
      formats: ['es', 'cjs'],
      fileName: (f) => (f === 'es' ? 'index.js' : 'index.cjs'),
    },
    rollupOptions: {
      external: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'maplibre-gl'],
      output: { assetFileNames: 'styles[extname]' },
    },
    cssCodeSplit: false,
    // Inline the IRANYekanX woff2 (<100kB) into styles.css — one self-contained CSS file.
    assetsInlineLimit: 100_000,
  },
});
