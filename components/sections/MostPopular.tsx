'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ProductCard from '@/components/cards/ProductCard'
import Icon from '@/components/ui/Icon'
import { usePreferences } from '@/contexts/PreferencesContext'

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
  href?: string
}

const IMAGE_CATEGORIES = ['Scripts', 'Gift Cards']

const SCROLL_GRID = 'grid grid-flow-col overflow-x-auto gap-4 md:grid-cols-4 md:grid-rows-none md:grid-flow-row md:auto-cols-auto md:overflow-visible'

export default function MostPopular({ config }: { config?: { title?: string; columns?: string; style?: Record<string, any> } } = {}) {
  const [products, setProducts] = useState<PopularProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const { formatPrice } = usePreferences()

  useEffect(() => {
    fetch('/api/products/popular')
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

  const imageItems = products.filter(p => IMAGE_CATEGORIES.includes(p.category_name ?? ''))
  const listItems = products.filter(p => !IMAGE_CATEGORIES.includes(p.category_name ?? ''))

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className={`${({ small: 'text-xl', large: 'text-3xl', xl: 'text-4xl' } as Record<string, string>)[config?.style?.headingSize] || 'text-2xl'} ${({ normal: 'font-normal', semibold: 'font-semibold', extrabold: 'font-extrabold' } as Record<string, string>)[config?.style?.headingWeight] || 'font-bold'} text-primary flex items-center gap-2`}>
          <Icon name="chart" size={24} />
          {config?.title || 'Most Popular'}
        </h2>
        <Link href="/scripts/popular" className="text-sm text-slate-400 hover:text-primary transition-colors">
          See all
        </Link>
      </div>

      {loading && (
        <div>
          <div className="grid grid-cols-4 gap-4 mb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-[#1a1a1a] rounded-xl h-48 animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-[#1a1a1a] rounded-xl h-20 animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-slate-500 text-sm text-center py-8">Unable to load products. Please refresh the page.</p>
      )}

      {!loading && !error && (
        <>
          {/* Top 4 — Scripts + Gift Cards with images */}
          {imageItems.length > 0 && (
            <div
              className={`${SCROLL_GRID} grid-rows-1 auto-cols-[calc(50vw-2rem)] mb-4`}
              style={{ scrollbarWidth: 'none' }}
            >
              {imageItems.map((p: any) => {
                const createdAt = p.createdAt || p.created_at
                const isNew = createdAt && (Date.now() - new Date(createdAt).getTime()) < 14 * 24 * 60 * 60 * 1000
                const isFeatured = p.isFeatured ?? p.is_featured
                const badge = isFeatured ? 'HOT' : isNew ? 'NEW' : undefined
                return (
                  <ProductCard
                    key={p.id}
                    compact
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
                      href: p.href,
                    }}
                  />
                )
              })}
            </div>
          )}

          {/* Bottom 8 — eSIM, Virtual Numbers, Cards, Phone Refills (no images) */}
          {listItems.length > 0 && (
            <div
              className={`${SCROLL_GRID} grid-rows-2 auto-cols-[calc(50vw-2rem)]`}
              style={{ scrollbarWidth: 'none' }}
            >
              {listItems.map((p: any) => (
                <Link
                  key={p.id}
                  href={p.href ?? '#'}
                  className="bg-[#1a1a1a] rounded-xl border border-border-dark hover:border-primary/50 transition-all p-3 flex flex-col gap-1.5"
                >
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider truncate">{p.category_name}</span>
                  <p className="text-xs font-semibold text-white truncate leading-tight">{p.name}</p>
                  <p className="text-primary font-bold text-xs mt-auto">{formatPrice(Number(p.price))}</p>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
