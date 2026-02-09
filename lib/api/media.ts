import { apiFetch, buildQueryString } from './client'

export type MediaType = 'IMAGE' | 'VIDEO' | 'DOCUMENT'

export interface MediaFile {
  id: string
  name: string
  url: string
  publicId: string
  type: MediaType
  mimeType?: string
  size: number
  width?: number
  height?: number
  alt?: string
  title?: string
  description?: string
  uploadedBy?: {
    id: string
    name: string
    email: string
  }
  createdAt: string
  updatedAt?: string
}

export interface MediaFilters {
  type?: 'image' | 'video' | 'document' | 'all'
  search?: string
  page?: number
  limit?: number
}

export interface MediaStats {
  totalFiles: number
  totalSize: number
  imageCount: number
  videoCount: number
  documentCount: number
}

export const mediaApi = {
  /**
   * Get all media files (admin only)
   */
  async list(filters: MediaFilters = {}) {
    const query = buildQueryString(filters)
    return apiFetch<MediaFile[]>(`/media${query}`)
  },

  /**
   * Get media statistics (admin only)
   */
  async getStats() {
    return apiFetch<MediaStats>('/media/stats')
  },

  /**
   * Upload new media file (admin only)
   */
  async upload(file: File, data?: { title?: string; alt?: string; description?: string }) {
    const formData = new FormData()
    formData.append('file', file)
    if (data?.title) formData.append('title', data.title)
    if (data?.alt) formData.append('alt', data.alt)
    if (data?.description) formData.append('description', data.description)

    return apiFetch<MediaFile>('/media/upload', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    })
  },

  /**
   * Update media file metadata (admin only)
   */
  async update(id: string, data: { title?: string; alt?: string; description?: string }) {
    return apiFetch<MediaFile>(`/media/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  /**
   * Delete media file (admin only)
   */
  async delete(id: string) {
    return apiFetch<{ success: boolean }>(`/media/${id}`, {
      method: 'DELETE',
    })
  },
}
