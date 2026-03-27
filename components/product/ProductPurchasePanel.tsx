'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import { Product } from '@/lib/types'
import { useCart } from '@/lib/cart-context'
import { usePreferences } from '@/contexts/PreferencesContext'
import { useAuth } from '@/contexts/AuthContext'
import { getAccessToken } from '@/lib/api/client'

interface ProductPurchasePanelProps {
  product: Product
}

export default function ProductPurchasePanel({ product }: ProductPurchasePanelProps) {
  const { addItem, showAddedToCartPopup, buyNow } = useCart()
  const { formatPrice } = usePreferences()
  const { isAuthenticated } = useAuth()
  const [selectedLicense, setSelectedLicense] = useState<'standard' | 'extended' | 'pro'>('standard')
  const [isAdding, setIsAdding] = useState(false)
  const [showAddedMessage, setShowAddedMessage] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  // Check initial wishlist state
  useEffect(() => {
    if (!isAuthenticated) return
    const token = getAccessToken()
    fetch('/api/wishlist', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setWishlisted(data.data?.some((w: any) => w.product_id === product.id) ?? false)
        }
      })
      .catch(() => {})
  }, [isAuthenticated, product.id])

  async function handleWishlist() {
    if (!isAuthenticated) return
    setWishlistLoading(true)
    const token = getAccessToken()
    try {
      if (wishlisted) {
        await fetch(`/api/wishlist/${product.id}`, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        setWishlisted(false)
      } else {
        await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ productId: product.id }),
        })
        setWishlisted(true)
      }
    } catch {
      // silent fail
    } finally {
      setWishlistLoading(false)
    }
  }

  async function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({ title: product.name, url }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    }
  }

  const currentPrice = selectedLicense === 'pro'
    ? (product.proPrice || product.price)
    : selectedLicense === 'extended'
      ? (product.priceRange?.max || product.price)
      : (product.priceRange?.min || product.price)

  const handleAddToCart = async () => {
    setIsAdding(true)
    try {
      addItem(product, selectedLicense, currentPrice)
      showAddedToCartPopup(product, currentPrice)
    } finally {
      setIsAdding(false)
    }
  }

  const handleBuyNow = () => {
    buyNow(product, selectedLicense, currentPrice)
  }

  return (
    <div className="sticky top-24">
      {/* Main Purchase Card */}
      <div className="bg-charcoal p-6 rounded-2xl border border-border-dark shadow-xl">
        {/* Purchase Count */}
        {product.purchaseCount != null && product.purchaseCount > 0 && (
          <div className="flex items-center gap-1.5 mb-2 text-sm text-slate-400">
            <Icon name="people" size={14} />
            <span>{product.purchaseCount.toLocaleString()} purchased</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-6">
          <span className="text-3xl font-extrabold text-white">
            {formatPrice(currentPrice)}
          </span>
          {product.priceRange && selectedLicense === 'standard' && (
            <>
              <span className="text-slate-500 text-sm">—</span>
              <span className="text-slate-500 text-sm">{formatPrice(product.priceRange.max)}</span>
            </>
          )}
        </div>

        {/* License Select - show when extended or pro price is set */}
        {(product.priceRange || product.proPrice) && (
          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="license-type" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                License Type
              </label>
              <select
                id="license-type"
                value={selectedLicense}
                onChange={(e) => setSelectedLicense(e.target.value as 'standard' | 'extended' | 'pro')}
                className="w-full bg-background-dark border-border-dark rounded-lg text-slate-300 text-sm focus:ring-primary focus:border-primary px-4 py-3"
              >
                <option value="standard">Standard License ({formatPrice(product.priceRange?.min || product.price)})</option>
                {product.priceRange && <option value="extended">Extended License ({formatPrice(product.priceRange.max)})</option>}
                {product.proPrice && <option value="pro">Pro License ({formatPrice(product.proPrice)})</option>}
              </select>
            </div>
          </div>
        )}

        {/* Add to Cart Button */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isAdding}
          className="w-full bg-primary text-black font-bold py-4 rounded-xl mb-4 hover:brightness-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Icon name="shopping-cart" size={20} />
          {showAddedMessage ? 'Added to Cart!' : isAdding ? 'Adding...' : 'Add to Cart'}
        </button>

        {/* Buy Now Button */}
        <button
          type="button"
          onClick={handleBuyNow}
          className="w-full bg-surface-dark border border-border-dark text-white font-bold py-3 rounded-xl hover:border-primary/50 transition-all flex items-center justify-center gap-2"
        >
          <Icon name="flash" size={18} />
          Buy Now
        </button>

        {/* Wishlist + Share row */}
        <div className="flex gap-2 mt-3 mb-8">
          <button
            type="button"
            onClick={handleWishlist}
            disabled={wishlistLoading || !isAuthenticated}
            title={isAuthenticated ? (wishlisted ? 'Remove from wishlist' : 'Add to wishlist') : 'Log in to save'}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all disabled:opacity-50 ${
              wishlisted
                ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                : 'bg-surface-dark border-border-dark text-slate-400 hover:text-white hover:border-slate-500'
            }`}
          >
            <Icon name="heart" size={16} className={wishlisted ? 'fill-red-400' : ''} />
            {wishlisted ? 'Saved' : 'Wishlist'}
          </button>
          <button
            type="button"
            onClick={handleShare}
            title="Share this product"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border-dark bg-surface-dark text-slate-400 hover:text-white hover:border-slate-500 text-sm font-medium transition-all"
          >
            <Icon name={shareCopied ? 'check' : 'share'} size={16} className={shareCopied ? 'text-green-400' : ''} />
            {shareCopied ? 'Copied!' : 'Share'}
          </button>
        </div>

        {/* Seller Info */}
        {product.seller && (
          <div className="space-y-6 pt-6 border-t border-border-dark">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-border-dark overflow-hidden">
                {product.seller.avatar ? (
                  <Image
                    src={product.seller.avatar}
                    alt={product.seller.name}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-slate-400 text-sm font-bold">
                    {product.seller.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-1">
                  {product.seller.name}
                  {product.seller.verified && (
                    <Icon name="verified" size={14} className="text-primary" />
                  )}
                </div>
                {product.seller.badge && (
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    {product.seller.badge}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Link
                href={`/seller/${product.seller.id}/contact`}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-primary transition-colors"
              >
                <Icon name="mail" size={14} />
                Contact Seller
              </Link>
              <Link
                href={`/products/${product.slug}/support`}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-primary transition-colors"
              >
                <Icon name="support-agent" size={14} />
                Technical Support
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Trust Badges */}
      <div className="mt-6 flex flex-col gap-3">
        <div className="bg-surface-dark border border-border-dark p-4 rounded-xl flex items-center gap-3">
          <Icon name="security" size={24} className="text-primary" />
          <div className="text-xs">
            <div className="text-white font-bold">Secure Payment</div>
            <div className="text-slate-500">Encrypted transactions via Stripe</div>
          </div>
        </div>
        <div className="bg-surface-dark border border-border-dark p-4 rounded-xl flex items-center gap-3">
          <Icon name="history" size={24} className="text-primary" />
          <div className="text-xs">
            <div className="text-white font-bold">Update Protection</div>
            <div className="text-slate-500">Free updates for 6 months</div>
          </div>
        </div>
      </div>
    </div>
  )
}
