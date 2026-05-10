export type ApiDataResponse<T> = {
  data: T
  detail?: string
}

type ApiErrorPayload = {
  detail?: string
}

export const requestJson = async <T>(
  url: string,
  fallbackErrorMessage: string,
  options?: RequestInit,
): Promise<T> => {
  const response = await fetch(url, options)
  const data = (await response.json()) as T & ApiErrorPayload

  if (!response.ok) {
    throw new Error(data.detail || fallbackErrorMessage)
  }

  return data
}
