import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({ entryRoot: 'src', outDir: 'dist' })],
  build: {
    lib: {
      entry: 'src/index.tsx',
      name: 'QomPickReact',
      formats: ['es', 'cjs'],
      fileName: (f) => (f === 'es' ? 'qompick-react.js' : 'qompick-react.cjs'),
    },
    rollupOptions: { external: ['react', 'react-dom', 'maplibre-gl', 'qompick-core'] },
  },
});
