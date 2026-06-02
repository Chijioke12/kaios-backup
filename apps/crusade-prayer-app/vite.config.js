import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    preact(),
    legacy({
      targets: ['firefox 48'],
      polyfills: true
    })
  ],
  build: {
    outDir: 'dist',
    target: 'es2015',
    minify: 'terser'
  }
});
