/**
 * 关于页
 */
import { Card, Tag, Descriptions, Divider, Timeline } from 'antd'
import { GithubOutlined, CodeOutlined, SafetyOutlined, ExperimentOutlined } from '@ant-design/icons'

export default function About() {
  return (
    <div className="fade-in" style={{ maxWidth: 800, margin: '0 auto' }}>
      <Card className="stock-card" style={{ marginBottom: 20 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 32, marginBottom: 8 }}>
            📈 A股智能选股系统
          </h1>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 16 }}>
            基于技术面、基本面、资金面的多维度智能分析系统
          </div>
          <div style={{ marginTop: 12 }}>
            <Tag color="red">v1.0.0</Tag>
            <Tag color="blue">React + TypeScript</Tag>
            <Tag color="green">MIT License</Tag>
          </div>
        </div>
      </Card>

      <Card className="stock-card" style={{ marginBottom: 20 }}>
        <h2><ExperimentOutlined style={{ marginRight: 8, color: 'var(--color-accent)' }} />核心功能</h2>
        <Divider style={{ borderColor: 'var(--color-border)' }} />
        <Timeline
          items={[
            { color: 'red', children: <><strong>股票诊断</strong><div style={{ color: 'var(--color-text-secondary)' }}>输入股票代码，多维度分析技术面、基本面、资金面，综合评分 0-100，给出评级和操作建议</div></> },
            { color: 'blue', children: <><strong>智能选股</strong><div style={{ color: 'var(--color-text-secondary)' }}>多因子策略筛选，自动排除科创板(688)和ST股票，支持趋势/价值/成长/动量四种策略</div></> },
            { color: 'orange', children: <><strong>大盘概览</strong><div style={{ color: 'var(--color-text-secondary)' }}>实时展示上证/深证/创业板指数，涨跌家数，市场情绪指标</div></> },
            { color: 'green', children: <><strong>K线图表</strong><div style={{ color: 'var(--color-text-secondary)' }}>专业K线图，叠加MA5/MA10/MA20均线，支持缩放和数据下钻</div></> },
          ]}
        />
      </Card>

      <Card className="stock-card" style={{ marginBottom: 20 }}>
        <h2><CodeOutlined style={{ marginRight: 8, color: '#3498db' }} />评分体系</h2>
        <Divider style={{ borderColor: 'var(--color-border)' }} />
        <Descriptions column={1} labelStyle={{ color: 'var(--color-text-secondary)', width: 120 }}>
          <Descriptions.Item label="技术面权重">45% — MACD/KDJ/RSI/均线/布林带/成交量</Descriptions.Item>
          <Descriptions.Item label="基本面权重">35% — PE/PB/ROE/营收增长/利润增长</Descriptions.Item>
          <Descriptions.Item label="资金面权重">20% — 主力资金净流入/大单流向</Descriptions.Item>
        </Descriptions>
        <Divider dashed style={{ borderColor: 'var(--color-border)' }} />
        <Descriptions column={2} labelStyle={{ color: 'var(--color-text-secondary)' }}>
          <Descriptions.Item label={<Tag color="red">80-100</Tag>}>强烈推荐</Descriptions.Item>
          <Descriptions.Item label={<Tag color="orange">65-79</Tag>}>推荐</Descriptions.Item>
          <Descriptions.Item label={<Tag color="gold">45-64</Tag>}>中性</Descriptions.Item>
          <Descriptions.Item label={<Tag color="blue">30-44</Tag>}>谨慎</Descriptions.Item>
          <Descriptions.Item label={<Tag color="green">0-29</Tag>}>回避</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card className="stock-card" style={{ marginBottom: 20 }}>
        <h2><CodeOutlined style={{ marginRight: 8, color: '#f39c12' }} />技术栈</h2>
        <Divider style={{ borderColor: 'var(--color-border)' }} />
        <Descriptions column={{ xs: 1, sm: 2 }} labelStyle={{ color: 'var(--color-text-secondary)' }}>
          <Descriptions.Item label="前端框架">React 18 + TypeScript</Descriptions.Item>
          <Descriptions.Item label="构建工具">Vite 6</Descriptions.Item>
          <Descriptions.Item label="UI 组件库">Ant Design 5</Descriptions.Item>
          <Descriptions.Item label="图表库">ECharts 5</Descriptions.Item>
          <Descriptions.Item label="路由">React Router 6</Descriptions.Item>
          <Descriptions.Item label="数据来源">东方财富公开 API</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card className="stock-card">
        <h2><SafetyOutlined style={{ marginRight: 8, color: '#e74c3c' }} />免责声明</h2>
        <Divider style={{ borderColor: 'var(--color-border)' }} />
        <div style={{ color: 'var(--color-text-secondary)', lineHeight: 2 }}>
          <p>1. 本系统所有数据均来自东方财富公开接口，数据存在延迟，仅供参考。</p>
          <p>2. 本系统的分析结果不构成任何投资建议，不保证任何收益。</p>
          <p>3. 股市有风险，投资需谨慎。任何投资决策请自行判断，风险自担。</p>
          <p>4. 本项目仅用于学习和技术研究目的，禁止用于商业用途。</p>
          <p>5. 使用本系统即表示您已阅读并同意以上声明。</p>
        </div>
      </Card>
    </div>
  )
}
