'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Icon from '@/components/ui/Icon'
import FlagIcon from '@/components/ui/FlagIcon'
import ServiceLogo from '@/components/ui/ServiceLogo'
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

const OPERATORS_PER_PAGE = 24

// Specific popular brand+country combos to feature at the top
const FEATURED_CARRIERS: { brand: string; country: string }[] = [
  { brand: 'at&t', country: 'US' },
  { brand: 'verizon', country: 'US' },
  { brand: 't-mobile', country: 'US' },
  { brand: 'vodafone', country: 'GB' },
  { brand: 'ee', country: 'GB' },
  { brand: 'three', country: 'GB' },
  { brand: 'orange', country: 'FR' },
  { brand: 'airtel', country: 'IN' },
  { brand: 'jio', country: 'IN' },
  { brand: 'mtn', country: 'NG' },
  { brand: 'claro', country: 'BR' },
  { brand: 'telcel', country: 'MX' },
]

function isFeatured(op: TopupOperator): boolean {
  const lower = op.name.toLowerCase()
  return FEATURED_CARRIERS.some(
    (fc) => lower.includes(fc.brand) && op.country.toUpperCase() === fc.country
  )
}

function resolveCountryName(isoCode: string): string {
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' })
    return displayNames.of(isoCode) || isoCode
  } catch {
    return isoCode
  }
}

export default function PhoneRefillsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [operatorPage, setOperatorPage] = useState(1)

  // The currently expanded operator card (only one at a time)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [selectedOffer, setSelectedOffer] = useState<TopupOffer | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
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

  // Split into featured + rest, filter by search
  const { featured, allFiltered } = useMemo(() => {
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

    const feat: TopupOperator[] = []
    const rest: TopupOperator[] = []
    for (const op of list) {
      if (isFeatured(op)) feat.push(op)
      else rest.push(op)
    }

    // Sort rest alphabetically
    rest.sort((a, b) => a.name.localeCompare(b.name))

    return { featured: feat, allFiltered: [...feat, ...rest] }
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
      setPaymentError(null)
    } else {
      setExpandedKey(key)
      setSelectedOffer(null)
      setPhoneNumber('')
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

  // Render a single operator row
  const renderOperatorRow = (operator: TopupOperator) => {
    const key = opKey(operator)
    const isExpanded = expandedKey === key
    const isProcessing = processingCard === key
    const priceRange =
      operator.offers.length > 0
        ? `${formatPrice(Math.min(...operator.offers.map((o) => o.price)))} - ${formatPrice(Math.max(...operator.offers.map((o) => o.price)))}`
        : ''
    const quickPicks = getQuickPicks(operator.offers)
    const hasMore = operator.offers.length > quickPicks.length

    return (
      <div
        key={key}
        className={`rounded-2xl border transition-all ${
          isExpanded ? 'border-primary bg-charcoal' : 'border-border-dark bg-charcoal hover:border-slate-600'
        }`}
      >
        {/* Collapsed Row - clickable */}
        <button
          onClick={() => handleToggle(operator)}
          className="w-full flex items-center gap-4 p-4 text-left"
        >
          <ServiceLogo name={operator.name} size={44} className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base truncate">{operator.name}</h3>
              <FlagIcon countryCode={operator.country} className="w-5 h-4 rounded-sm flex-shrink-0" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {resolveCountryName(operator.country)} &middot; {operator.offers.length} plan{operator.offers.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="hidden sm:block text-right flex-shrink-0">
            <p className="text-sm font-medium text-primary">{priceRange}</p>
          </div>
          <Icon
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            className="text-slate-500 flex-shrink-0"
          />
        </button>

        {/* Expanded Panel */}
        {isExpanded && (
          <div className="px-4 pb-5 border-t border-border-dark pt-4">
            {/* Amount Selection */}
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                Select Amount
              </label>

              {/* Quick-pick pills */}
              <div className="flex flex-wrap gap-2">
                {quickPicks.map((offer) => (
                  <button
                    key={offer.offerId}
                    onClick={() => {
                      setSelectedOffer(selectedOffer?.offerId === offer.offerId ? null : offer)
                      setPaymentError(null)
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      selectedOffer?.offerId === offer.offerId
                        ? 'bg-primary text-black'
                        : 'bg-surface-dark border border-border-dark text-white hover:border-primary/50'
                    }`}
                  >
                    {formatPrice(offer.price)}
                  </button>
                ))}

                {/* "More" dropdown for remaining amounts */}
                {hasMore && (
                  <div className="relative group">
                    <button
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        selectedOffer && !quickPicks.some((qp) => qp.offerId === selectedOffer.offerId)
                          ? 'bg-primary text-black'
                          : 'bg-surface-dark border border-border-dark text-slate-400 hover:text-white hover:border-primary/50'
                      }`}
                    >
                      {selectedOffer && !quickPicks.some((qp) => qp.offerId === selectedOffer.offerId)
                        ? formatPrice(selectedOffer.price)
                        : `+${operator.offers.length - quickPicks.length} more`}
                      <Icon name="chevron-down" size={14} className="inline ml-1" />
                    </button>
                    {/* Dropdown */}
                    <div className="absolute left-0 top-full mt-1 z-50 hidden group-hover:block group-focus-within:block">
                      <div className="bg-[#1a1a1a] border border-border-dark rounded-xl shadow-2xl py-1 max-h-60 overflow-y-auto w-48 custom-scrollbar">
                        {[...operator.offers]
                          .sort((a, b) => a.price - b.price)
                          .map((offer) => (
                            <button
                              key={offer.offerId}
                              onClick={() => {
                                setSelectedOffer(selectedOffer?.offerId === offer.offerId ? null : offer)
                                setPaymentError(null)
                              }}
                              className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                                selectedOffer?.offerId === offer.offerId
                                  ? 'bg-primary/10 text-primary font-bold'
                                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              <span>{formatPrice(offer.price)}</span>
                              {offer.sendCurrency !== 'USD' && offer.sendAmount !== offer.price && (
                                <span className="text-xs text-slate-500">
                                  {offer.sendAmount} {offer.sendCurrency}
                                </span>
                              )}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Phone Input + Actions (visible when amount selected) */}
            {selectedOffer && (
              <div className="space-y-3">
                {/* Phone Number */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                    Phone Number
                  </label>
                  <div className="relative max-w-md">
                    <Icon
                      name="phone"
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type="tel"
                      placeholder="+1 234 567 8900"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value)
                        setPaymentError(null)
                      }}
                      className="w-full pl-9 pr-4 py-2.5 bg-surface-dark border border-border-dark rounded-xl text-white text-sm placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Include country code (e.g. +1 for US)</p>
                </div>

                {/* Summary + Action Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1">
                  {/* Summary */}
                  <div className="flex-1 flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Receives: </span>
                      <span className="text-white font-bold">
                        {selectedOffer.sendAmount} {selectedOffer.sendCurrency}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">You pay: </span>
                      <span className="text-primary font-extrabold">{formatPrice(selectedOffer.price)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handlePayWithWallet(operator)}
                      disabled={!isReady || isProcessing || loadingBalance}
                      className="flex-1 sm:flex-none font-bold py-2.5 px-5 rounded-xl transition-all flex items-center justify-center gap-2 bg-primary text-black hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
                          Processing...
                        </>
                      ) : loadingBalance ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
                          Checking...
                        </>
                      ) : (
                        <>
                          <Icon name="wallet" size={16} />
                          Pay with Wallet
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleAddToCart(operator)}
                      disabled={!isReady}
                      className="flex-1 sm:flex-none font-bold py-2.5 px-5 rounded-xl transition-all flex items-center justify-center gap-2 bg-surface-dark border border-border-dark text-white hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      <Icon name="cart" size={16} />
                      Add to Cart
                    </button>
                  </div>
                </div>

                {/* Error */}
                {paymentError && !isProcessing && (
                  <p className="text-xs text-red-400">{paymentError}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
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
          {Math.min(operatorPage * OPERATORS_PER_PAGE, allFiltered.length)} of {allFiltered.length} carriers
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
      </div>

      <WalletDisplay variant="mobile" />

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

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
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

      {/* Loading */}
      {loadingOperators && (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-charcoal border border-border-dark rounded-2xl p-4 animate-pulse flex items-center gap-4">
              <div className="w-11 h-11 bg-slate-700 rounded-lg flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-slate-700 rounded w-40 mb-2" />
                <div className="h-3 bg-slate-700 rounded w-24" />
              </div>
              <div className="h-4 bg-slate-700 rounded w-28 hidden sm:block" />
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

      {/* Featured Carriers (only when not searching) */}
      {!loadingOperators && !searchQuery && featured.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4">Popular Carriers</h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {featured.map((op) => {
              const key = opKey(op)
              return (
                <button
                  key={key}
                  onClick={() => handleToggle(op)}
                  className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    expandedKey === key
                      ? 'border-primary bg-primary/10'
                      : 'border-border-dark bg-charcoal hover:border-slate-600'
                  }`}
                >
                  <ServiceLogo name={op.name} size={32} />
                  <div className="text-left">
                    <p className="text-sm font-bold text-white">{op.name}</p>
                    <p className="text-[10px] text-slate-500">{resolveCountryName(op.country)}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Main Carrier List */}
      {!loadingOperators && allFiltered.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              {searchQuery ? 'Search Results' : 'All Carriers'}
            </h2>
            <span className="text-slate-500 text-sm">{allFiltered.length} carriers</span>
          </div>

          <div className="space-y-2">
            {paginatedOperators.map((op) => renderOperatorRow(op))}
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
            <p className="text-slate-500 text-sm">Choose from available top-up denominations.</p>
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
