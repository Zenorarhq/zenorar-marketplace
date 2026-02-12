'use client'

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react'
import { cartApi, CartSummary, CartItem } from '@/lib/api'

interface CartContextType {
  cart: CartSummary | null
  isLoading: boolean
  itemCount: number
  addItem: (productId: string, quantity?: number, variantId?: string) => Promise<{ success: boolean; error?: string }>
  updateItem: (productId: string, quantity: number, variantId?: string) => Promise<{ success: boolean; error?: string }>
  removeItem: (productId: string, variantId?: string) => Promise<{ success: boolean; error?: string }>
  clearCart: () => Promise<void>
  refreshCart: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshCart = useCallback(async () => {
    setIsLoading(true)
    const result = await cartApi.get()
    if (result.success && result.data) {
      setCart(result.data)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    refreshCart()
  }, [refreshCart])

  const addItem = useCallback(async (productId: string, quantity = 1, variantId?: string) => {
    const result = await cartApi.addItem(productId, quantity, variantId)
    if (result.success && result.data) {
      setCart(result.data)
      return { success: true }
    }
    return { success: false, error: result.error || 'Failed to add item' }
  }, [])

  const updateItem = useCallback(async (productId: string, quantity: number, variantId?: string) => {
    const result = await cartApi.updateItem(productId, quantity, variantId)
    if (result.success && result.data) {
      setCart(result.data)
      return { success: true }
    }
    return { success: false, error: result.error || 'Failed to update item' }
  }, [])

  const removeItem = useCallback(async (productId: string, variantId?: string) => {
    const result = await cartApi.removeItem(productId, variantId)
    if (result.success && result.data) {
      setCart(result.data)
      return { success: true }
    }
    return { success: false, error: result.error || 'Failed to remove item' }
  }, [])

  const clearCart = useCallback(async () => {
    await cartApi.clear()
    setCart(null)
  }, [])

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        itemCount: cart?.itemCount || 0,
        addItem,
        updateItem,
        removeItem,
        clearCart,
        refreshCart,
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
