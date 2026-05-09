/**
 * 东方财富 API 封装
 * 数据字段映射参考: https://push2.eastmoney.com
 */
import { API_PREFIX } from '@/config'
import { fetchJSON, fetchJSONP } from './request'
import type { StockQuote, KLineData, MarketIndex, MoneyFlow, MarketSentiment } from '@/types/stock'

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
  // 生产环境走 eastmoney
  const secid = getSecId(code)
  const url = `${API_PREFIX.push2}/api/qt/stock/get?secid=${secid}&fields=f43,f44,f45,f46,f47,f48,f50,f51,f52,f55,f57,f58,f60,f116,f117,f162,f167,f168,f169,f170,f171&fltt=2`
  const data = await fetchJSONP<{ data: EMQuoteRaw }>(url)
  const d = data.data
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
  const secids = INDEX_CODES.map(i => i.secid).join(',')
  const url = `${API_PREFIX.push2}/api/qt/ulist.np/get?fields=f2,f3,f4,f6,f12,f14&secids=${secids}&fltt=2`
  const data = await fetchJSONP<{ data: { diff: Array<Record<string, number | string>> } }>(url)
  if (!data.data?.diff) return []
  return data.data.diff.map((item, idx) => ({
    code: INDEX_CODES[idx]?.code ?? '',
    name: INDEX_CODES[idx]?.name ?? '',
    price: item.f2 as number,
    change: item.f4 as number,
    changePercent: item.f3 as number,
    volume: 0,
    amount: item.f6 as number,
  }))
}

// ─── 历史K线 ───
export async function fetchKLineData(
  code: string,
  period: '101' | '102' | '103' = '101', // 日/周/月
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
  // 生产环境
  const secid = getSecId(code)
  const url = `${API_PREFIX.push2his}/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=${period}&fqt=1&lmt=${count}&end=20500101`
  const data = await fetchJSONP<{ data: { klines: string[] } }>(url)
  if (!data.data?.klines) return []

  return data.data.klines.map(line => {
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

// ─── 资金流向 ───
export async function fetchMoneyFlow(_code: string): Promise<MoneyFlow> {
  // 开发环境：暂无本地资金流数据源，返回空值
  if (import.meta.env.DEV) {
    return { mainNetInflow: 0, largeNetInflow: 0, bigNetInflow: 0, midNetInflow: 0, smallNetInflow: 0, mainNetInflowPct: 0 }
  }
  const secid = getSecId(_code)
  const url = `${API_PREFIX.push2}/api/qt/stock/fflow/daykline/get?secid=${secid}&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65&lmt=1`
  const data = await fetchJSONP<{ data: { klines: string[] } }>(url)
  if (!data.data?.klines?.[0]) {
    return { mainNetInflow: 0, largeNetInflow: 0, bigNetInflow: 0, midNetInflow: 0, smallNetInflow: 0, mainNetInflowPct: 0 }
  }
  const parts = data.data.klines[0].split(',')
  // parts: [0]=日期, [1]=主力, [2]=超大单, [3]=大单, [4]=中单, [5]=小单
  const mainIn = parseFloat(parts[1] ?? '0')
  const largeIn = parseFloat(parts[2] ?? '0')
  const bigIn = parseFloat(parts[3] ?? '0')
  const midIn = parseFloat(parts[4] ?? '0')
  const smallIn = parseFloat(parts[5] ?? '0')
  const total = Math.abs(mainIn) + Math.abs(largeIn) + Math.abs(bigIn) + Math.abs(midIn) + Math.abs(smallIn)
  return {
    mainNetInflow: mainIn,
    largeNetInflow: largeIn,
    bigNetInflow: bigIn,
    midNetInflow: midIn,
    smallNetInflow: smallIn,
    mainNetInflowPct: total > 0 ? (mainIn / total) * 100 : 0,
  }
}

// ─── 选股列表（沪深A股，排除科创板和ST） ───
export interface EMStockListItem {
  f2: number | string; f3: number | string; f4: number | string; f5: number
  f6: number; f7: number | string; f8: number; f9: number | string; f10: number | string
  f12: string; f14: string; f15: number | string; f16: number | string; f17: number | string
  f20: number | string; f21: number | string; f23: number | string; f24: number; f25: number
  f62: number | string; f100: string; f115: number | string; f128: string; f140: string; f141: string
}

/** 股票列表本地代理路径（开发环境绕过 eastmoney DNS 问题） */
const LOCAL_STOCK_API = '/a-stock-picker/api/local-stocks'

export async function fetchStockList(
  _page = 1,
  _pageSize = 100,
  _sortField = 'f3',
  _sortOrder = 'desc'
): Promise<{ total: number; items: EMStockListItem[] }> {
  // 开发环境用本地代理（腾讯数据源），生产环境走 eastmoney + JSONP
  if (import.meta.env.DEV) {
    const resp = await fetchJSON<{ data: { total: number; diff: EMStockListItem[] } }>(LOCAL_STOCK_API)
    return { total: resp.data?.total ?? 0, items: resp.data?.diff ?? [] }
  }
  const sortStr = _sortOrder === 'desc' ? '0' : '1'
  const url = `${API_PREFIX.push2}/api/qt/clist/get?pn=${_page}&pz=${_pageSize}&po=${sortStr}&np=1&fltt=2&invt=2&fid=${_sortField}&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048&fields=f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f14,f15,f16,f17,f20,f21,f23,f24,f25,f62,f100,f115,f128,f140,f141`
  const data = await fetchJSONP<{ data: { total: number; diff: EMStockListItem[] } }>(url)
  return { total: data.data?.total ?? 0, items: data.data?.diff ?? [] }
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
  // 获取涨跌家数
  const url = `${API_PREFIX.push2}/api/qt/clist/get?pn=1&pz=1&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048&fields=f3`
  const data = await fetchJSONP<{ data: { total: number; diff: Array<{ f3: number }> } }>(url)
  const total = data.data?.total ?? 0

  // 分别获取涨跌家数
  const riseUrl = `${API_PREFIX.push2}/api/qt/clist/get?pn=1&pz=1&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048&fields=f3,f12,f14&fid0=f3&fv0=0`
  const limitUpUrl = `${API_PREFIX.push2}/api/qt/clist/get?pn=1&pz=5000&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048&fields=f3`

  try {
    const allData = await fetchJSONP<{ data: { diff: Array<{ f3: number }> } }>(limitUpUrl)
    const all = allData.data?.diff ?? []
    const riseCount = all.filter(i => i.f3 > 0).length
    const fallCount = all.filter(i => i.f3 < 0).length
    const flatCount = all.filter(i => i.f3 === 0).length
    const limitUpCount = all.filter(i => i.f3 >= 9.9).length
    const limitDownCount = all.filter(i => i.f3 <= -9.9).length

    const ratio = total > 0 ? riseCount / total : 0.5
    let sentiment: MarketSentiment['sentiment'] = 'neutral'
    let sentimentScore = 50
    if (ratio > 0.75) { sentiment = 'extreme_greed'; sentimentScore = 85 }
    else if (ratio > 0.6) { sentiment = 'greed'; sentimentScore = 70 }
    else if (ratio < 0.25) { sentiment = 'extreme_fear'; sentimentScore = 15 }
    else if (ratio < 0.4) { sentiment = 'fear'; sentimentScore = 30 }

    return { riseCount, fallCount, flatCount, limitUpCount, limitDownCount, sentiment, sentimentScore }
  } catch {
    return { riseCount: 0, fallCount: 0, flatCount: total, limitUpCount: 0, limitDownCount: 0, sentiment: 'neutral', sentimentScore: 50 }
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
  // 生产环境用 eastmoney 搜索 API
  const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(keyword)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=10`
  try {
    const data = await fetchJSONP<{ QuotationCodeTable: { Data: Array<{ Code: string; Name: string; MktNum: string }> } }>(url)
    return (data.QuotationCodeTable?.Data ?? []).map((item: { Code: string; Name: string; MktNum: string }) => ({
      code: item.Code,
      name: item.Name,
      market: item.MktNum === '1' ? 'sh' : 'sz',
    }))
  } catch {
    return []
  }
}
