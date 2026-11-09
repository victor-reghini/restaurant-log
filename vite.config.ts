import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { localApiPlugin } from './src/server/localApiPlugin';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), localApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: false,
    host: '0.0.0.0',
  },
});
