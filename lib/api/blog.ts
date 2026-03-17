import { localApiFetch, buildQueryString } from './client'

export interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  cover_image_url: string | null
  cover_image_alt: string | null
  og_image_url: string | null
  seo_title: string | null
  seo_description: string | null
  author_name: string
  author_id: string | null
  status: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED'
  published_at: string | null
  created_at: string
  updated_at: string
  categories: BlogCategory[]
  tags: BlogTag[]
  relatedPosts?: BlogPostSummary[]
}

export interface BlogPostSummary {
  id: string
  title: string
  slug: string
  excerpt: string
  cover_image_url: string | null
  cover_image_alt: string | null
  author_name: string
  published_at: string | null
  categories?: BlogCategory[]
  tags?: BlogTag[]
}

export interface BlogCategory {
  id: string
  name: string
  slug: string
  post_count?: number
}

export interface BlogTag {
  id: string
  name: string
  slug: string
  post_count?: number
}

export interface BlogPostInput {
  title: string
  slug?: string
  content?: string
  excerpt?: string
  cover_image_url?: string | null
  cover_image_alt?: string | null
  og_image_url?: string | null
  seo_title?: string | null
  seo_description?: string | null
  status?: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED'
  published_at?: string | null
  category_ids?: string[]
  tag_ids?: string[]
}

export const blogApi = {
  // Admin endpoints
  admin: {
    async list(filters: { page?: number; limit?: number; status?: string; search?: string } = {}) {
      const query = buildQueryString(filters)
      return localApiFetch<BlogPostSummary[]>(`/admin/blog${query}`)
    },

    async getById(id: string) {
      return localApiFetch<BlogPost>(`/admin/blog/${id}`)
    },

    async create(data: BlogPostInput) {
      return localApiFetch<BlogPost>('/admin/blog', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    async update(id: string, data: Partial<BlogPostInput>) {
      return localApiFetch<BlogPost>(`/admin/blog/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },

    async delete(id: string) {
      return localApiFetch<{ success: boolean }>(`/admin/blog/${id}`, {
        method: 'DELETE',
      })
    },

    // Categories
    async listCategories() {
      return localApiFetch<BlogCategory[]>('/admin/blog/categories')
    },

    async createCategory(name: string) {
      return localApiFetch<BlogCategory>('/admin/blog/categories', {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
    },

    async deleteCategory(id: string) {
      return localApiFetch<{ success: boolean }>(`/admin/blog/categories/${id}`, {
        method: 'DELETE',
      })
    },

    // Tags
    async listTags() {
      return localApiFetch<BlogTag[]>('/admin/blog/tags')
    },

    async createTag(name: string) {
      return localApiFetch<BlogTag>('/admin/blog/tags', {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
    },

    async deleteTag(id: string) {
      return localApiFetch<{ success: boolean }>(`/admin/blog/tags/${id}`, {
        method: 'DELETE',
      })
    },
  },

  // Public endpoints
  async list(filters: { page?: number; limit?: number; category?: string; tag?: string; search?: string } = {}) {
    const query = buildQueryString(filters)
    return localApiFetch<BlogPostSummary[]>(`/blog${query}`)
  },

  async getBySlug(slug: string) {
    return localApiFetch<BlogPost>(`/blog/${slug}`)
  },

  async listCategories() {
    return localApiFetch<BlogCategory[]>('/blog/categories')
  },

  async listTags() {
    return localApiFetch<BlogTag[]>('/blog/tags')
  },
}