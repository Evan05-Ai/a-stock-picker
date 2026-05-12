/**
 * 股票数据 Hook —— 支持自动刷新
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { fetchStockQuote, fetchKLineData, fetchMoneyFlow } from '@/api/eastmoney'
import { fetchStockQuoteSina } from '@/api/sina'
import { calculateTechnicalIndicators } from '@/strategies/technical'
import { extractFundamental } from '@/strategies/fundamental'
import { calculateDiagnosisScore } from '@/strategies/scoring'
import { isTradingTime, msUntilNextTradingTime } from '@/utils/marketTime'
import type { DiagnosisResult, StockQuote, KLineData } from '@/types/stock'

interface UseStockDataReturn {
  loading: boolean
  error: string | null
  result: DiagnosisResult | null
  diagnose: (code: string) => Promise<void>
  isAutoRefreshing: boolean
  startAutoRefresh: (code: string, intervalMs?: number) => void
  stopAutoRefresh: () => void
}

export function useStockData(): UseStockDataReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DiagnosisResult | null>(null)
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** 执行一次诊断（核心逻辑） */
  const diagnoseCore = useCallback(async (code: string) => {
    if (!code.trim()) {
      setError('请输入股票代码')
      return
    }
    setLoading(true)
    setError(null)

    try {
      // 实时行情：开发环境新浪优先（速度快），生产环境直接用东方财富 JSONP（绕过 CORS）
      let quote: StockQuote
      if (import.meta.env.DEV) {
        try {
          quote = await fetchStockQuoteSina(code)
        } catch {
          console.warn('[行情] 新浪失败，切换东方财富', code)
          quote = await fetchStockQuote(code)
        }
      } else {
        quote = await fetchStockQuote(code)
      }

      // K线 + 资金流向仍用东方财富（数据更全）
      const [klines, flow] = await Promise.all([
        fetchKLineData(code),
        fetchMoneyFlow(code),
      ])

      if (!quote || quote.price === 0) {
        setError('未找到该股票或股票已停牌')
        setLoading(false)
        return
      }

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

  /** 手动诊断 */
  const diagnose = useCallback((code: string) => diagnoseCore(code), [diagnoseCore])

  /** 停止自动刷新 */
  const stopAutoRefresh = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setIsAutoRefreshing(false)
  }, [])

  /** 开始自动刷新（默认30秒，仅交易时段有效） */
  const startAutoRefresh = useCallback((code: string, intervalMs = 30000) => {
    stopAutoRefresh() // 先停掉已有的

    // 非交易时段不启动，等待到下一个交易时段
    if (!isTradingTime()) {
      const waitMs = msUntilNextTradingTime()
      console.log(`[自动刷新] 当前非交易时段，${Math.round(waitMs / 1000)}秒后重试`)
      timerRef.current = setTimeout(() => {
        startAutoRefresh(code, intervalMs)
      }, Math.min(waitMs, 60000)) // 最多等1分钟检查一次
      return
    }

    setIsAutoRefreshing(true)

    function scheduleNext() {
      timerRef.current = setTimeout(async () => {
        // 每次刷新前检查是否仍在交易时段
        if (!isTradingTime()) {
          console.log('[自动刷新] 交易时段结束，暂停刷新')
          setIsAutoRefreshing(false)
          // 安排到下一个交易时段
          const waitMs = msUntilNextTradingTime()
          timerRef.current = setTimeout(() => {
            startAutoRefresh(code, intervalMs)
          }, Math.min(waitMs, 60000))
          return
        }
        await diagnoseCore(code)
        scheduleNext() // 完成后递归调度下一次
      }, intervalMs)
    }

    diagnoseCore(code) // 立即执行一次
    scheduleNext()
  }, [diagnoseCore, stopAutoRefresh])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { loading, error, result, diagnose, isAutoRefreshing, startAutoRefresh, stopAutoRefresh }
}
