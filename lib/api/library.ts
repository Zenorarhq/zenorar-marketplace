// Library API Client for Zenorar Marketplace
// Library routes are local Next.js API routes (/api/library), not Railway endpoints

import { ApiResponse, getAccessToken } from './client'

// Local API fetch for Next.js routes (not Railway)
async function localApiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = getAccessToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }
  try {
    const response = await fetch(`/api${endpoint}`, { ...options, headers })
    const data = await response.json()
    if (!response.ok && data.success !== false) {
      return { success: false, error: data.error || data.message || `HTTP Error: ${response.status}` }
    }
    return data
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' }
  }
}

export interface LibraryItem {
  id: string
  licenseId?: string
  name: string
  slug?: string
  description: string
  category: 'scripts' | 'esims' | 'tools' | 'api' | 'virtual-numbers'
  icon: string
  purchaseDate: string
  status: 'active' | 'expired' | 'update-available' | 'suspended'
  version?: string
  downloadCount?: number
  expiresAt?: string
  orderId?: string
  // Virtual number specific fields
  phoneNumber?: string
  phoneNumberDisplay?: string
  unreadCount?: number
  smsUsed?: number
  smsIncluded?: number
}

export interface DownloadLink {
  url: string
  filename: string
  expiresAt: string
}

export interface ApiKey {
  key: string
  productId: string
  createdAt: string
}

export interface QRCode {
  qrCodeData: string
  activationCode: string
  expiresAt: string
}

export const libraryApi = {
  /**
   * Get user's library (purchased products)
   */
  async getLibrary(): Promise<ApiResponse<LibraryItem[]>> {
    return localApiFetch<LibraryItem[]>('/library')
  },

  /**
   * Download a product (scripts/tools)
   * Phase 2 implementation
   */
  async downloadProduct(productId: string): Promise<ApiResponse<DownloadLink>> {
    return localApiFetch<DownloadLink>(`/library/${productId}/download`, {
      method: 'POST',
    })
  },

  /**
   * Get QR code for eSIM product
   * Phase 2 implementation
   */
  async getQRCode(productId: string): Promise<ApiResponse<QRCode>> {
    return localApiFetch<QRCode>(`/library/${productId}/qr`)
  },

  /**
   * Get API key for API product
   * Phase 2 implementation
   */
  async getApiKey(productId: string): Promise<ApiResponse<ApiKey>> {
    return localApiFetch<ApiKey>(`/library/${productId}/api-key`)
  },

  /**
   * Renew expired subscription/product
   * Phase 2 implementation
   */
  async renewSubscription(productId: string): Promise<ApiResponse<any>> {
    return localApiFetch<any>(`/library/${productId}/renew`, {
      method: 'POST',
    })
  },

  /**
   * Download all products as zip
   * Phase 2 implementation
   */
  async downloadAll(): Promise<ApiResponse<DownloadLink>> {
    return localApiFetch<DownloadLink>('/library/download-all', {
      method: 'POST',
    })
  },
}
