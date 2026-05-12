/**
 * 智能选股页
 */
import { useEffect, useState, useMemo } from 'react'
import { Card, Row, Col, Select, Slider, Button, Table, Tag, Spin, Space, Statistic, message } from 'antd'
import { FilterOutlined, ReloadOutlined, TrophyOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { fetchStockList } from '@/api/eastmoney'
import { generateSelectionList } from '@/strategies/filters'
import type { SelectionItem, SelectionFilter } from '@/types/stock'
import type { ColumnsType } from 'antd/es/table'

const STRATEGIES = [
  { value: 'all', label: '综合策略' },
  { value: 'trend', label: '趋势策略' },
  { value: 'value', label: '价值策略' },
  { value: 'growth', label: '成长策略' },
  { value: 'momentum', label: '动量策略' },
]

const SORT_OPTIONS = [
  { value: 'score', label: '综合评分' },
  { value: 'change', label: '涨跌幅' },
  { value: 'pe', label: '市盈率' },
  { value: 'turnover', label: '换手率' },
  { value: 'amount', label: '成交额' },
]

export default function Selection() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [allItems, setAllItems] = useState<SelectionItem[]>([])
  const [rawTotal, setRawTotal] = useState(0)

  const [filter, setFilter] = useState<SelectionFilter>({
    peRange: [0, 100],
    pbRange: [0, 10],
    roeMin: 0,
    changeRange: [-10, 10],
    turnoverRange: [0, 30],
    marketCapRange: [0, 10000],
    strategy: 'all',
    sortBy: 'score',
    sortOrder: 'desc',
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const list = await fetchStockList(1, 200, 'f3', 'desc')
      console.log('[智能选股] 原始返回:', list.total, '只, items=', list.items.length)
      setRawTotal(list.total)
      if (!list.items || list.items.length === 0) {
        message.warning('未获取到股票数据（接口返回为空），请检查网络或稍后重试')
        setAllItems([])
      } else {
        const selection = generateSelectionList(list.items)
        console.log('[智能选股] 过滤后:', selection.length, '只')
        if (selection.length === 0 && list.items.length > 0) {
          message.info('接口返回了数据，但全部被过滤（停牌/ST/科创板），尝试调整筛选条件')
        }
        setAllItems(selection)
      }
    } catch (e) {
      message.error('加载股票列表失败')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // 过滤和排序
  const filteredItems = useMemo(() => {
    let items = [...allItems]

    // PE 过滤
    items = items.filter(i =>
      i.quote.pe >= filter.peRange[0] && i.quote.pe <= filter.peRange[1]
    )
    // PB 过滤
    items = items.filter(i =>
      i.quote.pb >= filter.pbRange[0] && i.quote.pb <= filter.pbRange[1]
    )
    // ROE 过滤
    if (filter.roeMin > 0) {
      items = items.filter(i => {
        const roe = i.quote.pb > 0 && i.quote.pe > 0 ? (i.quote.pb / i.quote.pe) * 100 : 0
        return roe >= filter.roeMin
      })
    }
    // 涨跌幅过滤
    items = items.filter(i =>
      i.quote.changePercent >= filter.changeRange[0] && i.quote.changePercent <= filter.changeRange[1]
    )
    // 换手率过滤
    items = items.filter(i =>
      i.quote.turnover >= filter.turnoverRange[0] && i.quote.turnover <= filter.turnoverRange[1]
    )
    // 市值过滤
    items = items.filter(i => {
      const cap = i.quote.totalMarketCap / 1e8
      return cap >= filter.marketCapRange[0] && cap <= filter.marketCapRange[1]
    })

    // 策略过滤
    if (filter.strategy === 'trend') {
      items = items.filter(i => i.quote.changePercent > 0)
    } else if (filter.strategy === 'value') {
      items = items.filter(i => i.quote.pe > 0 && i.quote.pe < 20)
    } else if (filter.strategy === 'growth') {
      items = items.filter(i => i.quote.changePercent > 2)
    } else if (filter.strategy === 'momentum') {
      items = items.filter(i => i.quote.volumeRatio > 1.2)
    }

    // 排序
    const sortKey = filter.sortBy
    const dir = filter.sortOrder === 'desc' ? -1 : 1
    items.sort((a, b) => {
      let av = 0, bv = 0
      switch (sortKey) {
        case 'score': av = a.score.total; bv = b.score.total; break
        case 'change': av = a.quote.changePercent; bv = b.quote.changePercent; break
        case 'pe': av = a.quote.pe; bv = b.quote.pe; break
        case 'turnover': av = a.quote.turnover; bv = b.quote.turnover; break
        case 'amount': av = a.quote.amount; bv = b.quote.amount; break
      }
      return (av - bv) * dir
    })

    return items
  }, [allItems, filter])

  const filteredCount = filteredItems.length

  const getColorClass = (val: number) => val > 0 ? 'text-rise' : val < 0 ? 'text-fall' : 'text-flat'

  const columns: ColumnsType<SelectionItem> = [
    {
      title: '排名',
      width: 60,
      render: (_, __, idx) => (
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: idx < 3 ? 'var(--color-accent)' : 'var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 13,
        }}>
          {idx + 1}
        </div>
      ),
    },
    {
      title: '股票',
      dataIndex: ['quote', 'name'],
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{record.quote.name}</div>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{record.quote.code}</div>
        </div>
      ),
    },
    {
      title: '最新价',
      dataIndex: ['quote', 'price'],
      render: (_, record) => (
        <span className={`num-font ${getColorClass(record.quote.changePercent)}`} style={{ fontWeight: 600 }}>
          {record.quote.price.toFixed(2)}
        </span>
      ),
      sorter: (a, b) => a.quote.price - b.quote.price,
    },
    {
      title: '涨跌幅',
      dataIndex: ['quote', 'changePercent'],
      render: (_, record) => (
        <span className={`num-font ${getColorClass(record.quote.changePercent)}`} style={{ fontWeight: 600 }}>
          {record.quote.changePercent >= 0 ? '+' : ''}{record.quote.changePercent.toFixed(2)}%
        </span>
      ),
      sorter: (a, b) => a.quote.changePercent - b.quote.changePercent,
    },
    {
      title: '综合评分',
      dataIndex: ['score', 'total'],
      render: (_, record) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 20, fontWeight: 700,
            color: record.score.total >= 65 ? 'var(--color-rise)' : record.score.total >= 45 ? '#f39c12' : 'var(--color-fall)',
          }}>
            {record.score.total}
          </div>
          <Tag color={record.score.total >= 65 ? 'red' : record.score.total >= 45 ? 'orange' : 'green'} style={{ fontSize: 11 }}>
            {record.score.rating}
          </Tag>
        </div>
      ),
      sorter: (a, b) => a.score.total - b.score.total,
      defaultSortOrder: 'descend',
    },
    {
      title: 'PE',
      dataIndex: ['quote', 'pe'],
      render: (_, record) => <span className="num-font">{record.quote.pe.toFixed(1)}</span>,
      sorter: (a, b) => a.quote.pe - b.quote.pe,
    },
    {
      title: '换手率',
      dataIndex: ['quote', 'turnover'],
      render: (_, record) => <span className="num-font">{record.quote.turnover.toFixed(2)}%</span>,
      sorter: (a, b) => a.quote.turnover - b.quote.turnover,
    },
    {
      title: '成交额(亿)',
      render: (_, record) => <span className="num-font">{(record.quote.amount / 1e8).toFixed(2)}</span>,
      sorter: (a, b) => a.quote.amount - b.quote.amount,
    },
    {
      title: '命中因子',
      dataIndex: 'matchedFactors',
      render: (_, record) => (
        <Space size={[4, 4]} wrap>
          {record.matchedFactors.map(f => <Tag key={f} color="blue" style={{ fontSize: 11 }}>{f}</Tag>)}
        </Space>
      ),
    },
    {
      title: '操作',
      width: 80,
      render: (_, record) => (
        <Button type="link" size="small" onClick={e => { e.stopPropagation(); navigate(`/diagnosis/${record.quote.code}`) }}>
          诊断
        </Button>
      ),
    },
  ]

  return (
    <div className="fade-in">
      <h2 style={{ marginBottom: 20, fontSize: 22 }}>
        <TrophyOutlined style={{ color: 'var(--color-accent)', marginRight: 8 }} />
        智能选股
      </h2>

      {/* 筛选面板 */}
      <Card className="stock-card" style={{ marginBottom: 20 }}>
        <Row gutter={[24, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginBottom: 4 }}>选股策略</div>
            <Select
              value={filter.strategy}
              onChange={v => setFilter(f => ({ ...f, strategy: v }))}
              options={STRATEGIES}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginBottom: 4 }}>排序方式</div>
            <Select
              value={filter.sortBy}
              onChange={v => setFilter(f => ({ ...f, sortBy: v }))}
              options={SORT_OPTIONS}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginBottom: 4 }}>PE范围: {filter.peRange[0]} - {filter.peRange[1]}</div>
            <Slider range min={0} max={200} value={filter.peRange} onChange={v => setFilter(f => ({ ...f, peRange: v as [number, number] }))} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginBottom: 4 }}>涨跌幅范围: {filter.changeRange[0]}% ~ {filter.changeRange[1]}%</div>
            <Slider range min={-10} max={20} value={filter.changeRange} onChange={v => setFilter(f => ({ ...f, changeRange: v as [number, number] }))} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginBottom: 4 }}>换手率: {filter.turnoverRange[0]}% - {filter.turnoverRange[1]}%</div>
            <Slider range min={0} max={50} value={filter.turnoverRange} onChange={v => setFilter(f => ({ ...f, turnoverRange: v as [number, number] }))} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginBottom: 4 }}>排序方向</div>
            <Select
              value={filter.sortOrder}
              onChange={v => setFilter(f => ({ ...f, sortOrder: v }))}
              options={[
                { value: 'desc', label: '降序' },
                { value: 'asc', label: '升序' },
              ]}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} md={12}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>刷新数据</Button>
              <Button icon={<FilterOutlined />} onClick={() => setFilter({
                peRange: [0, 100], pbRange: [0, 10], roeMin: 0, changeRange: [-10, 10],
                turnoverRange: [0, 30], marketCapRange: [0, 10000], strategy: 'all',
                sortBy: 'score', sortOrder: 'desc',
              })}>重置筛选</Button>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
                全市场 {rawTotal} 只 → 过滤后 {filteredCount} 只
              </span>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 结果表格 */}
      <Card className="stock-card">
        <Table
          columns={columns}
          dataSource={filteredItems}
          rowKey={r => r.quote.code}
          loading={loading}
          pagination={{ pageSize: 50, showSizeChanger: true, showTotal: t => `共 ${t} 只` }}
          scroll={{ x: 1200 }}
          size="middle"
          onRow={record => ({
            style: { cursor: 'pointer' },
            onClick: () => navigate(`/diagnosis/${record.quote.code}`),
          })}
        />
      </Card>
    </div>
  )
}
