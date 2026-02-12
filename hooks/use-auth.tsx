'use client'

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react'
import { authApi, User, getAccessToken, clearAccessToken } from '@/lib/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  refreshUser: () => Promise<void>
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

    const result = await authApi.me()
    if (result.success && result.data) {
      setUser(result.data)
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(result.data))
      }
    } else {
      setUser(null)
      clearAccessToken()
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    // Try to restore user from localStorage first for faster initial load
    const storedUser = authApi.getStoredUser()
    if (storedUser) {
      setUser(storedUser)
    }

    // Then verify with API
    refreshUser()
  }, [refreshUser])

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password)
    if (result.success && result.data) {
      setUser(result.data.user)
      return { success: true }
    }
    return { success: false, error: result.error || 'Login failed' }
  }, [])

  const register = useCallback(async (email: string, password: string, name: string) => {
    const result = await authApi.register({ email, password, name })
    if (result.success && result.data) {
      setUser(result.data.user)
      return { success: true }
    }
    return { success: false, error: result.error || 'Registration failed' }
  }, [])

  const logout = useCallback(() => {
    authApi.logout()
    setUser(null)
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
