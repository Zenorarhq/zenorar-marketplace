'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Icon from '@/components/ui/Icon'
import FlagIcon from '@/components/ui/FlagIcon'
import ServiceLogo from '@/components/ui/ServiceLogo'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { usePreferences } from '@/contexts/PreferencesContext'
import { useCart } from '@/lib/cart-context'
import { getBalance } from '@/lib/api/wallet'
import AuthDialog from '@/components/dialogs/AuthDialog'
import DepositModal from '@/components/wallet/DepositModal'
import WalletDisplay from '@/components/ui/WalletDisplay'
import * as phoneRefillsApi from '@/lib/api/phone-refills'
import type { TopupOperator, TopupOffer } from '@/lib/api/phone-refills'

const OPERATORS_PER_PAGE = 24

// Region priority: US → UK → Canada → Europe → North America → South America → Asia → Middle East → Others → Africa last
const REGION_PRIORITY: Record<string, number> = (() => {
  const US = ['US']
  const UK = ['GB']
  const CANADA = ['CA']
  const EUROPE = [
    'AL','AD','AT','BY','BE','BA','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IS',
    'IE','IT','XK','LV','LI','LT','LU','MT','MD','MC','ME','NL','MK','NO','PL','PT','RO','RU',
    'SM','RS','SK','SI','ES','SE','CH','UA','VA',
  ]
  const NORTH_AMERICA = ['MX','GT','BZ','SV','HN','NI','CR','PA','CU','JM','HT','DO','TT','BS','BB','AG','DM','GD','KN','LC','VC']
  const SOUTH_AMERICA = ['BR','AR','CL','CO','PE','VE','EC','BO','PY','UY','GY','SR']
  const ASIA = [
    'AF','AM','AZ','BD','BT','BN','KH','CN','GE','IN','ID','JP','KZ',
    'KG','LA','MY','MV','MN','MM','NP','KP','PK','PH','SG','KR','LK',
    'TW','TJ','TH','TL','TR','TM','UZ','VN',
  ]
  const MIDDLE_EAST = ['AE','SA','QA','KW','BH','OM','JO','LB','IQ','IR','IL','YE','SY']
  const AFRICA = [
    'DZ','AO','BJ','BW','BF','BI','CV','CM','CF','TD','KM','CD','CG','CI','DJ','EG','GQ','ER',
    'SZ','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ',
    'NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','ZM','ZW',
  ]

  const map: Record<string, number> = {}
  US.forEach((c) => (map[c] = 0))
  UK.forEach((c) => (map[c] = 1))
  CANADA.forEach((c) => (map[c] = 2))
  EUROPE.forEach((c) => { if (!(c in map)) map[c] = 3 })
  NORTH_AMERICA.forEach((c) => { if (!(c in map)) map[c] = 4 })
  SOUTH_AMERICA.forEach((c) => { if (!(c in map)) map[c] = 5 })
  ASIA.forEach((c) => { if (!(c in map)) map[c] = 6 })
  MIDDLE_EAST.forEach((c) => (map[c] = 7))
  AFRICA.forEach((c) => (map[c] = 9))
  return map
})()

function resolveCountryName(isoCode: string): string {
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' })
    return displayNames.of(isoCode) || isoCode
  } catch {
    return isoCode
  }
}

export default function PhoneRefillsPage() {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [operatorPage, setOperatorPage] = useState(1)

  // The currently expanded operator card (only one at a time)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [selectedOffer, setSelectedOffer] = useState<TopupOffer | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [processingCard, setProcessingCard] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [purchaseSuccess, setPurchaseSuccess] = useState<{
    operatorName: string
    offer: TopupOffer
    phone: string
  } | null>(null)

  // Wallet/auth state
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [pendingWalletCheckout, setPendingWalletCheckout] = useState(false)
  const [pendingOperator, setPendingOperator] = useState<TopupOperator | null>(null)

  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { formatPrice } = usePreferences()
  const { addItem, showAddedToCartPopup } = useCart()

  const opKey = (op: TopupOperator) => `${op.id}-${op.country}`

  // Fetch all operators
  const { data: operators = [], isLoading: loadingOperators } = useQuery({
    queryKey: ['phone-refill-operators'],
    queryFn: async () => {
      const result = await phoneRefillsApi.getOperators()
      if (result.success && result.data) return result.data
      return []
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  // Filter by search and sort by region priority
  const allFiltered = useMemo(() => {
    let list = operators
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (op) =>
          op.name.toLowerCase().includes(q) ||
          op.country.toLowerCase().includes(q) ||
          resolveCountryName(op.country).toLowerCase().includes(q)
      )
    }

    // Sort by region priority, then alphabetically within each region
    return [...list].sort((a, b) => {
      const pa = REGION_PRIORITY[a.country.toUpperCase()] ?? 8
      const pb = REGION_PRIORITY[b.country.toUpperCase()] ?? 8
      if (pa !== pb) return pa - pb
      return a.name.localeCompare(b.name)
    })
  }, [operators, searchQuery])

  // Pagination (over allFiltered for the main grid)
  const totalPages = Math.ceil(allFiltered.length / OPERATORS_PER_PAGE)
  const paginatedOperators = allFiltered.slice(
    (operatorPage - 1) * OPERATORS_PER_PAGE,
    operatorPage * OPERATORS_PER_PAGE
  )

  useEffect(() => {
    setOperatorPage(1)
  }, [searchQuery])

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

  useEffect(() => {
    if (isAuthenticated && walletBalance === null) {
      fetchWalletBalance()
    }
  }, [isAuthenticated])

  // Auto-continue purchase after login
  useEffect(() => {
    if (pendingWalletCheckout && isAuthenticated && walletBalance !== null && pendingOperator && selectedOffer) {
      setPendingWalletCheckout(false)
      const phone = phoneNumber.replace(/[^+\d]/g, '')
      if (walletBalance >= selectedOffer.price && phone.length >= 8) {
        processWalletPayment(pendingOperator, selectedOffer, phone)
      } else if (walletBalance < selectedOffer.price) {
        setShowDepositModal(true)
      }
    }
  }, [pendingWalletCheckout, isAuthenticated, walletBalance, pendingOperator])

  // Expand/collapse a carrier row
  const handleToggle = (op: TopupOperator) => {
    const key = opKey(op)
    if (expandedKey === key) {
      setExpandedKey(null)
      setSelectedOffer(null)
      setPhoneNumber('')
      setCustomAmount('')
      setPaymentError(null)
    } else {
      setExpandedKey(key)
      setSelectedOffer(null)
      setPhoneNumber('')
      setCustomAmount('')
      setPaymentError(null)
    }
  }

  // Process wallet payment
  const processWalletPayment = async (operator: TopupOperator, offer: TopupOffer, phone: string) => {
    const key = opKey(operator)
    setProcessingCard(key)
    setPaymentError(null)

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/orders/instant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          items: [
            {
              productId: offer.offerId,
              name: `${operator.name} Top-Up - ${offer.sendAmount} ${offer.sendCurrency}`,
              quantity: 1,
              price: offer.price,
              productType: 'phone_refill',
              metadata: {
                productType: 'phone_refill',
                offerId: offer.offerId,
                recipientPhone: phone,
                operatorName: operator.name,
                country: operator.country,
                sendAmount: offer.sendAmount,
                sendCurrency: offer.sendCurrency,
                providerCost: offer.cost,
                ...(offer.priceType?.toUpperCase() === 'RANGE' && { value: offer.price }),
              },
            },
          ],
          paymentMethod: 'wallet',
          total: offer.price,
        }),
      })

      const result = await response.json()

      if (result.success) {
        await fetchWalletBalance()
        setPurchaseSuccess({ operatorName: operator.name, offer, phone })
        setExpandedKey(null)
        setSelectedOffer(null)
        setPhoneNumber('')
        setPendingOperator(null)
      } else {
        setPaymentError(result.error || 'Payment failed')
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Payment failed')
    } finally {
      setProcessingCard(null)
    }
  }

  // Handle Pay with Wallet
  const handlePayWithWallet = async (operator: TopupOperator) => {
    if (!selectedOffer) return
    const phone = phoneNumber.replace(/[^+\d]/g, '')
    if (phone.length < 8) return

    setPaymentError(null)

    if (!isAuthenticated) {
      setPendingOperator(operator)
      setShowLoginModal(true)
      return
    }

    let currentBalance = walletBalance
    if (currentBalance === null) {
      setLoadingBalance(true)
      try {
        const result = await getBalance()
        if (result.success && result.data) {
          currentBalance = result.data.balance || 0
          setWalletBalance(currentBalance)
        } else {
          setPaymentError('Failed to fetch wallet balance')
          setLoadingBalance(false)
          return
        }
      } catch {
        setPaymentError('Failed to fetch wallet balance')
        setLoadingBalance(false)
        return
      }
      setLoadingBalance(false)
    }

    if (currentBalance === null || currentBalance < selectedOffer.price) {
      setPendingOperator(operator)
      setShowDepositModal(true)
      return
    }

    await processWalletPayment(operator, selectedOffer, phone)
  }

  // Handle Add to Cart
  const handleAddToCart = (operator: TopupOperator) => {
    if (!selectedOffer) return
    const phone = phoneNumber.replace(/[^+\d]/g, '')
    if (phone.length < 8) return

    const product = {
      id: `refill-${selectedOffer.offerId}-${Date.now()}`,
      name: `${operator.name} Top-Up (${selectedOffer.sendAmount} ${selectedOffer.sendCurrency})`,
      slug: `phone-refill-${operator.id}`,
      description: `Mobile top-up for ${phone}`,
      price: selectedOffer.price,
      rating: 5,
      reviewCount: 0,
      category: 'Phone Refills',
      icon: 'phone',
      iconColor: 'primary',
      tags: [operator.name, 'Phone Refill'],
      productType: 'phone_refill',
      product_type: 'phone_refill',
      metadata: {
        productType: 'phone_refill',
        offerId: selectedOffer.offerId,
        recipientPhone: phone,
        operatorName: operator.name,
        country: operator.country,
        sendAmount: selectedOffer.sendAmount,
        sendCurrency: selectedOffer.sendCurrency,
        ...(selectedOffer.priceType?.toUpperCase() === 'RANGE' && { value: selectedOffer.price }),
      },
    }

    addItem(product, 'standard', selectedOffer.price)
    showAddedToCartPopup(product, selectedOffer.price)
  }

  const isReady = !!selectedOffer && phoneNumber.replace(/[^+\d]/g, '').length >= 8

  // Pick up to 6 "quick-pick" amounts: prefer round numbers, spread across the range
  const getQuickPicks = (offers: TopupOffer[]): TopupOffer[] => {
    if (offers.length <= 6) return offers

    const sorted = [...offers].sort((a, b) => a.price - b.price)
    // Prefer round-ish prices ($5, $10, $20, $25, $50, $100...)
    const roundTargets = [1, 2, 5, 10, 15, 20, 25, 30, 50, 75, 100]
    const picks: TopupOffer[] = []
    const usedIds = new Set<string>()

    for (const target of roundTargets) {
      if (picks.length >= 6) break
      // Find the offer closest to this target
      let best: TopupOffer | null = null
      let bestDist = Infinity
      for (const o of sorted) {
        const dist = Math.abs(o.price - target)
        if (dist < bestDist && !usedIds.has(o.offerId)) {
          best = o
          bestDist = dist
        }
      }
      // Only pick if reasonably close (within 30% of target or $2)
      if (best && (bestDist <= target * 0.3 || bestDist <= 2)) {
        picks.push(best)
        usedIds.add(best.offerId)
      }
    }

    // If we didn't get enough, fill from evenly spaced positions
    if (picks.length < 6) {
      const remaining = sorted.filter((o) => !usedIds.has(o.offerId))
      const step = Math.max(1, Math.floor(remaining.length / (6 - picks.length)))
      for (let i = 0; i < remaining.length && picks.length < 6; i += step) {
        picks.push(remaining[i])
      }
    }

    return picks.sort((a, b) => a.price - b.price)
  }

  // Render a single operator card (ProductCard style)
  const renderOperatorCard = (operator: TopupOperator) => {
    const key = opKey(operator)
    const minPrice = operator.offers.length > 0 ? Math.min(...operator.offers.map((o) => o.price)) : 0
    const maxPrice = operator.offers.length > 0 ? Math.max(...operator.offers.map((o) => o.price)) : 0

    return (
      <div
        key={key}
        onClick={() => handleToggle(operator)}
        className="bg-[#121212] rounded-xl border border-border-dark hover:ring-1 hover:ring-primary/50 transition-all cursor-pointer group overflow-hidden flex flex-col"
      >
        {/* Logo area */}
        <div className="p-3 pb-0">
          <div className="w-full aspect-square bg-white rounded-xl border border-border-dark overflow-hidden flex items-center justify-center">
            <ServiceLogo name={operator.name} size={80} className="rounded-lg" />
          </div>
        </div>
        {/* Info */}
        <div className="p-3 pt-2 flex flex-col flex-grow">
          <div className="flex items-center gap-1 mb-1">
            <h3 className="font-bold text-[11px] text-white group-hover:text-primary transition-colors truncate">{operator.name}</h3>
            <FlagIcon countryCode={operator.country} className="w-3.5 h-2.5 rounded-sm flex-shrink-0" />
          </div>
          <div className="mt-auto">
            <span className="text-[10px] text-slate-300 font-semibold">
              {formatPrice(minPrice)}{minPrice !== maxPrice ? ` - ${formatPrice(maxPrice)}` : ''}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Render pagination
  const renderPagination = () => {
    if (totalPages <= 1) return null
    return (
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {(operatorPage - 1) * OPERATORS_PER_PAGE + 1} - {Math.min(operatorPage * OPERATORS_PER_PAGE, allFiltered.length)} of {allFiltered.length}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOperatorPage((p) => Math.max(1, p - 1))}
            disabled={operatorPage === 1}
            className="px-2 py-1 bg-surface-dark border border-border-dark rounded text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon name="chevron-left" size={14} />
          </button>
          <span className="text-xs text-slate-400 px-2">{operatorPage} / {totalPages}</span>
          <button
            onClick={() => setOperatorPage((p) => Math.min(totalPages, p + 1))}
            disabled={operatorPage === totalPages}
            className="px-2 py-1 bg-surface-dark border border-border-dark rounded text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon name="chevron-right" size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="max-w-container mx-auto px-4 lg:px-12 pb-24">
      {/* Auth Dialog */}
      <AuthDialog
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => {
          setShowLoginModal(false)
          setPendingWalletCheckout(true)
          fetchWalletBalance()
        }}
        defaultTab="login"
      />

      {/* Deposit Modal */}
      <DepositModal
        isOpen={showDepositModal}
        onClose={async () => {
          setShowDepositModal(false)
          const newBalance = await fetchWalletBalance()
          if (pendingOperator && selectedOffer && newBalance !== null) {
            const phone = phoneNumber.replace(/[^+\d]/g, '')
            if (newBalance >= selectedOffer.price && phone.length >= 8) {
              processWalletPayment(pendingOperator, selectedOffer, phone)
            }
          }
        }}
      />

      {/* Breadcrumbs */}
      <div className="py-4">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Phone Refills' }]} className="mb-0" />
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#43D678]/20 via-[#43D678]/10 to-transparent rounded-2xl lg:rounded-3xl p-6 lg:p-12 mb-8 lg:mb-12">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl lg:text-4xl font-extrabold text-white mb-2">Phone Refills</h1>
            <p className="text-slate-500 text-sm lg:text-base max-w-2xl">
              Top up any mobile phone instantly. Pick a carrier, choose an amount, enter the number, and send airtime in seconds.
            </p>
          </div>
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
            placeholder="Search carriers (AT&T, Vodafone, MTN, Airtel...)..."
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
          placeholder="Search carriers (AT&T, Vodafone, MTN, Airtel...)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-charcoal border border-border-dark rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>
      {/* Tablet: wallet below hero */}
      <div className="hidden md:block lg:hidden mb-6">
        <WalletDisplay variant="mobile" />
      </div>

      {/* Success Banner */}
      {purchaseSuccess && (
        <div className="mb-8 bg-green-500/10 border border-green-500/20 rounded-2xl p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
            <Icon name="check" size={28} className="text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Top-Up Sent!</h2>
          <p className="text-slate-400 text-sm">
            {purchaseSuccess.offer.sendAmount} {purchaseSuccess.offer.sendCurrency} sent to {purchaseSuccess.phone} via{' '}
            {purchaseSuccess.operatorName}
          </p>
          <button
            onClick={() => setPurchaseSuccess(null)}
            className="mt-4 px-5 py-2.5 bg-primary text-black font-bold rounded-xl hover:brightness-105 transition-all text-sm"
          >
            Send Another
          </button>
        </div>
      )}

      {/* Loading */}
      {loadingOperators && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
          {[...Array(18)].map((_, i) => (
            <div key={i} className="bg-[#121212] border border-border-dark rounded-xl overflow-hidden animate-pulse p-3">
              <div className="aspect-square w-full bg-slate-800 rounded-xl mb-2" />
              <div className="h-3 bg-slate-800 rounded w-3/4 mb-1.5" />
              <div className="h-3 bg-slate-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loadingOperators && allFiltered.length === 0 && (
        <div className="text-center py-16 bg-charcoal border border-border-dark rounded-2xl">
          <Icon name="phone" size={48} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-white font-bold mb-2">
            {searchQuery ? 'No carriers found' : 'No carriers available'}
          </h3>
          <p className="text-slate-500">
            {searchQuery ? 'Try a different search term' : 'Phone refill carriers will appear here once configured.'}
          </p>
        </div>
      )}

      {/* Main Carrier Grid */}
      {!loadingOperators && allFiltered.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              {searchQuery ? 'Search Results' : 'All Carriers'}
            </h2>
            <span className="text-slate-500 text-sm">{allFiltered.length} carriers</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
            {paginatedOperators.map((op) => renderOperatorCard(op))}
          </div>

          {renderPagination()}
        </>
      )}

      {/* Amount Selection Modal */}
      {expandedKey && (() => {
        const operator = allFiltered.find((op) => opKey(op) === expandedKey)
        if (!operator) return null
        const isProcessing = processingCard === expandedKey

        // Determine pricing mode
        const rangeOffer = operator.offers.find((o) => o.priceType.toUpperCase() === 'RANGE')
        const allSorted = [...operator.offers].sort((a, b) => a.price - b.price)
        // Treat as "use custom input" if explicitly RANGE or has too many fixed offers (>10)
        const hasManyOffers = allSorted.length > 10
        const useCustomInput = !!rangeOffer || hasManyOffers
        const quickPicks = getQuickPicks(operator.offers)

        // Min/max for custom input
        const minPrice = allSorted.length > 0 ? allSorted[0].price : 0
        const maxPrice = allSorted.length > 0 ? allSorted[allSorted.length - 1].price : 100
        const effectiveMin = rangeOffer?.priceMin ?? minPrice
        const effectiveMax = rangeOffer?.priceMax ?? maxPrice

        // For custom input: build a synthetic selectedOffer from the typed amount
        const customAmountNum = parseFloat(customAmount)
        const isCustomValid = useCustomInput && !isNaN(customAmountNum)
          && customAmountNum >= effectiveMin
          && customAmountNum <= effectiveMax

        // Find the closest actual offer for the custom amount (for FIXED operators with many offers)
        const findClosestOffer = (amount: number) => {
          if (rangeOffer) return { ...rangeOffer, price: amount, sendAmount: amount }
          let closest = allSorted[0]
          let minDist = Infinity
          for (const o of allSorted) {
            const dist = Math.abs(o.price - amount)
            if (dist < minDist) { closest = o; minDist = dist }
          }
          return closest
        }

        // Effective selected offer
        const effectiveOffer = useCustomInput
          ? (isCustomValid ? findClosestOffer(customAmountNum) : null)
          : selectedOffer
        const isReadyModal = !!effectiveOffer && phoneNumber.replace(/[^+\d]/g, '').length >= 8

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => handleToggle(operator)}>
            <div className="bg-[#1a1a1a] border border-border-dark rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {/* Modal header */}
              <div className="flex items-center justify-between p-5 border-b border-border-dark">
                <div className="flex items-center gap-3">
                  <ServiceLogo name={operator.name} size={40} className="rounded-lg" />
                  <div>
                    <h3 className="font-bold text-white">{operator.name}</h3>
                    <div className="flex items-center gap-1.5">
                      <FlagIcon countryCode={operator.country} className="w-4 h-3 rounded-sm" />
                      <span className="text-xs text-slate-400">{resolveCountryName(operator.country)}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => handleToggle(operator)} className="p-2 text-slate-500 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                  <Icon name="x" size={18} />
                </button>
              </div>

              {/* Amount selection */}
              <div className="p-5">
                {useCustomInput ? (
                  /* Custom amount input only */
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Enter Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        min={effectiveMin}
                        max={effectiveMax}
                        step="1"
                        placeholder={`${effectiveMin} – ${effectiveMax}`}
                        value={customAmount}
                        onChange={(e) => { setCustomAmount(e.target.value); setPaymentError(null) }}
                        className="w-full pl-8 pr-4 py-3 bg-surface-dark border border-border-dark rounded-xl text-white text-lg font-bold placeholder:text-slate-500 placeholder:font-normal placeholder:text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Min {formatPrice(effectiveMin)} · Max {formatPrice(effectiveMax)}
                    </p>
                  </div>
                ) : (
                  /* Few FIXED offers: show grid */
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Select Amount</label>
                    <div className="grid grid-cols-3 gap-2">
                      {allSorted.map((offer) => (
                        <button
                          key={offer.offerId}
                          onClick={() => { setSelectedOffer(selectedOffer?.offerId === offer.offerId ? null : offer); setPaymentError(null) }}
                          className={`px-3 py-3 rounded-xl text-sm font-bold transition-all text-center ${
                            selectedOffer?.offerId === offer.offerId
                              ? 'bg-primary text-black ring-2 ring-primary/30'
                              : 'bg-surface-dark border border-border-dark text-white hover:border-primary/50'
                          }`}
                        >
                          <span className="block">{formatPrice(offer.price)}</span>
                          {offer.sendCurrency !== 'USD' && offer.sendAmount !== offer.price && (
                            <span className="block text-[10px] font-normal mt-0.5 opacity-60">
                              {offer.sendAmount} {offer.sendCurrency}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Phone + Actions */}
              {(useCustomInput ? isCustomValid : !!selectedOffer) && (
                <div className="px-5 pb-5 space-y-3 border-t border-border-dark pt-4">
                  {/* Summary */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Amount</span>
                    <span className="text-primary font-extrabold text-lg">
                      {formatPrice(effectiveOffer!.price)}
                    </span>
                  </div>

                  {/* Phone input */}
                  <div className="relative">
                    <Icon name="phone" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="tel"
                      placeholder="+1 234 567 8900"
                      value={phoneNumber}
                      onChange={(e) => { setPhoneNumber(e.target.value); setPaymentError(null) }}
                      className="w-full pl-9 pr-4 py-3 bg-surface-dark border border-border-dark rounded-xl text-white text-sm placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (useCustomInput && effectiveOffer) {
                          setSelectedOffer(effectiveOffer)
                        }
                        handlePayWithWallet(operator)
                      }}
                      disabled={!isReadyModal || isProcessing || loadingBalance}
                      className="flex-1 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 bg-primary text-black hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {isProcessing ? (
                        <><div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" /> Processing...</>
                      ) : loadingBalance ? (
                        <><div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" /> Checking...</>
                      ) : (
                        <><Icon name="wallet" size={16} /> Pay with Wallet</>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        if (useCustomInput && effectiveOffer) {
                          setSelectedOffer(effectiveOffer)
                        }
                        handleAddToCart(operator)
                      }}
                      disabled={!isReadyModal}
                      className="flex-1 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 bg-surface-dark border border-border-dark text-white hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      <Icon name="cart" size={16} /> Add to Cart
                    </button>
                  </div>

                  {paymentError && !isProcessing && (
                    <p className="text-xs text-red-400 text-center">{paymentError}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </main>
  )
}
