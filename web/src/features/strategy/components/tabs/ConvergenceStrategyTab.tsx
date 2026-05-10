import { useState } from 'react'
import { buildConvergenceStrategyDraft } from '../../builders/strategyDraftBuilders'
import { createDefaultConvergenceConfig } from '../../configs/strategyOptions'
import type { ConvergenceConfig, StrategyDraft } from '../../types/strategy'
import { ConvergenceStrategyForm } from '../forms/ConvergenceStrategyForm'

type ConvergenceStrategyTabProps = {
  creating: boolean
  onCreateStrategy: (draft: StrategyDraft) => Promise<boolean>
}

export const ConvergenceStrategyTab = ({
  creating,
  onCreateStrategy,
}: ConvergenceStrategyTabProps) => {
  const [convergenceConfig, setConvergenceConfig] = useState<ConvergenceConfig>(() =>
    createDefaultConvergenceConfig(),
  )

  const updateConvergenceConfig = <Key extends keyof ConvergenceConfig>(
    key: Key,
    value: ConvergenceConfig[Key],
  ) => {
    setConvergenceConfig((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async () => {
    const isSaved = await onCreateStrategy(buildConvergenceStrategyDraft(convergenceConfig))
    if (!isSaved) {
      return
    }

    setConvergenceConfig(createDefaultConvergenceConfig())
  }

  return (
    <ConvergenceStrategyForm
      config={convergenceConfig}
      submitting={creating}
      submitText="添加均线粘合策略"
      onConfigChange={updateConvergenceConfig}
      onSubmit={() => {
        void handleSubmit()
      }}
    />
  )
}
