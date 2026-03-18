'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Icon from '@/components/ui/Icon'
import FlagIcon from '@/components/ui/FlagIcon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { usePreferences } from '@/contexts/PreferencesContext'
import { useCart } from '@/lib/cart-context'
import { getBalance } from '@/lib/api/wallet'
import AuthDialog from '@/components/dialogs/AuthDialog'
import DepositModal from '@/components/wallet/DepositModal'
import WalletDisplay from '@/components/ui/WalletDisplay'
import * as phoneRefillsApi from '@/lib/api/phone-refills'
import type { TopupOperator, TopupOffer } from '@/lib/api/phone-refills'

const OPERATORS_PER_PAGE = 20

// Popular carrier brand names to sort first (case-insensitive partial match)
const POPULAR_CARRIERS = [
  'at&t', 'verizon', 't-mobile', 'vodafone', 'airtel', 'mtn',
  'orange', 'claro', 'movistar', 'jio', 'o2', 'three', 'ee',
  'telcel', 'digicel', 'etisalat', 'globe', 'smart',
]

// Brand-based gradient colors for card headers
const brandGradients: Record<string, string> = {
  'at&t': 'from-blue-800/90 via-blue-700/70 to-sky-900/90',
  'verizon': 'from-red-900/90 via-red-800/70 to-red-700/90',
  't-mobile': 'from-pink-800/90 via-pink-700/70 to-fuchsia-900/90',
  'vodafone': 'from-red-800/90 via-red-700/70 to-rose-900/90',
  'airtel': 'from-red-700/90 via-red-600/70 to-rose-800/90',
  'mtn': 'from-yellow-700/90 via-yellow-600/70 to-amber-800/90',
  'orange': 'from-orange-700/90 via-orange-600/70 to-amber-700/90',
  'claro': 'from-red-800/90 via-rose-700/70 to-red-900/90',
  'movistar': 'from-blue-700/90 via-cyan-600/70 to-teal-800/90',
  'jio': 'from-blue-800/90 via-blue-700/70 to-indigo-900/90',
  'o2': 'from-blue-700/90 via-indigo-600/70 to-blue-800/90',
  'three': 'from-purple-800/90 via-purple-700/70 to-indigo-900/90',
  'ee': 'from-teal-700/90 via-teal-600/70 to-cyan-800/90',
  'telcel': 'from-blue-800/90 via-blue-700/70 to-sky-900/90',
  'digicel': 'from-red-800/90 via-rose-700/70 to-pink-900/90',
  'etisalat': 'from-green-800/90 via-emerald-700/70 to-teal-900/90',
  'globe': 'from-blue-700/90 via-blue-600/70 to-indigo-800/90',
  'smart': 'from-green-700/90 via-emerald-600/70 to-green-800/90',
}
const defaultGradient = 'from-slate-800/90 via-slate-700/70 to-slate-800/90'

function resolveCountryName(isoCode: string): string {
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' })
    return displayNames.of(isoCode) || isoCode
  } catch {
    return isoCode
  }
}

function getCarrierGradient(name: string): string {
  const lower = name.toLowerCase()
  for (const [key, gradient] of Object.entries(brandGradients)) {
    if (lower.includes(key)) return gradient
  }
  return defaultGradient
}

function isPopularCarrier(name: string): boolean {
  const lower = name.toLowerCase()
  return POPULAR_CARRIERS.some((p) => lower.includes(p))
}

// Get carrier initials for the logo placeholder
function getCarrierInitials(name: string): string {
  return name
    .split(/[\s\-&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('')
}

export default function PhoneRefillsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [operatorPage, setOperatorPage] = useState(1)

  // Per-card state: keyed by operator composite key
  const [selectedOffers, setSelectedOffers] = useState<Record<string, TopupOffer>>({})
  const [phoneNumbers, setPhoneNumbers] = useState<Record<string, string>>({})
  const [processingCard, setProcessingCard] = useState<string | null>(null)
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({})
  const [purchaseSuccess, setPurchaseSuccess] = useState<{ operatorKey: string; offer: TopupOffer; phone: string } | null>(null)

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

  // Composite key for an operator
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

  // Sort: popular first, then alphabetical. Filter by search.
  const filteredOperators = useMemo(() => {
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
    return [...list].sort((a, b) => {
      const aPop = isPopularCarrier(a.name) ? 0 : 1
      const bPop = isPopularCarrier(b.name) ? 0 : 1
      if (aPop !== bPop) return aPop - bPop
      return a.name.localeCompare(b.name)
    })
  }, [operators, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredOperators.length / OPERATORS_PER_PAGE)
  const paginatedOperators = filteredOperators.slice(
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
    if (pendingWalletCheckout && isAuthenticated && walletBalance !== null && pendingOperator) {
      setPendingWalletCheckout(false)
      const key = opKey(pendingOperator)
      const offer = selectedOffers[key]
      const phone = phoneNumbers[key]
      if (!offer || !phone) {
        setPendingOperator(null)
        return
      }
      if (walletBalance >= offer.price) {
        processWalletPayment(pendingOperator, offer, phone)
      } else {
        setShowDepositModal(true)
      }
    }
  }, [pendingWalletCheckout, isAuthenticated, walletBalance, pendingOperator])

  // Process wallet payment
  const processWalletPayment = async (operator: TopupOperator, offer: TopupOffer, phone: string) => {
    const key = opKey(operator)
    setProcessingCard(key)
    setPaymentErrors((prev) => {
      const n = { ...prev }
      delete n[key]
      return n
    })

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
                recipientPhone: phone.replace(/[^+\d]/g, ''),
                operatorName: operator.name,
                country: operator.country,
                sendAmount: offer.sendAmount,
                sendCurrency: offer.sendCurrency,
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
        setPurchaseSuccess({ operatorKey: key, offer, phone })
        // Clear card state
        setSelectedOffers((prev) => {
          const n = { ...prev }
          delete n[key]
          return n
        })
        setPhoneNumbers((prev) => {
          const n = { ...prev }
          delete n[key]
          return n
        })
        setPendingOperator(null)
      } else {
        setPaymentErrors((prev) => ({ ...prev, [key]: result.error || 'Payment failed' }))
      }
    } catch (err: any) {
      setPaymentErrors((prev) => ({ ...prev, [key]: err.message || 'Payment failed' }))
    } finally {
      setProcessingCard(null)
    }
  }

  // Handle Pay with Wallet
  const handlePayWithWallet = async (operator: TopupOperator) => {
    const key = opKey(operator)
    const offer = selectedOffers[key]
    const phone = phoneNumbers[key]?.replace(/[^+\d]/g, '')
    if (!offer || !phone || phone.length < 8) return

    setPaymentErrors((prev) => {
      const n = { ...prev }
      delete n[key]
      return n
    })

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
          setPaymentErrors((prev) => ({ ...prev, [key]: 'Failed to fetch wallet balance' }))
          setLoadingBalance(false)
          return
        }
      } catch {
        setPaymentErrors((prev) => ({ ...prev, [key]: 'Failed to fetch wallet balance' }))
        setLoadingBalance(false)
        return
      }
      setLoadingBalance(false)
    }

    if (currentBalance === null || currentBalance < offer.price) {
      setPendingOperator(operator)
      setShowDepositModal(true)
      return
    }

    await processWalletPayment(operator, offer, phone)
  }

  // Handle Add to Cart
  const handleAddToCart = (operator: TopupOperator) => {
    const key = opKey(operator)
    const offer = selectedOffers[key]
    const phone = phoneNumbers[key]?.replace(/[^+\d]/g, '')
    if (!offer || !phone || phone.length < 8) return

    const product = {
      id: `refill-${offer.offerId}-${Date.now()}`,
      name: `${operator.name} Top-Up (${offer.sendAmount} ${offer.sendCurrency})`,
      slug: `phone-refill-${operator.id}`,
      description: `Mobile top-up for ${phone}`,
      price: offer.price,
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
        offerId: offer.offerId,
        recipientPhone: phone,
        operatorName: operator.name,
        country: operator.country,
        sendAmount: offer.sendAmount,
        sendCurrency: offer.sendCurrency,
      },
    }

    addItem(product, 'standard', offer.price)
    showAddedToCartPopup(product, offer.price)
  }

  // Check if card is ready for purchase
  const isCardReady = (key: string): boolean => {
    const offer = selectedOffers[key]
    const phone = phoneNumbers[key]?.replace(/[^+\d]/g, '') || ''
    return !!offer && phone.length >= 8
  }

  // Render pagination
  const renderPagination = () => {
    if (totalPages <= 1) return null

    const pages: (number | 'ellipsis')[] = []
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (operatorPage > 3) pages.push('ellipsis')
      for (let i = Math.max(2, operatorPage - 1); i <= Math.min(totalPages - 1, operatorPage + 1); i++) {
        pages.push(i)
      }
      if (operatorPage < totalPages - 2) pages.push('ellipsis')
      pages.push(totalPages)
    }

    return (
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing {(operatorPage - 1) * OPERATORS_PER_PAGE + 1} -{' '}
          {Math.min(operatorPage * OPERATORS_PER_PAGE, filteredOperators.length)} of{' '}
          {filteredOperators.length} carriers
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOperatorPage((p) => Math.max(1, p - 1))}
            disabled={operatorPage === 1}
            className="flex items-center gap-1 px-3 py-2 bg-surface-dark border border-border-dark rounded-lg text-sm text-slate-300 hover:text-white hover:bg-[#262626] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon name="chevron-left" size={16} />
            <span className="hidden md:inline">Previous</span>
          </button>
          <div className="flex items-center gap-1">
            {pages.map((page, idx) =>
              page === 'ellipsis' ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-slate-500">
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => setOperatorPage(page)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    operatorPage === page
                      ? 'bg-primary text-black font-bold'
                      : 'bg-surface-dark border border-border-dark text-slate-400 hover:text-white hover:bg-[#262626]'
                  }`}
                >
                  {page}
                </button>
              )
            )}
          </div>
          <button
            onClick={() => setOperatorPage((p) => Math.min(totalPages, p + 1))}
            disabled={operatorPage === totalPages}
            className="flex items-center gap-1 px-3 py-2 bg-surface-dark border border-border-dark rounded-lg text-sm text-slate-300 hover:text-white hover:bg-[#262626] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="hidden md:inline">Next</span>
            <Icon name="chevron-right" size={16} />
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
          if (pendingOperator && newBalance !== null) {
            const key = opKey(pendingOperator)
            const offer = selectedOffers[key]
            const phone = phoneNumbers[key]?.replace(/[^+\d]/g, '')
            if (offer && phone && newBalance >= offer.price) {
              processWalletPayment(pendingOperator, offer, phone)
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
              Top up any mobile phone instantly. Pick a carrier, enter the number, choose an amount, and pay in seconds.
            </p>
          </div>
          <WalletDisplay variant="desktop" />
        </header>
      </div>

      <WalletDisplay variant="mobile" />

      {/* Success Banner */}
      {purchaseSuccess && (
        <div className="mb-8 bg-green-500/10 border border-green-500/20 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <Icon name="check" size={32} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Top-Up Sent!</h2>
          <p className="text-slate-400 mb-2">
            {purchaseSuccess.offer.sendAmount} {purchaseSuccess.offer.sendCurrency} has been sent to{' '}
            {purchaseSuccess.phone}
          </p>
          <button
            onClick={() => setPurchaseSuccess(null)}
            className="px-6 py-3 bg-primary text-black font-bold rounded-xl hover:brightness-105 transition-all"
          >
            Send Another Top-Up
          </button>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Icon name="search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search carriers (AT&T, Vodafone, MTN, etc.)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-charcoal border border-border-dark rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      {/* Carrier count */}
      {!loadingOperators && filteredOperators.length > 0 && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {searchQuery ? 'Search Results' : 'All Carriers'}
          </h2>
          <span className="text-slate-500 text-sm">{filteredOperators.length} carriers available</span>
        </div>
      )}

      {/* Loading */}
      {loadingOperators && (
        <div className="grid grid-cols-1 min-[560px]:grid-cols-2 min-[700px]:grid-cols-3 min-[960px]:grid-cols-4 gap-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="bg-charcoal border border-border-dark rounded-2xl overflow-hidden animate-pulse">
              <div className="h-28 bg-slate-700" />
              <div className="p-5">
                <div className="h-5 bg-slate-700 rounded w-3/4 mb-3" />
                <div className="h-4 bg-slate-700 rounded w-1/2 mb-4" />
                <div className="flex gap-2">
                  <div className="h-8 bg-slate-700 rounded w-16" />
                  <div className="h-8 bg-slate-700 rounded w-16" />
                  <div className="h-8 bg-slate-700 rounded w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loadingOperators && filteredOperators.length === 0 && (
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

      {/* Carrier Cards Grid */}
      {!loadingOperators && filteredOperators.length > 0 && (
        <>
          <div className="grid grid-cols-1 min-[560px]:grid-cols-2 min-[700px]:grid-cols-3 min-[960px]:grid-cols-4 gap-6 items-start">
            {paginatedOperators.map((operator) => {
              const key = opKey(operator)
              const selectedOffer = selectedOffers[key] || null
              const phone = phoneNumbers[key] || ''
              const hasSelection = !!selectedOffer
              const ready = isCardReady(key)
              const isProcessing = processingCard === key
              const gradient = getCarrierGradient(operator.name)
              const initials = getCarrierInitials(operator.name)

              return (
                <div
                  key={key}
                  className={`bg-charcoal border rounded-2xl overflow-hidden transition-all ${
                    hasSelection
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-border-dark hover:border-primary/50'
                  }`}
                >
                  {/* Card Header - Brand gradient with initials */}
                  <div
                    className={`relative h-28 bg-gradient-to-br ${gradient} flex items-center justify-center`}
                  >
                    <div className="w-16 h-16 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-2xl font-extrabold text-white/90">{initials}</span>
                    </div>
                    {isPopularCarrier(operator.name) && (
                      <span className="absolute top-2 right-2 bg-primary text-black text-[10px] font-bold px-2 py-0.5 rounded-md shadow-lg">
                        Popular
                      </span>
                    )}
                    <div className="absolute bottom-2 left-3">
                      <FlagIcon countryCode={operator.country} className="w-5 h-5 rounded-sm" />
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5">
                    <h3 className="font-bold text-white text-lg mb-1 line-clamp-1">{operator.name}</h3>
                    <p className="text-xs text-slate-500 mb-3">{resolveCountryName(operator.country)}</p>

                    {/* Amount Pills */}
                    <div className="mb-3">
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {operator.offers.slice(0, 8).map((offer) => (
                          <button
                            key={offer.offerId}
                            onClick={() => {
                              if (selectedOffer?.offerId === offer.offerId) {
                                // Deselect
                                setSelectedOffers((prev) => {
                                  const n = { ...prev }
                                  delete n[key]
                                  return n
                                })
                              } else {
                                setSelectedOffers((prev) => ({ ...prev, [key]: offer }))
                              }
                              setPaymentErrors((prev) => {
                                const n = { ...prev }
                                delete n[key]
                                return n
                              })
                            }}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              selectedOffer?.offerId === offer.offerId
                                ? 'bg-primary text-black'
                                : 'bg-surface-dark border border-border-dark text-white hover:border-primary hover:bg-primary/10'
                            }`}
                          >
                            {formatPrice(offer.price)}
                          </button>
                        ))}
                      </div>
                      {operator.offers.length > 8 && (
                        <p className="text-[10px] text-slate-500 mt-1">+{operator.offers.length - 8} more amounts</p>
                      )}
                    </div>

                    {/* Phone Number Input (visible when amount selected) */}
                    {hasSelection && (
                      <>
                        <div className="mb-3">
                          <div className="relative">
                            <Icon
                              name="phone"
                              size={14}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                            />
                            <input
                              type="tel"
                              placeholder="+1 234 567 8900"
                              value={phone}
                              onChange={(e) => setPhoneNumbers((prev) => ({ ...prev, [key]: e.target.value }))}
                              className="w-full pl-8 pr-3 py-2.5 bg-surface-dark border border-border-dark rounded-xl text-white text-sm placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">Include country code</p>
                        </div>

                        {/* Price Summary */}
                        <div className="mb-3 p-3 bg-surface-dark rounded-xl">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Recipient gets</span>
                            <span className="text-white font-bold">
                              {selectedOffer.sendAmount} {selectedOffer.sendCurrency}
                            </span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-slate-400 font-bold">You Pay</span>
                            <span className="text-white font-extrabold">{formatPrice(selectedOffer.price)}</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2">
                          <button
                            onClick={() => handlePayWithWallet(operator)}
                            disabled={!ready || isProcessing || loadingBalance}
                            className="w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 bg-primary text-black hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isProcessing ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
                                <span>Processing...</span>
                              </>
                            ) : loadingBalance ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
                                <span>Checking Balance...</span>
                              </>
                            ) : isAuthenticated ? (
                              <>
                                <Icon name="wallet" size={16} />
                                <span>Pay {formatPrice(selectedOffer.price)} with Wallet</span>
                              </>
                            ) : (
                              <>
                                <Icon name="wallet" size={16} />
                                <span>Pay with Wallet</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleAddToCart(operator)}
                            disabled={!ready}
                            className="w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 bg-surface-dark border border-border-dark text-white hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Icon name="cart" size={16} />
                            <span>Add to Cart</span>
                          </button>
                        </div>

                        {/* Payment Error */}
                        {paymentErrors[key] && !isProcessing && (
                          <p className="mt-2 text-xs text-red-400 text-center">{paymentErrors[key]}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {renderPagination()}
        </>
      )}

      {/* How It Works */}
      <div className="mt-12 bg-charcoal border border-border-dark rounded-2xl lg:rounded-3xl p-4 lg:p-12">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">How Phone Refills Work</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary font-extrabold text-lg">
              1
            </div>
            <h3 className="font-bold text-white mb-2">Find Carrier</h3>
            <p className="text-slate-500 text-sm">Search for the mobile carrier you want to top up.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary font-extrabold text-lg">
              2
            </div>
            <h3 className="font-bold text-white mb-2">Select Amount</h3>
            <p className="text-slate-500 text-sm">Choose from available denominations on the card.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary font-extrabold text-lg">
              3
            </div>
            <h3 className="font-bold text-white mb-2">Enter Number</h3>
            <p className="text-slate-500 text-sm">Type the phone number to recharge with country code.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary font-extrabold text-lg">
              4
            </div>
            <h3 className="font-bold text-white mb-2">Pay & Done</h3>
            <p className="text-slate-500 text-sm">Pay with wallet or add to cart. Airtime delivered instantly.</p>
          </div>
        </div>
      </div>
    </main>
  )
}
