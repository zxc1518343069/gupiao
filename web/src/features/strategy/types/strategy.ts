export type StrategyCategory = '交易' | '买入' | '卖出' | '均线粘合'

export type StrategyRuleKind = 'trade' | 'buy' | 'sell' | 'ma_convergence'

export type StrategyItem = {
  id: string
  category: StrategyCategory
  name: string
  conditions: string[]
  action: string
  rule?: StrategyRule | null
  created_at?: string | null
}

export type StrategyDraft = Omit<StrategyItem, 'id' | 'created_at'>

export type VolumeCondition = 'surge' | 'increase' | 'flat' | 'shrink'
export type PricePattern = 'breakout' | 'pullback' | 'breakdown'
export type MovingAveragePeriod = 'ma5' | 'ma10' | 'ma20' | 'ma30' | 'ma60' | 'ma120'
export type BuyAction = 'open' | 'add'
export type SellBreakdownPeriod = 'ma5' | 'ma10'
export type SellAction = 'reduce' | 'clear'
export type TradeAction = BuyAction | SellAction

export type StrategyOption<T extends string> = {
  label: string
  value: T
  description?: string
}

export type BuyStrategyConfig = {
  volume: VolumeCondition[]
  pricePattern: PricePattern | null
  movingAverages: MovingAveragePeriod[]
  breakoutMinBias: number
  breakoutMaxBias: number
  pullbackMinBias: number
  pullbackMaxBias: number
  actions: BuyAction[]
}

export type TradeStrategyConfig = {
  volume: VolumeCondition[]
  pricePattern: PricePattern | null
  movingAverages: MovingAveragePeriod[]
  breakoutMinBias: number
  breakoutMaxBias: number
  pullbackMinBias: number
  pullbackMaxBias: number
  breakdownMinBias: number
  breakdownMaxBias: number
  actions: TradeAction[]
}

export type SellStrategyConfig = {
  volume: VolumeCondition[]
  breakdownPeriods: SellBreakdownPeriod[]
  breakdownMinBias: number
  breakdownMaxBias: number
  actions: SellAction[]
}

export type ConvergenceConfig = {
  movingAverages: MovingAveragePeriod[]
  maxSpreadRatio: number
  nearPriceRatio: number
}

export type ConvergenceRule = {
  kind: 'ma_convergence'
  movingAverages: MovingAveragePeriod[]
  maxSpreadRatio: number
  nearPriceRatio: number
}

export type TradeRule = {
  kind: 'trade'
  volume: VolumeCondition[]
  pricePattern: PricePattern
  movingAverages: MovingAveragePeriod[]
  breakoutMinBias: number
  breakoutMaxBias: number
  pullbackMinBias: number
  pullbackMaxBias: number
  breakdownMinBias: number
  breakdownMaxBias: number
  actions: TradeAction[]
}

export type BuyRule = {
  kind: 'buy'
  volume: VolumeCondition[]
  pricePattern: PricePattern
  movingAverages: MovingAveragePeriod[]
  breakoutMinBias: number
  breakoutMaxBias: number
  pullbackMinBias: number
  pullbackMaxBias: number
  actions: BuyAction[]
}

export type SellRule = {
  kind: 'sell'
  volume: VolumeCondition[]
  breakdownPeriods: SellBreakdownPeriod[]
  breakdownMinBias: number
  breakdownMaxBias: number
  actions: SellAction[]
}

export type StrategyRule = TradeRule | BuyRule | SellRule | ConvergenceRule
