import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Empty, Popconfirm, Space, Table, Tag, Tooltip, Typography, message } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import {
  createPortfolioTagDefinition,
  deletePortfolioTagDefinition,
  fetchPortfolioTagOverview,
  updatePortfolioTagDefinition,
} from '@/services/portfolioApi'
import type {
  PortfolioTagDefinition,
  PortfolioTagOverview,
} from '@/types/portfolio'
import { formatStockCodeForDisplay } from '@/utils/formatters/stockCodeFormat'
import { PortfolioTagDefinitionModal, type PortfolioTagDefinitionDraft } from './PortfolioTagDefinitionModal'

const { Paragraph, Text } = Typography

type PortfolioTagManagementTabProps = {
  tagDefinitions: PortfolioTagDefinition[]
  tagDefinitionsLoading: boolean
  onDefinitionsChanged: () => Promise<unknown>
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '标签操作失败，请稍后重试'

export const PortfolioTagManagementTab = ({
  tagDefinitions,
  tagDefinitionsLoading,
  onDefinitionsChanged,
}: PortfolioTagManagementTabProps) => {
  const [messageApi, contextHolder] = message.useMessage()
  const [overview, setOverview] = useState<PortfolioTagOverview | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingDefinition, setEditingDefinition] = useState<PortfolioTagDefinition | null>(null)

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true)
    try {
      const data = await fetchPortfolioTagOverview()
      setOverview(data)
    } catch (error) {
      messageApi.error(getErrorMessage(error))
    } finally {
      setOverviewLoading(false)
    }
  }, [messageApi])

  useEffect(() => {
    void Promise.resolve().then(loadOverview)
  }, [loadOverview, tagDefinitions])

  const definitionRows = overview?.definitions ?? tagDefinitions
  const customTags = overview?.custom_tags ?? []
  const taggedStockCount = overview?.tagged_stock_count ?? 0
  const loading = tagDefinitionsLoading || overviewLoading

  const closeModal = () => {
    setIsCreateOpen(false)
    setEditingDefinition(null)
  }

  const submitDefinition = async (draft: PortfolioTagDefinitionDraft) => {
    setSubmitting(true)
    try {
      if (editingDefinition) {
        await updatePortfolioTagDefinition(editingDefinition.id, draft)
        messageApi.success('固定标签已更新')
      } else {
        await createPortfolioTagDefinition(draft)
        messageApi.success('固定标签已创建')
      }

      await onDefinitionsChanged()
      await loadOverview()
      closeModal()
    } catch (error) {
      messageApi.error(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = useCallback(
    async (definitionId: number) => {
      setDeletingId(definitionId)
      try {
        await deletePortfolioTagDefinition(definitionId)
        messageApi.success('固定标签已删除')
        await onDefinitionsChanged()
        await loadOverview()
      } catch (error) {
        messageApi.error(getErrorMessage(error))
      } finally {
        setDeletingId(null)
      }
    },
    [loadOverview, messageApi, onDefinitionsChanged],
  )

  const definitionColumns = useMemo(
    () => [
      {
        title: '固定标签',
        dataIndex: 'name',
        key: 'name',
        render: (_: string, definition: PortfolioTagDefinition) => (
          <Tag color={definition.color} style={{ marginInlineEnd: 0 }}>
            {definition.name}
          </Tag>
        ),
      },
      {
        title: '色值',
        dataIndex: 'color',
        key: 'color',
        width: 120,
        render: (color: string) => <Text code>{color}</Text>,
      },
      {
        title: '覆盖股票数',
        dataIndex: 'usage_count',
        key: 'usage_count',
        width: 116,
      },
      {
        title: '操作',
        key: 'action',
        width: 132,
        render: (_: unknown, definition: PortfolioTagDefinition) => (
          <Space size={4}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => setEditingDefinition(definition)}
            >
              编辑
            </Button>
            <Popconfirm
              title="删除这个固定标签？"
              description="删除后股票上的同名标签会保留，并转为自定义标签。"
              okText="删除"
              cancelText="取消"
              onConfirm={() => {
                void handleDelete(definition.id)
              }}
            >
              <Button
                danger
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                loading={deletingId === definition.id}
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [deletingId, handleDelete],
  )

  return (
    <>
      {contextHolder}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {[
            { label: '固定标签', value: definitionRows.length },
            { label: '自定义标签', value: customTags.length },
            { label: '已打标签股票', value: taggedStockCount },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                border: '1px solid #e5eef6',
                background: '#f8fbff',
              }}
            >
              <Text type="secondary">{item.label}</Text>
              <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700, color: '#1f1f1f' }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        <Card
          title="固定标签配置"
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateOpen(true)}>
              新增固定标签
            </Button>
          }
        >
          <Paragraph type="secondary" style={{ marginTop: 0 }}>
            固定标签会出现在股票标签编辑器里作为快捷选项，并保持全局统一颜色。
          </Paragraph>
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            loading={loading}
            columns={definitionColumns}
            dataSource={definitionRows}
            locale={{ emptyText: '暂无固定标签' }}
          />
        </Card>

        <Card title="自定义标签概览">
          {customTags.length > 0 ? (
            <Space size={[8, 10]} wrap>
              {customTags.map((tag) => (
                <Tooltip
                  key={tag.name}
                  title={
                    tag.stocks?.length
                      ? tag.stocks
                          .map(
                            (stock) =>
                              `${stock.stock_name}(${formatStockCodeForDisplay(stock.stock_code)})`,
                          )
                          .join('、')
                      : '暂无股票预览'
                  }
                >
                  <Tag style={{ paddingInline: 10, marginInlineEnd: 0 }}>
                    {tag.name} · {tag.usage_count}
                  </Tag>
                </Tooltip>
              ))}
            </Space>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前没有自定义标签" />
          )}
        </Card>
      </div>

      {isCreateOpen || editingDefinition ? (
        <PortfolioTagDefinitionModal
          key={editingDefinition?.id ?? 'create'}
          open
          title={editingDefinition ? '编辑固定标签' : '新增固定标签'}
          confirmText={editingDefinition ? '保存' : '创建'}
          submitting={submitting}
          initialValue={
            editingDefinition
              ? {
                  name: editingDefinition.name,
                  color: editingDefinition.color,
                }
              : null
          }
          onCancel={closeModal}
          onSubmit={submitDefinition}
        />
      ) : null}
    </>
  )
}
