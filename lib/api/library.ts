// Library API Client for Zenorar Marketplace

import { apiFetch, ApiResponse } from './client'

export interface LibraryItem {
  id: string
  name: string
  description: string
  category: 'scripts' | 'esims' | 'tools' | 'api'
  icon: string
  purchaseDate: string
  status: 'active' | 'expired' | 'update-available'
  version?: string
  downloadCount?: number
  expiresAt?: string
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
    return apiFetch<LibraryItem[]>('/library')
  },

  /**
   * Download a product (scripts/tools)
   * Phase 2 implementation
   */
  async downloadProduct(productId: string): Promise<ApiResponse<DownloadLink>> {
    return apiFetch<DownloadLink>(`/library/${productId}/download`, {
      method: 'POST',
    })
  },

  /**
   * Get QR code for eSIM product
   * Phase 2 implementation
   */
  async getQRCode(productId: string): Promise<ApiResponse<QRCode>> {
    return apiFetch<QRCode>(`/library/${productId}/qr`)
  },

  /**
   * Get API key for API product
   * Phase 2 implementation
   */
  async getApiKey(productId: string): Promise<ApiResponse<ApiKey>> {
    return apiFetch<ApiKey>(`/library/${productId}/api-key`)
  },

  /**
   * Renew expired subscription/product
   * Phase 2 implementation
   */
  async renewSubscription(productId: string): Promise<ApiResponse<any>> {
    return apiFetch<any>(`/library/${productId}/renew`, {
      method: 'POST',
    })
  },

  /**
   * Download all products as zip
   * Phase 2 implementation
   */
  async downloadAll(): Promise<ApiResponse<DownloadLink>> {
    return apiFetch<DownloadLink>('/library/download-all', {
      method: 'POST',
    })
  },
}
