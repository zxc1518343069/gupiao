import { useCallback, useEffect, useState } from 'react'
import { fetchPortfolioTagDefinitions } from '@/services/portfolioApi'
import type { PortfolioTagDefinition } from '@/types/portfolio'

type UsePortfolioTagDefinitionsOptions = {
  onError?: (error: unknown) => void
}

export const usePortfolioTagDefinitions = ({
  onError,
}: UsePortfolioTagDefinitionsOptions = {}) => {
  const [tagDefinitions, setTagDefinitions] = useState<PortfolioTagDefinition[]>([])
  const [tagDefinitionsLoading, setTagDefinitionsLoading] = useState(true)

  const loadTagDefinitions = useCallback(async () => {
    setTagDefinitionsLoading(true)
    try {
      const data = await fetchPortfolioTagDefinitions()
      setTagDefinitions(data)
      return data
    } finally {
      setTagDefinitionsLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.resolve()
      .then(loadTagDefinitions)
      .catch((error) => {
        onError?.(error)
      })
  }, [loadTagDefinitions, onError])

  return {
    tagDefinitions,
    tagDefinitionsLoading,
    loadTagDefinitions,
  }
}
