import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// /api 开发代理到本地后端（T0.3）；生产由 Nginx 同域反代，前端一律用相对路径 /api/v1
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
