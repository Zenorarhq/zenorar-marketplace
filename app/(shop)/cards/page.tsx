'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/ui/Icon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { useAuth } from '@/contexts/AuthContext'
import { usePreferences } from '@/contexts/PreferencesContext'
import { getBalance } from '@/lib/api/wallet'
import AuthDialog from '@/components/dialogs/AuthDialog'
import DepositModal from '@/components/wallet/DepositModal'

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

interface ProvidersData {
  virtual: CardProvider[]
  instant: CardProvider[]
}

export default function CardsPage() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const { formatPrice } = usePreferences()

  const [activeTab, setActiveTab] = useState<TabType>('virtual')
  const [providers, setProviders] = useState<ProvidersData>({ virtual: [], instant: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Selected card state
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [selectedDenomination, setSelectedDenomination] = useState<number | null>(null)
  const [selectedBrand, setSelectedBrand] = useState<'visa' | 'mastercard'>('visa')

  // Payment state
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  // Wallet state
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)

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

  // Handle card creation
  const handleCreateCard = async (provider: string, denomination?: number) => {
    if (!isAuthenticated) {
      setShowLoginModal(true)
      return
    }

    setProcessingPayment(true)
    setPaymentError(null)

    try {
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          cardType: denomination ? 'instant' : 'virtual',
          denomination,
          cardBrand: selectedBrand
        })
      })

      const data = await response.json()

      if (!data.success) {
        if (data.error?.includes('Insufficient balance')) {
          setShowDepositModal(true)
        }
        throw new Error(data.error || 'Failed to create card')
      }

      // Redirect to card library
      router.push('/profile/cards')
    } catch (err: any) {
      setPaymentError(err.message)
    } finally {
      setProcessingPayment(false)
    }
  }

  const currentProviders = activeTab === 'virtual' ? providers.virtual : providers.instant

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Breadcrumbs */}
      <div className="border-b border-[#1f1f1f] bg-[#0f0f0f]">
        <div className="container mx-auto px-4 py-3">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Cards', href: '/cards' }
            ]}
          />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Virtual Cards</h1>
          <p className="text-slate-400">
            Get instant virtual cards for online payments
          </p>
        </div>

        {/* Wallet Balance */}
        {isAuthenticated && (
          <div className="mb-6 p-4 bg-[#0f0f0f] rounded-xl border border-[#1f1f1f]">
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
          <div className="flex gap-2 p-1 bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] w-fit">
            <button
              onClick={() => setActiveTab('virtual')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'virtual'
                  ? 'bg-primary text-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon name="credit-card" size={18} />
                Virtual Cards
              </span>
            </button>
            <button
              onClick={() => setActiveTab('instant')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'instant'
                  ? 'bg-primary text-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon name="zap" size={18} />
                Instant Cards
              </span>
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-500">
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
          <div className="flex items-center justify-center py-20">
            <Icon name="loader" size={32} className="text-primary animate-spin" />
          </div>
        )}

        {/* No Providers */}
        {!loading && currentProviders.length === 0 && (
          <div className="text-center py-20">
            <Icon name="credit-card" size={48} className="text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">
              No {activeTab} cards available
            </h3>
            <p className="text-slate-400">
              Check back later for available card options
            </p>
          </div>
        )}

        {/* Card Providers Grid */}
        {!loading && currentProviders.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTab === 'virtual' ? (
              // Virtual Cards - Show provider cards
              currentProviders.map((provider) => (
                <VirtualCardOption
                  key={provider.provider}
                  provider={provider}
                  formatPrice={formatPrice}
                  onSelect={() => handleCreateCard(provider.provider)}
                  processing={processingPayment}
                />
              ))
            ) : (
              // Instant Cards - Show denomination options
              currentProviders[0]?.denominations?.map((denom) => (
                <InstantCardOption
                  key={`${denom.brand}-${denom.value}`}
                  denomination={denom}
                  formatPrice={formatPrice}
                  onSelect={() => handleCreateCard('reloadly', denom.value)}
                  processing={processingPayment}
                />
              ))
            )}
          </div>
        )}

        {/* Payment Error */}
        {paymentError && (
          <div className="fixed bottom-4 right-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl max-w-md">
            <p className="text-red-400">{paymentError}</p>
            <button
              onClick={() => setPaymentError(null)}
              className="mt-2 text-sm text-red-300 hover:text-red-200"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Auth Dialog */}
      {showLoginModal && (
        <AuthDialog
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          defaultTab="login"
        />
      )}

      {/* Deposit Modal */}
      {showDepositModal && (
        <DepositModal
          isOpen={showDepositModal}
          onClose={() => {
            setShowDepositModal(false)
            getBalance().then(response => setWalletBalance(response.data?.balance ?? null))
          }}
        />
      )}
    </div>
  )
}

// Virtual Card Option Component
function VirtualCardOption({
  provider,
  formatPrice,
  onSelect,
  processing
}: {
  provider: CardProvider
  formatPrice: (price: number) => string
  onSelect: () => void
  processing: boolean
}) {
  const isPremium = provider.isPremium

  return (
    <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6 hover:border-[#2f2f2f] transition-colors">
      {/* Card Preview */}
      <div className={`relative h-40 rounded-xl mb-4 overflow-hidden ${
        isPremium
          ? 'bg-gradient-to-br from-amber-900/50 via-yellow-800/30 to-amber-900/50'
          : 'bg-gradient-to-br from-blue-900/50 via-indigo-800/30 to-blue-900/50'
      }`}>
        <div className="absolute inset-0 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-white/80 text-sm font-medium">
              {isPremium ? 'Premium Visa' : 'Visa'}
            </span>
            {isPremium && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                3D Secure
              </span>
            )}
          </div>
          <div>
            <p className="text-white/60 text-xs mb-1">Virtual Card</p>
            <p className="text-white font-mono text-lg">**** **** **** ****</p>
          </div>
        </div>
      </div>

      {/* Details */}
      <h3 className="text-lg font-semibold text-white mb-2">
        {isPremium ? 'Premium Visa' : 'Visa'}
      </h3>
      <p className="text-sm text-slate-400 mb-4">
        {provider.description || (isPremium
          ? '3D Secure enabled for enhanced security'
          : 'Standard virtual card for online payments')}
      </p>

      {/* Pricing */}
      <div className="space-y-2 mb-4 text-sm">
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

      {/* Action Button */}
      <button
        onClick={onSelect}
        disabled={processing}
        className="w-full py-3 bg-primary text-black rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <Icon name="loader" size={18} className="animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Icon name="plus" size={18} />
            Create Card
          </>
        )}
      </button>
    </div>
  )
}

// Instant Card Option Component
function InstantCardOption({
  denomination,
  formatPrice,
  onSelect,
  processing
}: {
  denomination: { value: number; totalPrice: number; brand: string }
  formatPrice: (price: number) => string
  onSelect: () => void
  processing: boolean
}) {
  const brandName = denomination.brand === 'mastercard' ? 'Mastercard' : 'Visa'

  return (
    <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6 hover:border-[#2f2f2f] transition-colors">
      {/* Card Preview */}
      <div className="relative h-32 rounded-xl mb-4 overflow-hidden bg-gradient-to-br from-emerald-900/50 via-teal-800/30 to-emerald-900/50">
        <div className="absolute inset-0 p-4 flex flex-col justify-between">
          <span className="text-white/80 text-sm font-medium">{brandName}</span>
          <div>
            <p className="text-white/60 text-xs mb-1">Instant Card</p>
            <p className="text-white font-bold text-2xl">${denomination.value}</p>
          </div>
        </div>
      </div>

      {/* Details */}
      <h3 className="text-lg font-semibold text-white mb-2">
        {brandName} ${denomination.value}
      </h3>
      <p className="text-sm text-slate-400 mb-4">
        One-time use card, instant delivery
      </p>

      {/* Pricing */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-slate-400">Total</span>
        <span className="text-xl font-bold text-primary">
          {formatPrice(denomination.totalPrice)}
        </span>
      </div>

      {/* Action Button */}
      <button
        onClick={onSelect}
        disabled={processing}
        className="w-full py-3 bg-primary text-black rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <Icon name="loader" size={18} className="animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Icon name="zap" size={18} />
            Buy Now
          </>
        )}
      </button>
    </div>
  )
}
