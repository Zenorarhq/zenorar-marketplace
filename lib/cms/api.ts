// CMS API Client for Page Builder

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
  style?: {
    backgroundColor?: string
    padding?: string
    margin?: string
  }
  visibility?: {
    desktop: boolean
    tablet: boolean
    mobile: boolean
  }
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

export interface Media {
  id: string
  name: string
  url: string
  publicId: string
  type: 'IMAGE' | 'VIDEO' | 'DOCUMENT'
  size: number
  width: number | null
  height: number | null
  uploadedById: string
  createdAt: string
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

// Token management — reuses the marketplace auth token
let accessToken: string | null = null

export function setAccessToken(token: string) {
  accessToken = token
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken
  if (typeof window !== 'undefined') {
    accessToken = localStorage.getItem('admin_auth_token')
      || localStorage.getItem('auth_token')
  }
  return accessToken
}

export function clearAccessToken() {
  accessToken = null
}

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

// Auth API
export const authApi = {
  async login(email: string, password: string) {
    const result = await apiFetch<{ user: User; accessToken: string; refreshToken: string }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    )
    if (result.success && result.data) {
      setAccessToken(result.data.accessToken)
    }
    return result
  },

  async me() {
    return apiFetch<User>('/auth/me')
  },

  logout() {
    clearAccessToken()
  },
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

  async getBySlug(slug: string) {
    return apiFetch<Page>(`/pages/slug/${slug}`)
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

  async reorderSections(id: string, sectionIds: string[]) {
    return apiFetch<Page>(`/pages/${id}/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ sectionIds }),
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

  async getByName(name: string) {
    return apiFetch<ComponentTemplate>(`/components/${name}`)
  },

  async getSchema(name: string) {
    return apiFetch<{ schema: Record<string, any>; defaultProps: Record<string, any> }>(
      `/components/${name}/schema`
    )
  },

  async getCategories() {
    return apiFetch<string[]>('/components/meta/categories')
  },

  async seed() {
    return apiFetch<{ count: number }>('/components/seed', {
      method: 'POST',
    })
  },
}

// Media API
export const mediaApi = {
  async list(params?: { page?: number; limit?: number; type?: string }) {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.type) query.set('type', params.type)
    const queryStr = query.toString()
    return apiFetch<Media[]>(`/media${queryStr ? `?${queryStr}` : ''}`)
  },

  async upload(file: File) {
    const token = getAccessToken()
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE}/media/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })

    return response.json() as Promise<ApiResponse<Media>>
  },

  async delete(id: string) {
    return apiFetch<void>(`/media/${id}`, {
      method: 'DELETE',
    })
  },
}
