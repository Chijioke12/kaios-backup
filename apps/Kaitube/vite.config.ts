import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  base: './',
  plugins: [
    legacy({
      targets: ['firefox 48'],
      polyfills: true,
    }),
  ],
  build: {
    outDir: 'dist-vite',
    emptyOutDir: true,
    target: 'es5',
    minify: 'terser',
    rollupOptions: {
      output: {
        entryFileNames: `[name].js`,
        chunkFileNames: `[name].js`,
        assetFileNames: `[name].[ext]`
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001' // Assuming we move the express server to 3001
    }
  }
});
