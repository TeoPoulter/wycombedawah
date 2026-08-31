import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: '/1/',
  publicDir: command === 'serve' ? resolve(import.meta.dirname, '../1') : false,
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  build: {
    outDir: resolve(import.meta.dirname, '../1'),
    emptyOutDir: false,
    rollupOptions: {
      input: {
        host: resolve(import.meta.dirname, 'index.html'),
        join: resolve(import.meta.dirname, 'join/index.html'),
        admin: resolve(import.meta.dirname, 'admin/index.html')
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
}));
