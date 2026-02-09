'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { User, getAccessToken, clearAccessToken, setAccessToken, apiFetch } from '@/lib/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
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
      if (result.success && result.data?.user) {
        setUser(result.data.user)
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(result.data.user))
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

  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      })

      if (result.success && result.data) {
        // Store access token
        if (result.data.accessToken) {
          setAccessToken(result.data.accessToken)
        }
        // Store user
        setUser(result.data.user)
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(result.data.user))
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
      const result = await apiFetch('/auth/register', {
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
