'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Icon from '@/components/ui/Icon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { useAuth } from '@/contexts/AuthContext'
import { usePreferences } from '@/contexts/PreferencesContext'
import { useCart } from '@/lib/cart-context'
import { getBalance } from '@/lib/api/wallet'
import { localApiFetch } from '@/lib/api/client'
import AuthDialog from '@/components/dialogs/AuthDialog'
import DepositModal from '@/components/wallet/DepositModal'
import { CardVisualPreview } from '@/components/cards/CardVisual'
import TestModeBanner from '@/components/ui/TestModeBanner'

type TabType = 'virtual' | 'instant'

interface CardProvider {
  provider: string
  displayName: string
  cardType: string
  cardBrand: string
  isPremium: boolean
  creationFee: number
  topUpFeePercent: number
  instantMarkupPercent: number
  minTopUp: number
  maxTopUp: number
  minDenomination: number
  maxDenomination: number
  features: Record<string, any>
  isEnabled: boolean
  description?: string
  denominations?: { value: number; totalPrice: number; brand: string }[]
}

interface ProviderStatus {
  hasProviderConfig: boolean
  providers: {
    sudo: { enabled: boolean; configured: boolean }
    lithic: { enabled: boolean; configured: boolean }
    reloadly: { enabled: boolean; configured: boolean }
  }
  anyVirtualEnabled: boolean
  anyInstantEnabled: boolean
  anyConfigured: boolean
}

interface ProvidersData {
  virtual: CardProvider[]
  instant: CardProvider[]
  status?: ProviderStatus
}

export default function CardsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, user } = useAuth()
  const { formatPrice } = usePreferences()
  const { addItem, showAddedToCartPopup } = useCart()

  // Initialize tab from URL or default to 'virtual'
  const initialTab = (searchParams.get('tab') as TabType) || 'virtual'
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)
  const [providers, setProviders] = useState<ProvidersData>({ virtual: [], instant: [], status: undefined })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Selected card state
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [selectedDenomination, setSelectedDenomination] = useState<number | null>(null)

  // Payment state
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [processingPayment, setProcessingPayment] = useState<string | null>(null) // Track specific card being processed
  const [paymentError, setPaymentError] = useState<string | null>(null)

  // Wallet state
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)

  // Auto-dismiss payment error after 5 seconds
  useEffect(() => {
    if (paymentError) {
      const timer = setTimeout(() => {
        setPaymentError(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [paymentError])

  // Handle tab change with URL update
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    const url = new URL(window.location.href)
    if (tab === 'virtual') {
      url.searchParams.delete('tab')
    } else {
      url.searchParams.set('tab', tab)
    }
    window.history.replaceState({}, '', url.toString())
  }

  // Fetch providers
  useEffect(() => {
    async function fetchProviders() {
      try {
        setLoading(true)
        const response = await fetch('/api/cards/providers')
        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch providers')
        }

        setProviders(data.data)
        setError(null)
      } catch (err: any) {
        console.error('Error fetching providers:', err)
        setError(err.message || 'Failed to load card providers')
      } finally {
        setLoading(false)
      }
    }

    fetchProviders()
  }, [])

  // Fetch wallet balance when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setLoadingBalance(true)
      getBalance()
        .then(response => setWalletBalance(response.data?.balance ?? null))
        .catch(console.error)
        .finally(() => setLoadingBalance(false))
    }
  }, [isAuthenticated])

  // Pending checkout state for auth flow
  const [pendingCheckout, setPendingCheckout] = useState<{
    provider: string
    denomination?: number
    totalCost: number
    cardBrand?: 'visa' | 'mastercard'
  } | null>(null)

  // Process wallet payment
  const processWalletPayment = useCallback(async (provider: string, denomination: number | undefined, totalCost: number, cardBrand?: 'visa' | 'mastercard') => {
    const purchaseId = denomination ? `instant-${denomination}` : `virtual-${provider}`
    setProcessingPayment(purchaseId)
    setPaymentError(null)

    try {
      const data = await localApiFetch<any>('/cards/purchase', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          cardType: denomination ? 'instant' : 'virtual',
          denomination,
          cardBrand: cardBrand || 'visa',
          paymentMethod: 'wallet'
        })
      })

      if (!data.success) {
        throw new Error(data.error || 'Failed to create card')
      }

      // Refresh wallet balance
      const balanceResponse = await getBalance()
      setWalletBalance(balanceResponse.data?.balance ?? null)

      // Redirect to library with cards tab
      router.push('/profile/library?tab=cards&purchased=true')
    } catch (err: any) {
      setPaymentError(err.message)
    } finally {
      setProcessingPayment(null)
      setPendingCheckout(null)
    }
  }, [router])

  // Handle pay with wallet click
  const handlePayWithWallet = async (provider: string, denomination: number | undefined, totalCost: number, cardBrand?: 'visa' | 'mastercard') => {
    // Clear any previous error
    setPaymentError(null)

    // If not authenticated, show auth dialog
    if (!isAuthenticated) {
      setPendingCheckout({ provider, denomination, totalCost, cardBrand })
      setShowLoginModal(true)
      return
    }

    // Check wallet balance
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

    // If insufficient balance, show deposit modal
    if (currentBalance === null || currentBalance < totalCost) {
      setPendingCheckout({ provider, denomination, totalCost, cardBrand })
      setShowDepositModal(true)
      return
    }

    // Process payment
    await processWalletPayment(provider, denomination, totalCost, cardBrand)
  }

  // Auto-continue after login
  useEffect(() => {
    if (isAuthenticated && pendingCheckout) {
      // Fetch balance and continue checkout
      getBalance()
        .then(result => {
          if (result.success && result.data) {
            const balance = result.data.balance || 0
            setWalletBalance(balance)

            if (balance >= pendingCheckout.totalCost) {
              processWalletPayment(
                pendingCheckout.provider,
                pendingCheckout.denomination,
                pendingCheckout.totalCost,
                pendingCheckout.cardBrand
              )
            } else {
              setShowDepositModal(true)
            }
          }
        })
        .catch(console.error)
    }
  }, [isAuthenticated, pendingCheckout, processWalletPayment])

  // Handle adding virtual card to cart
  const handleAddVirtualToCart = (provider: CardProvider) => {
    const isPremium = provider.isPremium
    const product = {
      id: `virtual-card-${provider.provider}-${Date.now()}`,
      name: isPremium ? 'Premium Visa Virtual Card' : 'Visa Virtual Card',
      slug: 'virtual-card-service',
      description: isPremium ? '3D Secure enabled reloadable virtual card' : 'Reloadable virtual card for online payments',
      price: provider.creationFee,
      rating: 5,
      reviewCount: 0,
      category: 'Virtual Cards',
      icon: 'credit-card',
      iconColor: 'primary',
      tags: ['Visa', 'Virtual Card'],
      productType: 'virtual_card',
      product_type: 'virtual_card',
      image: undefined,
      metadata: {
        productType: 'virtual_card',
        provider: provider.provider,
        cardType: 'virtual',
        brand: provider.cardBrand || 'visa',
        isPremium,
      }
    }
    addItem(product, 'standard', provider.creationFee)
    showAddedToCartPopup(product, provider.creationFee)
  }

  // Handle adding instant card to cart
  const handleAddToCart = (denomination: { value: number; totalPrice: number; brand: string }) => {
    const brandName = denomination.brand === 'mastercard' ? 'Mastercard' : 'Visa'

    // Create cart item with unique ID to prevent quantity stacking
    const product = {
      id: `instant-card-${denomination.value}-${Date.now()}`,
      name: `${brandName} $${denomination.value} Instant Card`,
      slug: 'instant-card',
      description: 'One-time use virtual card, instant delivery',
      price: denomination.totalPrice,
      rating: 5,
      reviewCount: 0,
      category: 'Instant Cards',
      icon: 'credit-card',
      iconColor: 'primary',
      tags: [brandName, 'Instant Card', 'Virtual Card'],
      productType: 'instant_card',
      product_type: 'instant_card',
      image: undefined,
      metadata: {
        productType: 'instant_card',
        provider: 'reloadly',
        denomination: denomination.value,
        brand: denomination.brand,
        cardType: 'instant'
      }
    }

    addItem(product, 'standard', denomination.totalPrice)
    showAddedToCartPopup(product, denomination.totalPrice)
  }

  const currentProviders = activeTab === 'virtual' ? providers.virtual : providers.instant

  return (
    <main className="max-w-container mx-auto px-4 lg:px-12 pb-24">
      {/* Breadcrumbs */}
      <div className="py-4">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Cards' }
          ]}
          className="mb-0"
        />
      </div>

      {/* Sandbox Mode Banner */}
      <TestModeBanner />

      {/* Page Header */}
      <div className="bg-gradient-to-r from-[#43D678]/20 via-[#43D678]/10 to-transparent rounded-2xl lg:rounded-3xl p-6 lg:p-12 mb-8 lg:mb-12">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl lg:text-4xl font-extrabold text-white mb-2">Virtual Cards</h1>
            <p className="text-slate-500 text-sm lg:text-base max-w-2xl">
              Get instant virtual cards for online payments. Reloadable cards for repeated use or instant one-time cards.
            </p>
          </div>

          {/* Wallet Balance - Desktop */}
          {isAuthenticated && (
            <div className="hidden lg:flex items-center gap-4 bg-surface-dark/50 rounded-xl p-3 border border-border-dark">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon name="wallet" size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Balance</p>
                  <p className="text-sm font-semibold text-white">
                    {loadingBalance ? '...' : formatPrice(walletBalance || 0)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDepositModal(true)}
                className="px-3 py-1.5 bg-primary text-black rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Add Funds
              </button>
            </div>
          )}
        </header>
      </div>

      {/* Wallet Balance - Mobile */}
      {isAuthenticated && (
        <div className="lg:hidden mb-6 p-4 bg-surface-dark rounded-xl border border-border-dark">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon name="wallet" size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Wallet Balance</p>
                <p className="text-lg font-semibold text-white">
                  {loadingBalance ? '...' : formatPrice(walletBalance || 0)}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDepositModal(true)}
              className="px-4 py-2 bg-primary text-black rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Add Funds
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-8">
        <div className="flex gap-2 p-1 bg-surface-dark rounded-xl border border-border-dark w-fit">
          <button
            onClick={() => handleTabChange('virtual')}
            className={`px-4 lg:px-6 py-2.5 lg:py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'virtual'
                ? 'bg-primary text-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Icon name="credit-card" size={18} />
              <span className="hidden sm:inline">Virtual Cards</span>
              <span className="sm:hidden">Virtual</span>
            </span>
          </button>
          <button
            onClick={() => handleTabChange('instant')}
            className={`px-4 lg:px-6 py-2.5 lg:py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'instant'
                ? 'bg-primary text-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Icon name="zap" size={18} />
              <span className="hidden sm:inline">Instant Cards</span>
              <span className="sm:hidden">Instant</span>
            </span>
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          {activeTab === 'virtual'
            ? 'Reloadable virtual cards for repeated use'
            : 'One-time use cards, instant delivery'}
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-400">Loading cards...</p>
          </div>
        </div>
      )}

      {/* No Providers */}
      {!loading && currentProviders.length === 0 && (
        <NoProvidersMessage
          activeTab={activeTab}
          status={providers.status}
        />
      )}

      {/* Card Providers Grid */}
      {!loading && currentProviders.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {activeTab === 'virtual' ? (
            // Virtual Cards - Show provider cards
            currentProviders.map((provider) => (
              <VirtualCardOption
                key={provider.provider}
                provider={provider}
                formatPrice={formatPrice}
                onPayWithWallet={() => handlePayWithWallet(provider.provider, undefined, provider.creationFee)}
                onAddToCart={() => handleAddVirtualToCart(provider)}
                processing={processingPayment === `virtual-${provider.provider}`}
                loadingBalance={loadingBalance}
                isAuthenticated={isAuthenticated}
              />
            ))
          ) : (
            // Instant Cards - Show denomination options
            currentProviders[0]?.denominations?.map((denom) => (
              <InstantCardOption
                key={`${denom.brand}-${denom.value}`}
                denomination={denom}
                formatPrice={formatPrice}
                onPayWithWallet={() => handlePayWithWallet('reloadly', denom.value, denom.totalPrice, denom.brand as 'visa' | 'mastercard')}
                onAddToCart={() => handleAddToCart(denom)}
                processing={processingPayment === `instant-${denom.value}`}
                loadingBalance={loadingBalance}
                isAuthenticated={isAuthenticated}
              />
            ))
          )}
        </div>
      )}

      {/* Payment Error - Shows below the cards grid */}
      {paymentError && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="alert-circle" size={20} className="text-red-400 flex-shrink-0" />
            <p className="text-red-400">{paymentError}</p>
          </div>
          <button
            onClick={() => setPaymentError(null)}
            className="text-red-300 hover:text-red-200 p-1"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
      )}

      {/* Auth Dialog */}
      {showLoginModal && (
        <AuthDialog
          isOpen={showLoginModal}
          onClose={() => {
            setShowLoginModal(false)
            setPendingCheckout(null)
          }}
          onSuccess={() => {
            setShowLoginModal(false)
            // Balance check and auto-continue will be handled by useEffect
          }}
          defaultTab="login"
        />
      )}

      {/* Deposit Modal */}
      {showDepositModal && (
        <DepositModal
          isOpen={showDepositModal}
          onClose={async () => {
            setShowDepositModal(false)
            // Refresh balance after deposit
            const result = await getBalance()
            const newBalance = result.data?.balance ?? null
            setWalletBalance(newBalance)

            // Auto-complete purchase if now have enough balance
            if (pendingCheckout && newBalance !== null && newBalance >= pendingCheckout.totalCost) {
              processWalletPayment(
                pendingCheckout.provider,
                pendingCheckout.denomination,
                pendingCheckout.totalCost,
                pendingCheckout.cardBrand
              )
            } else {
              setPendingCheckout(null)
            }
          }}
        />
      )}
    </main>
  )
}

// Virtual Card Option Component
function VirtualCardOption({
  provider,
  formatPrice,
  onPayWithWallet,
  onAddToCart,
  processing,
  loadingBalance,
  isAuthenticated
}: {
  provider: CardProvider
  formatPrice: (price: number) => string
  onPayWithWallet: () => void
  onAddToCart: () => void
  processing: boolean
  loadingBalance: boolean
  isAuthenticated: boolean
}) {
  const isPremium = provider.isPremium

  return (
    <div className="bg-surface-dark rounded-xl border border-border-dark p-4 lg:p-6 hover:border-primary/30 transition-colors">
      {/* Card Visual */}
      <div className="flex justify-center mb-4">
        <CardVisualPreview
          brand={(provider.cardBrand as 'visa' | 'mastercard') || 'visa'}
          type="virtual"
          isPremium={isPremium}
        />
      </div>

      {/* Details */}
      <h3 className="text-base lg:text-lg font-semibold text-white mb-2">
        {isPremium ? 'Premium Visa' : 'Visa'}
      </h3>
      <p className="text-xs lg:text-sm text-slate-400 mb-4">
        {provider.description || (isPremium
          ? '3D Secure enabled for enhanced security'
          : 'Standard virtual card for online payments')}
      </p>

      {/* Pricing */}
      <div className="space-y-2 mb-4 text-xs lg:text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Creation Fee</span>
          <span className="text-white font-medium">{formatPrice(provider.creationFee)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Top-up Fee</span>
          <span className="text-white font-medium">{provider.topUpFeePercent}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Top-up Range</span>
          <span className="text-white font-medium">
            {formatPrice(provider.minTopUp)} - {formatPrice(provider.maxTopUp)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onPayWithWallet}
          disabled={processing || loadingBalance}
          className="flex-1 py-2.5 lg:py-3 bg-primary text-black rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm lg:text-base"
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
              <span>Processing...</span>
            </>
          ) : loadingBalance ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
              <span>Checking...</span>
            </>
          ) : (
            <>
              <Icon name="wallet" size={16} />
              <span>{isAuthenticated ? `Pay ${formatPrice(provider.creationFee)}` : 'Pay with Wallet'}</span>
            </>
          )}
        </button>
        <button
          onClick={onAddToCart}
          disabled={processing}
          className="flex-1 py-2.5 lg:py-3 bg-surface-dark border border-border-dark text-white rounded-lg font-medium hover:border-primary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm lg:text-base"
        >
          <Icon name="cart" size={16} />
          <span>Add to Cart</span>
        </button>
      </div>
    </div>
  )
}

// Instant Card Option Component
function InstantCardOption({
  denomination,
  formatPrice,
  onPayWithWallet,
  onAddToCart,
  processing,
  loadingBalance,
  isAuthenticated
}: {
  denomination: { value: number; totalPrice: number; brand: string }
  formatPrice: (price: number) => string
  onPayWithWallet: () => void
  onAddToCart: () => void
  processing: boolean
  loadingBalance: boolean
  isAuthenticated: boolean
}) {
  const brandName = denomination.brand === 'mastercard' ? 'Mastercard' : 'Visa'
  const brand = denomination.brand === 'mastercard' ? 'mastercard' : 'visa'

  return (
    <div className="bg-surface-dark rounded-xl border border-border-dark p-4 lg:p-6 hover:border-primary/30 transition-colors">
      {/* Card Visual */}
      <div className="flex justify-center mb-4">
        <CardVisualPreview
          brand={brand as 'visa' | 'mastercard'}
          type="instant"
          denomination={denomination.value}
        />
      </div>

      {/* Details */}
      <h3 className="text-base lg:text-lg font-semibold text-white mb-2">
        {brandName} ${denomination.value}
      </h3>
      <p className="text-xs lg:text-sm text-slate-400 mb-4">
        One-time use card, instant delivery
      </p>

      {/* Pricing */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-slate-400 text-sm">Total</span>
        <span className="text-lg lg:text-xl font-bold text-primary">
          {formatPrice(denomination.totalPrice)}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <button
          onClick={onPayWithWallet}
          disabled={processing || loadingBalance}
          className="w-full py-2.5 lg:py-3 bg-primary text-black rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm lg:text-base"
        >
          {processing ? (
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
              <span>Pay {formatPrice(denomination.totalPrice)} with Wallet</span>
            </>
          ) : (
            <>
              <Icon name="wallet" size={16} />
              <span>Pay with Wallet</span>
            </>
          )}
        </button>
        <button
          onClick={onAddToCart}
          disabled={processing}
          className="w-full py-2.5 lg:py-3 bg-surface-dark border border-border-dark text-white rounded-lg font-medium hover:border-primary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm lg:text-base"
        >
          <Icon name="cart" size={16} />
          Add to Cart
        </button>
      </div>
    </div>
  )
}

// No Providers Message Component
function NoProvidersMessage({
  activeTab,
  status
}: {
  activeTab: TabType
  status?: ProviderStatus
}) {
  // Determine what message to show based on status
  const isVirtualTab = activeTab === 'virtual'

  const anyEnabled = isVirtualTab
    ? status?.anyVirtualEnabled
    : status?.anyInstantEnabled

  const anyRelevantConfigured = isVirtualTab
    ? (status?.providers.sudo?.configured || status?.providers.lithic?.configured)
    : status?.providers.reloadly?.configured

  // Case 1: Providers exist but none are enabled
  if (status && !anyEnabled) {
    return (
      <div className="text-center py-16 lg:py-24 bg-surface-dark rounded-xl border border-border-dark">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-500/10 flex items-center justify-center">
          <Icon name="toggle-left" size={32} className="text-slate-500" />
        </div>
        <h3 className="text-lg lg:text-xl font-medium text-white mb-2">
          {isVirtualTab ? 'Virtual Cards' : 'Instant Cards'} Not Available
        </h3>
        <p className="text-slate-400 max-w-md mx-auto px-4">
          {isVirtualTab
            ? 'Virtual card providers are currently disabled.'
            : 'Instant card provider is currently disabled.'}
        </p>
        <p className="text-slate-500 text-sm mt-2">
          Check back later or contact support for more information.
        </p>
      </div>
    )
  }

  // Case 2: Providers are enabled but not configured (no API keys)
  if (status && anyEnabled && !anyRelevantConfigured) {
    return (
      <div className="text-center py-16 lg:py-24 bg-surface-dark rounded-xl border border-border-dark">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
          <Icon name="settings" size={32} className="text-amber-500" />
        </div>
        <h3 className="text-lg lg:text-xl font-medium text-white mb-2">
          Coming Soon
        </h3>
        <p className="text-slate-400 max-w-md mx-auto px-4">
          {isVirtualTab
            ? 'Virtual cards are being set up. Please check back soon.'
            : 'Instant cards are being set up. Please check back soon.'}
        </p>
      </div>
    )
  }

  // Case 3: No database config (migration not run)
  if (status && !status.hasProviderConfig) {
    return (
      <div className="text-center py-16 lg:py-24 bg-surface-dark rounded-xl border border-border-dark">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-500/10 flex items-center justify-center">
          <Icon name="database" size={32} className="text-slate-500" />
        </div>
        <h3 className="text-lg lg:text-xl font-medium text-white mb-2">
          Feature Not Available
        </h3>
        <p className="text-slate-400 max-w-md mx-auto px-4">
          Virtual cards feature is not set up yet.
        </p>
      </div>
    )
  }

  // Default case: No providers available (generic message)
  return (
    <div className="text-center py-16 lg:py-24 bg-surface-dark rounded-xl border border-border-dark">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-500/10 flex items-center justify-center">
        <Icon name="credit-card" size={32} className="text-slate-500" />
      </div>
      <h3 className="text-lg lg:text-xl font-medium text-white mb-2">
        No {activeTab === 'virtual' ? 'Virtual' : 'Instant'} Cards Available
      </h3>
      <p className="text-slate-400 max-w-md mx-auto px-4">
        Check back later for available card options.
      </p>
    </div>
  )
}
