import type {
  PortfolioAssetType,
  GroupParams,
  PortfolioMembershipScope,
  PortfolioTagDefinition,
  PortfolioTagOverview,
  PortfolioStockItem,
} from '../types/portfolio'
import { requestJson, type ApiDataResponse } from './apiClient'
import { portfolioGroupParams } from '../features/portfolio/constants'

type AddPortfolioStockPayload = {
  stock_code: string
  stock_name: string
}

type AddPortfolioStockResponse = {
  added_count?: number
  skipped_count?: number
}

type TagDefinitionPayload = {
  name: string
  color: string
}

export const fetchPortfolioGroups = async (params: GroupParams = portfolioGroupParams) => {
  const data = await requestJson<ApiDataResponse<string[]>>(
    `/api/portfolio/groups?params=${params}`,
    '获取分组失败',
  )
  return data.data
}

export const fetchPortfolioStocks = async (
  params: GroupParams = portfolioGroupParams,
  groupName?: string,
  assetType: PortfolioAssetType = 'stock',
) => {
  const searchParams = new URLSearchParams({
    params: String(params),
    asset_type: assetType,
  })
  if (groupName) {
    searchParams.set('group_name', groupName)
  }
  const data = await requestJson<ApiDataResponse<PortfolioStockItem[]>>(
    `/api/portfolio/list?${searchParams.toString()}`,
    '获取自选列表失败',
  )
  return data.data
}

export const fetchPortfolioTagDefinitions = async () => {
  const data = await requestJson<ApiDataResponse<PortfolioTagDefinition[]>>(
    '/api/portfolio/tag-definitions',
    '获取标签配置失败',
  )
  return data.data
}

export const fetchPortfolioTagOverview = async () => {
  const data = await requestJson<ApiDataResponse<PortfolioTagOverview>>(
    '/api/portfolio/tags/overview',
    '获取标签概览失败',
  )
  return data.data
}

export const addPortfolioStocks = async (
  stocks: AddPortfolioStockPayload[],
  groupName: string,
  params: GroupParams = portfolioGroupParams,
  scope: PortfolioMembershipScope = 'self_selected',
) => {
  const data = await requestJson<ApiDataResponse<AddPortfolioStockResponse>>(
    '/api/portfolio/add/batch',
    '批量添加失败',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stocks,
        group_name: groupName,
        params,
        scope,
        notes: '',
      }),
    },
  )

  return data.data
}

export const removePortfolioStock = async (
  stockCode: string,
  params: GroupParams = portfolioGroupParams,
  groupName?: string,
) => {
  const query = groupName ? `?params=${params}&group_name=${encodeURIComponent(groupName)}` : `?params=${params}`
  await requestJson<ApiDataResponse<unknown>>(
    `/api/portfolio/remove/${stockCode}${query}`,
    '移除失败',
    {
      method: 'DELETE',
    },
  )
}

export const updatePortfolioStockTags = async (
  stockCode: string,
  tags: string[],
  params: GroupParams = portfolioGroupParams,
) => {
  const data = await requestJson<ApiDataResponse<PortfolioStockItem>>(
    `/api/portfolio/tags/${stockCode}?params=${params}`,
    '更新标签失败',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags }),
    },
  )

  return data.data
}

export const createPortfolioTagDefinition = async (payload: TagDefinitionPayload) => {
  const data = await requestJson<ApiDataResponse<PortfolioTagDefinition>>(
    '/api/portfolio/tag-definitions',
    '创建标签失败',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )

  return data.data
}

export const updatePortfolioTagDefinition = async (
  definitionId: number,
  payload: TagDefinitionPayload,
) => {
  const data = await requestJson<ApiDataResponse<PortfolioTagDefinition>>(
    `/api/portfolio/tag-definitions/${definitionId}`,
    '更新标签失败',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )

  return data.data
}

export const deletePortfolioTagDefinition = async (definitionId: number) => {
  await requestJson<ApiDataResponse<unknown>>(
    `/api/portfolio/tag-definitions/${definitionId}`,
    '删除标签失败',
    {
      method: 'DELETE',
    },
  )
}

export const createPortfolioGroup = async (
  name: string,
  params: GroupParams = portfolioGroupParams,
) => {
  await requestJson<ApiDataResponse<unknown>>('/api/portfolio/groups/add', '创建分组失败', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, params }),
  })
}

export const renamePortfolioGroup = async (
  oldName: string,
  newName: string,
  params: GroupParams = portfolioGroupParams,
) => {
  await requestJson<ApiDataResponse<unknown>>('/api/portfolio/groups/rename', '修改分组失败', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      old_name: oldName,
      new_name: newName,
      params,
    }),
  })
}

export const deletePortfolioGroup = async (
  groupName: string,
  params: GroupParams = portfolioGroupParams,
) => {
  const encodedGroupName = encodeURIComponent(groupName)
  await requestJson<ApiDataResponse<unknown>>(
    `/api/portfolio/groups/remove/${encodedGroupName}?params=${params}`,
    '删除分组失败',
    { method: 'DELETE' },
  )
}
