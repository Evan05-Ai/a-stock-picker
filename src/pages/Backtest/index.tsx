/**
 * 回测页面
 */
import { useState } from 'react'
import { Card, Row, Col, Input, Button, Select, DatePicker, Statistic, Table, Tag, Descriptions, Spin, Alert, Space } from 'antd'
import { ExperimentOutlined, PlayCircleOutlined, RiseOutlined, FallOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { fetchKLineData, searchStock } from '@/api/eastmoney'
import { runBacktest } from '@/strategies/backtest'
import type { BacktestResult, BacktestTrade, BacktestSignal } from '@/types/backtest'

const { RangePicker } = DatePicker
const { Search } = Input

const STRATEGY_OPTIONS = [
  { value: 'macd', label: 'MACD金叉/死叉' },
  { value: 'kdj', label: 'KDJ超卖/超买' },
  { value: 'ma', label: '均线金叉/死叉' },
  { value: 'combined', label: '综合策略（多信号共振）' },
]

export default function Backtest() {
  const [stockCode, setStockCode] = useState('')
  const [stockName, setStockName] = useState('')
  const [strategy, setStrategy] = useState<'macd' | 'kdj' | 'ma' | 'combined'>('macd')
  const [dateRange, setDateRange] = useState<[string, string]>(['', ''])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return

    if (/^\d{6}$/.test(trimmed)) {
      setStockCode(trimmed)
      setStockName(trimmed)
      return
    }

    try {
      const results = await searchStock(trimmed)
      if (results.length > 0 && results[0]) {
        setStockCode(results[0].code)
        setStockName(results[0].name)
      } else {
        setError('未找到匹配的股票')
      }
    } catch {
      setError('搜索失败')
    }
  }

  const handleRunBacktest = async () => {
    if (!stockCode) {
      setError('请输入股票代码')
      return
    }

    const [startDate, endDate] = dateRange
    if (!startDate || !endDate) {
      setError('请选择回测时间范围')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // 获取K线数据（取足够多的数据用于计算指标）
      const klines = await fetchKLineData(stockCode, '101', 250)

      if (klines.length < 60) {
        setError('数据不足，无法进行回测（需要至少60个交易日数据）')
        return
      }

      // 过滤日期范围内的数据
      const filteredKlines = klines.filter(
        k => k.date >= startDate && k.date <= endDate
      )

      if (filteredKlines.length < 60) {
        setError('所选日期范围内数据不足（需要至少60个交易日数据）')
        return
      }

      // 执行回测
      const backtestResult = runBacktest(filteredKlines, {
        stockCode,
        startDate,
        endDate,
        initialCapital: 10000, // 初始1万
        strategy
      })

      backtestResult.stockName = stockName || stockCode
      setResult(backtestResult)
    } catch (e) {
      setError(`回测失败: ${e instanceof Error ? e.message : '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }

  const tradeColumns: ColumnsType<BacktestTrade> = [
    {
      title: '买入日期',
      dataIndex: 'buyDate',
      width: 100,
    },
    {
      title: '买入价',
      dataIndex: 'buyPrice',
      render: v => <span className="num-font">¥{v.toFixed(2)}</span>,
    },
    {
      title: '卖出日期',
      dataIndex: 'sellDate',
      width: 100,
      render: v => v || '未卖出',
    },
    {
      title: '卖出价',
      dataIndex: 'sellPrice',
      render: v => v ? <span className="num-font">¥{v.toFixed(2)}</span> : '-',
    },
    {
      title: '收益率',
      dataIndex: 'returnPct',
      render: v => v !== undefined ? (
        <Tag color={v >= 0 ? 'red' : 'green'}>
          {v >= 0 ? '+' : ''}{v.toFixed(2)}%
        </Tag>
      ) : '-',
    },
    {
      title: '持仓天数',
      dataIndex: 'holdDays',
      render: v => v !== undefined ? `${v}天` : '-',
    },
  ]

  const signalColumns: ColumnsType<BacktestSignal> = [
    {
      title: '日期',
      dataIndex: 'date',
      width: 100,
    },
    {
      title: '信号',
      dataIndex: 'type',
      render: v => (
        <Tag color={v === 'buy' ? 'red' : 'green'}>
          {v === 'buy' ? '买入' : '卖出'}
        </Tag>
      ),
    },
    {
      title: '价格',
      dataIndex: 'price',
      render: v => <span className="num-font">¥{v.toFixed(2)}</span>,
    },
    {
      title: '原因',
      dataIndex: 'reason',
    },
  ]

  return (
    <div className="fade-in">
      <h2 style={{ marginBottom: 20, fontSize: 22 }}>
        <ExperimentOutlined style={{ color: 'var(--color-accent)', marginRight: 8 }} />
        策略回测
      </h2>

      {/* 参数设置 */}
      <Card className="stock-card" style={{ marginBottom: 20 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={8}>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginBottom: 4 }}>股票代码</div>
            <Search
              placeholder="输入股票代码或名称"
              enterButton="查询"
              value={stockCode}
              onChange={e => setStockCode(e.target.value)}
              onSearch={handleSearch}
            />
            {stockName && (
              <div style={{ marginTop: 4, color: 'var(--color-accent)', fontSize: 12 }}>
                {stockName} ({stockCode})
              </div>
            )}
          </Col>

          <Col xs={24} md={8}>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginBottom: 4 }}>回测策略</div>
            <Select
              value={strategy}
              onChange={v => setStrategy(v)}
              options={STRATEGY_OPTIONS}
              style={{ width: '100%' }}
            />
          </Col>

          <Col xs={24} md={8}>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginBottom: 4 }}>回测区间</div>
            <RangePicker
              onChange={(_, dateStrings) => setDateRange(dateStrings as [string, string])}
              style={{ width: '100%' }}
            />
          </Col>

          <Col xs={24}>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleRunBacktest}
              loading={loading}
              size="large"
            >
              开始回测
            </Button>
          </Col>
        </Row>
      </Card>

      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 20 }} />}

      <Spin spinning={loading}>
        {result && (
          <>
            {/* 核心指标 */}
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
              <Col xs={12} md={6}>
                <Card className="stock-card">
                  <Statistic
                    title="总收益率"
                    value={result.totalReturn}
                    precision={2}
                    suffix="%"
                    valueStyle={{ color: result.totalReturn >= 0 ? 'var(--color-rise)' : 'var(--color-fall)' }}
                    prefix={result.totalReturn >= 0 ? <RiseOutlined /> : <FallOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card className="stock-card">
                  <Statistic
                    title="年化收益率"
                    value={result.annualizedReturn}
                    precision={2}
                    suffix="%"
                    valueStyle={{ color: result.annualizedReturn >= 0 ? 'var(--color-rise)' : 'var(--color-fall)' }}
                  />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card className="stock-card">
                  <Statistic
                    title="最大回撤"
                    value={result.maxDrawdown}
                    precision={2}
                    suffix="%"
                    valueStyle={{ color: 'var(--color-fall)' }}
                  />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card className="stock-card">
                  <Statistic
                    title="胜率"
                    value={result.winRate}
                    precision={1}
                    suffix="%"
                    valueStyle={{ color: result.winRate >= 50 ? 'var(--color-rise)' : 'var(--color-fall)' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 基本信息 */}
            <Card className="stock-card" style={{ marginBottom: 20 }}>
              <Descriptions column={{ xs: 2, md: 4 }}>
                <Descriptions.Item label="股票">{result.stockName} ({result.stockCode})</Descriptions.Item>
                <Descriptions.Item label="回测区间">{result.startDate} ~ {result.endDate}</Descriptions.Item>
                <Descriptions.Item label="总交易次数">{result.totalTrades}次</Descriptions.Item>
                <Descriptions.Item label="平均持仓">{result.avgHoldDays}天</Descriptions.Item>
                <Descriptions.Item label="初始资金">¥10,000</Descriptions.Item>
                <Descriptions.Item label="最终资金">
                  <span className="num-font" style={{ fontWeight: 600, color: result.finalValue >= 10000 ? 'var(--color-rise)' : 'var(--color-fall)' }}>
                    ¥{result.finalValue.toFixed(2)}
                  </span>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* 交易记录 */}
            {result.trades.length > 0 && (
              <Card className="stock-card" style={{ marginBottom: 20 }}>
                <h3 style={{ marginBottom: 16 }}>交易记录</h3>
                <Table
                  columns={tradeColumns}
                  dataSource={result.trades}
                  rowKey={(_, idx) => idx?.toString() ?? ''}
                  pagination={false}
                  size="small"
                />
              </Card>
            )}

            {/* 信号记录 */}
            {result.signals.length > 0 && (
              <Card className="stock-card">
                <h3 style={{ marginBottom: 16 }}>买卖信号（共{result.signals.length}个）</h3>
                <Table
                  columns={signalColumns}
                  dataSource={result.signals}
                  rowKey={(_, idx) => idx?.toString() ?? ''}
                  pagination={{ pageSize: 10 }}
                  size="small"
                  scroll={{ x: 600 }}
                />
              </Card>
            )}

            {result.signals.length === 0 && (
              <Alert message="在所选区间内未检测到任何买卖信号，请尝试其他策略或扩大时间范围" type="info" showIcon />
            )}
          </>
        )}
      </Spin>
    </div>
  )
}
