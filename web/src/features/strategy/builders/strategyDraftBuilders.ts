import {
  createDefaultConvergenceRule,
  buyActionOptions,
  getOptionLabel,
  getOptionLabels,
  joinLabels,
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
  SellStrategyConfig,
  StrategyDraft,
  TradeStrategyConfig,
} from '../types/strategy'

const buildCondition = (label: string, values: string[]) => `${label}：${joinLabels(values)}`

export const buildBuyStrategyDraft = (config: BuyStrategyConfig): StrategyDraft => {
  const volumeLabels = getOptionLabels(volumeOptions, config.volume)
  const pricePatternLabel = getOptionLabel(pricePatternOptions, config.pricePattern)
  const movingAverageLabels = getOptionLabels(movingAverageOptions, config.movingAverages)
  const actionLabels = getOptionLabels(buyActionOptions, config.actions)
  const thresholdCondition =
    config.pricePattern === 'breakout'
      ? `突破区间：${config.breakoutMinBias}% ~ ${config.breakoutMaxBias}%`
      : config.pricePattern === 'pullback'
        ? `回踩区间：${config.pullbackMinBias}% ~ ${config.pullbackMaxBias}%`
        : null

  return {
    category: '买入',
    name: `${joinLabels(actionLabels)}买入策略`,
    conditions: [
      buildCondition('量（或）', volumeLabels),
      buildCondition('形态', pricePatternLabel ? [pricePatternLabel] : []),
      buildCondition('均线（或）', movingAverageLabels),
      thresholdCondition,
    ].filter((condition): condition is string => Boolean(condition)),
    action: joinLabels(actionLabels),
    rule: config.pricePattern
      ? {
          kind: 'buy',
          volume: [...config.volume],
          pricePattern: config.pricePattern,
          movingAverages: [...config.movingAverages],
          breakoutMinBias: config.breakoutMinBias,
          breakoutMaxBias: config.breakoutMaxBias,
          pullbackMinBias: config.pullbackMinBias,
          pullbackMaxBias: config.pullbackMaxBias,
          actions: [...config.actions],
        }
      : null,
  }
}

export const buildTradeStrategyDraft = (config: TradeStrategyConfig): StrategyDraft => {
  const volumeLabels = getOptionLabels(volumeOptions, config.volume)
  const pricePatternLabel = getOptionLabel(pricePatternOptions, config.pricePattern)
  const movingAverageLabels = getOptionLabels(movingAverageOptions, config.movingAverages)
  const actionLabels = getOptionLabels(tradeActionOptions, config.actions)
  const thresholdCondition =
    config.pricePattern === 'breakout'
      ? `突破区间：${config.breakoutMinBias}% ~ ${config.breakoutMaxBias}%`
      : config.pricePattern === 'pullback'
        ? `回踩区间：${config.pullbackMinBias}% ~ ${config.pullbackMaxBias}%`
        : config.pricePattern === 'breakdown'
          ? `跌破幅度：${config.breakdownMinBias}% ~ ${config.breakdownMaxBias}%`
          : null

  return {
    category: '交易',
    name: `${joinLabels(actionLabels)}交易策略`,
    conditions: [
      buildCondition('量（或）', volumeLabels),
      buildCondition('形态', pricePatternLabel ? [pricePatternLabel] : []),
      buildCondition('均线（或）', movingAverageLabels),
      thresholdCondition,
    ].filter((condition): condition is string => Boolean(condition)),
    action: joinLabels(actionLabels),
    rule: config.pricePattern
      ? {
          kind: 'trade',
          volume: [...config.volume],
          pricePattern: config.pricePattern,
          movingAverages: [...config.movingAverages],
          breakoutMinBias: config.breakoutMinBias,
          breakoutMaxBias: config.breakoutMaxBias,
          pullbackMinBias: config.pullbackMinBias,
          pullbackMaxBias: config.pullbackMaxBias,
          breakdownMinBias: config.breakdownMinBias,
          breakdownMaxBias: config.breakdownMaxBias,
          actions: [...config.actions],
        }
      : null,
  }
}

export const buildSellStrategyDraft = (config: SellStrategyConfig): StrategyDraft => {
  const volumeLabels = getOptionLabels(volumeOptions, config.volume)
  const breakdownLabels = getOptionLabels(sellBreakdownOptions, config.breakdownPeriods)
  const actionLabels = getOptionLabels(sellActionOptions, config.actions)

  return {
    category: '卖出',
    name: `${joinLabels(actionLabels)}卖出策略`,
    conditions: [
      buildCondition('量（或）', volumeLabels),
      buildCondition('跌破（或）', breakdownLabels),
      `跌破幅度：${config.breakdownMinBias}% ~ ${config.breakdownMaxBias}%`,
    ],
    action: joinLabels(actionLabels),
    rule: {
      kind: 'sell',
      volume: [...config.volume],
      breakdownPeriods: [...config.breakdownPeriods],
      breakdownMinBias: config.breakdownMinBias,
      breakdownMaxBias: config.breakdownMaxBias,
      actions: [...config.actions],
    },
  }
}

export const buildConvergenceStrategyDraft = (config: ConvergenceConfig): StrategyDraft => {
  const movingAverageLabels = getOptionLabels(movingAverageOptions, config.movingAverages)
  const baseRule = createDefaultConvergenceRule()

  return {
    category: '均线粘合',
    name: `${movingAverageLabels.length}均线粘合`,
    conditions: [
      buildCondition('参与均线', movingAverageLabels),
      `区间比例：<= ${config.maxSpreadRatio}%`,
      `附近阈值：<= ${config.nearPriceRatio}%`,
    ],
    action: '观察',
    rule: {
      ...baseRule,
      movingAverages: [...config.movingAverages],
      maxSpreadRatio: config.maxSpreadRatio,
      nearPriceRatio: config.nearPriceRatio,
    },
  }
}
