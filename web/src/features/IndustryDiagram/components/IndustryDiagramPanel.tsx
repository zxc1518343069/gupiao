import { useMemo } from 'react'
import { Empty, Typography } from 'antd'
import type { StrategyRule } from '@/features/strategy/types/strategy'
import type { PortfolioStockItem, PortfolioTagDefinition } from '@/types/portfolio'
import {
  buildIndustryDiagramTree,
  buildIndustryOverviewDiagramTree,
} from '../utils/buildIndustryDiagramTree'
import { IndustryDiagramMindMap } from './IndustryDiagramMindMap'

const { Text } = Typography

type IndustryDiagramPanelProps = {
  groupName?: string
  groupNames?: string[]
  stocks: PortfolioStockItem[]
  tagDefinitions: PortfolioTagDefinition[]
  strategyRules: StrategyRule[]
}

export const IndustryDiagramPanel = ({
  groupName,
  groupNames,
  stocks,
  tagDefinitions,
  strategyRules,
}: IndustryDiagramPanelProps) => {
  const isOverview = Boolean(groupNames)
  const tree = useMemo(() => {
    if (groupNames) {
      return groupNames.length > 0
        ? buildIndustryOverviewDiagramTree({
            groupNames,
            stocks,
            tagDefinitions,
            strategyRules,
          })
        : null
    }

    return stocks.length > 0
      ? buildIndustryDiagramTree({
          groupName,
          stocks,
          tagDefinitions,
          strategyRules,
        })
      : null
  }, [groupName, groupNames, stocks, strategyRules, tagDefinitions])

  if (!tree) {
    return (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #e6edf5',
          borderRadius: 8,
          background: '#ffffff',
        }}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={isOverview ? '暂无行业分组可图示化' : '当前行业暂无股票可图示化'}
        />
      </div>
    )
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #e6edf5',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#ffffff',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          minHeight: 48,
          padding: '10px 14px',
          borderBottom: '1px solid #edf2f7',
          flexShrink: 0,
        }}
      >
        <Text strong>图示化</Text>
        <Text type="secondary">未设置标签进入“暂无分配”，无操作建议显示“暂无建议”</Text>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <IndustryDiagramMindMap tree={tree} />
      </div>
    </div>
  )
}
