'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Product } from '@/lib/types'
import Icon from '@/components/ui/Icon'
import { usePreferences } from '@/contexts/PreferencesContext'
import { useWishlist } from '@/hooks/use-wishlist'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/contexts/AuthContext'

interface ProductCardProps {
  product: Product
}

const iconColorClasses: Record<string, string> = {
  orange: 'bg-orange-500/10 text-orange-500',
  green: 'bg-green-500/10 text-green-500',
  blue: 'bg-blue-500/10 text-blue-500',
  purple: 'bg-purple-500/10 text-purple-500',
  indigo: 'bg-indigo-500/10 text-indigo-500',
  primary: 'bg-primary/10 text-primary',
  pink: 'bg-pink-500/10 text-pink-500',
  cyan: 'bg-cyan-500/10 text-cyan-500',
  yellow: 'bg-yellow-500/10 text-yellow-500',
  red: 'bg-red-500/10 text-red-500',
}

export default function ProductCard({ product }: ProductCardProps) {
  const router = useRouter()
  const { formatPrice } = usePreferences()
  const { isInWishlist, toggleItem } = useWishlist()
  const { addItem, showAddedToCartPopup } = useCart()
  const { isAuthenticated } = useAuth()
  const colorClass = iconColorClasses[product.iconColor] || iconColorClasses.primary
  const images = product.images && product.images.length > 0 ? product.images : null
  const [imgIndex, setImgIndex] = useState(0)
  const touchStartX = useRef(0)
  const wishlisted = isInWishlist(product.id)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!images || images.length <= 1) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (diff > 30) setImgIndex((prev) => (prev + 1) % images.length)
    else if (diff < -30) setImgIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div
      onClick={() => router.push(`/products/${product.slug}`)}
      className="bg-white dark:bg-[#121212] rounded-xl border border-slate-200 dark:border-border-dark hover:ring-1 hover:ring-primary/50 transition-all cursor-pointer group overflow-hidden flex flex-col"
    >
      {/* Image carousel or icon */}
      {images ? (
        <div className="p-4 pb-0">
          <div
            className="relative w-full aspect-square bg-surface-dark rounded-xl border border-border-dark overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={images[imgIndex].url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80"
            />

            {/* Badge */}
            {product.badge && (
              <span className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded font-bold uppercase ${product.badge === 'HOT' ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'}`}>
                {product.badge}
              </span>
            )}

            {/* Wishlist heart - only show for authenticated users */}
            {isAuthenticated && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleItem(product.id) }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors"
                aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Icon name="heart" size={16} className={wishlisted ? 'text-red-500 fill-red-500' : 'text-white'} />
              </button>
            )}

            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.preventDefault(); setImgIndex((prev) => (prev - 1 + images.length) % images.length) }}
                  className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                >
                  ‹
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); setImgIndex((prev) => (prev + 1) % images.length) }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                >
                  ›
                </button>
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                  {images.map((_, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${i === imgIndex ? 'bg-primary' : 'bg-white/50'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="relative p-4 pb-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
            <Icon name={product.icon} size={24} />
          </div>
          {/* Badge for icon-only cards */}
          {product.badge && (
            <span className={`absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded font-bold uppercase ${product.badge === 'HOT' ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'}`}>
              {product.badge}
            </span>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Row 1: Name + Rating */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-sm group-hover:text-primary transition-colors line-clamp-2">
            {product.name}
          </h3>
          {product.rating > 0 && (
            <div className="flex items-center text-yellow-500 scale-75 origin-right flex-shrink-0">
              <Icon name="star" size={16} />
              <span className="text-slate-300 text-xs ml-1 font-bold">{product.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Row 2: Category */}
        {product.category && (
          <div className="flex items-center gap-2 mb-2">
            <Icon name={product.icon} size={12} className="text-primary" />
            <span className="text-[10px] text-slate-500 uppercase font-bold">{product.category}</span>
          </div>
        )}

        {/* Row 3: Price + Cart button */}
        <div className="flex items-center justify-between mt-auto">
          <p className="text-white font-bold text-base">
            {product.priceRange
              ? `${formatPrice(product.priceRange.min)} - ${formatPrice(product.priceRange.max)}`
              : formatPrice(product.price)}
          </p>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); addItem(product); showAddedToCartPopup(product) }}
            className="w-8 h-8 rounded-lg bg-surface-dark border border-border-dark flex items-center justify-center hover:bg-primary hover:text-black transition-colors touch-manipulation"
            aria-label="Add to cart"
          >
            <Icon name="add-shopping-cart" size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
