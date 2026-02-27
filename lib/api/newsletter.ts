import { apiFetch, buildQueryString } from './client'

interface Subscriber {
  id: string
  email: string
  createdAt: string
}

interface SubscribersResponse {
  data: Subscriber[]
  total: number
  totalPages: number
  page: number
}

export const newsletterApi = {
  getSubscribers: (params: { page?: number; search?: string }) =>
    apiFetch<SubscribersResponse>(`/newsletter?${buildQueryString(params)}`),
}
