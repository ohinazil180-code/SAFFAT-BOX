import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // The app runs Vite behind a custom Express HTTP server. That server
      // does not proxy Vite's HMR upgrade endpoint, so the injected Vite
      // client can otherwise open a socket that immediately closes.
      hmr: false,
      watch: null,
    },
  };
});
