import { PlusOutlined } from '@ant-design/icons'
import { Alert, Button, Checkbox, InputNumber, Radio, Space, Typography } from 'antd'
import {
  buyActionOptions,
  movingAverageOptions,
  pricePatternOptions,
  volumeCheckboxOptions,
} from '../../configs/strategyOptions'
import { checkboxGroupStyle, panelGridStyle, tabContentStyle } from '../../styles/strategyStyles'
import type {
  BuyAction,
  BuyStrategyConfig,
  MovingAveragePeriod,
  PricePattern,
  VolumeCondition,
} from '../../types/strategy'
import { StrategyConfigSection } from '../StrategyConfigSection'

const { Text } = Typography

type BuyStrategyFormProps = {
  config: BuyStrategyConfig
  validationErrors: string[]
  submitting: boolean
  submitText: string
  onConfigChange: <Key extends keyof BuyStrategyConfig>(
    key: Key,
    value: BuyStrategyConfig[Key],
  ) => void
  onSubmit: () => void
}

export const BuyStrategyForm = ({
  config,
  validationErrors,
  submitting,
  submitText,
  onConfigChange,
  onSubmit,
}: BuyStrategyFormProps) => {
  const thresholdHint =
    config.pricePattern === 'breakout'
      ? '以最新价相对所选均线的超出比例判断，命中区间才展示买入建议'
      : config.pricePattern === 'pullback'
        ? '以最新价相对所选均线的偏离率判断，支持配置正负区间'
        : '先选择价格形态，再配置对应的价格区间'

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

        <StrategyConfigSection title="价格形态" hint="单选；当前先按突破 / 回踩承载，名称后续可以再换">
          <Radio.Group
            options={pricePatternOptions}
            value={config.pricePattern}
            style={checkboxGroupStyle}
            onChange={(event) => onConfigChange('pricePattern', event.target.value as PricePattern)}
          />
        </StrategyConfigSection>

        <StrategyConfigSection title="均线" hint="多选为“或”逻辑">
          <Checkbox.Group
            options={movingAverageOptions}
            value={config.movingAverages}
            style={checkboxGroupStyle}
            onChange={(values) => onConfigChange('movingAverages', values as MovingAveragePeriod[])}
          />
        </StrategyConfigSection>

        <StrategyConfigSection title="形态阈值" hint={thresholdHint}>
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

          {!config.pricePattern ? <Text type="secondary">选择形态后显示对应阈值配置。</Text> : null}
        </StrategyConfigSection>

        <StrategyConfigSection title="操作" hint="多选为“或”逻辑">
          <Checkbox.Group
            options={buyActionOptions}
            value={config.actions}
            style={checkboxGroupStyle}
            onChange={(values) => onConfigChange('actions', values as BuyAction[])}
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
          message="买入策略配置不完整"
          description={validationErrors.join('；')}
        />
      ) : null}
    </Space>
  )
}
