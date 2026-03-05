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

  sendBulkEmail: (subject: string, message: string) =>
    apiFetch<{ message: string }>('/newsletter/send-bulk', {
      method: 'POST',
      body: JSON.stringify({ subject, message }),
    }),

  exportSubscribersUrl: () => '/newsletter/export',

  removeSubscriber: (id: string) =>
    apiFetch<{ message: string }>(`/newsletter/${id}`, { method: 'DELETE' }),

  bulkRemove: (ids: string[]) =>
    apiFetch<{ message: string }>('/newsletter/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
}
