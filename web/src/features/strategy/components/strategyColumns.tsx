import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { Button, Space, type TableColumnsType, Tag, Typography } from 'antd'
import type { StrategyItem } from '@/features/strategy/types/strategy.ts'

const { Text } = Typography

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
