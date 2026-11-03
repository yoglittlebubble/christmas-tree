import { defineConfig } from 'vite'

export default defineConfig({
  // 预构建缓存放在项目内，避免往系统临时目录写文件
  cacheDir: '.vite-cache',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
})
