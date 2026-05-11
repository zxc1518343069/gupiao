import type { MovingAverageMetric, VolumeMeta } from '@/types/portfolio'
import {
  createEmptyTradeConfig,
  movingAverageOptions,
  tradeActionOptions,
  tradeSellActions,
} from '../configs/strategyOptions'
import type {
  ConvergenceRule,
  MovingAveragePeriod,
  StrategyItem,
  StrategyRule,
  TradeAction,
  TradeRule,
  VolumeCondition,
} from '../types/strategy'
import { evaluateConvergenceSignal } from './convergenceRule'

export type PortfolioStrategySuggestionTone = 'buy' | 'sell' | 'convergence'

export type PortfolioStrategySuggestion = {
  key: string
  tone: PortfolioStrategySuggestionTone
  badgeText: string
  suggestionText: string
}

const tradeSellActionSet = new Set<TradeAction>(tradeSellActions)

const isStrategyRule = (rule: StrategyItem['rule']): rule is StrategyRule => Boolean(rule)

const getMovingAverageMetric = (
  metrics: MovingAverageMetric[] | null | undefined,
  movingAverageKey: MovingAveragePeriod,
) => metrics?.find((metric) => metric.key.toLowerCase() === movingAverageKey.toLowerCase()) ?? null

const getOptionLabels = <T extends string>(
  options: Array<{ label: string; value: T }>,
  values: T[],
) =>
  values
    .map((value) => options.find((option) => option.value === value)?.label)
    .filter((label): label is string => Boolean(label))

const getMatchedVolumeConditions = (
  volumeMeta: VolumeMeta | null | undefined,
  conditions: VolumeCondition[],
) => {
  if (!volumeMeta?.status_code) {
    return []
  }

  const volumeConditionByStatus: Partial<Record<VolumeMeta['status_code'], VolumeCondition>> = {
    surge: 'surge',
    expanded: 'increase',
    normal: 'flat',
    shrink: 'shrink',
  }

  const currentCondition = volumeConditionByStatus[volumeMeta.status_code]
  if (!currentCondition || !conditions.includes(currentCondition)) {
    return []
  }

  return [currentCondition]
}

const formatMatchedMovingAverages = (movingAverages: MovingAveragePeriod[]) =>
  getOptionLabels(movingAverageOptions, movingAverages).join(' / ')

const getNormalizedRuleNumber = (value: unknown, fallbackValue: number) => {
  const normalizedValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(normalizedValue) ? normalizedValue : fallbackValue
}

const shortReferenceMovingAverages: MovingAveragePeriod[] = ['ma5', 'ma10']
const movingAveragePeriodOrder: Record<MovingAveragePeriod, number> = {
  ma5: 5,
  ma10: 10,
  ma20: 20,
  ma60: 60,
  ma120: 120,
}

const getReferenceMovingAveragePeriods = (movingAverage: MovingAveragePeriod) =>
  shortReferenceMovingAverages.filter(
    (period) => movingAveragePeriodOrder[period] < movingAveragePeriodOrder[movingAverage],
  )

const getPatternLabel = (pattern: TradeRule['pricePattern']) => {
  if (pattern === 'breakout') {
    return '突破'
  }
  if (pattern === 'pullback') {
    return '回踩'
  }
  return '跌破'
}

const getTradeSuggestionTone = (rule: TradeRule): PortfolioStrategySuggestionTone =>
  rule.actions.some((action) => tradeSellActionSet.has(action)) || rule.pricePattern === 'breakdown'
    ? 'sell'
    : 'buy'

const toTradeRule = (rule: StrategyRule): TradeRule | null => {
  const defaultConfig = createEmptyTradeConfig()

  if (rule.kind === 'trade') {
    return {
      ...rule,
      breakoutMinBias: getNormalizedRuleNumber(rule.breakoutMinBias, defaultConfig.breakoutMinBias),
      breakoutMaxBias: getNormalizedRuleNumber(rule.breakoutMaxBias, defaultConfig.breakoutMaxBias),
      pullbackMinBias: getNormalizedRuleNumber(rule.pullbackMinBias, defaultConfig.pullbackMinBias),
      pullbackMaxBias: getNormalizedRuleNumber(rule.pullbackMaxBias, defaultConfig.pullbackMaxBias),
      breakdownMinBias: getNormalizedRuleNumber(
        rule.breakdownMinBias,
        defaultConfig.breakdownMinBias,
      ),
      breakdownMaxBias: getNormalizedRuleNumber(
        rule.breakdownMaxBias,
        defaultConfig.breakdownMaxBias,
      ),
    }
  }

  if (rule.kind === 'buy') {
    return {
      kind: 'trade',
      volume: [...rule.volume],
      pricePattern: rule.pricePattern === 'breakdown' ? 'breakdown' : rule.pricePattern,
      movingAverages: [...rule.movingAverages],
      breakoutMinBias: getNormalizedRuleNumber(rule.breakoutMinBias, defaultConfig.breakoutMinBias),
      breakoutMaxBias: getNormalizedRuleNumber(rule.breakoutMaxBias, defaultConfig.breakoutMaxBias),
      pullbackMinBias: getNormalizedRuleNumber(rule.pullbackMinBias, defaultConfig.pullbackMinBias),
      pullbackMaxBias: getNormalizedRuleNumber(rule.pullbackMaxBias, defaultConfig.pullbackMaxBias),
      breakdownMinBias: defaultConfig.breakdownMinBias,
      breakdownMaxBias: defaultConfig.breakdownMaxBias,
      actions: [...rule.actions],
    }
  }

  if (rule.kind === 'sell') {
    return {
      kind: 'trade',
      volume: [...rule.volume],
      pricePattern: 'breakdown',
      movingAverages: [...rule.breakdownPeriods],
      breakoutMinBias: defaultConfig.breakoutMinBias,
      breakoutMaxBias: defaultConfig.breakoutMaxBias,
      pullbackMinBias: defaultConfig.pullbackMinBias,
      pullbackMaxBias: defaultConfig.pullbackMaxBias,
      breakdownMinBias: getNormalizedRuleNumber(
        rule.breakdownMinBias,
        defaultConfig.breakdownMinBias,
      ),
      breakdownMaxBias: getNormalizedRuleNumber(
        rule.breakdownMaxBias,
        defaultConfig.breakdownMaxBias,
      ),
      actions: [...rule.actions],
    }
  }

  return null
}

const buildConvergenceSuggestions = ({
  latestPrice,
  metrics,
  rules,
}: {
  latestPrice: number | null
  metrics?: MovingAverageMetric[] | null
  rules: ConvergenceRule[]
}): PortfolioStrategySuggestion[] =>
  rules.reduce<PortfolioStrategySuggestion[]>((suggestions, rule, index) => {
    const signal = evaluateConvergenceSignal({
      metrics,
      latestPrice,
      rule,
    })

    if (!signal?.suggestionText) {
      return suggestions
    }

    suggestions.push({
      key: `convergence-${index}-${signal.bandName}-${signal.statusText}`,
      tone: 'convergence',
      badgeText: signal.statusText,
      suggestionText: signal.suggestionText,
    })

    return suggestions
  }, [])

const buildTradeSuggestions = ({
  latestPrice,
  metrics,
  volumeMeta,
  rules,
}: {
  latestPrice: number | null
  metrics?: MovingAverageMetric[] | null
  volumeMeta?: VolumeMeta | null
  rules: TradeRule[]
}): PortfolioStrategySuggestion[] =>
  rules.reduce<PortfolioStrategySuggestion[]>((suggestions, rule, index) => {
    if (latestPrice === null) {
      return suggestions
    }

    const matchedVolume = getMatchedVolumeConditions(volumeMeta, rule.volume)
    if (matchedVolume.length === 0) {
      return suggestions
    }

    const defaultConfig = createEmptyTradeConfig()
    const matchedMovingAverages = rule.movingAverages.filter((movingAverage) => {
      const metric = getMovingAverageMetric(metrics, movingAverage)
      if (!metric || metric.price === null || metric.bias === null) {
        return false
      }

      if (rule.pricePattern === 'breakdown') {
        const breakdownDepth = Math.abs(metric.bias)
        return (
          metric.bias < 0 &&
          breakdownDepth > getNormalizedRuleNumber(rule.breakdownMinBias, defaultConfig.breakdownMinBias) &&
          breakdownDepth <= getNormalizedRuleNumber(rule.breakdownMaxBias, defaultConfig.breakdownMaxBias)
        )
      }

      const referencePeriods = getReferenceMovingAveragePeriods(movingAverage)
      const referenceMetrics = referencePeriods
        .map((period) => getMovingAverageMetric(metrics, period))
        .filter(
          (referenceMetric): referenceMetric is MovingAverageMetric =>
            Boolean(referenceMetric && referenceMetric.price !== null),
        )
      const hasFullReferenceStructure =
        referencePeriods.length === 0 || referenceMetrics.length === referencePeriods.length

      if (rule.pricePattern === 'breakout') {
        const matchesBreakoutRange =
          metric.bias > getNormalizedRuleNumber(rule.breakoutMinBias, defaultConfig.breakoutMinBias) &&
          metric.bias <= getNormalizedRuleNumber(rule.breakoutMaxBias, defaultConfig.breakoutMaxBias)

        return (
          matchesBreakoutRange &&
          hasFullReferenceStructure &&
          (
            referenceMetrics.length === 0 ||
            referenceMetrics.some((referenceMetric) => referenceMetric.price! < metric.price!)
          )
        )
      }

      const matchesPullbackRange =
        metric.bias >= getNormalizedRuleNumber(rule.pullbackMinBias, defaultConfig.pullbackMinBias) &&
        metric.bias <= getNormalizedRuleNumber(rule.pullbackMaxBias, defaultConfig.pullbackMaxBias)

      return (
        matchesPullbackRange &&
        hasFullReferenceStructure &&
        referenceMetrics.length > 0 &&
        referenceMetrics.every((referenceMetric) => referenceMetric.price! > metric.price!)
      )
    })

    if (matchedMovingAverages.length === 0) {
      return suggestions
    }

    const actionLabels = getOptionLabels(tradeActionOptions, rule.actions).join('、')
    const movingAverageLabel = formatMatchedMovingAverages(matchedMovingAverages)

    suggestions.push({
      key: `trade-${index}-${rule.pricePattern}-${matchedMovingAverages.join('-')}-${rule.actions.join('-')}`,
      tone: getTradeSuggestionTone(rule),
      badgeText: actionLabels || '观察',
      suggestionText: `${getPatternLabel(rule.pricePattern)} ${movingAverageLabel}`,
    })

    return suggestions
  }, [])

export const getStrategyRules = (strategies: StrategyItem[]): StrategyRule[] =>
  strategies.reduce<StrategyRule[]>((rules, strategy) => {
    if (isStrategyRule(strategy.rule)) {
      rules.push(strategy.rule)
    }

    return rules
  }, [])

export const evaluatePortfolioStrategySuggestions = ({
  latestPrice,
  metrics,
  volumeMeta,
  rules,
}: {
  latestPrice: number | null
  metrics?: MovingAverageMetric[] | null
  volumeMeta?: VolumeMeta | null
  rules: StrategyRule[]
}): PortfolioStrategySuggestion[] => {
  const tradeRules = rules.reduce<TradeRule[]>((normalizedRules, rule) => {
    const normalizedRule = toTradeRule(rule)
    if (normalizedRule) {
      normalizedRules.push(normalizedRule)
    }

    return normalizedRules
  }, [])
  const convergenceRules = rules.filter((rule): rule is ConvergenceRule => rule.kind === 'ma_convergence')
  const tonePriority: Record<PortfolioStrategySuggestionTone, number> = {
    sell: 0,
    buy: 1,
    convergence: 2,
  }

  return [
    ...buildTradeSuggestions({ latestPrice, metrics, volumeMeta, rules: tradeRules }),
    ...buildConvergenceSuggestions({ latestPrice, metrics, rules: convergenceRules }),
  ].sort((first, second) => tonePriority[first.tone] - tonePriority[second.tone])
}
