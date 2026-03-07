// CMS API Client for Page Builder
import { getAccessToken } from '@/lib/api/client'

const API_BASE = '/api/cms'

// Types
export interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'EDITOR' | 'VIEWER'
  avatar: string | null
}

export interface Section {
  id: string
  type: string
  order: number
  props: Record<string, any>
  children?: Section[]  // Support nested sections
  parentId?: string     // Reference to parent section
}

export interface Page {
  id: string
  slug: string
  title: string
  description: string | null
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  metaTitle: string | null
  metaDescription: string | null
  ogImage: string | null
  content: Section[]
  authorId: string
  author?: User
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PageVersion {
  id: string
  pageId: string
  version: number
  title: string
  content: Section[]
  authorId: string
  author?: User
  createdAt: string
}

export interface ComponentTemplate {
  id: string
  name: string
  category: string
  description: string | null
  icon: string | null
  schema: Record<string, any>
  defaultProps: Record<string, any>
  thumbnail: string | null
  order: number
  isActive: boolean
}

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

// Token management — delegates to the main API client (single source of truth)

// API fetch helper
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAccessToken()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
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

    const data = await response.json()

    // If the HTTP status indicates an error, ensure we return a failed response
    if (!response.ok && data.success !== false) {
      return {
        success: false,
        error: data.error || data.message || `HTTP Error: ${response.status}`,
      }
    }

    return data
  } catch (error) {
    // Network error or JSON parse error
    console.error('API fetch error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

// Pages API
export const pagesApi = {
  async list(params?: { page?: number; limit?: number; status?: string }) {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.status) query.set('status', params.status)
    const queryStr = query.toString()
    return apiFetch<Page[]>(`/pages${queryStr ? `?${queryStr}` : ''}`)
  },

  async getById(id: string) {
    return apiFetch<Page>(`/pages/${id}`)
  },

  async getPublished(slug: string) {
    return apiFetch<Page>(`/pages/public/${slug}`)
  },

  async create(data: { slug: string; title: string; description?: string; content?: Section[] }) {
    return apiFetch<Page>('/pages', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async update(id: string, data: Partial<Page> | Record<string, unknown>) {
    return apiFetch<Page>(`/pages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async publish(id: string) {
    return apiFetch<Page>(`/pages/${id}/publish`, {
      method: 'PATCH',
    })
  },

  async unpublish(id: string) {
    return apiFetch<Page>(`/pages/${id}/unpublish`, {
      method: 'PATCH',
    })
  },

  async archive(id: string) {
    return apiFetch<Page>(`/pages/${id}/archive`, {
      method: 'PATCH',
    })
  },

  async delete(id: string) {
    return apiFetch<void>(`/pages/${id}`, {
      method: 'DELETE',
    })
  },

  async duplicate(id: string) {
    return apiFetch<Page>(`/pages/${id}/duplicate`, {
      method: 'POST',
    })
  },

  // Versions
  async getVersions(id: string) {
    return apiFetch<PageVersion[]>(`/pages/${id}/versions`)
  },

  async getVersion(id: string, versionId: string) {
    return apiFetch<PageVersion>(`/pages/${id}/versions/${versionId}`)
  },

  async restoreVersion(id: string, versionId: string) {
    return apiFetch<Page>(`/pages/${id}/versions/${versionId}/restore`, {
      method: 'POST',
    })
  },
}

// Components API
export const componentsApi = {
  async list() {
    return apiFetch<ComponentTemplate[]>('/components')
  },

}

