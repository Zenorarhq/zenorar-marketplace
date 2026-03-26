'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ProductCard from '@/components/cards/ProductCard'
import Icon from '@/components/ui/Icon'
import { usePreferences } from '@/contexts/PreferencesContext'
import { getBitrefillImageUrl } from '@/lib/gift-cards/brand-images'

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
    // Gift cards: fall back to Bitrefill CDN if DB image_url is null
    const gcImage = p.category_name === 'Gift Cards' && !p.images
      ? getBitrefillImageUrl(p.name)
      : null
    const images = p.images ?? (gcImage ? [{ url: gcImage, isPrimary: true }] : undefined)
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
          images,
          badge,
          href: p.href,
        }}
      />
    )
  }

  const renderCardChip = (p: any) => {
    const isMastercard = p.name.includes('Mastercard')
    const isInstant = p.name.includes('Instant')
    return (
      <Link
        key={p.id}
        href={p.href ?? '#'}
        className="rounded-xl overflow-hidden border border-border-dark hover:border-primary/50 transition-all flex flex-col"
      >
        <div
          className={`p-3 flex flex-col justify-between bg-gradient-to-br ${
            isMastercard
              ? 'from-emerald-900/60 via-teal-800/40 to-emerald-900/60'
              : 'from-blue-900/60 via-indigo-800/40 to-blue-900/60'
          }`}
          style={{ aspectRatio: '4/3' }}
        >
          <div className="flex items-start justify-between">
            <span className="text-white/80 text-[10px] font-semibold">
              {isMastercard ? 'Mastercard' : 'Visa'}
            </span>
            <span className={`px-1.5 py-0.5 text-[8px] rounded-full ${
              isInstant
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-blue-500/20 text-blue-400'
            }`}>
              {isInstant ? 'Instant' : 'Virtual'}
            </span>
          </div>
          <p className="text-white/40 font-mono text-[10px]">**** **** ****</p>
        </div>
        <div className="p-2 bg-[#121212]">
          <p className="text-[10px] font-semibold text-white truncate">{p.name}</p>
          <p className="text-primary font-bold text-[10px]">{formatPrice(Number(p.price))}</p>
        </div>
      </Link>
    )
  }

  const renderCountryChip = (p: any) => (
    <Link
      key={p.id}
      href={p.href ?? '#'}
      className="relative rounded-xl overflow-hidden border border-border-dark hover:border-primary/50 transition-all flex flex-col justify-end"
      style={{ minHeight: 100 }}
    >
      {p.images?.[0]?.url && (
        <img
          src={p.images[0].url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-25 blur-sm scale-110"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20" />
      <div className="relative z-10 p-2.5">
        <span className="text-[9px] text-slate-400 uppercase tracking-wider">{p.category_name}</span>
        <p className="text-xs font-semibold text-white truncate leading-tight">{p.name}</p>
        <p className="text-primary font-bold text-[11px] mt-0.5">{formatPrice(Number(p.price))}</p>
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
          {/* Row 1 — Scripts + Gift Cards (image cards) */}
          {imageItems.length > 0 && (
            <div className={SCROLL_GRID} style={{ scrollbarWidth: 'none' }}>
              {imageItems.map(renderProductCard)}
            </div>
          )}

          {/* Row 2 — Cards (custom credit card visual) + Phone Refills (brand logos) */}
          {logoItems.length > 0 && (
            <div className={SCROLL_GRID} style={{ scrollbarWidth: 'none' }}>
              {logoItems.map((p: any) =>
                p.category_name === 'Cards' ? renderCardChip(p) : renderProductCard(p)
              )}
            </div>
          )}

          {/* Row 3 — eSIM + Virtual Numbers (country flag chips) */}
          {countryItems.length > 0 && (
            <div className={SCROLL_GRID} style={{ scrollbarWidth: 'none' }}>
              {countryItems.map(renderCountryChip)}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
