import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Tag, Spin, List, Button, Badge } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined, ThunderboltOutlined, ReloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { fetchMarketIndices, fetchStockList, fetchMarketSentiment } from '@/api/eastmoney'
import { generateSelectionList } from '@/strategies/filters'
import type { MarketIndex, MarketSentiment, SelectionItem } from '@/types/stock'

const SENTIMENT_MAP: Record<string, { label: string; color: string }> = {
  extreme_greed: { label: '极度贪婪', color: '#e74c3c' },
  greed: { label: '贪婪', color: '#e67e22' },
  neutral: { label: '中性', color: '#f39c12' },
  fear: { label: '恐惧', color: '#3498db' },
  extreme_fear: { label: '极度恐惧', color: '#27ae60' },
}

export default function Home() {
  const navigate = useNavigate()
  const [indices, setIndices] = useState<MarketIndex[]>([])
  const [sentiment, setSentiment] = useState<MarketSentiment | null>(null)
  const [topStocks, setTopStocks] = useState<SelectionItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
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
    } catch (e) {
      console.error('加载数据失败:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const getColorClass = (val: number) => val > 0 ? 'text-rise' : val < 0 ? 'text-fall' : 'text-flat'

  return (
    <div className="fade-in">
      {/* 顶部操作栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>📊 市场总览</h2>
        <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>刷新数据</Button>
      </div>

      <Spin spinning={loading}>
        {/* 大盘指数 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          {indices.map(idx => (
            <Col xs={24} sm={8} key={idx.code}>
              <Card
                className="stock-card"
                style={{ borderTop: `3px solid ${idx.changePercent >= 0 ? 'var(--color-rise)' : 'var(--color-fall)'}` }}
              >
                <Statistic
                  title={<span style={{ fontSize: 16, fontWeight: 600 }}>{idx.name}</span>}
                  value={idx.price}
                  precision={2}
                  valueStyle={{ color: idx.changePercent >= 0 ? 'var(--color-rise)' : 'var(--color-fall)', fontSize: 28, fontWeight: 700 }}
                  prefix={idx.changePercent >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  suffix={
                    <span style={{ fontSize: 14, marginLeft: 8 }}>
                      {idx.changePercent >= 0 ? '+' : ''}{idx.changePercent.toFixed(2)}%
                    </span>
                  }
                />
                <div style={{ marginTop: 8, color: 'var(--color-text-secondary)', fontSize: 12 }}>
                  {idx.change >= 0 ? '+' : ''}{idx.change.toFixed(2)} | 成交额 {(idx.amount / 1e8).toFixed(0)}亿
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* 市场情绪 */}
        {sentiment && (
          <Card className="stock-card" style={{ marginBottom: 20 }}>
            <Row gutter={24} align="middle">
              <Col flex="auto">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>🌡️ 市场情绪</span>
                  <Tag color={SENTIMENT_MAP[sentiment.sentiment]?.color} style={{ fontSize: 14, padding: '4px 12px' }}>
                    {SENTIMENT_MAP[sentiment.sentiment]?.label} ({sentiment.sentimentScore})
                  </Tag>
                  <Badge color="var(--color-rise)" text={<span className="text-rise">上涨 {sentiment.riseCount}</span>} />
                  <Badge color="var(--color-fall)" text={<span className="text-fall">下跌 {sentiment.fallCount}</span>} />
                  <Badge color="var(--color-flat)" text={<span className="text-flat">平盘 {sentiment.flatCount}</span>} />
                  <Tag color="red">涨停 {sentiment.limitUpCount}</Tag>
                  <Tag color="green">跌停 {sentiment.limitDownCount}</Tag>
                </div>
              </Col>
            </Row>
          </Card>
        )}

        {/* 今日推荐 Top10 */}
        <Card className="stock-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>
              <ThunderboltOutlined style={{ color: 'var(--color-accent)', marginRight: 8 }} />
              今日综合评分 Top 10
            </h3>
            <Button type="link" onClick={() => navigate('/selection')}>查看全部选股 →</Button>
          </div>
          <List
            dataSource={topStocks}
            renderItem={(item, idx) => (
              <List.Item
                style={{ cursor: 'pointer', padding: '12px 8px', borderBottom: '1px solid var(--color-border)' }}
                onClick={() => navigate(`/diagnosis/${item.quote.code}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 16, flexWrap: 'wrap' }}>
                  {/* 排名 */}
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: idx < 3 ? 'var(--color-accent)' : 'var(--color-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 14, flexShrink: 0,
                  }}>
                    {idx + 1}
                  </div>

                  {/* 股票信息 */}
                  <div style={{ minWidth: 160 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{item.quote.name}</div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{item.quote.code}</div>
                  </div>

                  {/* 价格 */}
                  <div style={{ minWidth: 80 }}>
                    <div className={`num-font ${getColorClass(item.quote.changePercent)}`} style={{ fontWeight: 600, fontSize: 16 }}>
                      {item.quote.price.toFixed(2)}
                    </div>
                    <div className={`num-font ${getColorClass(item.quote.changePercent)}`} style={{ fontSize: 12 }}>
                      {item.quote.changePercent >= 0 ? '+' : ''}{item.quote.changePercent.toFixed(2)}%
                    </div>
                  </div>

                  {/* 评分 */}
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{
                      fontSize: 24, fontWeight: 700,
                      color: item.score.total >= 65 ? 'var(--color-rise)' : item.score.total >= 45 ? '#f39c12' : 'var(--color-fall)',
                    }}>
                      {item.score.total}
                    </div>
                    <Tag color={item.score.total >= 65 ? 'red' : item.score.total >= 45 ? 'orange' : 'green'} style={{ fontSize: 11 }}>
                      {item.score.rating}
                    </Tag>
                  </div>

                  {/* 命中因子 */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {item.matchedFactors.map(f => (
                      <Tag key={f} color="blue" style={{ fontSize: 11 }}>{f}</Tag>
                    ))}
                  </div>
                </div>
              </List.Item>
            )}
          />
        </Card>
      </Spin>
    </div>
  )
}
