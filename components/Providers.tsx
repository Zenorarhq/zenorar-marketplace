'use client'

import { ReactNode } from 'react'
import { CartProvider } from '@/lib/cart-context'
import LiveChat from '@/components/LiveChat'
import CartPopupWrapper from '@/components/cart/CartPopupWrapper'

interface ProvidersProps {
  children: ReactNode
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <CartProvider>
      {children}
      <LiveChat />
      <CartPopupWrapper />
    </CartProvider>
  )
}
