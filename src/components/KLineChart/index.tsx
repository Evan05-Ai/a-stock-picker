/**
 * K线图组件（ECharts）
 */
import ReactECharts from 'echarts-for-react'
import type { KLineData } from '@/types/stock'

interface KLineChartProps {
  data: KLineData[]
  stockName?: string
  height?: number
}

export default function KLineChart({ data, stockName = '', height = 500 }: KLineChartProps) {
  if (!data.length) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>暂无K线数据</div>

  const dates = data.map(d => d.date)
  const ohlc = data.map(d => [d.open, d.close, d.low, d.high])
  const volumes = data.map(d => d.volume)
  const colors = data.map(d => d.close >= d.open ? '#e74c3c' : '#27ae60')

  // 计算MA5 / MA10 / MA20
  function calcMA(period: number): (number | null)[] {
    return data.map((_, i) => {
      if (i < period - 1) return null
      const slice = data.slice(i - period + 1, i + 1)
      return +(slice.reduce((a, b) => a + b.close, 0) / period).toFixed(2)
    })
  }

  const ma5 = calcMA(5)
  const ma10 = calcMA(10)
  const ma20 = calcMA(20)

  const option = {
    backgroundColor: 'transparent',
    animation: false,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: 'rgba(20,20,40,0.95)',
      borderColor: '#2a2a4a',
      textStyle: { color: '#e8e8e8', fontSize: 12 },
    },
    legend: {
      data: ['日K', 'MA5', 'MA10', 'MA20'],
      top: 10,
      textStyle: { color: '#8888aa' },
    },
    grid: [
      { left: '8%', right: '3%', top: 60, height: '55%' },
      { left: '8%', right: '3%', top: '75%', height: '18%' },
    ],
    xAxis: [
      {
        type: 'category',
        data: dates,
        boundaryGap: true,
        axisLine: { lineStyle: { color: '#2a2a4a' } },
        axisLabel: { color: '#8888aa', fontSize: 11 },
        gridIndex: 0,
      },
      {
        type: 'category',
        data: dates,
        gridIndex: 1,
        axisLine: { lineStyle: { color: '#2a2a4a' } },
        axisLabel: { show: false },
      },
    ],
    yAxis: [
      {
        scale: true,
        splitLine: { lineStyle: { color: '#1a1a3a' } },
        axisLine: { lineStyle: { color: '#2a2a4a' } },
        axisLabel: { color: '#8888aa', fontSize: 11 },
        gridIndex: 0,
      },
      {
        scale: true,
        splitLine: { show: false },
        axisLine: { lineStyle: { color: '#2a2a4a' } },
        axisLabel: { color: '#8888aa', fontSize: 11, formatter: (v: number) => (v / 10000).toFixed(0) + '万' },
        gridIndex: 1,
      },
    ],
    dataZoom: [
      { type: 'inside', xAxisIndex: [0, 1], start: 60, end: 100 },
      { type: 'slider', xAxisIndex: [0, 1], start: 60, end: 100, bottom: 5, height: 20, borderColor: '#2a2a4a', backgroundColor: '#0a0a1a', fillerColor: 'rgba(231,76,60,0.1)', textStyle: { color: '#8888aa' } },
    ],
    series: [
      {
        name: '日K',
        type: 'candlestick',
        data: ohlc,
        xAxisIndex: 0,
        yAxisIndex: 0,
        itemStyle: {
          color: '#e74c3c',        // 阳线填充
          color0: '#27ae60',       // 阴线填充
          borderColor: '#e74c3c',  // 阳线边框
          borderColor0: '#27ae60', // 阴线边框
        },
      },
      {
        name: 'MA5',
        type: 'line',
        data: ma5,
        smooth: true,
        lineStyle: { width: 1, color: '#f39c12' },
        symbol: 'none',
        xAxisIndex: 0,
        yAxisIndex: 0,
      },
      {
        name: 'MA10',
        type: 'line',
        data: ma10,
        smooth: true,
        lineStyle: { width: 1, color: '#3498db' },
        symbol: 'none',
        xAxisIndex: 0,
        yAxisIndex: 0,
      },
      {
        name: 'MA20',
        type: 'line',
        data: ma20,
        smooth: true,
        lineStyle: { width: 1, color: '#9b59b6' },
        symbol: 'none',
        xAxisIndex: 0,
        yAxisIndex: 0,
      },
      {
        name: '成交量',
        type: 'bar',
        data: volumes.map((v, i) => ({
          value: v,
          itemStyle: { color: colors[i] + '88' },
        })),
        xAxisIndex: 1,
        yAxisIndex: 1,
      },
    ],
  }

  return (
    <ReactECharts
      option={option}
      style={{ height }}
      notMerge
      lazyUpdate
    />
  )
}
