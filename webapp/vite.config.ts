import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 11025,
    proxy: {
      '/api': 'http://127.0.0.1:11024',
      '/sse': 'http://127.0.0.1:11024',
      '/mcp': 'http://127.0.0.1:11024',
    },
  },
});
