import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Percorsi relativi: la build funziona sia alla radice sia in una sottocartella.
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 3001,
  },
  preview: {
    host: '0.0.0.0',
    port: 3001,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
