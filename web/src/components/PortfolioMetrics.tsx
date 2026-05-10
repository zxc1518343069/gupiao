import { Tag, Typography } from 'antd'
import type { CSSProperties } from 'react'
import type { MovingAverageMetric, VolumeMeta } from '../types/portfolio'
import { MetricPlaceholder } from './MetricHtml'

const { Text } = Typography

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  minWidth: 0,
}

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '40px 1fr auto',
  alignItems: 'center',
  columnGap: 8,
  fontSize: 12,
  lineHeight: 1.45,
}

const getRatioColor = (ratio: number | null | undefined) => {
  if (ratio === null || ratio === undefined) {
    return 'inherit'
  }
  if (ratio >= 1.5) {
    return '#cf1322'
  }
  if (ratio >= 1.2) {
    return '#d46b08'
  }
  if (ratio < 0.8) {
    return '#389e0d'
  }
  return 'inherit'
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

const getVolumeTagColor = (statusCode: VolumeMeta['status_code']) => {
  if (statusCode === 'surge') {
    return 'error'
  }
  if (statusCode === 'expanded') {
    return 'warning'
  }
  if (statusCode === 'shrink') {
    return 'success'
  }
  return 'default'
}

const formatSignedPercent = (value: number | null) => {
  if (value === null) {
    return 'N/A'
  }
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}

const formatMetricPrice = (value: number | null, precision = 2) => {
  if (value === null) {
    return 'N/A'
  }
  return value.toFixed(precision)
}

const getMovingAverageColor = (metricKey: MovingAverageMetric['key']) => {
  if (metricKey === 'MA5') {
    return '#cf1322'
  }
  if (metricKey === 'MA10') {
    return '#d46b08'
  }
  if (metricKey === 'MA20') {
    return '#1677ff'
  }
  if (metricKey === 'MA60') {
    return '#08979c'
  }
  if (metricKey === 'MA120') {
    return '#595959'
  }
  return '#8c8c8c'
}

type VolumeMetricCellProps = {
  volumeMeta?: VolumeMeta | null
  errorText?: string | null
}

export const VolumeMetricCell = ({ volumeMeta, errorText }: VolumeMetricCellProps) => {
  if (!volumeMeta || volumeMeta.ratio === null) {
    return <MetricPlaceholder errorText={errorText} />
  }

  const tagText = [volumeMeta.status_label, volumeMeta.status_detail].filter(Boolean).join(' ')

  return (
    <div style={listStyle}>
      <Text strong style={{ color: getRatioColor(volumeMeta.ratio), fontSize: 15 }}>
        {volumeMeta.ratio.toFixed(2)}
      </Text>
      <Tag
        color={getVolumeTagColor(volumeMeta.status_code)}
        style={{ width: 'fit-content', marginInlineEnd: 0 }}
      >
        {tagText}
      </Tag>
    </div>
  )
}

type BiasMetricCellProps = {
  metrics?: MovingAverageMetric[] | null
  errorText?: string | null
}

export const BiasMetricCell = ({ metrics, errorText }: BiasMetricCellProps) => {
  if (!metrics?.length) {
    return <MetricPlaceholder errorText={errorText} />
  }

  return (
    <div style={listStyle}>
      {metrics.map((metric) => (
        <div key={metric.key} style={{ ...rowStyle, gridTemplateColumns: '40px 1fr' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {metric.label}
          </Text>
          <Text strong style={{ color: getBiasColor(metric.bias), fontSize: 12 }}>
            {formatSignedPercent(metric.bias)}
          </Text>
        </div>
      ))}
    </div>
  )
}

type TrendMetricCellProps = {
  metrics?: MovingAverageMetric[] | null
  errorText?: string | null
}

export const TrendMetricCell = ({ metrics, errorText }: TrendMetricCellProps) => {
  if (!metrics?.length) {
    return <MetricPlaceholder errorText={errorText} />
  }

  return (
    <div style={{ ...listStyle, gap: 2 }}>
      {metrics.map((metric) => {
        const trendColor = getTrendColor(metric.trend_code)
        const labelColor = getMovingAverageColor(metric.key)
        const trendText =
          metric.slope === null
            ? metric.trend_label
            : `${metric.trend_label}(${formatSignedPercent(metric.slope)})`

        return (
          <div
            key={metric.key}
            style={{
              ...rowStyle,
              gridTemplateColumns: '42px 58px minmax(0, 1fr)',
              columnGap: 4,
              lineHeight: 1.3,
            }}
          >
            <Text strong style={{ color: labelColor, fontSize: 12 }}>
              {metric.label}
            </Text>
            <Text strong style={{ color: labelColor, fontSize: 12 }}>
              {formatMetricPrice(metric.price, metric.price_precision ?? 2)}
            </Text>
            <Text
              style={{
                color: trendColor,
                fontSize: 12,
                whiteSpace: 'nowrap',
              }}
            >
              {trendText}
            </Text>
          </div>
        )
      })}
    </div>
  )
}
