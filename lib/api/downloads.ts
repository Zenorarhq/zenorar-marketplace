import { apiFetch, ApiResponse } from './client'

export interface ProductFile {
  id: string
  product_id: string
  file_name: string
  file_url: string
  file_size: number | null
  file_type: string | null
  version: string | null
  is_latest: boolean | null
  file_hash: string | null
  created_at: string | null
  downloadCount?: number
  isLegacy?: boolean
  obfuscation_level?: string | null
  obfuscation_report?: {
    totalFiles: number
    obfuscatedFiles: number
    skippedFiles: number
    failedFiles: number
    partialFiles?: number
    level: string
  } | null
}

export interface DownloadResult {
  downloadUrl: string
  fileName: string
  fileSize: number | null
  version: string | null
  isLegacy: boolean
  expiresIn: number | null
}

export interface DownloadHistoryEntry {
  id: string
  user_id: string
  product_id: string
  file_id: string | null
  ip_address: string | null
  user_agent: string | null
  downloaded_at: string | null
  products: { id: string; name: string; slug: string }
  product_files: { id: string; file_name: string; version: string | null } | null
}

export const downloadsApi = {
  /** Get signed URL for the latest version of a product */
  async getDownloadUrl(productId: string): Promise<ApiResponse<DownloadResult>> {
    return apiFetch<DownloadResult>(`/downloads/${productId}`)
  },

  /** Get signed URL for a specific file version */
  async getFileDownloadUrl(productId: string, fileId: string): Promise<ApiResponse<DownloadResult>> {
    return apiFetch<DownloadResult>(`/downloads/${productId}/${fileId}`)
  },

  /** Get all available file versions for a product */
  async getProductFiles(productId: string): Promise<ApiResponse<ProductFile[]>> {
    return apiFetch<ProductFile[]>(`/downloads/${productId}/files`)
  },

  /** Get user's full download history */
  async getHistory(): Promise<ApiResponse<DownloadHistoryEntry[]>> {
    return apiFetch<DownloadHistoryEntry[]>('/downloads/history')
  },

  /** Get user's download history for a specific product */
  async getProductHistory(productId: string): Promise<ApiResponse<DownloadHistoryEntry[]>> {
    return apiFetch<DownloadHistoryEntry[]>(`/downloads/${productId}/history`)
  },

  // ─── Admin ────────────────────────────────────────────────────────────────

  /** Upload a product file to R2 */
  async adminUpload(productId: string, formData: FormData): Promise<ApiResponse<ProductFile>> {
    return apiFetch<ProductFile>(`/downloads/admin/products/${productId}/files`, {
      method: 'POST',
      body: formData,
    })
  },

  /** List all file versions for a product (admin) */
  async adminListFiles(productId: string): Promise<ApiResponse<ProductFile[]>> {
    return apiFetch<ProductFile[]>(`/downloads/admin/products/${productId}/files`)
  },

  /** Delete a product file (admin) */
  async adminDeleteFile(productId: string, fileId: string): Promise<ApiResponse<unknown>> {
    return apiFetch(`/downloads/admin/products/${productId}/files/${fileId}`, { method: 'DELETE' })
  },

  /** Set a file as the latest version (admin) */
  async adminSetLatest(productId: string, fileId: string): Promise<ApiResponse<ProductFile>> {
    return apiFetch<ProductFile>(`/downloads/admin/products/${productId}/files/${fileId}/latest`, { method: 'PATCH' })
  },
}
