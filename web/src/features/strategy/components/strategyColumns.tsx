import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { Button, Space, type TableColumnsType, Tag, Typography } from 'antd'
import {
  buyActionOptions,
  sellActionOptions,
} from '@/features/strategy/configs/strategyOptions.tsx'
import type { StrategyItem } from '@/features/strategy/types/strategy.ts'

const { Text } = Typography

const actionTagColors: Record<string, string> = {
  建仓: 'green',
  加仓: 'blue',
  激进1笔: 'volcano',
  减仓: 'orange',
  清仓: 'red',
  观察: 'processing',
}

const actionFilters = [
  ...buyActionOptions,
  ...sellActionOptions,
  { label: '观察', value: 'observe' },
].map((option) => ({
  text: option.label,
  value: option.label,
}))

const getActionLabels = (action: string) =>
  action
    .split('、')
    .map((label) => label.trim())
    .filter((label) => label && label !== '未配置')

type StrategyColumnsOptions = {
  removingStrategyId: string | null
  updatingStrategyId: string | null
  onEditStrategy: (strategy: StrategyItem) => void
  onRemoveStrategy: (strategyId: string) => void | Promise<void>
}

export const createStrategyColumns = ({
  removingStrategyId,
  updatingStrategyId,
  onEditStrategy,
  onRemoveStrategy,
}: StrategyColumnsOptions): TableColumnsType<StrategyItem> => [
  {
    title: '策略',
    dataIndex: 'name',
    width: 180,
  },
  {
    title: '条件',
    dataIndex: 'conditions',
    render: (conditions: string[]) => (
      <Space size={6} wrap>
        {conditions.map((condition) => (
          <Tag key={condition}>{condition}</Tag>
        ))}
      </Space>
    ),
  },
  {
    title: '操作',
    dataIndex: 'action',
    width: 140,
    filters: actionFilters,
    onFilter: (value, record) => getActionLabels(record.action).includes(String(value)),
    render: (action: string) => {
      const labels = getActionLabels(action)

      if (labels.length === 0) {
        return <Text type="secondary">{action || '--'}</Text>
      }

      return (
        <Space size={4} wrap>
          {labels.map((label) => (
            <Tag key={label} color={actionTagColors[label] ?? 'default'}>
              {label}
            </Tag>
          ))}
        </Space>
      )
    },
  },
  {
    title: '管理',
    key: 'manage',
    width: 156,
    render: (_: unknown, record: StrategyItem) => (
      <Space size={4}>
        <Button
          type="text"
          size="small"
          icon={<EditOutlined />}
          loading={updatingStrategyId === record.id}
          onClick={() => onEditStrategy(record)}
        >
          编辑
        </Button>
        <Button
          danger
          type="text"
          size="small"
          icon={<DeleteOutlined />}
          loading={removingStrategyId === record.id}
          onClick={() => {
            void onRemoveStrategy(record.id)
          }}
        >
          删除
        </Button>
      </Space>
    ),
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    width: 180,
    render: (value: string | null | undefined) => <Text type="secondary">{value ?? '--'}</Text>,
  },
]
