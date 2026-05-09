import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Button, Spin, Input, message, Tabs } from 'antd'
import { useRequest } from 'ahooks'
import { useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { getStockQuote, getStockKline } from '../services/stockApi'

export default function StockDetail() {
  const { code: urlCode } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [inputCode, setInputCode] = useState(urlCode ?? '')

  const { data: quote, loading: quoteLoading } = useRequest(
    () => getStockQuote(urlCode!),
    { ready: !!urlCode, refreshDeps: [urlCode] }
  )

  const { data: kline, loading: klineLoading } = useRequest(
    () => getStockKline(urlCode!, 'day', 120),
    { ready: !!urlCode, refreshDeps: [urlCode] }
  )

  const handleSearch = () => {
    const c = inputCode.trim()
    if (!c) {
      message.warning('请输入股票代码')
      return
    }
    navigate(`/detail/${c}`)
  }

  const klineOption = kline ? {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
    },
    grid: { left: '10%', right: '10%', bottom: '15%' },
    xAxis: {
      type: 'category',
      data: kline.dates,
      axisLabel: { rotate: 45 },
    },
    yAxis: { type: 'value', scale: true },
    series: [
      {
        name: '收盘价',
        type: 'line',
        data: kline.closes,
        smooth: true,
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.1 },
      },
    ],
  } : null

  if (!urlCode) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <h3>请输入股票代码查看详情</h3>
        <Input.Search
          placeholder="输入股票代码，如 600519"
          value={inputCode}
          onChange={(e) => setInputCode(e.target.value)}
          onSearch={handleSearch}
          style={{ width: 400, marginTop: 16 }}
          enterButton={<Button type="primary">查看</Button>}
        />
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button onClick={() => navigate('/')}>返回列表</Button>
      </div>

      {quoteLoading ? (
        <Spin size="large" style={{ display: 'block', margin: '60px auto' }} />
      ) : quote ? (
        <>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
              <span style={{ fontSize: 24, fontWeight: 'bold' }}>{quote.name}</span>
              <span style={{ fontSize: 16, color: '#999' }}>{quote.code}</span>
              <span style={{ fontSize: 28, fontWeight: 'bold', color: quote.change > 0 ? '#cf1322' : quote.change < 0 ? '#3f8600' : '#000' }}>
                {quote.price?.toFixed(2)}
              </span>
              <span style={{ fontSize: 16, color: quote.change > 0 ? '#cf1322' : quote.change < 0 ? '#3f8600' : '#000' }}>
                {quote.change > 0 ? '+' : ''}{quote.change?.toFixed(2)} ({quote.changePercent > 0 ? '+' : ''}{quote.changePercent?.toFixed(2)}%)
              </span>
            </div>
          </Card>

          <Tabs
            items={[
              {
                key: 'basic',
                label: '基本行情',
                children: (
                  <Descriptions bordered column={3} size="small">
                    <Descriptions.Item label="今开">{quote.open?.toFixed(2)}</Descriptions.Item>
                    <Descriptions.Item label="昨收">{quote.prevClose?.toFixed(2)}</Descriptions.Item>
                    <Descriptions.Item label="最高">{quote.high?.toFixed(2)}</Descriptions.Item>
                    <Descriptions.Item label="最低">{quote.low?.toFixed(2)}</Descriptions.Item>
                    <Descriptions.Item label="成交量">{quote.volume ? `${(quote.volume / 10000).toFixed(2)}万手` : '-'}</Descriptions.Item>
                    <Descriptions.Item label="成交额">{quote.turnover ? `${(quote.turnover / 100000000).toFixed(2)}亿` : '-'}</Descriptions.Item>
                    <Descriptions.Item label="换手率">{quote.turnoverRate?.toFixed(2)}%</Descriptions.Item>
                    <Descriptions.Item label="市盈率">{quote.pe?.toFixed(2)}</Descriptions.Item>
                    <Descriptions.Item label="市净率">{quote.pb?.toFixed(2)}</Descriptions.Item>
                    <Descriptions.Item label="总市值">{quote.marketCap ? `${(quote.marketCap / 100000000).toFixed(2)}亿` : '-'}</Descriptions.Item>
                    <Descriptions.Item label="流通市值">{quote.floatCap ? `${(quote.floatCap / 100000000).toFixed(2)}亿` : '-'}</Descriptions.Item>
                    <Descriptions.Item label="振幅">{quote.amplitude?.toFixed(2)}%</Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'chart',
                label: 'K线图',
                children: klineLoading ? (
                  <Spin size="large" style={{ display: 'block', margin: '60px auto' }} />
                ) : klineOption ? (
                  <ReactECharts option={klineOption} style={{ height: 400 }} />
                ) : (
                  <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无K线数据</div>
                ),
              },
            ]}
          />
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
          未找到股票数据，请检查代码是否正确
        </div>
      )}
    </div>
  )
}
