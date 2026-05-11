/**
 * 股票诊断页 —— 支持自动刷新
 */
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Input, Card, Row, Col, Tag, Descriptions, Spin, Alert, Button, Divider, Space, message } from 'antd'
import { SearchOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import KLineChart from '@/components/KLineChart'
import ScoreGauge from '@/components/ScoreGauge'
import { useStockData } from '@/hooks/useStockData'
import { searchStock } from '@/api/eastmoney'

const { Search } = Input

const ratingColors: Record<string, string> = {
  '强烈推荐': '#e74c3c',
  '推荐': '#e67e22',
  '中性': '#f39c12',
  '谨慎': '#3498db',
  '回避': '#c0392b',
}

export default function Diagnosis() {
  const { code: urlCode } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { loading, error, result, diagnose, isAutoRefreshing, startAutoRefresh, stopAutoRefresh } = useStockData()
  const [searchValue, setSearchValue] = useState(urlCode ?? '')
  const [lastUpdated, setLastUpdated] = useState('')

  // URL 代码变化时：诊断 + 启动自动刷新
  useEffect(() => {
    if (!urlCode) return
    setSearchValue(urlCode)
    diagnose(urlCode)
    // 启动自动刷新（每5秒）
    startAutoRefresh(urlCode, 5000)
    return () => stopAutoRefresh()
  }, [urlCode])

  // 诊断完成后更新时间
  useEffect(() => {
    if (result) setLastUpdated(new Date().toLocaleTimeString('zh-CN'))
  }, [result])

  const onSearch = async (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return

    // 尝试直接作为代码诊断
    if (/^\d{6}$/.test(trimmed)) {
      navigate(`/diagnosis/${trimmed}`)
      return
    }

    // 作为名称搜索
    try {
      const results = await searchStock(trimmed)
      if (results && results.length > 0 && results[0]) {
        navigate(`/diagnosis/${results[0].code}`)
      } else {
        message.warning('未找到匹配的股票')
      }
    } catch {
      message.error('搜索失败，请输入6位股票代码')
    }
  }

  const getColorClass = (val: number) => val > 0 ? 'text-rise' : val < 0 ? 'text-fall' : 'text-flat'

  return (
    <div className="fade-in">
      {/* 搜索栏 */}
      <Card className="stock-card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 16, fontSize: 20 }}>🔍 股票诊断</h2>
        <Search
          placeholder="输入股票代码（如 600519）或名称（如 贵州茅台）"
          enterButton={<><SearchOutlined /> 诊断</>}
          size="large"
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          onSearch={onSearch}
          loading={loading}
          style={{ maxWidth: 600 }}
        />
        <div style={{ marginTop: 8, color: 'var(--color-text-secondary)', fontSize: 12 }}>
          快速试试：
          <Space size={4}>
            {['600519', '000001', '300750', '601318'].map(c => (
              <Button key={c} size="small" type="link" onClick={() => navigate(`/diagnosis/${c}`)}>{c}</Button>
            ))}
          </Space>
        </div>
      </Card>

      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 20 }} />}

      <Spin spinning={loading} size="large">
        {result && (
          <>
            {/* 股票概览 + 评分 */}
            <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
              <Col xs={24} lg={16}>
                <Card className="stock-card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 24 }}>
                        {result.quote.name}
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: 16, marginLeft: 8 }}>{result.quote.code}</span>
                        {result.quote.isST && <Tag color="orange" style={{ marginLeft: 8 }}>ST</Tag>}
                        <Button
                          size="small"
                          type={isAutoRefreshing ? 'primary' : 'default'}
                          danger={isAutoRefreshing}
                          onClick={() => isAutoRefreshing ? stopAutoRefresh() : startAutoRefresh(result.quote.code, 5000)}
                          style={{ marginLeft: 12 }}
                        >
                          {isAutoRefreshing ? '⏸ 停止刷新' : '🔄 自动刷新'}
                        </Button>
                        {isAutoRefreshing && <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginLeft: 8 }}>每5秒自动更新中...</span>}
                      </h2>
                      <div style={{ marginTop: 12 }}>
                        <span className={`num-font ${getColorClass(result.quote.changePercent)}`} style={{ fontSize: 36, fontWeight: 700 }}>
                          {result.quote.price.toFixed(2)}
                        </span>
                        <span className={`num-font ${getColorClass(result.quote.changePercent)}`} style={{ fontSize: 18, marginLeft: 12 }}>
                          {result.quote.change >= 0 ? '+' : ''}{result.quote.change.toFixed(2)}
                          ({result.quote.changePercent >= 0 ? '+' : ''}{result.quote.changePercent.toFixed(2)}%)
                        </span>
                        {result.quote.changePercent >= 0 ? <ArrowUpOutlined className="text-rise" style={{ marginLeft: 8 }} /> : <ArrowDownOutlined className="text-fall" style={{ marginLeft: 8 }} />}
                      </div>
                    </div>
                    <Tag color={ratingColors[result.score.rating] ?? 'default'} style={{ fontSize: 16, padding: '6px 16px' }}>
                      {result.score.rating}
                    </Tag>
                  </div>

                  <Divider style={{ borderColor: 'var(--color-border)' }} />

                  <Descriptions column={{ xs: 2, sm: 3, md: 4 }} size="small">
                    <Descriptions.Item label="开盘">{result.quote.open.toFixed(2)}</Descriptions.Item>
                    <Descriptions.Item label="昨收">{result.quote.close.toFixed(2)}</Descriptions.Item>
                    <Descriptions.Item label="最高"><span className="text-rise">{result.quote.high.toFixed(2)}</span></Descriptions.Item>
                    <Descriptions.Item label="最低"><span className="text-fall">{result.quote.low.toFixed(2)}</span></Descriptions.Item>
                    <Descriptions.Item label="成交量">{(result.quote.volume / 10000).toFixed(2)}万手</Descriptions.Item>
                    <Descriptions.Item label="成交额">{(result.quote.amount / 1e8).toFixed(2)}亿</Descriptions.Item>
                    <Descriptions.Item label="换手率">{result.quote.turnover.toFixed(2)}%</Descriptions.Item>
                    <Descriptions.Item label="量比">{result.quote.volumeRatio.toFixed(2)}</Descriptions.Item>
                    <Descriptions.Item label="PE(动)">{result.quote.pe.toFixed(2)}</Descriptions.Item>
                    <Descriptions.Item label="PB">{result.quote.pb.toFixed(2)}</Descriptions.Item>
                    <Descriptions.Item label="总市值">{(result.quote.totalMarketCap / 1e8).toFixed(0)}亿</Descriptions.Item>
                    <Descriptions.Item label="振幅">{result.quote.amplitude.toFixed(2)}%</Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>

              <Col xs={24} lg={8}>
                <Card className="stock-card" style={{ textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <ScoreGauge score={result.score.total} />
                  <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 8 }}>
                    {result.score.suggestion}
                  </div>
                </Card>
              </Col>
            </Row>

            {/* K线图 */}
            <Card className="stock-card" style={{ marginBottom: 20 }}>
              <h3 style={{ marginBottom: 8 }}>📈 K线走势（近120交易日）</h3>
              <KLineChart data={result.klines} stockName={result.quote.name} />
            </Card>

            {/* 三维度分析 */}
            <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
              {/* 技术面 */}
              <Col xs={24} lg={8}>
                <Card className="stock-card" style={{ height: '100%' }}>
                  <h3 style={{ marginBottom: 16, color: '#e74c3c' }}>📊 技术面分析 <Tag color="red">{result.score.technical}分</Tag></h3>
                  <Descriptions column={1} size="small" labelStyle={{ color: 'var(--color-text-secondary)' }}>
                    <Descriptions.Item label="MACD">
                      <Tag color={result.technical.macd.signal === 'golden' ? 'red' : result.technical.macd.signal === 'death' ? 'green' : 'default'}>
                        {result.technical.macd.signal === 'golden' ? '金叉' : result.technical.macd.signal === 'death' ? '死叉' : '中性'}
                      </Tag>
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        DIF={result.technical.macd.dif.toFixed(3)} DEA={result.technical.macd.dea.toFixed(3)}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="KDJ">
                      <Tag color={result.technical.kdj.signal === 'oversold' ? 'blue' : result.technical.kdj.signal === 'overbought' ? 'red' : 'default'}>
                        {result.technical.kdj.signal === 'oversold' ? '超卖' : result.technical.kdj.signal === 'overbought' ? '超买' : '中性'}
                      </Tag>
                      K={result.technical.kdj.k.toFixed(1)} D={result.technical.kdj.d.toFixed(1)} J={result.technical.kdj.j.toFixed(1)}
                    </Descriptions.Item>
                    <Descriptions.Item label="RSI">
                      <Tag color={result.technical.rsi.signal === 'oversold' ? 'blue' : result.technical.rsi.signal === 'overbought' ? 'red' : 'default'}>
                        {result.technical.rsi.signal === 'oversold' ? '超卖' : result.technical.rsi.signal === 'overbought' ? '超买' : '中性'}
                      </Tag>
                      RSI6={result.technical.rsi.rsi6.toFixed(1)} RSI12={result.technical.rsi.rsi12.toFixed(1)}
                    </Descriptions.Item>
                    <Descriptions.Item label="均线">
                      <Tag color={result.technical.ma.arrangement === 'bull' ? 'red' : result.technical.ma.arrangement === 'bear' ? 'green' : 'default'}>
                        {result.technical.ma.arrangement === 'bull' ? '多头排列' : result.technical.ma.arrangement === 'bear' ? '空头排列' : '交叉'}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="布林带">
                      <Tag color={result.technical.boll.position === 'below' ? 'blue' : result.technical.boll.position === 'above' ? 'red' : 'default'}>
                        {result.technical.boll.position === 'above' ? '上轨上方' : result.technical.boll.position === 'below' ? '下轨下方' : '中轨附近'}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="成交量">
                      <Tag color={result.technical.volume.signal === 'heavy' ? 'red' : result.technical.volume.signal === 'shrink' ? 'green' : 'default'}>
                        {result.technical.volume.signal === 'heavy' ? '放量' : result.technical.volume.signal === 'shrink' ? '缩量' : '正常'}
                      </Tag>
                      量比 {result.technical.volume.ratio.toFixed(2)}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>

              {/* 基本面 */}
              <Col xs={24} lg={8}>
                <Card className="stock-card" style={{ height: '100%' }}>
                  <h3 style={{ marginBottom: 16, color: '#3498db' }}>📋 基本面分析 <Tag color="blue">{result.score.fundamental}分</Tag></h3>
                  <Descriptions column={1} size="small" labelStyle={{ color: 'var(--color-text-secondary)' }}>
                    <Descriptions.Item label="市盈率(PE)">{result.fundamental.pe.toFixed(2)}</Descriptions.Item>
                    <Descriptions.Item label="市净率(PB)">{result.fundamental.pb.toFixed(2)}</Descriptions.Item>
                    <Descriptions.Item label="ROE(估)">{result.fundamental.roe.toFixed(2)}%</Descriptions.Item>
                    <Descriptions.Item label="每股收益(EPS)">{result.fundamental.eps.toFixed(2)}元</Descriptions.Item>
                    <Descriptions.Item label="每股净资产(BPS)">{result.fundamental.bps.toFixed(2)}元</Descriptions.Item>
                  </Descriptions>
                  <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(52,152,219,0.1)', borderRadius: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    💡 PE/PB/ROE 数据来自实时行情估算，精确数据需参考定期财报
                  </div>
                </Card>
              </Col>

              {/* 资金面 */}
              <Col xs={24} lg={8}>
                <Card className="stock-card" style={{ height: '100%' }}>
                  <h3 style={{ marginBottom: 16, color: '#f39c12' }}>💰 资金面分析 <Tag color="orange">{result.score.moneyFlow}分</Tag></h3>
                  <Descriptions column={1} size="small" labelStyle={{ color: 'var(--color-text-secondary)' }}>
                    <Descriptions.Item label="主力净流入">
                      <span className={result.moneyFlow.mainNetInflow >= 0 ? 'text-rise' : 'text-fall'} style={{ fontWeight: 600 }}>
                        {result.moneyFlow.mainNetInflow >= 0 ? '+' : ''}{(result.moneyFlow.mainNetInflow / 10000).toFixed(2)}万
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="超大单净流入">
                      <span className={result.moneyFlow.largeNetInflow >= 0 ? 'text-rise' : 'text-fall'}>
                        {(result.moneyFlow.largeNetInflow / 10000).toFixed(2)}万
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="大单净流入">
                      <span className={result.moneyFlow.bigNetInflow >= 0 ? 'text-rise' : 'text-fall'}>
                        {(result.moneyFlow.bigNetInflow / 10000).toFixed(2)}万
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="中单净流入">
                      <span className={result.moneyFlow.midNetInflow >= 0 ? 'text-rise' : 'text-fall'}>
                        {(result.moneyFlow.midNetInflow / 10000).toFixed(2)}万
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="小单净流入">
                      <span className={result.moneyFlow.smallNetInflow >= 0 ? 'text-rise' : 'text-fall'}>
                        {(result.moneyFlow.smallNetInflow / 10000).toFixed(2)}万
                      </span>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
            </Row>

            {/* 亮点与风险 */}
            <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
              <Col xs={24} md={12}>
                <Card className="stock-card">
                  <h3 style={{ color: '#e74c3c', marginBottom: 12 }}>✅ 亮点</h3>
                  {result.score.highlights.length > 0 ? (
                    <ul style={{ paddingLeft: 20, margin: 0 }}>
                      {result.score.highlights.map((h, i) => <li key={i} style={{ marginBottom: 6 }}>{h}</li>)}
                    </ul>
                  ) : (
                    <div style={{ color: 'var(--color-text-secondary)' }}>暂无明显亮点</div>
                  )}
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card className="stock-card">
                  <h3 style={{ color: '#27ae60', marginBottom: 12 }}>⚠️ 风险点</h3>
                  {result.score.risks.length > 0 ? (
                    <ul style={{ paddingLeft: 20, margin: 0 }}>
                      {result.score.risks.map((r, i) => <li key={i} style={{ marginBottom: 6 }}>{r}</li>)}
                    </ul>
                  ) : (
                    <div style={{ color: 'var(--color-text-secondary)' }}>暂无明显风险</div>
                  )}
                </Card>
              </Col>
            </Row>

            {/* 免责声明 */}
            <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 12, padding: '8px 0' }}>
              最后更新：{lastUpdated || result.diagnoseTime} | 以上分析仅供参考，不构成投资建议
              {isAutoRefreshing && ' | ⏸ 自动刷新中（每5秒）'}
            </div>
          </>
        )}
      </Spin>
    </div>
  )
}
