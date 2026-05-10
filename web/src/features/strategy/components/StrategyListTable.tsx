import { deleteStrategy, fetchStrategies, updateStrategy } from '@/services/strategyApi.ts'
import { Empty, message, Table, Typography } from 'antd'
import { type Ref, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { createStrategyColumns } from './strategyColumns.tsx'
import { strategyListHeaderStyle, strategyListStyle } from '../styles/strategyStyles'
import type { StrategyDraft, StrategyItem } from '../types/strategy'
import { StrategyEditModal } from './StrategyEditModal'

const { Text, Title } = Typography

const getErrorMessage = (error: unknown, fallbackMessage: string) =>
  error instanceof Error ? error.message : fallbackMessage

export interface StrategyListTableRef {
  loadStrategies: () => Promise<StrategyItem[]>
}

export interface StrategyListTableProps {
  customRef: Ref<StrategyListTableRef>
}

export const StrategyListTable = ({ customRef }: StrategyListTableProps) => {
  const [strategies, setStrategies] = useState<StrategyItem[]>([])
  const [strategiesLoading, setStrategiesLoading] = useState(true)
  const [removingStrategyId, setRemovingStrategyId] = useState<string | null>(null)
  const [updatingStrategyId, setUpdatingStrategyId] = useState<string | null>(null)
  const [editingStrategy, setEditingStrategy] = useState<StrategyItem | null>(null)
  const [messageApi, contextHolder] = message.useMessage()

  const loadStrategies = useCallback(async () => {
    setStrategiesLoading(true)
    try {
      const data = await fetchStrategies()
      setStrategies(data)
      return data
    } finally {
      setStrategiesLoading(false)
    }
  },[])

  useImperativeHandle(customRef, () => ({
    loadStrategies,
  }))

  useEffect(() => {
    Promise.resolve()
      .then(loadStrategies)
      .catch((error: unknown) => {
        messageApi.error(getErrorMessage(error, '获取策略列表失败'))
      })
  }, [loadStrategies, messageApi])

  const onRemoveStrategy = useCallback(
    async (strategyId: string) => {
      setRemovingStrategyId(strategyId)
      try {
        await deleteStrategy(strategyId)
        setStrategies((current) => current.filter((strategy) => strategy.id !== strategyId))
        messageApi.success('删除成功')
      } catch (error) {
        messageApi.error(getErrorMessage(error, '删除策略失败'))
      } finally {
        setRemovingStrategyId(null)
      }
    },
    [messageApi],
  )

  const onEditStrategy = useCallback((strategy: StrategyItem) => {
    setEditingStrategy(strategy)
  }, [])

  const onCloseEditModal = useCallback(() => {
    setEditingStrategy(null)
  }, [])

  const onUpdateStrategy = useCallback(
    async (strategyId: string, draft: StrategyDraft) => {
      setUpdatingStrategyId(strategyId)
      try {
        const updatedStrategy = await updateStrategy(strategyId, draft)
        setStrategies((current) =>
          current.map((strategy) => (strategy.id === strategyId ? updatedStrategy : strategy)),
        )
        messageApi.success('编辑成功')
        return true
      } catch (error) {
        messageApi.error(getErrorMessage(error, '编辑策略失败'))
        return false
      } finally {
        setUpdatingStrategyId(null)
      }
    },
    [messageApi],
  )

  const strategyColumns = useMemo(
    () =>
      createStrategyColumns({
        removingStrategyId,
        updatingStrategyId,
        onEditStrategy,
        onRemoveStrategy,
      }),
    [onEditStrategy, onRemoveStrategy, removingStrategyId, updatingStrategyId],
  )

  return (
    <div style={strategyListStyle}>
      {contextHolder}
      <div style={strategyListHeaderStyle}>
        <Title level={5} style={{ margin: 0 }}>
          已添加策略
        </Title>
        <Text type="secondary">共 {strategies.length} 条</Text>
      </div>
      <Table
        loading={strategiesLoading}
        columns={strategyColumns}
        dataSource={strategies}
        rowKey="id"
        pagination={false}
        bordered
        size="middle"
        locale={{
          emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无策略" />,
        }}
        scroll={{ x: 'max-content' }}
      />
      <StrategyEditModal
        open={Boolean(editingStrategy)}
        strategy={editingStrategy}
        updating={Boolean(editingStrategy) && updatingStrategyId === editingStrategy?.id}
        onCancel={onCloseEditModal}
        onUpdateStrategy={onUpdateStrategy}
      />
    </div>
  )
}
