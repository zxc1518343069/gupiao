import type { MovingAverageMetric } from '@/types/portfolio'
import type { ConvergenceRule, StrategyItem } from '../types/strategy'

export type ConvergenceSignalState = 'near-lower' | 'inside-band' | 'near-upper' | 'converged'

export type ConvergenceSignal = {
  state: ConvergenceSignalState
  statusText: string
  suggestionText: string | null
  bandName: string
  lowerBound: number
  upperBound: number
  spreadRatio: number
}

const isConvergenceRule = (rule: StrategyItem['rule']): rule is ConvergenceRule =>
  Boolean(rule && rule.kind === 'ma_convergence')

const findMetricPrice = (
  metrics: MovingAverageMetric[],
  movingAverageKey: string,
): number | null => {
  const matchedMetric = metrics.find((metric) => metric.key.toLowerCase() === movingAverageKey.toLowerCase())
  return matchedMetric?.price ?? null
}

export const getConvergenceRules = (strategies: StrategyItem[]): ConvergenceRule[] =>
  strategies.reduce<ConvergenceRule[]>((rules, strategy) => {
    if (strategy.category === '均线粘合' && isConvergenceRule(strategy.rule)) {
      rules.push(strategy.rule)
    }

    return rules
  }, [])

const formatConvergenceBandName = (movingAverages: ConvergenceRule['movingAverages']) =>
  movingAverages.map((movingAverage) => movingAverage.replace(/^ma/i, '')).join('-')

export const evaluateConvergenceSignal = ({
  metrics,
  latestPrice,
  rule,
}: {
  metrics?: MovingAverageMetric[] | null
  latestPrice: number | null
  rule: ConvergenceRule | null
}): ConvergenceSignal | null => {
  if (!rule || !metrics?.length || latestPrice === null) {
    return null
  }

  const selectedPrices = rule.movingAverages
    .map((movingAverage) => findMetricPrice(metrics, movingAverage))
    .filter((value): value is number => value !== null)

  if (selectedPrices.length !== rule.movingAverages.length) {
    return null
  }

  const lowerBound = Math.min(...selectedPrices)
  const upperBound = Math.max(...selectedPrices)
  const bandName = formatConvergenceBandName(rule.movingAverages)
  if (lowerBound <= 0) {
    return null
  }

  const spreadRatio = Number((((upperBound - lowerBound) / lowerBound) * 100).toFixed(2))
  if (spreadRatio > rule.maxSpreadRatio) {
    return null
  }

  if (latestPrice >= lowerBound && latestPrice <= upperBound) {
    return {
      state: 'inside-band',
      statusText: '粘合区内',
      suggestionText: `${bandName}均线粘合区内`,
      bandName,
      lowerBound,
      upperBound,
      spreadRatio,
    }
  }

  const lowerDistanceRatio = Number((((lowerBound - latestPrice) / lowerBound) * 100).toFixed(2))
  if (latestPrice < lowerBound && lowerDistanceRatio <= rule.nearPriceRatio) {
    return {
      state: 'near-lower',
      statusText: '下沿附近',
      suggestionText: `${bandName}均线粘合区下沿附近`,
      bandName,
      lowerBound,
      upperBound,
      spreadRatio,
    }
  }

  const upperDistanceRatio = Number((((latestPrice - upperBound) / upperBound) * 100).toFixed(2))
  if (latestPrice > upperBound && upperDistanceRatio <= rule.nearPriceRatio) {
    return {
      state: 'near-upper',
      statusText: '上沿附近',
      suggestionText: `${bandName}均线粘合区上沿附近`,
      bandName,
      lowerBound,
      upperBound,
      spreadRatio,
    }
  }

  return {
    state: 'converged',
    statusText: '已粘合',
    suggestionText: null,
    bandName,
    lowerBound,
    upperBound,
    spreadRatio,
  }
}

export const evaluateConvergenceSignals = ({
  metrics,
  latestPrice,
  rules,
}: {
  metrics?: MovingAverageMetric[] | null
  latestPrice: number | null
  rules: ConvergenceRule[]
}): ConvergenceSignal[] =>
  rules
    .map((rule) =>
      evaluateConvergenceSignal({
        metrics,
        latestPrice,
        rule,
      }),
    )
    .filter((signal): signal is ConvergenceSignal => Boolean(signal?.suggestionText))
