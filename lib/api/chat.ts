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
  isInternal?: boolean
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
  tags: string[]
  rating: number | null
  ratingComment: string | null
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
  cannedReplies: string[]
  autoCloseHours: number
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
  excludeStatus?: ChatStatus
  search?: string
  assignedToId?: string
  unassigned?: boolean
  page?: number
  limit?: number
}

export interface ChatAnalytics {
  overview: {
    totalConversations: number
    totalMessages: number
    avgRating: number
    ratedCount: number
    resolvedCount: number
    avgResponseMinutes: number
  }
  statusBreakdown: Record<string, number>
  dailyVolume: { date: string; count: number }[]
  agentPerformance: { id: string; name: string; conversationCount: number; avgRating: number }[]
  tagDistribution: { tag: string; count: number }[]
  ratingDistribution: { rating: number; count: number }[]
}

export interface ChatAgent {
  id: string
  name: string
  email: string
  avatar: string | null
  role: string
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
    initialMessage?: string
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

  async sendMessage(conversationId: string, content: string, attachments?: any[], isInternal?: boolean) {
    return apiFetch<ChatMessage>(`/chat/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, attachments, isInternal }),
    })
  },

  async markAsRead(conversationId: string) {
    return apiFetch<{ message: string }>(`/chat/${conversationId}/read`, {
      method: 'POST',
    })
  },

  // Assignment
  async assignConversation(id: string, agentId?: string) {
    return apiFetch<{ assignedTo: string }>(`/chat/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify(agentId ? { agentId } : {}),
    })
  },

  async unassignConversation(id: string) {
    return apiFetch<{ conversationId: string }>(`/chat/${id}/unassign`, {
      method: 'POST',
    })
  },

  // Status
  async updateStatus(id: string, status: ChatStatus) {
    return apiFetch<{ status: string }>(`/chat/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },

  // Rating
  async rateConversation(id: string, rating: number, comment?: string) {
    return apiFetch<{ rating: number; ratingComment: string | null }>(`/chat/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    })
  },

  // Tags
  async updateTags(id: string, tags: string[]) {
    return apiFetch<{ tags: string[] }>(`/chat/${id}/tags`, {
      method: 'PATCH',
      body: JSON.stringify({ tags }),
    })
  },

  // Agents
  async getAgents() {
    return apiFetch<ChatAgent[]>('/chat/agents')
  },

  // Stats
  async getStats() {
    return apiFetch<ChatStats>('/chat/stats/overview')
  },

  // Analytics
  async getAnalytics() {
    return apiFetch<ChatAnalytics>('/chat/stats/analytics')
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
