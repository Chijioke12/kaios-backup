import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    legacy({
      targets: ['firefox 48'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime']
    }),
  ],
  build: {
    target: 'es5',
    minify: 'terser',
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  server: {
    port: 3001,
    open: false
  }
});
