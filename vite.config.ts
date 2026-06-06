import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      input: {
        toolbar: resolve(__dirname, 'src/toolbar/index.html'),
        canvas: resolve(__dirname, 'src/canvas/index.html'),
      },
    },
  },
});
