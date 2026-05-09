/**
 * 基本面分析引擎
 */
import type { StockQuote, FundamentalData } from '@/types/stock'

/**
 * 从行情数据提取基本面指标（东方财富实时行情已包含 PE/PB 等）
 * 部分高级指标需要额外接口，这里先用行情数据可获取的字段
 */
export function extractFundamental(quote: StockQuote): FundamentalData {
  return {
    pe: quote.pe,
    pb: quote.pb,
    roe: quote.pb > 0 && quote.pe > 0 ? (quote.pb / quote.pe) * 100 : 0, // 粗略估算 ROE = PB/PE
    revenueGrowth: 0,   // 需要财报接口补充
    profitGrowth: 0,     // 需要财报接口补充
    grossMargin: 0,      // 需要财报接口补充
    netMargin: 0,        // 需要财报接口补充
    debtRatio: 0,        // 需要财报接口补充
    dividendYield: 0,    // 需要财报接口补充
    eps: quote.pe > 0 ? quote.price / quote.pe : 0, // 粗略估算
    bps: quote.pb > 0 ? quote.price / quote.pb : 0, // 粗略估算
  }
}

/**
 * 基本面评级
 */
export function evaluateFundamental(data: FundamentalData): {
  valuationScore: number   // 估值得分 0-100
  qualityScore: number     // 质量得分 0-100
  growthScore: number      // 成长得分 0-100
  highlights: string[]
  risks: string[]
} {
  const highlights: string[] = []
  const risks: string[] = []
  let valuationScore = 50
  let qualityScore = 50
  let growthScore = 50

  // 估值得分
  if (data.pe > 0 && data.pe < 15) { valuationScore += 20; highlights.push(`低市盈率 PE=${data.pe.toFixed(1)}`) }
  else if (data.pe > 0 && data.pe < 30) { valuationScore += 10 }
  else if (data.pe > 60) { valuationScore -= 20; risks.push(`高市盈率 PE=${data.pe.toFixed(1)}`) }
  else if (data.pe < 0) { valuationScore -= 30; risks.push('亏损状态，PE为负') }

  if (data.pb > 0 && data.pb < 1) { valuationScore += 15; highlights.push(`低市净率 PB=${data.pb.toFixed(2)}`) }
  else if (data.pb > 0 && data.pb < 2) { valuationScore += 5 }
  else if (data.pb > 5) { valuationScore -= 10; risks.push(`高市净率 PB=${data.pb.toFixed(2)}`) }

  // 质量得分（ROE）
  if (data.roe > 15) { qualityScore += 25; highlights.push(`高ROE ${data.roe.toFixed(1)}%`) }
  else if (data.roe > 10) { qualityScore += 15 }
  else if (data.roe > 0 && data.roe < 5) { qualityScore -= 10; risks.push(`低ROE ${data.roe.toFixed(1)}%`) }
  else if (data.roe <= 0) { qualityScore -= 25; risks.push('ROE为负') }

  // 成长得分
  if (data.revenueGrowth > 30) { growthScore += 25; highlights.push(`高营收增长 ${data.revenueGrowth.toFixed(1)}%`) }
  else if (data.revenueGrowth > 15) { growthScore += 15 }
  else if (data.revenueGrowth < -10) { growthScore -= 20; risks.push(`营收下滑 ${data.revenueGrowth.toFixed(1)}%`) }

  if (data.profitGrowth > 30) { growthScore += 20; highlights.push(`高利润增长 ${data.profitGrowth.toFixed(1)}%`) }
  else if (data.profitGrowth > 15) { growthScore += 10 }
  else if (data.profitGrowth < -20) { growthScore -= 25; risks.push(`利润大幅下滑 ${data.profitGrowth.toFixed(1)}%`) }

  return {
    valuationScore: Math.max(0, Math.min(100, valuationScore)),
    qualityScore: Math.max(0, Math.min(100, qualityScore)),
    growthScore: Math.max(0, Math.min(100, growthScore)),
    highlights,
    risks,
  }
}
