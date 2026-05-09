import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { stockProxyPlugin } from './vite-plugin-stock-proxy'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ============================================================
// 🔧 自动读取 .env 文件中的 VITE_BASE_PATH
//    开发模式 (.env)          → VITE_BASE_PATH=''
//    生产构建 (.env.production) → VITE_BASE_PATH='/a-stock-picker/'
// ============================================================
export default defineConfig(({ mode }) => {
  // 加载对应 mode 的 .env 文件
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const BASE_PATH = env.VITE_BASE_PATH || ''

  return {
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
        // 根据 BASE_PATH 动态生成代理路径
        [`${BASE_PATH}api/em-push2`.replace(/\/$/, '')]: {
          target: 'https://push2.eastmoney.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(new RegExp(`^${BASE_PATH.replace(/\/$/, '')}/api/em-push2`), ''),
        },
        [`${BASE_PATH}api/em-push2his`.replace(/\/$/, '')]: {
          target: 'https://push2his.eastmoney.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(new RegExp(`^${BASE_PATH.replace(/\/$/, '')}/api/em-push2his`), ''),
        },
        [`${BASE_PATH}api/em-data`.replace(/\/$/, '')]: {
          target: 'https://datacenter-web.eastmoney.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(new RegExp(`^${BASE_PATH.replace(/\/$/, '')}/api/em-data`), ''),
        },
      },
    },
  }
})
