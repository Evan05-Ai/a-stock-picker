/**
 * 综合评分仪表盘组件
 */
import ReactECharts from 'echarts-for-react'

interface ScoreGaugeProps {
  score: number
  label?: string
  size?: number
}

export default function ScoreGauge({ score, label = '综合评分', size = 250 }: ScoreGaugeProps) {
  const getColor = (s: number) => {
    if (s >= 80) return '#e74c3c'
    if (s >= 65) return '#e67e22'
    if (s >= 45) return '#f39c12'
    if (s >= 30) return '#3498db'
    return '#27ae60'
  }

  const option = {
    backgroundColor: 'transparent',
    series: [
      {
        type: 'gauge',
        startAngle: 200,
        endAngle: -20,
        center: ['50%', '60%'],
        radius: '90%',
        min: 0,
        max: 100,
        splitNumber: 10,
        axisLine: {
          lineStyle: {
            width: 20,
            color: [
              [0.3, '#27ae60'],
              [0.45, '#3498db'],
              [0.65, '#f39c12'],
              [0.8, '#e67e22'],
              [1, '#e74c3c'],
            ],
          },
        },
        pointer: {
          icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
          length: '60%',
          width: 8,
          offsetCenter: [0, '-20%'],
          itemStyle: { color: 'auto' },
        },
        axisTick: { length: 8, lineStyle: { color: 'auto', width: 1 } },
        splitLine: { length: 16, lineStyle: { color: 'auto', width: 2 } },
        axisLabel: { color: '#8888aa', fontSize: 11, distance: 28, formatter: (v: number) => v % 20 === 0 ? v.toString() : '' },
        title: { offsetCenter: [0, '30%'], fontSize: 14, color: '#8888aa' },
        detail: {
          fontSize: 36,
          offsetCenter: [0, '5%'],
          valueAnimation: true,
          formatter: '{value}',
          color: getColor(score),
          fontWeight: 700,
        },
        data: [{ value: score, name: label }],
      },
    ],
  }

  return (
    <ReactECharts
      option={option}
      style={{ height: size, width: size }}
      notMerge
    />
  )
}
