import type { StockItem } from '../types/portfolio'
import { requestJson, type ApiDataResponse } from './apiClient'

export const fetchStockList = async () => {
  const data = await requestJson<ApiDataResponse<StockItem[]>>(
    '/api/stock/list',
    '获取股票列表失败',
  )
  return data.data
}
