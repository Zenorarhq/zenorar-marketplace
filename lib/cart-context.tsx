'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Product, CartItem } from './types'
import { cartApi, CartSummary } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

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

export function CartProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [apiCart, setApiCart] = useState<CartSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [popupProduct, setPopupProduct] = useState<Product | null>(null)
  const [popupPrice, setPopupPrice] = useState<number | null>(null)

  const itemCount = apiCart?.itemCount ?? items.reduce((sum, item) => sum + item.quantity, 0)
  const total = apiCart?.total ?? items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  // Fetch cart from API
  const refreshCart = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await cartApi.get()
      if (result.success && result.data) {
        setApiCart(result.data)
        // Convert API cart items to local format for compatibility
        const convertedItems: CartItem[] = result.data.items.map((item) => ({
          product: {
            id: item.product.id,
            name: item.product.name,
            slug: item.product.slug,
            description: item.product.description || '',
            price: Number(item.product.price),
            rating: 0,
            reviewCount: 0,
            category: item.product.category?.name || '',
            icon: 'package',
            iconColor: 'text-blue-500',
            tags: [],
            image: item.product.images?.[0]?.url,
          },
          quantity: item.quantity,
          license: 'standard' as const,
          price: Number(item.product.price),
        }))
        setItems(convertedItems)
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch cart on mount and when auth changes
  useEffect(() => {
    refreshCart()
  }, [refreshCart, isAuthenticated])

  const addItem = useCallback(async (product: Product, license: 'standard' | 'extended' = 'standard', customPrice?: number) => {
    const price = customPrice ?? (license === 'extended'
      ? (product.priceRange?.max || product.price)
      : (product.priceRange?.min || product.price))

    // Optimistically update local state
    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.product.id === product.id && item.license === license
      )

      if (existingItem) {
        return currentItems.map((item) =>
          item.product.id === product.id && item.license === license
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }

      return [...currentItems, { product, quantity: 1, license, price }]
    })

    // Sync with API
    try {
      const result = await cartApi.addItem(product.id, 1)
      if (result.success && result.data) {
        setApiCart(result.data)
      }
    } catch (error) {
      console.error('Failed to add item to cart:', error)
      // Refresh to get correct state
      await refreshCart()
    }
  }, [refreshCart])

  const removeItem = useCallback(async (productId: string, license?: 'standard' | 'extended') => {
    // Optimistically update local state
    setItems((currentItems) => currentItems.filter((item) => {
      if (license) {
        return !(item.product.id === productId && item.license === license)
      }
      return item.product.id !== productId
    }))

    // Sync with API
    try {
      const result = await cartApi.removeItem(productId)
      if (result.success && result.data) {
        setApiCart(result.data)
      }
    } catch (error) {
      console.error('Failed to remove item from cart:', error)
      await refreshCart()
    }
  }, [refreshCart])

  const updateQuantity = useCallback(async (productId: string, quantity: number, license?: 'standard' | 'extended') => {
    if (quantity <= 0) {
      return removeItem(productId, license)
    }

    // Optimistically update local state
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

    // Sync with API
    try {
      const result = await cartApi.updateItem(productId, quantity)
      if (result.success && result.data) {
        setApiCart(result.data)
      }
    } catch (error) {
      console.error('Failed to update item quantity:', error)
      await refreshCart()
    }
  }, [removeItem, refreshCart])

  const clearCart = useCallback(async () => {
    setItems([])
    setApiCart(null)

    try {
      await cartApi.clear()
    } catch (error) {
      console.error('Failed to clear cart:', error)
    }
  }, [])

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

    // Redirect to checkout
    router.push('/checkout')
  }, [router])

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
