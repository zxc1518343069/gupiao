import { Badge, Layout, Typography } from 'antd'
import { LineChartOutlined } from '@ant-design/icons'
import { useApiStatus } from './hooks/useApiStatus'

const { Header } = Layout
const { Title } = Typography

export const DashboardHeader = () => {
  const pingMessage = useApiStatus()

  return (
    <Header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#001529',
        padding: '0 24px',
        height: '64px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <LineChartOutlined style={{ fontSize: '24px', color: '#1677ff' }} />
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          量化监控面板
        </Title>
      </div>

      <div>
        <Badge
          status={pingMessage === 'pong' ? 'success' : 'error'}
          text={<span style={{ color: '#fff' }}>API: {pingMessage}</span>}
        />
      </div>
    </Header>
  )
}
