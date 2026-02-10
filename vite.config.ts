import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    // Code Splitting - 優化打包大小
    rollupOptions: {
      output: {
        manualChunks: {
          // React 核心
          'vendor-react': ['react', 'react-dom'],
          // 圖示庫
          'vendor-icons': ['lucide-react'],
          // 管理後台 (延遲載入)
          'admin': [
            './components/admin/AdminSidebar',
            './components/admin/OverviewTab',
            './components/admin/UsersTab',
            './components/admin/AuditTab',
            './components/admin/SettingsModal',
          ],
        },
      },
    },
    // 提高 chunk size 警告門檻
    chunkSizeWarningLimit: 600,
  },
});
