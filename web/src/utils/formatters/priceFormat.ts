const isEtfCode = (stockCode: string) => {
  const normalizedCode = stockCode.trim().toLowerCase()
  if (normalizedCode.startsWith('sh')) {
    return (
      normalizedCode.slice(2).startsWith('51') ||
      normalizedCode.slice(2).startsWith('56') ||
      normalizedCode.slice(2).startsWith('58')
    )
  }
  if (normalizedCode.startsWith('sz')) {
    return normalizedCode.slice(2).startsWith('15')
  }
  return false
}

export const getInstrumentPricePrecision = (stockCode: string) => (isEtfCode(stockCode) ? 3 : 2)

export const formatInstrumentPrice = (stockCode: string, value: number | null) => {
  if (value === null) {
    return '--'
  }
  return value.toFixed(getInstrumentPricePrecision(stockCode))
}
