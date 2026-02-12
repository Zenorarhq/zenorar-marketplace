// Chat API

import { apiFetch, buildQueryString } from './client'

export type ChatStatus = 'OPEN' | 'ASSIGNED' | 'WAITING' | 'RESOLVED' | 'CLOSED'
export type SenderType = 'USER' | 'AGENT' | 'SYSTEM' | 'BOT'
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM'

export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string | null
  sender: {
    id: string
    name: string
    avatar: string | null
  } | null
  senderType: SenderType
  content: string
  contentType: MessageType
  attachments: any[] | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

export interface ChatConversation {
  id: string
  userId: string | null
  user: {
    id: string
    name: string
    email: string
    avatar: string | null
  } | null
  guestEmail: string | null
  guestName: string | null
  status: ChatStatus
  subject: string | null
  assignedTo: {
    id: string
    name: string
    avatar: string | null
  } | null
  orderId: string | null
  source: string | null
  lastMessage: ChatMessage | null
  messageCount: number
  closedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ChatConversationDetail extends ChatConversation {
  messages: ChatMessage[]
}

export interface CreateConversationData {
  subject?: string
  guestEmail?: string
  guestName?: string
  orderId?: string
  initialMessage?: string
}

export interface ChatFilters {
  status?: ChatStatus
  userId?: string
  assignedToId?: string
  unassigned?: boolean
  page?: number
  limit?: number
}

export const chatApi = {
  // User methods
  async createConversation(data: CreateConversationData) {
    return apiFetch<ChatConversation>('/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async getMyConversations(page = 1, limit = 20) {
    const query = buildQueryString({ page, limit })
    return apiFetch<ChatConversation[]>(`/chat/my${query}`)
  },

  async getConversation(id: string) {
    return apiFetch<ChatConversationDetail>(`/chat/${id}`)
  },

  async getMessages(conversationId: string, page = 1, limit = 50) {
    const query = buildQueryString({ page, limit })
    return apiFetch<ChatMessage[]>(`/chat/${conversationId}/messages${query}`)
  },

  async sendMessage(conversationId: string, content: string, contentType: MessageType = 'TEXT', attachments?: any[]) {
    return apiFetch<ChatMessage>(`/chat/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, contentType, attachments }),
    })
  },

  async markAsRead(conversationId: string) {
    return apiFetch<{ message: string }>(`/chat/${conversationId}/read`, {
      method: 'POST',
    })
  },

  async getUnreadCount() {
    return apiFetch<{ count: number }>('/chat/unread')
  },

  // Admin methods
  async list(filters: ChatFilters = {}) {
    const query = buildQueryString(filters)
    return apiFetch<ChatConversation[]>(`/chat${query}`)
  },

  async updateStatus(id: string, status: ChatStatus) {
    return apiFetch<ChatConversation>(`/chat/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },

  async assign(id: string, agentId: string) {
    return apiFetch<ChatConversation>(`/chat/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ agentId }),
    })
  },

  async unassign(id: string) {
    return apiFetch<ChatConversation>(`/chat/${id}/unassign`, {
      method: 'POST',
    })
  },

  async getStats() {
    return apiFetch<{
      total: number
      open: number
      assigned: number
      resolved: number
      unread: number
    }>('/chat/stats/overview')
  },
}
