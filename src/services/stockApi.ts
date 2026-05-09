/**
 * 股票数据API服务 - 基于东方财富数据接口
 */

/** 判断股票所属市场 (1=沪市, 0=深市, 创业板/科创板) */
function getMarketId(code: string): string {
  if (code.startsWith('6') || code.startsWith('9')) return '1'
  return '0'
}

/** 搜索股票 */
export async function searchStocks(keyword: string) {
  // 使用东方财富沪深A股行情列表接口
  const params = new URLSearchParams({
    pn: '1',
    pz: '100',
    po: '1',
    np: '1',
    ut: 'bd1d9ddb04089700cf9c27f6f7426281',
    fltt: '2',
    invt: '2',
    fid: 'f3',
    fs: 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048',
    fields: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18',
    _: Date.now().toString(),
  })

  // 如果keyword看起来是具体的搜索词（不是默认的"沪深A股"），用模糊搜索
  if (keyword && keyword !== '沪深A股') {
    params.set('fid', 'f3')
    params.set('fs', `b:${keyword}`)
    // 先尝试模糊搜索
    try {
      const res = await fetch(`/api-eastmoney/api/suggest/get?input=${encodeURIComponent(keyword)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=10`)
      const suggest = await res.json()
      if (suggest?.QuotationCodeTable?.Data?.length > 0) {
        const codes = suggest.QuotationCodeTable.Data
          .map((item: { Code: string; MktNum: string }) => `${item.MktNum}:${item.Code}`)
          .join(',')
        params.set('fs', codes.split(',').map((c: string) => `b:${c}`).join(','))
      }
    } catch {
      // fallback: use direct search
    }
  }

  const res = await fetch(`/api-eastmoney/api/qt/clist/get?${params}`)
  const data = await res.json()

  const list = (data?.data?.diff ?? []).map((item: Record<string, number | undefined>) => ({
    code: item.f12 ?? '',
    name: item.f14 ?? '',
    price: (item.f2 ?? 0) / 100,
    change: (item.f4 ?? 0) / 100,
    changePercent: (item.f3 ?? 0) / 100,
    volume: item.f5 ?? 0,
    turnover: item.f6 ?? 0,
    high: (item.f15 ?? 0) / 100,
    low: (item.f16 ?? 0) / 100,
    open: (item.f17 ?? 0) / 100,
    prevClose: (item.f18 ?? 0) / 100,
  }))

  return { list, total: data?.data?.total ?? 0 }
}

/** 获取个股实时行情 */
export async function getStockQuote(code: string) {
  const secid = `${getMarketId(code)}.${code}`
  const params = new URLSearchParams({
    secid,
    ut: 'fa5fd1943c7b386f172d6893dbbd1',
    fields: 'f43,f44,f45,f46,f47,f48,f50,f51,f52,f55,f57,f58,f60,f71,f92,f105,f116,f117,f162,f167,f168,f169,f170,f171,f177,f292',
    _: Date.now().toString(),
  })

  const res = await fetch(`/api-eastmoney/api/qt/stock/get?${params}`)
  const data = await res.json()
  const d = data?.data
  if (!d) return null

  return {
    code: d.f57,
    name: d.f58,
    price: d.f43 / 100,
    change: d.f169 / 100,
    changePercent: d.f170 / 100,
    open: d.f46 / 100,
    high: d.f44 / 100,
    low: d.f45 / 100,
    prevClose: d.f60 / 100,
    volume: d.f47,
    turnover: d.f48,
    turnoverRate: d.f168 / 100,
    pe: d.f162 / 100,
    pb: d.f167 / 100,
    marketCap: d.f116,
    floatCap: d.f117,
    amplitude: d.f171 / 100,
  }
}

/** 获取K线数据 */
export async function getStockKline(code: string, period = 'day', count = 120) {
  const secid = `${getMarketId(code)}.${code}`

  // period: day=日K, week=周K, month=月K
  const kltMap: Record<string, string> = { day: '101', week: '102', month: '103', '5min': '5', '15min': '15', '30min': '30', '60min': '60' }
  const klt = kltMap[period] ?? '101'

  const params = new URLSearchParams({
    secid,
    ut: 'fa5fd1943c7b386f172d6893dbbd1',
    fields1: 'f1,f2,f3,f4,f5,f6',
    fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
    klt,
    fqt: '1',
    end: '20500101',
    lmt: count.toString(),
    _: Date.now().toString(),
  })

  const res = await fetch(`/api-eastmoney-his/api/qt/stock/kline/get?${params}`)
  const data = await res.json()
  const klines = data?.data?.klines ?? []

  const dates: string[] = []
  const opens: number[] = []
  const closes: number[] = []
  const highs: number[] = []
  const lows: number[] = []
  const volumes: number[] = []

  klines.forEach((line: string) => {
    const parts = line.split(',')
    dates.push(parts[0] ?? '')
    opens.push(parseFloat(parts[1] ?? '0'))
    closes.push(parseFloat(parts[2] ?? '0'))
    highs.push(parseFloat(parts[3] ?? '0'))
    lows.push(parseFloat(parts[4] ?? '0'))
    volumes.push(parseFloat(parts[5] ?? '0'))
  })

  return { dates, opens, closes, highs, lows, volumes }
}

/** 获取大盘指数概览 */
export async function getMarketOverview() {
  const indices = [
    { secid: '1.000001', name: '上证指数' },
    { secid: '0.399001', name: '深证成指' },
    { secid: '0.399006', name: '创业板指' },
    { secid: '1.000016', name: '上证50' },
  ]

  const params = new URLSearchParams({
    ut: 'bd1d9ddb04089700cf9c27f6f7426281',
    fltt: '2',
    invt: '2',
    fields: 'f2,f3,f4,f12,f14',
    secids: indices.map(i => i.secid).join(','),
    _: Date.now().toString(),
  })

  const res = await fetch(`/api-eastmoney/api/qt/ulist.np/get?${params}`)
  const data = await res.json()

  return (data?.data?.diff ?? []).map((item: Record<string, number>, i: number) => ({
    name: indices[i]?.name ?? item.f14,
    price: item.f2,
    change: item.f4,
    changePercent: item.f3,
  }))
}
