import { useCallback, useEffect, useMemo, useState } from 'react'
import { message } from 'antd'
import { fetchStrategies } from '@/services/strategyApi'
import type { StrategyRule } from '@/features/strategy/types/strategy'
import { getStrategyRules } from '@/features/strategy/utils/portfolioStrategySuggestions'
import { formatTradeDate } from '@/utils/formatters/dateFormat'
import {
  fetchPortfolioStocks,
  removePortfolioStock,
  updatePortfolioStockTags,
} from '../../../../services/portfolioApi'
import type { GroupParams, PortfolioStockItem, PortfolioTagDefinition } from '../../../../types/portfolio'
import { copyToClipboard } from '../../../../utils/copyToClipboard'
import { formatStockCodeForDisplay } from '../../../../utils/formatters/stockCodeFormat'
import type { PortfolioFilters } from '../../PortfolioFilterPanel'
import { createPortfolioColumns } from '../components/portfolioColumns.tsx'
import { industryGroupParams, portfolioGroupParams } from '../../constants'

type UsePortfolioStocksTableOptions = {
  groupName?: string
  groupParams?: GroupParams
  filters: PortfolioFilters
  tagDefinitions: PortfolioTagDefinition[]
  onPortfolioDataChange?: () => void
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '操作失败，请稍后重试'

export const usePortfolioStocksTable = ({
  groupName,
  groupParams = portfolioGroupParams,
  filters,
  tagDefinitions,
  onPortfolioDataChange,
}: UsePortfolioStocksTableOptions) => {
  const [messageApi, contextHolder] = message.useMessage()
  const [portfolioStocks, setPortfolioStocks] = useState<PortfolioStockItem[]>([])
  const [industryEtfItems, setIndustryEtfItems] = useState<PortfolioStockItem[]>([])
  const [strategyRules, setStrategyRules] = useState<StrategyRule[]>([])
  const [portfolioLoading, setPortfolioLoading] = useState(true)
  const shouldLoadIndustryEtfs = groupParams === industryGroupParams && Boolean(groupName)

  const loadPortfolio = useCallback(async () => {
    setPortfolioLoading(true)

    try {
      const [stockData, etfData, strategies] = await Promise.all([
        fetchPortfolioStocks(groupParams, groupName, 'stock'),
        shouldLoadIndustryEtfs
          ? fetchPortfolioStocks(groupParams, groupName, 'etf')
          : Promise.resolve([]),
        fetchStrategies().catch(() => []),
      ])
      setPortfolioStocks(stockData)
      setIndustryEtfItems(etfData)
      setStrategyRules(getStrategyRules(strategies))
      return { stockData, etfData }
    } finally {
      setPortfolioLoading(false)
    }
  }, [groupName, groupParams, shouldLoadIndustryEtfs])

  const showError = useCallback(
    (error: unknown) => {
      messageApi.error(getErrorMessage(error))
    },
    [messageApi],
  )

  useEffect(() => {
    Promise.resolve().then(loadPortfolio).catch(showError)
  }, [loadPortfolio, showError])

  const refreshPortfolio = useCallback(() => {
    loadPortfolio().catch(showError)
  }, [loadPortfolio, showError])

  const handleCopyStockCode = useCallback(
    async (stockCode: string) => {
      const displayStockCode = formatStockCodeForDisplay(stockCode)

      try {
        await copyToClipboard(displayStockCode)
        messageApi.success(`已复制代码 ${displayStockCode}`)
      } catch {
        messageApi.error('复制失败，请检查浏览器权限')
      }
    },
    [messageApi],
  )

  const handleRemoveStock = useCallback(
    async (stockCode: string) => {
      try {
        await removePortfolioStock(stockCode, groupParams, groupName)
        messageApi.success('移除成功')
        await loadPortfolio()
        onPortfolioDataChange?.()
      } catch (error) {
        showError(error)
      }
    },
    [groupName, groupParams, loadPortfolio, messageApi, onPortfolioDataChange, showError],
  )

  const handleUpdateTags = useCallback(
    async (stockCode: string, tags: string[]) => {
      const previousStock = portfolioStocks.find((item) => item.stock_code === stockCode)
      if (!previousStock) {
        return
      }

      setPortfolioStocks((currentStocks) =>
        currentStocks.map((item) => (item.stock_code === stockCode ? { ...item, tags } : item)),
      )

      try {
        const updatedStock = await updatePortfolioStockTags(stockCode, tags, groupParams)
        setPortfolioStocks((currentStocks) =>
          currentStocks.map((item) => (item.stock_code === stockCode ? updatedStock : item)),
        )
        onPortfolioDataChange?.()
      } catch (error) {
        setPortfolioStocks((currentStocks) =>
          currentStocks.map((item) => (item.stock_code === stockCode ? previousStock : item)),
        )

        showError(error)
        throw error
      }
    },
    [groupParams, onPortfolioDataChange, portfolioStocks, showError],
  )

  const filteredPortfolioStocks = useMemo(() => {
    // 分组上下文已经由服务端过滤，这里只保留前端搜索筛选。
    return portfolioStocks.filter((item) => {
      const matchesCode = !filters.code || item.stock_code.includes(filters.code)
      const matchesName = !filters.name || item.stock_name.includes(filters.name)
      const matchesTag = !filters.tag || (item.tags ?? []).some((tag) => tag.includes(filters.tag))

      return matchesCode && matchesName && matchesTag
    })
  }, [filters, portfolioStocks])

  const latestPriceDateLabel = useMemo(() => {
    const latestTradeDate = filteredPortfolioStocks
      .map((item) => item.latest_price_date)
      .filter((value): value is string => Boolean(value))
      .reduce<string | null>((currentLatest, value) => {
        if (!currentLatest) {
          return value
        }

        return value > currentLatest ? value : currentLatest
      }, null)

    return latestTradeDate ? formatTradeDate(latestTradeDate) : null
  }, [filteredPortfolioStocks])

  const portfolioColumns = useMemo(
    () =>
      createPortfolioColumns({
        onCopyStockCode: handleCopyStockCode,
        onRemoveStock: handleRemoveStock,
        onUpdateTags: handleUpdateTags,
        tagDefinitions,
        latestPriceDateLabel,
        showGroupColumn: !groupName,
        showPitchColumn: groupParams === industryGroupParams,
        groupParams,
        strategyRules,
      }),
    [
      groupName,
      groupParams,
      handleCopyStockCode,
      handleRemoveStock,
      handleUpdateTags,
      latestPriceDateLabel,
      strategyRules,
      tagDefinitions,
    ],
  )

  return {
    contextHolder,
    emptyText: groupName ? '当前分组暂无股票' : '暂无股票',
    industryEtfItems,
    portfolioStocks,
    filteredPortfolioStocks,
    portfolioColumns,
    portfolioLoading,
    removePortfolioItem: handleRemoveStock,
    refreshPortfolio,
    strategyRules,
  }
}
