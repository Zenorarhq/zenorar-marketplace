// Base API Client for Zenorar Marketplace

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

// Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface User {
  id: string
  email: string
  name: string
  bio: string | null
  role: 'ADMIN' | 'EDITOR' | 'VIEWER'
  avatar: string | null
  isStaff: boolean
  isVendor?: boolean
  vendorSuspendedAt?: string | null
  permissions?: string[]
  createdAt: string
}

// Token management — separate keys for admin and regular user sessions
function getTokenKey(): string {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
    return 'admin_auth_token'
  }
  return 'auth_token'
}

export function setAccessToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(getTokenKey(), token)
  }
}

export function getAccessToken(): string | null {
  if (typeof window !== 'undefined') {
    // Try primary key first, then fall back to the other key
    return localStorage.getItem(getTokenKey())
      || localStorage.getItem('admin_auth_token')
      || localStorage.getItem('auth_token')
  }
  return null
}

export function clearAccessToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(getTokenKey())
    localStorage.removeItem('user')
  }
}

// Clear all user-specific localStorage keys (used on any auth transition)
export function clearUserStorage() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('user')
  localStorage.removeItem('zenorar_cart')
  localStorage.removeItem('zenorar_wishlist')
  localStorage.removeItem('userPreferences')
  localStorage.removeItem('session_id')
  localStorage.removeItem('sessionTimeout')
  localStorage.removeItem('chat_conversation_id')
  localStorage.removeItem('last_activity')
  localStorage.removeItem('recentSearches')
}

// Session ID for guest users
export function getSessionId(): string {
  if (typeof window === 'undefined') return ''

  let sessionId = localStorage.getItem('session_id')
  if (!sessionId) {
    sessionId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    localStorage.setItem('session_id', sessionId)
  }
  return sessionId
}

// API fetch helper
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAccessToken()
  const sessionId = getSessionId()

  // Don't set Content-Type for FormData - browser will set it automatically with boundary
  const isFormData = options.body instanceof FormData

  const headers: HeadersInit = {
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    'X-Session-ID': sessionId,
    ...options.headers,
  }

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    })

    let data: any
    try {
      data = await response.json()
    } catch {
      return {
        success: false,
        error: `Server error (${response.status}). The file may be too complex to process — try again or contact support.`,
      }
    }

    if (!response.ok && data.success !== false) {
      return {
        success: false,
        error: data.error || data.message || `HTTP Error: ${response.status}`,
      }
    }

    return data
  } catch (error) {
    console.error('API fetch error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

// API fetch for local Next.js API routes (uses /api instead of /backend)
export async function localApiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAccessToken()
  const isFormData = options.body instanceof FormData
  const headers: HeadersInit = {
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    ...options.headers,
  }
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }
  try {
    const response = await fetch(`/api${endpoint}`, { ...options, headers })
    let data: any
    try {
      data = await response.json()
    } catch {
      return { success: false, error: `Server error (${response.status}). Try again or contact support.` }
    }
    if (!response.ok && data.success !== false) {
      return { success: false, error: data.error || data.message || `HTTP Error: ${response.status}` }
    }
    return data
  } catch (error) {
    console.error('Local API fetch error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Network error' }
  }
}

// Helper to build query strings
export function buildQueryString(params: Record<string, any>): string {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  })
  const queryStr = query.toString()
  return queryStr ? `?${queryStr}` : ''
}
