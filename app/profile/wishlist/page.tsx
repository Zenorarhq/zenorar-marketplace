'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ProfileLayout from '@/components/profile/ProfileLayout'
import Icon from '@/components/ui/Icon'
import { useWishlist } from '@/hooks/use-wishlist'
import { useCart } from '@/lib/cart-context'
import { usePreferences } from '@/contexts/PreferencesContext'
import { apiFetch } from '@/lib/api/client'

interface WishlistProduct {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  is_featured: boolean
  category_name: string | null
  average_rating: number
  review_count: number
  images: { url: string; isPrimary: boolean }[] | null
}

export default function WishlistPage() {
  const { items, removeItem, clearWishlist } = useWishlist()
  const { addItem: addToCart, showAddedToCartPopup } = useCart()
  const { formatPrice } = usePreferences()
  const [products, setProducts] = useState<WishlistProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch product details for wishlisted IDs
  useEffect(() => {
    const productIds = items.map(item => item.productId)
    if (productIds.length === 0) {
      setProducts([])
      setIsLoading(false)
      return
    }

    apiFetch('/products/public/by-ids', {
      method: 'POST',
      body: JSON.stringify({ ids: productIds }),
    })
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setProducts(data.data)
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [items])

  const handleAddToCart = (product: WishlistProduct) => {
    const primaryImage = product.images?.find(img => img.isPrimary)?.url || product.images?.[0]?.url
    const cartProduct = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      price: Number(product.price),
      rating: Number(product.average_rating) || 0,
      reviewCount: Number(product.review_count) || 0,
      category: product.category_name || '',
      icon: 'box',
      iconColor: 'primary',
      tags: [] as string[],
      image: primaryImage,
      images: product.images || undefined,
    }
    addToCart(cartProduct)
    showAddedToCartPopup(cartProduct)
  }

  const handleRemove = (productId: string) => {
    removeItem(productId)
  }

  return (
    <ProfileLayout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">My Wishlist</h1>
            <p className="text-slate-400">
              {items.length === 0
                ? 'Save products you love for later.'
                : `${items.length} item${items.length !== 1 ? 's' : ''} saved.`}
            </p>
          </div>
          {items.length > 0 && (
            <button
              onClick={clearWishlist}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-red-400 transition-colors"
            >
              <Icon name="delete" size={18} />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading your wishlist...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && items.length === 0 && (
        <div className="text-center py-16">
          <Icon name="heart" size={64} className="text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Your wishlist is empty</h2>
          <p className="text-slate-400 mb-6">Browse products and click the heart icon to save them here.</p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 bg-primary text-black font-bold px-6 py-3 rounded-xl hover:brightness-105 transition-all"
          >
            <Icon name="compass" size={20} />
            Browse Products
          </Link>
        </div>
      )}

      {/* Wishlist Items */}
      {!isLoading && products.length > 0 && (
        <div className="space-y-4">
          {products.map((product) => {
            const primaryImage = product.images?.find(img => img.isPrimary)?.url || product.images?.[0]?.url
            return (
              <div
                key={product.id}
                className="bg-[#121212] border border-border-dark rounded-xl overflow-hidden shadow-lg"
              >
                <div className="p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-4 sm:gap-6">
                  {/* Image */}
                  <div className="h-16 w-16 rounded-xl bg-surface-dark border border-border-dark flex-shrink-0 overflow-hidden">
                    {primaryImage ? (
                      <img src={primaryImage} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary">
                        <Icon name="box" size={32} />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-grow">
                    <div className="flex flex-wrap items-center gap-3 mb-1">
                      <Link
                        href={`/products/${product.slug}`}
                        className="text-white font-bold text-base sm:text-lg hover:text-primary transition-colors"
                      >
                        {product.name}
                      </Link>
                      {product.is_featured && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-orange-500 text-white">
                          HOT
                        </span>
                      )}
                    </div>
                    {product.category_name && (
                      <p className="text-slate-500 text-sm mb-2">{product.category_name}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="text-white font-bold text-base">{formatPrice(Number(product.price))}</span>
                      {Number(product.average_rating) > 0 && (
                        <span className="flex items-center gap-1">
                          <Icon name="star" size={14} className="text-yellow-500 fill-yellow-500" />
                          {Number(product.average_rating).toFixed(1)}
                        </span>
                      )}
                      {Number(product.review_count) > 0 && (
                        <span>{product.review_count} review{Number(product.review_count) !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 sm:gap-3 flex-shrink-0">
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-2.5 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all"
                    >
                      <Icon name="shopping-cart" size={18} />
                      Add to Cart
                    </button>
                    <button
                      onClick={() => handleRemove(product.id)}
                      className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-surface-dark border border-border-dark rounded-lg text-slate-300 hover:text-red-400 hover:border-red-400/30 transition-colors"
                      aria-label="Remove from wishlist"
                    >
                      <Icon name="delete" size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </ProfileLayout>
  )
}
