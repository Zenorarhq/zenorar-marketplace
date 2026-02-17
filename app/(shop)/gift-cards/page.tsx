'use client'

import { useState } from 'react'
import Icon from '@/components/ui/Icon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { giftCardCategories, giftCards } from '@/lib/mock-data'
import { useCart } from '@/lib/cart-context'

export default function GiftCardsPage() {
  const { addItem, showAddedToCartPopup, buyNow } = useCart()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [selectedDenomination, setSelectedDenomination] = useState<number | null>(null)
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({})
  const [showCustomInput, setShowCustomInput] = useState<Record<string, boolean>>({})

  const filteredCards = giftCards.filter((card) => {
    const matchesCategory = !selectedCategory || card.category === selectedCategory
    const matchesSearch = !searchQuery ||
      card.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.category.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const popularCards = giftCards.filter(card => card.popular)

  const getEffectiveAmount = (cardId: string): number | null => {
    if (showCustomInput[cardId] && customAmounts[cardId]) {
      const amount = parseFloat(customAmounts[cardId])
      return isNaN(amount) ? null : amount
    }
    return selectedCard === cardId ? selectedDenomination : null
  }

  const handleAddToCart = (card: typeof giftCards[0]) => {
    const amount = getEffectiveAmount(card.id)
    if (!amount) return

    const discountedPrice = amount * (1 - card.discount / 100)

    // Create a product object for the cart
    const product = {
      id: `${card.id}-${amount}`,
      name: `${card.brand} Gift Card ($${amount})`,
      slug: card.id,
      description: card.description,
      price: discountedPrice,
      rating: 5,
      reviewCount: 0,
      category: 'Gift Cards',
      icon: 'gift',
      iconColor: 'primary',
      tags: [card.brand, 'Gift Card'],
    }

    addItem(product, 'standard', discountedPrice)
    showAddedToCartPopup(product, discountedPrice)
  }

  const handleBuyNow = (card: typeof giftCards[0]) => {
    const amount = getEffectiveAmount(card.id)
    if (!amount) return

    const discountedPrice = amount * (1 - card.discount / 100)

    const product = {
      id: `${card.id}-${amount}`,
      name: `${card.brand} Gift Card ($${amount})`,
      slug: card.id,
      description: card.description,
      price: discountedPrice,
      rating: 5,
      reviewCount: 0,
      category: 'Gift Cards',
      icon: 'gift',
      iconColor: 'primary',
      tags: [card.brand, 'Gift Card'],
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

      {/* Popular Cards */}
      {!selectedCategory && !searchQuery && (
        <div className="mb-12">
          <h2 className="text-xl font-bold text-white mb-6">Popular Gift Cards</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {popularCards.map((card) => (
              <button
                key={card.id}
                onClick={() => setSelectedCard(card.id)}
                className="bg-charcoal border border-border-dark hover:border-primary/50 rounded-2xl p-4 transition-all text-center group"
              >
                <div className="w-16 h-16 rounded-xl bg-surface-dark flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Icon name="gift" size={28} className="text-primary" />
                </div>
                <h3 className="font-bold text-white text-sm mb-1">{card.brand}</h3>
                <p className="text-xs text-green-400 font-bold">Save {card.discount}%</p>
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
          {giftCardCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
              className={`flex-shrink-0 px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                selectedCategory === category.id
                  ? 'bg-primary text-white'
                  : 'bg-charcoal border border-border-dark text-slate-400 hover:text-white'
              }`}
            >
              <Icon name={category.icon} size={16} />
              {category.name}
              <span className="text-xs opacity-70">({category.cardCount})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {selectedCategory
              ? `${giftCardCategories.find(c => c.id === selectedCategory)?.name} Gift Cards`
              : 'All Gift Cards'}
          </h2>
          <span className="text-slate-500 text-sm">{filteredCards.length} cards available</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCards.map((card) => {
            const effectiveAmount = getEffectiveAmount(card.id)
            const hasAmount = effectiveAmount !== null && effectiveAmount > 0

            return (
              <div
                key={card.id}
                className={`bg-charcoal border rounded-2xl p-6 transition-all ${
                  selectedCard === card.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border-dark hover:border-primary/50'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-16 h-16 rounded-xl bg-surface-dark flex items-center justify-center">
                    <Icon name="gift" size={28} className="text-primary" />
                  </div>
                  {card.discount > 0 && (
                    <span className="bg-green-500/10 text-green-400 text-xs font-bold px-3 py-1 rounded-full">
                      {card.discount}% OFF
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-white text-lg mb-2">{card.brand}</h3>
                <p className="text-sm text-slate-500 mb-4">{card.description}</p>

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
                  </div>

                  {/* Custom Amount Input */}
                  {showCustomInput[card.id] && (
                    <div className="mt-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                        <input
                          type="number"
                          min="1"
                          placeholder="Enter amount"
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
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Discount ({card.discount}%)</span>
                      <span className="text-green-400">-${(effectiveAmount! * card.discount / 100).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-border-dark my-2"></div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">You Pay</span>
                      <span className="text-white font-extrabold">
                        ${(effectiveAmount! * (1 - card.discount / 100)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={() => handleAddToCart(card)}
                    disabled={!hasAmount}
                    className={`w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                      hasAmount
                        ? 'bg-primary text-black hover:brightness-105'
                        : 'bg-surface-dark text-slate-400 border border-border-dark cursor-not-allowed'
                    }`}
                  >
                    <Icon name="cart" size={18} />
                    {hasAmount ? 'Add to Cart' : 'Select Amount'}
                  </button>
                  {hasAmount && (
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
            )
          })}
        </div>
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
    </main>
  )
}
