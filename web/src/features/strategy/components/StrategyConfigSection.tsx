import { Space, Typography } from 'antd'
import type { ReactNode } from 'react'
import { sectionStyle } from '../styles/strategyStyles'

const { Text } = Typography

type StrategyConfigSectionProps = {
  title: string
  children: ReactNode
  hint?: string
}

export const StrategyConfigSection = ({ title, children, hint }: StrategyConfigSectionProps) => (
  <div style={sectionStyle}>
    <Space direction="vertical" size={10} style={{ width: '100%' }}>
      <div>
        <Text strong>{title}</Text>
        {hint ? (
          <div>
            <Text type="secondary">{hint}</Text>
          </div>
        ) : null}
      </div>
      {children}
    </Space>
  </div>
)
