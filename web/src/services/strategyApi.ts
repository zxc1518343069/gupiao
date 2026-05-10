import type { StrategyItem } from '../features/strategy/types/strategy'
import { requestJson, type ApiDataResponse } from './apiClient'

type CreateStrategyPayload = Omit<StrategyItem, 'id' | 'created_at'>

export const fetchStrategies = async () => {
  const data = await requestJson<ApiDataResponse<StrategyItem[]>>(
    '/api/strategy',
    '获取策略列表失败',
  )
  return data.data
}

export const createStrategy = async (payload: CreateStrategyPayload) => {
  const data = await requestJson<ApiDataResponse<StrategyItem>>('/api/strategy', '添加策略失败', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return data.data
}

export const updateStrategy = async (strategyId: string, payload: CreateStrategyPayload) => {
  const data = await requestJson<ApiDataResponse<StrategyItem>>(
    `/api/strategy/${strategyId}`,
    '编辑策略失败',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )

  return data.data
}

export const deleteStrategy = async (strategyId: string) => {
  await requestJson<ApiDataResponse<unknown>>(`/api/strategy/${strategyId}`, '删除策略失败', {
    method: 'DELETE',
  })
}
