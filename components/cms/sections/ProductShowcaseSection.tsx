'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface Product {
  id: string
  name: string
  slug: string
  price: number
  average_rating: number
  review_count: number
  images: Array<{ url: string; isPrimary: boolean }> | null
}

interface ProductShowcaseSectionProps {
  props: {
    title?: string
    productIds?: string[]
    columns?: number
    showPrice?: boolean
    showRating?: boolean
    backgroundColor?: string
    padding?: 'none' | 'small' | 'medium' | 'large'
    cardBackgroundColor?: string
    cardBorderRadius?: 'none' | 'small' | 'medium' | 'large'
    hideOnMobile?: boolean
  }
}

export default function ProductShowcaseSection({ props }: ProductShowcaseSectionProps) {
  const {
    title,
    productIds = [],
    columns = 4,
    showPrice = true,
    showRating = true,
    backgroundColor,
    padding = 'large',
    cardBackgroundColor,
    cardBorderRadius = 'medium',
    hideOnMobile,
  } = props

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (productIds.length === 0) return

    let cancelled = false
    setLoading(true)

    fetch('/api/products/by-ids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: productIds }),
    })
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data.success) {
          // Preserve the order from productIds
          const productMap = new Map<string, Product>()
          for (const p of data.data) {
            productMap.set(p.id, p)
          }
          const ordered = productIds
            .map(id => productMap.get(id))
            .filter((p): p is Product => !!p)
          setProducts(ordered)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [productIds.join(',')])

  const gridCols: Record<number, string> = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
  }

  const paddingClasses: Record<string, string> = {
    none: 'py-4',
    small: 'py-6 sm:py-8',
    medium: 'py-10 sm:py-12 lg:py-16',
    large: 'py-10 sm:py-12 lg:py-20',
  }

  const cardRadiusClasses: Record<string, string> = {
    none: 'rounded-none',
    small: 'rounded-md',
    medium: 'rounded-lg sm:rounded-xl',
    large: 'rounded-2xl',
  }

  const getPrimaryImage = (product: Product): string | null => {
    if (!product.images || product.images.length === 0) return null
    const primary = product.images.find(img => img.isPrimary)
    return primary?.url || product.images[0]?.url || null
  }

  const renderStars = (rating: number) => {
    const rounded = Math.round(rating)
    return '★'.repeat(rounded) + '☆'.repeat(5 - rounded)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)
  }

  return (
    <section
      className={`${paddingClasses[padding]} px-4 ${hideOnMobile ? 'hidden md:block' : ''}`}
      style={{ backgroundColor: backgroundColor || undefined }}
    >
      <div className="max-w-6xl mx-auto">
        {title && (
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white text-center mb-8 sm:mb-10 lg:mb-16">
            {title}
          </h2>
        )}

        {productIds.length === 0 ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 sm:p-12 text-center">
            <p className="text-slate-500 text-sm sm:text-base">No products selected. Add product IDs in the editor.</p>
          </div>
        ) : loading ? (
          <div className={`grid ${gridCols[columns as number] || gridCols[4]} gap-3 sm:gap-4 lg:gap-6`}>
            {productIds.map((id, index) => (
              <div
                key={index}
                className={`border border-[#1f1f1f] ${cardRadiusClasses[cardBorderRadius]} overflow-hidden animate-pulse`}
                style={{ backgroundColor: cardBackgroundColor || '#141414' }}
              >
                <div className="aspect-square bg-[#1a1a1a]" />
                <div className="p-3 sm:p-4">
                  <div className="h-4 bg-[#1a1a1a] rounded w-3/4 mb-2" />
                  <div className="h-4 bg-[#1a1a1a] rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`grid ${gridCols[columns as number] || gridCols[4]} gap-3 sm:gap-4 lg:gap-6`}>
            {products.map((product) => {
              const imageUrl = getPrimaryImage(product)
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className={`border border-[#1f1f1f] ${cardRadiusClasses[cardBorderRadius]} overflow-hidden group hover:border-primary/30 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-1 transition-all block`}
                  style={{ backgroundColor: cardBackgroundColor || '#141414' }}
                >
                  <div className="aspect-square bg-[#1a1a1a] relative overflow-hidden">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <p className="text-slate-500 text-xs sm:text-sm">No image</p>
                      </div>
                    )}
                  </div>
                  <div className="p-3 sm:p-4">
                    <h3 className="text-white font-medium text-sm sm:text-base mb-1 sm:mb-2 truncate">{product.name}</h3>
                    {showPrice && (
                      <p className="text-primary font-bold text-sm sm:text-base">{formatPrice(product.price)}</p>
                    )}
                    {showRating && (
                      <div className="flex items-center gap-1 mt-1.5 sm:mt-2">
                        <span className="text-yellow-500 text-xs sm:text-sm">{renderStars(Number(product.average_rating))}</span>
                        <span className="text-slate-500 text-xs sm:text-sm">({product.review_count})</span>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}