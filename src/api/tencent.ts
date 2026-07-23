/**
 * 腾讯财经 API 封装
 * 用于生产环境替代被封锁的东方财富 push2 接口
 * 接口格式: https://qt.gtimg.cn/q=sh600519,sz000001
 * 返回格式: window.v_sh600519 = "1~名称~代码~现价~..."
 */
import type { StockQuote, MarketIndex, EMStockListItem, KLineData } from '@/types/stock'

// ─── 字段映射 (qt.gtimg.cn 返回的 ~ 分隔字段) ───
// 0:市场标志 1:名称 2:代码 3:现价 4:昨收 5:今开 6:成交量(手) 7:外盘 8:内盘
// 9~28:五档买卖盘 29:逐笔 30:时间 31:涨跌 32:涨跌幅% 33:最高 34:最低
// 35:组合 36:成交量 37:成交额(万) 38:换手率 39:市盈率 40:? 41:最高 42:最低
// 43:振幅 44:流通市值 45:总市值 46:市净率 47:涨停 48:跌停 49:量比

const F = {
  name: 1, code: 2, price: 3, prevClose: 4, open: 5, volume: 6,
  high: 33, low: 34, change: 31, changePercent: 32,
  amount: 37, turnover: 38, pe: 39, amplitude: 43,
  circMarketCap: 44, totalMarketCap: 45, pb: 46, volumeRatio: 49,
}

/** 通过 script 标签加载腾讯数据 */
function fetchViaScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = url
    script.async = true
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('Tencent script timeout'))
    }, 10000)

    function cleanup() {
      clearTimeout(timer)
      script.remove()
    }

    script.onload = () => { cleanup(); resolve() }
    script.onerror = () => { cleanup(); reject(new Error('Tencent script failed')) }
    document.head.appendChild(script)
  })
}

/** 解析单只股票的腾讯原始数据 */
function parseTencentQuote(code: string, raw: string): StockQuote {
  const p = raw.split('~')
  const price = parseFloat(p[F.price] ?? '0')
  const prevClose = parseFloat(p[F.prevClose] ?? '0')
  const change = parseFloat(p[F.change] ?? '0')
  const changePercent = parseFloat(p[F.changePercent] ?? '0')
  const volume = parseFloat(p[F.volume] ?? '0') // 手
  const amount = parseFloat(p[F.amount] ?? '0') * 10000 // 万 -> 元

  return {
    code: p[F.code] ?? code,
    name: p[F.name] ?? '',
    market: code.startsWith('6') || code.startsWith('5') ? 'sh' : 'sz',
    price,
    open: parseFloat(p[F.open] ?? '0'),
    close: prevClose,
    high: parseFloat(p[F.high] ?? '0'),
    low: parseFloat(p[F.low] ?? '0'),
    volume: volume * 100, // 手 -> 股
    amount,
    change,
    changePercent,
    turnover: parseFloat(p[F.turnover] ?? '0'),
    pe: parseFloat(p[F.pe] ?? '0'),
    pb: parseFloat(p[F.pb] ?? '0'),
    totalMarketCap: parseFloat(p[F.totalMarketCap] ?? '0') * 1e8,
    circulatingCap: parseFloat(p[F.circMarketCap] ?? '0') * 1e8,
    amplitude: parseFloat(p[F.amplitude] ?? '0'),
    volumeRatio: parseFloat(p[F.volumeRatio] ?? '0'),
    isST: (p[F.name] ?? '').includes('ST'),
    isSuspended: price === 0,
  }
}

/** 单股实时行情 */
export async function fetchStockQuoteTencent(code: string): Promise<StockQuote> {
  const market = code.startsWith('6') || code.startsWith('5') ? 'sh' : 'sz'
  const key = `v_${market}${code}`
  await fetchViaScript(`https://qt.gtimg.cn/q=${market}${code}`)
  const raw = (window as unknown as Record<string, string>)[key]
  if (!raw) throw new Error(`腾讯：无法获取 ${code} 的行情`)
  return parseTencentQuote(code, raw)
}

/** 批量实时行情（自动分批，每批≤200只） */
export async function fetchBatchQuotesTencent(codes: string[]): Promise<StockQuote[]> {
  if (codes.length === 0) return []

  const BATCH_SIZE = 200
  const results: StockQuote[] = []

  for (let i = 0; i < codes.length; i += BATCH_SIZE) {
    const batch = codes.slice(i, i + BATCH_SIZE)
    const query = batch.map(c => {
      const m = c.startsWith('6') || c.startsWith('5') ? 'sh' : 'sz'
      return `${m}${c}`
    }).join(',')

    await fetchViaScript(`https://qt.gtimg.cn/q=${query}`)

    batch.forEach(code => {
      const market = code.startsWith('6') || code.startsWith('5') ? 'sh' : 'sz'
      const key = `v_${market}${code}`
      const raw = (window as unknown as Record<string, string>)[key]
      if (raw) {
        try {
          results.push(parseTencentQuote(code, raw))
        } catch (e) {
          console.warn(`[腾讯] 解析 ${code} 失败:`, e)
        }
      }
    })
  }

  return results
}

/** 大盘指数 */
const INDEX_MAP: Record<string, { code: string; name: string; query: string }> = {
  '000001': { code: '000001', name: '上证指数', query: 'sh000001' },
  '399001': { code: '399001', name: '深证成指', query: 'sz399001' },
  '399006': { code: '399006', name: '创业板指', query: 'sz399006' },
}

export async function fetchMarketIndicesTencent(): Promise<MarketIndex[]> {
  const queries = Object.values(INDEX_MAP).map(v => v.query).join(',')
  await fetchViaScript(`https://qt.gtimg.cn/q=${queries}`)

  return Object.values(INDEX_MAP).map(item => {
    const key = `v_${item.query}`
    const raw = (window as unknown as Record<string, string>)[key]
    if (!raw) {
      return { code: item.code, name: item.name, price: 0, change: 0, changePercent: 0, volume: 0, amount: 0 }
    }
    const p = raw.split('~')
    const price = parseFloat(p[3] ?? '0')
    const prevClose = parseFloat(p[4] ?? '0')
    const change = parseFloat(p[31] ?? '0')
    const changePercent = parseFloat(p[32] ?? '0')
    const volume = parseFloat(p[6] ?? '0') * 100
    const amount = parseFloat(p[37] ?? '0') * 10000
    return { code: item.code, name: item.name, price, change, changePercent, volume, amount }
  })
}

/** 股票搜索 */
export async function searchStockTencent(keyword: string): Promise<Array<{ code: string; name: string; market: string }>> {
  // 先从本地缓存加载全部代码列表
  try {
    const resp = await fetch('/a-stock-picker/stock-codes.json')
    const data = await resp.json() as { stocks: Array<{ code: string; name: string; market: string }> }
    const all = data.stocks ?? []
    const kw = keyword.toLowerCase()
    return all
      .filter(s => s.code.includes(kw) || s.name.toLowerCase().includes(kw))
      .slice(0, 10)
  } catch {
    return []
  }
}

/** 获取全市场股票列表（返回 EMStockListItem 格式兼容数据） */
export async function fetchStockListTencent(): Promise<{ total: number; items: EMStockListItem[] }> {
  try {
    const resp = await fetch('/a-stock-picker/stock-codes.json')
    const data = await resp.json() as { stocks: Array<{ code: string; name: string; market: string }> }
    const stocks = data.stocks ?? []

    // 分批获取实时数据
    const quotes = await fetchBatchQuotesTencent(stocks.map(s => s.code))
    const quoteMap = new Map(quotes.map(q => [q.code, q]))

    const items: EMStockListItem[] = stocks.map(s => {
      const q = quoteMap.get(s.code)
      return {
        f2: q?.price ?? 0,
        f3: q?.changePercent ?? 0,
        f4: q?.change ?? 0,
        f5: q?.volume ?? 0,
        f6: q?.amount ?? 0,
        f7: q?.amplitude ?? 0,
        f8: q?.turnover ?? 0,
        f9: q?.pe ?? 0,
        f10: q?.volumeRatio ?? 0,
        f12: s.code,
        f14: s.name,
        f15: q?.high ?? 0,
        f16: q?.low ?? 0,
        f17: q?.open ?? 0,
        f20: q?.totalMarketCap ?? 0,
        f21: q?.circulatingCap ?? 0,
        f23: q?.pb ?? 0,
        f24: 0,
        f25: 0,
        f62: 0,
        f100: '',
        f115: 0,
        f128: '',
        f140: '',
        f141: '',
      }
    })

    return { total: items.length, items }
  } catch (e) {
    console.error('[fetchStockListTencent] 失败:', e)
    return { total: 0, items: [] }
  }
}

// ─── 新浪 K 线数据（JSONP，用于生产环境替代东方财富 K 线） ───
// 接口: https://money.finance.sina.com.cn/quotes_service/api/jsonp.php/var_VARNAME=/CN_MarketData.getKLineData?symbol=sh600519&scale=240&ma=5&datalen=120
// 返回: var_VARNAME=([{"day":"2026-05-13","open":"1354.500",...},...]);

interface SinaKLineItem {
  day: string
  open: string
  high: string
  low: string
  close: string
  volume: string
  ma_price5?: number
  ma_volume5?: number
}

export async function fetchKLineDataSina(code: string, datalen = 120): Promise<KLineData[]> {
  const market = code.startsWith('6') || code.startsWith('5') ? 'sh' : 'sz'
  const symbol = `${market}${code}`
  const varName = `var_KLineData_${code}`

  const url = `https://money.finance.sina.com.cn/quotes_service/api/jsonp.php/${varName}=/CN_MarketData.getKLineData?symbol=${symbol}&scale=240&ma=5&datalen=${datalen}`

  await fetchViaScript(url)

  const raw = (window as unknown as Record<string, SinaKLineItem[]>)[varName]
  if (!raw || !Array.isArray(raw)) {
    throw new Error(`新浪：无法获取 ${code} 的 K 线数据`)
  }

  return raw.map((item) => {
    const open = parseFloat(item.open ?? '0')
    const close = parseFloat(item.close ?? '0')
    const prevClose = raw[raw.indexOf(item) - 1]?.close
      ? parseFloat(raw[raw.indexOf(item) - 1]!.close)
      : open
    const change = close - prevClose
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0
    const high = parseFloat(item.high ?? '0')
    const low = parseFloat(item.low ?? '0')
    const amplitude = low > 0 ? ((high - low) / low) * 100 : 0

    return {
      date: item.day ?? '',
      open,
      close,
      high,
      low,
      volume: parseFloat(item.volume ?? '0') / 100, // 新浪返回股数，转手
      amount: 0,
      amplitude,
      changePercent,
      change,
      turnover: 0,
    }
  })
}
