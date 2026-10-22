import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' keeps the build portable for any static host or subfolder.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
