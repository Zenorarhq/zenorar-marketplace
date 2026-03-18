'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Icon from '@/components/ui/Icon'
import FlagIcon from '@/components/ui/FlagIcon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { usePreferences } from '@/contexts/PreferencesContext'
import { getBalance } from '@/lib/api/wallet'
import AuthDialog from '@/components/dialogs/AuthDialog'
import DepositModal from '@/components/wallet/DepositModal'
import WalletDisplay from '@/components/ui/WalletDisplay'
import * as phoneRefillsApi from '@/lib/api/phone-refills'
import type { TopupOperator, TopupOffer } from '@/lib/api/phone-refills'

const OPERATORS_PER_PAGE = 24

// Resolve country name from ISO code
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
  const [selectedOperator, setSelectedOperator] = useState<TopupOperator | null>(null)
  const [selectedOffer, setSelectedOffer] = useState<TopupOffer | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [purchaseSuccess, setPurchaseSuccess] = useState<{ transactionId: string } | null>(null)

  // Wallet/auth state
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [pendingPurchase, setPendingPurchase] = useState(false)

  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { formatPrice } = usePreferences()

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

  // Filter operators by search
  const filteredOperators = useMemo(() => {
    if (!searchQuery) return operators
    const q = searchQuery.toLowerCase()
    return operators.filter(
      (op) =>
        op.name.toLowerCase().includes(q) ||
        op.country.toLowerCase().includes(q) ||
        resolveCountryName(op.country).toLowerCase().includes(q)
    )
  }, [operators, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredOperators.length / OPERATORS_PER_PAGE)
  const paginatedOperators = filteredOperators.slice(
    (operatorPage - 1) * OPERATORS_PER_PAGE,
    operatorPage * OPERATORS_PER_PAGE
  )

  // Reset page when search changes
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

  // Auto-continue after login
  useEffect(() => {
    if (pendingPurchase && isAuthenticated && walletBalance !== null && selectedOffer) {
      setPendingPurchase(false)
      if (walletBalance >= selectedOffer.price) {
        processPurchase()
      } else {
        setShowDepositModal(true)
      }
    }
  }, [pendingPurchase, isAuthenticated, walletBalance, selectedOffer])

  // Process purchase
  const processPurchase = async () => {
    if (!selectedOffer || !phoneNumber) return

    setPurchasing(true)
    setPurchaseError(null)

    try {
      const token = localStorage.getItem('auth_token')
      // Use instant order endpoint (wallet payment)
      const response = await fetch('/api/orders/instant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          items: [{
            productId: selectedOffer.offerId,
            name: `${selectedOperator?.name || 'Mobile'} Top-Up - ${selectedOffer.sendAmount} ${selectedOffer.sendCurrency}`,
            quantity: 1,
            price: selectedOffer.price,
            productType: 'phone_refill',
            metadata: {
              productType: 'phone_refill',
              offerId: selectedOffer.offerId,
              recipientPhone: phoneNumber.replace(/[^+\d]/g, ''),
              operatorName: selectedOperator?.name,
              country: selectedOperator?.country,
              sendAmount: selectedOffer.sendAmount,
              sendCurrency: selectedOffer.sendCurrency,
            },
          }],
          paymentMethod: 'wallet',
          total: selectedOffer.price,
        }),
      })

      const result = await response.json()

      if (result.success) {
        await fetchWalletBalance()
        setPurchaseSuccess({ transactionId: result.data?.orderId || 'completed' })
      } else {
        setPurchaseError(result.error || 'Failed to process top-up')
      }
    } catch (error: any) {
      setPurchaseError(error.message || 'Failed to process top-up')
    } finally {
      setPurchasing(false)
    }
  }

  // Handle buy click
  const handleBuy = async () => {
    if (!selectedOffer || !phoneNumber) return

    setPurchaseError(null)

    if (!isAuthenticated) {
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
          setLoadingBalance(false)
          return
        }
      } catch {
        setLoadingBalance(false)
        return
      }
      setLoadingBalance(false)
    }

    if (currentBalance === null || currentBalance < selectedOffer.price) {
      setShowDepositModal(true)
      return
    }

    await processPurchase()
  }

  // Reset flow
  const handleReset = () => {
    setSelectedOperator(null)
    setSelectedOffer(null)
    setPhoneNumber('')
    setPurchaseError(null)
    setPurchaseSuccess(null)
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
          Showing {((operatorPage - 1) * OPERATORS_PER_PAGE) + 1} - {Math.min(operatorPage * OPERATORS_PER_PAGE, filteredOperators.length)} of {filteredOperators.length} carriers
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
                <span key={`ellipsis-${idx}`} className="px-2 text-slate-500">...</span>
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
          setPendingPurchase(true)
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
          if (selectedOffer && newBalance !== null && newBalance >= selectedOffer.price) {
            processPurchase()
          }
        }}
      />

      {/* Breadcrumbs */}
      <div className="py-4">
        <Breadcrumbs
          items={[{ label: 'Home', href: '/' }, { label: 'Phone Refills' }]}
          className="mb-0"
        />
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#43D678]/20 via-[#43D678]/10 to-transparent rounded-2xl lg:rounded-3xl p-6 lg:p-12 mb-8 lg:mb-12">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl lg:text-4xl font-extrabold text-white mb-2">
              Phone Refills
            </h1>
            <p className="text-slate-500 text-sm lg:text-base max-w-2xl">
              Top up any mobile phone instantly. Select a carrier, enter the phone number, and send airtime in seconds.
            </p>
          </div>
          <WalletDisplay variant="desktop" />
        </header>
      </div>

      <WalletDisplay variant="mobile" />

      {/* Success State */}
      {purchaseSuccess && (
        <div className="mb-8 bg-green-500/10 border border-green-500/20 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <Icon name="check" size={32} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Top-Up Sent!</h2>
          <p className="text-slate-400 mb-2">
            {selectedOffer && `${selectedOffer.sendAmount} ${selectedOffer.sendCurrency}`} has been sent to {phoneNumber}
          </p>
          <p className="text-slate-500 text-sm mb-6">
            {selectedOperator?.name} - {resolveCountryName(selectedOperator?.country || '')}
          </p>
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-primary text-black font-bold rounded-xl hover:brightness-105 transition-all"
          >
            Send Another Top-Up
          </button>
        </div>
      )}

      {/* Main Flow */}
      {!purchaseSuccess && (
        <>
          {/* Step 1: Select Operator (or show selected) */}
          {selectedOperator ? (
            <div className="mb-8">
              {/* Selected operator pill */}
              <div className="bg-primary/10 border border-primary rounded-2xl p-4 flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <FlagIcon countryCode={selectedOperator.country} className="w-10 h-10 rounded" />
                  <div>
                    <h3 className="font-bold text-white">{selectedOperator.name}</h3>
                    <p className="text-sm text-slate-400">{resolveCountryName(selectedOperator.country)}</p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label="Change carrier"
                >
                  <Icon name="x" size={20} className="text-white" />
                </button>
              </div>

              {/* Step 2: Enter phone number */}
              <div className="mb-6">
                <label className="block text-white font-bold mb-2">Recipient Phone Number</label>
                <div className="relative">
                  <Icon name="phone" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="tel"
                    placeholder="e.g. +1 234 567 8900"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-charcoal border border-border-dark rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <p className="text-slate-500 text-xs mt-1">Include country code (e.g. +1 for US, +44 for UK)</p>
              </div>

              {/* Step 3: Select amount */}
              <div className="mb-6">
                <h3 className="text-white font-bold mb-3">Select Amount</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {selectedOperator.offers.map((offer) => (
                    <button
                      key={offer.offerId}
                      onClick={() => setSelectedOffer(offer)}
                      className={`p-4 rounded-xl border transition-all text-left ${
                        selectedOffer?.offerId === offer.offerId
                          ? 'bg-primary/10 border-primary'
                          : 'bg-charcoal border-border-dark hover:border-primary/50'
                      }`}
                    >
                      <div className="text-lg font-extrabold text-white">
                        {offer.sendAmount} {offer.sendCurrency}
                      </div>
                      <div className="text-sm text-slate-400 mt-1">
                        {formatPrice(offer.price)}
                      </div>
                      {offer.shortNotes && (
                        <div className="text-xs text-slate-500 mt-1 truncate">{offer.shortNotes}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {purchaseError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm">{purchaseError}</p>
                </div>
              )}

              {/* Step 4: Buy button */}
              <button
                onClick={handleBuy}
                disabled={!selectedOffer || !phoneNumber || phoneNumber.replace(/[^+\d]/g, '').length < 8 || purchasing || loadingBalance}
                className="w-full py-4 rounded-xl bg-primary text-black font-bold hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {purchasing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent"></div>
                    Processing...
                  </>
                ) : loadingBalance ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent"></div>
                    Checking Balance...
                  </>
                ) : selectedOffer && isAuthenticated ? (
                  <>
                    <Icon name="wallet" size={18} />
                    Pay {formatPrice(selectedOffer.price)} with Wallet
                  </>
                ) : (
                  <>
                    <Icon name="wallet" size={18} />
                    Pay with Wallet
                  </>
                )}
              </button>
              <p className="text-slate-500 text-xs text-center mt-3">
                Airtime delivered instantly after payment
              </p>
            </div>
          ) : (
            /* Operator Selection Grid */
            <div className="mb-10">
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

              {/* Operators Grid */}
              {loadingOperators ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {[...Array(24)].map((_, i) => (
                    <div key={i} className="bg-charcoal border border-border-dark rounded-2xl p-4 animate-pulse">
                      <div className="w-8 h-8 bg-slate-700 rounded mb-3" />
                      <div className="h-4 bg-slate-700 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-slate-700 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredOperators.length === 0 ? (
                <div className="text-center py-12">
                  <Icon name="phone" size={48} className="text-slate-600 mx-auto mb-4" />
                  <h3 className="text-white font-bold mb-2">
                    {searchQuery ? 'No carriers found' : 'No carriers available'}
                  </h3>
                  <p className="text-slate-500">
                    {searchQuery ? 'Try a different search term' : 'Phone refill carriers will appear here once configured.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {paginatedOperators.map((operator) => (
                      <button
                        key={`${operator.id}-${operator.country}`}
                        onClick={() => {
                          setSelectedOperator(operator)
                          setSelectedOffer(null)
                          setPhoneNumber('')
                          setPurchaseError(null)
                        }}
                        className="flex items-center gap-3 p-4 bg-charcoal border border-border-dark rounded-2xl hover:border-primary/50 transition-all text-left"
                      >
                        <FlagIcon countryCode={operator.country} className="w-8 h-8 rounded flex-shrink-0" />
                        <div className="min-w-0">
                          <h3 className="font-medium text-white text-sm truncate">{operator.name}</h3>
                          <p className="text-xs text-slate-500">{resolveCountryName(operator.country)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {renderPagination()}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* How It Works */}
      <div className="bg-charcoal border border-border-dark rounded-2xl lg:rounded-3xl p-4 lg:p-12">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">How Phone Refills Work</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="search" size={24} className="text-primary" />
            </div>
            <h3 className="font-bold text-white mb-2">Find Carrier</h3>
            <p className="text-slate-500 text-sm">
              Search for the mobile carrier you want to top up.
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="phone" size={24} className="text-primary" />
            </div>
            <h3 className="font-bold text-white mb-2">Enter Number</h3>
            <p className="text-slate-500 text-sm">
              Enter the phone number you want to recharge.
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="wallet" size={24} className="text-primary" />
            </div>
            <h3 className="font-bold text-white mb-2">Pay Instantly</h3>
            <p className="text-slate-500 text-sm">
              Pay with your wallet balance. No extra fees.
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="flash" size={24} className="text-primary" />
            </div>
            <h3 className="font-bold text-white mb-2">Instant Delivery</h3>
            <p className="text-slate-500 text-sm">
              Airtime is delivered to the phone within seconds.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
