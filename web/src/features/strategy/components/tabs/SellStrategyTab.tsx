import { useState } from 'react'
import { buildSellStrategyDraft } from '../../builders/strategyDraftBuilders'
import { createEmptySellConfig } from '../../configs/strategyOptions'
import type { SellStrategyConfig, StrategyDraft } from '../../types/strategy'
import { getSellValidationErrors } from '../../validators/strategyValidators'
import { SellStrategyForm } from '../forms/SellStrategyForm'

type SellStrategyTabProps = {
  creating: boolean
  onCreateStrategy: (draft: StrategyDraft) => Promise<boolean>
}

export const SellStrategyTab = ({ creating, onCreateStrategy }: SellStrategyTabProps) => {
  const [sellConfig, setSellConfig] = useState<SellStrategyConfig>(() => createEmptySellConfig())
  const [sellValidationErrors, setSellValidationErrors] = useState<string[]>([])

  const updateSellConfig = <Key extends keyof SellStrategyConfig>(
    key: Key,
    value: SellStrategyConfig[Key],
  ) => {
    setSellValidationErrors([])
    setSellConfig((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async () => {
    const validationErrors = getSellValidationErrors(sellConfig)
    if (validationErrors.length > 0) {
      setSellValidationErrors(validationErrors)
      return
    }

    const isSaved = await onCreateStrategy(buildSellStrategyDraft(sellConfig))
    if (!isSaved) {
      return
    }

    setSellConfig(createEmptySellConfig())
    setSellValidationErrors([])
  }

  return (
    <SellStrategyForm
      config={sellConfig}
      validationErrors={sellValidationErrors}
      submitting={creating}
      submitText="添加卖出策略"
      onConfigChange={updateSellConfig}
      onSubmit={() => {
        void handleSubmit()
      }}
    />
  )
}
