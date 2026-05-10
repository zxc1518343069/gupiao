import type { StockItem } from '../types/portfolio'
import { requestJson, type ApiDataResponse } from './apiClient'

export const fetchEtfList = async () => {
  const data = await requestJson<ApiDataResponse<StockItem[]>>('/api/stock/etf/list', '获取 ETF 列表失败')
  return data.data
}
