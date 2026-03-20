'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import WalletDisplay from '@/components/ui/WalletDisplay'
import TestModeBanner from '@/components/ui/TestModeBanner'

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
  food: 'heart',
  travel: 'airplane',
  entertainment: 'video',
  retail: 'store',
  other: 'gift'
}

// Popularity-based brand ordering (lower = appears first), modelled after Bitrefill US
// Keys are lowercase, matched against brand.toLowerCase()
const BRAND_POPULARITY: Record<string, number> = {
  // Mega-tier
  'amazon':1,'amazon.com':1,
  'apple':2,'apple gift card':2,'itunes':2,'app store & itunes':2,
  'google play':3,'google play gift card':3,
  'visa':4,'visa gift card':4,
  'mastercard':5,'mastercard gift card':5,
  'american express':6,'amex':6,
  // Gaming
  'steam':10,'steam gift card':10,
  'playstation':11,'psn':11,'playstation network':11,'playstation store':11,
  'xbox':12,'xbox gift card':12,'microsoft':12,'microsoft gift card':12,
  'nintendo':13,'nintendo eshop':13,'nintendo switch':13,
  'roblox':14,
  'fortnite':15,'epic games':15,
  'league of legends':16,'riot games':16,'riot points':16,
  'minecraft':17,
  'pubg':18,
  'valorant':19,
  // Streaming
  'netflix':20,'netflix gift card':20,
  'hulu':21,
  'disney+':22,'disney plus':22,'disney':22,
  'hbo':23,'hbo max':23,'max':23,
  'spotify':24,'spotify gift card':24,
  'apple tv+':25,'apple tv':25,
  'youtube':26,'youtube premium':26,'youtube music':26,
  'paramount+':27,'paramount plus':27,
  'peacock':28,
  'showtime':29,
  'crunchyroll':30,
  'twitch':31,
  // Shopping
  'walmart':40,'walmart gift card':40,
  'target':41,'target gift card':41,
  'best buy':42,
  'ebay':43,
  'etsy':44,
  'shein':45,
  'nike':46,
  'adidas':47,
  'nordstrom':48,
  'gap':49,
  'old navy':50,
  'h&m':51,
  'zara':52,
  'macy\'s':53,'macys':53,
  'sephora':54,
  'ulta':55,
  'bath & body works':56,
  // Food & Delivery
  'starbucks':60,'starbucks gift card':60,
  'uber':61,'uber gift card':61,
  'doordash':62,
  'grubhub':63,
  'mcdonalds':64,'mcdonald\'s':64,
  'chipotle':65,
  'chick-fil-a':66,'chick fil a':66,
  'subway':67,
  'dunkin':68,"dunkin'":68,
  'burger king':69,
  'dominos':70,"domino's":70,
  'pizza hut':71,
  // Travel
  'airbnb':80,
  'booking.com':81,
  'hotels.com':82,
  'expedia':83,
  'delta':84,'delta airlines':84,
  'american airlines':85,
  'united airlines':86,
  // Entertainment
  'amc':90,'amc theatres':90,
  'fandango':91,
  'regal':92,
  // Retail / Others
  'cvs':100,
  'walgreens':101,
  'home depot':102,
  "lowe's":103,'lowes':103,
  'ikea':104,
  'gamestop':105,
  'dollar general':106,
}

const getBrandPriority = (brand: string): number => {
  const key = brand.toLowerCase().trim()
  if (BRAND_POPULARITY[key] !== undefined) return BRAND_POPULARITY[key]
  // Partial match
  for (const [k, v] of Object.entries(BRAND_POPULARITY)) {
    if (key.includes(k) || k.includes(key)) return v
  }
  return 999
}

// High-quality image overrides for brands that often lack images from providers
// Images sourced from Reloadly CDN and official brand assets
const BRAND_IMAGE_OVERRIDES: Record<string, string> = {
  'amazon':         'https://cdn.reloadly.com/giftcards/amazon-us-gift-card.jpg',
  'amazon.com':     'https://cdn.reloadly.com/giftcards/amazon-us-gift-card.jpg',
  'apple':          'https://cdn.reloadly.com/giftcards/apple-gift-card.jpg',
  'app store & itunes': 'https://cdn.reloadly.com/giftcards/apple-gift-card.jpg',
  'itunes':         'https://cdn.reloadly.com/giftcards/apple-gift-card.jpg',
  'google play':    'https://cdn.reloadly.com/giftcards/google-play-gift-card.jpg',
  'steam':          'https://cdn.reloadly.com/giftcards/steam-gift-card.jpg',
  'playstation':    'https://cdn.reloadly.com/giftcards/playstation-store-gift-card.jpg',
  'psn':            'https://cdn.reloadly.com/giftcards/playstation-store-gift-card.jpg',
  'playstation store': 'https://cdn.reloadly.com/giftcards/playstation-store-gift-card.jpg',
  'xbox':           'https://cdn.reloadly.com/giftcards/xbox-gift-card.jpg',
  'microsoft':      'https://cdn.reloadly.com/giftcards/microsoft-gift-card.jpg',
  'nintendo eshop': 'https://cdn.reloadly.com/giftcards/nintendo-eshop-gift-card.jpg',
  'netflix':        'https://cdn.reloadly.com/giftcards/netflix-gift-card.jpg',
  'spotify':        'https://cdn.reloadly.com/giftcards/spotify-gift-card.jpg',
  'hulu':           'https://cdn.reloadly.com/giftcards/hulu-gift-card.jpg',
  'roblox':         'https://cdn.reloadly.com/giftcards/roblox-gift-card.jpg',
  'walmart':        'https://cdn.reloadly.com/giftcards/walmart-gift-card.jpg',
  'target':         'https://cdn.reloadly.com/giftcards/target-gift-card.jpg',
  'starbucks':      'https://cdn.reloadly.com/giftcards/starbucks-gift-card.jpg',
  'uber':           'https://cdn.reloadly.com/giftcards/uber-gift-card.jpg',
  'airbnb':         'https://cdn.reloadly.com/giftcards/airbnb-gift-card.jpg',
  'ebay':           'https://cdn.reloadly.com/giftcards/ebay-gift-card.jpg',
  'best buy':       'https://cdn.reloadly.com/giftcards/best-buy-gift-card.jpg',
  'doordash':       'https://cdn.reloadly.com/giftcards/doordash-gift-card.jpg',
  'nordstrom':      'https://cdn.reloadly.com/giftcards/nordstrom-gift-card.jpg',
  'sephora':        'https://cdn.reloadly.com/giftcards/sephora-gift-card.jpg',
  'nike':           'https://cdn.reloadly.com/giftcards/nike-gift-card.jpg',
  'visa':           'https://cdn.reloadly.com/giftcards/visa-gift-card.jpg',
  'mastercard':     'https://cdn.reloadly.com/giftcards/mastercard-gift-card.jpg',
  'disney+':        'https://cdn.reloadly.com/giftcards/disney-plus-gift-card.jpg',
  'disney plus':    'https://cdn.reloadly.com/giftcards/disney-plus-gift-card.jpg',
  'fortnite':       'https://cdn.reloadly.com/giftcards/fortnite-gift-card.jpg',
  'epic games':     'https://cdn.reloadly.com/giftcards/epic-games-gift-card.jpg',
  'twitch':         'https://cdn.reloadly.com/giftcards/twitch-gift-card.jpg',
  'gamestop':       'https://cdn.reloadly.com/giftcards/gamestop-gift-card.jpg',
  'chipotle':       'https://cdn.reloadly.com/giftcards/chipotle-gift-card.jpg',
  'mcdonalds':      'https://cdn.reloadly.com/giftcards/mcdonalds-gift-card.jpg',
  "mcdonald's":     'https://cdn.reloadly.com/giftcards/mcdonalds-gift-card.jpg',
  'grubhub':        'https://cdn.reloadly.com/giftcards/grubhub-gift-card.jpg',
  'home depot':     'https://cdn.reloadly.com/giftcards/home-depot-gift-card.jpg',
  'etsy':           'https://cdn.reloadly.com/giftcards/etsy-gift-card.jpg',
  'crunchyroll':    'https://cdn.reloadly.com/giftcards/crunchyroll-gift-card.jpg',
  'amc':            'https://cdn.reloadly.com/giftcards/amc-gift-card.jpg',
  'nintendo':       'https://cdn.reloadly.com/giftcards/nintendo-eshop-gift-card.jpg',
}

const getCardImage = (card: { brand: string; imageUrl: string | null }): string | null => {
  const key = card.brand.toLowerCase().trim()
  // Check exact match first, then partial
  if (BRAND_IMAGE_OVERRIDES[key]) return BRAND_IMAGE_OVERRIDES[key]
  for (const [k, url] of Object.entries(BRAND_IMAGE_OVERRIDES)) {
    if (key.includes(k) || k.includes(key)) return url
  }
  return card.imageUrl
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
  const searchParams = useSearchParams()
  const { isAuthenticated } = useAuth()
  const { addItem, showAddedToCartPopup } = useCart()
  const { formatPrice, preferences } = usePreferences()

  // Get currency symbol based on preferences
  const currencySymbol = preferences?.currency?.symbol || '$'

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')


  // Fetch gift cards from API with React Query caching
  const { data: giftCardsData, isLoading: loading, isError, error } = useQuery({
    queryKey: ['gift-cards', selectedCategory, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedCategory) params.set('category', selectedCategory)
      if (searchQuery) params.set('search', searchQuery)

      const response = await fetch(`/api/gift-cards?${params.toString()}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch gift cards')
      }

      return { giftCards: data.giftCards as GiftCard[], categories: data.categories as Category[], total: data.total as number }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection
  })

  // Sort by popularity map, then fall back to API order (isFeatured → purchase_count → alpha)
  const giftCards = [...(giftCardsData?.giftCards ?? [])].sort((a, b) => {
    const pa = getBrandPriority(a.brand)
    const pb = getBrandPriority(b.brand)
    if (pa !== pb) return pa - pb
    // Both unknown: keep isFeatured first, then alpha
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1
    return a.brand.localeCompare(b.brand)
  })
  const categories = giftCardsData?.categories ?? []
  const totalCards = giftCardsData?.total ?? giftCards.length

  // Fetch markup settings with React Query caching
  const { data: markupPercent = 10 } = useQuery({
    queryKey: ['gift-card-markup'],
    queryFn: async () => {
      const res = await localApiFetch<any>('/settings/public?keys=giftCardMarkupPercent')
      if (res.success && res.data?.giftCardMarkupPercent) {
        return Number(res.data.giftCardMarkupPercent) || 10
      }
      return 10
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - markup settings rarely change
    gcTime: 30 * 60 * 1000, // 30 minutes
  })

  // Refs for auto-scroll
  const categoryScrollRef = useRef<HTMLDivElement>(null)

  // Card state
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [selectedAmounts, setSelectedAmounts] = useState<Record<string, number>>({})
  const [customAmountInputs, setCustomAmountInputs] = useState<Record<string, string>>({})
  // Store original local currency amounts for display (avoids round-trip precision loss)
  const [confirmedLocalAmounts, setConfirmedLocalAmounts] = useState<Record<string, number>>({})
  // Modal state — which card's purchase modal is open
  const [modalCard, setModalCard] = useState<GiftCard | null>(null)

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

  // Calculate final price with markup and discount
  const calculateFinalPrice = useCallback((amount: number, discountPercent: number): number => {
    const withMarkup = amount * (1 + markupPercent / 100)
    const discount = amount * (discountPercent / 100)
    return withMarkup - discount
  }, [markupPercent])

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
  }, [pendingWalletCheckout, isAuthenticated, walletBalance, pendingCard, calculateFinalPrice])

  const popularCards = giftCards.filter(card => card.isFeatured)

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

      {/* Sandbox Mode Banner */}
      <TestModeBanner />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#43D678]/20 via-[#43D678]/10 to-transparent rounded-2xl lg:rounded-3xl p-6 lg:p-12 mb-8 lg:mb-12">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl lg:text-4xl font-extrabold text-white mb-2">
              Digital Gift Cards
            </h1>
            <p className="text-slate-500 text-sm lg:text-base max-w-2xl">
              Instant delivery. Save up to 10% on popular brands. Perfect for gifting or personal use.
            </p>
          </div>

          {/* Wallet Balance - Desktop */}
          <WalletDisplay variant="desktop" />
        </header>
        {/* Mobile: wallet inside hero */}
        <div className="md:hidden mt-6">
          <WalletDisplay variant="mobile" />
        </div>
        {/* Tablet+: search inside hero */}
        <div className="hidden md:block mt-6 relative max-w-xl">
          <Icon name="search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search gift cards (Amazon, Steam, iTunes...)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-charcoal border border-border-dark rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      {/* Mobile: search below hero */}
      <div className="md:hidden relative max-w-xl mb-6">
        <Icon name="search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search gift cards (Amazon, Steam, iTunes...)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-charcoal border border-border-dark rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>
      {/* Tablet: wallet below hero */}
      <div className="hidden md:block lg:hidden mb-6">
        <WalletDisplay variant="mobile" />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
        </div>
      )}

      {/* Error State */}
      {isError && !loading && (
        <div className="text-center py-20">
          <Icon name="alert-circle" size={48} className="text-red-500 mx-auto mb-4" />
          <h3 className="text-white font-bold mb-2">Failed to load gift cards</h3>
          <p className="text-slate-500">{error instanceof Error ? error.message : 'An error occurred'}</p>
        </div>
      )}

      {/* Content */}
      {!loading && !isError && (
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
                    <div className={`relative h-24 ${!getCardImage(card) ? `bg-gradient-to-br ${categoryGradients[card.category?.toLowerCase()] || categoryGradients.other}` : 'bg-surface-dark'} flex items-center justify-center overflow-hidden`}>
                      {getCardImage(card) ? (
                        <img
                          src={getCardImage(card)!}
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
              <span className="text-slate-500 text-sm">{totalCards} cards available</span>
            </div>

            {giftCards.length === 0 ? (
              <div className="text-center py-16 bg-charcoal border border-border-dark rounded-2xl">
                <Icon name="gift" size={48} className="text-slate-600 mx-auto mb-4" />
                <h3 className="text-white font-bold mb-2">No gift cards found</h3>
                <p className="text-slate-500">Try adjusting your search or filters</p>
              </div>
            ) : (
              <>
              <div className="grid grid-cols-1 min-[560px]:grid-cols-2 min-[700px]:grid-cols-3 min-[960px]:grid-cols-4 gap-6 items-start">
                {giftCards.map((card) => {
                  const selectedAmount = getSelectedAmount(card.id)
                  const hasSelection = selectedAmount !== null
                  const isVariableOnly = card.denominations.length === 0 && (card.minCustomAmount || card.maxCustomAmount)

                  const openModal = (preSelectAmount?: number) => {
                    if (preSelectAmount !== undefined) {
                      setSelectedAmounts({ [card.id]: preSelectAmount })
                      setConfirmedLocalAmounts({})
                      setPaymentErrors({})
                      setCustomAmountInputs({})
                    }
                    setModalCard(card)
                  }

                  return (
                    <div
                      id={`card-${card.id}`}
                      key={card.id}
                      className={`bg-charcoal border rounded-2xl overflow-hidden transition-all cursor-pointer group ${
                        hasSelection
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-border-dark hover:border-primary/50'
                      }`}
                      onClick={() => openModal()}
                    >
                      {/* Card Image Header */}
                      <div className={`relative h-32 ${!getCardImage(card) ? `bg-gradient-to-br ${categoryGradients[card.category?.toLowerCase()] || categoryGradients.other}` : 'bg-surface-dark'} flex items-center justify-center overflow-hidden`}>
                        {getCardImage(card) ? (
                          <img
                            src={getCardImage(card)!}
                            alt={card.brand}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.nextElementSibling?.classList.remove('hidden')
                            }}
                          />
                        ) : null}
                        <div className={`${getCardImage(card) ? 'hidden' : ''} absolute inset-0 flex items-center justify-center`}>
                          <div className="w-16 h-16 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                            <Icon name="gift" size={32} className="text-white/80" />
                          </div>
                        </div>
                        {/* Badges */}
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

                        {/* Denomination pills (tappable — each opens modal pre-selected) */}
                        {card.denominations.length > 0 ? (
                          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-4" onClick={(e) => e.stopPropagation()}>
                            {card.denominations.map((amount) => {
                              const currencyCode = preferences?.currency?.code || 'USD'
                              const displayAmount = Math.round(convertPrice(amount, currencyCode))
                              return (
                                <button
                                  key={amount}
                                  onClick={() => openModal(amount)}
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
                              )
                            })}
                          </div>
                        ) : isVariableOnly ? (
                          /* Variable-only: Select Amount button opens modal */
                          <div className="mb-4" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openModal()}
                              disabled={!card.inStock}
                              className={`w-full px-4 py-3 rounded-xl font-bold text-sm transition-all text-center ${
                                card.inStock
                                  ? 'bg-surface-dark border border-border-dark text-white hover:border-primary/50 group-hover:border-primary/50'
                                  : 'bg-surface-dark border border-border-dark text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              {hasSelection
                                ? (confirmedLocalAmounts[card.id]
                                    ? `${currencySymbol}${confirmedLocalAmounts[card.id].toLocaleString()} selected`
                                    : `${formatPrice(selectedAmount!)} selected`)
                                : 'Select Amount'}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* ── Gift Card Purchase Modal ── */}
              {modalCard && (() => {
                const card = modalCard
                const selectedAmount = getSelectedAmount(card.id)
                const hasSelection = selectedAmount !== null
                const isVariableOnly = card.denominations.length === 0 && (card.minCustomAmount || card.maxCustomAmount)
                const finalPrice = hasSelection ? calculateFinalPrice(selectedAmount, card.discountPercent) : 0
                const discountAmount = hasSelection ? selectedAmount * (card.discountPercent / 100) : 0

                // Custom amount input state (variable cards)
                const inputValue = customAmountInputs[card.id] || ''
                const parsedValue = parseFloat(inputValue)
                const currencyCode = preferences?.currency?.code || 'USD'
                const minUsd = card.minCustomAmount || 1
                const maxUsd = card.maxCustomAmount || 1000
                const min = Math.ceil(convertPrice(minUsd, currencyCode))
                const max = Math.floor(convertPrice(maxUsd, currencyCode))
                const isValidInput = !isNaN(parsedValue) && parsedValue >= min && parsedValue <= max

                const closeModal = () => {
                  setModalCard(null)
                  setExpandedCard(null)
                }

                return (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    onClick={closeModal}
                  >
                    <div
                      className="bg-[#1a1a1a] border border-border-dark rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Modal image header */}
                      <div className={`relative h-36 ${!getCardImage(card) ? `bg-gradient-to-br ${categoryGradients[card.category?.toLowerCase()] || categoryGradients.other}` : 'bg-surface-dark'} flex items-center justify-center overflow-hidden rounded-t-2xl`}>
                        {getCardImage(card) ? (
                          <img src={getCardImage(card)!} alt={card.brand} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden') }} />
                        ) : null}
                        <div className={`${getCardImage(card) ? 'hidden' : ''} absolute inset-0 flex items-center justify-center`}>
                          <div className="w-16 h-16 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                            <Icon name="gift" size={32} className="text-white/80" />
                          </div>
                        </div>
                        <button onClick={closeModal} className="absolute top-3 right-3 p-1.5 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors">
                          <Icon name="x" size={16} />
                        </button>
                        {card.discountPercent > 0 && (
                          <span className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-md">
                            {card.discountPercent}% OFF
                          </span>
                        )}
                      </div>

                      <div className="p-5">
                        <h3 className="font-bold text-white text-lg mb-0.5">{card.brand}</h3>
                        <p className="text-xs text-slate-500 mb-4">{card.category} · {getPriceRange(card)}</p>

                        {/* Amount selection */}
                        {card.denominations.length > 0 ? (
                          <div className="mb-4">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Select Amount</label>
                            <div className="grid grid-cols-3 gap-2">
                              {card.denominations.map((amount) => {
                                const displayAmount = Math.round(convertPrice(amount, currencyCode))
                                return (
                                  <button
                                    key={amount}
                                    onClick={() => {
                                      if (selectedAmount === amount) {
                                        setSelectedAmounts({})
                                        setConfirmedLocalAmounts({})
                                      } else {
                                        setSelectedAmounts({ [card.id]: amount })
                                        setConfirmedLocalAmounts({})
                                        setPaymentErrors({})
                                        setCustomAmountInputs({})
                                      }
                                    }}
                                    className={`px-3 py-3 rounded-xl text-sm font-bold transition-all text-center ${
                                      selectedAmount === amount
                                        ? 'bg-primary text-black ring-2 ring-primary/30'
                                        : 'bg-surface-dark border border-border-dark text-white hover:border-primary/50'
                                    }`}
                                  >
                                    {currencySymbol}{displayAmount.toLocaleString()}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ) : isVariableOnly ? (
                          <div className="mb-4">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Enter Amount</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currencySymbol}</span>
                              <input
                                type="number"
                                min={min}
                                max={max}
                                placeholder={`${min.toLocaleString()} – ${max.toLocaleString()}`}
                                value={inputValue}
                                onChange={(e) => setCustomAmountInputs(prev => ({ ...prev, [card.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (['e', 'E', '+', '-'].includes(e.key)) { e.preventDefault(); return }
                                  if (e.key === 'Enter' && isValidInput) { handleCustomAmountConfirm(card.id, card) }
                                  if (e.key === 'Escape') { closeModal() }
                                }}
                                autoFocus
                                className="w-full pl-8 pr-4 py-3 bg-surface-dark border border-border-dark rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary text-sm font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                              Min {currencySymbol}{min.toLocaleString()} · Max {currencySymbol}{max.toLocaleString()}
                            </p>
                            {isValidInput && (
                              <button
                                onClick={() => handleCustomAmountConfirm(card.id, card)}
                                className="mt-3 w-full py-2.5 rounded-xl bg-surface-dark border border-primary text-primary font-bold text-sm hover:bg-primary/10 transition-colors"
                              >
                                Confirm {currencySymbol}{parsedValue.toLocaleString()}
                              </button>
                            )}
                          </div>
                        ) : null}

                        {/* Price summary */}
                        {hasSelection && (
                          <>
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

                            <div className="space-y-2">
                              <button
                                onClick={() => handlePayWithWallet(card)}
                                disabled={processingPayment === card.id || loadingBalance}
                                className="w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 bg-primary text-black hover:brightness-105 disabled:opacity-50"
                              >
                                {processingPayment === card.id ? (
                                  <><div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" /><span>Processing...</span></>
                                ) : loadingBalance ? (
                                  <><div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" /><span>Checking Balance...</span></>
                                ) : (
                                  <><Icon name="wallet" size={16} /><span>Pay {formatPrice(finalPrice)} with Wallet</span></>
                                )}
                              </button>
                              <button
                                onClick={() => { handleAddToCart(card); closeModal() }}
                                className="w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 bg-surface-dark border border-border-dark text-white hover:border-primary/50"
                              >
                                <Icon name="cart" size={16} />
                                <span>Add to Cart</span>
                              </button>
                            </div>

                            {paymentErrors[card.id] && processingPayment !== card.id && (
                              <p className="mt-2 text-xs text-red-400 text-center">{paymentErrors[card.id]}</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })()}
              </>
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
