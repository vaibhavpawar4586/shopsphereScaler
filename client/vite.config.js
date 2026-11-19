import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development, /api requests go to the Express server, so the browser sees one origin.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
