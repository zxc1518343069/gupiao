import { useState } from 'react'
import { buildBuyStrategyDraft } from '../../builders/strategyDraftBuilders'
import { createEmptyBuyConfig } from '../../configs/strategyOptions'
import type { BuyStrategyConfig, StrategyDraft } from '../../types/strategy'
import { getBuyValidationErrors } from '../../validators/strategyValidators'
import { BuyStrategyForm } from '../forms/BuyStrategyForm'

type BuyStrategyTabProps = {
  creating: boolean
  onCreateStrategy: (draft: StrategyDraft) => Promise<boolean>
}

export const BuyStrategyTab = ({ creating, onCreateStrategy }: BuyStrategyTabProps) => {
  const [buyConfig, setBuyConfig] = useState<BuyStrategyConfig>(() => createEmptyBuyConfig())
  const [buyValidationErrors, setBuyValidationErrors] = useState<string[]>([])

  const updateBuyConfig = <Key extends keyof BuyStrategyConfig>(
    key: Key,
    value: BuyStrategyConfig[Key],
  ) => {
    setBuyValidationErrors([])
    setBuyConfig((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async () => {
    const validationErrors = getBuyValidationErrors(buyConfig)
    if (validationErrors.length > 0) {
      setBuyValidationErrors(validationErrors)
      return
    }

    const isSaved = await onCreateStrategy(buildBuyStrategyDraft(buyConfig))
    if (!isSaved) {
      return
    }

    setBuyConfig(createEmptyBuyConfig())
    setBuyValidationErrors([])
  }

  return (
    <BuyStrategyForm
      config={buyConfig}
      validationErrors={buyValidationErrors}
      submitting={creating}
      submitText="添加买入策略"
      onConfigChange={updateBuyConfig}
      onSubmit={() => {
        void handleSubmit()
      }}
    />
  )
}
