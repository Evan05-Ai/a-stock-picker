/**
 * 回测引擎
 * 基于历史K线数据模拟交易策略
 */
import type { KLineData } from '@/types/stock'
import type { BacktestResult, BacktestTrade, BacktestSignal, BacktestParams } from '@/types/backtest'

/**
 * 计算简单收益率
 */
function calcReturn(startVal: number, endVal: number): number {
  return ((endVal - startVal) / startVal) * 100
}

/**
 * 计算年化收益率
 */
function calcAnnualizedReturn(totalReturn: number, days: number): number {
  if (days <= 0) return 0
  const years = days / 365
  return (Math.pow(1 + totalReturn / 100, 1 / years) - 1) * 100
}

/**
 * 计算最大回撤
 */
function calcMaxDrawdown(equityCurve: number[]): number {
  let maxDrawdown = 0
  let peak = equityCurve[0] ?? 1

  for (const value of equityCurve) {
    if (value > peak) peak = value
    const drawdown = ((peak - value) / peak) * 100
    if (drawdown > maxDrawdown) maxDrawdown = drawdown
  }

  return maxDrawdown
}

/**
 * MACD金叉死叉检测
 */
function getMacdSignals(klines: KLineData[]): BacktestSignal[] {
  if (klines.length < 30) return []

  const signals: BacktestSignal[] = []
  const closes = klines.map(k => k.close)

  // 简化MACD计算
  const ema12 = calcEma(closes, 12)
  const ema26 = calcEma(closes, 26)
  const dif = ema12.map((v, i) => v - ema26[i]!)
  const dea = calcEma(dif, 9)

  for (let i = 1; i < klines.length; i++) {
    const prevDif = dif[i - 1]!
    const currDif = dif[i]!
    const prevDea = dea[i - 1]!
    const currDea = dea[i]!

    // 金叉： DIF从下往上穿DEA
    if (prevDif <= prevDea && currDif > currDea) {
      signals.push({
        date: klines[i]!.date,
        type: 'buy',
        price: klines[i]!.close,
        reason: `MACD金叉 DIF=${currDif.toFixed(2)} DEA=${currDea.toFixed(2)}`
      })
    }
    // 死叉： DIF从上往下穿DEA
    else if (prevDif >= prevDea && currDif < currDea) {
      signals.push({
        date: klines[i]!.date,
        type: 'sell',
        price: klines[i]!.close,
        reason: `MACD死叉 DIF=${currDif.toFixed(2)} DEA=${currDea.toFixed(2)}`
      })
    }
  }

  return signals
}

/**
 * KDJ超卖超买检测
 */
function getKdjSignals(klines: KLineData[]): BacktestSignal[] {
  if (klines.length < 20) return []

  const signals: BacktestSignal[] = []
  const highs = klines.map(k => k.high)
  const lows = klines.map(k => k.low)
  const closes = klines.map(k => k.close)

  const kdj = calcKdj(highs, lows, closes)

  for (let i = 10; i < klines.length; i++) {
    const jVal = kdj.j[i]!
    const kVal = kdj.k[i]!
    const dVal = kdj.d[i]!

    // KDJ金叉（超卖区反转）
    if (jVal < 20 && kVal < 20 && dVal < 20) {
      const prevJ = kdj.j[i - 1]!
      if (prevJ <= 20 && jVal > prevJ) {
        signals.push({
          date: klines[i]!.date,
          type: 'buy',
          price: klines[i]!.close,
          reason: `KDJ超卖金叉 J=${jVal.toFixed(1)} K=${kVal.toFixed(1)} D=${dVal.toFixed(1)}`
        })
      }
    }
    // KDJ死叉（超买区反转）
    else if (jVal > 80 && kVal > 80 && dVal > 80) {
      const prevJ = kdj.j[i - 1]!
      if (prevJ >= 80 && jVal < prevJ) {
        signals.push({
          date: klines[i]!.date,
          type: 'sell',
          price: klines[i]!.close,
          reason: `KDJ超买死叉 J=${jVal.toFixed(1)} K=${kVal.toFixed(1)} D=${dVal.toFixed(1)}`
        })
      }
    }
  }

  return signals
}

/**
 * 均线策略信号
 */
function getMaSignals(klines: KLineData[]): BacktestSignal[] {
  if (klines.length < 30) return []

  const signals: BacktestSignal[] = []
  const closes = klines.map(k => k.close)

  const ma5 = calcSma(closes, 5)
  const ma20 = calcSma(closes, 20)

  for (let i = 2; i < klines.length; i++) {
    const prevMa5 = ma5[i - 1]!
    const currMa5 = ma5[i]!
    const prevMa20 = ma20[i - 1]!
    const currMa20 = ma20[i]!

    // 金叉：MA5上穿MA20
    if (prevMa5 <= prevMa20 && currMa5 > currMa20) {
      signals.push({
        date: klines[i]!.date,
        type: 'buy',
        price: klines[i]!.close,
        reason: `均线金叉 MA5=${currMa5.toFixed(2)} MA20=${currMa20.toFixed(2)}`
      })
    }
    // 死叉：MA5下穿MA20
    else if (prevMa5 >= prevMa20 && currMa5 < currMa20) {
      signals.push({
        date: klines[i]!.date,
        type: 'sell',
        price: klines[i]!.close,
        reason: `均线死叉 MA5=${currMa5.toFixed(2)} MA20=${currMa20.toFixed(2)}`
      })
    }
  }

  return signals
}

/**
 * 综合策略：多信号共振
 */
function getCombinedSignals(klines: KLineData[]): BacktestSignal[] {
  const macdSignals = getMacdSignals(klines)
  const maSignals = getMaSignals(klines)

  // 合并信号，标记共振
  const allSignals: BacktestSignal[] = [...macdSignals, ...maSignals]
  allSignals.sort((a, b) => a.date.localeCompare(b.date))

  return allSignals
}

/**
 * EMA计算
 */
function calcEma(data: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const result: number[] = []
  for (let i = 0; i < data.length; i++) {
    if (i === 0) result.push(data[i]!)
    else result.push(data[i]! * k + result[i - 1]! * (1 - k))
  }
  return result
}

/**
 * SMA计算
 */
function calcSma(data: number[], period: number): number[] {
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

/**
 * KDJ计算
 */
function calcKdj(highs: number[], lows: number[], closes: number[]) {
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

/**
 * 执行回测
 */
export function runBacktest(
  klines: KLineData[],
  params: BacktestParams
): BacktestResult {
  // 获取信号
  let signals: BacktestSignal[] = []
  switch (params.strategy) {
    case 'macd':
      signals = getMacdSignals(klines)
      break
    case 'kdj':
      signals = getKdjSignals(klines)
      break
    case 'ma':
      signals = getMaSignals(klines)
      break
    case 'combined':
      signals = getCombinedSignals(klines)
      break
  }

  // 模拟交易
  const trades: BacktestTrade[] = []
  const equityCurve: { date: string; value: number }[] = []

  let capital = params.initialCapital
  let shares = 0
  let currentPosition: { buyDate: string; buyPrice: number } | null = null
  let lastEquityDate = ''
  let lastEquityValue = capital

  // 按时间顺序处理信号
  const buySignals = signals.filter(s => s.type === 'buy')
  const sellSignals = signals.filter(s => s.type === 'sell')

  // 简单策略：遇到买信号就买，遇到卖信号就卖
  for (const signal of signals) {
    if (signal.type === 'buy' && !currentPosition) {
      // 买入
      shares = Math.floor(capital / signal.price)
      if (shares > 0) {
        capital -= shares * signal.price
        currentPosition = { buyDate: signal.date, buyPrice: signal.price }
      }
    } else if (signal.type === 'sell' && currentPosition) {
      // 卖出
      const sellPrice = signal.price
      capital += shares * sellPrice
      const returnPct = ((sellPrice - currentPosition.buyPrice) / currentPosition.buyPrice) * 100
      const holdDays = Math.floor(
        (new Date(signal.date).getTime() - new Date(currentPosition.buyDate).getTime()) / (1000 * 60 * 60 * 24)
      )

      trades.push({
        buyDate: currentPosition.buyDate,
        buyPrice: currentPosition.buyPrice,
        sellDate: signal.date,
        sellPrice,
        returnPct,
        holdDays
      })

      shares = 0
      currentPosition = null
    }

    // 记录权益曲线（每天收盘时的资金）
    if (signal.date !== lastEquityDate) {
      const currentValue = capital + shares * signal.price
      equityCurve.push({ date: signal.date, value: currentValue })
      lastEquityDate = signal.date
      lastEquityValue = currentValue
    }
  }

  // 如果最后还有持仓，按最后一天价格计算
  if (currentPosition && equityCurve.length > 0) {
    const lastKline = klines[klines.length - 1]!
    const lastValue = capital + shares * lastKline.close

    // 更新最后一条权益曲线
    equityCurve[equityCurve.length - 1] = { date: lastKline.date, value: lastValue }
  }

  // 计算统计数据
  const startPrice = klines[0]!.close
  const endPrice = klines[klines.length - 1]!.close
  const totalDays = Math.floor(
    (new Date(klines[klines.length - 1]!.date).getTime() - new Date(klines[0]!.date).getTime()) / (1000 * 60 * 60 * 24)
  )

  const finalValue = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1]!.value : params.initialCapital
  const totalReturn = calcReturn(params.initialCapital, finalValue)
  const annualizedReturn = calcAnnualizedReturn(totalReturn, totalDays)
  const maxDrawdown = equityCurve.length > 0 ? calcMaxDrawdown(equityCurve.map(e => e.value)) : 0

  // 计算胜率
  const winningTrades = trades.filter(t => (t.returnPct ?? 0) > 0)
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0

  // 平均持仓天数
  const avgHoldDays = trades.length > 0
    ? trades.reduce((sum, t) => sum + (t.holdDays ?? 0), 0) / trades.length
    : 0

  return {
    stockCode: params.stockCode,
    stockName: klines[0] ? params.stockCode : '未知',
    startDate: klines[0]?.date ?? params.startDate,
    endDate: klines[klines.length - 1]?.date ?? params.endDate,
    totalReturn,
    annualizedReturn,
    maxDrawdown,
    totalTrades: trades.length,
    winRate,
    avgHoldDays: Math.round(avgHoldDays),
    finalValue,
    trades,
    signals,
    equityCurve
  }
}
