/**
 * 东方财富 API 封装
 * 数据字段映射参考: https://push2.eastmoney.com
 */
import { API_PREFIX } from '@/config'
import { fetchJSON, fetchJSONP } from './request'
import { fetchStockQuoteTencent, fetchMarketIndicesTencent, fetchStockListTencent, searchStockTencent, fetchKLineDataSina } from './tencent'
import type { StockQuote, KLineData, MarketIndex, MoneyFlow, MarketSentiment, EMStockListItem } from '@/types/stock'

// ─── 市场代码映射 ───
function getSecId(code: string, market?: string): string {
  if (market) return `${market}.${code}`
  if (code.startsWith('6') || code.startsWith('5')) return `1.${code}`
  if (code.startsWith('0') || code.startsWith('3') || code.startsWith('1')) return `0.${code}`
  if (code.startsWith('8') || code.startsWith('4')) return `0.${code}`
  return `0.${code}`
}

// ─── 实时行情（单只） ───
interface EMQuoteRaw {
  f43: number; f44: number; f45: number; f46: number; f47: number; f48: number
  f50: number; f51: number; f52: number; f55: number; f57: string; f58: string
  f60: number; f116: number; f117: number; f162: number; f167: number
  f168: number; f169: number; f170: number; f171: number
}

export async function fetchStockQuote(code: string): Promise<StockQuote> {
  // 开发环境走本地代理（腾讯数据源）
  if (import.meta.env.DEV) {
    const resp = await fetchJSON<{ data: EMQuoteRaw }>(`/a-stock-picker/api/local-quote?code=${encodeURIComponent(code)}`)
    const d = resp.data
    const prevClose = d.f60
    const price = d.f43
    return {
      code: d.f57,
      name: d.f58,
      market: code.startsWith('6') ? 'sh' : 'sz',
      price,
      open: d.f46,
      close: prevClose,
      high: d.f44,
      low: d.f45,
      volume: d.f47,
      amount: d.f48,
      change: d.f169,
      changePercent: d.f170,
      turnover: d.f168,
      pe: d.f162,
      pb: d.f167,
      totalMarketCap: d.f116,
      circulatingCap: d.f117,
      amplitude: d.f171,
      volumeRatio: d.f50,
      isST: d.f58.includes('ST'),
      isSuspended: price === 0,
    }
  }
  // 生产环境：东方财富 push2 已被封锁，改用腾讯
  return fetchStockQuoteTencent(code)
}

// ─── 大盘指数 ───
const INDEX_CODES = [
  { secid: '1.000001', code: '000001', name: '上证指数' },
  { secid: '0.399001', code: '399001', name: '深证成指' },
  { secid: '0.399006', code: '399006', name: '创业板指' },
]

export async function fetchMarketIndices(): Promise<MarketIndex[]> {
  if (import.meta.env.DEV) {
    const resp = await fetchJSON<{ data: { diff: Array<Record<string, number | string>> } }>('/a-stock-picker/api/local-indices')
    if (!resp.data?.diff) return []
    return resp.data.diff.map((item, idx) => ({
      code: String(item.f12 ?? ''),
      name: String(item.f14 ?? ''),
      price: Number(item.f2 ?? 0),
      change: Number(item.f4 ?? 0),
      changePercent: Number(item.f3 ?? 0),
      volume: 0,
      amount: Number(item.f6 ?? 0),
    }))
  }
  // 生产环境：东方财富 push2 已被封锁，改用腾讯
  return fetchMarketIndicesTencent()
}

// ─── 历史K线 ───
export async function fetchKLineData(
  code: string,
  _period: '101' | '102' | '103' = '101', // 日/周/月（生产环境固定为日K）
  count = 120
): Promise<KLineData[]> {
  if (import.meta.env.DEV) {
    const resp = await fetchJSON<{ data: { klines: string } }>(`/a-stock-picker/api/local-kline?code=${encodeURIComponent(code)}&count=${count}`)
    if (!resp.data?.klines) return []
    return resp.data.klines.split('\n').filter(Boolean).map(line => {
      const parts = line.split(',')
      return {
        date: parts[0] ?? '',
        open: parseFloat(parts[1] ?? '0'),
        close: parseFloat(parts[2] ?? '0'),
        high: parseFloat(parts[3] ?? '0'),
        low: parseFloat(parts[4] ?? '0'),
        volume: parseFloat(parts[5] ?? '0'),
        amount: parseFloat(parts[6] ?? '0'),
        amplitude: parseFloat(parts[7] ?? '0'),
        changePercent: parseFloat(parts[8] ?? '0'),
        change: parseFloat(parts[9] ?? '0'),
        turnover: parseFloat(parts[10] ?? '0'),
      }
    })
  }
  // 生产环境：东方财富 K 线接口被封锁，改用新浪 JSONP
  return fetchKLineDataSina(code, count)
}

// ─── 资金流向 ───
export async function fetchMoneyFlow(_code: string): Promise<MoneyFlow> {
  // 开发环境：暂无本地资金流数据源，返回空值
  if (import.meta.env.DEV) {
    return { mainNetInflow: 0, largeNetInflow: 0, bigNetInflow: 0, midNetInflow: 0, smallNetInflow: 0, mainNetInflowPct: 0 }
  }
  // 生产环境：东方财富资金流接口同样被封锁，返回空值
  return { mainNetInflow: 0, largeNetInflow: 0, bigNetInflow: 0, midNetInflow: 0, smallNetInflow: 0, mainNetInflowPct: 0 }
}

/** 股票列表本地代理路径（开发环境绕过 eastmoney DNS 问题） */
const LOCAL_STOCK_API = '/a-stock-picker/api/local-stocks'

export async function fetchStockList(
  _page = 1,
  _pageSize = 100,
  _sortField = 'f3',
  _sortOrder = 'desc'
): Promise<{ total: number; items: EMStockListItem[] }> {
  // 开发环境用本地代理（腾讯数据源）
  if (import.meta.env.DEV) {
    const resp = await fetchJSON<{ data: { total: number; diff: EMStockListItem[] } }>(LOCAL_STOCK_API)
    return { total: resp.data?.total ?? 0, items: resp.data?.diff ?? [] }
  }
  // 生产环境：东方财富 push2 已被封锁，改用腾讯
  return fetchStockListTencent()
}

// ─── 市场情绪 ───
export async function fetchMarketSentiment(): Promise<MarketSentiment> {
  // 开发环境从本地股票列表统计
  if (import.meta.env.DEV) {
    try {
      const resp = await fetchJSON<{ data: { diff: Array<Record<string, number>> } }>(LOCAL_STOCK_API)
      const all = resp.data?.diff ?? []
      const riseCount = all.filter(i => (i.f3 ?? 0) > 0).length
      const fallCount = all.filter(i => (i.f3 ?? 0) < 0).length
      const flatCount = all.filter(i => (i.f3 ?? 0) === 0).length
      const limitUpCount = all.filter(i => (i.f3 ?? 0) >= 9.9).length
      const limitDownCount = all.filter(i => (i.f3 ?? 0) <= -9.9).length
      const ratio = all.length > 0 ? riseCount / all.length : 0.5
      let sentiment: MarketSentiment['sentiment'] = 'neutral'
      let sentimentScore = 50
      if (ratio > 0.75) { sentiment = 'extreme_greed'; sentimentScore = 85 }
      else if (ratio > 0.6) { sentiment = 'greed'; sentimentScore = 70 }
      else if (ratio < 0.25) { sentiment = 'extreme_fear'; sentimentScore = 15 }
      else if (ratio < 0.4) { sentiment = 'fear'; sentimentScore = 30 }
      return { riseCount, fallCount, flatCount, limitUpCount, limitDownCount, sentiment, sentimentScore }
    } catch {
      return { riseCount: 0, fallCount: 0, flatCount: 0, limitUpCount: 0, limitDownCount: 0, sentiment: 'neutral', sentimentScore: 50 }
    }
  }
  // 生产环境：通过腾讯批量接口获取全市场数据再统计（取前500只加速）
  try {
    const resp = await fetch('/a-stock-picker/stock-codes.json')
    const data = await resp.json() as { stocks: Array<{ code: string }> }
    const codes = data.stocks.slice(0, 500).map(s => s.code)
    const { fetchBatchQuotesTencent } = await import('./tencent')
    const quotes = await fetchBatchQuotesTencent(codes)
    const riseCount = quotes.filter(q => q.changePercent > 0).length
    const fallCount = quotes.filter(q => q.changePercent < 0).length
    const flatCount = quotes.filter(q => q.changePercent === 0).length
    const limitUpCount = quotes.filter(q => q.changePercent >= 9.9).length
    const limitDownCount = quotes.filter(q => q.changePercent <= -9.9).length
    const total = quotes.length
    const ratio = total > 0 ? riseCount / total : 0.5
    let sentiment: MarketSentiment['sentiment'] = 'neutral'
    let sentimentScore = 50
    if (ratio > 0.75) { sentiment = 'extreme_greed'; sentimentScore = 85 }
    else if (ratio > 0.6) { sentiment = 'greed'; sentimentScore = 70 }
    else if (ratio < 0.25) { sentiment = 'extreme_fear'; sentimentScore = 15 }
    else if (ratio < 0.4) { sentiment = 'fear'; sentimentScore = 30 }
    return { riseCount, fallCount, flatCount, limitUpCount, limitDownCount, sentiment, sentimentScore }
  } catch {
    return { riseCount: 0, fallCount: 0, flatCount: 0, limitUpCount: 0, limitDownCount: 0, sentiment: 'neutral', sentimentScore: 50 }
  }
}

// ─── 股票搜索 ───
export async function searchStock(keyword: string): Promise<Array<{ code: string; name: string; market: string }>> {
  // 开发环境从本地股票缓存搜索
  if (import.meta.env.DEV) {
    try {
      const resp = await fetchJSON<{ data: { diff: Array<Record<string, unknown>> } }>(LOCAL_STOCK_API)
      const all = resp.data?.diff ?? []
      const kw = keyword.toLowerCase()
      const results = all
        .filter(item => {
          const code = String(item.f12 ?? '')
          const name = String(item.f14 ?? '')
          return code.includes(kw) || name.includes(kw)
        })
        .slice(0, 10)
        .map(item => ({
          code: String(item.f12 ?? ''),
          name: String(item.f14 ?? ''),
          market: String(item.f12 ?? '').startsWith('6') ? 'sh' : 'sz',
        }))
      return results.length > 0 ? results : []
    } catch {
      return []
    }
  }
  // 生产环境：改用腾讯本地搜索
  return searchStockTencent(keyword)
}
