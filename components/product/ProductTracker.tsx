'use client'

import { useEffect } from 'react'
import { trackViewContent } from '@/lib/tracking'

interface ProductTrackerProps {
  product: { id: string; name: string; price: number; category?: string }
}

export default function ProductTracker({ product }: ProductTrackerProps) {
  useEffect(() => {
    trackViewContent(product)
  }, [product.id])

  return null
}
