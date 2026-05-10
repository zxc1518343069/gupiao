import { PlusOutlined } from '@ant-design/icons'
import { Alert, Button, Checkbox, InputNumber, Radio, Space, Typography } from 'antd'
import {
  getTradeActionValuesForPattern,
  getTradeMovingAverageValuesForPattern,
  movingAverageOptions,
  pricePatternOptions,
  tradeActionOptions,
  volumeCheckboxOptions,
} from '../../configs/strategyOptions'
import { checkboxGroupStyle, panelGridStyle, tabContentStyle } from '../../styles/strategyStyles'
import type {
  MovingAveragePeriod,
  PricePattern,
  TradeAction,
  TradeStrategyConfig,
  VolumeCondition,
} from '../../types/strategy'
import { StrategyConfigSection } from '../StrategyConfigSection'

const { Text } = Typography

type TradeStrategyFormProps = {
  config: TradeStrategyConfig
  validationErrors: string[]
  submitting: boolean
  submitText: string
  onConfigChange: <Key extends keyof TradeStrategyConfig>(
    key: Key,
    value: TradeStrategyConfig[Key],
  ) => void
  onSubmit: () => void
}

const getThresholdHint = (pattern: PricePattern | null) => {
  if (pattern === 'breakout') {
    return '价格位于目标均线上方，且 MA5 / MA10 至少有一条仍在目标均线下方'
  }
  if (pattern === 'pullback') {
    return '价格回到目标均线附近，且 MA5 和 MA10 都仍在目标均线上方'
  }
  if (pattern === 'breakdown') {
    return '价格跌破目标均线后，按跌破幅度区间决定是否提示减仓或清仓'
  }
  return '先选择价格形态，再配置对应的形态阈值'
}

export const TradeStrategyForm = ({
  config,
  validationErrors,
  submitting,
  submitText,
  onConfigChange,
  onSubmit,
}: TradeStrategyFormProps) => {
  const allowedMovingAverageValues = new Set(getTradeMovingAverageValuesForPattern(config.pricePattern))
  const allowedActionValues = new Set(getTradeActionValuesForPattern(config.pricePattern))
  const movingAverageChoices = movingAverageOptions.filter((option) =>
    allowedMovingAverageValues.has(option.value),
  )
  const actionChoices = tradeActionOptions.filter((option) => allowedActionValues.has(option.value))

  return (
    <Space direction="vertical" size={14} style={tabContentStyle}>
      <div style={panelGridStyle}>
        <StrategyConfigSection
          title="量配置"
          hint="多选为“或”逻辑；量比 = 当日成交量 / 前 5 日平均成交量"
        >
          <Checkbox.Group
            options={volumeCheckboxOptions}
            value={config.volume}
            style={checkboxGroupStyle}
            onChange={(values) => onConfigChange('volume', values as VolumeCondition[])}
          />
        </StrategyConfigSection>

        <StrategyConfigSection title="价格形态" hint="统一承载突破、回踩、跌破三类交易策略">
          <Radio.Group
            options={pricePatternOptions}
            value={config.pricePattern}
            style={checkboxGroupStyle}
            onChange={(event) => onConfigChange('pricePattern', event.target.value as PricePattern)}
          />
        </StrategyConfigSection>

        <StrategyConfigSection title="均线" hint="根据所选形态自动切换可选均线范围">
          <Checkbox.Group
            options={movingAverageChoices}
            value={config.movingAverages}
            style={checkboxGroupStyle}
            onChange={(values) => onConfigChange('movingAverages', values as MovingAveragePeriod[])}
          />
        </StrategyConfigSection>

        <StrategyConfigSection title="形态阈值" hint={getThresholdHint(config.pricePattern)}>
          {config.pricePattern === 'breakout' ? (
            <Space wrap align="center" size={10}>
              <Text type="secondary">最小超出</Text>
              <InputNumber
                min={0}
                max={99}
                step={0.1}
                addonAfter="%"
                value={config.breakoutMinBias}
                onChange={(value) => onConfigChange('breakoutMinBias', value ?? 0)}
                style={{ width: 128 }}
              />
              <Text type="secondary">最大超出</Text>
              <InputNumber
                min={0.1}
                max={99}
                step={0.1}
                addonAfter="%"
                value={config.breakoutMaxBias}
                onChange={(value) => onConfigChange('breakoutMaxBias', value ?? 0.1)}
                style={{ width: 128 }}
              />
            </Space>
          ) : null}

          {config.pricePattern === 'pullback' ? (
            <Space wrap align="center" size={10}>
              <Text type="secondary">区间下限</Text>
              <InputNumber
                min={-99}
                max={99}
                step={0.1}
                addonAfter="%"
                value={config.pullbackMinBias}
                onChange={(value) => onConfigChange('pullbackMinBias', value ?? 0)}
                style={{ width: 128 }}
              />
              <Text type="secondary">区间上限</Text>
              <InputNumber
                min={-99}
                max={99}
                step={0.1}
                addonAfter="%"
                value={config.pullbackMaxBias}
                onChange={(value) => onConfigChange('pullbackMaxBias', value ?? 0)}
                style={{ width: 128 }}
              />
            </Space>
          ) : null}

          {config.pricePattern === 'breakdown' ? (
            <Space wrap align="center" size={10}>
              <Text type="secondary">最小跌破</Text>
              <InputNumber
                min={0}
                max={99}
                step={0.1}
                addonAfter="%"
                value={config.breakdownMinBias}
                onChange={(value) => onConfigChange('breakdownMinBias', value ?? 0)}
                style={{ width: 128 }}
              />
              <Text type="secondary">最大跌破</Text>
              <InputNumber
                min={0.1}
                max={99}
                step={0.1}
                addonAfter="%"
                value={config.breakdownMaxBias}
                onChange={(value) => onConfigChange('breakdownMaxBias', value ?? 0.1)}
                style={{ width: 128 }}
              />
            </Space>
          ) : null}

          {!config.pricePattern ? <Text type="secondary">选择形态后显示对应阈值配置。</Text> : null}
        </StrategyConfigSection>

        <StrategyConfigSection title="操作" hint="根据形态自动切换可选动作，避免混用买入与卖出方向">
          <Checkbox.Group
            options={actionChoices}
            value={config.actions}
            style={checkboxGroupStyle}
            onChange={(values) => onConfigChange('actions', values as TradeAction[])}
          />
        </StrategyConfigSection>
      </div>

      <Button
        type="primary"
        icon={<PlusOutlined />}
        loading={submitting}
        onClick={onSubmit}
      >
        {submitText}
      </Button>

      {validationErrors.length > 0 ? (
        <Alert
          type="error"
          showIcon
          message="交易策略配置不完整"
          description={validationErrors.join('；')}
        />
      ) : null}
    </Space>
  )
}
