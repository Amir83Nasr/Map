import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({ entryRoot: 'src', outDir: 'dist' })],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'QomPick',
      formats: ['es', 'cjs'],
      fileName: (f) => (f === 'es' ? 'qompick-core.js' : 'qompick-core.cjs'),
    },
    rollupOptions: {
      external: ['maplibre-gl'],
    },
    cssCodeSplit: false,
  },
});
