// Auth API

import { apiFetch, setAccessToken, clearAccessToken, User } from './client'

export interface LoginResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
}

export interface WalletNonceResponse {
  nonce: string
  message: string
}

export const authApi = {
  async login(email: string, password: string) {
    const result = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (result.success && result.data) {
      setAccessToken(result.data.accessToken)
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(result.data.user))
      }
    }
    return result
  },

  async register(data: RegisterData) {
    const result = await apiFetch<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (result.success && result.data) {
      setAccessToken(result.data.accessToken)
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(result.data.user))
      }
    }
    return result
  },

  // Google OAuth
  async googleAuth(idToken: string) {
    const result = await apiFetch<LoginResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    })
    if (result.success && result.data) {
      setAccessToken(result.data.accessToken)
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(result.data.user))
      }
    }
    return result
  },

  // Web3 Wallet Auth
  async getWalletNonce(walletAddress: string) {
    return apiFetch<WalletNonceResponse>('/auth/wallet/nonce', {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
    })
  },

  async walletAuth(walletAddress: string, signature: string, nonce: string) {
    const result = await apiFetch<LoginResponse>('/auth/wallet', {
      method: 'POST',
      body: JSON.stringify({ walletAddress, signature, nonce }),
    })
    if (result.success && result.data) {
      setAccessToken(result.data.accessToken)
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(result.data.user))
      }
    }
    return result
  },

  async linkWallet(walletAddress: string, signature: string, nonce: string) {
    return apiFetch<{ user: User }>('/auth/wallet/link', {
      method: 'POST',
      body: JSON.stringify({ walletAddress, signature, nonce }),
    })
  },

  async me() {
    return apiFetch<{ user: User }>('/auth/me')
  },

  async refreshToken(refreshToken: string) {
    const result = await apiFetch<{ accessToken: string; refreshToken: string }>(
      '/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }
    )
    if (result.success && result.data) {
      setAccessToken(result.data.accessToken)
    }
    return result
  },

  async forgotPassword(email: string) {
    return apiFetch<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },

  async resetPassword(token: string, password: string) {
    return apiFetch<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    })
  },

  logout() {
    clearAccessToken()
  },

  getStoredUser(): User | null {
    if (typeof window === 'undefined') return null
    const userStr = localStorage.getItem('user')
    if (!userStr) return null
    try {
      return JSON.parse(userStr)
    } catch {
      return null
    }
  },

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false
    return !!localStorage.getItem('auth_token')
  },
}
