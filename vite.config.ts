import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Saída em "dist" (padrão do Vite) — pronto para deploy na Hostinger
// ou em qualquer host de arquivos estáticos.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    // Minifier padrão do Vite (esbuild). Remove console.* e debugger em prod
    // para não vazar dado nem poluir DevTools.
    minify: 'esbuild',
    sourcemap: false,
    target: 'es2020',
  },
  esbuild: {
    // Only strip in build; dev keeps them.
    drop: ['console', 'debugger'],
  },
});
