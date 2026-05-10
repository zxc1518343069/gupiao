import { useCallback } from 'react'
import { Typography, message } from 'antd'
import { PortfolioTagManagementTab } from './components/PortfolioTagManagementTab'
import { usePortfolioTagDefinitions } from './hooks/usePortfolioTagDefinitions'

const { Title } = Typography

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '获取标签配置失败'

 const Tag = () => {
  const [messageApi, contextHolder] = message.useMessage()

  const handleTagDefinitionError = useCallback(
    (error: unknown) => {
      messageApi.error(getErrorMessage(error))
    },
    [messageApi],
  )

  const { tagDefinitions, tagDefinitionsLoading, loadTagDefinitions } = usePortfolioTagDefinitions({
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
          标签管理
        </Title>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <PortfolioTagManagementTab
          tagDefinitions={tagDefinitions}
          tagDefinitionsLoading={tagDefinitionsLoading}
          onDefinitionsChanged={loadTagDefinitions}
        />
      </div>
    </div>
  )
}

export default Tag