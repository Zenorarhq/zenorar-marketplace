'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import Icon from '@/components/ui/Icon'
import FlagIcon from '@/components/ui/FlagIcon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { useCart } from '@/lib/cart-context'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { usePreferences } from '@/contexts/PreferencesContext'
import { getBalance } from '@/lib/api/wallet'
import AuthDialog from '@/components/dialogs/AuthDialog'
import DepositModal from '@/components/wallet/DepositModal'
import TestModeBanner from '@/components/ui/TestModeBanner'
import WalletDisplay from '@/components/ui/WalletDisplay'
import * as esimApi from '@/lib/api/esim'
import type { EsimRegion, EsimPlan } from '@/lib/api/esim'
import type { Product } from '@/lib/types'

type TabType = 'local' | 'regional'

const COUNTRIES_PER_PAGE = 16

const POPULAR_COUNTRIES = [
  'US', 'GB', 'JP', 'FR', 'DE', 'KR', 'TH', 'IT', 'ES', 'AU',
  'CA', 'SG', 'TR', 'AE', 'NL', 'CH',
]

const REGION_IMAGES: Record<string, string> = {
  'europe': '/images/esim/europe.jpg',
  'north-america': '/images/esim/north-america.jpg',
  'asia-pacific': '/images/esim/asia-pacific.jpg',
  'middle-east': '/images/esim/middle-east.jpg',
  'africa': '/images/esim/africa.jpg',
  'south-america': '/images/esim/south-america.jpg',
  'global': '/images/esim/global.jpg',
}

const REGION_SUBTITLES: Record<string, string> = {
  'europe': 'Historic & Modern',
  'north-america': 'Innovation Hub',
  'asia-pacific': 'Tech & Tradition',
  'middle-east': 'Business Centers',
  'africa': 'Rising Markets',
  'south-america': 'Vibrant Culture',
  'global': 'Worldwide Coverage',
}

// Resolve country name from ISO code using Intl API
function resolveCountryName(isoCode: string, dbName: string | null): string {
  if (dbName) return dbName
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' })
    return displayNames.of(isoCode) || isoCode
  } catch {
    return isoCode
  }
}

export default function EsimPage() {
  const [activeTab, setActiveTab] = useState<TabType>('local')
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [countryPage, setCountryPage] = useState(1)
  const [addingToCart, setAddingToCart] = useState<string | null>(null)

  // Wallet payment state (matching gift cards pattern)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [processingPayment, setProcessingPayment] = useState<string | null>(null)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [pendingWalletCheckout, setPendingWalletCheckout] = useState(false)
  const [pendingPlan, setPendingPlan] = useState<EsimPlan | null>(null)

  const { addItem, showAddedToCartPopup } = useCart()
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { formatPrice } = usePreferences()

  // Fetch countries that have eSIM plans
  const { data: rawCountries = [] } = useQuery({
    queryKey: ['esim-plan-countries'],
    queryFn: async () => {
      const result = await esimApi.getPlanCountries()
      if (result.success && result.data) return result.data
      return []
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  // Resolve names and sort: popular first, then alphabetical
  const sortedCountries = useMemo(() => {
    const resolved = rawCountries.map((c) => ({
      isoCode: c.isoCode,
      name: resolveCountryName(c.isoCode, c.name),
    }))

    return resolved.sort((a, b) => {
      const aPopIdx = POPULAR_COUNTRIES.indexOf(a.isoCode)
      const bPopIdx = POPULAR_COUNTRIES.indexOf(b.isoCode)
      if (aPopIdx !== -1 && bPopIdx !== -1) return aPopIdx - bPopIdx
      if (aPopIdx !== -1) return -1
      if (bPopIdx !== -1) return 1
      return a.name.localeCompare(b.name)
    })
  }, [rawCountries])

  // Pagination
  const totalCountryPages = Math.ceil(sortedCountries.length / COUNTRIES_PER_PAGE)
  const paginatedCountries = sortedCountries.slice(
    (countryPage - 1) * COUNTRIES_PER_PAGE,
    countryPage * COUNTRIES_PER_PAGE
  )

  // Fetch regions
  const { data: regions = [] } = useQuery({
    queryKey: ['esim-regions'],
    queryFn: async () => {
      const result = await esimApi.getRegions()
      if (result.success && result.data) return result.data
      return []
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  // Fetch plans (only when a country or region is selected)
  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['esim-plans', selectedCountry, selectedRegion],
    queryFn: async () => {
      const result = await esimApi.getPlans({
        countryCode: selectedCountry || undefined,
        regionSlug: selectedRegion || undefined,
      })
      if (result.success && result.data) return result.data
      return []
    },
    enabled: !!selectedCountry || !!selectedRegion,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  // Convert eSIM plan to Product format for cart
  const planToProduct = (plan: EsimPlan): Product => ({
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    description: `${plan.dataAmountDisplay} data, valid for ${plan.validityDays} days. Coverage: ${plan.regionName}`,
    price: plan.retailPrice,
    rating: 5,
    reviewCount: 0,
    category: 'esim',
    categoryId: 'esim',
    icon: 'sim-card',
    iconColor: '#43D678',
    tags: ['esim', plan.regionSlug || '', ...plan.countries.slice(0, 3)],
    badge: plan.isFeatured ? 'Featured' : undefined,
    metadata: {
      productType: 'esim',
      esim_plan_id: plan.id,
      countryIsoCode: plan.countries.length === 1 ? plan.countries[0] : undefined,
    },
  })

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

  // Auto-continue purchase after login
  useEffect(() => {
    if (pendingWalletCheckout && isAuthenticated && walletBalance !== null && pendingPlan) {
      setPendingWalletCheckout(false)
      const plan = pendingPlan

      if (walletBalance >= plan.retailPrice) {
        processWalletPayment(plan)
      } else {
        setShowDepositModal(true)
      }
    }
  }, [pendingWalletCheckout, isAuthenticated, walletBalance, pendingPlan])

  // Process wallet payment (instant checkout via API, matching gift cards pattern)
  const processWalletPayment = async (plan: EsimPlan) => {
    setProcessingPayment(plan.id)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/orders/instant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          items: [{
            productId: plan.id,
            name: plan.name,
            quantity: 1,
            price: plan.retailPrice,
            productType: 'esim',
            metadata: {
              productType: 'esim',
              esim_plan_id: plan.id,
              countryIsoCode: plan.countries.length === 1 ? plan.countries[0] : undefined,
            },
          }],
          paymentMethod: 'wallet',
          total: plan.retailPrice,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Refresh wallet balance and redirect to library
        await fetchWalletBalance()
        setPendingPlan(null)
        router.push('/profile/library?tab=esims&purchased=true')
      } else {
        if (result.data?.refunded) {
          console.error('eSIM provisioning failed, wallet refunded:', result.error)
        }
        console.error('eSIM instant checkout failed:', result.error)
      }
    } catch (error) {
      console.error('Failed to process eSIM payment:', error)
    } finally {
      setProcessingPayment(null)
    }
  }

  // Pay with wallet handler (matching gift cards pattern)
  const handlePayWithWallet = async (plan: EsimPlan) => {
    // If not authenticated, show auth dialog
    if (!isAuthenticated) {
      setPendingPlan(plan)
      setShowLoginModal(true)
      return
    }

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
          setLoadingBalance(false)
          return
        }
      } catch {
        setLoadingBalance(false)
        return
      }
      setLoadingBalance(false)
    }

    // If insufficient balance, show deposit modal
    if (currentBalance === null || currentBalance < plan.retailPrice) {
      setPendingPlan(plan)
      setShowDepositModal(true)
      return
    }

    // Process payment
    await processWalletPayment(plan)
  }

  // Add to Cart: add and stay on page
  const handleAddToCart = async (plan: EsimPlan) => {
    const product = planToProduct(plan)
    await addItem(product, 'standard', plan.retailPrice)
    showAddedToCartPopup(product, plan.retailPrice)
  }

  // Get selected country name
  const selectedCountryName = selectedCountry
    ? sortedCountries.find((c) => c.isoCode === selectedCountry)?.name || selectedCountry
    : null

  // Get selected region data
  const selectedRegionData = selectedRegion
    ? regions.find((r) => r.slug === selectedRegion)
    : null

  // Render plan cards
  const renderPlans = () => {
    if (loadingPlans) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-charcoal border border-border-dark rounded-2xl p-6 animate-pulse">
              <div className="h-6 bg-slate-700 rounded w-3/4 mb-4" />
              <div className="h-4 bg-slate-700 rounded w-1/2 mb-6" />
              <div className="space-y-3 mb-6">
                <div className="h-4 bg-slate-700 rounded" />
                <div className="h-4 bg-slate-700 rounded w-2/3" />
              </div>
              <div className="h-10 bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      )
    }

    if (plans.length === 0) {
      return (
        <div className="text-center py-12">
          <Icon name="sim-card" size={48} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-white font-bold mb-2">No plans found</h3>
          <p className="text-slate-500">No eSIM plans available for this selection.</p>
        </div>
      )
    }

    return (
      <>
        <div className="flex items-center justify-between mt-6 mb-4">
          <h2 className="text-xl font-bold text-white">
            {selectedCountryName
              ? `${selectedCountryName} Plans`
              : selectedRegionData
                ? `${selectedRegionData.name} Plans`
                : 'Available Plans'}
          </h2>
          <span className="text-slate-500 text-sm">{plans.length} plans</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-charcoal border rounded-2xl p-6 hover:border-primary/50 transition-all relative ${
                plan.isFeatured ? 'border-primary' : 'border-border-dark'
              }`}
            >
              {plan.isFeatured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-black text-xs font-bold px-3 py-1 rounded-full">
                    POPULAR
                  </span>
                </div>
              )}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-white">{plan.name}</h3>
                  <p className="text-sm text-slate-500">{selectedCountryName || plan.regionName}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon name="sim-card" size={20} className="text-primary" />
                </div>
              </div>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <Icon name="wifi" size={16} className="text-slate-500" />
                  <span className="text-white font-bold">{plan.dataAmountDisplay}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Icon name="clock" size={16} className="text-slate-500" />
                  <span className="text-slate-400">{plan.validityDays} days</span>
                </div>
                <div className="flex items-center gap-3">
                  <Icon name="globe" size={16} className="text-slate-500" />
                  <span className="text-slate-400 text-sm">
                    {plan.countries?.slice(0, 3).join(', ')}
                    {plan.countries?.length > 3 && ` +${plan.countries.length - 3} more`}
                  </span>
                </div>
                {plan.networkType && (
                  <div className="flex items-center gap-3">
                    <Icon name="wifi" size={16} className="text-slate-500" />
                    <span className="text-slate-400 text-sm uppercase">{plan.networkType}</span>
                  </div>
                )}
              </div>
              <div className="flex items-end justify-between mb-4">
                <span className="text-2xl font-extrabold text-white">
                  ${plan.retailPrice.toFixed(2)}
                </span>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => handlePayWithWallet(plan)}
                  disabled={processingPayment === plan.id || loadingBalance}
                  className="w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 bg-primary text-black hover:brightness-105 disabled:opacity-50"
                >
                  {processingPayment === plan.id ? (
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
                      <span>Pay {formatPrice(plan.retailPrice)} with Wallet</span>
                    </>
                  ) : (
                    <>
                      <Icon name="wallet" size={16} />
                      <span>Pay with Wallet</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleAddToCart(plan)}
                  className="w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 bg-surface-dark border border-border-dark text-white hover:border-primary/50"
                >
                  <Icon name="cart" size={16} />
                  <span>Add to Cart</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }

  // Render pagination
  const renderPagination = () => {
    if (totalCountryPages <= 1) return null

    const pages: (number | 'ellipsis')[] = []
    if (totalCountryPages <= 5) {
      for (let i = 1; i <= totalCountryPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (countryPage > 3) pages.push('ellipsis')
      for (let i = Math.max(2, countryPage - 1); i <= Math.min(totalCountryPages - 1, countryPage + 1); i++) {
        pages.push(i)
      }
      if (countryPage < totalCountryPages - 2) pages.push('ellipsis')
      pages.push(totalCountryPages)
    }

    return (
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing {((countryPage - 1) * COUNTRIES_PER_PAGE) + 1} - {Math.min(countryPage * COUNTRIES_PER_PAGE, sortedCountries.length)} of {sortedCountries.length} countries
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCountryPage((p) => Math.max(1, p - 1))}
            disabled={countryPage === 1}
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
                  onClick={() => setCountryPage(page)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    countryPage === page
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
            onClick={() => setCountryPage((p) => Math.min(totalCountryPages, p + 1))}
            disabled={countryPage === totalCountryPages}
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
          if (pendingPlan && newBalance !== null && newBalance >= pendingPlan.retailPrice) {
            processWalletPayment(pendingPlan)
          }
        }}
      />

      {/* Breadcrumbs */}
      <div className="py-4">
        <Breadcrumbs
          items={[{ label: 'Home', href: '/' }, { label: 'eSIMs' }]}
          className="mb-0"
        />
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#43D678]/20 via-[#43D678]/10 to-transparent rounded-2xl lg:rounded-3xl p-6 lg:p-12 mb-8 lg:mb-12">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl lg:text-4xl font-extrabold text-white mb-2">
              Travel eSIM Plans
            </h1>
            <p className="text-slate-500 text-sm lg:text-base max-w-2xl">
              Stay connected anywhere in the world with instant eSIM activation. No physical SIM card needed.
            </p>
          </div>
          <WalletDisplay variant="desktop" />
        </header>
      </div>

      <WalletDisplay variant="mobile" />

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-surface-dark rounded-xl border border-border-dark w-fit mb-8">
        <button
          onClick={() => {
            setActiveTab('local')
            setSelectedRegion(null)
          }}
          className={`flex items-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'local'
              ? 'bg-primary text-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Icon name="sim-card" size={18} />
          Local eSIMs
        </button>
        <button
          onClick={() => {
            setActiveTab('regional')
            setSelectedCountry(null)
            setCountryPage(1)
          }}
          className={`flex items-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'regional'
              ? 'bg-primary text-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Icon name="globe" size={18} />
          Regional eSIMs
        </button>
      </div>

      {/* Sandbox Mode Banner */}
      <TestModeBanner />

      {/* Local eSIMs Tab */}
      {activeTab === 'local' && (
        <div className="mb-10">
          {selectedCountry ? (
            <>
              {/* Locked-in country */}
              <div className="bg-primary/10 border border-primary rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <FlagIcon countryCode={selectedCountry} className="w-10 h-10 rounded" />
                  <div>
                    <h3 className="font-bold text-white">{selectedCountryName}</h3>
                    <p className="text-sm text-slate-400">{plans.length} plans available</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCountry(null)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label="Clear selection"
                >
                  <Icon name="x" size={20} className="text-white" />
                </button>
              </div>
              {renderPlans()}
            </>
          ) : (
            <>
              {/* Country grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {paginatedCountries.map((country) => (
                  <button
                    key={country.isoCode}
                    onClick={() => setSelectedCountry(country.isoCode)}
                    className="flex items-center gap-3 p-4 bg-charcoal border border-border-dark rounded-2xl hover:border-primary/50 transition-all text-left"
                  >
                    <FlagIcon countryCode={country.isoCode} className="w-8 h-8 rounded flex-shrink-0" />
                    <span className="text-white font-medium text-sm truncate">{country.name}</span>
                  </button>
                ))}
              </div>
              {renderPagination()}
            </>
          )}
        </div>
      )}

      {/* Regional eSIMs Tab */}
      {activeTab === 'regional' && (
        <div className="mb-10">
          {selectedRegion && selectedRegionData ? (
            <>
              {/* Locked-in region */}
              <div className="bg-primary/10 border border-primary rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Icon name="globe" size={24} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{selectedRegionData.name}</h3>
                    <p className="text-sm text-slate-400">{plans.length} plans available</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRegion(null)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label="Clear selection"
                >
                  <Icon name="x" size={20} className="text-white" />
                </button>
              </div>
              {renderPlans()}
            </>
          ) : (
            /* Region cards with images */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {regions.filter((r) => r.slug !== 'global').map((region) => (
                <button
                  key={region.id}
                  onClick={() => setSelectedRegion(region.slug)}
                  className="relative overflow-hidden rounded-2xl h-48 group text-left"
                >
                  {REGION_IMAGES[region.slug] ? (
                    <Image
                      src={REGION_IMAGES[region.slug]}
                      alt={region.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="font-bold text-white text-lg">{region.name}</h3>
                    <p className="text-slate-300 text-sm">{REGION_SUBTITLES[region.slug] || ''}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded text-xs text-white font-medium">
                        {region.countryCount} Countries
                      </span>
                      <span className="px-2 py-0.5 bg-primary/30 backdrop-blur-sm rounded text-xs text-primary font-medium">
                        eSIM Ready
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Features Section */}
      <div className="bg-charcoal border border-border-dark rounded-2xl lg:rounded-3xl p-4 lg:p-12">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">Why Choose Our eSIMs?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="flash" size={24} className="text-primary" />
            </div>
            <h3 className="font-bold text-white mb-2">Instant Activation</h3>
            <p className="text-slate-500 text-sm">
              Get connected within minutes of purchase. No waiting for delivery.
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="globe" size={24} className="text-primary" />
            </div>
            <h3 className="font-bold text-white mb-2">Global Coverage</h3>
            <p className="text-slate-500 text-sm">
              Stay connected in 100+ countries with reliable network coverage.
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="shield" size={24} className="text-primary" />
            </div>
            <h3 className="font-bold text-white mb-2">Secure & Private</h3>
            <p className="text-slate-500 text-sm">
              Your data is encrypted and your privacy is protected.
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="headphones" size={24} className="text-primary" />
            </div>
            <h3 className="font-bold text-white mb-2">24/7 Support</h3>
            <p className="text-slate-500 text-sm">Our support team is always here to help you.</p>
          </div>
        </div>
      </div>
    </main>
  )
}
