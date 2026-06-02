import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';
export default defineConfig({
  base: './',
  plugins: [
    legacy({
      // KaiOS 2.5 = Gecko 48 (Firefox 48 era)
      targets: ['firefox >= 48', 'chrome >= 49'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      renderLegacyChunks: true,
      modernPolyfills: true,
    }),
  ],
  build: {
    target: 'es5',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: { passes: 2, drop_console: true },
      format:   { comments: false },
    },
    chunkSizeWarningLimit: 2048,
  },
  server: {
    port: 5173,
    open: true,
  },
});
