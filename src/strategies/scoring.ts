/**
 * 综合评分系统
 * 多维度加权打分，生成评级和建议
 */
import type { TechnicalIndicators, FundamentalData, MoneyFlow, DiagnosisScore } from '@/types/stock'
import { evaluateFundamental } from './fundamental'

/** 评分权重 */
const WEIGHTS = {
  technical: 0.45,   // 技术面 45%
  fundamental: 0.35, // 基本面 35%
  moneyFlow: 0.20,   // 资金面 20%
}

/**
 * 技术面评分 (0-100)
 */
function scoreTechnical(tech: TechnicalIndicators): { score: number; highlights: string[]; risks: string[] } {
  let score = 50
  const highlights: string[] = []
  const risks: string[] = []

  // MACD 信号
  if (tech.macd.signal === 'golden') { score += 15; highlights.push('MACD金叉') }
  else if (tech.macd.signal === 'death') { score -= 15; risks.push('MACD死叉') }
  if (tech.macd.trend === 'bullish') { score += 5; highlights.push('MACD多头趋势') }
  else if (tech.macd.trend === 'bearish') { score -= 5; risks.push('MACD空头趋势') }

  // KDJ 信号
  if (tech.kdj.signal === 'oversold') { score += 10; highlights.push('KDJ超卖区域') }
  else if (tech.kdj.signal === 'overbought') { score -= 10; risks.push('KDJ超买区域') }

  // RSI 信号
  if (tech.rsi.signal === 'oversold') { score += 8; highlights.push('RSI超卖') }
  else if (tech.rsi.signal === 'overbought') { score -= 8; risks.push('RSI超买') }

  // 均线排列
  if (tech.ma.arrangement === 'bull') { score += 12; highlights.push('均线多头排列') }
  else if (tech.ma.arrangement === 'bear') { score -= 12; risks.push('均线空头排列') }

  // 布林带位置
  if (tech.boll.position === 'below') { score += 5; highlights.push('触及布林下轨') }
  else if (tech.boll.position === 'above') { score -= 5; risks.push('突破布林上轨') }

  // 成交量
  if (tech.volume.signal === 'heavy') { score += 5; highlights.push('放量') }
  else if (tech.volume.signal === 'shrink') { score -= 3; risks.push('缩量') }

  return {
    score: Math.max(0, Math.min(100, score)),
    highlights,
    risks,
  }
}

/**
 * 资金面评分 (0-100)
 */
function scoreMoneyFlow(flow: MoneyFlow): { score: number; highlights: string[]; risks: string[] } {
  let score = 50
  const highlights: string[] = []
  const risks: string[] = []

  const mainInflowWan = flow.mainNetInflow / 10000
  if (mainInflowWan > 5000) { score += 20; highlights.push(`主力大幅流入 ${mainInflowWan.toFixed(0)}万元`) }
  else if (mainInflowWan > 1000) { score += 10; highlights.push(`主力流入 ${mainInflowWan.toFixed(0)}万元`) }
  else if (mainInflowWan < -5000) { score -= 20; risks.push(`主力大幅流出 ${Math.abs(mainInflowWan).toFixed(0)}万元`) }
  else if (mainInflowWan < -1000) { score -= 10; risks.push(`主力流出 ${Math.abs(mainInflowWan).toFixed(0)}万元`) }

  return {
    score: Math.max(0, Math.min(100, score)),
    highlights,
    risks,
  }
}

/**
 * 生成综合评分
 */
export function calculateDiagnosisScore(
  tech: TechnicalIndicators,
  fund: FundamentalData,
  flow: MoneyFlow
): DiagnosisScore {
  const techResult = scoreTechnical(tech)
  const fundResult = evaluateFundamental(fund)
  const flowResult = scoreMoneyFlow(flow)

  // 基本面综合分
  const fundScore = (fundResult.valuationScore + fundResult.qualityScore + fundResult.growthScore) / 3

  // 加权总分
  const total = Math.round(
    techResult.score * WEIGHTS.technical +
    fundScore * WEIGHTS.fundamental +
    flowResult.score * WEIGHTS.moneyFlow
  )

  // 合并亮点和风险
  const highlights = [...techResult.highlights, ...fundResult.highlights, ...flowResult.highlights]
  const risks = [...techResult.risks, ...fundResult.risks, ...flowResult.risks]

  // 评级
  let rating: DiagnosisScore['rating']
  let suggestion: string
  if (total >= 80) {
    rating = '强烈推荐'
    suggestion = '多维度指标表现优异，建议重点关注，可逢低布局'
  } else if (total >= 65) {
    rating = '推荐'
    suggestion = '整体表现良好，可适当关注，等待合适买点'
  } else if (total >= 45) {
    rating = '中性'
    suggestion = '指标表现中性，建议观望等待更明确信号'
  } else if (total >= 30) {
    rating = '谨慎'
    suggestion = '多项指标偏弱，建议谨慎操作，控制仓位'
  } else {
    rating = '回避'
    suggestion = '多项指标表现较差，建议回避或减仓'
  }

  return {
    total,
    technical: techResult.score,
    fundamental: Math.round(fundScore),
    moneyFlow: flowResult.score,
    rating,
    suggestion,
    highlights: highlights.slice(0, 5),
    risks: risks.slice(0, 5),
  }
}
