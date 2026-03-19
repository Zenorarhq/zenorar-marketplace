'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Icon from '@/components/ui/Icon'
import FlagIcon from '@/components/ui/FlagIcon'
import ServiceLogo from '@/components/ui/ServiceLogo'
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
import type { EsimPlan, CarrierEsimPlan } from '@/lib/api/esim'
import type { Product } from '@/lib/types'

type TabType = 'data' | 'carrier'

const COUNTRIES_PER_PAGE = 16

const POPULAR_COUNTRIES = [
  'US', 'GB', 'JP', 'FR', 'DE', 'KR', 'TH', 'IT', 'ES', 'AU',
  'CA', 'SG', 'TR', 'AE', 'NL', 'CH',
]

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
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab = (searchParams.get('tab') === 'carrier' ? 'carrier' : 'data') as TabType
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [countryPage, setCountryPage] = useState(1)
  const [addingToCart, setAddingToCart] = useState<string | null>(null)

  // Carrier eSIM form state
  const [selectedCarrierPlan, setSelectedCarrierPlan] = useState<CarrierEsimPlan | null>(null)
  const [carrierForm, setCarrierForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    deviceImei: '',
    deviceEid: '',
    deviceModel: '',
    addressLine1: '',
    addressCity: '',
    addressState: '',
    addressZip: '',
    addressCountry: 'US',
    specialInstructions: '',
  })
  const [carrierFormError, setCarrierFormError] = useState<string | null>(null)

  // Wallet payment state
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [processingPayment, setProcessingPayment] = useState<string | null>(null)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [pendingWalletCheckout, setPendingWalletCheckout] = useState(false)
  const [pendingPlan, setPendingPlan] = useState<EsimPlan | null>(null)
  const [pendingCarrierPlan, setPendingCarrierPlan] = useState<CarrierEsimPlan | null>(null)

  const { addItem, showAddedToCartPopup } = useCart()
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const { formatPrice } = usePreferences()

  // Pre-fill email from auth
  useEffect(() => {
    if (user?.email && !carrierForm.customerEmail) {
      setCarrierForm(f => ({ ...f, customerEmail: user.email }))
    }
  }, [user?.email])

  // Fetch countries that have eSIM plans
  const { data: rawCountries = [], isError: countriesError } = useQuery({
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

  // Fetch plans (only when a country is selected)
  const { data: plans = [], isLoading: loadingPlans, isError: plansError } = useQuery({
    queryKey: ['esim-plans', selectedCountry],
    queryFn: async () => {
      const result = await esimApi.getPlans({
        countryCode: selectedCountry || undefined,
      })
      if (result.success && result.data) return result.data
      return []
    },
    enabled: !!selectedCountry,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  // Fetch carrier plans
  const { data: carrierPlans = [], isLoading: loadingCarrierPlans, isError: carrierPlansError } = useQuery({
    queryKey: ['carrier-esim-plans'],
    queryFn: async () => {
      const result = await esimApi.getCarrierPlans()
      if (result.success && result.data) return result.data
      return []
    },
    enabled: activeTab === 'carrier',
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  // Group carrier plans by carrier
  const carrierGroups = useMemo(() => {
    const groups: Record<string, { carrierName: string; carrierSlug: string; country: string; plans: CarrierEsimPlan[] }> = {}
    for (const plan of carrierPlans) {
      if (!groups[plan.carrierSlug]) {
        groups[plan.carrierSlug] = {
          carrierName: plan.carrierName,
          carrierSlug: plan.carrierSlug,
          country: plan.country,
          plans: [],
        }
      }
      groups[plan.carrierSlug].plans.push(plan)
    }
    return Object.values(groups)
  }, [carrierPlans])

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

  // Auto-continue purchase after login (data eSIM)
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

  // Auto-continue carrier eSIM purchase after login
  useEffect(() => {
    if (pendingWalletCheckout && isAuthenticated && walletBalance !== null && pendingCarrierPlan) {
      setPendingWalletCheckout(false)
      const plan = pendingCarrierPlan

      if (walletBalance >= plan.retailPrice) {
        processCarrierPayment(plan)
      } else {
        setShowDepositModal(true)
      }
    }
  }, [pendingWalletCheckout, isAuthenticated, walletBalance, pendingCarrierPlan])

  // Process wallet payment for data eSIM
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

  // Process wallet payment for carrier eSIM
  const processCarrierPayment = async (plan: CarrierEsimPlan) => {
    setProcessingPayment(plan.id)
    setCarrierFormError(null)
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
            name: `${plan.carrierName} ${plan.planName}`,
            quantity: 1,
            price: plan.retailPrice,
            productType: 'carrier_esim',
            metadata: {
              productType: 'carrier_esim',
              carrier_plan_id: plan.id,
              carrierName: plan.carrierName,
              customer_name: carrierForm.customerName,
              customer_email: carrierForm.customerEmail,
              customer_phone: carrierForm.customerPhone,
              device_imei: carrierForm.deviceImei,
              device_eid: carrierForm.deviceEid,
              device_model: carrierForm.deviceModel,
              billing_address: {
                line1: carrierForm.addressLine1,
                city: carrierForm.addressCity,
                state: carrierForm.addressState,
                zip: carrierForm.addressZip,
                country: carrierForm.addressCountry,
              },
              special_instructions: carrierForm.specialInstructions,
            },
          }],
          paymentMethod: 'wallet',
          total: plan.retailPrice,
        }),
      })

      const result = await response.json()

      if (result.success) {
        await fetchWalletBalance()
        setPendingCarrierPlan(null)
        setSelectedCarrierPlan(null)
        setCarrierForm({
          customerName: '', customerEmail: user?.email || '', customerPhone: '',
          deviceImei: '', deviceEid: '', deviceModel: '',
          addressLine1: '', addressCity: '', addressState: '', addressZip: '', addressCountry: 'US',
          specialInstructions: '',
        })
        router.push('/profile/library?tab=esims&purchased=true')
      } else {
        setCarrierFormError(result.error || 'Failed to process order')
      }
    } catch (error) {
      console.error('Failed to process carrier eSIM payment:', error)
      setCarrierFormError('Something went wrong. Please try again.')
    } finally {
      setProcessingPayment(null)
    }
  }

  // Pay with wallet handler for data eSIM
  const handlePayWithWallet = async (plan: EsimPlan) => {
    if (!isAuthenticated) {
      setPendingPlan(plan)
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

    if (currentBalance === null || currentBalance < plan.retailPrice) {
      setPendingPlan(plan)
      setShowDepositModal(true)
      return
    }

    if (!window.confirm(`Pay ${formatPrice(plan.retailPrice)} for ${plan.name} using your wallet?`)) return
    await processWalletPayment(plan)
  }

  // Pay with wallet handler for carrier eSIM
  const handleCarrierPayWithWallet = async (plan: CarrierEsimPlan) => {
    setCarrierFormError(null)

    // Validate required fields
    if (!carrierForm.customerName.trim()) {
      setCarrierFormError('Full name is required')
      return
    }
    if (!carrierForm.customerEmail.trim()) {
      setCarrierFormError('Email is required')
      return
    }

    if (!isAuthenticated) {
      setPendingCarrierPlan(plan)
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

    if (currentBalance === null || currentBalance < plan.retailPrice) {
      setPendingCarrierPlan(plan)
      setShowDepositModal(true)
      return
    }

    if (!window.confirm(`Pay ${formatPrice(plan.retailPrice)} for ${plan.carrierName} ${plan.planName} using your wallet? Your eSIM will be delivered within 24 hours.`)) return
    await processCarrierPayment(plan)
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

  // Render plan cards for data eSIMs
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

    if (plansError) {
      return (
        <div className="text-center py-12">
          <Icon name="alert-circle" size={48} className="text-red-500 mx-auto mb-4" />
          <h3 className="text-white font-bold mb-2">Failed to load plans</h3>
          <p className="text-slate-500">Something went wrong. Please try again.</p>
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
            {selectedCountryName ? `${selectedCountryName} Plans` : 'Available Plans'}
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
    return (
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {((countryPage - 1) * COUNTRIES_PER_PAGE) + 1} - {Math.min(countryPage * COUNTRIES_PER_PAGE, filteredCountries.length)} of {filteredCountries.length}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCountryPage(Math.max(1, countryPage - 1))}
            disabled={countryPage === 1}
            className="px-2 py-1 bg-surface-dark border border-border-dark rounded text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon name="chevron-left" size={14} />
          </button>
          <span className="text-xs text-slate-400 px-2">{countryPage} / {totalCountryPages}</span>
          <button
            onClick={() => setCountryPage(Math.min(totalCountryPages, countryPage + 1))}
            disabled={countryPage === totalCountryPages}
            className="px-2 py-1 bg-surface-dark border border-border-dark rounded text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon name="chevron-right" size={14} />
          </button>
        </div>
      </div>
    )
  }

  // Render carrier eSIM form (inline, appears when a plan is selected)
  const renderCarrierForm = (plan: CarrierEsimPlan) => (
    <div className="mt-4 bg-surface-dark border border-border-dark rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-bold text-white">Complete Your Order</h4>
        <button
          onClick={() => { setSelectedCarrierPlan(null); setCarrierFormError(null) }}
          className="p-1 hover:bg-white/10 rounded-lg transition-colors"
        >
          <Icon name="x" size={18} className="text-slate-400" />
        </button>
      </div>

      <p className="text-sm text-slate-400">
        Your eSIM will be delivered within 24 hours. We&apos;ll send setup instructions to your email.
      </p>

      {carrierFormError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
          {carrierFormError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Full Name *</label>
          <input
            type="text"
            value={carrierForm.customerName}
            onChange={e => setCarrierForm(f => ({ ...f, customerName: e.target.value }))}
            placeholder="John Doe"
            className="w-full bg-charcoal border border-border-dark rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Email *</label>
          <input
            type="email"
            value={carrierForm.customerEmail}
            onChange={e => setCarrierForm(f => ({ ...f, customerEmail: e.target.value }))}
            placeholder="john@example.com"
            className="w-full bg-charcoal border border-border-dark rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Phone</label>
          <input
            type="tel"
            value={carrierForm.customerPhone}
            onChange={e => setCarrierForm(f => ({ ...f, customerPhone: e.target.value }))}
            placeholder="+1 (555) 000-0000"
            className="w-full bg-charcoal border border-border-dark rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Device Model</label>
          <input
            type="text"
            value={carrierForm.deviceModel}
            onChange={e => setCarrierForm(f => ({ ...f, deviceModel: e.target.value }))}
            placeholder="iPhone 15 Pro"
            className="w-full bg-charcoal border border-border-dark rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Device IMEI</label>
          <input
            type="text"
            value={carrierForm.deviceImei}
            onChange={e => setCarrierForm(f => ({ ...f, deviceImei: e.target.value }))}
            placeholder="Dial *#06# to find"
            className="w-full bg-charcoal border border-border-dark rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Device EID</label>
          <input
            type="text"
            value={carrierForm.deviceEid}
            onChange={e => setCarrierForm(f => ({ ...f, deviceEid: e.target.value }))}
            placeholder="Settings → General → About"
            className="w-full bg-charcoal border border-border-dark rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Billing Address */}
      <div>
        <h5 className="text-sm font-medium text-slate-300 mb-3">Billing Address</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              value={carrierForm.addressLine1}
              onChange={e => setCarrierForm(f => ({ ...f, addressLine1: e.target.value }))}
              placeholder="Street address"
              className="w-full bg-charcoal border border-border-dark rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-primary focus:outline-none"
            />
          </div>
          <input
            type="text"
            value={carrierForm.addressCity}
            onChange={e => setCarrierForm(f => ({ ...f, addressCity: e.target.value }))}
            placeholder="City"
            className="w-full bg-charcoal border border-border-dark rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-primary focus:outline-none"
          />
          <input
            type="text"
            value={carrierForm.addressState}
            onChange={e => setCarrierForm(f => ({ ...f, addressState: e.target.value }))}
            placeholder="State / Province"
            className="w-full bg-charcoal border border-border-dark rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-primary focus:outline-none"
          />
          <input
            type="text"
            value={carrierForm.addressZip}
            onChange={e => setCarrierForm(f => ({ ...f, addressZip: e.target.value }))}
            placeholder="ZIP / Postal code"
            className="w-full bg-charcoal border border-border-dark rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-primary focus:outline-none"
          />
          <input
            type="text"
            value={carrierForm.addressCountry}
            onChange={e => setCarrierForm(f => ({ ...f, addressCountry: e.target.value }))}
            placeholder="Country"
            className="w-full bg-charcoal border border-border-dark rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Special Instructions */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Special Instructions</label>
        <textarea
          value={carrierForm.specialInstructions}
          onChange={e => setCarrierForm(f => ({ ...f, specialInstructions: e.target.value }))}
          placeholder="Any special requirements..."
          rows={2}
          className="w-full bg-charcoal border border-border-dark rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-primary focus:outline-none resize-none"
        />
      </div>

      {/* Pay Button */}
      <button
        onClick={() => handleCarrierPayWithWallet(plan)}
        disabled={processingPayment === plan.id || loadingBalance}
        className="w-full font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 bg-primary text-black hover:brightness-105 disabled:opacity-50 text-lg"
      >
        {processingPayment === plan.id ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent"></div>
            <span>Processing...</span>
          </>
        ) : loadingBalance ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent"></div>
            <span>Checking Balance...</span>
          </>
        ) : (
          <>
            <Icon name="wallet" size={20} />
            <span>Pay {formatPrice(plan.retailPrice)} with Wallet</span>
          </>
        )}
      </button>

      <p className="text-xs text-slate-500 text-center">
        Delivered within 24 hours. Auto-refund if not fulfilled.
      </p>
    </div>
  )

  return (
    <main className="max-w-container mx-auto px-4 lg:px-12 pb-24">
      {/* Auth Dialog */}
      <AuthDialog
        isOpen={showLoginModal}
        onClose={() => { setShowLoginModal(false); setPendingPlan(null); setPendingCarrierPlan(null) }}
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
          if (pendingCarrierPlan && newBalance !== null && newBalance >= pendingCarrierPlan.retailPrice) {
            processCarrierPayment(pendingCarrierPlan)
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
            setActiveTab('data')
            setSelectedCarrierPlan(null)
            router.replace('/esim?tab=data', { scroll: false })
          }}
          className={`flex items-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'data'
              ? 'bg-primary text-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Icon name="sim-card" size={18} />
          Data eSIMs
        </button>
        <button
          onClick={() => {
            setActiveTab('carrier')
            setSelectedCountry(null)
            setCountryPage(1)
            router.replace('/esim?tab=carrier', { scroll: false })
          }}
          className={`flex items-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'carrier'
              ? 'bg-primary text-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Icon name="phone" size={18} />
          Call + SMS + Data eSIMs
        </button>
      </div>

      {/* Sandbox Mode Banner */}
      <TestModeBanner />

      {/* Data eSIMs Tab */}
      {activeTab === 'data' && (
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
          ) : countriesError ? (
            <div className="text-center py-12">
              <Icon name="alert-circle" size={48} className="text-red-500 mx-auto mb-4" />
              <p className="text-slate-400">Failed to load countries. Please refresh.</p>
            </div>
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

      {/* Call + SMS + Data eSIMs Tab */}
      {activeTab === 'carrier' && (
        <div className="mb-10">
          {/* Info banner */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <Icon name="info" size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-300">
              <strong>Carrier eSIMs</strong> include voice calls, SMS, and data — just like a regular phone plan.
              Orders are fulfilled within 24 hours. You&apos;ll receive a QR code and setup instructions via email.
            </div>
          </div>

          {loadingCarrierPlans ? (
            <div className="space-y-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-8 bg-slate-700 rounded w-48 mb-4" />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="bg-charcoal border border-border-dark rounded-2xl p-6">
                        <div className="h-5 bg-slate-700 rounded w-2/3 mb-3" />
                        <div className="h-4 bg-slate-700 rounded w-1/2 mb-4" />
                        <div className="h-8 bg-slate-700 rounded w-1/3" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : carrierPlansError ? (
            <div className="text-center py-12">
              <Icon name="alert-circle" size={48} className="text-red-500 mx-auto mb-4" />
              <h3 className="text-white font-bold mb-2">Failed to load carrier plans</h3>
              <p className="text-slate-500">Something went wrong. Please try again.</p>
            </div>
          ) : carrierGroups.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="phone" size={48} className="text-slate-600 mx-auto mb-4" />
              <h3 className="text-white font-bold mb-2">No carrier plans available</h3>
              <p className="text-slate-500">Check back soon for carrier eSIM plans.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {carrierGroups.map((group) => (
                <div key={group.carrierSlug}>
                  {/* Carrier header */}
                  <div className="flex items-center gap-3 mb-4">
                    <ServiceLogo name={group.carrierSlug} size={36} />
                    <div>
                      <h2 className="text-lg font-bold text-white">{group.carrierName}</h2>
                      <p className="text-xs text-slate-500">
                        <FlagIcon countryCode={group.country} className="w-4 h-3 inline mr-1" />
                        {resolveCountryName(group.country, null)}
                      </p>
                    </div>
                  </div>

                  {/* Plans grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.plans.map((plan) => (
                      <div key={plan.id}>
                        <div
                          className={`bg-charcoal border rounded-2xl p-5 transition-all ${
                            selectedCarrierPlan?.id === plan.id
                              ? 'border-primary'
                              : plan.isFeatured
                                ? 'border-primary/50'
                                : 'border-border-dark hover:border-primary/30'
                          } ${selectedCarrierPlan?.id === plan.id ? '' : 'cursor-pointer'}`}
                          onClick={() => {
                            if (selectedCarrierPlan?.id !== plan.id) {
                              setSelectedCarrierPlan(plan)
                              setCarrierFormError(null)
                            }
                          }}
                        >
                          {plan.isFeatured && (
                            <span className="inline-block bg-primary/20 text-primary text-xs font-bold px-2 py-0.5 rounded-full mb-3">
                              POPULAR
                            </span>
                          )}
                          <h3 className="font-bold text-white mb-2">{plan.planName}</h3>
                          {plan.description && (
                            <p className="text-sm text-slate-500 mb-3">{plan.description}</p>
                          )}

                          {/* Feature badges */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            <span className="inline-flex items-center gap-1 text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded-lg">
                              <Icon name="wifi" size={12} />
                              {plan.dataAmountDisplay}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded-lg">
                              <Icon name="phone" size={12} />
                              {plan.voiceDisplay || 'Voice'}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs bg-purple-500/10 text-purple-400 px-2 py-1 rounded-lg">
                              <Icon name="message-square" size={12} />
                              {plan.smsDisplay || 'SMS'}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs bg-slate-500/10 text-slate-400 px-2 py-1 rounded-lg uppercase">
                              {plan.networkType}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-extrabold text-white">
                              ${plan.retailPrice.toFixed(2)}
                            </span>
                            {selectedCarrierPlan?.id === plan.id ? (
                              <span className="text-xs text-primary font-medium">Selected</span>
                            ) : (
                              <span className="text-xs text-slate-500">Click to select</span>
                            )}
                          </div>
                        </div>

                        {/* Inline form when selected */}
                        {selectedCarrierPlan?.id === plan.id && renderCarrierForm(plan)}
                      </div>
                    ))}
                  </div>
                </div>
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
