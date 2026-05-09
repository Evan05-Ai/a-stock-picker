/**
 * 选股过滤器和策略引擎
 */
import { EXCLUDED_PREFIXES, EXCLUDE_ST } from '@/config'
import type { EMStockListItem } from '@/api/eastmoney'
import type { SelectionItem, StockQuote, DiagnosisScore } from '@/types/stock'
import { calculateDiagnosisScore } from './scoring'
import { extractFundamental } from './fundamental'

/** 安全转数字 */
function toNumber(val: number | string | undefined): number {
  if (val === undefined || val === null || val === '-' || val === '') return NaN
  const n = Number(val)
  return isNaN(n) ? NaN : n
}

/** 基础过滤：排除科创板(688)和ST */
export function baseFilter(item: EMStockListItem): boolean {
  const code = item.f12
  const name = item.f14
  // 排除科创板
  for (const prefix of EXCLUDED_PREFIXES) {
    if (code.startsWith(prefix)) return false
  }
  // 排除ST
  if (EXCLUDE_ST && (name.includes('ST') || name.includes('*ST'))) return false
  // 排除停牌（价格为0、'-'、空字符串或非数字）
  const price = toNumber(item.f2)
  if (isNaN(price) || price === 0) return false
  return true
}

/** 将列表项转为简易 StockQuote */
export function listItemToQuote(item: EMStockListItem): StockQuote {
  const price = toNumber(item.f2)
  const prevClose = toNumber(item.f17)
  const change = toNumber(item.f4)
  return {
    code: item.f12,
    name: item.f14,
    market: item.f12.startsWith('6') ? 'sh' : 'sz',
    price: isNaN(price) ? 0 : price,
    open: isNaN(toNumber(item.f17)) ? (isNaN(price) ? 0 : price) : toNumber(item.f17),
    close: isNaN(prevClose) ? (isNaN(price) ? 0 : price) : prevClose,
    high: isNaN(toNumber(item.f15)) ? (isNaN(price) ? 0 : price) : toNumber(item.f15),
    low: isNaN(toNumber(item.f16)) ? (isNaN(price) ? 0 : price) : toNumber(item.f16),
    volume: toNumber(item.f5) || 0,
    amount: toNumber(item.f6) || 0,
    change: isNaN(change) ? 0 : change,
    changePercent: toNumber(item.f3) || 0,
    turnover: toNumber(item.f8) || 0,
    pe: toNumber(item.f9) || 0,
    pb: toNumber(item.f23) || 0,
    totalMarketCap: toNumber(item.f20) || 0,
    circulatingCap: toNumber(item.f21) || 0,
    amplitude: toNumber(item.f7) || 0,
    volumeRatio: toNumber(item.f10) || 0,
    isST: item.f14.includes('ST'),
    isSuspended: false,
  }
}

/** 命中因子识别 */
function matchFactors(item: EMStockListItem): string[] {
  const factors: string[] = []
  const f3 = toNumber(item.f3)
  const f8 = toNumber(item.f8)
  const f9 = toNumber(item.f9)
  const f10 = toNumber(item.f10)
  const f23 = toNumber(item.f23)
  const f62 = toNumber(item.f62)
  if (!isNaN(f3) && f3 > 5) factors.push('强势上涨')
  if (!isNaN(f3) && f3 > 0 && !isNaN(f8) && f8 > 5) factors.push('放量上涨')
  if (!isNaN(f9) && f9 > 0 && f9 < 15) factors.push('低PE')
  if (!isNaN(f23) && f23 > 0 && f23 < 1.5) factors.push('低PB')
  if (!isNaN(f10) && f10 > 1.5) factors.push('量比放大')
  if (!isNaN(f62) && f62 > 50000000) factors.push('主力资金流入') // 5000万以上
  return factors
}

/** 生成选股结果列表 */
export function generateSelectionList(items: EMStockListItem[]): SelectionItem[] {
  return items
    .filter(baseFilter)
    .map(item => ({
      quote: listItemToQuote(item),
      score: quickScore(item),
      matchedFactors: matchFactors(item),
    }))
}

/** 简易评分（仅基于列表数据，不请求K线） */
function quickScore(item: EMStockListItem): DiagnosisScore {
  const quote = listItemToQuote(item)
  const fund = extractFundamental(quote)
  // 用空技术指标做基本面评分
  const emptyTech = {
    macd: { dif: 0, dea: 0, macd: 0, signal: 'neutral' as const, trend: 'neutral' as const },
    kdj: { k: 50, d: 50, j: 50, signal: 'neutral' as const },
    rsi: { rsi6: 50, rsi12: 50, rsi24: 50, signal: 'neutral' as const },
    ma: { ma5: 0, ma10: 0, ma20: 0, ma60: 0, arrangement: 'mixed' as const },
    boll: { upper: 0, middle: 0, lower: 0, position: 'within' as const },
    volume: { avg5: 0, avg10: 0, ratio: 1, signal: 'normal' as const },
  }
  const f62 = toNumber(item.f62)
  const emptyFlow = {
    mainNetInflow: isNaN(f62) ? 0 : f62,
    largeNetInflow: 0,
    bigNetInflow: 0,
    midNetInflow: 0,
    smallNetInflow: 0,
    mainNetInflowPct: 0,
  }
  return calculateDiagnosisScore(emptyTech, fund, emptyFlow)
}