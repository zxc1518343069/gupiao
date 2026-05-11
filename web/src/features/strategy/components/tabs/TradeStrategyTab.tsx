import { useState } from 'react'
import { buildTradeStrategyDraft } from '../../builders/strategyDraftBuilders'
import {
  createEmptyTradeConfig,
  getTradeActionValuesForPattern,
} from '../../configs/strategyOptions'
import type { PricePattern, StrategyDraft, TradeStrategyConfig } from '../../types/strategy'
import { getTradeValidationErrors } from '../../validators/strategyValidators'
import { TradeStrategyForm } from '../forms/TradeStrategyForm'

type TradeStrategyTabProps = {
  creating: boolean
  onCreateStrategy: (draft: StrategyDraft) => Promise<boolean>
}

const sanitizeTradeConfig = (
  current: TradeStrategyConfig,
  nextPricePattern: PricePattern | null,
): TradeStrategyConfig => {
  const allowedActionValues = new Set(getTradeActionValuesForPattern(nextPricePattern))

  return {
    ...current,
    pricePattern: nextPricePattern,
    actions: current.actions.filter((value) => allowedActionValues.has(value)),
  }
}

export const TradeStrategyTab = ({ creating, onCreateStrategy }: TradeStrategyTabProps) => {
  const [tradeConfig, setTradeConfig] = useState<TradeStrategyConfig>(() => createEmptyTradeConfig())
  const [tradeValidationErrors, setTradeValidationErrors] = useState<string[]>([])

  const updateTradeConfig = <Key extends keyof TradeStrategyConfig>(
    key: Key,
    value: TradeStrategyConfig[Key],
  ) => {
    setTradeValidationErrors([])
    setTradeConfig((current) =>
      key === 'pricePattern'
        ? sanitizeTradeConfig(current, value as PricePattern | null)
        : { ...current, [key]: value },
    )
  }

  const handleSubmit = async () => {
    const validationErrors = getTradeValidationErrors(tradeConfig)
    if (validationErrors.length > 0) {
      setTradeValidationErrors(validationErrors)
      return
    }

    const isSaved = await onCreateStrategy(buildTradeStrategyDraft(tradeConfig))
    if (!isSaved) {
      return
    }

    setTradeConfig(createEmptyTradeConfig())
    setTradeValidationErrors([])
  }

  return (
    <TradeStrategyForm
      config={tradeConfig}
      validationErrors={tradeValidationErrors}
      submitting={creating}
      submitText="添加交易策略"
      onConfigChange={updateTradeConfig}
      onSubmit={() => {
        void handleSubmit()
      }}
    />
  )
}
