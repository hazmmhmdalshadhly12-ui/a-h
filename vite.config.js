import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' — علشان GitHub Pages يشتغل من مسار فرعي زي /vision-academy/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    open: true,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000
  }
});
