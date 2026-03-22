'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import { useCart } from '@/lib/cart-context'
import { usePreferences } from '@/contexts/PreferencesContext'

interface GiftCard {
  id: string
  brand: string
  slug: string
  category: string
  description?: string
  imageUrl?: string
  denominations: { value: number; available: boolean; stock: number; source: string }[]
  discountPercent: number
  isFeatured: boolean
  minCustomAmount: number | null
  maxCustomAmount: number | null
  hasApiProvider: boolean
}

export default function GiftCardPage() {
  const params = useParams()
  const slug = params.slug as string
  const { addItem, showAddedToCartPopup } = useCart()
  const { formatPrice } = usePreferences()
  const [card, setCard] = useState<GiftCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    fetch(`/api/gift-cards/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.giftCard) {
          setCard(data.giftCard)
          const first = data.giftCard.denominations?.[0]?.value
          if (first) setSelectedAmount(first)
        }
      })
      .catch(() => setCard(null))
      .finally(() => setLoading(false))
  }, [slug])

  const handleAddToCart = () => {
    if (!card || !selectedAmount) return
    const product: any = {
      id: card.id,
      name: `${card.brand} Gift Card`,
      slug: card.slug,
      description: card.description || `${card.brand} Gift Card`,
      price: selectedAmount,
      rating: 0,
      reviewCount: 0,
      category: 'Gift Cards',
      icon: 'gift',
      iconColor: 'primary',
      tags: ['gift-card'],
      images: card.imageUrl ? [{ url: card.imageUrl, isPrimary: true }] : undefined,
      product_type: 'gift_card',
      metadata: {
        productType: 'gift_card',
        giftCardId: card.id,
        denomination: selectedAmount,
        brand: card.brand,
      },
    }
    addItem(product)
    showAddedToCartPopup(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-surface-dark rounded-2xl" />
          <div className="h-8 bg-surface-dark rounded w-2/3" />
          <div className="h-24 bg-surface-dark rounded-2xl" />
          <div className="h-12 bg-surface-dark rounded-xl" />
        </div>
      </div>
    )
  }

  if (!card) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <Icon name="gift" size={48} className="text-slate-600 mx-auto mb-4" />
        <h2 className="text-white font-bold text-xl mb-2">Gift card not found</h2>
        <p className="text-slate-500 mb-6">This gift card is no longer available.</p>
        <Link href="/gift-cards" className="bg-primary text-black font-bold px-6 py-3 rounded-xl">Browse Gift Cards</Link>
      </div>
    )
  }

  const discountedAmount = selectedAmount && card.discountPercent > 0
    ? selectedAmount * (1 - card.discountPercent / 100)
    : selectedAmount

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/" className="hover:text-white transition-colors">Home</Link>
        <span>/</span>
        <Link href="/gift-cards" className="hover:text-white transition-colors">Gift Cards</Link>
        <span>/</span>
        <span className="text-white">{card.brand}</span>
      </nav>

      {/* Brand image */}
      {card.imageUrl ? (
        <div className="relative w-full h-48 rounded-2xl overflow-hidden mb-6 border border-border-dark bg-white/5 flex items-center justify-center">
          <img
            src={card.imageUrl}
            alt={card.brand}
            className="max-h-full max-w-full object-contain p-6"
          />
          {card.isFeatured && (
            <span className="absolute top-3 right-3 bg-primary text-black text-xs font-bold px-2 py-1 rounded-full">POPULAR</span>
          )}
          {card.discountPercent > 0 && (
            <span className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">{card.discountPercent}% OFF</span>
          )}
        </div>
      ) : (
        <div className="relative w-full h-32 rounded-2xl bg-surface-dark border border-border-dark flex items-center justify-center mb-6">
          <Icon name="gift" size={48} className="text-primary" />
        </div>
      )}

      <h1 className="text-2xl font-extrabold text-white mb-1">{card.brand} Gift Card</h1>
      {card.description && <p className="text-slate-400 mb-6">{card.description}</p>}

      {/* Denomination selector */}
      <div className="bg-surface-dark border border-border-dark rounded-2xl p-6 mb-6">
        <h2 className="text-white font-bold mb-4">Select Amount</h2>
        {card.denominations.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {card.denominations.map(d => (
              <button
                key={d.value}
                onClick={() => setSelectedAmount(d.value)}
                disabled={!d.available}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  selectedAmount === d.value
                    ? 'bg-primary text-black'
                    : d.available
                    ? 'bg-surface-dark border border-border-dark text-white hover:border-primary/50'
                    : 'opacity-40 cursor-not-allowed bg-surface-dark border border-border-dark text-slate-600'
                }`}
              >
                {formatPrice(d.value)}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">No denominations available</p>
        )}
      </div>

      {/* Price + CTA */}
      <div className="bg-surface-dark border border-border-dark rounded-2xl p-6">
        {selectedAmount && (
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400">You pay</span>
            <div className="text-right">
              {card.discountPercent > 0 ? (
                <>
                  <span className="text-slate-500 line-through text-sm mr-2">{formatPrice(selectedAmount)}</span>
                  <span className="text-3xl font-extrabold text-white">{formatPrice(discountedAmount!)}</span>
                </>
              ) : (
                <span className="text-3xl font-extrabold text-white">{formatPrice(selectedAmount)}</span>
              )}
            </div>
          </div>
        )}
        <button
          onClick={handleAddToCart}
          disabled={!selectedAmount}
          className="w-full bg-primary text-black font-bold py-3 rounded-xl hover:brightness-105 transition-all flex items-center justify-center gap-2 mb-3 disabled:opacity-50"
        >
          <Icon name="cart" size={18} />
          {added ? 'Added!' : 'Add to Cart'}
        </button>
        <Link
          href="/gift-cards"
          className="block w-full text-center bg-transparent border border-border-dark text-white font-bold py-3 rounded-xl hover:border-primary/50 transition-all"
        >
          Browse All Gift Cards
        </Link>
      </div>
    </div>
  )
}
