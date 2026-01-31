'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Product, CartItem } from './types'

interface CartContextType {
  items: CartItem[]
  itemCount: number
  total: number
  addItem: (product: Product, license?: 'standard' | 'extended') => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const addItem = useCallback((product: Product, license: 'standard' | 'extended' = 'standard') => {
    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.product.id === product.id && item.license === license
      )

      const price = license === 'extended'
        ? (product.priceRange?.max || product.price)
        : (product.priceRange?.min || product.price)

      if (existingItem) {
        return currentItems.map((item) =>
          item.product.id === product.id && item.license === license
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }

      return [...currentItems, { product, quantity: 1, license, price }]
    })
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.product.id !== productId))
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    )
  }, [removeItem])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        total,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
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
