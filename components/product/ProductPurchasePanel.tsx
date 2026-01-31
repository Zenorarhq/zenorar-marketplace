'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Product } from '@/lib/types'
import { useCart } from '@/lib/cart-context'

interface ProductPurchasePanelProps {
  product: Product
}

export default function ProductPurchasePanel({ product }: ProductPurchasePanelProps) {
  const { addItem } = useCart()
  const [selectedLicense, setSelectedLicense] = useState<'standard' | 'extended'>('standard')
  const [isAdding, setIsAdding] = useState(false)
  const [showAddedMessage, setShowAddedMessage] = useState(false)

  const currentPrice = selectedLicense === 'extended'
    ? (product.priceRange?.max || product.price)
    : (product.priceRange?.min || product.price)

  const handleAddToCart = async () => {
    setIsAdding(true)
    try {
      addItem(product, selectedLicense)
      setShowAddedMessage(true)
      setTimeout(() => setShowAddedMessage(false), 2000)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDirectPurchase = () => {
    addItem(product, selectedLicense)
    window.location.href = '/checkout'
  }

  return (
    <div className="sticky top-24">
      {/* Main Purchase Card */}
      <div className="bg-charcoal p-6 rounded-2xl border border-border-dark shadow-xl">
        {/* Price */}
        <div className="flex items-baseline gap-2 mb-6">
          <span className="text-3xl font-extrabold text-white">
            ${currentPrice}
          </span>
          {product.priceRange && selectedLicense === 'standard' && (
            <>
              <span className="text-slate-500 text-sm">—</span>
              <span className="text-slate-500 text-sm">${product.priceRange.max}</span>
            </>
          )}
        </div>

        {/* License Select */}
        <div className="space-y-4 mb-6">
          <div>
            <label htmlFor="license-type" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              License Type
            </label>
            <select
              id="license-type"
              value={selectedLicense}
              onChange={(e) => setSelectedLicense(e.target.value as 'standard' | 'extended')}
              className="w-full bg-background-dark border-border-dark rounded-lg text-slate-300 text-sm focus:ring-primary focus:border-primary px-4 py-3"
            >
              <option value="standard">Standard License (${product.priceRange?.min || product.price})</option>
              <option value="extended">Extended License (${product.priceRange?.max || product.price})</option>
            </select>
          </div>
        </div>

        {/* Add to Cart Button */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isAdding}
          className="w-full bg-primary text-black font-bold py-4 rounded-xl mb-4 hover:brightness-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <span className="material-symbols-outlined" aria-hidden="true">shopping_cart</span>
          {showAddedMessage ? 'Added to Cart!' : isAdding ? 'Adding...' : 'Add to Cart'}
        </button>

        {/* Direct Purchase Button */}
        <button
          type="button"
          onClick={handleDirectPurchase}
          className="block w-full text-center text-primary text-sm font-bold hover:underline mb-8"
        >
          Direct Purchase
        </button>

        {/* Seller Info */}
        {product.seller && (
          <div className="space-y-6 pt-6 border-t border-border-dark">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-border-dark overflow-hidden">
                <Image
                  src={product.seller.avatar}
                  alt={product.seller.name}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-1">
                  {product.seller.name}
                  {product.seller.verified && (
                    <span className="material-symbols-outlined text-primary text-[14px] icon-filled" aria-label="Verified seller">
                      verified
                    </span>
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
                <span className="material-symbols-outlined text-sm" aria-hidden="true">mail</span>
                Contact Seller
              </Link>
              <Link
                href={`/products/${product.slug}/support`}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-sm" aria-hidden="true">support_agent</span>
                Technical Support
              </Link>
              <Link
                href={`/products/${product.slug}/docs`}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-sm" aria-hidden="true">description</span>
                Documentation
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Trust Badges */}
      <div className="mt-6 flex flex-col gap-3">
        <div className="bg-surface-dark border border-border-dark p-4 rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined text-primary" aria-hidden="true">security</span>
          <div className="text-xs">
            <div className="text-white font-bold">Secure Payment</div>
            <div className="text-slate-500">Encrypted transactions via Stripe</div>
          </div>
        </div>
        <div className="bg-surface-dark border border-border-dark p-4 rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined text-primary" aria-hidden="true">history</span>
          <div className="text-xs">
            <div className="text-white font-bold">Update Protection</div>
            <div className="text-slate-500">Free updates for 6 months</div>
          </div>
        </div>
      </div>
    </div>
  )
}
