// Settings API

import { apiFetch, buildQueryString } from './client'

export interface Currency {
  code: string
  name: string
  symbol: string
}

export interface Language {
  code: string
  name: string
}

export interface Timezone {
  id: string
  name: string
  offset: string
}

export interface SiteSetting {
  key: string
  value: any
  group: string
  description: string | null
  isPublic: boolean
}

export const settingsApi = {
  // Public localization data
  async getCurrencies() {
    return apiFetch<Currency[]>('/settings/currencies')
  },

  async getLanguages() {
    return apiFetch<Language[]>('/settings/languages')
  },

  async getTimezones() {
    return apiFetch<Timezone[]>('/settings/timezones')
  },

  async getPublicSettings() {
    return apiFetch<Record<string, any>>('/settings/public')
  },

  async getSetting(key: string) {
    return apiFetch<{ key: string; value: any }>(`/settings/${key}`)
  },

  // Admin methods
  async getAllSettings() {
    return apiFetch<Record<string, Record<string, { value: any; description: string | null; isPublic: boolean }>>>('/settings')
  },

  async getSettingsByGroup(group: string) {
    return apiFetch<Record<string, any>>(`/settings/group/${group}`)
  },

  async updateSetting(key: string, value: any, options?: { group?: string; description?: string; isPublic?: boolean }) {
    return apiFetch<SiteSetting>(`/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value, ...options }),
    })
  },

  async updateSettings(settings: Array<{ key: string; value: any; group?: string; isPublic?: boolean }>) {
    return apiFetch<Record<string, Record<string, any>>>('/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    })
  },

  async deleteSetting(key: string) {
    return apiFetch<{ message: string }>(`/settings/${key}`, {
      method: 'DELETE',
    })
  },

  async initializeDefaults() {
    return apiFetch<Record<string, Record<string, any>>>('/settings/initialize', {
      method: 'POST',
    })
  },

  async getAuditLog(page = 1, limit = 50) {
    return apiFetch<any>(`/settings/audit-log?page=${page}&limit=${limit}`)
  },

  async exportSettings() {
    return apiFetch<any[]>('/settings/export')
  },

  async importSettings(settings: any[]) {
    return apiFetch<void>('/settings/import', {
      method: 'POST',
      body: JSON.stringify({ settings }),
    })
  },

  async testPaymentConnection(provider: string) {
    return apiFetch<{ message: string }>(`/settings/test-payment/${provider}`, {
      method: 'POST',
    })
  },
}
