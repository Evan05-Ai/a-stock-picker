import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout, Menu } from 'antd'
import { HomeOutlined, SearchOutlined, StockOutlined, InfoCircleOutlined, ExperimentOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import Home from '@/pages/Home'
import Diagnosis from '@/pages/Diagnosis'
import Selection from '@/pages/Selection'
import Backtest from '@/pages/Backtest'
import About from '@/pages/About'

const { Header, Content, Footer } = Layout

function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  // HashRouter 下 pathname 可能包含动态参数，需提取菜单键
  const getMenuKey = (pathname: string): string => {
    if (pathname.startsWith('/diagnosis')) return '/diagnosis'
    if (pathname.startsWith('/selection')) return '/selection'
    if (pathname.startsWith('/backtest')) return '/backtest'
    if (pathname.startsWith('/about')) return '/about'
    return '/'
  }

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: '首页' },
    { key: '/diagnosis', icon: <SearchOutlined />, label: '诊断股票' },
    { key: '/selection', icon: <StockOutlined />, label: '智能选股' },
    { key: '/backtest', icon: <ExperimentOutlined />, label: '策略回测' },
    { key: '/about', icon: <InfoCircleOutlined />, label: '关于' },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        background: '#0f0f23',
        borderBottom: '1px solid var(--color-border)',
        padding: '0 24px',
      }}>
        <div style={{
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--color-accent)',
          marginRight: 40,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }} onClick={() => navigate('/')}>
          📈 A股智能选股
        </div>
        <Menu
          mode="horizontal"
          selectedKeys={[getMenuKey(location.pathname)]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            flex: 1,
            background: 'transparent',
            borderBottom: 'none',
            color: 'var(--color-text-primary)',
          }}
        />
      </Header>
      <Content style={{ padding: '24px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/diagnosis" element={<Diagnosis />} />
          <Route path="/diagnosis/:code" element={<Diagnosis />} />
          <Route path="/selection" element={<Selection />} />
          <Route path="/backtest" element={<Backtest />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Content>
      <Footer style={{
        textAlign: 'center',
        background: 'var(--color-bg-primary)',
        borderTop: '1px solid var(--color-border)',
        color: 'var(--color-text-secondary)',
        fontSize: 12,
        padding: '16px 24px',
      }}>
        <div>A股智能选股系统 ©2026 | 数据来源：东方财富 | 仅供学习研究，不构成投资建议</div>
      </Footer>
    </Layout>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AppLayout />
    </HashRouter>
  )
}
