import { apiFetch, buildQueryString } from './client'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface License {
  id: string
  userId: string
  productId: string
  orderId: string
  orderItemId?: string
  licenseKey: string
  licenseType: 'NORMAL' | 'EXTENDED' | 'PRO'
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED'
  isActive: boolean
  domainsAllowed: number
  registeredDomains: string[]
  supportExpiresAt: string
  lastVerifiedAt: string | null
  lastVerifiedIp: string | null
  verificationCount: number
  createdAt: string
  updatedAt: string
  user?: { id: string; name: string; email: string }
  product?: { id: string; name: string; slug: string }
  activations?: Array<{
    id: string
    identifier: string
    identifierType: string
    isActive: boolean
    ipAddress?: string | null
    userAgent?: string | null
    activatedAt: string
    deactivatedAt?: string | null
  }>
}

export interface LicenseStats {
  totalLicenses: number
  byStatus: Array<{ status: string; count: number }>
  byType: Array<{ type: string; count: number }>
  expiringSoon: number
  totalVerifications: number
}

export interface DownloadStats {
  today: number
  week: number
  month: number
  total: number
  topProducts: Array<{ productId: string; productName: string; downloads: number }>
  flaggedUsers: Array<{ userId: string; userName: string; userEmail: string; downloads: number }>
  recentDownloads: Array<{
    id: string
    userId: string
    userName: string
    userEmail: string
    productId: string
    productName: string
    downloadedAt: string
    ipAddress: string | null
  }>
}

export interface LicenseFilters {
  userId?: string
  productId?: string
  status?: string
  licenseType?: string
  search?: string
  page?: number
  limit?: number
}

// ─── API Methods ────────────────────────────────────────────────────────────

export async function getLicenseStats() {
  return apiFetch<LicenseStats>('/licenses/stats')
}

export async function getDownloadStats() {
  return apiFetch<DownloadStats>('/downloads/admin/stats')
}

export async function getAllLicenses(filters: LicenseFilters = {}) {
  const qs = buildQueryString(filters)
  return apiFetch<License[]>(`/licenses${qs}`)
}

export async function getLicenseDetails(id: string) {
  return apiFetch<License>(`/licenses/${id}`)
}

export async function searchLicenses(query: string, page = 1, limit = 20) {
  const qs = buildQueryString({ q: query, page, limit })
  return apiFetch<License[]>(`/licenses/search${qs}`)
}

export async function getVerificationLogs(licenseId: string, page = 1, limit = 50) {
  const qs = buildQueryString({ page, limit })
  return apiFetch<any[]>(`/licenses/${licenseId}/logs${qs}`)
}

export async function suspendLicense(id: string, pin: string, reason?: string) {
  return apiFetch(`/licenses/${id}/suspend`, {
    method: 'POST',
    body: JSON.stringify({ pin, reason }),
  })
}

export async function revokeLicense(id: string, pin: string, reason?: string) {
  return apiFetch(`/licenses/${id}/revoke`, {
    method: 'POST',
    body: JSON.stringify({ pin, reason }),
  })
}