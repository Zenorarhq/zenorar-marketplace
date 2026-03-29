'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import ProductCard from '@/components/cards/ProductCard'
import { CardVisualMini } from '@/components/cards/CardVisual'
import { getBitrefillSlug } from '@/components/ui/ServiceLogo'
import { getBitrefillImageUrl } from '@/lib/gift-cards/brand-images'
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

const CATEGORIES = ['All', 'Scripts', 'Gift Cards', 'Cards', 'Phone Refills', 'eSIM', 'Virtual Numbers'] as const

export default function PopularPage() {
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [visibleCount, setVisibleCount] = useState(12)
  const router = useRouter()
  const { formatPrice } = usePreferences()

  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ['popular-all'],
    queryFn: async () => {
      const res = await fetch('/api/products/popular?limit=10')
      const json = await res.json()
      return json.success ? json.data : []
    },
  })

  const filtered = activeCategory === 'All'
    ? products
    : products.filter((p: PopularProduct) => p.category_name === activeCategory)
  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  // --- Render helpers (same logic as MostPopular.tsx) ---

  const renderProductCard = (p: PopularProduct, imageOverride?: { url: string; isPrimary: boolean }[] | null) => {
    const createdAt = p.created_at
    const isNew = createdAt && (Date.now() - new Date(createdAt).getTime()) < 14 * 24 * 60 * 60 * 1000
    const badge = p.is_featured ? 'HOT' : isNew ? 'NEW' : undefined
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
          rating: Number(p.average_rating) || 0,
          reviewCount: Number(p.review_count) || 0,
          category: p.category_name ?? '',
          icon: iconMap[p.category_name ?? ''] ?? 'box',
          iconColor: 'primary',
          tags: [],
          images,
          badge,
          href: p.href,
        }}
      />
    )
  }

  const renderCardStyle = (p: PopularProduct) => {
    const brand: 'mastercard' | 'visa' = p.name.includes('Mastercard') ? 'mastercard' : 'visa'
    const type: 'instant' | 'virtual' = p.name.includes('Instant') ? 'instant' : 'virtual'
    return (
      <div
        key={p.id}
        onClick={() => router.push(p.href ?? '/cards')}
        className="bg-[#121212] rounded-xl border border-border-dark hover:ring-1 hover:ring-primary/50 transition-all cursor-pointer group overflow-hidden flex flex-col"
      >
        <div className="p-4 pb-0">
          <div className="relative w-full aspect-[4/3] bg-surface-dark rounded-xl border border-border-dark overflow-hidden flex items-center justify-center">
            <CardVisualMini brand={brand} type={type} className="scale-[1.2] md:scale-[1.6]" />
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-sm group-hover:text-primary transition-colors line-clamp-2">{p.name}</h3>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Icon name="credit-card" size={12} className="text-primary" />
            <span className="text-[10px] text-slate-500 uppercase font-bold">Cards</span>
          </div>
          <div className="flex items-center justify-between mt-auto">
            <p className="text-white font-bold text-base">{formatPrice(Number(p.price))}</p>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(p.href ?? '/cards') }}
              className="w-8 h-8 rounded-lg bg-surface-dark border border-border-dark flex items-center justify-center hover:bg-primary hover:text-black transition-colors"
              aria-label="View card"
            >
              <Icon name="arrow-right" size={18} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderCountryCard = (p: PopularProduct) => (
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

  const renderItem = (p: PopularProduct) => {
    if (p.category_name === 'Cards') return renderCardStyle(p)
    if (p.category_name === 'eSIM' || p.category_name === 'Virtual Numbers') return renderCountryCard(p)
    if (p.category_name === 'Gift Cards') {
      const imgUrl = getBitrefillImageUrl(p.name)
      return renderProductCard(p, imgUrl ? [{ url: imgUrl, isPrimary: true }] : p.images)
    }
    if (p.category_name === 'Phone Refills') {
      const slug = getBitrefillSlug(p.name)
      const imgUrl = slug ? `https://cdn.bitrefill.com/primg/i1w192h192/${slug}.webp` : null
      return renderProductCard(p, imgUrl ? [{ url: imgUrl, isPrimary: true }] : null)
    }
    return renderProductCard(p)
  }

  return (
    <main className="max-w-container mx-auto px-4 lg:px-12 pb-24">
      <div className="py-4">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Most Popular' },
          ]}
          className="mb-0"
        />
      </div>

      <div className="bg-gradient-to-r from-[#43D678]/20 via-[#43D678]/10 to-transparent rounded-2xl lg:rounded-3xl p-6 lg:p-12 mb-8 lg:mb-12">
        <div className="flex items-center gap-3">
          <Icon name="chart" size={28} className="text-primary" />
          <div>
            <h1 className="text-2xl lg:text-4xl font-extrabold text-white">Most Popular</h1>
            <p className="text-slate-500 text-sm lg:text-base mt-1">
              Our best-selling products across all categories, ranked by total purchases.
            </p>
          </div>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6" style={{ scrollbarWidth: 'none' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setVisibleCount(12) }}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeCategory === cat
                ? 'bg-primary text-black'
                : 'bg-charcoal border border-border-dark text-slate-400 hover:text-white hover:border-slate-500'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-slate-400">Loading popular products...</p>
          </div>
        </div>
      ) : isError ? (
        <div className="text-center py-24">
          <Icon name="alert" size={64} className="text-red-500/60 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">Failed to load products</p>
          <p className="text-slate-500 text-sm mt-1">Please try refreshing the page.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24">
          <Icon name="package" size={64} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">No popular products found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {visible.map((p: PopularProduct) => renderItem(p))}
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
            Showing {visible.length} of {filtered.length} products
          </p>
        </>
      )}
    </main>
  )
}