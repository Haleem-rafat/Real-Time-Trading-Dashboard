import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const r = (p: string) => path.resolve(__dirname, p);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': r('src'),
      '@app': r('src/app'),
      '@store': r('src/store'),
      '@components': r('src/components'),
      '@assets': r('src/assets'),
      '@hooks': r('src/hooks'),
      '@UI': r('src/shared/UI'),
      '@services': r('src/app/api/services'),
      '@servicesTypes': r('src/app/api/types'),
      '@constants': r('src/app/constants'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
