// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react'],
          'utils-vendor': ['date-fns', 'date-fns/locale/th'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    exclude: ['lucide-react'], // เพิ่มนี้เพื่อป้องกัน optimize ผิด
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'date-fns',
      'date-fns/locale/th',
    ],
  },
});