// Chat API — uses Railway backend via apiFetch

import { apiFetch, buildQueryString, getSessionId } from './client'

export type ChatStatus = 'OPEN' | 'ASSIGNED' | 'RESOLVED' | 'CLOSED'
export type SenderType = 'USER' | 'AGENT' | 'SYSTEM'

export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string | null
  senderName: string | null
  senderAvatar?: string | null
  senderType: SenderType
  content: string
  attachments: { url: string; name: string; type: string; size: number }[]
  isRead: boolean
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
  sessionId: string
  status: ChatStatus
  assignedTo: {
    id: string
    name: string
    avatar: string | null
  } | null
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
  createdAt: string
  updatedAt: string
}

export interface ChatConversationDetail extends ChatConversation {
  messages: ChatMessage[]
}

export interface ChatSettings {
  isOnline: boolean
  offlineMessage: string
}

export interface ChatStats {
  total: number
  open: number
  assigned: number
  resolved: number
  closed: number
  unassigned: number
  unread: number
}

export interface ChatFilters {
  status?: ChatStatus
  assignedTo?: string
  unassigned?: boolean
  page?: number
  limit?: number
}

export const chatApi = {
  // Settings
  async getSettings() {
    return apiFetch<ChatSettings>('/chat/settings')
  },

  async updateSettings(data: Partial<ChatSettings>) {
    return apiFetch<ChatSettings>('/chat/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  // Conversations
  async createConversation(data: {
    guestEmail?: string
    guestName?: string
    initialMessage: string
  }) {
    // sessionId is automatically sent via X-Session-ID header by apiFetch
    return apiFetch<{ id: string; status: string; isOnline: boolean; createdAt: string }>('/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async getConversations(filters: ChatFilters = {}) {
    const query = buildQueryString(filters)
    return apiFetch<ChatConversation[]>(`/chat${query}`)
  },

  async getConversation(id: string) {
    return apiFetch<ChatConversationDetail>(`/chat/${id}`)
  },

  async getActiveConversation() {
    const sessionId = getSessionId()
    return apiFetch<{ id: string; status: string; createdAt: string } | null>(
      `/chat/active?sessionId=${sessionId}`
    )
  },

  // Messages
  async getMessages(conversationId: string, after?: string) {
    const query = after ? `?after=${encodeURIComponent(after)}` : ''
    return apiFetch<ChatMessage[]>(`/chat/${conversationId}/messages${query}`)
  },

  async sendMessage(conversationId: string, content: string, attachments?: any[]) {
    return apiFetch<ChatMessage>(`/chat/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, attachments }),
    })
  },

  // Assignment
  async assignConversation(id: string, agentId?: string) {
    return apiFetch<{ assignedTo: string }>(`/chat/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify(agentId ? { agentId } : {}),
    })
  },

  // Status
  async updateStatus(id: string, status: ChatStatus) {
    return apiFetch<{ status: string }>(`/chat/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },

  // Stats
  async getStats() {
    return apiFetch<ChatStats>('/chat/stats/overview')
  },

  // Upload
  async uploadFile(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return apiFetch<{ url: string; name: string; type: string; size: number }>('/chat/upload', {
      method: 'POST',
      body: formData,
    })
  },
}
