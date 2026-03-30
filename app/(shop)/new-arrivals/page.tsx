'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Icon from '@/components/ui/Icon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import ProductCard from '@/components/cards/ProductCard'

interface NewArrivalProduct {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  is_featured: boolean
  category_name: string | null
  average_rating: number
  review_count: number
  created_at: string | null
  images: { url: string; isPrimary: boolean }[] | null
  href?: string
}

export default function NewArrivalsPage() {
  const [visibleCount, setVisibleCount] = useState(12)

  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ['new-arrivals-all'],
    queryFn: async () => {
      const res = await fetch('/api/products/newest?limit=10')
      const json = await res.json()
      return json.success ? json.data : []
    },
  })

  const visibleProducts = products.slice(0, visibleCount)
  const hasMore = visibleCount < products.length

  return (
    <main className="max-w-container mx-auto px-4 lg:px-12 pb-24">
      <div className="py-4">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'New Arrivals' },
          ]}
          className="mb-0"
        />
      </div>

      <div className="bg-gradient-to-r from-[#43D678]/20 via-[#43D678]/10 to-transparent rounded-2xl lg:rounded-3xl p-6 lg:p-12 mb-8 lg:mb-12">
        <div className="flex items-center gap-3">
          <Icon name="sparkles" size={28} className="text-primary" />
          <div>
            <h1 className="text-2xl lg:text-4xl font-extrabold text-white">New Arrivals</h1>
            <p className="text-slate-500 text-sm lg:text-base mt-1">
              The latest products added across all categories.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-slate-400">Loading new arrivals...</p>
          </div>
        </div>
      ) : isError ? (
        <div className="text-center py-24">
          <Icon name="alert" size={64} className="text-red-500/60 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">Failed to load products</p>
          <p className="text-slate-500 text-sm mt-1">Please try refreshing the page.</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-24">
          <Icon name="package" size={64} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">No new arrivals found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {visibleProducts.map((p: NewArrivalProduct) => {
              const isNew = p.created_at && (Date.now() - new Date(p.created_at).getTime()) < 14 * 24 * 60 * 60 * 1000
              const badge = p.is_featured ? 'HOT' : isNew ? 'NEW' : undefined
              return (
                <ProductCard
                  key={p.id}
                  product={{
                    id: p.id,
                    name: p.name,
                    slug: p.slug,
                    description: p.description || '',
                    price: Number(p.price),
                    rating: Number(p.average_rating) || 0,
                    reviewCount: Number(p.review_count) || 0,
                    category: p.category_name ?? '',
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

          {hasMore && (
            <div className="mt-16 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 12)}
                className="bg-surface-dark border border-border-dark text-white px-8 py-3 rounded-xl font-bold hover:border-primary transition-all flex items-center gap-2"
              >
                Show More Results
                <Icon name="chevron-down" size={16} />
              </button>
            </div>
          )}

          <p className="mt-8 text-center text-slate-500 text-sm">
            Showing {visibleProducts.length} of {products.length} products
          </p>
        </>
      )}
    </main>
  )
}
