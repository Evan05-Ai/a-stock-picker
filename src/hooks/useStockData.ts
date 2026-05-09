/**
 * 股票数据 Hook
 */
import { useState, useCallback } from 'react'
import { fetchStockQuote, fetchKLineData, fetchMoneyFlow } from '@/api/eastmoney'
import { calculateTechnicalIndicators } from '@/strategies/technical'
import { extractFundamental } from '@/strategies/fundamental'
import { calculateDiagnosisScore } from '@/strategies/scoring'
import type { DiagnosisResult, StockQuote, KLineData } from '@/types/stock'

interface UseStockDataReturn {
  loading: boolean
  error: string | null
  result: DiagnosisResult | null
  diagnose: (code: string) => Promise<void>
}

export function useStockData(): UseStockDataReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DiagnosisResult | null>(null)

  const diagnose = useCallback(async (code: string) => {
    if (!code.trim()) {
      setError('请输入股票代码')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // 并行获取数据
      const [quote, klines, flow] = await Promise.all([
        fetchStockQuote(code),
        fetchKLineData(code),
        fetchMoneyFlow(code),
      ])

      if (!quote || quote.price === 0) {
        setError('未找到该股票或股票已停牌')
        return
      }

      // 计算指标
      const technical = calculateTechnicalIndicators(klines)
      const fundamental = extractFundamental(quote)
      const score = calculateDiagnosisScore(technical, fundamental, flow)

      setResult({
        quote,
        klines,
        technical,
        fundamental,
        moneyFlow: flow,
        score,
        diagnoseTime: new Date().toLocaleString('zh-CN'),
      })
    } catch (e) {
      setError(`获取数据失败: ${e instanceof Error ? e.message : '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, result, diagnose }
}
