import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
  plugins: [react()],
  optimizeDeps: { include: ['react', 'react-dom/client', '@base-ui/react/dialog', '@base-ui/react/button'] },
  resolve: { dedupe: ['react', 'react-dom'], alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  css: { postcss: { plugins: [tailwindcss()] } },
  server: { host: '127.0.0.1', watch: { usePolling: true } },
});
