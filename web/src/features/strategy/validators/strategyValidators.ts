import type {
  BuyStrategyConfig,
  ConvergenceConfig,
  SellStrategyConfig,
  TradeStrategyConfig,
} from '../types/strategy'

export const getBuyValidationErrors = (config: BuyStrategyConfig) => {
  const errors: string[] = []

  if (config.volume.length === 0) {
    errors.push('请选择至少一个量配置')
  }
  if (!config.pricePattern) {
    errors.push('请选择一个价格形态')
  }
  if (config.movingAverages.length === 0) {
    errors.push('请选择至少一条均线')
  }
  if (config.actions.length === 0) {
    errors.push('请选择至少一个操作')
  }

  if (config.pricePattern === 'breakout') {
    if (!Number.isFinite(config.breakoutMinBias) || config.breakoutMinBias < 0) {
      errors.push('突破最小超出比例不能小于 0%')
    }
    if (
      !Number.isFinite(config.breakoutMaxBias) ||
      config.breakoutMaxBias <= config.breakoutMinBias
    ) {
      errors.push('突破最大超出比例需大于最小超出比例')
    }
  }

  if (config.pricePattern === 'pullback') {
    if (!Number.isFinite(config.pullbackMinBias) || !Number.isFinite(config.pullbackMaxBias)) {
      errors.push('请填写完整的回踩区间')
    } else if (config.pullbackMaxBias <= config.pullbackMinBias) {
      errors.push('回踩区间上限需大于下限')
    }
  }

  return errors
}

export const getSellValidationErrors = (config: SellStrategyConfig) => {
  const errors: string[] = []

  if (config.volume.length === 0) {
    errors.push('请选择至少一个量配置')
  }
  if (config.breakdownPeriods.length === 0) {
    errors.push('请选择至少一个跌破条件')
  }
  if (config.actions.length === 0) {
    errors.push('请选择至少一个操作')
  }
  if (!Number.isFinite(config.breakdownMinBias) || config.breakdownMinBias < 0) {
    errors.push('跌破最小幅度不能小于 0%')
  }
  if (
    !Number.isFinite(config.breakdownMaxBias) ||
    config.breakdownMaxBias <= config.breakdownMinBias
  ) {
    errors.push('跌破最大幅度需大于最小幅度')
  }

  return errors
}

export const getTradeValidationErrors = (config: TradeStrategyConfig) => {
  const errors: string[] = []

  if (config.volume.length === 0) {
    errors.push('请选择至少一个量配置')
  }
  if (!config.pricePattern) {
    errors.push('请选择一个价格形态')
  }
  if (config.movingAverages.length === 0) {
    errors.push('请选择至少一条均线')
  }
  if (config.actions.length === 0) {
    errors.push('请选择至少一个操作')
  }

  if (config.pricePattern === 'breakout' || config.pricePattern === 'pullback') {
    if (config.actions.some((action) => action === 'reduce' || action === 'clear')) {
      errors.push('突破和回踩仅支持建仓或加仓')
    }
  }

  if (config.pricePattern === 'breakdown') {
    if (config.actions.some((action) => action !== 'reduce' && action !== 'clear')) {
      errors.push('跌破仅支持减仓或清仓')
    }
  }

  if (config.pricePattern === 'breakout') {
    if (!Number.isFinite(config.breakoutMinBias) || config.breakoutMinBias < 0) {
      errors.push('突破最小超出比例不能小于 0%')
    }
    if (
      !Number.isFinite(config.breakoutMaxBias) ||
      config.breakoutMaxBias <= config.breakoutMinBias
    ) {
      errors.push('突破最大超出比例需大于最小超出比例')
    }
  }

  if (config.pricePattern === 'pullback') {
    if (!Number.isFinite(config.pullbackMinBias) || !Number.isFinite(config.pullbackMaxBias)) {
      errors.push('请填写完整的回踩区间')
    } else if (config.pullbackMaxBias <= config.pullbackMinBias) {
      errors.push('回踩区间上限需大于下限')
    }
  }

  if (config.pricePattern === 'breakdown') {
    if (!Number.isFinite(config.breakdownMinBias) || config.breakdownMinBias < 0) {
      errors.push('跌破最小幅度不能小于 0%')
    }
    if (
      !Number.isFinite(config.breakdownMaxBias) ||
      config.breakdownMaxBias <= config.breakdownMinBias
    ) {
      errors.push('跌破最大幅度需大于最小幅度')
    }
  }

  return errors
}

export const canSubmitConvergenceStrategy = (config: ConvergenceConfig) =>
  config.movingAverages.length >= 2 && config.maxSpreadRatio > 0 && config.nearPriceRatio > 0
