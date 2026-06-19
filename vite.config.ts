/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In dev, proxy the optional message-check API to a locally running
    // `npm start` server (server.js). In production server.js serves both.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Recharts is inherently large and is a core (not lazy) dependency here.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Split large vendor libs into their own chunks for better caching.
        manualChunks: {
          react: ['react', 'react-dom'],
          reactflow: ['@xyflow/react'],
          charts: ['recharts'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
