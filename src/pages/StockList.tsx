import { Card, Table, Input, Button, Space, Tag, message } from 'antd'
import { useState } from 'react'
import { useRequest } from 'ahooks'
import { useNavigate } from 'react-router-dom'
import { searchStocks, getMarketOverview } from '../services/stockApi'
import type { ColumnsType } from 'antd/es/table'

interface StockItem {
  code: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  turnover: number
  high: number
  low: number
  open: number
  prevClose: number
}

const columns: ColumnsType<StockItem> = [
  { title: '代码', dataIndex: 'code', key: 'code', width: 100 },
  { title: '名称', dataIndex: 'name', key: 'name', width: 120 },
  {
    title: '最新价', dataIndex: 'price', key: 'price', width: 100,
    render: (v: number) => v?.toFixed(2) ?? '-',
  },
  {
    title: '涨跌幅', dataIndex: 'changePercent', key: 'changePercent', width: 100,
    render: (v: number) => (
      <Tag color={v > 0 ? 'red' : v < 0 ? 'green' : 'default'}>
        {v > 0 ? '+' : ''}{v?.toFixed(2)}%
      </Tag>
    ),
  },
  {
    title: '涨跌额', dataIndex: 'change', key: 'change', width: 100,
    render: (v: number) => (
      <span style={{ color: v > 0 ? '#cf1322' : v < 0 ? '#3f8600' : '#000' }}>
        {v > 0 ? '+' : ''}{v?.toFixed(2)}
      </span>
    ),
  },
  {
    title: '成交量', dataIndex: 'volume', key: 'volume', width: 120,
    render: (v: number) => v ? `${(v / 10000).toFixed(2)}万` : '-',
  },
  {
    title: '成交额', dataIndex: 'turnover', key: 'turnover', width: 120,
    render: (v: number) => v ? `${(v / 100000000).toFixed(2)}亿` : '-',
  },
  {
    title: '最高', dataIndex: 'high', key: 'high', width: 100,
    render: (v: number) => v?.toFixed(2) ?? '-',
  },
  {
    title: '最低', dataIndex: 'low', key: 'low', width: 100,
    render: (v: number) => v?.toFixed(2) ?? '-',
  },
  {
    title: '开盘', dataIndex: 'open', key: 'open', width: 100,
    render: (v: number) => v?.toFixed(2) ?? '-',
  },
  {
    title: '昨收', dataIndex: 'prevClose', key: 'prevClose', width: 100,
    render: (v: number) => v?.toFixed(2) ?? '-',
  },
]

export default function StockList() {
  const [keyword, setKeyword] = useState('')
  const navigate = useNavigate()

  const { data, loading, run } = useRequest(
    () => searchStocks(keyword || '沪深A股'),
    { manual: false }
  )

  const { data: overview } = useRequest(() => getMarketOverview(), {
    onError: () => {},
  })

  const handleSearch = () => {
    if (!keyword.trim()) {
      message.warning('请输入股票代码或名称')
      return
    }
    run()
  }

  const stocks: StockItem[] = data?.list ?? []

  return (
    <div>
      {overview && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          {overview.map((item: { name: string; price: number; change: number; changePercent: number }) => (
            <Card key={item.name} size="small" style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: '#666' }}>{item.name}</div>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: item.change > 0 ? '#cf1322' : item.change < 0 ? '#3f8600' : '#000' }}>
                {item.price?.toFixed(2)}
              </div>
              <div style={{ color: item.change > 0 ? '#cf1322' : item.change < 0 ? '#3f8600' : '#000' }}>
                {item.change > 0 ? '+' : ''}{item.change?.toFixed(2)} ({item.changePercent > 0 ? '+' : ''}{item.changePercent?.toFixed(2)}%)
              </div>
            </Card>
          ))}
        </div>
      )}

      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="输入股票代码或名称，如 600519、贵州茅台"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onSearch={handleSearch}
          style={{ width: 400 }}
          enterButton={<Button type="primary">搜索</Button>}
        />
      </Space>

      <Table
        columns={columns}
        dataSource={stocks}
        rowKey="code"
        loading={loading}
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
        size="small"
        scroll={{ x: 1200 }}
        onRow={(record) => ({
          onClick: () => navigate(`/detail/${record.code}`),
          style: { cursor: 'pointer' },
        })}
      />
    </div>
  )
}
