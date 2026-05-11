/**
 * 新浪财经 API 封装 —— 浏览器 script 注入方式
 * 新浪实时行情接口必须从浏览器加载（验证 Referer），
 * 用 fetch() 会被 403 拒绝。
 *
 * 用法：fetchStockQuoteSina('600519') → Promise<StockQuote>
 */
import type { StockQuote, KLineData } from '@/types/stock'

/**
 * 解析新浪行情逗号分隔字符串
 * 字段顺序：名称,今开,昨收,现价,最高,最低,... 
 */
function parseSinaQuote(code: string, raw: string): StockQuote {
  const parts = raw.split(',')
  const name = parts[0] ?? ''
  const todayOpen = parseFloat(parts[1] ?? '0')
  const prevClose = parseFloat(parts[2] ?? '0')
  const price = parseFloat(parts[3] ?? '0')
  const high = parseFloat(parts[4] ?? '0')
  const low = parseFloat(parts[5] ?? '0')
  const volume = parseFloat(parts[8] ?? '0')
  const amount = parseFloat(parts[9] ?? '0')
  const change = parseFloat((price - prevClose).toFixed(4))
  const changePercent = prevClose > 0 ? parseFloat(((change / prevClose) * 100).toFixed(4)) : 0

  return {
    code,
    name,
    market: code.startsWith('6') ? 'sh' : 'sz',
    price,
    open: todayOpen,
    close: prevClose,
    high,
    low,
    volume,
    amount,
    change,
    changePercent,
    turnover: parseFloat(parts[31] ?? '0') || 0,
    pe: 0,
    pb: 0,
    totalMarketCap: 0,
    circulatingCap: 0,
    amplitude: high > 0 && low > 0 ? parseFloat(((high - low) / prevClose * 100).toFixed(4)) : 0,
    volumeRatio: 0,
    isST: name.includes('ST'),
    isSuspended: price === 0,
  }
}

/** 构造新浪行情 URL（支持多股） */
function buildSinaUrl(codes: string[]): string {
  const list = codes.map(c => {
    const market = c.startsWith('6') || c.startsWith('5') ? 'sh' : 'sz'
    return `${market}${c}`
  }).join(',')
  return `https://hq.sinajs.cn/list=${list}`
}

/**
 * 核心：通过动态 script 标签注入获取新浪数据
 * 新浪返回格式：var hq_str_sh600519="茅台,1372,...";
 * 加载后变量在 window 上可直接读取。
 */
function fetchViaScript(url: string, varNames: string[]): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    const results: Record<string, string> = {}
    let loaded = 0
    const total = varNames.length
    const timer = setTimeout(() => {
      cleanup()
      resolve(results) // 超时也返回已获取的部分
    }, 10_000)

    function cleanup() {
      clearTimeout(timer)
      // 移除所有已添加的 script
      varNames.forEach(vn => {
        const el = document.getElementById(`sina-${vn}`)
        if (el) el.remove()
      })
    }

    // 为每个变量创建一个 script（新浪不支持一次返回多变量时用同一个 callback）
    // 实际上新浪一次请求可以返回多个 var，所以我们只用一个 script
    const script = document.createElement('script')
    const callbackName = `_sina_cb_${Date.now()}`
    
    // 新浪不支持 JSONP callback，返回的是 var 赋值语句
    // 所以直接加载，onload 后读 window 上的变量
    script.id = 'sina-fetch-script'
    script.src = url
    script.async = true

    script.onload = () => {
      cleanup()
      const data: Record<string, string> = {}
      varNames.forEach(vn => {
        const raw = (window as unknown as Record<string, string>)[vn]
        if (raw) data[vn] = raw
      })
      resolve(data)
    }

    script.onerror = () => {
      cleanup()
      // 降级：尝试直接 fetch（某些环境可能通）
      fetch(url)
        .then(r => r.text())
        .then(text => {
          const data: Record<string, string> = {}
          varNames.forEach(vn => {
            // 从文本中手动提取
            const re = new RegExp(`var ${vn}="([^"]*)"`)
            const m = text.match(re)
            if (m) data[vn] = m[1]!
          })
          resolve(data)
        })
        .catch(() => resolve({}))
    }

    document.head.appendChild(script)
  })
}

/** 批量获取新浪实时行情 */
async function fetchSinaQuotes(codes: string[]): Promise<Record<string, StockQuote>> {
  if (codes.length === 0) return {}

  const url = buildSinaUrl(codes)
  const varNames = codes.map(c => {
    const market = c.startsWith('6') || c.startsWith('5') ? 'sh' : 'sz'
    return `hq_str_${market}${c}`
  })

  const rawMap = await fetchViaScript(url, varNames)
  const result: Record<string, StockQuote> = {}

  Object.entries(rawMap).forEach(([varName, raw]) => {
    // 从 varName 提取代码：hq_str_sh600519 → 600519
    const m = varName.match(/hq_str_(sh|sz)(\d+)/)
    if (!m) return
    const code = m[2]!
    result[code] = parseSinaQuote(code, raw)
  })

  return result
}

/** 获取单只股票实时行情（导出） */
export async function fetchStockQuoteSina(code: string): Promise<StockQuote> {
  const quotes = await fetchSinaQuotes([code])
  const q = quotes[code]
  if (q) return q
  throw new Error(`新浪：无法获取股票 ${code} 的行情`)
}

/** 批量获取实时行情（导出） */
export async function fetchBatchQuotesSina(codes: string[]): Promise<StockQuote[]> {
  const quotes = await fetchSinaQuotes(codes)
  const result: StockQuote[] = []
  codes.forEach(c => {
    const q = quotes[c]
    if (q) result.push(q)
  })
  return result
}

/**
 * 新浪 K 线数据
 * URL: https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=sh600519&scale=240&datalen=100
 * 返回 JSON 数组，无需 JSONP，CORS 已开放
 */
export async function fetchKLineDataSina(
  code: string,
  count = 120
): Promise<KLineData[]> {
  const market = code.startsWith('6') || code.startsWith('5') ? 'sh' : 'sz'
  const url = `https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${market}${code}&scale=240&datalen=${count}`
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`新浪K线 HTTP ${resp.status}`)
  const data: Array<{ day: string; open: string; high: string; low: string; close: string; volume: string }> = await resp.json()
  return data.map(item => ({
    date: item.day,
    open: parseFloat(item.open),
    close: parseFloat(item.close),
    high: parseFloat(item.high),
    low: parseFloat(item.low),
    volume: parseFloat(item.volume),
    amount: 0,
    amplitude: 0,
    changePercent: 0,
    change: 0,
    turnover: 0,
  }))
}
