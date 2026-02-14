// Payment Methods API

import { apiFetch } from './client'

export interface SavedPaymentMethod {
  id: string
  provider: string
  type: string
  label: string | null
  last4: string | null
  brand: string | null
  expiryMonth: number | null
  expiryYear: number | null
  email: string | null
  walletAddress: string | null
  providerId: string | null
  isDefault: boolean
  createdAt: string
}

export const paymentMethodsApi = {
  async getStripeConfig() {
    return apiFetch<{ publishableKey: string }>('/payments/stripe/config')
  },

  async createSetupIntent() {
    return apiFetch<{ clientSecret: string }>('/payments/stripe/setup-intent', {
      method: 'POST',
    })
  },

  async saveStripeCard(paymentMethodId: string) {
    return apiFetch<SavedPaymentMethod>('/payments/stripe/save-card', {
      method: 'POST',
      body: JSON.stringify({ paymentMethodId }),
    })
  },

  async list() {
    return apiFetch<SavedPaymentMethod[]>('/payments/methods')
  },

  async setDefault(id: string) {
    return apiFetch<SavedPaymentMethod>(`/payments/methods/${id}/default`, {
      method: 'POST',
    })
  },

  async remove(id: string) {
    return apiFetch<{ success: boolean }>(`/payments/methods/${id}`, {
      method: 'DELETE',
    })
  },
}
