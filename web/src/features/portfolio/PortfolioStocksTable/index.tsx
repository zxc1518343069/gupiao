import { AppstoreOutlined, TableOutlined } from '@ant-design/icons'
import { Button, Space, Table } from 'antd'
import { IndustryDiagramPanel } from '@/features/IndustryDiagram/components/IndustryDiagramPanel'
import { useState } from 'react'
import type { GroupParams, PortfolioTagDefinition } from '../../../types/portfolio'
import type { PortfolioFilters } from '../PortfolioFilterPanel'
import { IndustryEtfOverview } from '../IndustryEtfOverview'
import { industryGroupParams, maxIndustryGroupEtfCount, portfolioGroupParams } from '../constants'
import { PortfolioAddStockAction } from './components/PortfolioAddStockAction.tsx'
import { PortfolioAddEtfAction } from './components/PortfolioAddEtfAction.tsx'
import { usePortfolioStocksTable } from './hooks/usePortfolioStocksTable'
import { usePortfolioTableScroll } from './hooks/usePortfolioTableScroll'

type PortfolioStocksTableProps = {
  groupName?: string
  groupParams?: GroupParams
  filters: PortfolioFilters
  tagDefinitions: PortfolioTagDefinition[]
  onPortfolioDataChange?: () => void
}

export const PortfolioStocksTable = ({
  groupName,
  groupParams = portfolioGroupParams,
  filters,
  tagDefinitions,
  onPortfolioDataChange,
}: PortfolioStocksTableProps) => {
  const {
    contextHolder,
    emptyText,
    industryEtfItems,
    filteredPortfolioStocks,
    portfolioColumns,
    portfolioLoading,
    removePortfolioItem,
    refreshPortfolio,
    strategyRules,
  } = usePortfolioStocksTable({
    groupName,
    groupParams,
    filters,
    tagDefinitions,
    onPortfolioDataChange,
  })
  const isIndustryView = groupParams === industryGroupParams
  const [viewMode, setViewMode] = useState<'table' | 'diagram'>('table')
  const { tableContainerRef, tableScrollY } = usePortfolioTableScroll({
    columnCount: portfolioColumns.length,
    enabled: !isIndustryView || viewMode === 'table',
    rowCount: filteredPortfolioStocks.length,
  })
  const tableScrollX = isIndustryView ? 1680 : 1500
  const isEtfLimitReached =
    Boolean(groupName) && industryEtfItems.length >= maxIndustryGroupEtfCount

  return (
    <>
      {contextHolder}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {isIndustryView ? (
          <IndustryEtfOverview
            key={groupName || 'industry-overview'}
            groupName={groupName}
            items={industryEtfItems}
            onRemove={removePortfolioItem}
          />
        ) : null}
        <div style={{ marginBottom: '12px', flexShrink: 0 }}>
          <Space wrap>
            {isIndustryView ? (
              <PortfolioAddEtfAction
                disabled={isEtfLimitReached}
                groupName={groupName}
                groupParams={groupParams}
                onAdded={() => {
                  refreshPortfolio()
                  onPortfolioDataChange?.()
                }}
              />
            ) : null}
            <PortfolioAddStockAction
              groupName={groupName}
              groupParams={groupParams}
              onAdded={() => {
                refreshPortfolio()
                onPortfolioDataChange?.()
              }}
            />
            {isIndustryView ? (
              <Button
                icon={viewMode === 'diagram' ? <TableOutlined /> : <AppstoreOutlined />}
                onClick={() =>
                  setViewMode((currentMode) => (currentMode === 'diagram' ? 'table' : 'diagram'))
                }
              >
                {viewMode === 'diagram' ? '表格视图' : '图示化'}
              </Button>
            ) : null}
          </Space>
        </div>

        {isIndustryView && viewMode === 'diagram' ? (
          <IndustryDiagramPanel
            groupName={groupName}
            stocks={filteredPortfolioStocks}
            tagDefinitions={tagDefinitions}
            strategyRules={strategyRules}
          />
        ) : (
          <div ref={tableContainerRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <Table
              className="portfolio-table"
              columns={portfolioColumns}
              dataSource={filteredPortfolioStocks}
              rowKey="stock_code"
              loading={portfolioLoading}
              pagination={false}
              bordered
              size="small"
              locale={{ emptyText }}
              scroll={{ y: tableScrollY, x: tableScrollX }}
            />
          </div>
        )}
      </div>
    </>
  )
}
