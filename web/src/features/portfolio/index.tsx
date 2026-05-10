import { usePortfolioTagDefinitions } from '@/features/Tag/hooks/usePortfolioTagDefinitions.ts'
import { useCallback, useState } from 'react'
import { Typography, message } from 'antd'
import { defaultGroupName, portfolioGroupParams } from './constants'
import { PortfolioFilterPanel, type PortfolioFilters } from './PortfolioFilterPanel'
import { PortfolioStocksTable } from './PortfolioStocksTable'
import type { GroupParams } from '../../types/portfolio'

const { Title } = Typography

type PortfolioViewProps = {
  groupName?: string
  groupParams?: GroupParams
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '获取标签配置失败'

export const PortfolioPage = ({
  groupName,
  groupParams = portfolioGroupParams,
}: PortfolioViewProps) => {
  const [messageApi, contextHolder] = message.useMessage()
  const [filters, setFilters] = useState<PortfolioFilters>({
    code: '',
    name: '',
    tag: '',
  })
  const title = groupName || (groupParams === portfolioGroupParams ? defaultGroupName : '行业')

  const handleTagDefinitionError = useCallback(
    (error: unknown) => {
      messageApi.error(getErrorMessage(error))
    },
    [messageApi],
  )

  const { tagDefinitions } = usePortfolioTagDefinitions({
    onError: handleTagDefinitionError,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {contextHolder}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          {title}
        </Title>
      </div>

      <PortfolioFilterPanel
        tagDefinitions={tagDefinitions}
        onSearch={setFilters}
        onReset={() => {
          setFilters({
            code: '',
            name: '',
            tag: '',
          })
        }}
      />

      <PortfolioStocksTable
        groupName={groupName}
        groupParams={groupParams}
        filters={filters}
        tagDefinitions={tagDefinitions}
      />
    </div>
  )
}
