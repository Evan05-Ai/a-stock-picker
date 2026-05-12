/**
 * 市场数据 Hook —— 支持自动刷新
 * 与 useStockData 保持一致的模式：setTimeout 递归调度
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { fetchMarketIndices, fetchMarketSentiment, fetchStockList } from '@/api/eastmoney'
import { generateSelectionList } from '@/strategies/filters'
import { isTradingTime, msUntilNextTradingTime } from '@/utils/marketTime'
import type { MarketIndex, MarketSentiment, SelectionItem } from '@/types/stock'

interface UseMarketDataReturn {
  loading: boolean
  indices: MarketIndex[]
  sentiment: MarketSentiment | null
  topStocks: SelectionItem[]
  lastUpdated: string
  refresh: () => Promise<void>
  isAutoRefreshing: boolean
  startAutoRefresh: (intervalMs?: number) => void
  stopAutoRefresh: () => void
}

export function useMarketData(): UseMarketDataReturn {
  const [loading, setLoading] = useState(true)
  const [indices, setIndices] = useState<MarketIndex[]>([])
  const [sentiment, setSentiment] = useState<MarketSentiment | null>(null)
  const [topStocks, setTopStocks] = useState<SelectionItem[]>([])
  const [lastUpdated, setLastUpdated] = useState('')
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [idx, sent, list] = await Promise.all([
        fetchMarketIndices(),
        fetchMarketSentiment(),
        fetchStockList(1, 200, 'f3', 'desc'),
      ])
      setIndices(idx)
      setSentiment(sent)
      const selection = generateSelectionList(list.items)
      setTopStocks(selection.slice(0, 10))
      setLastUpdated(new Date().toLocaleTimeString('zh-CN'))
    } catch (e) {
      console.error('加载数据失败:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const refresh = useCallback(() => loadData(), [loadData])

  const stopAutoRefresh = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setIsAutoRefreshing(false)
  }, [])

  const startAutoRefresh = useCallback((intervalMs = 30_000) => {
    stopAutoRefresh() // 先停掉已有的

    // 非交易时段不启动，等待到下一个交易时段
    if (!isTradingTime()) {
      const waitMs = msUntilNextTradingTime()
      console.log(`[市场自动刷新] 当前非交易时段，${Math.round(waitMs / 1000)}秒后重试`)
      timerRef.current = setTimeout(() => {
        startAutoRefresh(intervalMs)
      }, Math.min(waitMs, 60000))
      return
    }

    setIsAutoRefreshing(true)

    function scheduleNext() {
      timerRef.current = setTimeout(async () => {
        // 每次刷新前检查是否仍在交易时段
        if (!isTradingTime()) {
          console.log('[市场自动刷新] 交易时段结束，暂停刷新')
          setIsAutoRefreshing(false)
          const waitMs = msUntilNextTradingTime()
          timerRef.current = setTimeout(() => {
            startAutoRefresh(intervalMs)
          }, Math.min(waitMs, 60000))
          return
        }
        await loadData()
        scheduleNext() // 完成后递归调度下一次
      }, intervalMs)
    }

    loadData() // 立即执行一次
    scheduleNext()
  }, [loadData, stopAutoRefresh])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // 初始加载
  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    loading,
    indices,
    sentiment,
    topStocks,
    lastUpdated,
    refresh,
    isAutoRefreshing,
    startAutoRefresh,
    stopAutoRefresh,
  }
}
