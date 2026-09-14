import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // When running `vercel dev` this isn't needed, but this keeps
      // `npm run dev` usable against a locally running API on :3000.
      '/api': 'http://localhost:3000',
    },
  },
});
