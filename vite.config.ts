import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { stockProxyPlugin } from './vite-plugin-stock-proxy'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ============================================================
// 🔧 项目基础路径 —— 只改这里，全站生效
//    空字符串 = 根路径部署（自定义域名 / 本地开发）
//    '/a-stock-picker/' = GitHub Pages 子目录部署
// ============================================================
const BASE_PATH = '/a-stock-picker/'

export default defineConfig({
  plugins: [
    react(),
    stockProxyPlugin(),  // 本地股票数据代理（绕过 eastmoney DNS 问题）
  ],
  base: BASE_PATH,
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/a-stock-picker/api/em-push2': {
        target: 'https://push2.eastmoney.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/a-stock-picker\/api\/em-push2/, ''),
      },
      '/a-stock-picker/api/em-push2his': {
        target: 'https://push2his.eastmoney.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/a-stock-picker\/api\/em-push2his/, ''),
      },
      '/a-stock-picker/api/em-data': {
        target: 'https://datacenter-web.eastmoney.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/a-stock-picker\/api\/em-data/, ''),
      },
    },
  },
})
