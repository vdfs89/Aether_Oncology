import { defineConfig } from 'vite';
import { resolve } from 'path';

/**
 * Aether Oncology | Vite Configuration
 * Optimized for high-performance clinical portal delivery.
 */
export default defineConfig({
  root: 'src/static/aether-oncology-portal',
  base: './',
  build: {
    outDir: resolve(__dirname, 'src/static/aether-oncology-portal/dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/static/aether-oncology-portal/index.html'),
        privacy: resolve(__dirname, 'src/static/aether-oncology-portal/privacy.html'),
        terms: resolve(__dirname, 'src/static/aether-oncology-portal/terms.html')
      },
      output: {
        entryFileNames: 'js/[name].[hash].js',
        chunkFileNames: 'js/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.css')) return 'css/[name].[hash][extname]';
          return 'assets/[name].[hash][extname]';
        }
      }
    },
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    cssCodeSplit: true,
    sourcemap: false
  },
  server: {
    port: 3000,
    open: true,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});
