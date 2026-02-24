'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ProductCard from '@/components/cards/ProductCard'
import Icon from '@/components/ui/Icon'

interface StaffPickProduct {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  compare_price: number | null
  is_featured: boolean
  category_name: string | null
  average_rating: number
  review_count: number
  created_at: string | null
  images: { url: string; isPrimary: boolean }[] | null
}

export default function StaffPicks({ config }: { config?: { title?: string; columns?: string; style?: Record<string, any> } } = {}) {
  const [products, setProducts] = useState<StaffPickProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/products/staff-picks')
      .then(res => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setProducts(data.data)
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (!loading && !error && products.length === 0) return null

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className={`${({ small: 'text-xl', large: 'text-3xl', xl: 'text-4xl' } as Record<string, string>)[config?.style?.headingSize] || 'text-2xl'} ${({ normal: 'font-normal', semibold: 'font-semibold', extrabold: 'font-extrabold' } as Record<string, string>)[config?.style?.headingWeight] || 'font-bold'} text-primary flex items-center gap-2`}>
          <Icon name="crown" size={24} />
          {config?.title || 'Staff Picks'}
        </h2>
        <Link
          href="/staff-picks"
          className="text-sm text-slate-400 hover:text-primary transition-colors"
        >
          See all
        </Link>
      </div>

      {loading && (
        <div className={`grid grid-cols-2 ${({ '4': 'md:grid-cols-4', '5': 'md:grid-cols-5', '6': 'md:grid-cols-6' } as Record<string, string>)[config?.columns || '6'] || 'md:grid-cols-6'} gap-4`}>
          {Array.from({ length: Number(config?.columns || 6) }).map((_, i) => (
            <div key={i} className="bg-[#1a1a1a] rounded-xl h-64 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-slate-500 text-sm text-center py-8">Unable to load products. Please refresh the page.</p>
      )}

      {!loading && !error && <div
        className={`grid grid-flow-col auto-cols-[calc(50vw-2rem)] overflow-x-auto gap-4 ${({ '4': 'md:grid-cols-4', '5': 'md:grid-cols-5', '6': 'md:grid-cols-6' } as Record<string, string>)[config?.columns || '6'] || 'md:grid-cols-6'} md:grid-flow-row md:auto-cols-auto md:overflow-visible`}
        style={{ scrollbarWidth: 'none' }}
      >
        {products.map((p: any) => {
          const createdAt = p.createdAt || p.created_at
          const isNew = createdAt && (Date.now() - new Date(createdAt).getTime()) < 14 * 24 * 60 * 60 * 1000
          const isFeatured = p.isFeatured ?? p.is_featured
          const badge = isFeatured ? 'HOT' : isNew ? 'NEW' : undefined
          return (
            <ProductCard
              key={p.id}
              product={{
                id: p.id,
                name: p.name,
                slug: p.slug,
                description: p.description || '',
                price: Number(p.price),
                rating: Number(p.avgRating ?? p.average_rating) || 0,
                reviewCount: Number(p._count?.reviews ?? p.review_count) || 0,
                category: p.category?.name ?? p.category_name ?? '',
                icon: 'box',
                iconColor: 'primary',
                tags: [],
                images: p.images || undefined,
                badge,
              }}
            />
          )
        })}
      </div>}
    </section>
  )
}
