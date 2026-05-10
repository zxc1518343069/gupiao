import {
  createDefaultConvergenceRule,
  buyActionOptions,
  createDefaultConvergenceConfig,
  createEmptyBuyConfig,
  createEmptySellConfig,
  createEmptyTradeConfig,
  movingAverageOptions,
  pricePatternOptions,
  sellActionOptions,
  sellBreakdownOptions,
  tradeActionOptions,
  volumeOptions,
} from '../configs/strategyOptions'
import type {
  BuyStrategyConfig,
  ConvergenceConfig,
  MovingAveragePeriod,
  SellStrategyConfig,
  TradeStrategyConfig,
  BuyAction,
  BuyRule,
  SellAction,
  SellBreakdownPeriod,
  SellRule,
  TradeAction,
  TradeRule,
  VolumeCondition,
  PricePattern,
  StrategyItem,
  StrategyOption,
} from '../types/strategy'

const movingAverageValueSet = new Set<MovingAveragePeriod>(
  movingAverageOptions.map((option) => option.value),
)
const volumeValueSet = new Set<VolumeCondition>(volumeOptions.map((option) => option.value))
const buyActionValueSet = new Set<BuyAction>(buyActionOptions.map((option) => option.value))
const sellActionValueSet = new Set<SellAction>(sellActionOptions.map((option) => option.value))
const tradeActionValueSet = new Set<TradeAction>(tradeActionOptions.map((option) => option.value))
const sellBreakdownValueSet = new Set<SellBreakdownPeriod>(
  sellBreakdownOptions.map((option) => option.value),
)
const pricePatternValueSet = new Set<PricePattern>(pricePatternOptions.map((option) => option.value))

const getConditionContent = (conditions: string[], prefix: string) => {
  const matchedCondition = conditions.find((condition) => condition.startsWith(prefix))
  if (!matchedCondition) {
    return ''
  }

  const separatorIndex = matchedCondition.indexOf('：')
  if (separatorIndex < 0) {
    return ''
  }

  return matchedCondition.slice(separatorIndex + 1).trim()
}

const splitLabels = (value: string) =>
  value
    .split('、')
    .map((item) => item.trim())
    .filter((item) => item && item !== '未配置')

const mapLabelsToValues = <T extends string>(options: StrategyOption<T>[], labels: string[]) => {
  const values = labels
    .map((label) => options.find((option) => option.label === label)?.value)
    .filter((value): value is T => Boolean(value))

  return Array.from(new Set(values))
}

const getActionValues = <T extends string>(action: string, options: StrategyOption<T>[]) => {
  const normalizedAction = action.includes('：') ? action.split('：').slice(1).join('：') : action
  return mapLabelsToValues(options, splitLabels(normalizedAction))
}

const parsePercentValue = (value: string, fallbackValue: number) => {
  const matchedValue = value.match(/([0-9]+(?:\.[0-9]+)?)/)
  if (!matchedValue) {
    return fallbackValue
  }

  const parsedValue = Number(matchedValue[1])
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallbackValue
  }

  return parsedValue
}

const parsePercentRange = (
  value: string,
  fallbackMinValue: number,
  fallbackMaxValue: number,
) => {
  const matchedValue = value.match(
    /(-?[0-9]+(?:\.[0-9]+)?)\s*%\s*[~～]\s*(-?[0-9]+(?:\.[0-9]+)?)\s*%/,
  )
  if (!matchedValue) {
    return { min: fallbackMinValue, max: fallbackMaxValue }
  }

  const minValue = Number(matchedValue[1])
  const maxValue = Number(matchedValue[2])

  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    return { min: fallbackMinValue, max: fallbackMaxValue }
  }

  return { min: minValue, max: maxValue }
}

const normalizeNumberValue = (value: unknown, fallbackValue: number) => {
  const normalizedValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(normalizedValue) ? normalizedValue : fallbackValue
}

const getConditionLabels = (conditions: string[], prefix: string) =>
  splitLabels(getConditionContent(conditions, prefix))

const parseConvergenceMovingAverages = (strategy: StrategyItem) => {
  if (strategy.rule?.kind === 'ma_convergence') {
    const ruleMovingAverages = strategy.rule.movingAverages.filter(
      (value): value is MovingAveragePeriod => movingAverageValueSet.has(value),
    )

    if (ruleMovingAverages.length >= 2) {
      return Array.from(new Set(ruleMovingAverages))
    }
  }

  const conditionMovingAverages = mapLabelsToValues(
    movingAverageOptions,
    getConditionLabels(strategy.conditions, '参与均线'),
  )

  return conditionMovingAverages.length >= 2
    ? conditionMovingAverages
    : createDefaultConvergenceRule().movingAverages
}

const normalizeBuyRule = (rule: BuyRule): BuyStrategyConfig => {
  const defaultConfig = createEmptyBuyConfig()

  return {
    ...defaultConfig,
    volume: rule.volume.filter((value): value is VolumeCondition => volumeValueSet.has(value)),
    pricePattern: pricePatternValueSet.has(rule.pricePattern) ? rule.pricePattern : null,
    movingAverages: rule.movingAverages.filter(
      (value): value is MovingAveragePeriod => movingAverageValueSet.has(value),
    ),
    breakoutMinBias: normalizeNumberValue(rule.breakoutMinBias, defaultConfig.breakoutMinBias),
    breakoutMaxBias: normalizeNumberValue(rule.breakoutMaxBias, defaultConfig.breakoutMaxBias),
    pullbackMinBias: normalizeNumberValue(rule.pullbackMinBias, defaultConfig.pullbackMinBias),
    pullbackMaxBias: normalizeNumberValue(rule.pullbackMaxBias, defaultConfig.pullbackMaxBias),
    actions: rule.actions.filter((value): value is BuyAction => buyActionValueSet.has(value)),
  }
}

const normalizeTradeRule = (rule: TradeRule): TradeStrategyConfig => {
  const defaultConfig = createEmptyTradeConfig()

  return {
    ...defaultConfig,
    volume: rule.volume.filter((value): value is VolumeCondition => volumeValueSet.has(value)),
    pricePattern: pricePatternValueSet.has(rule.pricePattern) ? rule.pricePattern : null,
    movingAverages: rule.movingAverages.filter(
      (value): value is MovingAveragePeriod => movingAverageValueSet.has(value),
    ),
    breakoutMinBias: normalizeNumberValue(rule.breakoutMinBias, defaultConfig.breakoutMinBias),
    breakoutMaxBias: normalizeNumberValue(rule.breakoutMaxBias, defaultConfig.breakoutMaxBias),
    pullbackMinBias: normalizeNumberValue(rule.pullbackMinBias, defaultConfig.pullbackMinBias),
    pullbackMaxBias: normalizeNumberValue(rule.pullbackMaxBias, defaultConfig.pullbackMaxBias),
    breakdownMinBias: normalizeNumberValue(
      rule.breakdownMinBias,
      defaultConfig.breakdownMinBias,
    ),
    breakdownMaxBias: normalizeNumberValue(
      rule.breakdownMaxBias,
      defaultConfig.breakdownMaxBias,
    ),
    actions: rule.actions.filter((value): value is TradeAction => tradeActionValueSet.has(value)),
  }
}

const normalizeSellRule = (rule: SellRule): SellStrategyConfig => {
  const defaultConfig = createEmptySellConfig()

  return {
    ...defaultConfig,
    volume: rule.volume.filter((value): value is VolumeCondition => volumeValueSet.has(value)),
    breakdownPeriods: rule.breakdownPeriods.filter(
      (value): value is SellBreakdownPeriod => sellBreakdownValueSet.has(value),
    ),
    breakdownMinBias: normalizeNumberValue(
      rule.breakdownMinBias,
      defaultConfig.breakdownMinBias,
    ),
    breakdownMaxBias: normalizeNumberValue(
      rule.breakdownMaxBias,
      defaultConfig.breakdownMaxBias,
    ),
    actions: rule.actions.filter((value): value is SellAction => sellActionValueSet.has(value)),
  }
}

export const parseBuyStrategyConfig = (strategy: StrategyItem): BuyStrategyConfig => {
  if (strategy.rule?.kind === 'buy') {
    return normalizeBuyRule(strategy.rule)
  }

  const defaultConfig = createEmptyBuyConfig()
  const breakoutRange = parsePercentRange(
    getConditionContent(strategy.conditions, '突破区间'),
    defaultConfig.breakoutMinBias,
    defaultConfig.breakoutMaxBias,
  )
  const pullbackRange = parsePercentRange(
    getConditionContent(strategy.conditions, '回踩区间'),
    defaultConfig.pullbackMinBias,
    defaultConfig.pullbackMaxBias,
  )

  return {
    ...defaultConfig,
    volume: mapLabelsToValues(volumeOptions, getConditionLabels(strategy.conditions, '量（或）')),
    pricePattern:
      mapLabelsToValues(pricePatternOptions, getConditionLabels(strategy.conditions, '形态'))[0] ?? null,
    movingAverages: mapLabelsToValues(
      movingAverageOptions,
      getConditionLabels(strategy.conditions, '均线（或）'),
    ),
    breakoutMinBias: breakoutRange.min,
    breakoutMaxBias: breakoutRange.max,
    pullbackMinBias: pullbackRange.min,
    pullbackMaxBias: pullbackRange.max,
    actions: getActionValues(strategy.action, buyActionOptions),
  }
}

export const parseTradeStrategyConfig = (strategy: StrategyItem): TradeStrategyConfig => {
  if (strategy.rule?.kind === 'trade') {
    return normalizeTradeRule(strategy.rule)
  }

  if (strategy.rule?.kind === 'buy' || strategy.category === '买入') {
    const buyConfig = parseBuyStrategyConfig(strategy)
    const defaultConfig = createEmptyTradeConfig()

    return {
      ...defaultConfig,
      volume: buyConfig.volume,
      pricePattern: buyConfig.pricePattern,
      movingAverages: buyConfig.movingAverages,
      breakoutMinBias: buyConfig.breakoutMinBias,
      breakoutMaxBias: buyConfig.breakoutMaxBias,
      pullbackMinBias: buyConfig.pullbackMinBias,
      pullbackMaxBias: buyConfig.pullbackMaxBias,
      actions: [...buyConfig.actions],
    }
  }

  if (strategy.rule?.kind === 'sell' || strategy.category === '卖出') {
    const sellConfig = parseSellStrategyConfig(strategy)
    const defaultConfig = createEmptyTradeConfig()

    return {
      ...defaultConfig,
      volume: sellConfig.volume,
      pricePattern: 'breakdown',
      movingAverages: [...sellConfig.breakdownPeriods],
      breakdownMinBias: sellConfig.breakdownMinBias,
      breakdownMaxBias: sellConfig.breakdownMaxBias,
      actions: [...sellConfig.actions],
    }
  }

  const defaultConfig = createEmptyTradeConfig()
  const breakoutRange = parsePercentRange(
    getConditionContent(strategy.conditions, '突破区间'),
    defaultConfig.breakoutMinBias,
    defaultConfig.breakoutMaxBias,
  )
  const pullbackRange = parsePercentRange(
    getConditionContent(strategy.conditions, '回踩区间'),
    defaultConfig.pullbackMinBias,
    defaultConfig.pullbackMaxBias,
  )
  const breakdownRange = parsePercentRange(
    getConditionContent(strategy.conditions, '跌破幅度'),
    defaultConfig.breakdownMinBias,
    defaultConfig.breakdownMaxBias,
  )

  return {
    ...defaultConfig,
    volume: mapLabelsToValues(volumeOptions, getConditionLabels(strategy.conditions, '量（或）')),
    pricePattern:
      mapLabelsToValues(pricePatternOptions, getConditionLabels(strategy.conditions, '形态'))[0] ?? null,
    movingAverages: mapLabelsToValues(
      movingAverageOptions,
      getConditionLabels(strategy.conditions, '均线（或）'),
    ),
    breakoutMinBias: breakoutRange.min,
    breakoutMaxBias: breakoutRange.max,
    pullbackMinBias: pullbackRange.min,
    pullbackMaxBias: pullbackRange.max,
    breakdownMinBias: breakdownRange.min,
    breakdownMaxBias: breakdownRange.max,
    actions: getActionValues(strategy.action, tradeActionOptions),
  }
}

export const parseSellStrategyConfig = (strategy: StrategyItem): SellStrategyConfig => {
  if (strategy.rule?.kind === 'sell') {
    return normalizeSellRule(strategy.rule)
  }

  const defaultConfig = createEmptySellConfig()
  const breakdownRange = parsePercentRange(
    getConditionContent(strategy.conditions, '跌破幅度'),
    defaultConfig.breakdownMinBias,
    defaultConfig.breakdownMaxBias,
  )

  return {
    ...defaultConfig,
    volume: mapLabelsToValues(volumeOptions, getConditionLabels(strategy.conditions, '量（或）')),
    breakdownPeriods: mapLabelsToValues(
      sellBreakdownOptions,
      getConditionLabels(strategy.conditions, '跌破（或）'),
    ),
    breakdownMinBias: breakdownRange.min,
    breakdownMaxBias: breakdownRange.max,
    actions: getActionValues(strategy.action, sellActionOptions),
  }
}

export const parseConvergenceStrategyConfig = (strategy: StrategyItem): ConvergenceConfig => {
  const defaultConfig = createDefaultConvergenceConfig()

  return {
    movingAverages: parseConvergenceMovingAverages(strategy),
    maxSpreadRatio:
      strategy.rule?.kind === 'ma_convergence'
        ? strategy.rule.maxSpreadRatio
        : parsePercentValue(getConditionContent(strategy.conditions, '区间比例'), defaultConfig.maxSpreadRatio),
    nearPriceRatio:
      strategy.rule?.kind === 'ma_convergence'
        ? strategy.rule.nearPriceRatio
        : parsePercentValue(getConditionContent(strategy.conditions, '附近阈值'), defaultConfig.nearPriceRatio),
  }
}
