'use client'

import { useState, useEffect } from 'react'
import ProductCard from '@/components/cards/ProductCard'
import Icon from '@/components/ui/Icon'

interface PopularProduct {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  is_featured: boolean
  category_name: string | null
  average_rating: number
  review_count: number
  total_purchased: number
  created_at: string | null
  images: { url: string; isPrimary: boolean }[] | null
}

export default function MostPopular() {
  const [products, setProducts] = useState<PopularProduct[]>([])

  useEffect(() => {
    fetch('/api/products/popular')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setProducts(data.data)
        }
      })
      .catch(() => {})
  }, [])

  if (products.length === 0) return null

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold mb-6 text-primary flex items-center gap-2">
        <Icon name="chart" size={24} />
        Most Popular
      </h2>

      <div
        className="grid grid-rows-2 grid-flow-col auto-cols-[calc(50vw-2rem)] overflow-x-auto gap-4 md:grid-cols-4 md:grid-rows-none md:grid-flow-row md:auto-cols-auto md:overflow-visible"
        style={{ scrollbarWidth: 'none' }}
      >
        {products.map((p) => {
          const isNew = p.created_at && (Date.now() - new Date(p.created_at).getTime()) < 14 * 24 * 60 * 60 * 1000
          const badge = p.is_featured ? 'HOT' : isNew ? 'NEW' : undefined
          return (
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
                  badge,
                }}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}
