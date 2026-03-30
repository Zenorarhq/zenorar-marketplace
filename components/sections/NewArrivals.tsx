'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ProductCard from '@/components/cards/ProductCard'
import Icon from '@/components/ui/Icon'
import { getBitrefillImageUrl } from '@/lib/gift-cards/brand-images'
import { usePreferences } from '@/contexts/PreferencesContext'

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
  data_amount_display?: string
  validity_days?: number
}

const ROW_GRID = 'grid grid-rows-1 grid-flow-col auto-cols-[calc(50vw-2rem)] overflow-x-auto gap-4 md:grid-cols-6 md:grid-rows-none md:grid-flow-row md:auto-cols-auto md:overflow-visible'

export default function NewArrivals({ config }: { config?: { title?: string; columns?: string; style?: Record<string, any> } } = {}) {
  const [products, setProducts] = useState<NewArrivalProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const { formatPrice } = usePreferences()

  useEffect(() => {
    fetch('/api/products/newest?limit=4')
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

  const scriptItems  = products.filter(p => p.category_name === 'Scripts').slice(0, 4)
  const giftItems    = products.filter(p => p.category_name === 'Gift Cards').slice(0, 2)
  const row1Items    = [...scriptItems, ...giftItems]
  const esimItems    = products.filter(p => p.category_name === 'eSIM').slice(0, 3)
  const vnItems      = products.filter(p => p.category_name === 'Virtual Numbers').slice(0, 3)
  const countryItems = [...esimItems, ...vnItems]

  const renderProductCard = (p: any, imageOverride?: { url: string; isPrimary: boolean }[] | null) => {
    const createdAt = p.createdAt || p.created_at
    const isNew = createdAt && (Date.now() - new Date(createdAt).getTime()) < 14 * 24 * 60 * 60 * 1000
    const isFeatured = p.isFeatured ?? p.is_featured
    const badge = isFeatured ? 'HOT' : isNew ? 'NEW' : undefined
    const images = imageOverride !== undefined ? (imageOverride ?? undefined) : (p.images ?? undefined)
    const iconMap: Record<string, string> = { 'Gift Cards': 'gift', 'Phone Refills': 'phone', 'Scripts': 'box' }
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
          icon: iconMap[p.category_name] ?? 'box',
          iconColor: 'primary',
          tags: [],
          images,
          badge,
          href: p.href,
        }}
      />
    )
  }

  const renderCountryCard = (p: any) => (
    <Link
      key={p.id}
      href={p.href ?? '#'}
      className="relative bg-[#121212] border border-border-dark rounded-xl overflow-hidden hover:border-primary/50 transition-all flex flex-col p-3 cursor-pointer min-h-[100px]"
    >
      {p.images?.[0]?.url && (
        <div
          className="absolute top-3 right-3 w-10 overflow-hidden flex-shrink-0"
          style={{ aspectRatio: '4/3', clipPath: 'polygon(0 0, 100% 0, 100% 72%, 72% 100%, 0 100%)' }}
        >
          <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="pr-12 mt-auto">
        <p className="font-semibold text-white text-xs truncate">{p.name}</p>
        {p.data_amount_display && (
          <p className="text-[10px] text-slate-400">{p.data_amount_display} · {p.validity_days}d</p>
        )}
        <p className="text-primary font-medium text-xs mt-0.5">{formatPrice(Number(p.price))}</p>
      </div>
    </Link>
  )

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className={`${({ small: 'text-xl', large: 'text-3xl', xl: 'text-4xl' } as Record<string, string>)[config?.style?.headingSize] || 'text-2xl'} ${({ normal: 'font-normal', semibold: 'font-semibold', extrabold: 'font-extrabold' } as Record<string, string>)[config?.style?.headingWeight] || 'font-bold'} text-primary flex items-center gap-2`}>
          <Icon name="sparkles" size={24} />
          {config?.title || 'New Arrivals'}
        </h2>
        <Link
          href="/new-arrivals"
          className="text-sm text-slate-400 hover:text-primary transition-colors"
        >
          See all
        </Link>
      </div>

      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-[#1a1a1a] rounded-xl h-44 animate-pulse" />)}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-[#1a1a1a] rounded-xl h-24 animate-pulse" />)}
          </div>
        </div>
      )}

      {error && (
        <p className="text-slate-500 text-sm text-center py-8">Unable to load products. Please refresh the page.</p>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {/* Row 1 — 4 Scripts + 2 Gift Cards — 6 columns */}
          {row1Items.length > 0 && (
            <div className={ROW_GRID} style={{ scrollbarWidth: 'none' }}>
              {row1Items.map((p: any) => {
                if (p.category_name === 'Gift Cards') {
                  const imgUrl = getBitrefillImageUrl(p.name)
                  return renderProductCard(p, imgUrl ? [{ url: imgUrl, isPrimary: true }] : p.images)
                }
                return renderProductCard(p)
              })}
            </div>
          )}

          {/* Row 2 — eSIM + Virtual Numbers — 6 columns */}
          {countryItems.length > 0 && (
            <div className={ROW_GRID} style={{ scrollbarWidth: 'none' }}>
              {countryItems.map(renderCountryCard)}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
