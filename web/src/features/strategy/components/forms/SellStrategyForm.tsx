import { PlusOutlined } from '@ant-design/icons'
import { Alert, Button, Checkbox, InputNumber, Space, Typography } from 'antd'
import {
  sellActionOptions,
  sellBreakdownOptions,
  volumeCheckboxOptions,
} from '../../configs/strategyOptions'
import { checkboxGroupStyle, panelGridStyle, tabContentStyle } from '../../styles/strategyStyles'
import type {
  SellAction,
  SellBreakdownPeriod,
  SellStrategyConfig,
  VolumeCondition,
} from '../../types/strategy'
import { StrategyConfigSection } from '../StrategyConfigSection'

const { Text } = Typography

type SellStrategyFormProps = {
  config: SellStrategyConfig
  validationErrors: string[]
  submitting: boolean
  submitText: string
  onConfigChange: <Key extends keyof SellStrategyConfig>(
    key: Key,
    value: SellStrategyConfig[Key],
  ) => void
  onSubmit: () => void
}

export const SellStrategyForm = ({
  config,
  validationErrors,
  submitting,
  submitText,
  onConfigChange,
  onSubmit,
}: SellStrategyFormProps) => (
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

      <StrategyConfigSection title="跌破" hint="多选为“或”逻辑">
        <Checkbox.Group
          options={sellBreakdownOptions}
          value={config.breakdownPeriods}
          style={checkboxGroupStyle}
          onChange={(values) =>
            onConfigChange('breakdownPeriods', values as SellBreakdownPeriod[])
          }
        />
      </StrategyConfigSection>

      <StrategyConfigSection title="跌破幅度" hint="按相对均线的跌破百分比判断，只有落在区间里才提示卖出">
        <Space wrap align="center" size={10}>
          <Text type="secondary">最小幅度</Text>
          <InputNumber
            min={0}
            max={99}
            step={0.1}
            addonAfter="%"
            value={config.breakdownMinBias}
            onChange={(value) => onConfigChange('breakdownMinBias', value ?? 0)}
            style={{ width: 128 }}
          />
          <Text type="secondary">最大幅度</Text>
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
      </StrategyConfigSection>

      <StrategyConfigSection title="操作" hint="多选为“或”逻辑">
        <Checkbox.Group
          options={sellActionOptions}
          value={config.actions}
          style={checkboxGroupStyle}
          onChange={(values) => onConfigChange('actions', values as SellAction[])}
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
        message="卖出策略配置不完整"
        description={validationErrors.join('；')}
      />
    ) : null}
  </Space>
)
