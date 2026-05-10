import { InfoCircleOutlined } from '@ant-design/icons'
import { Space, Tooltip } from 'antd'
import type {
  BuyAction,
  BuyStrategyConfig,
  ConvergenceConfig,
  ConvergenceRule,
  MovingAveragePeriod,
  PricePattern,
  SellAction,
  SellBreakdownPeriod,
  SellStrategyConfig,
  StrategyCategory,
  StrategyOption,
  TradeAction,
  TradeStrategyConfig,
  VolumeCondition,
} from '../types/strategy'

export const volumeOptions: StrategyOption<VolumeCondition>[] = [
  { label: '爆量', value: 'surge', description: '量比 >= 1.5' },
  { label: '放量', value: 'increase', description: '1.2 <= 量比 < 1.5' },
  { label: '平量', value: 'flat', description: '0.8 <= 量比 < 1.2' },
  { label: '缩量', value: 'shrink', description: '量比 < 0.8' },
]

export const pricePatternOptions: StrategyOption<PricePattern>[] = [
  { label: '突破', value: 'breakout' },
  { label: '回踩', value: 'pullback' },
  { label: '跌破', value: 'breakdown' },
]

export const movingAverageOptions: StrategyOption<MovingAveragePeriod>[] = [
  { label: 'MA5', value: 'ma5' },
  { label: 'MA10', value: 'ma10' },
  { label: 'MA20', value: 'ma20' },
  { label: 'MA30', value: 'ma30' },
  { label: 'MA60', value: 'ma60' },
  { label: 'MA120', value: 'ma120' },
]

export const buyActionOptions: StrategyOption<BuyAction>[] = [
  { label: '建仓', value: 'open' },
  { label: '加仓', value: 'add' },
]

export const sellBreakdownOptions: StrategyOption<SellBreakdownPeriod>[] = [
  { label: '跌破 MA5', value: 'ma5' },
  { label: '跌破 MA10', value: 'ma10' },
]

export const sellActionOptions: StrategyOption<SellAction>[] = [
  { label: '减仓', value: 'reduce' },
  { label: '清仓', value: 'clear' },
]

export const categoryColors: Record<StrategyCategory, string> = {
  交易: 'geekblue',
  买入: 'success',
  卖出: 'error',
  均线粘合: 'processing',
}

export const strategyCreateSuccessMessages: Record<StrategyCategory, string> = {
  交易: '交易策略已添加',
  买入: '买入策略已添加',
  卖出: '卖出策略已添加',
  均线粘合: '均线粘合策略已添加',
}

export const volumeCheckboxOptions = volumeOptions.map((option) => ({
  ...option,
  label: (
    <Space size={4}>
      <span>{option.label}</span>
      <Tooltip title={option.description}>
        <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
      </Tooltip>
    </Space>
  ),
}))

const defaultConvergenceMovingAverages: MovingAveragePeriod[] = [
  'ma20',
  'ma60',
  'ma120',
]

export const convergenceMovingAverages = [...defaultConvergenceMovingAverages]

export const createDefaultConvergenceRule = (): ConvergenceRule => ({
  kind: 'ma_convergence',
  movingAverages: [...defaultConvergenceMovingAverages],
  maxSpreadRatio: 2,
  nearPriceRatio: 1,
})

export const defaultBreakoutMinBias = 0
export const defaultBreakoutMaxBias = 5
export const defaultPullbackMinBias = -1
export const defaultPullbackMaxBias = 1
export const defaultBreakdownMinBias = 0
export const defaultBreakdownMaxBias = 5
export const tradeBuyActions: TradeAction[] = ['open', 'add']
export const tradeSellActions: TradeAction[] = ['reduce', 'clear']
export const tradeTrendMovingAverages: MovingAveragePeriod[] = ['ma20', 'ma30', 'ma60', 'ma120']
export const tradeBreakdownMovingAverages: MovingAveragePeriod[] = ['ma5', 'ma10']

export const tradeActionOptions: StrategyOption<TradeAction>[] = [
  ...buyActionOptions,
  ...sellActionOptions,
]

export const createEmptyBuyConfig = (): BuyStrategyConfig => ({
  volume: [],
  pricePattern: null,
  movingAverages: [],
  breakoutMinBias: defaultBreakoutMinBias,
  breakoutMaxBias: defaultBreakoutMaxBias,
  pullbackMinBias: defaultPullbackMinBias,
  pullbackMaxBias: defaultPullbackMaxBias,
  actions: [],
})

export const createEmptyTradeConfig = (): TradeStrategyConfig => ({
  volume: [],
  pricePattern: null,
  movingAverages: [],
  breakoutMinBias: defaultBreakoutMinBias,
  breakoutMaxBias: defaultBreakoutMaxBias,
  pullbackMinBias: defaultPullbackMinBias,
  pullbackMaxBias: defaultPullbackMaxBias,
  breakdownMinBias: defaultBreakdownMinBias,
  breakdownMaxBias: defaultBreakdownMaxBias,
  actions: [],
})

export const createEmptySellConfig = (): SellStrategyConfig => ({
  volume: [],
  breakdownPeriods: [],
  breakdownMinBias: defaultBreakdownMinBias,
  breakdownMaxBias: defaultBreakdownMaxBias,
  actions: [],
})

export const createDefaultConvergenceConfig = (): ConvergenceConfig => ({
  movingAverages: [],
  maxSpreadRatio: 2,
  nearPriceRatio: 1,
})

export const getOptionLabels = <T extends string>(options: StrategyOption<T>[], values: T[]) =>
  values
    .map((value) => options.find((option) => option.value === value)?.label)
    .filter((label): label is string => Boolean(label))

export const getOptionLabel = <T extends string>(options: StrategyOption<T>[], value: T | null) => {
  if (!value) {
    return null
  }

  return options.find((option) => option.value === value)?.label ?? null
}

export const joinLabels = (labels: string[]) => (labels.length > 0 ? labels.join('、') : '未配置')

export const getTradeMovingAverageValuesForPattern = (pattern: PricePattern | null) => {
  if (pattern === 'breakdown') {
    return [...tradeBreakdownMovingAverages]
  }
  if (pattern === 'breakout' || pattern === 'pullback') {
    return [...tradeTrendMovingAverages]
  }
  return [...movingAverageOptions.map((option) => option.value)]
}

export const getTradeActionValuesForPattern = (pattern: PricePattern | null) => {
  if (pattern === 'breakdown') {
    return [...tradeSellActions]
  }
  if (pattern === 'breakout' || pattern === 'pullback') {
    return [...tradeBuyActions]
  }
  return [...tradeActionOptions.map((option) => option.value)]
}
