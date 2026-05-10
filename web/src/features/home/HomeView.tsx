import { Typography } from 'antd'

const { Title, Text } = Typography

export const HomeView = () => (
  <div style={{ textAlign: 'center', paddingTop: '100px' }}>
    <Title level={2}>欢迎使用量化监控面板</Title>
    <Text type="secondary">请从左侧菜单选择功能</Text>
  </div>
)
