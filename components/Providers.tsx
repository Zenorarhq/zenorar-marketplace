'use client'

import { ReactNode } from 'react'
import { CartProvider } from '@/lib/cart-context'

interface ProvidersProps {
  children: ReactNode
}

export default function Providers({ children }: ProvidersProps) {
  return <CartProvider>{children}</CartProvider>
}
