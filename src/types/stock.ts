/**
 * 股票相关类型定义
 */

/** 大盘指数 */
export interface MarketIndex {
  code: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  amount: number
}

/** 实时行情 */
export interface StockQuote {
  code: string        // 股票代码
  name: string        // 股票名称
  market: string      // 市场 sh/sz/bj
  price: number       // 最新价
  open: number        // 开盘价
  close: number       // 昨收
  high: number        // 最高
  low: number         // 最低
  volume: number      // 成交量(手)
  amount: number      // 成交额(元)
  change: number      // 涨跌额
  changePercent: number // 涨跌幅 %
  turnover: number    // 换手率 %
  pe: number          // 市盈率(动)
  pb: number          // 市净率
  totalMarketCap: number // 总市值(元)
  circulatingCap: number // 流通市值(元)
  amplitude: number   // 振幅 %
  volumeRatio: number // 量比
  isST: boolean       // 是否ST
  isSuspended: boolean // 是否停牌
}

/** K线数据 */
export interface KLineData {
  date: string
  open: number
  close: number
  high: number
  low: number
  volume: number     // 成交量(手)
  amount: number     // 成交额(元)
  amplitude: number  // 振幅 %
  changePercent: number // 涨跌幅 %
  change: number     // 涨跌额
  turnover: number   // 换手率 %
}

/** 技术指标 */
export interface TechnicalIndicators {
  macd: {
    dif: number
    dea: number
    macd: number
    signal: 'golden' | 'death' | 'neutral'
    trend: 'bullish' | 'bearish' | 'neutral'
  }
  kdj: {
    k: number
    d: number
    j: number
    signal: 'oversold' | 'overbought' | 'neutral'
  }
  rsi: {
    rsi6: number
    rsi12: number
    rsi24: number
    signal: 'oversold' | 'overbought' | 'neutral'
  }
  ma: {
    ma5: number
    ma10: number
    ma20: number
    ma60: number
    arrangement: 'bull' | 'bear' | 'mixed'
  }
  boll: {
    upper: number
    middle: number
    lower: number
    position: 'above' | 'within' | 'below'
  }
  volume: {
    avg5: number
    avg10: number
    ratio: number
    signal: 'heavy' | 'shrink' | 'normal'
  }
}

/** 基本面指标 */
export interface FundamentalData {
  pe: number          // 市盈率(动)
  pb: number          // 市净率
  roe: number         // 净资产收益率 %
  revenueGrowth: number // 营收增长率 %
  profitGrowth: number  // 净利润增长率 %
  grossMargin: number   // 毛利率 %
  netMargin: number     // 净利率 %
  debtRatio: number     // 资产负债率 %
  dividendYield: number // 股息率 %
  eps: number           // 每股收益
  bps: number           // 每股净资产
}

/** 资金流向 */
export interface MoneyFlow {
  mainNetInflow: number     // 主力净流入(元)
  largeNetInflow: number    // 超大单净流入(元)
  bigNetInflow: number      // 大单净流入(元)
  midNetInflow: number      // 中单净流入(元)
  smallNetInflow: number    // 小单净流入(元)
  mainNetInflowPct: number  // 主力净流入占比 %
}

/** 诊断评分 */
export interface DiagnosisScore {
  total: number        // 综合评分 0-100
  technical: number    // 技术面评分
  fundamental: number  // 基本面评分
  moneyFlow: number    // 资金面评分
  rating: '强烈推荐' | '推荐' | '中性' | '谨慎' | '回避'
  suggestion: string   // 操作建议
  highlights: string[] // 亮点
  risks: string[]      // 风险点
}

/** 完整诊断结果 */
export interface DiagnosisResult {
  quote: StockQuote
  klines: KLineData[]
  technical: TechnicalIndicators
  fundamental: FundamentalData
  moneyFlow: MoneyFlow
  score: DiagnosisScore
  diagnoseTime: string
}

/** 选股筛选条件 */
export interface SelectionFilter {
  peRange: [number, number]
  pbRange: [number, number]
  roeMin: number
  changeRange: [number, number]
  turnoverRange: [number, number]
  marketCapRange: [number, number] // 亿元
  strategy: 'trend' | 'value' | 'growth' | 'momentum' | 'all'
  sortBy: 'score' | 'change' | 'pe' | 'turnover' | 'amount'
  sortOrder: 'asc' | 'desc'
}

/** 选股结果项 */
export interface SelectionItem {
  quote: StockQuote
  score: DiagnosisScore
  matchedFactors: string[] // 命中的选股因子
}

/** 市场情绪 */
export interface MarketSentiment {
  riseCount: number
  fallCount: number
  flatCount: number
  limitUpCount: number
  limitDownCount: number
  sentiment: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed'
  sentimentScore: number // 0-100
}
