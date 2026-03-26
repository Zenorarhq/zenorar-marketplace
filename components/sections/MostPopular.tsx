'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ProductCard from '@/components/cards/ProductCard'
import GiftCardVisual from '@/components/cards/GiftCardVisual'
import { CardVisualMini } from '@/components/cards/CardVisual'
import Icon from '@/components/ui/Icon'
import ServiceLogo from '@/components/ui/ServiceLogo'
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
  data_amount_display?: string
  validity_days?: number
}

const SCROLL_GRID = 'grid grid-rows-1 grid-flow-col auto-cols-[calc(50vw-2rem)] overflow-x-auto gap-4 md:grid-cols-4 md:grid-rows-none md:grid-flow-row md:auto-cols-auto md:overflow-visible'

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

  const imageItems   = products.filter(p => ['Scripts', 'Gift Cards'].includes(p.category_name ?? ''))
  const logoItems    = products.filter(p => ['Cards', 'Phone Refills'].includes(p.category_name ?? ''))
  const countryItems = products.filter(p => ['eSIM', 'Virtual Numbers'].includes(p.category_name ?? ''))

  const renderProductCard = (p: any) => {
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
          images: p.images ?? undefined,
          badge,
          href: p.href,
        }}
      />
    )
  }

  const renderGiftCard = (p: any) => (
    <Link
      key={p.id}
      href={p.href ?? '#'}
      className="bg-charcoal border border-border-dark rounded-2xl overflow-hidden hover:border-primary/50 transition-all flex flex-col cursor-pointer"
    >
      <GiftCardVisual brand={p.name} category="gift cards" height="h-32" />
      <div className="p-3">
        <h3 className="font-bold text-white text-sm truncate">{p.name}</h3>
        <p className="text-primary font-medium text-sm">{formatPrice(Number(p.price))}</p>
      </div>
    </Link>
  )

  const renderCardMini = (p: any) => {
    const brand: 'mastercard' | 'visa' = p.name.includes('Mastercard') ? 'mastercard' : 'visa'
    const type: 'instant' | 'virtual' = p.name.includes('Instant') ? 'instant' : 'virtual'
    return (
      <Link
        key={p.id}
        href={p.href ?? '#'}
        className="bg-[#121212] border border-border-dark rounded-xl overflow-hidden hover:border-primary/50 transition-all flex flex-col items-center p-3 gap-2 cursor-pointer"
      >
        <CardVisualMini brand={brand} type={type} />
        <div className="text-center">
          <p className="text-[11px] font-semibold text-white truncate">{p.name}</p>
          <p className="text-primary font-bold text-[11px]">{formatPrice(Number(p.price))}</p>
        </div>
      </Link>
    )
  }

  const renderPhoneRefillCard = (p: any) => (
    <Link
      key={p.id}
      href={p.href ?? '#'}
      className="bg-[#121212] rounded-xl border border-border-dark hover:ring-1 hover:ring-primary/50 transition-all cursor-pointer group overflow-hidden flex flex-col"
    >
      <div className="p-3">
        <div className="w-full aspect-square bg-white rounded-xl border border-border-dark overflow-hidden flex items-center justify-center">
          <ServiceLogo name={p.name} size={80} className="rounded-lg" />
        </div>
      </div>
      <div className="p-3 pt-0">
        <h3 className="font-bold text-sm text-white group-hover:text-primary transition-colors truncate">{p.name}</h3>
        <p className="text-primary font-medium text-sm mt-0.5">{formatPrice(Number(p.price))}</p>
      </div>
    </Link>
  )

  const renderCountryCard = (p: any) => (
    <Link
      key={p.id}
      href={p.href ?? '#'}
      className="relative bg-[#121212] border border-border-dark rounded-xl overflow-hidden hover:border-primary/50 transition-all flex flex-col p-3 cursor-pointer min-h-[100px]"
    >
      {/* Small SIM-card shaped flag — top-right corner */}
      {p.images?.[0]?.url && (
        <div
          className="absolute top-3 right-3 w-10 overflow-hidden flex-shrink-0"
          style={{ aspectRatio: '4/3', clipPath: 'polygon(0 0, 100% 0, 100% 72%, 72% 100%, 0 100%)' }}
        >
          <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      {/* Text — left side, padded away from flag */}
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
          <Icon name="chart" size={24} />
          {config?.title || 'Most Popular'}
        </h2>
        <Link href="/scripts/popular" className="text-sm text-slate-400 hover:text-primary transition-colors">
          See all
        </Link>
      </div>

      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-[#1a1a1a] rounded-xl h-44 animate-pulse" />)}
          </div>
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-[#1a1a1a] rounded-xl h-36 animate-pulse" />)}
          </div>
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-[#1a1a1a] rounded-xl h-24 animate-pulse" />)}
          </div>
        </div>
      )}

      {error && (
        <p className="text-slate-500 text-sm text-center py-8">Unable to load products. Please refresh the page.</p>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {/* Row 1 — Scripts (ProductCard) + Gift Cards (GiftCardVisual) */}
          {imageItems.length > 0 && (
            <div className={SCROLL_GRID} style={{ scrollbarWidth: 'none' }}>
              {imageItems.map((p: any) =>
                p.category_name === 'Gift Cards' ? renderGiftCard(p) : renderProductCard(p)
              )}
            </div>
          )}

          {/* Row 2 — Phone Refills (ServiceLogo) + Cards (CardVisualMini) */}
          {logoItems.length > 0 && (
            <div className={SCROLL_GRID} style={{ scrollbarWidth: 'none' }}>
              {logoItems.map((p: any) =>
                p.category_name === 'Cards' ? renderCardMini(p) : renderPhoneRefillCard(p)
              )}
            </div>
          )}

          {/* Row 3 — eSIM + Virtual Numbers (SIM clip-path flag card) */}
          {countryItems.length > 0 && (
            <div className={SCROLL_GRID} style={{ scrollbarWidth: 'none' }}>
              {countryItems.map(renderCountryCard)}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
