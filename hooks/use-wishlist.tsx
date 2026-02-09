'use client'

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react'
import { wishlistApi, WishlistItem } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

interface WishlistContextType {
  items: WishlistItem[]
  isLoading: boolean
  itemCount: number
  isInWishlist: (productId: string) => boolean
  addItem: (productId: string) => Promise<{ success: boolean; error?: string }>
  removeItem: (productId: string) => Promise<{ success: boolean; error?: string }>
  toggleItem: (productId: string) => Promise<{ success: boolean; error?: string }>
  moveToCart: (productId: string, quantity?: number) => Promise<{ success: boolean; error?: string }>
  clearWishlist: () => Promise<void>
  refreshWishlist: () => Promise<void>
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [wishlistSet, setWishlistSet] = useState<Set<string>>(new Set())

  const refreshWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([])
      setWishlistSet(new Set())
      return
    }

    setIsLoading(true)
    const result = await wishlistApi.get()
    if (result.success && result.data) {
      setItems(result.data)
      setWishlistSet(new Set(result.data.map(item => item.product.id)))
    }
    setIsLoading(false)
  }, [isAuthenticated])

  useEffect(() => {
    refreshWishlist()
  }, [refreshWishlist])

  const isInWishlist = useCallback((productId: string) => {
    return wishlistSet.has(productId)
  }, [wishlistSet])

  const addItem = useCallback(async (productId: string) => {
    if (!isAuthenticated) {
      return { success: false, error: 'Please login to add items to wishlist' }
    }

    const result = await wishlistApi.add(productId)
    if (result.success) {
      await refreshWishlist()
      return { success: true }
    }
    return { success: false, error: result.error || 'Failed to add to wishlist' }
  }, [isAuthenticated, refreshWishlist])

  const removeItem = useCallback(async (productId: string) => {
    const result = await wishlistApi.remove(productId)
    if (result.success) {
      await refreshWishlist()
      return { success: true }
    }
    return { success: false, error: result.error || 'Failed to remove from wishlist' }
  }, [refreshWishlist])

  const toggleItem = useCallback(async (productId: string) => {
    if (isInWishlist(productId)) {
      return removeItem(productId)
    } else {
      return addItem(productId)
    }
  }, [isInWishlist, addItem, removeItem])

  const moveToCart = useCallback(async (productId: string, quantity = 1) => {
    const result = await wishlistApi.moveToCart(productId, quantity)
    if (result.success) {
      await refreshWishlist()
      return { success: true }
    }
    return { success: false, error: result.error || 'Failed to move to cart' }
  }, [refreshWishlist])

  const clearWishlist = useCallback(async () => {
    await wishlistApi.clear()
    setItems([])
    setWishlistSet(new Set())
  }, [])

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
        moveToCart,
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
