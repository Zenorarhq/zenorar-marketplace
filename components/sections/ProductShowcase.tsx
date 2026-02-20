'use client'

import { useState, useEffect } from 'react'
import ProductCard from '@/components/cards/ProductCard'

interface ShowcaseProduct {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  is_featured: boolean
  category_name: string | null
  average_rating: number
  review_count: number
  images: { url: string; isPrimary: boolean }[] | null
}

export default function ProductShowcase({ config }: { config?: { title?: string; productIds?: string; columns?: string; style?: Record<string, any> } }) {
  const [products, setProducts] = useState<ShowcaseProduct[]>([])

  useEffect(() => {
    if (!config?.productIds) return
    const ids = config.productIds.split(',').map(s => s.trim()).filter(Boolean)
    if (ids.length === 0) return

    fetch('/api/products/by-ids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) setProducts(data.data)
      })
      .catch(() => {})
  }, [config?.productIds])

  const colsClass = ({ '2': 'md:grid-cols-2', '3': 'md:grid-cols-3', '4': 'md:grid-cols-4' } as Record<string, string>)[config?.columns || '4'] || 'md:grid-cols-4'

  if (products.length === 0 && !config?.productIds) {
    return (
      <section className="mb-12">
        <p className="text-slate-500 italic text-center py-8">No products configured. Edit this section to add product IDs.</p>
      </section>
    )
  }

  return (
    <section className="mb-12">
      {config?.title && (
        <h2 className={`${({ small: 'text-xl', large: 'text-3xl', xl: 'text-4xl' } as Record<string, string>)[config?.style?.headingSize] || 'text-2xl'} ${({ normal: 'font-normal', semibold: 'font-semibold', extrabold: 'font-extrabold' } as Record<string, string>)[config?.style?.headingWeight] || 'font-bold'} text-white mb-6`}>
          {config.title}
        </h2>
      )}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${colsClass} gap-4`}>
        {products.map(p => (
          <div key={p.id}>
            <ProductCard
              product={{
                id: p.id,
                name: p.name,
                slug: p.slug,
                description: p.description || '',
                price: Number(p.price),
                rating: Number(p.average_rating) || 0,
                reviewCount: Number(p.review_count) || 0,
                category: p.category_name || '',
                icon: 'box',
                iconColor: 'primary',
                tags: [],
                images: p.images || undefined,
                badge: p.is_featured ? 'HOT' : undefined,
              }}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
