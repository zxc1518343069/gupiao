import { requestJson } from './apiClient'

type PingResponse = {
  message: string
  detail?: string
}

export const fetchPingMessage = async () => {
  const data = await requestJson<PingResponse>('/api/ping', '获取 API 状态失败')
  return data.message
}
