import { message, Tabs, Typography } from 'antd'
import { useCallback, useRef, useState } from 'react'
import { createStrategy } from '../../services/strategyApi'
import { StrategyListTable, type StrategyListTableRef } from './components/StrategyListTable'
import { ConvergenceStrategyTab } from './components/tabs/ConvergenceStrategyTab'
import { TradeStrategyTab } from './components/tabs/TradeStrategyTab'
import { strategyCreateSuccessMessages } from './configs/strategyOptions'
import { strategyHeaderStyle, strategyPageStyle } from './styles/strategyStyles'
import type { StrategyCategory, StrategyDraft } from './types/strategy'

const { Text, Title } = Typography

const getErrorMessage = (error: unknown, fallbackMessage: string) =>
  error instanceof Error ? error.message : fallbackMessage

export const StrategyPage = () => {
  const [messageApi, contextHolder] = message.useMessage()
  const [creatingCategory, setCreatingCategory] = useState<StrategyCategory | null>(null)
  const tableRef = useRef<StrategyListTableRef | null>(null)
  const submitStrategy = useCallback(
    async (draft: StrategyDraft) => {
      setCreatingCategory(draft.category)
      try {
        await createStrategy(draft)
        tableRef?.current?.loadStrategies()
        messageApi.success(strategyCreateSuccessMessages[draft.category])
        return true
      } catch (error) {
        messageApi.error(getErrorMessage(error, '添加策略失败'))
        return false
      } finally {
        setCreatingCategory(null)
      }
    },
    [messageApi],
  )

  return (
    <div style={strategyPageStyle}>
      {contextHolder}

      <div style={strategyHeaderStyle}>
        <Title level={4} style={{ margin: 0 }}>
          策略配置
        </Title>
        <Text type="secondary">选择条件后添加为策略，下方展示已添加策略</Text>
      </div>

      <Tabs
        defaultActiveKey="trade"
        items={[
          {
            key: 'trade',
            label: '交易策略',
            children: (
              <TradeStrategyTab
                creating={creatingCategory === '交易'}
                onCreateStrategy={submitStrategy}
              />
            ),
          },
          {
            key: 'convergence',
            label: '均线粘合',
            children: (
              <ConvergenceStrategyTab
                creating={creatingCategory === '均线粘合'}
                onCreateStrategy={submitStrategy}
              />
            ),
          },
        ]}
      />

      <StrategyListTable customRef={tableRef} />
    </div>
  )
}
