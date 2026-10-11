import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Project site: https://nowfal-243.github.io/FINAL-PROJECT/
  // Must be an absolute sub-path so assets resolve under /FINAL-PROJECT/.
  base: '/FINAL-PROJECT/',
  server: {
    port: 3000,
    host: true,
  },
});
