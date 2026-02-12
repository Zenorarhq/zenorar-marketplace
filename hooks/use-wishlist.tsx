'use client'

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { localApiFetch } from '@/lib/api/client'

const WISHLIST_STORAGE_KEY = 'zenorar_wishlist'

export interface WishlistItem {
  id: string
  productId: string
  addedAt: string
}

interface WishlistContextType {
  items: WishlistItem[]
  isLoading: boolean
  itemCount: number
  isInWishlist: (productId: string) => boolean
  addItem: (productId: string) => Promise<{ success: boolean; error?: string }>
  removeItem: (productId: string) => Promise<{ success: boolean; error?: string }>
  toggleItem: (productId: string) => Promise<{ success: boolean; error?: string }>
  clearWishlist: () => Promise<void>
  refreshWishlist: () => Promise<void>
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

// localStorage helpers (for guest users)
function loadFromStorage(): WishlistItem[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(WISHLIST_STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch (error) {
    console.error('Failed to load wishlist from storage:', error)
  }
  return []
}

function saveToStorage(items: WishlistItem[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items))
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load wishlist on mount and when auth state changes
  useEffect(() => {
    let cancelled = false

    async function loadWishlist() {
      setIsLoading(true)

      if (isAuthenticated) {
        // Logged in: fetch from database via API
        try {
          const result = await localApiFetch<WishlistItem[]>('/wishlist')
          if (!cancelled && result.success && Array.isArray(result.data)) {
            setItems(result.data)
          }
        } catch (error) {
          console.error('Failed to load wishlist from API:', error)
        }
      } else {
        // Guest: load from localStorage
        if (!cancelled) {
          setItems(loadFromStorage())
        }
      }

      if (!cancelled) {
        setIsLoading(false)
        setIsLoaded(true)
      }
    }

    loadWishlist()
    return () => { cancelled = true }
  }, [isAuthenticated])

  // Save to localStorage for guest users (only after initial load)
  useEffect(() => {
    if (!isLoaded || isAuthenticated) return
    saveToStorage(items)
  }, [items, isLoaded, isAuthenticated])

  const isInWishlist = useCallback((productId: string) => {
    return items.some(item => item.productId === productId)
  }, [items])

  const addItem = useCallback(async (productId: string) => {
    // Optimistic update
    setItems(current => {
      if (current.some(item => item.productId === productId)) return current
      return [...current, {
        id: `wish_${Date.now()}`,
        productId,
        addedAt: new Date().toISOString(),
      }]
    })

    if (isAuthenticated) {
      const result = await localApiFetch<WishlistItem>('/wishlist', {
        method: 'POST',
        body: JSON.stringify({ productId }),
      })
      if (!result.success) {
        // Revert on failure
        setItems(current => current.filter(item => item.productId !== productId))
        return { success: false, error: result.error }
      }
    }

    return { success: true }
  }, [isAuthenticated])

  const removeItem = useCallback(async (productId: string) => {
    // Optimistic update
    const previousItems = items
    setItems(current => current.filter(item => item.productId !== productId))

    if (isAuthenticated) {
      const result = await localApiFetch(`/wishlist/${productId}`, { method: 'DELETE' })
      if (!result.success) {
        // Revert on failure
        setItems(previousItems)
        return { success: false, error: result.error }
      }
    }

    return { success: true }
  }, [isAuthenticated, items])

  const toggleItem = useCallback(async (productId: string) => {
    if (isInWishlist(productId)) {
      return removeItem(productId)
    } else {
      return addItem(productId)
    }
  }, [isInWishlist, addItem, removeItem])

  const clearWishlist = useCallback(async () => {
    setItems([])
    if (isAuthenticated) {
      await localApiFetch('/wishlist', { method: 'DELETE' })
    }
  }, [isAuthenticated])

  const refreshWishlist = useCallback(async () => {
    if (isAuthenticated) {
      const result = await localApiFetch<WishlistItem[]>('/wishlist')
      if (result.success && Array.isArray(result.data)) {
        setItems(result.data)
      }
    } else {
      setItems(loadFromStorage())
    }
  }, [isAuthenticated])

  return (
    <WishlistContext.Provider
      value={{
        items,
        isLoading,
        itemCount: items.length,
        isInWishlist,
        addItem,
        removeItem,
        toggleItem,
        clearWishlist,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider')
  }
  return context
}
