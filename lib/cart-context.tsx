'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Product, CartItem } from './types'
import { useAuth } from '@/contexts/AuthContext'
import { localApiFetch } from '@/lib/api/client'
import type { CartSummary } from '@/lib/api'

interface CartContextType {
  // Local items for UI (supports legacy behavior)
  items: CartItem[]
  itemCount: number
  total: number
  // API cart data
  apiCart: CartSummary | null
  isLoading: boolean
  // Actions
  addItem: (product: Product, license?: 'standard' | 'extended', customPrice?: number) => Promise<void>
  removeItem: (productId: string, license?: 'standard' | 'extended') => Promise<void>
  updateQuantity: (productId: string, quantity: number, license?: 'standard' | 'extended') => Promise<void>
  clearCart: () => Promise<void>
  refreshCart: () => Promise<void>
  // Popup state
  showPopup: boolean
  popupProduct: Product | null
  popupPrice: number | null
  showAddedToCartPopup: (product: Product, price?: number) => void
  hidePopup: () => void
  // Buy now
  buyNow: (product: Product, license?: 'standard' | 'extended', customPrice?: number) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = 'zenorar_cart'

// Helper: load from localStorage
function loadFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem(CART_STORAGE_KEY)
  if (!stored) return []
  try {
    const data = JSON.parse(stored)
    return data.items || []
  } catch {
    return []
  }
}

// Helper: save to localStorage
function saveToStorage(items: CartItem[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items }))
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [apiCart, setApiCart] = useState<CartSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [popupProduct, setPopupProduct] = useState<Product | null>(null)
  const [popupPrice, setPopupPrice] = useState<number | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load cart on mount and when auth state changes
  useEffect(() => {
    let cancelled = false

    async function loadCart() {
      setIsLoading(true)

      if (isAuthenticated) {
        try {
          const result = await localApiFetch<any[]>('/cart')
          if (!cancelled && result.success && Array.isArray(result.data)) {
            // Map API response to CartItem[]
            const cartItems: CartItem[] = result.data.map((item: any) => ({
              product: item.product,
              quantity: item.quantity,
              license: item.license || 'standard',
              price: item.price,
            }))
            setItems(cartItems)
          }
        } catch (error) {
          console.error('Failed to load cart from API:', error)
          // Fallback to localStorage
          if (!cancelled) setItems(loadFromStorage())
        }
      } else {
        if (!cancelled) setItems(loadFromStorage())
      }

      if (!cancelled) {
        setIsLoading(false)
        setIsLoaded(true)
      }
    }

    loadCart()
    return () => { cancelled = true }
  }, [isAuthenticated])

  // Save to localStorage for guest users only (after initial load)
  useEffect(() => {
    if (!isLoaded || isAuthenticated) return
    saveToStorage(items)
  }, [items, isLoaded, isAuthenticated])

  // Always calculate from items
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const result = await localApiFetch<any[]>('/cart')
      if (result.success && Array.isArray(result.data)) {
        const cartItems: CartItem[] = result.data.map((item: any) => ({
          product: item.product,
          quantity: item.quantity,
          license: item.license || 'standard',
          price: item.price,
        }))
        setItems(cartItems)
      }
    } catch (error) {
      console.error('Failed to refresh cart:', error)
    }
  }, [isAuthenticated])

  const addItem = useCallback(async (product: Product, license: 'standard' | 'extended' = 'standard', customPrice?: number) => {
    const price = customPrice ?? (license === 'extended'
      ? (product.priceRange?.max || product.price)
      : (product.priceRange?.min || product.price))

    // Optimistic update — capture the new quantity for API sync
    let newQuantity = 1
    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.product.id === product.id && item.license === license
      )

      if (existingItem) {
        newQuantity = existingItem.quantity + 1
        return currentItems.map((item) =>
          item.product.id === product.id && item.license === license
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }

      return [...currentItems, { product, quantity: 1, license, price }]
    })

    // Sync to API if authenticated — send absolute target quantity
    if (isAuthenticated) {
      try {
        await localApiFetch('/cart/items', {
          method: 'POST',
          body: JSON.stringify({ productId: product.id, quantity: newQuantity, license, price }),
        })
      } catch (error) {
        console.warn('Failed to sync cart add with API:', error)
      }
    }
  }, [isAuthenticated])

  const removeItem = useCallback(async (productId: string, license?: 'standard' | 'extended') => {
    // Save current state for rollback
    const previousItems = items

    // Optimistic update
    setItems((currentItems) => currentItems.filter((item) => {
      if (license) {
        return !(item.product.id === productId && item.license === license)
      }
      return item.product.id !== productId
    }))

    // Sync to API if authenticated
    if (isAuthenticated) {
      const licenseParam = license || 'standard'
      const result = await localApiFetch(`/cart/items/${productId}?license=${licenseParam}`, {
        method: 'DELETE',
      })
      if (!result.success) {
        console.warn('Failed to sync cart removal with API:', result.error)
        setItems(previousItems) // Rollback on failure
      }
    }
  }, [isAuthenticated, items])

  const updateQuantity = useCallback(async (productId: string, quantity: number, license?: 'standard' | 'extended') => {
    if (quantity <= 0) {
      return removeItem(productId, license)
    }

    // Save current state for rollback
    const previousItems = items

    // Optimistic update
    setItems((currentItems) =>
      currentItems.map((item) => {
        if (license) {
          return item.product.id === productId && item.license === license
            ? { ...item, quantity }
            : item
        }
        return item.product.id === productId ? { ...item, quantity } : item
      })
    )

    // Sync to API if authenticated
    if (isAuthenticated) {
      const result = await localApiFetch(`/cart/items/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity, license: license || 'standard' }),
      })
      if (!result.success) {
        console.warn('Failed to sync quantity update with API:', result.error)
        setItems(previousItems) // Rollback on failure
      }
    }
  }, [isAuthenticated, items, removeItem])

  const clearCart = useCallback(async () => {
    const previousItems = items
    setItems([])
    setApiCart(null)

    if (isAuthenticated) {
      try {
        await localApiFetch('/cart', { method: 'DELETE' })
      } catch (error) {
        console.error('Failed to clear cart via API:', error)
        setItems(previousItems) // Rollback on failure
      }
    }
  }, [isAuthenticated, items])

  const showAddedToCartPopup = useCallback((product: Product, price?: number) => {
    setPopupProduct(product)
    setPopupPrice(price ?? null)
    setShowPopup(true)
  }, [])

  const hidePopup = useCallback(() => {
    setShowPopup(false)
    setPopupProduct(null)
    setPopupPrice(null)
  }, [])

  const buyNow = useCallback((product: Product, license: 'standard' | 'extended' = 'standard', customPrice?: number) => {
    const price = customPrice ?? (license === 'extended'
      ? (product.priceRange?.max || product.price)
      : (product.priceRange?.min || product.price))

    // Clear cart and add only this item
    setItems([{ product, quantity: 1, license, price }])

    // Sync to API if authenticated
    if (isAuthenticated) {
      localApiFetch('/cart', { method: 'DELETE' }).then(() => {
        localApiFetch('/cart/items', {
          method: 'POST',
          body: JSON.stringify({ productId: product.id, quantity: 1, license, price }),
        })
      }).catch(console.warn)
    }

    // Redirect to checkout
    router.push('/checkout')
  }, [router, isAuthenticated])

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        total,
        apiCart,
        isLoading,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        refreshCart,
        showPopup,
        popupProduct,
        popupPrice,
        showAddedToCartPopup,
        hidePopup,
        buyNow,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
