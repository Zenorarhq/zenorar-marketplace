'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { User, getAccessToken, clearAccessToken, setAccessToken, apiFetch } from '@/lib/api'
import { useSessionTimeout } from '@/hooks/use-session-timeout'

interface LoginResult {
  success: boolean
  error?: string
  requiresTwoFactor?: boolean
  tempToken?: string
  method?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  refreshUser: () => Promise<void>
  updateUser: (userData: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setUser(null)
      setIsLoading(false)
      return
    }

    try {
      const result = await apiFetch('/auth/me')
      if (result.success && (result.data as any)?.user) {
        setUser((result.data as any).user)
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify((result.data as any).user))
        }
      } else {
        clearAccessToken()
        setUser(null)
      }
    } catch (error) {
      clearAccessToken()
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Try to restore user from localStorage first for faster initial load
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser))
        } catch (e) {
          // Invalid JSON, ignore
        }
      }
    }

    refreshUser()
  }, [refreshUser])

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      // Login via Railway (security checks handled server-side)
      const result = await apiFetch<{ accessToken?: string; sessionTimeout?: number; user?: User; requiresTwoFactor?: boolean; tempToken?: string; method?: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      if (result.success && result.data) {
        // Check if 2FA is required
        if (result.data.requiresTwoFactor) {
          return {
            success: false,
            requiresTwoFactor: true,
            tempToken: result.data.tempToken,
            method: result.data.method,
          }
        }

        // Store access token
        if (result.data.accessToken) {
          setAccessToken(result.data.accessToken)
        }
        // Store session timeout if provided by proxy
        if (typeof window !== 'undefined' && result.data.sessionTimeout) {
          localStorage.setItem('sessionTimeout', result.data.sessionTimeout.toString())
        }
        // Store user
        if (result.data.user) {
          setUser(result.data.user)
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(result.data.user))
          }
        }
        return { success: true }
      } else {
        return { success: false, error: result.error || 'Login failed' }
      }
    } catch (error) {
      return { success: false, error: 'An error occurred during login' }
    }
  }, [])

  const register = useCallback(async (email: string, password: string, name: string) => {
    try {
      const result = await apiFetch<{ user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name })
      })

      if (result.success && result.data) {
        setUser(result.data.user)
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(result.data.user))
        }
        return { success: true }
      } else {
        return { success: false, error: result.error || 'Registration failed' }
      }
    } catch (error) {
      return { success: false, error: 'An error occurred during registration' }
    }
  }, [])

  const logout = useCallback(() => {
    // Call logout endpoint
    apiFetch('/auth/logout', { method: 'POST' })
    // Clear local state
    clearAccessToken()
    setUser(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user')
    }
  }, [])

  // Auto-logout on session timeout (based on admin setting)
  useSessionTimeout(logout, !!user)

  const updateUser = useCallback((userData: Partial<User>) => {
    setUser((prevUser) => {
      if (!prevUser) return null
      const updatedUser = { ...prevUser, ...userData }
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(updatedUser))
      }
      return updatedUser
    })
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
