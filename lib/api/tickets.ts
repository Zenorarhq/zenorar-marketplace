// Tickets API

import { apiFetch, buildQueryString } from './client'

export type TicketCategory = 'GENERAL' | 'ORDER' | 'SHIPPING' | 'PAYMENT' | 'REFUND' | 'PRODUCT' | 'ACCOUNT' | 'TECHNICAL' | 'OTHER'
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'WAITING_INTERNAL' | 'RESOLVED' | 'CLOSED'

export interface TicketResponse {
  id: string
  ticketId: string
  userId: string | null
  user: {
    id: string
    name: string
    avatar: string | null
  } | null
  content: string
  isInternal: boolean
  attachments: any[] | null
  createdAt: string
}

export interface Ticket {
  id: string
  ticketNumber: string
  userId: string | null
  user: {
    id: string
    name: string
    email: string
    avatar?: string | null
  } | null
  guestEmail: string | null
  guestName: string | null
  subject: string
  description: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  assignedTo: {
    id: string
    name: string
    avatar: string | null
  } | null
  orderId: string | null
  resolution: string | null
  resolvedAt: string | null
  responseCount: number
  createdAt: string
  updatedAt: string
}

export interface TicketDetail extends Ticket {
  responses: TicketResponse[]
}

export interface CreateTicketData {
  subject: string
  description: string
  category?: TicketCategory
  priority?: TicketPriority
  guestEmail?: string
  guestName?: string
  orderId?: string
}

export interface TicketFilters {
  status?: TicketStatus
  category?: TicketCategory
  priority?: TicketPriority
  userId?: string
  assignedToId?: string
  unassigned?: boolean
  search?: string
  page?: number
  limit?: number
}

export const ticketsApi = {
  // Public
  async getByNumber(ticketNumber: string, email?: string) {
    const query = email ? `?email=${encodeURIComponent(email)}` : ''
    return apiFetch<TicketDetail>(`/tickets/lookup/${ticketNumber}${query}`)
  },

  // User methods
  async create(data: CreateTicketData) {
    return apiFetch<Ticket>('/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async getMyTickets(page = 1, limit = 20) {
    const query = buildQueryString({ page, limit })
    return apiFetch<Ticket[]>(`/tickets/my${query}`)
  },

  async getById(id: string) {
    return apiFetch<TicketDetail>(`/tickets/${id}`)
  },

  async addResponse(ticketId: string, content: string, isInternal = false, attachments?: any[]) {
    return apiFetch<TicketResponse>(`/tickets/${ticketId}/responses`, {
      method: 'POST',
      body: JSON.stringify({ content, isInternal, attachments }),
    })
  },

  async reopen(id: string) {
    return apiFetch<Ticket>(`/tickets/${id}/reopen`, {
      method: 'POST',
    })
  },

  // Admin methods
  async list(filters: TicketFilters = {}) {
    const query = buildQueryString(filters)
    return apiFetch<Ticket[]>(`/tickets${query}`)
  },

  async update(id: string, data: { status?: TicketStatus; priority?: TicketPriority; category?: TicketCategory; assignedToId?: string | null }) {
    return apiFetch<Ticket>(`/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async resolve(id: string, resolution?: string) {
    return apiFetch<Ticket>(`/tickets/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution }),
    })
  },

  async close(id: string) {
    return apiFetch<Ticket>(`/tickets/${id}/close`, {
      method: 'POST',
    })
  },

  async getStats() {
    return apiFetch<{
      total: number
      byStatus: Array<{ status: string; count: number }>
      byCategory: Array<{ category: string; count: number }>
      byPriority: Array<{ priority: string; count: number }>
      avgResolutionTime: number
    }>('/tickets/stats/overview')
  },
}
