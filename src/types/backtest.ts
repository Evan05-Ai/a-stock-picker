/**
 * 回测相关类型定义
 */

/** 回测信号 */
export interface BacktestSignal {
  date: string
  type: 'buy' | 'sell'
  price: number
  reason: string
}

/** 单笔交易 */
export interface BacktestTrade {
  buyDate: string
  buyPrice: number
  sellDate?: string
  sellPrice?: number
  returnPct?: number
  holdDays?: number
}

/** 回测结果 */
export interface BacktestResult {
  stockCode: string
  stockName: string
  startDate: string
  endDate: string
  totalReturn: number        // 总收益率 %
  annualizedReturn: number   // 年化收益率 %
  maxDrawdown: number       // 最大回撤 %
  totalTrades: number       // 总交易次数
  winRate: number           // 胜率 %
  avgHoldDays: number       // 平均持仓天数
  finalValue: number        // 最终资金（假设初始1万）
  trades: BacktestTrade[]   // 交易明细
  signals: BacktestSignal[] // 买卖信号
  equityCurve: { date: string; value: number }[] // 权益曲线
}

/** 回测参数 */
export interface BacktestParams {
  stockCode: string
  startDate: string
  endDate: string
  initialCapital: number    // 初始资金
  strategy: 'macd' | 'kdj' | 'ma' | 'combined'
}
