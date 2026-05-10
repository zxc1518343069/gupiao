const marketPrefixes = new Set(['sh', 'sz', 'bj'])

export const formatStockCodeForDisplay = (stockCode: string) => {
  const normalizedCode = stockCode.trim()
  const marketPrefix = normalizedCode.slice(0, 2).toLowerCase()

  if (normalizedCode.length > 2 && marketPrefixes.has(marketPrefix)) {
    return normalizedCode.slice(2)
  }

  return normalizedCode
}
