// Profile API

import { apiFetch, buildQueryString, User } from './client'

export interface Address {
  id: string
  type: 'SHIPPING' | 'BILLING'
  isDefault: boolean
  firstName: string
  lastName: string
  company: string | null
  address1: string
  address2: string | null
  city: string
  state: string | null
  postalCode: string
  country: string
  phone: string | null
  createdAt: string
  updatedAt: string
}

export interface UserPreferences {
  id: string
  userId: string
  currency: string
  language: string
  timezone: string
  emailNotifications: boolean
  pushNotifications: boolean
  orderUpdates: boolean
  promotionalEmails: boolean
  newsletterSubscribed: boolean
  profilePublic: boolean
  showReviewsPublicly: boolean
}

export interface LoginHistoryEntry {
  id: string
  ipAddress: string
  deviceType: string | null
  browserName: string | null
  success: boolean
  createdAt: string
}

export interface UserProfile extends User {
  stats: {
    orders: number
    reviews: number
    wishlistItems: number
  }
  preferences: UserPreferences | null
}

export interface UpdateProfileData {
  name?: string
  avatar?: string | null
  bio?: string
}

export interface UpdatePasswordData {
  currentPassword: string
  newPassword: string
}

export interface CreateAddressData {
  type?: 'SHIPPING' | 'BILLING'
  isDefault?: boolean
  firstName: string
  lastName: string
  company?: string
  address1: string
  address2?: string
  city: string
  state?: string
  postalCode: string
  country: string
  phone?: string
}

export interface UpdatePreferencesData {
  currency?: string
  language?: string
  timezone?: string
  emailNotifications?: boolean
  pushNotifications?: boolean
  orderUpdates?: boolean
  promotionalEmails?: boolean
  newsletterSubscribed?: boolean
  profilePublic?: boolean
  showReviewsPublicly?: boolean
}

export const profileApi = {
  // Profile
  async get() {
    return apiFetch<UserProfile>('/profile')
  },

  async update(data: UpdateProfileData) {
    return apiFetch<User>('/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async uploadAvatar(file: File) {
    const formData = new FormData()
    formData.append('avatar', file)

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

    const response = await fetch(`${apiUrl}/profile/avatar`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to upload avatar', data: null }
    }

    return { success: true, data: data.data as User, error: null }
  },

  async removeAvatar() {
    return apiFetch<User>('/profile/avatar', {
      method: 'DELETE',
    })
  },

  async updatePassword(data: UpdatePasswordData) {
    return apiFetch<{ message: string }>('/profile/password', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async deleteAccount(password: string) {
    return apiFetch<{ message: string }>('/profile/account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    })
  },

  async getActivity(limit = 10) {
    return apiFetch<{
      orders: Array<{
        id: string
        orderNumber: string
        status: string
        total: number
        createdAt: string
      }>
      reviews: Array<{
        id: string
        rating: number
        title: string | null
        isApproved: boolean
        createdAt: string
        product: { id: string; name: string; slug: string }
      }>
    }>(`/profile/activity?limit=${limit}`)
  },

  // Login History
  async getLoginHistory(limit = 20) {
    return apiFetch<LoginHistoryEntry[]>(`/profile/login-history?limit=${limit}`)
  },

  // Addresses
  async getAddresses() {
    return apiFetch<Address[]>('/profile/addresses')
  },

  async getAddress(id: string) {
    return apiFetch<Address>(`/profile/addresses/${id}`)
  },

  async createAddress(data: CreateAddressData) {
    return apiFetch<Address>('/profile/addresses', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateAddress(id: string, data: Partial<CreateAddressData>) {
    return apiFetch<Address>(`/profile/addresses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async deleteAddress(id: string) {
    return apiFetch<{ message: string }>(`/profile/addresses/${id}`, {
      method: 'DELETE',
    })
  },

  async setDefaultAddress(id: string) {
    return apiFetch<Address>(`/profile/addresses/${id}/default`, {
      method: 'POST',
    })
  },

  // Preferences
  async getPreferences() {
    return apiFetch<UserPreferences>('/profile/preferences')
  },

  async updatePreferences(data: UpdatePreferencesData) {
    return apiFetch<UserPreferences>('/profile/preferences', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },
}
