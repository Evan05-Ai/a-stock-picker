/**
 * 技术指标计算引擎
 * 包含 MACD / KDJ / RSI / 布林带 / 均线 / 成交量 分析
 */
import type { KLineData, TechnicalIndicators } from '@/types/stock'

// ─── EMA ───
function ema(data: number[], period: number): number[] {
  const result: number[] = []
  const k = 2 / (period + 1)
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(data[i]!)
    } else {
      result.push(data[i]! * k + result[i - 1]! * (1 - k))
    }
  }
  return result
}

// ─── SMA ───
function sma(data: number[], period: number): number[] {
  const result: number[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(data.slice(0, i + 1).reduce((a, b) => a + b, 0) / (i + 1))
    } else {
      result.push(data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period)
    }
  }
  return result
}

// ─── MACD ───
function calcMACD(closes: number[]): { dif: number[]; dea: number[]; macd: number[] } {
  const ema12 = ema(closes, 12)
  const ema26 = ema(closes, 26)
  const dif = ema12.map((v, i) => v - ema26[i]!)
  const dea = ema(dif, 9)
  const macd = dif.map((v, i) => (v - dea[i]!) * 2)
  return { dif, dea, macd }
}

// ─── KDJ ───
function calcKDJ(highs: number[], lows: number[], closes: number[]): { k: number[]; d: number[]; j: number[] } {
  const period = 9
  const rsv: number[] = []
  for (let i = 0; i < closes.length; i++) {
    const start = Math.max(0, i - period + 1)
    const highMax = Math.max(...highs.slice(start, i + 1))
    const lowMin = Math.min(...lows.slice(start, i + 1))
    const range = highMax - lowMin
    rsv.push(range === 0 ? 50 : ((closes[i]! - lowMin) / range) * 100)
  }
  const k: number[] = []
  const d: number[] = []
  for (let i = 0; i < rsv.length; i++) {
    k.push(i === 0 ? 50 : (2 / 3) * k[i - 1]! + (1 / 3) * rsv[i]!)
    d.push(i === 0 ? 50 : (2 / 3) * d[i - 1]! + (1 / 3) * k[i]!)
  }
  const j = k.map((kv, i) => 3 * kv - 2 * d[i]!)
  return { k, d, j }
}

// ─── RSI (Wilder 平滑法) ───
function calcRSI(closes: number[], period: number): number[] {
  if (closes.length < period + 1) return closes.map(() => 50)

  const result: number[] = []

  // 前 period 个点没有足够数据，填 50
  for (let i = 0; i < period; i++) result.push(50)

  // 计算第一个 avgGain / avgLoss（简单平均）
  let avgGain = 0
  let avgLoss = 0
  for (let i = 1; i <= period; i++) {
    const change = closes[i]! - closes[i - 1]!
    if (change > 0) avgGain += change
    else avgLoss += -change
  }
  avgGain /= period
  avgLoss /= period

  // 第一个 RSI 值
  const firstRs = avgLoss === 0 ? 100 : avgGain / avgLoss
  result[period] = 100 - 100 / (1 + firstRs)

  // Wilder 平滑递推
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i]! - closes[i - 1]!
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? -change : 0
    avgGain = ((period - 1) * avgGain + gain) / period
    avgLoss = ((period - 1) * avgLoss + loss) / period
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    result.push(100 - 100 / (1 + rs))
  }

  return result
}

// ─── 布林带 ───
function calcBoll(closes: number[], period = 20, multiplier = 2): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = sma(closes, period)
  const upper: number[] = []
  const lower: number[] = []
  for (let i = 0; i < closes.length; i++) {
    const start = Math.max(0, i - period + 1)
    const slice = closes.slice(start, i + 1)
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length
    const std = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length)
    upper.push(middle[i]! + multiplier * std)
    lower.push(middle[i]! - multiplier * std)
  }
  return { upper, middle, lower }
}

/**
 * 计算完整技术指标
 */
export function calculateTechnicalIndicators(klines: KLineData[]): TechnicalIndicators {
  if (klines.length < 30) {
    return getDefaultTechnical()
  }

  const closes = klines.map(k => k.close)
  const highs = klines.map(k => k.high)
  const lows = klines.map(k => k.low)
  const volumes = klines.map(k => k.volume)
  const len = closes.length
  const last = len - 1

  // MACD
  const macdData = calcMACD(closes)
  const dif = macdData.dif[last]!
  const dea = macdData.dea[last]!
  const macdVal = macdData.macd[last]!
  const prevDif = macdData.dif[last - 1]!
  const prevDea = macdData.dea[last - 1]!
  let macdSignal: 'golden' | 'death' | 'neutral' = 'neutral'
  if (prevDif <= prevDea && dif > dea) macdSignal = 'golden'
  else if (prevDif >= prevDea && dif < dea) macdSignal = 'death'
  const macdTrend = dif > 0 && dea > 0 ? 'bullish' : dif < 0 && dea < 0 ? 'bearish' : 'neutral'

  // KDJ
  const kdj = calcKDJ(highs, lows, closes)
  const kVal = kdj.k[last]!
  const dVal = kdj.d[last]!
  const jVal = kdj.j[last]!
  let kdjSignal: 'oversold' | 'overbought' | 'neutral' = 'neutral'
  if (jVal < 20 || (kVal < 20 && dVal < 20)) kdjSignal = 'oversold'
  else if (jVal > 80 || (kVal > 80 && dVal > 80)) kdjSignal = 'overbought'

  // RSI
  const rsi6 = calcRSI(closes, 6)[last] ?? 50
  const rsi12 = calcRSI(closes, 12)[last] ?? 50
  const rsi24 = calcRSI(closes, 24)[last] ?? 50
  let rsiSignal: 'oversold' | 'overbought' | 'neutral' = 'neutral'
  if (rsi6 < 20 || rsi12 < 30) rsiSignal = 'oversold'
  else if (rsi6 > 80 || rsi12 > 70) rsiSignal = 'overbought'

  // MA
  const ma5 = sma(closes, 5)[last] ?? 0
  const ma10 = sma(closes, 10)[last] ?? 0
  const ma20 = sma(closes, 20)[last] ?? 0
  const ma60 = len >= 60 ? sma(closes, 60)[last]! : ma20
  let maArrangement: 'bull' | 'bear' | 'mixed' = 'mixed'
  if (ma5 > ma10 && ma10 > ma20 && ma20 > ma60) maArrangement = 'bull'
  else if (ma5 < ma10 && ma10 < ma20 && ma20 < ma60) maArrangement = 'bear'

  // BOLL
  const boll = calcBoll(closes)
  const lastClose = closes[last]!
  const bollUpper = boll.upper[last]!
  const bollMiddle = boll.middle[last]!
  const bollLower = boll.lower[last]!
  let bollPos: 'above' | 'within' | 'below' = 'within'
  if (lastClose > bollUpper) bollPos = 'above'
  else if (lastClose < bollLower) bollPos = 'below'

  // Volume
  const avg5Vol = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5
  const avg10Vol = volumes.slice(-10).reduce((a, b) => a + b, 0) / 10
  const volRatio = avg10Vol > 0 ? avg5Vol / avg10Vol : 1
  let volSignal: 'heavy' | 'shrink' | 'normal' = 'normal'
  if (volRatio > 1.5) volSignal = 'heavy'
  else if (volRatio < 0.6) volSignal = 'shrink'

  return {
    macd: { dif, dea, macd: macdVal, signal: macdSignal, trend: macdTrend },
    kdj: { k: kVal, d: dVal, j: jVal, signal: kdjSignal },
    rsi: { rsi6, rsi12, rsi24, signal: rsiSignal },
    ma: { ma5, ma10, ma20, ma60, arrangement: maArrangement },
    boll: { upper: bollUpper, middle: bollMiddle, lower: bollLower, position: bollPos },
    volume: { avg5: avg5Vol, avg10: avg10Vol, ratio: volRatio, signal: volSignal },
  }
}

function getDefaultTechnical(): TechnicalIndicators {
  return {
    macd: { dif: 0, dea: 0, macd: 0, signal: 'neutral', trend: 'neutral' },
    kdj: { k: 50, d: 50, j: 50, signal: 'neutral' },
    rsi: { rsi6: 50, rsi12: 50, rsi24: 50, signal: 'neutral' },
    ma: { ma5: 0, ma10: 0, ma20: 0, ma60: 0, arrangement: 'mixed' },
    boll: { upper: 0, middle: 0, lower: 0, position: 'within' },
    volume: { avg5: 0, avg10: 0, ratio: 1, signal: 'normal' },
  }
}
