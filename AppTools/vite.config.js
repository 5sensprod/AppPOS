// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Permet d'utiliser JSX dans des fichiers .js
      include: '**/*.{jsx,js}',
    }),
  ],
  base: process.env.NODE_ENV === 'production' ? './' : '/',
  server: {
    // Exposer le serveur sur le réseau local
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Configuration du proxy pour éviter les problèmes CORS
    proxy: {
      // Routes API spécifiques
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/test': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
