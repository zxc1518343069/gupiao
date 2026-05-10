import { Tag, Typography } from 'antd'
import type { PortfolioStrategySuggestion } from '@/features/strategy/utils/portfolioStrategySuggestions'

const { Text } = Typography

const getTagColor = (tone: PortfolioStrategySuggestion['tone']) => {
  if (tone === 'buy') {
    return 'success'
  }
  if (tone === 'sell') {
    return 'error'
  }
  return 'processing'
}

const getTagLabelColor = (suggestion: PortfolioStrategySuggestion) => {
  if (suggestion.tone === 'convergence' && suggestion.badgeText === '下沿附近') {
    return 'gold'
  }
  if (suggestion.tone === 'convergence' && suggestion.badgeText === '上沿附近') {
    return 'purple'
  }
  return getTagColor(suggestion.tone)
}

type PortfolioOperationSuggestionCellProps = {
  suggestions: PortfolioStrategySuggestion[]
}

export const PortfolioOperationSuggestionCell = ({
  suggestions,
}: PortfolioOperationSuggestionCellProps) => {
  if (suggestions.length === 0) {
    return (
      <Text type="secondary" style={{ fontSize: 12 }}>
        --
      </Text>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, lineHeight: 1.45 }}>
      {suggestions.map((suggestion) => (
        <div
          key={suggestion.key}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}
        >
          <Tag
            color={getTagLabelColor(suggestion)}
            style={{ marginInlineEnd: 0, marginTop: 1, flexShrink: 0 }}
          >
            {suggestion.badgeText}
          </Tag>
          <Text strong style={{ fontSize: 12 }}>
            {suggestion.suggestionText}
          </Text>
        </div>
      ))}
    </div>
  )
}
