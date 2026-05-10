import { useCallback } from 'react'
import { Spin, Typography, message } from 'antd'
import { usePortfolioTagDefinitions } from '@/features/Tag/hooks/usePortfolioTagDefinitions.ts'
import { IndustryDiagramPanel } from './components/IndustryDiagramPanel'
import { useIndustryDiagramOverview } from './hooks/useIndustryDiagramOverview'

const { Title } = Typography

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '获取图示化数据失败'

const IndustryDiagramPage = () => {
  const [messageApi, contextHolder] = message.useMessage()

  const handleError = useCallback(
    (error: unknown) => {
      messageApi.error(getErrorMessage(error))
    },
    [messageApi],
  )

  const { tagDefinitions } = usePortfolioTagDefinitions({
    onError: handleError,
  })
  const { groupNames, stocks, strategyRules, loading } = useIndustryDiagramOverview({
    onError: handleError,
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
          行业图示化
        </Title>
      </div>

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}
      >
        {loading ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.58)',
            }}
          >
            <Spin />
          </div>
        ) : null}
        <IndustryDiagramPanel
          groupNames={groupNames}
          stocks={stocks}
          tagDefinitions={tagDefinitions}
          strategyRules={strategyRules}
        />
      </div>
    </div>
  )
}

export default IndustryDiagramPage
