import { Tooltip, Typography } from 'antd'
import type { CSSProperties } from 'react'
import { MetricPlaceholder } from '../../../../components/MetricHtml'
import type { MovingAverageMetric } from '../../../../types/portfolio'

const { Text } = Typography

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  minWidth: 0,
}

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '40px 1fr 20px',
  alignItems: 'center',
  columnGap: 6,
  fontSize: 12,
  lineHeight: 1.4,
}

const tooltipListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  minWidth: 232,
}

const tooltipRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '42px 62px 42px 1fr',
  alignItems: 'center',
  columnGap: 8,
  fontSize: 12,
  lineHeight: 1.4,
}

const tooltipHeaderTextStyle: CSSProperties = {
  fontSize: 11,
  color: 'rgba(255, 255, 255, 0.72)',
}

const tooltipValueTextStyle: CSSProperties = {
  fontSize: 12,
  color: '#ffffff',
}

const getBiasColor = (value: number | null) => {
  if (value === null) {
    return '#bfbfbf'
  }
  if (value > 0) {
    return '#cf1322'
  }
  if (value < 0) {
    return '#389e0d'
  }
  return '#8c8c8c'
}

const getTrendColor = (trendCode: MovingAverageMetric['trend_code']) => {
  if (trendCode === 'up') {
    return '#cf1322'
  }
  if (trendCode === 'down') {
    return '#389e0d'
  }
  if (trendCode === 'flat') {
    return '#8c8c8c'
  }
  return '#bfbfbf'
}

const getTooltipTrendColor = (trendCode: MovingAverageMetric['trend_code']) => {
  if (trendCode === 'up') {
    return '#ff7875'
  }
  if (trendCode === 'down') {
    return '#95de64'
  }
  return '#d9d9d9'
}

const getTrendShortLabel = (trendCode: MovingAverageMetric['trend_code']) => {
  if (trendCode === 'up') {
    return '上'
  }
  if (trendCode === 'down') {
    return '下'
  }
  if (trendCode === 'flat') {
    return '平'
  }
  return '--'
}

const formatSignedPercent = (value: number | null, emptyText = 'N/A') => {
  if (value === null) {
    return emptyText
  }
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}

const formatMetricPrice = (value: number | null, precision = 2) => {
  if (value === null) {
    return '--'
  }
  return value.toFixed(precision)
}

type PortfolioMovingAverageStatusCellProps = {
  metrics?: MovingAverageMetric[] | null
  errorText?: string | null
}

export const PortfolioMovingAverageStatusCell = ({
  metrics,
  errorText,
}: PortfolioMovingAverageStatusCellProps) => {
  const visibleMetrics = metrics?.filter((metric) => metric.price !== null) ?? []

  if (!visibleMetrics.length) {
    return <MetricPlaceholder errorText={errorText} />
  }

  const tooltipContent = (
    <div style={{ ...tooltipListStyle, color: '#ffffff' }}>
      <div style={tooltipRowStyle}>
        <Text style={tooltipHeaderTextStyle}>
          均线
        </Text>
        <Text style={tooltipHeaderTextStyle}>
          均线价
        </Text>
        <Text style={tooltipHeaderTextStyle}>
          趋势
        </Text>
        <Text style={tooltipHeaderTextStyle}>
          斜率
        </Text>
      </div>
      {visibleMetrics.map((metric) => (
        <div key={metric.key} style={tooltipRowStyle}>
          <Text strong style={tooltipValueTextStyle}>
            {metric.label}
          </Text>
          <Text style={tooltipValueTextStyle}>
            {formatMetricPrice(metric.price, metric.price_precision ?? 2)}
          </Text>
          <Text style={{ ...tooltipValueTextStyle, color: getTooltipTrendColor(metric.trend_code) }}>
            {metric.trend_label}
          </Text>
          <Text style={tooltipValueTextStyle}>{formatSignedPercent(metric.slope, '--')}</Text>
        </div>
      ))}
    </div>
  )

  return (
    <Tooltip placement="topLeft" mouseEnterDelay={0.15} title={tooltipContent}>
      <div style={{ ...listStyle, cursor: 'help' }}>
        {visibleMetrics.map((metric) => (
          <div key={metric.key} style={rowStyle}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {metric.label}
            </Text>
            <Text strong style={{ color: getBiasColor(metric.bias), fontSize: 12 }}>
              {formatSignedPercent(metric.bias, '--')}
            </Text>
            <Text
              strong
              style={{
                color: getTrendColor(metric.trend_code),
                fontSize: 12,
                textAlign: 'right',
              }}
            >
              {getTrendShortLabel(metric.trend_code)}
            </Text>
          </div>
        ))}
      </div>
    </Tooltip>
  )
}
