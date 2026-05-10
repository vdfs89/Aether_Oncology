import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src/static/aether-oncology-portal',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/static/aether-oncology-portal/index.html'),
        privacy: resolve(__dirname, 'src/static/aether-oncology-portal/privacy.html'),
        terms: resolve(__dirname, 'src/static/aether-oncology-portal/terms.html')
      },
      output: {
        manualChunks: {
          chartjs: ['chart.js']
        }
      }
    },
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true
  },
  server: {
    proxy: {
      '/predict': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/audit': 'http://localhost:8000'
    }
  }
});
