'use client'

import { useState, useEffect } from 'react'
import Icon from '@/components/ui/Icon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { useCart } from '@/lib/cart-context'

interface GiftCard {
  id: string
  brand: string
  slug: string
  category: string
  description: string
  imageUrl: string | null
  denominations: number[]
  discountPercent: number
  isFeatured: boolean
  minCustomAmount: number | null
  maxCustomAmount: number | null
  inStock: boolean
}

interface Category {
  name: string
  count: number
}

const categoryIcons: Record<string, string> = {
  gaming: 'game-controller',
  streaming: 'play-circle',
  shopping: 'cart',
  food: 'coffee',
  travel: 'airplane',
  entertainment: 'film',
  retail: 'store',
  other: 'gift'
}

// Category-based gradient colors for card image backgrounds
const categoryGradients: Record<string, string> = {
  gaming: 'from-purple-900/80 via-purple-800/60 to-indigo-900/80',
  streaming: 'from-red-900/80 via-rose-800/60 to-pink-900/80',
  shopping: 'from-blue-900/80 via-cyan-800/60 to-teal-900/80',
  food: 'from-orange-900/80 via-amber-800/60 to-yellow-900/80',
  travel: 'from-sky-900/80 via-blue-800/60 to-indigo-900/80',
  entertainment: 'from-pink-900/80 via-fuchsia-800/60 to-purple-900/80',
  retail: 'from-emerald-900/80 via-green-800/60 to-teal-900/80',
  other: 'from-slate-800/80 via-slate-700/60 to-slate-800/80'
}

export default function GiftCardsPage() {
  const { addItem, showAddedToCartPopup, buyNow } = useCart()
  const [giftCards, setGiftCards] = useState<GiftCard[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [selectedDenomination, setSelectedDenomination] = useState<number | null>(null)
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({})
  const [showCustomInput, setShowCustomInput] = useState<Record<string, boolean>>({})

  // Fetch gift cards from API
  useEffect(() => {
    async function fetchGiftCards() {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (selectedCategory) params.set('category', selectedCategory)
        if (searchQuery) params.set('search', searchQuery)

        const response = await fetch(`/api/gift-cards?${params.toString()}`)
        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch gift cards')
        }

        setGiftCards(data.giftCards)
        setCategories(data.categories)
        setError(null)
      } catch (err: any) {
        console.error('Error fetching gift cards:', err)
        setError(err.message || 'Failed to load gift cards')
      } finally {
        setLoading(false)
      }
    }

    fetchGiftCards()
  }, [selectedCategory, searchQuery])

  const popularCards = giftCards.filter(card => card.isFeatured)

  const getEffectiveAmount = (cardId: string): number | null => {
    if (showCustomInput[cardId] && customAmounts[cardId]) {
      const amount = parseFloat(customAmounts[cardId])
      return isNaN(amount) ? null : amount
    }
    return selectedCard === cardId ? selectedDenomination : null
  }

  const handleAddToCart = async (card: GiftCard) => {
    const amount = getEffectiveAmount(card.id)
    if (!amount) return

    const discountedPrice = amount * (1 - card.discountPercent / 100)

    // Try to reserve a code first (only for authenticated users with bulk inventory)
    let reservedCodeId: string | undefined
    try {
      const reserveResponse = await fetch('/api/gift-cards/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftCardId: card.id, denomination: amount })
      })
      const reserveData = await reserveResponse.json()
      if (reserveData.success) {
        reservedCodeId = reserveData.codeId
      }
      // If reservation fails, we can still add to cart - the code will be assigned at checkout
    } catch (err) {
      // Reservation is optional - continue without it
      console.log('Code reservation not available:', err)
    }

    // Create a product object for the cart with gift card metadata
    const product = {
      id: `gc-${card.id}-${amount}`,
      name: `${card.brand} Gift Card ($${amount})`,
      slug: card.slug,
      description: card.description || '',
      price: discountedPrice,
      rating: 5,
      reviewCount: 0,
      category: 'Gift Cards',
      icon: 'gift',
      iconColor: 'primary',
      tags: [card.brand, 'Gift Card'],
      productType: 'gift_card',
      metadata: {
        gift_card_id: card.id,
        denomination: amount,
        brand: card.brand,
        reserved_code_id: reservedCodeId
      }
    }

    addItem(product, 'standard', discountedPrice)
    showAddedToCartPopup(product, discountedPrice)
  }

  const handleBuyNow = async (card: GiftCard) => {
    const amount = getEffectiveAmount(card.id)
    if (!amount) return

    const discountedPrice = amount * (1 - card.discountPercent / 100)

    // Try to reserve a code first
    let reservedCodeId: string | undefined
    try {
      const reserveResponse = await fetch('/api/gift-cards/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftCardId: card.id, denomination: amount })
      })
      const reserveData = await reserveResponse.json()
      if (reserveData.success) {
        reservedCodeId = reserveData.codeId
      }
    } catch (err) {
      console.log('Code reservation not available:', err)
    }

    const product = {
      id: `gc-${card.id}-${amount}`,
      name: `${card.brand} Gift Card ($${amount})`,
      slug: card.slug,
      description: card.description || '',
      price: discountedPrice,
      rating: 5,
      reviewCount: 0,
      category: 'Gift Cards',
      icon: 'gift',
      iconColor: 'primary',
      tags: [card.brand, 'Gift Card'],
      productType: 'gift_card',
      metadata: {
        gift_card_id: card.id,
        denomination: amount,
        brand: card.brand,
        reserved_code_id: reservedCodeId
      }
    }

    buyNow(product, 'standard', discountedPrice)
  }

  const toggleCustomInput = (cardId: string) => {
    setShowCustomInput(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }))
    if (!showCustomInput[cardId]) {
      setSelectedCard(cardId)
      setSelectedDenomination(null)
    }
  }

  return (
    <main className="max-w-container mx-auto px-4 lg:px-12 pb-24">
      {/* Breadcrumbs */}
      <div className="py-4">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Gift Cards' }
          ]}
          className="mb-0"
        />
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#43D678]/20 via-[#43D678]/10 to-transparent rounded-2xl lg:rounded-3xl p-4 lg:p-12 mb-8 lg:mb-12">
        <div className="max-w-2xl">
          <h1 className="text-2xl lg:text-4xl font-extrabold text-white mb-4">
            Digital Gift Cards
          </h1>
          <p className="text-slate-400 text-sm lg:text-lg mb-6 lg:mb-8">
            Instant delivery. Save up to 10% on popular brands. Perfect for gifting or personal use.
          </p>

          {/* Search Bar */}
          <div className="relative">
            <Icon name="search" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search gift cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-surface-dark border border-border-dark rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="text-center py-20">
          <Icon name="alert-circle" size={48} className="text-red-500 mx-auto mb-4" />
          <h3 className="text-white font-bold mb-2">Failed to load gift cards</h3>
          <p className="text-slate-500">{error}</p>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Popular Cards */}
          {!selectedCategory && !searchQuery && popularCards.length > 0 && (
            <div className="mb-12">
              <h2 className="text-xl font-bold text-white mb-6">Popular Gift Cards</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {popularCards.slice(0, 5).map((card) => (
                  <button
                    key={card.id}
                    onClick={() => setSelectedCard(card.id)}
                    className="bg-charcoal border border-border-dark hover:border-primary/50 rounded-2xl overflow-hidden transition-all text-center group"
                  >
                    <div className={`relative h-24 ${!card.imageUrl ? `bg-gradient-to-br ${categoryGradients[card.category?.toLowerCase()] || categoryGradients.other}` : 'bg-surface-dark'} flex items-center justify-center overflow-hidden`}>
                      {card.imageUrl ? (
                        <img
                          src={card.imageUrl}
                          alt={card.brand}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Icon name="gift" size={24} className="text-white/80" />
                        </div>
                      )}
                      {card.discountPercent > 0 && (
                        <span className="absolute top-1.5 right-1.5 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg">
                          {card.discountPercent}%
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-white text-sm line-clamp-1">{card.brand}</h3>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category Filter */}
          <div className="mb-10">
            <h2 className="text-xl font-bold text-white mb-4">Browse by Category</h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`flex-shrink-0 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
                  !selectedCategory
                    ? 'bg-primary text-white'
                    : 'bg-charcoal border border-border-dark text-slate-400 hover:text-white'
                }`}
              >
                All Cards
              </button>
              {categories.map((category) => (
                <button
                  key={category.name}
                  onClick={() => setSelectedCategory(selectedCategory === category.name ? null : category.name)}
                  className={`flex-shrink-0 px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                    selectedCategory === category.name
                      ? 'bg-primary text-white'
                      : 'bg-charcoal border border-border-dark text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon name={categoryIcons[category.name.toLowerCase()] || 'gift'} size={16} />
                  {category.name}
                  <span className="text-xs opacity-70">({category.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {selectedCategory
                  ? `${selectedCategory} Gift Cards`
                  : 'All Gift Cards'}
              </h2>
              <span className="text-slate-500 text-sm">{giftCards.length} cards available</span>
            </div>

            {giftCards.length === 0 ? (
              <div className="text-center py-16 bg-charcoal border border-border-dark rounded-2xl">
                <Icon name="gift" size={48} className="text-slate-600 mx-auto mb-4" />
                <h3 className="text-white font-bold mb-2">No gift cards found</h3>
                <p className="text-slate-500">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {giftCards.map((card) => {
                  const effectiveAmount = getEffectiveAmount(card.id)
                  const hasAmount = effectiveAmount !== null && effectiveAmount > 0

                  return (
                    <div
                      key={card.id}
                      className={`bg-charcoal border rounded-2xl overflow-hidden transition-all ${
                        selectedCard === card.id
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-border-dark hover:border-primary/50'
                      }`}
                    >
                      {/* Card Image Header */}
                      <div className={`relative h-32 ${!card.imageUrl ? `bg-gradient-to-br ${categoryGradients[card.category?.toLowerCase()] || categoryGradients.other}` : 'bg-surface-dark'} flex items-center justify-center overflow-hidden`}>
                        {card.imageUrl ? (
                          <img
                            src={card.imageUrl}
                            alt={card.brand}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to gradient + icon if image fails to load
                              e.currentTarget.style.display = 'none'
                              const parent = e.currentTarget.parentElement
                              if (parent) {
                                parent.classList.add('bg-gradient-to-br', categoryGradients[card.category?.toLowerCase()] || categoryGradients.other)
                              }
                              e.currentTarget.nextElementSibling?.classList.remove('hidden')
                            }}
                          />
                        ) : null}
                        <div className={`${card.imageUrl ? 'hidden' : ''} absolute inset-0 flex items-center justify-center`}>
                          <div className="w-16 h-16 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                            <Icon name="gift" size={32} className="text-white/80" />
                          </div>
                        </div>
                        {/* Badges overlaid on image */}
                        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                          {card.discountPercent > 0 && (
                            <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-md shadow-lg">
                              {card.discountPercent}% OFF
                            </span>
                          )}
                          {!card.inStock && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-md shadow-lg">
                              Out of Stock
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-5">
                        <h3 className="font-bold text-white text-lg mb-1 line-clamp-1">{card.brand}</h3>
                        <p className="text-sm text-slate-500 mb-4 line-clamp-1">{card.description || card.category}</p>

                        {/* Denomination Selector */}
                        <div className="mb-4">
                          <p className="text-xs text-slate-500 mb-2">Select Amount</p>
                          <div className="flex flex-wrap gap-2">
                            {card.denominations.map((amount) => (
                              <button
                                key={amount}
                                onClick={() => {
                                  setSelectedCard(card.id)
                                  setSelectedDenomination(amount)
                                  setShowCustomInput(prev => ({ ...prev, [card.id]: false }))
                                }}
                                className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                                  selectedCard === card.id && selectedDenomination === amount && !showCustomInput[card.id]
                                    ? 'bg-primary text-white'
                                    : 'bg-surface-dark border border-border-dark text-slate-300 hover:border-primary/50'
                                }`}
                              >
                                ${amount}
                              </button>
                            ))}
                            {card.maxCustomAmount && (
                              <button
                                onClick={() => toggleCustomInput(card.id)}
                                className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                                  showCustomInput[card.id]
                                    ? 'bg-primary text-white'
                                    : 'bg-surface-dark border border-border-dark text-slate-300 hover:border-primary/50'
                                }`}
                              >
                                Other
                              </button>
                            )}
                          </div>

                          {/* Custom Amount Input */}
                          {showCustomInput[card.id] && (
                            <div className="mt-3">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                <input
                                  type="number"
                                  min={card.minCustomAmount || 1}
                                  max={card.maxCustomAmount || undefined}
                                  placeholder={`${card.minCustomAmount || 1} - ${card.maxCustomAmount || '500'}`}
                                  value={customAmounts[card.id] || ''}
                                  onChange={(e) => setCustomAmounts(prev => ({ ...prev, [card.id]: e.target.value }))}
                                  className="w-full pl-7 pr-4 py-2 bg-surface-dark border border-border-dark rounded-lg text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Price Display */}
                        {hasAmount && (
                          <div className="mb-4 p-3 bg-surface-dark rounded-xl">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Card Value</span>
                              <span className="text-white">${effectiveAmount!.toFixed(2)}</span>
                            </div>
                            {card.discountPercent > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Discount ({card.discountPercent}%)</span>
                                <span className="text-green-400">-${(effectiveAmount! * card.discountPercent / 100).toFixed(2)}</span>
                              </div>
                            )}
                            <div className="border-t border-border-dark my-2"></div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-bold">You Pay</span>
                              <span className="text-white font-extrabold">
                                ${(effectiveAmount! * (1 - card.discountPercent / 100)).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="space-y-2">
                          <button
                            onClick={() => handleAddToCart(card)}
                            disabled={!hasAmount || !card.inStock}
                            className={`w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                              hasAmount && card.inStock
                                ? 'bg-primary text-black hover:brightness-105'
                                : 'bg-surface-dark text-slate-400 border border-border-dark cursor-not-allowed'
                            }`}
                          >
                            <Icon name="cart" size={18} />
                            {!card.inStock ? 'Out of Stock' : hasAmount ? 'Add to Cart' : 'Select Amount'}
                          </button>
                          {hasAmount && card.inStock && (
                            <button
                              onClick={() => handleBuyNow(card)}
                              className="w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 bg-surface-dark border border-border-dark text-white hover:border-primary/50"
                            >
                              <Icon name="flash" size={18} />
                              Buy Now
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* How It Works Section */}
          <div className="bg-charcoal border border-border-dark rounded-2xl lg:rounded-3xl p-4 lg:p-12">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary font-extrabold text-lg">
                  1
                </div>
                <h3 className="font-bold text-white mb-2">Choose a Card</h3>
                <p className="text-slate-500 text-sm">Browse our selection and pick your preferred brand.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary font-extrabold text-lg">
                  2
                </div>
                <h3 className="font-bold text-white mb-2">Select Amount</h3>
                <p className="text-slate-500 text-sm">Choose from available denominations or enter a custom amount.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary font-extrabold text-lg">
                  3
                </div>
                <h3 className="font-bold text-white mb-2">Pay Securely</h3>
                <p className="text-slate-500 text-sm">Complete purchase with crypto or card.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary font-extrabold text-lg">
                  4
                </div>
                <h3 className="font-bold text-white mb-2">Instant Delivery</h3>
                <p className="text-slate-500 text-sm">Receive your code instantly via email.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
