import { useState } from 'react'
import { DeleteOutlined } from '@ant-design/icons'
import { Button, Card, Popconfirm, Tag, Typography } from 'antd'
import type { PortfolioStockItem } from '../../types/portfolio'
import { maxIndustryGroupEtfCount } from './constants'
import { formatTradeDate } from '../../utils/formatters/dateFormat'
import { formatInstrumentPrice } from '../../utils/formatters/priceFormat'
import { formatStockCodeForDisplay } from '../../utils/formatters/stockCodeFormat'
import { PortfolioMovingAverageStatusCell } from './PortfolioStocksTable/components/PortfolioMovingAverageStatusCell'

const { Text, Title } = Typography

type IndustryEtfOverviewProps = {
  groupName?: string
  items: PortfolioStockItem[]
  onRemove: (stockCode: string) => Promise<void>
}

const getReturnColor = (value: number | null) => {
  if (value === null) {
    return '#8c8c8c'
  }
  if (value > 0) {
    return '#cf1322'
  }
  if (value < 0) {
    return '#389e0d'
  }
  return '#8c8c8c'
}

const formatReturn = (value: number | null) => {
  if (value === null) {
    return '--'
  }
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}

export const IndustryEtfOverview = ({ groupName, items, onRemove }: IndustryEtfOverviewProps) => {
  const [removingCode, setRemovingCode] = useState<string | null>(null)

  if (!groupName || items.length === 0) {
    return null
  }

  const visibleItems = items.slice(0, maxIndustryGroupEtfCount)

  return (
    <div style={{ marginBottom: '12px', flexShrink: 0 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {visibleItems.map((item) => (
          <Card
            key={item.stock_code}
            size="small"
            style={{
              borderRadius: '10px',
              width: 'min(100%, 360px)',
              flex: '0 1 360px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <Tag color="blue" style={{ marginInlineEnd: 0, marginBottom: '6px' }}>
                    ETF 观察
                  </Tag>
                  <Title
                    level={5}
                    style={{ margin: 0, lineHeight: 1.35, whiteSpace: 'normal', wordBreak: 'break-word' }}
                    title={item.stock_name}
                  >
                    {item.stock_name}
                  </Title>
                  <Text type="secondary">{formatStockCodeForDisplay(item.stock_code)}</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                      {`最新价 · ${formatTradeDate(item.latest_price_date)}`}
                    </Text>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'flex-end',
                        gap: '8px',
                      }}
                    >
                      <Text strong style={{ fontSize: 22 }}>
                        {formatInstrumentPrice(item.stock_code, item.latest_price)}
                      </Text>
                      <Text
                        strong
                        style={{
                          fontSize: 14,
                          color: getReturnColor(item.daily_change_pct),
                        }}
                      >
                        {formatReturn(item.daily_change_pct)}
                      </Text>
                    </div>
                  </div>
                  <Popconfirm
                    title="删除这个 ETF？"
                    description="会将它从当前行业分组中移除。"
                    okText="删除"
                    cancelText="取消"
                    onConfirm={async () => {
                      setRemovingCode(item.stock_code)
                      try {
                        await onRemove(item.stock_code)
                      } finally {
                        setRemovingCode(null)
                      }
                    }}
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      loading={removingCode === item.stock_code}
                    />
                  </Popconfirm>
                </div>
              </div>

              <div>
                <Text type="secondary" style={{ display: 'block', marginBottom: '6px', fontSize: 12 }}>
                  均线状态
                </Text>
                <PortfolioMovingAverageStatusCell
                  metrics={item.ma_metrics}
                  errorText={item.analysis_error}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
