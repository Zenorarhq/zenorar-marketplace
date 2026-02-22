'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { User, getAccessToken, clearAccessToken, setAccessToken, apiFetch } from '@/lib/api'
import { useSessionTimeout } from '@/hooks/use-session-timeout'

interface LoginResult {
  success: boolean
  error?: string
  requiresTwoFactor?: boolean
  tempToken?: string
  method?: string
  user?: User
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isStaff: boolean
  permissions: string[]
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (...permissions: string[]) => boolean
  hasAllPermissions: (...permissions: string[]) => boolean
  login: (email: string, password: string) => Promise<LoginResult>
  register: (email: string, password: string, name: string, referralCode?: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  refreshUser: () => Promise<void>
  updateUser: (userData: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [permissions, setPermissions] = useState<string[]>([])

  // Route-based authentication state
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith('/admin') ?? false
  const queryClient = useQueryClient()

  // Shared helper: clear all user-specific data (localStorage + query cache)
  const clearUserData = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user')
      localStorage.removeItem('zenorar_cart')
      localStorage.removeItem('zenorar_wishlist')
      localStorage.removeItem('userPreferences')
      localStorage.removeItem('session_id')
      localStorage.removeItem('sessionTimeout')
      localStorage.removeItem('chat_conversation_id')
      localStorage.removeItem('last_activity')
      localStorage.removeItem('recentSearches')
    }
    queryClient.clear()
  }, [queryClient])

  const refreshUser = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setUser(null)
      setPermissions([])
      setIsLoading(false)
      return
    }

    try {
      const result = await apiFetch('/auth/me')
      if (result.success && (result.data as any)?.user) {
        const userData = (result.data as any).user
        setUser(userData)

        // Set permissions from user data or fetch them
        if (userData.permissions) {
          setPermissions(userData.permissions)
        } else if (userData.isStaff) {
          // Fetch permissions for staff users
          try {
            const permsResult = await apiFetch('/auth/permissions')
            if (permsResult.success && (permsResult.data as any)?.permissions) {
              setPermissions((permsResult.data as any).permissions)
            }
          } catch {
            setPermissions([])
          }
        } else {
          setPermissions([])
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(userData))
        }
      } else {
        clearAccessToken()
        setUser(null)
        setPermissions([])
      }
    } catch (error) {
      clearAccessToken()
      setUser(null)
      setPermissions([])
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
          // Clear stale data from previous session before setting new user
          clearUserData()
          setAccessToken(result.data.accessToken)
        }
        // Store session timeout if provided by proxy
        if (typeof window !== 'undefined' && result.data.sessionTimeout) {
          localStorage.setItem('sessionTimeout', result.data.sessionTimeout.toString())
        }
        // Store user
        if (result.data.user) {
          setUser(result.data.user)

          // Set permissions
          if (result.data.user.permissions) {
            setPermissions(result.data.user.permissions)
          } else if (result.data.user.isStaff) {
            // Fetch permissions for staff users
            try {
              const permsResult = await apiFetch('/auth/permissions')
              if (permsResult.success && (permsResult.data as any)?.permissions) {
                setPermissions((permsResult.data as any).permissions)
              }
            } catch {
              setPermissions([])
            }
          } else {
            setPermissions([])
          }

          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(result.data.user))
          }
        }
        return { success: true, user: result.data.user }
      } else {
        return { success: false, error: result.error || 'Login failed' }
      }
    } catch (error) {
      return { success: false, error: 'An error occurred during login' }
    }
  }, [queryClient])

  const register = useCallback(async (email: string, password: string, name: string, referralCode?: string) => {
    try {
      const result = await apiFetch<{ user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name, referralCode })
      })

      if (result.success && result.data) {
        // Clear stale data from previous session before setting new user
        clearUserData()
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
  }, [clearUserData])

  const logout = useCallback(() => {
    // Call logout endpoint
    apiFetch('/auth/logout', { method: 'POST' })
    // Clear auth token, user state, and all cached data
    clearAccessToken()
    setUser(null)
    setPermissions([])
    clearUserData()
  }, [clearUserData])

  // Auto-logout on session timeout (based on admin setting)
  useSessionTimeout(logout, !!user)

  // Permission checking helpers
  const hasPermission = useCallback(
    (permission: string) => {
      if (user?.role === 'ADMIN') return true
      return permissions.includes(permission)
    },
    [permissions, user?.role]
  )

  const hasAnyPermission = useCallback(
    (...perms: string[]) => {
      if (user?.role === 'ADMIN') return true
      return perms.some((p) => permissions.includes(p))
    },
    [permissions, user?.role]
  )

  const hasAllPermissions = useCallback(
    (...perms: string[]) => {
      if (user?.role === 'ADMIN') return true
      return perms.every((p) => permissions.includes(p))
    },
    [permissions, user?.role]
  )

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

  // Store the actual user and auth state
  const actualUser = user
  const actualIsAuthenticated = !!user
  const actualIsStaff = user?.isStaff || user?.role === 'ADMIN' || false

  // Route-based auth state exposure
  // If user is staff and NOT on admin route → show as guest
  const shouldShowAsGuest = actualIsStaff && !isAdminRoute

  return (
    <AuthContext.Provider
      value={{
        user: shouldShowAsGuest ? null : actualUser,
        isLoading,
        isAuthenticated: shouldShowAsGuest ? false : actualIsAuthenticated,
        isStaff: actualIsStaff, // Always expose staff status for routing logic
        permissions: shouldShowAsGuest ? [] : permissions,
        hasPermission: shouldShowAsGuest ? () => false : hasPermission,
        hasAnyPermission: shouldShowAsGuest ? () => false : hasAnyPermission,
        hasAllPermissions: shouldShowAsGuest ? () => false : hasAllPermissions,
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
