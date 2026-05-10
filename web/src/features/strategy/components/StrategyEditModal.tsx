import { Modal } from 'antd'
import { useEffect, useState } from 'react'
import {
  buildConvergenceStrategyDraft,
  buildTradeStrategyDraft,
} from '../builders/strategyDraftBuilders'
import {
  createDefaultConvergenceConfig,
  createEmptyTradeConfig,
} from '../configs/strategyOptions'
import {
  parseConvergenceStrategyConfig,
  parseTradeStrategyConfig,
} from '../parsers/strategyConfigParsers'
import type {
  ConvergenceConfig,
  StrategyDraft,
  StrategyItem,
  TradeStrategyConfig,
  PricePattern,
} from '../types/strategy'
import {
  getTradeActionValuesForPattern,
  getTradeMovingAverageValuesForPattern,
} from '../configs/strategyOptions'
import { getTradeValidationErrors } from '../validators/strategyValidators'
import { ConvergenceStrategyForm } from './forms/ConvergenceStrategyForm'
import { TradeStrategyForm } from './forms/TradeStrategyForm'

type StrategyEditModalProps = {
  open: boolean
  strategy: StrategyItem | null
  updating: boolean
  onCancel: () => void
  onUpdateStrategy: (strategyId: string, draft: StrategyDraft) => Promise<boolean>
}

export const StrategyEditModal = ({
  open,
  strategy,
  updating,
  onCancel,
  onUpdateStrategy,
}: StrategyEditModalProps) => {
  const [tradeConfig, setTradeConfig] = useState<TradeStrategyConfig>(() => createEmptyTradeConfig())
  const [convergenceConfig, setConvergenceConfig] = useState<ConvergenceConfig>(() =>
    createDefaultConvergenceConfig(),
  )
  const [tradeValidationErrors, setTradeValidationErrors] = useState<string[]>([])

  const sanitizeTradeConfig = (
    current: TradeStrategyConfig,
    nextPricePattern: PricePattern | null,
  ): TradeStrategyConfig => {
    const allowedMovingAverageValues = new Set(getTradeMovingAverageValuesForPattern(nextPricePattern))
    const allowedActionValues = new Set(getTradeActionValuesForPattern(nextPricePattern))

    return {
      ...current,
      pricePattern: nextPricePattern,
      movingAverages: current.movingAverages.filter((value) => allowedMovingAverageValues.has(value)),
      actions: current.actions.filter((value) => allowedActionValues.has(value)),
    }
  }

  useEffect(() => {
    if (!open || !strategy) {
      return
    }

    setTradeValidationErrors([])

    if (strategy.category === '均线粘合') {
      setConvergenceConfig(parseConvergenceStrategyConfig(strategy))
      return
    }

    setTradeConfig(parseTradeStrategyConfig(strategy))
  }, [open, strategy])

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

  const updateConvergenceConfig = <Key extends keyof ConvergenceConfig>(
    key: Key,
    value: ConvergenceConfig[Key],
  ) => {
    setConvergenceConfig((current) => ({ ...current, [key]: value }))
  }

  const submitDraft = async (draft: StrategyDraft) => {
    if (!strategy) {
      return
    }

    const isSaved = await onUpdateStrategy(strategy.id, draft)
    if (isSaved) {
      onCancel()
    }
  }

  const handleTradeSubmit = async () => {
    const validationErrors = getTradeValidationErrors(tradeConfig)
    if (validationErrors.length > 0) {
      setTradeValidationErrors(validationErrors)
      return
    }

    await submitDraft(buildTradeStrategyDraft(tradeConfig))
  }

  const handleConvergenceSubmit = async () => {
    await submitDraft(buildConvergenceStrategyDraft(convergenceConfig))
  }

  return (
    <Modal
      open={open}
      title={strategy?.category === '均线粘合' ? '编辑均线粘合策略' : '编辑交易策略'}
      width={880}
      footer={null}
      onCancel={onCancel}
    >
      {strategy && strategy.category !== '均线粘合' ? (
        <TradeStrategyForm
          config={tradeConfig}
          validationErrors={tradeValidationErrors}
          submitting={updating}
          submitText="保存交易策略"
          onConfigChange={updateTradeConfig}
          onSubmit={() => {
            void handleTradeSubmit()
          }}
        />
      ) : null}

      {strategy?.category === '均线粘合' ? (
        <ConvergenceStrategyForm
          config={convergenceConfig}
          submitting={updating}
          submitText="保存均线粘合策略"
          onConfigChange={updateConvergenceConfig}
          onSubmit={() => {
            void handleConvergenceSubmit()
          }}
        />
      ) : null}
    </Modal>
  )
}
