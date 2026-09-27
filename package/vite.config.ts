import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({ entryRoot: 'src', outDir: 'dist', include: ['src'] })],
  build: {
    lib: {
      entry: 'src/index.tsx',
      name: 'QomPickReact',
      formats: ['es', 'cjs'],
      fileName: (f) => (f === 'es' ? 'qompick-react.js' : 'qompick-react.cjs'),
    },
    rollupOptions: {
      external: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'maplibre-gl'],
      // ponytail: package renamed to @amir83nasr/map so Vite would emit dist/map.css;
      // pin legacy name until artifacts are renamed deliberately (exports map shields users).
      output: { assetFileNames: 'qompick-react[extname]' },
    },
    cssCodeSplit: false,
    // Inline the IRANYekanX woff2 (<100kB) into styles.css — one self-contained CSS file.
    assetsInlineLimit: 100_000,
  },
});
