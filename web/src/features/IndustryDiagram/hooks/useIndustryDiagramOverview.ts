import { useCallback, useEffect, useState } from 'react'
import { fetchStrategies } from '@/services/strategyApi'
import { fetchPortfolioGroups, fetchPortfolioStocks } from '@/services/portfolioApi'
import { getStrategyRules } from '@/features/strategy/utils/portfolioStrategySuggestions'
import type { StrategyRule } from '@/features/strategy/types/strategy'
import type { PortfolioStockItem } from '@/types/portfolio'
import { industryGroupParams } from '@/features/portfolio/constants'

type UseIndustryDiagramOverviewOptions = {
  onError?: (error: unknown) => void
}

export const useIndustryDiagramOverview = ({ onError }: UseIndustryDiagramOverviewOptions = {}) => {
  const [groupNames, setGroupNames] = useState<string[]>([])
  const [stocks, setStocks] = useState<PortfolioStockItem[]>([])
  const [strategyRules, setStrategyRules] = useState<StrategyRule[]>([])
  const [loading, setLoading] = useState(true)

  const loadOverview = useCallback(async () => {
    setLoading(true)
    try {
      const [nextGroupNames, nextStocks, strategies] = await Promise.all([
        fetchPortfolioGroups(industryGroupParams),
        fetchPortfolioStocks(industryGroupParams),
        fetchStrategies().catch(() => []),
      ])

      setGroupNames(nextGroupNames)
      setStocks(nextStocks)
      setStrategyRules(getStrategyRules(strategies))
      return {
        groupNames: nextGroupNames,
        stocks: nextStocks,
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.resolve().then(loadOverview).catch(onError)
  }, [loadOverview, onError])

  return {
    groupNames,
    stocks,
    strategyRules,
    loading,
    loadOverview,
  }
}
