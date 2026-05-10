import { resolvePortfolioTagColor } from '@/features/Tag/tagPalette.ts'
import type { PortfolioStrategySuggestion } from '@/features/strategy/utils/portfolioStrategySuggestions'
import { evaluatePortfolioStrategySuggestions } from '@/features/strategy/utils/portfolioStrategySuggestions'
import type { StrategyRule } from '@/features/strategy/types/strategy'
import type { PortfolioStockItem, PortfolioTagDefinition } from '@/types/portfolio'
import { formatStockCodeForDisplay } from '@/utils/formatters/stockCodeFormat'
import type { DiagramNode } from '../types'

const unassignedTagName = '暂无分配'
const emptySuggestionText = '暂无建议'
const rootLabel = '行业'

type BuildIndustryDiagramTreeOptions = {
  groupName?: string
  stocks: PortfolioStockItem[]
  tagDefinitions: PortfolioTagDefinition[]
  strategyRules: StrategyRule[]
}

type BuildIndustryOverviewDiagramTreeOptions = Omit<
  BuildIndustryDiagramTreeOptions,
  'groupName'
> & {
  groupNames: string[]
}

const normalizeTags = (tags?: string[] | null) => {
  const seenTags = new Set<string>()
  const normalizedTags = (tags ?? [])
    .map((tagName) => tagName.trim())
    .filter((tagName) => {
      if (!tagName || seenTags.has(tagName)) {
        return false
      }

      seenTags.add(tagName)
      return true
    })

  return normalizedTags.length > 0 ? normalizedTags : [unassignedTagName]
}

const compareByChineseName = (first: string, second: string) => first.localeCompare(second, 'zh-CN')

const getSuggestionText = (suggestions: PortfolioStrategySuggestion[]) => {
  if (suggestions.length === 0) {
    return emptySuggestionText
  }

  return suggestions
    .map((suggestion) => `${suggestion.badgeText} ${suggestion.suggestionText}`)
    .join(' / ')
}

const createSafeNodeId = (...parts: string[]) =>
  parts.map((part) => encodeURIComponent(part || 'empty')).join('__')

const createStockNode = (
  stock: PortfolioStockItem,
  strategyRules: StrategyRule[],
  scopeId: string,
  tagName: string,
): DiagramNode => {
  const suggestions = evaluatePortfolioStrategySuggestions({
    latestPrice: stock.latest_price,
    metrics: stock.ma_metrics,
    volumeMeta: stock.volume_meta,
    rules: strategyRules,
  })

  return {
    id: createSafeNodeId('stock', scopeId, tagName, stock.stock_code),
    label: `${stock.stock_name} ${formatStockCodeForDisplay(stock.stock_code)}`,
    caption: getSuggestionText(suggestions),
    badge: suggestions.length > 0 ? '建议' : undefined,
    tone: 'stock',
  }
}

const buildTagNodes = (
  stocks: PortfolioStockItem[],
  tagDefinitions: PortfolioTagDefinition[],
  strategyRules: StrategyRule[],
  scopeId: string,
) => {
  const stocksByTag = stocks.reduce<Map<string, PortfolioStockItem[]>>((currentMap, stock) => {
    normalizeTags(stock.tags).forEach((tagName) => {
      const currentStocks = currentMap.get(tagName) ?? []
      currentStocks.push(stock)
      currentMap.set(tagName, currentStocks)
    })

    return currentMap
  }, new Map<string, PortfolioStockItem[]>())

  return Array.from(stocksByTag.entries())
    .sort(([firstTagName], [secondTagName]) => {
      if (firstTagName === unassignedTagName) {
        return 1
      }
      if (secondTagName === unassignedTagName) {
        return -1
      }

      return compareByChineseName(firstTagName, secondTagName)
    })
    .map<DiagramNode>(([tagName, tagStocks]) => ({
      id: createSafeNodeId('tag', scopeId, tagName),
      label: tagName,
      badge: `${tagStocks.length}`,
      color:
        tagName === unassignedTagName
          ? '#8c8c8c'
          : resolvePortfolioTagColor(tagName, tagDefinitions),
      tone: tagName === unassignedTagName ? 'empty' : 'tag',
      children: tagStocks
        .slice()
        .sort((first, second) => compareByChineseName(first.stock_name, second.stock_name))
        .map((stock) => createStockNode(stock, strategyRules, scopeId, tagName)),
    }))
}

const buildEmptyStockNode = (groupName: string): DiagramNode => ({
  id: createSafeNodeId('empty-stock', groupName),
  label: '暂无股票',
  caption: emptySuggestionText,
  tone: 'empty',
})

const buildIndustryGroupNode = ({
  groupName,
  stocks,
  tagDefinitions,
  strategyRules,
}: BuildIndustryDiagramTreeOptions & { groupName: string }): DiagramNode => {
  const scopeId = groupName || 'all'
  const tagNodes = buildTagNodes(stocks, tagDefinitions, strategyRules, scopeId)

  return {
    id: createSafeNodeId('industry-group', scopeId),
    label: groupName || '全部行业',
    badge: `${stocks.length}`,
    tone: 'group',
    children: tagNodes.length > 0 ? tagNodes : [buildEmptyStockNode(scopeId)],
  }
}

export const buildIndustryDiagramTree = ({
  groupName,
  stocks,
  tagDefinitions,
  strategyRules,
}: BuildIndustryDiagramTreeOptions): DiagramNode => {
  return {
    id: 'industry-root',
    label: rootLabel,
    badge: `${stocks.length}`,
    tone: 'root',
    children: [
      buildIndustryGroupNode({
        groupName: groupName || '全部行业',
        stocks,
        tagDefinitions,
        strategyRules,
      }),
    ],
  }
}

const getIndustryGroupNames = (stock: PortfolioStockItem) =>
  stock.group_names?.length
    ? stock.group_names
    : stock.industry_group_names?.length
      ? stock.industry_group_names
      : stock.industry_group_name
        ? [stock.industry_group_name]
        : []

export const buildIndustryOverviewDiagramTree = ({
  groupNames,
  stocks,
  tagDefinitions,
  strategyRules,
}: BuildIndustryOverviewDiagramTreeOptions): DiagramNode => {
  const uniqueGroupNames = Array.from(new Set(groupNames)).sort(compareByChineseName)

  const groupNodes = uniqueGroupNames.map((groupName) => {
    const groupStocks = stocks.filter((stock) => getIndustryGroupNames(stock).includes(groupName))

    return buildIndustryGroupNode({
      groupName,
      stocks: groupStocks,
      tagDefinitions,
      strategyRules,
    })
  })

  return {
    id: 'industry-root',
    label: rootLabel,
    badge: `${uniqueGroupNames.length}`,
    tone: 'root',
    children: groupNodes,
  }
}
