import { Button, Typography, type TableColumnsType } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import type { StrategyRule } from '@/features/strategy/types/strategy'
import { evaluatePortfolioStrategySuggestions } from '@/features/strategy/utils/portfolioStrategySuggestions'
import { MetricPlaceholder } from '../../../../components/MetricHtml'
import { VolumeMetricCell } from '../../../../components/PortfolioMetrics'
import { PortfolioTagEditor } from '../../../../components/PortfolioTagEditor'
import { formatDate } from '@/utils/formatters/dateFormat'
import { formatInstrumentPrice } from '@/utils/formatters/priceFormat'
import type { PortfolioStockItem, PortfolioTagDefinition } from '../../../../types/portfolio'
import { PortfolioOperationSuggestionCell } from './PortfolioOperationSuggestionCell'
import { PortfolioMembershipTags } from './PortfolioMembershipTags'
import { PortfolioMovingAverageStatusCell } from './PortfolioMovingAverageStatusCell'
import { PortfolioStockIdentityCell } from './PortfolioStockIdentityCell'

const { Text } = Typography

type PortfolioColumnsOptions = {
  onCopyStockCode: (stockCode: string) => void | Promise<void>
  onRemoveStock: (stockCode: string) => void | Promise<void>
  onUpdateTags: (stockCode: string, tags: string[]) => Promise<void>
  tagDefinitions: PortfolioTagDefinition[]
  latestPriceDateLabel?: string | null
  showGroupColumn?: boolean
  showPitchColumn?: boolean
  strategyRules?: StrategyRule[]
}

type MembershipColumnConfig = {
  title: string
  dataIndex: keyof PortfolioStockItem
  key: string
  width: number
  getNames: (record: PortfolioStockItem) => string[] | null | undefined
  getFallbackName?: (record: PortfolioStockItem) => string | null | undefined
  emptyText?: string | null
}

const formatReturn = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(2)}%`

const compareNullableNumbers = (first: number | null, second: number | null) =>
  (first ?? Number.NEGATIVE_INFINITY) - (second ?? Number.NEGATIVE_INFINITY)

const compareNullableDates = (first: string | null, second: string | null) => {
  const firstTime = first ? new Date(first).getTime() : Number.NEGATIVE_INFINITY
  const secondTime = second ? new Date(second).getTime() : Number.NEGATIVE_INFINITY
  return firstTime - secondTime
}

const compareTruthyFirst = (firstHasContent: boolean, secondHasContent: boolean) =>
  Number(secondHasContent) - Number(firstHasContent)

const getReturnColor = (value: number) => {
  if (value > 0) {
    return '#cf1322'
  }
  if (value < 0) {
    return '#389e0d'
  }
  return 'inherit'
}

const getPortfolioMetricsError = (record: PortfolioStockItem) => record.analysis_error

const createMembershipColumn = ({
  title,
  dataIndex,
  key,
  width,
  getNames,
  getFallbackName,
  emptyText,
}: MembershipColumnConfig): TableColumnsType<PortfolioStockItem>[number] => ({
  title,
  dataIndex,
  key,
  width,
  render: (_: PortfolioStockItem[typeof dataIndex], record: PortfolioStockItem) => (
    <PortfolioMembershipTags
      names={getNames(record)}
      fallbackName={getFallbackName?.(record) ?? null}
      colorMode="stable"
      emptyText={emptyText}
    />
  ),
})

export const createPortfolioColumns = ({
  onCopyStockCode,
  onRemoveStock,
  onUpdateTags,
  tagDefinitions,
  latestPriceDateLabel,
  showGroupColumn = true,
  showPitchColumn = false,
  strategyRules = [],
}: PortfolioColumnsOptions): TableColumnsType<PortfolioStockItem> => {
  const groupColumn = createMembershipColumn({
    title: '分组',
    dataIndex: 'group_name',
    key: 'group_name',
    width: 180,
    getNames: (record) => record.group_names,
    getFallbackName: (record) => record.group_name,
  })

  const pitchColumn = createMembershipColumn({
    title: '吹票',
    dataIndex: 'portfolio_group_name',
    key: 'portfolio_group_name',
    width: 220,
    getNames: (record) => record.portfolio_group_names,
    getFallbackName: (record) => record.portfolio_group_name,
    emptyText: '--',
  })

  return [
    {
      title: '股票',
      key: 'stock_identity',
      width: 292,
      sorter: (first, second) => {
        const nameCompare = first.stock_name.localeCompare(second.stock_name, 'zh-CN')
        return nameCompare !== 0 ? nameCompare : first.stock_code.localeCompare(second.stock_code)
      },
      render: (_: unknown, record: PortfolioStockItem) => (
        <PortfolioStockIdentityCell
          stockCode={record.stock_code}
          stockName={record.stock_name}
          industryDisplay={record.industry_display}
          companyIntro={record.company_intro}
          onCopy={onCopyStockCode}
        />
      ),
    },
    ...(showGroupColumn ? [groupColumn] : []),
    ...(showPitchColumn ? [pitchColumn] : []),
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 228,
      render: (value: string[] | null | undefined, record: PortfolioStockItem) => (
        <PortfolioTagEditor
          tags={value}
          tagDefinitions={tagDefinitions}
          onChange={(nextTags: string[]) => onUpdateTags(record.stock_code, nextTags)}
        />
      ),
    },
    {
      title: '加入自选',
      key: 'portfolio_entry',
      width: 124,
      sorter: (first, second) => compareNullableDates(first.added_at, second.added_at),
      render: (_: unknown, record: PortfolioStockItem) =>
        record.added_price !== null || record.added_at ? (
          <div style={{ lineHeight: 1.45 }}>
            {record.added_price !== null ? (
              <Text strong>{formatInstrumentPrice(record.stock_code, record.added_price)}</Text>
            ) : (
              <MetricPlaceholder errorText={record.analysis_error} />
            )}
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatDate(record.added_at)}
            </Text>
          </div>
        ) : (
          <MetricPlaceholder errorText={record.analysis_error} />
        ),
    },
    {
      title: (
        <div style={{ lineHeight: 1.2 }}>
          <div>最新价格</div>
          {latestPriceDateLabel ? (
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
              {latestPriceDateLabel}
            </Text>
          ) : null}
        </div>
      ),
      dataIndex: 'latest_price',
      key: 'latest_price',
      width: 120,
      sorter: (first, second) => compareNullableNumbers(first.latest_price, second.latest_price),
      render: (value: number | null, record: PortfolioStockItem) =>
        value !== null ? (
          <div style={{ lineHeight: 1.35 }}>
            <Text strong>{formatInstrumentPrice(record.stock_code, value)}</Text>
            <br />
            {record.daily_change_pct !== null ? (
              <Text strong style={{ fontSize: 12, color: getReturnColor(record.daily_change_pct) }}>
                {formatReturn(record.daily_change_pct)}
              </Text>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                --
              </Text>
            )}
          </div>
        ) : (
          <MetricPlaceholder errorText={record.analysis_error} />
        ),
    },
    {
      title: '自选收益',
      dataIndex: 'portfolio_return',
      key: 'portfolio_return',
      width: 96,
      sorter: (first, second) =>
        compareNullableNumbers(first.portfolio_return, second.portfolio_return),
      render: (value: number | null, record: PortfolioStockItem) =>
        value !== null ? (
          <Text strong style={{ color: getReturnColor(value) }}>
            {formatReturn(value)}
          </Text>
        ) : (
          <MetricPlaceholder errorText={record.analysis_error} />
        ),
    },
    {
      title: '操作建议',
      key: 'operation_suggestion',
      width: 236,
      sorter: (first, second) => {
        const firstSuggestions = evaluatePortfolioStrategySuggestions({
          metrics: first.ma_metrics,
          latestPrice: first.latest_price,
          volumeMeta: first.volume_meta,
          rules: strategyRules,
        })
        const secondSuggestions = evaluatePortfolioStrategySuggestions({
          metrics: second.ma_metrics,
          latestPrice: second.latest_price,
          volumeMeta: second.volume_meta,
          rules: strategyRules,
        })

        const contentCompare = compareTruthyFirst(
          firstSuggestions.length > 0,
          secondSuggestions.length > 0,
        )

        return contentCompare !== 0
          ? contentCompare
          : first.stock_name.localeCompare(second.stock_name, 'zh-CN')
      },
      render: (_: unknown, record: PortfolioStockItem) => {
        const suggestions = evaluatePortfolioStrategySuggestions({
          metrics: record.ma_metrics,
          latestPrice: record.latest_price,
          volumeMeta: record.volume_meta,
          rules: strategyRules,
        })

        return <PortfolioOperationSuggestionCell suggestions={suggestions} />
      },
    },
    {
      title: '量能',
      dataIndex: 'volume_meta',
      key: 'volume_meta',
      width: 128,
      sorter: (first, second) => compareNullableNumbers(first.vol_ratio, second.vol_ratio),
      render: (_: unknown, record: PortfolioStockItem) => (
        <VolumeMetricCell
          volumeMeta={record.volume_meta}
          errorText={getPortfolioMetricsError(record)}
        />
      ),
    },
    {
      title: (
        <div style={{ lineHeight: 1.2 }}>
          <div>均线状态</div>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
            悬停看斜率
          </Text>
        </div>
      ),
      dataIndex: 'ma_metrics',
      key: 'ma_metrics_status',
      width: 140,
      render: (_: unknown, record: PortfolioStockItem) => (
        <PortfolioMovingAverageStatusCell
          metrics={record.ma_metrics}
          errorText={getPortfolioMetricsError(record)}
        />
      ),
    },
    {
      title: '管理',
      key: 'manage',
      width: 64,
      render: (_: unknown, record: PortfolioStockItem) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => {
            void onRemoveStock(record.stock_code)
          }}
        />
      ),
    },
  ]
}
