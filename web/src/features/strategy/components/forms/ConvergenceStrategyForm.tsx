import { PlusOutlined } from '@ant-design/icons'
import { Button, Checkbox, InputNumber, Slider, Space } from 'antd'
import {
  movingAverageOptions,
} from '../../configs/strategyOptions'
import {
  checkboxGroupStyle,
  panelGridStyle,
  sliderFieldStyle,
  tabContentStyle,
} from '../../styles/strategyStyles'
import type { ConvergenceConfig, MovingAveragePeriod } from '../../types/strategy'
import { canSubmitConvergenceStrategy } from '../../validators/strategyValidators'
import { StrategyConfigSection } from '../StrategyConfigSection'

type ConvergenceStrategyFormProps = {
  config: ConvergenceConfig
  submitting: boolean
  submitText: string
  onConfigChange: <Key extends keyof ConvergenceConfig>(
    key: Key,
    value: ConvergenceConfig[Key],
  ) => void
  onSubmit: () => void
}

export const ConvergenceStrategyForm = ({
  config,
  submitting,
  submitText,
  onConfigChange,
  onSubmit,
}: ConvergenceStrategyFormProps) => {
  const canSubmit = canSubmitConvergenceStrategy(config)

  return (
    <Space direction="vertical" size={14} style={tabContentStyle}>
      <div style={panelGridStyle}>
        <StrategyConfigSection title="参与均线" hint="支持添加多条不同均线组合的粘合策略">
          <Checkbox.Group
            options={movingAverageOptions}
            value={config.movingAverages}
            style={checkboxGroupStyle}
            onChange={(values) =>
              onConfigChange('movingAverages', values as MovingAveragePeriod[])
            }
          />
        </StrategyConfigSection>

        <StrategyConfigSection title="区间比例" hint="最高均线与最低均线的距离阈值">
          <Space.Compact block>
            <div style={sliderFieldStyle}>
              <Slider
                min={0.5}
                max={10}
                step={0.1}
                value={config.maxSpreadRatio}
                onChange={(value) =>
                  onConfigChange('maxSpreadRatio', Array.isArray(value) ? value[0] : value)
                }
              />
            </div>
            <InputNumber
              min={0.5}
              max={10}
              step={0.1}
              addonAfter="%"
              value={config.maxSpreadRatio}
              onChange={(value) => onConfigChange('maxSpreadRatio', value ?? 0.5)}
              style={{ width: 118 }}
            />
          </Space.Compact>
        </StrategyConfigSection>

        <StrategyConfigSection title="附近阈值" hint="最新价距离粘合区上沿/下沿的判定范围">
          <Space.Compact block>
            <div style={sliderFieldStyle}>
              <Slider
                min={0.2}
                max={5}
                step={0.1}
                value={config.nearPriceRatio}
                onChange={(value) =>
                  onConfigChange('nearPriceRatio', Array.isArray(value) ? value[0] : value)
                }
              />
            </div>
            <InputNumber
              min={0.2}
              max={5}
              step={0.1}
              addonAfter="%"
              value={config.nearPriceRatio}
              onChange={(value) => onConfigChange('nearPriceRatio', value ?? 1)}
              style={{ width: 118 }}
            />
          </Space.Compact>
        </StrategyConfigSection>
      </div>

      <Button
        type="primary"
        icon={<PlusOutlined />}
        disabled={!canSubmit}
        loading={submitting}
        onClick={onSubmit}
      >
        {submitText}
      </Button>
    </Space>
  )
}
