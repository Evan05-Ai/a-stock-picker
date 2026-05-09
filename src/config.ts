/**
 * 全局配置
 */

/** 基础路径 —— 与 vite.config.ts 保持一致 */
export const BASE_PATH = '/a-stock-picker/'

/**
 * 东方财富接口基础路径
 * - 开发环境(VITE_DEV): 走 Vite 代理（绕过浏览器DNS问题）
 * - 生产环境: 走直连（JSONP 方式）
 */
const IS_DEV = import.meta.env.DEV

export const API_PREFIX = IS_DEV
  ? {
      push2: '/a-stock-picker/api/em-push2',
      push2his: '/a-stock-picker/api/em-push2his',
      datacenter: '/a-stock-picker/api/em-data',
    }
  : {
      push2: 'https://push2.eastmoney.com',
      push2his: 'https://push2his.eastmoney.com',
      datacenter: 'https://datacenter-web.eastmoney.com',
    }

/** 请求超时 (ms) */
export const REQUEST_TIMEOUT = 10_000

/** 推荐股票数量 */
export const TOP_N_RECOMMEND = 10

/** 排除的股票前缀 (科创板 688) */
export const EXCLUDED_PREFIXES = ['688']

/** 排除 ST 股票 */
export const EXCLUDE_ST = true
