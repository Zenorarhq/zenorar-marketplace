'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/ui/Icon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/contexts/AuthContext'
import { usePreferences } from '@/contexts/PreferencesContext'
import { convertPrice, getExchangeRate } from '@/lib/currency'
import { localApiFetch } from '@/lib/api/client'
import { getBalance } from '@/lib/api/wallet'
import AuthDialog from '@/components/dialogs/AuthDialog'
import DepositModal from '@/components/wallet/DepositModal'

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
  gaming: 'zap',
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
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { addItem, showAddedToCartPopup } = useCart()
  const { formatPrice, preferences } = usePreferences()

  // Get currency symbol based on preferences
  const currencySymbol = preferences?.currency?.symbol || '$'

  const [giftCards, setGiftCards] = useState<GiftCard[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Refs for auto-scroll
  const categoryScrollRef = useRef<HTMLDivElement>(null)

  // Card state
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [selectedAmounts, setSelectedAmounts] = useState<Record<string, number>>({})
  const [customAmountInputs, setCustomAmountInputs] = useState<Record<string, string>>({})
  // Store original local currency amounts for display (avoids round-trip precision loss)
  const [confirmedLocalAmounts, setConfirmedLocalAmounts] = useState<Record<string, number>>({})
  const [markupPercent, setMarkupPercent] = useState(10) // Default 10%

  // Payment state - card-specific to prevent error bleeding
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [processingPayment, setProcessingPayment] = useState<string | null>(null)
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({})

  // Wallet state (exactly like virtual numbers page)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [pendingWalletCheckout, setPendingWalletCheckout] = useState(false)
  const [pendingCard, setPendingCard] = useState<GiftCard | null>(null)

  // Helper to expand a card while closing any previously expanded card
  // Also clears ALL selections (both fixed and variable) when expanding
  const handleExpandCard = (cardId: string) => {
    // Clear ALL selections, custom inputs, local amounts, and errors when expanding any card
    setSelectedAmounts({})
    setConfirmedLocalAmounts({})
    setCustomAmountInputs({})
    setPaymentErrors({})
    setExpandedCard(cardId)
  }

  // Helper to get price range text with currency
  const getPriceRange = (card: GiftCard): string => {
    const currencyCode = preferences?.currency?.code || 'USD'
    if (card.denominations.length > 0) {
      const minUsd = Math.min(...card.denominations)
      const maxUsd = Math.max(...card.denominations)
      // Round min UP and max DOWN for clean whole numbers
      const minConverted = Math.ceil(convertPrice(minUsd, currencyCode))
      const maxConverted = Math.floor(convertPrice(maxUsd, currencyCode))
      if (minConverted === maxConverted) return `${currencySymbol}${minConverted.toLocaleString()}`
      return `${currencySymbol}${minConverted.toLocaleString()} - ${currencySymbol}${maxConverted.toLocaleString()}`
    }
    if (card.minCustomAmount && card.maxCustomAmount) {
      // Round min UP and max DOWN to stay within API bounds and show clean whole numbers
      const minConverted = Math.ceil(convertPrice(card.minCustomAmount, currencyCode))
      const maxConverted = Math.floor(convertPrice(card.maxCustomAmount, currencyCode))
      return `${currencySymbol}${minConverted.toLocaleString()} - ${currencySymbol}${maxConverted.toLocaleString()}`
    }
    return 'Variable'
  }

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

  // Fetch markup settings
  useEffect(() => {
    localApiFetch<any>('/settings/public?keys=giftCardMarkupPercent')
      .then((res) => {
        if (res.success && res.data?.giftCardMarkupPercent) {
          setMarkupPercent(Number(res.data.giftCardMarkupPercent) || 10)
        }
      })
      .catch(() => {
        // Use default markup
      })
  }, [])

  // Fetch wallet balance
  const fetchWalletBalance = async () => {
    setLoadingBalance(true)
    try {
      const result = await getBalance()
      if (result.success && result.data) {
        setWalletBalance(result.data.balance || 0)
        return result.data.balance || 0
      }
      return null
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error)
      return null
    } finally {
      setLoadingBalance(false)
    }
  }

  // Fetch wallet balance when authenticated
  useEffect(() => {
    if (isAuthenticated && walletBalance === null) {
      fetchWalletBalance()
    }
  }, [isAuthenticated])

  // Auto-scroll to selected category
  useEffect(() => {
    if (categoryScrollRef.current && selectedCategory) {
      const selectedEl = categoryScrollRef.current.querySelector(`[data-category="${selectedCategory}"]`)
      if (selectedEl) {
        selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }, [selectedCategory])

  // Auto-continue purchase after login (like virtual numbers)
  useEffect(() => {
    if (pendingWalletCheckout && isAuthenticated && walletBalance !== null && pendingCard) {
      setPendingWalletCheckout(false)
      const card = pendingCard
      const amount = selectedAmounts[card.id]
      if (!amount) {
        setPendingCard(null)
        return
      }
      const finalPrice = calculateFinalPrice(amount, card.discountPercent)

      if (walletBalance >= finalPrice) {
        // Has enough balance, proceed with purchase
        processWalletPayment(card, amount, finalPrice)
      } else {
        // Show deposit modal immediately
        setShowDepositModal(true)
      }
    }
  }, [pendingWalletCheckout, isAuthenticated, walletBalance, pendingCard])

  const popularCards = giftCards.filter(card => card.isFeatured)

  // Calculate final price with markup and discount
  const calculateFinalPrice = (amount: number, discountPercent: number): number => {
    const withMarkup = amount * (1 + markupPercent / 100)
    const discount = amount * (discountPercent / 100)
    return withMarkup - discount
  }

  // Get selected amount for a card
  const getSelectedAmount = (cardId: string): number | null => {
    return selectedAmounts[cardId] || null
  }

  // Handle custom amount confirmation
  const handleCustomAmountConfirm = (cardId: string, card: GiftCard) => {
    const value = parseFloat(customAmountInputs[cardId] || '')
    if (isNaN(value)) return

    const currencyCode = preferences?.currency?.code || 'USD'
    // Round min UP and max DOWN to stay within API bounds and avoid decimals
    const min = Math.ceil(convertPrice(card.minCustomAmount || 1, currencyCode))
    const max = Math.floor(convertPrice(card.maxCustomAmount || 1000, currencyCode))

    if (value >= min && value <= max) {
      // Convert from user's currency back to USD for storage
      // Round to 2 decimal places to avoid floating point imprecision
      const valueInUsd = Math.round((value / getExchangeRate(currencyCode)) * 100) / 100
      // Select this amount - clear ALL other cards first
      setSelectedAmounts({ [cardId]: valueInUsd })
      // Store original local currency value for display (avoids round-trip precision loss)
      setConfirmedLocalAmounts({ [cardId]: value })
      setExpandedCard(null) // Collapse after selection
      // Clear ALL errors and custom inputs
      setPaymentErrors({})
      setCustomAmountInputs({})
    }
  }

  // Add to cart handler
  const handleAddToCart = (card: GiftCard) => {
    const amount = getSelectedAmount(card.id)
    if (!amount) return

    const finalPrice = calculateFinalPrice(amount, card.discountPercent)

    // Use unique ID to prevent quantity stacking - each gift card should be a separate purchase
    const product = {
      id: `gc-${card.id}-${amount}-${Date.now()}`,
      name: `${card.brand} Gift Card (${formatPrice(amount)})`,
      slug: card.slug,
      description: card.description || '',
      price: finalPrice,
      rating: 5,
      reviewCount: 0,
      category: 'Gift Cards',
      icon: 'gift',
      iconColor: 'primary',
      tags: [card.brand, 'Gift Card'],
      productType: 'gift_card',
      product_type: 'gift_card',
      image: card.imageUrl || undefined, // For cart popup compatibility
      imageUrl: card.imageUrl || undefined,
      metadata: {
        productType: 'gift_card',
        gift_card_id: card.id,
        giftCardId: card.id,
        denomination: amount,
        brand: card.brand,
        imageUrl: card.imageUrl || undefined,
      }
    }

    addItem(product, 'standard', finalPrice)
    showAddedToCartPopup(product, finalPrice)
  }

  // Process wallet payment (actual API call)
  const processWalletPayment = async (card: GiftCard, amount: number, finalPrice: number) => {
    setProcessingPayment(card.id)
    // Clear error for this specific card
    setPaymentErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[card.id]
      return newErrors
    })

    try {
      const response = await localApiFetch<any>('/gift-cards/purchase', {
        method: 'POST',
        body: JSON.stringify({
          giftCardId: card.id,
          denomination: amount,
          paymentMethod: 'wallet'
        })
      })

      if (response.success) {
        // Refresh wallet balance
        await fetchWalletBalance()

        // Clear selection and redirect to library
        setSelectedAmounts(prev => {
          const newAmounts = { ...prev }
          delete newAmounts[card.id]
          return newAmounts
        })
        setPendingCard(null)
        router.push('/profile/library?tab=gift-cards&purchased=true')
      } else {
        setPaymentErrors(prev => ({ ...prev, [card.id]: response.error || 'Payment failed' }))
      }
    } catch (err: any) {
      console.error('Payment error:', err)
      setPaymentErrors(prev => ({ ...prev, [card.id]: err.message || 'Payment failed' }))
    } finally {
      setProcessingPayment(null)
    }
  }

  // Pay with wallet handler (exactly like virtual numbers handleInstantCheckout)
  const handlePayWithWallet = async (card: GiftCard) => {
    const amount = getSelectedAmount(card.id)
    if (!amount) return

    // Clear any previous error for this card
    setPaymentErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[card.id]
      return newErrors
    })

    // If not authenticated, show auth dialog (match virtual numbers pattern)
    if (!isAuthenticated) {
      setPendingCard(card)
      // Don't set pendingWalletCheckout here - let onSuccess set it
      // This matches virtual numbers handleInstantCheckout pattern
      setShowLoginModal(true)
      return
    }

    const finalPrice = calculateFinalPrice(amount, card.discountPercent)

    // Check wallet balance - fetch if null
    let currentBalance = walletBalance
    if (currentBalance === null) {
      setLoadingBalance(true)
      try {
        const result = await getBalance()
        if (result.success && result.data) {
          currentBalance = result.data.balance || 0
          setWalletBalance(currentBalance)
        } else {
          setPaymentErrors(prev => ({ ...prev, [card.id]: 'Failed to fetch wallet balance' }))
          setLoadingBalance(false)
          return
        }
      } catch {
        setPaymentErrors(prev => ({ ...prev, [card.id]: 'Failed to fetch wallet balance' }))
        setLoadingBalance(false)
        return
      }
      setLoadingBalance(false)
    }

    // If insufficient balance, show deposit modal immediately
    if (currentBalance === null || currentBalance < finalPrice) {
      setPendingCard(card)
      setShowDepositModal(true)
      return
    }

    // Process payment
    await processWalletPayment(card, amount, finalPrice)
  }

  return (
    <main className="max-w-container mx-auto px-4 lg:px-12 pb-24">
      {/* Auth Dialog */}
      <AuthDialog
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => {
          setShowLoginModal(false)
          setPendingWalletCheckout(true)  // Set BEFORE fetching balance - triggers auto-continue
          fetchWalletBalance()
        }}
        defaultTab="login"
      />

      {/* Deposit Modal */}
      <DepositModal
        isOpen={showDepositModal}
        onClose={async () => {
          setShowDepositModal(false)
          // Refresh balance after deposit modal closes
          const newBalance = await fetchWalletBalance()
          // Auto-complete purchase if now have enough balance (like virtual numbers)
          if (pendingCard && newBalance !== null) {
            const amount = selectedAmounts[pendingCard.id]
            if (amount) {
              const finalPrice = calculateFinalPrice(amount, pendingCard.discountPercent)
              if (newBalance >= finalPrice) {
                processWalletPayment(pendingCard, amount, finalPrice)
              }
            }
          }
        }}
      />

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
                    onClick={() => {
                      // Scroll to the card in the main grid
                      document.getElementById(`card-${card.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }}
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
            <div ref={categoryScrollRef} className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              <button
                data-category="all"
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
                  data-category={category.name}
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
              <div className="grid grid-cols-1 min-[350px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
                {giftCards.map((card) => {
                  const selectedAmount = getSelectedAmount(card.id)
                  const hasSelection = selectedAmount !== null
                  const isExpanded = expandedCard === card.id
                  const isVariableOnly = card.denominations.length === 0 && (card.minCustomAmount || card.maxCustomAmount)
                  const finalPrice = hasSelection ? calculateFinalPrice(selectedAmount, card.discountPercent) : 0
                  const discountAmount = hasSelection ? selectedAmount * (card.discountPercent / 100) : 0

                  return (
                    <div
                      id={`card-${card.id}`}
                      key={card.id}
                      className={`bg-charcoal border rounded-2xl overflow-hidden transition-all ${
                        hasSelection
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
                              e.currentTarget.style.display = 'none'
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
                        <p className="text-xs text-slate-500 mb-2">{card.category}</p>
                        <p className="text-sm text-primary font-medium mb-4">{getPriceRange(card)}</p>

                        {/* Amount Selection - Different UI for fixed vs variable */}
                        {card.denominations.length > 0 ? (
                          /* Fixed Denominations - Show pills immediately */
                          <div className="mb-4">
                            <div
                              className="flex gap-2 overflow-x-auto no-scrollbar pb-1"
                              ref={(el) => {
                                // Auto-scroll to selected pill
                                if (el && selectedAmount) {
                                  const selectedPill = el.querySelector(`[data-amount="${selectedAmount}"]`)
                                  if (selectedPill) {
                                    selectedPill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
                                  }
                                }
                              }}
                            >
                              {card.denominations.map((amount) => {
                                const currencyCode = preferences?.currency?.code || 'USD'
                                // Round to nearest whole number for clean display
                                const displayAmount = Math.round(convertPrice(amount, currencyCode))
                                return (
                                <button
                                  key={amount}
                                  data-amount={amount}
                                  onClick={() => {
                                    if (selectedAmount === amount) {
                                      // Deselect if clicking the same amount
                                      setSelectedAmounts({})
                                      setConfirmedLocalAmounts({})
                                    } else {
                                      // Select new amount - clear ALL other cards first
                                      setSelectedAmounts({ [card.id]: amount })
                                      setConfirmedLocalAmounts({}) // Fixed denominations don't use local amounts
                                      // Clear ALL errors and custom inputs
                                      setPaymentErrors({})
                                      setCustomAmountInputs({})
                                      setExpandedCard(null)
                                    }
                                  }}
                                  disabled={!card.inStock}
                                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                    selectedAmount === amount
                                      ? 'bg-primary text-black'
                                      : card.inStock
                                      ? 'bg-charcoal border border-border-dark text-white hover:border-primary hover:bg-primary/10'
                                      : 'bg-charcoal border border-border-dark text-slate-500 cursor-not-allowed'
                                  }`}
                                >
                                  {currencySymbol}{displayAmount.toLocaleString()}
                                </button>
                              )})}
                            </div>
                          </div>
                        ) : isVariableOnly ? (
                          /* Variable Amount Only - Show Select Amount button or input */
                          <div className="mb-4">
                            {!hasSelection && !isExpanded ? (
                              /* Select Amount Button - centered text */
                              <button
                                onClick={() => handleExpandCard(card.id)}
                                disabled={!card.inStock}
                                className={`w-full px-4 py-3 rounded-xl font-bold text-sm transition-all text-center ${
                                  card.inStock
                                    ? 'bg-surface-dark border border-border-dark text-white hover:border-primary/50'
                                    : 'bg-surface-dark border border-border-dark text-slate-500 cursor-not-allowed'
                                }`}
                              >
                                Select Amount
                              </button>
                            ) : !hasSelection ? (
                              /* Custom Amount Input - full width, same style as button */
                              (() => {
                                const inputValue = customAmountInputs[card.id] || ''
                                const parsedValue = parseFloat(inputValue)
                                const currencyCode = preferences?.currency?.code || 'USD'
                                const minUsd = card.minCustomAmount || 1
                                const maxUsd = card.maxCustomAmount || 1000
                                // Round min UP and max DOWN to stay within API bounds and show clean whole numbers
                                const min = Math.ceil(convertPrice(minUsd, currencyCode))
                                const max = Math.floor(convertPrice(maxUsd, currencyCode))
                                const isValidInput = !isNaN(parsedValue) && parsedValue >= min && parsedValue <= max

                                return (
                                  <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currencySymbol}</span>
                                    <input
                                      type="number"
                                      min={min}
                                      max={max}
                                      placeholder={`${min.toLocaleString()} - ${max.toLocaleString()}`}
                                      value={inputValue}
                                      onChange={(e) => setCustomAmountInputs(prev => ({ ...prev, [card.id]: e.target.value }))}
                                      onKeyDown={(e) => {
                                        // Block non-numeric characters (e, E, +, -)
                                        if (['e', 'E', '+', '-'].includes(e.key)) {
                                          e.preventDefault()
                                          return
                                        }
                                        if (e.key === 'Enter' && isValidInput) {
                                          handleCustomAmountConfirm(card.id, card)
                                        }
                                        if (e.key === 'Escape') {
                                          setExpandedCard(null)
                                          setCustomAmountInputs(prev => {
                                            const newInputs = { ...prev }
                                            delete newInputs[card.id]
                                            return newInputs
                                          })
                                        }
                                      }}
                                      onBlur={() => {
                                        // On blur: if valid, lock in; if invalid/empty, revert to Select Amount
                                        if (isValidInput) {
                                          handleCustomAmountConfirm(card.id, card)
                                        } else {
                                          setExpandedCard(null)
                                          setCustomAmountInputs(prev => {
                                            const newInputs = { ...prev }
                                            delete newInputs[card.id]
                                            return newInputs
                                          })
                                        }
                                      }}
                                      autoFocus
                                      className="w-full pl-8 pr-12 py-3 bg-surface-dark border border-primary rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary text-sm font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <button
                                      onClick={() => isValidInput && handleCustomAmountConfirm(card.id, card)}
                                      disabled={!isValidInput}
                                      className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                        isValidInput
                                          ? 'bg-primary text-black hover:brightness-105 cursor-pointer'
                                          : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                      }`}
                                    >
                                      <Icon name="check" size={16} />
                                    </button>
                                  </div>
                                )
                              })()
                            ) : (
                              /* Selected Variable Amount Display */
                              <button
                                onClick={() => {
                                  setSelectedAmounts(prev => {
                                    const newAmounts = { ...prev }
                                    delete newAmounts[card.id]
                                    return newAmounts
                                  })
                                  setConfirmedLocalAmounts(prev => {
                                    const newAmounts = { ...prev }
                                    delete newAmounts[card.id]
                                    return newAmounts
                                  })
                                  setPaymentErrors(prev => {
                                    const newErrors = { ...prev }
                                    delete newErrors[card.id]
                                    return newErrors
                                  })
                                  handleExpandCard(card.id)
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg font-bold text-sm hover:brightness-105 transition-all"
                              >
                                {/* Show original local currency value to avoid round-trip precision loss */}
                                <span>{confirmedLocalAmounts[card.id]
                                  ? `${currencySymbol}${confirmedLocalAmounts[card.id].toLocaleString()}`
                                  : formatPrice(selectedAmount)}</span>
                                <Icon name="x" size={14} />
                              </button>
                            )}
                          </div>
                        ) : null}

                        {/* Price Summary & Buttons - Only show when THIS card has selection */}
                        {hasSelection && (
                          <>
                            {/* Price Summary */}
                            <div className="mb-4 p-3 bg-surface-dark rounded-xl space-y-2">
                              {card.discountPercent > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">Discount ({card.discountPercent}%)</span>
                                  <span className="text-green-400">-{formatPrice(discountAmount)}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-slate-400 font-bold">You Pay</span>
                                <span className="text-white font-extrabold">{formatPrice(finalPrice)}</span>
                              </div>
                            </div>

                            {/* Action Buttons - Stacked (Pay with Wallet on top, Add to Cart below) */}
                            <div className="space-y-2">
                              <button
                                onClick={() => handlePayWithWallet(card)}
                                disabled={processingPayment === card.id || loadingBalance}
                                className="w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 bg-primary text-black hover:brightness-105 disabled:opacity-50"
                              >
                                {processingPayment === card.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                                    <span>Processing...</span>
                                  </>
                                ) : loadingBalance ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                                    <span>Checking Balance...</span>
                                  </>
                                ) : isAuthenticated ? (
                                  <>
                                    <Icon name="wallet" size={16} />
                                    <span>Pay {formatPrice(finalPrice)} with Wallet</span>
                                  </>
                                ) : (
                                  <>
                                    <Icon name="wallet" size={16} />
                                    <span>Pay with Wallet</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleAddToCart(card)}
                                className="w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 bg-surface-dark border border-border-dark text-white hover:border-primary/50"
                              >
                                <Icon name="cart" size={16} />
                                <span>Add to Cart</span>
                              </button>
                            </div>

                            {/* Payment Error - card specific */}
                            {paymentErrors[card.id] && processingPayment !== card.id && (
                              <p className="mt-2 text-xs text-red-400 text-center">{paymentErrors[card.id]}</p>
                            )}
                          </>
                        )}
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
                <p className="text-slate-500 text-sm">Pay with your wallet balance or add to cart.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary font-extrabold text-lg">
                  4
                </div>
                <h3 className="font-bold text-white mb-2">Instant Delivery</h3>
                <p className="text-slate-500 text-sm">Receive your code instantly in your library.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
