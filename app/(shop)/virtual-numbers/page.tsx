'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Icon from '@/components/ui/Icon'
import FlagIcon from '@/components/ui/FlagIcon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/contexts/AuthContext'
// API client import removed - using direct fetch for backend API
import { getBalance } from '@/lib/api/wallet'
import * as virtualNumbersApi from '@/lib/api/virtual-numbers'
import * as otpNumbersApi from '@/lib/api/otp-numbers'
import AuthDialog from '@/components/dialogs/AuthDialog'
import DepositModal from '@/components/wallet/DepositModal'
import { usePreferences } from '@/contexts/PreferencesContext'

type NumberType = 'all' | 'local' | 'toll-free' | 'mobile'
type TabType = 'monthly' | 'otp'

interface Country {
  id: string
  name: string
  isoCode: string
  dialCode: string
  flagEmoji?: string
  retailMonthly: number
}

interface AvailableNumber {
  phoneNumber: string
  friendlyName: string
  locality?: string
  region?: string
  type: string
  capabilities: {
    sms: boolean
    voice: boolean
    mms: boolean
  }
  monthlyPrice: number
  source?: 'inventory' | 'twilio'  // inventory = instant activation
}

interface Plan {
  id: string
  name: string
  slug: string
  basePrice: number
  smsIncluded: number
  voiceMinutesIncluded: number
  features: string[]
  isFeatured: boolean
}

interface OtpService {
  id: string
  name: string
  icon?: string
  category?: string
}

interface OtpCountry {
  code: string
  name: string
  flag?: string
}

// Popular OTP services with icons
const SERVICE_ICONS: Record<string, string> = {
  whatsapp: '💬',
  telegram: '✈️',
  google: '🔍',
  facebook: '👤',
  instagram: '📷',
  twitter: '🐦',
  tiktok: '🎵',
  discord: '🎮',
  snapchat: '👻',
  uber: '🚗',
  amazon: '📦',
  netflix: '🎬',
  spotify: '🎧',
  paypal: '💳',
  microsoft: '🪟',
  apple: '🍎',
  linkedin: '💼',
  yahoo: '📧',
  steam: '🎮',
  twitch: '📺',
}

// ============================================================
// Smart Type Tabs Component - Auto-orders and hides empty tabs
// Uses masterNumbers (from "All Types" fetch) to determine which tabs to show
// ============================================================
function SmartTypeTabs({
  masterNumbers,
  loadingNumbers,
  numberType,
  setNumberType,
}: {
  masterNumbers: AvailableNumber[] // Master list from "All Types" fetch
  loadingNumbers: boolean
  numberType: NumberType
  setNumberType: (type: NumberType) => void
}) {
  // Count numbers per type FROM MASTER LIST (not filtered list)
  const typeCounts = {
    local: masterNumbers.filter(n => n.type === 'local').length,
    'toll-free': masterNumbers.filter(n => n.type === 'toll-free').length,
    mobile: masterNumbers.filter(n => n.type === 'mobile').length,
  }

  // Get types with numbers, sorted by count (most first)
  const availableTypes = (['local', 'toll-free', 'mobile'] as const)
    .filter(type => typeCounts[type] > 0)
    .sort((a, b) => typeCounts[b] - typeCounts[a])

  // Only show "All Types" if multiple types have numbers
  const showAllTab = availableTypes.length > 1
  const tabs: NumberType[] = showAllTab ? ['all', ...availableTypes] : availableTypes.length > 0 ? availableTypes : ['all']

  // While loading and no master data yet, show skeleton tabs
  if (loadingNumbers && masterNumbers.length === 0) {
    return (
      <div className="flex gap-3 mb-8 overflow-x-auto no-scrollbar">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex-shrink-0 px-5 py-2 rounded-xl bg-charcoal border border-border-dark animate-pulse h-10 w-24"
          />
        ))}
      </div>
    )
  }

  // If no numbers at all in master list, don't show tabs
  if (masterNumbers.length === 0) {
    return null
  }

  // If only one type has numbers, show just that type as selected (no need for tabs)
  if (availableTypes.length === 1) {
    return (
      <div className="flex gap-3 mb-8">
        <button
          onClick={() => setNumberType(availableTypes[0])}
          className="px-5 py-2 rounded-xl bg-primary text-white font-bold text-sm"
        >
          {availableTypes[0].charAt(0).toUpperCase() + availableTypes[0].slice(1).replace('-', ' ')}
          <span className="ml-2 text-xs opacity-70">({typeCounts[availableTypes[0]]})</span>
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-3 mb-8 overflow-x-auto no-scrollbar">
      {tabs.map((type) => (
        <button
          key={type}
          onClick={() => setNumberType(type)}
          className={`flex-shrink-0 px-5 py-2 rounded-xl font-bold text-sm transition-all ${
            numberType === type
              ? 'bg-primary text-white'
              : 'bg-charcoal border border-border-dark text-slate-400 hover:text-white'
          }`}
        >
          {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
          {type !== 'all' && (
            <span className="ml-2 text-xs opacity-70">({typeCounts[type as keyof typeof typeCounts]})</span>
          )}
        </button>
      ))}
    </div>
  )
}

export default function VirtualNumbersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addItem } = useCart()
  const { formatPrice } = usePreferences()
  const { isAuthenticated } = useAuth()

  // Tab state - initialize from URL
  const tabFromUrl = searchParams.get('tab') as TabType | null
  const [activeTab, setActiveTab] = useState<TabType>(tabFromUrl === 'otp' ? 'otp' : 'monthly')

  // Update URL when tab changes
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'otp') {
      params.set('tab', 'otp')
    } else {
      params.delete('tab')
    }
    router.replace(`/virtual-numbers${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false })
  }, [router, searchParams])

  // ===== MONTHLY NUMBERS STATE =====
  const [countries, setCountries] = useState<Country[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>([])
  const [allTypesNumbers, setAllTypesNumbers] = useState<AvailableNumber[]>([]) // Master list from "All Types" fetch
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [numberType, setNumberType] = useState<NumberType>('all')
  const prevCountryIdRef = useRef<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [selectedNumber, setSelectedNumber] = useState<AvailableNumber | null>(null)

  // Monthly loading states
  const [loadingCountries, setLoadingCountries] = useState(true)
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [loadingNumbers, setLoadingNumbers] = useState(false)

  // ===== OTP STATE =====
  const [otpServices, setOtpServices] = useState<OtpService[]>([])
  const [otpCountries, setOtpCountries] = useState<OtpCountry[]>([])
  const [selectedOtpService, setSelectedOtpService] = useState<OtpService | null>(null)
  const [selectedOtpCountry, setSelectedOtpCountry] = useState<OtpCountry | null>(null)
  const [otpPrice, setOtpPrice] = useState<number | null>(null)
  const [otpSearchQuery, setOtpSearchQuery] = useState('')

  // OTP loading states
  const [loadingOtpServices, setLoadingOtpServices] = useState(false)
  const [loadingOtpCountries, setLoadingOtpCountries] = useState(false)
  const [loadingOtpPrice, setLoadingOtpPrice] = useState(false)
  const [purchasingOtp, setPurchasingOtp] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [otpSuccess, setOtpSuccess] = useState(false)
  const [otpSuccessData, setOtpSuccessData] = useState<{ id: string; phoneNumber: string } | null>(null)

  // OTP wallet/auth states
  const [otpWalletBalance, setOtpWalletBalance] = useState<number | null>(null)
  const [otpLoadingBalance, setOtpLoadingBalance] = useState(false)
  const [showOtpAuthDialog, setShowOtpAuthDialog] = useState(false)
  const [showOtpDepositModal, setShowOtpDepositModal] = useState(false)
  const [pendingOtpPurchase, setPendingOtpPurchase] = useState(false)

  // ===== MONTHLY NUMBERS EFFECTS =====

  // Fetch countries on mount and auto-select first one
  useEffect(() => {
    async function fetchCountries() {
      try {
        const result = await virtualNumbersApi.getCountries()
        if (result.success && result.data && result.data.length > 0) {
          setCountries(result.data)
          setSelectedCountry(result.data[0])
        }
      } catch (error) {
        console.error('Error fetching countries:', error)
      } finally {
        setLoadingCountries(false)
      }
    }
    fetchCountries()
  }, [])

  // Fetch plans on mount
  useEffect(() => {
    async function fetchPlans() {
      try {
        const result = await virtualNumbersApi.getPlans()
        if (result.success && result.data) {
          setPlans(result.data)
          const featured = result.data.find(p => p.isFeatured)
          if (featured) setSelectedPlan(featured)
        }
      } catch (error) {
        console.error('Error fetching plans:', error)
      } finally {
        setLoadingPlans(false)
      }
    }
    fetchPlans()
  }, [])

  // Fetch available numbers when country or type changes
  useEffect(() => {
    if (!selectedCountry) {
      setAvailableNumbers([])
      setAllTypesNumbers([])
      prevCountryIdRef.current = null
      return
    }

    const countryChanged = prevCountryIdRef.current !== selectedCountry.id
    prevCountryIdRef.current = selectedCountry.id

    // Reset to 'all' when country changes to ensure we fetch all types first
    if (countryChanged) {
      setAllTypesNumbers([])
      setAvailableNumbers([])
      if (numberType !== 'all') {
        setNumberType('all')
        return // Effect will re-run with 'all' type
      }
    }

    async function fetchNumbers() {
      setLoadingNumbers(true)
      try {
        if (numberType === 'all') {
          // Fetch ALL types to get master list and counts
          const result = await virtualNumbersApi.searchAvailableNumbers({
            countryCode: selectedCountry!.isoCode,
            type: undefined // Fetch all types
          })
          if (result.success && result.data) {
            setAllTypesNumbers(result.data) // Store as master list
            setAvailableNumbers(result.data)
          }
        } else {
          // When filtering by type, use the master list if available
          if (allTypesNumbers.length > 0) {
            // Filter from master list (instant, no API call)
            const filtered = allTypesNumbers.filter(n => n.type === numberType)
            setAvailableNumbers(filtered)
            setLoadingNumbers(false)
            return
          }
          // Fallback: fetch from API if no master list
          const result = await virtualNumbersApi.searchAvailableNumbers({
            countryCode: selectedCountry!.isoCode,
            type: numberType as any
          })
          if (result.success && result.data) {
            setAvailableNumbers(result.data)
          }
        }
      } catch (error) {
        console.error('Error fetching numbers:', error)
      } finally {
        setLoadingNumbers(false)
      }
    }
    fetchNumbers()
  }, [selectedCountry, numberType, allTypesNumbers.length])

  // ===== OTP EFFECTS =====

  // Fetch OTP services when OTP tab is active
  useEffect(() => {
    if (activeTab !== 'otp' || otpServices.length > 0) return

    async function fetchServices() {
      setLoadingOtpServices(true)
      try {
        const result = await otpNumbersApi.getServices()
        if (result.success && result.data) {
          setOtpServices(result.data)
        }
      } catch (error) {
        console.error('Error fetching OTP services:', error)
      } finally {
        setLoadingOtpServices(false)
      }
    }
    fetchServices()
  }, [activeTab, otpServices.length])

  // Fetch OTP countries when service is selected
  useEffect(() => {
    if (!selectedOtpService) {
      setOtpCountries([])
      setSelectedOtpCountry(null)
      setOtpPrice(null)
      return
    }

    async function fetchCountries() {
      setLoadingOtpCountries(true)
      try {
        const result = await otpNumbersApi.getCountries(selectedOtpService!.id)
        if (result.success && result.data) {
          setOtpCountries(result.data)
        }
      } catch (error) {
        console.error('Error fetching OTP countries:', error)
      } finally {
        setLoadingOtpCountries(false)
      }
    }
    fetchCountries()
  }, [selectedOtpService])

  // Fetch price when service and country are selected
  useEffect(() => {
    if (!selectedOtpService || !selectedOtpCountry) {
      setOtpPrice(null)
      return
    }

    async function fetchPrice() {
      setLoadingOtpPrice(true)
      try {
        const result = await otpNumbersApi.getPrice(
          selectedOtpService!.id,
          selectedOtpCountry!.code
        )
        if (result.success && result.data) {
          setOtpPrice(result.data.price)
        }
      } catch (error) {
        console.error('Error fetching OTP price:', error)
      } finally {
        setLoadingOtpPrice(false)
      }
    }
    fetchPrice()
  }, [selectedOtpService, selectedOtpCountry])

  // Fetch OTP wallet balance when authenticated
  const fetchOtpWalletBalance = useCallback(async () => {
    if (!isAuthenticated) return
    setOtpLoadingBalance(true)
    try {
      const result = await getBalance()
      if (result.success && result.data) {
        setOtpWalletBalance(result.data.balance || 0)
      }
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error)
    } finally {
      setOtpLoadingBalance(false)
    }
  }, [isAuthenticated])

  // Fetch balance when authenticated and on OTP tab
  useEffect(() => {
    if (isAuthenticated && activeTab === 'otp' && otpWalletBalance === null) {
      fetchOtpWalletBalance()
    }
  }, [isAuthenticated, activeTab, otpWalletBalance, fetchOtpWalletBalance])

  // Auto-continue OTP purchase after auth success
  useEffect(() => {
    if (pendingOtpPurchase && isAuthenticated && otpWalletBalance !== null && otpPrice !== null) {
      setPendingOtpPurchase(false)
      if (otpWalletBalance >= otpPrice) {
        processOtpPurchase()
      } else {
        setShowOtpDepositModal(true)
      }
    }
  }, [pendingOtpPurchase, isAuthenticated, otpWalletBalance, otpPrice])

  // ===== HANDLERS =====

  // Filter numbers by search
  const filteredNumbers = availableNumbers.filter((number) => {
    if (!searchQuery) return true
    return (
      number.phoneNumber.includes(searchQuery) ||
      number.friendlyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (number.locality && number.locality.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })

  // Filter OTP services by search
  const filteredOtpServices = otpServices.filter((service) => {
    if (!otpSearchQuery) return true
    return service.name.toLowerCase().includes(otpSearchQuery.toLowerCase())
  })

  // Handle get number button
  const handleGetNumber = (number: AvailableNumber) => {
    setSelectedNumber(number)
    setShowPlanModal(true)
  }

  // Handle add to cart
  const handleAddToCart = () => {
    if (!selectedNumber || !selectedPlan || !selectedCountry) return

    // Parse prices as numbers (API might return strings)
    const planPrice = parseFloat(String(selectedPlan.basePrice)) || 0
    const countryPrice = parseFloat(String(selectedCountry.retailMonthly)) || 0
    const totalPrice = planPrice + countryPrice

    // Virtual numbers use dynamic IDs - backend handles these as dynamicItems
    // Metadata contains all info needed for fulfillment (phone number, plan, country)
    const virtualNumberProduct = {
      id: `vn-${selectedNumber.phoneNumber.replace(/\+/g, '')}-${Date.now()}`,
      name: `Virtual Number: ${selectedNumber.friendlyName}`,
      slug: `virtual-number-${selectedNumber.phoneNumber.replace(/\+/g, '')}`,
      description: `${selectedCountry.name} ${selectedNumber.type} number with ${selectedPlan.name} plan`,
      price: totalPrice,
      rating: 5,
      reviewCount: 0,
      category: 'virtual-numbers',
      icon: 'phone',
      iconColor: 'text-primary',
      tags: ['virtual-number', selectedCountry.isoCode.toLowerCase()],
      image: '/images/products/virtual-number.png',
      metadata: {
        productType: 'virtual_number',  // Backend routes fulfillment based on this
        phoneNumber: selectedNumber.phoneNumber,
        countryId: selectedCountry.id,
        countryName: selectedCountry.name,
        countryIsoCode: selectedCountry.isoCode,  // For FlagIcon component
        countryFlag: selectedCountry.flagEmoji || '🌍',  // Fallback emoji
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        numberType: selectedNumber.type,
        friendlyName: selectedNumber.friendlyName
      }
    }

    addItem(virtualNumberProduct as any)
    setShowPlanModal(false)
    router.push('/cart')
  }

  // Process OTP purchase (called after auth and balance checks pass)
  const processOtpPurchase = async () => {
    if (!selectedOtpService || !selectedOtpCountry || otpPrice === null) return

    setPurchasingOtp(true)
    setOtpError(null)

    try {
      const result = await otpNumbersApi.requestNumber(
        selectedOtpService.id,
        selectedOtpCountry.code
      )

      if (result.success && result.data) {
        // Show success in-page and refresh balance
        setOtpSuccess(true)
        setOtpSuccessData({
          id: result.data.id,
          phoneNumber: result.data.number?.phoneNumber || ''
        })
        fetchOtpWalletBalance()
      } else {
        setOtpError(result.error || 'Failed to purchase OTP number')
      }
    } catch (error: any) {
      setOtpError(error.message || 'Failed to purchase OTP number')
    } finally {
      setPurchasingOtp(false)
    }
  }

  // Handle OTP purchase button click
  const handlePurchaseOtp = async () => {
    if (!selectedOtpService || !selectedOtpCountry || otpPrice === null) return

    setOtpError(null)

    // If not authenticated, show auth dialog
    if (!isAuthenticated) {
      setShowOtpAuthDialog(true)
      return
    }

    // Check wallet balance - fetch if null
    let currentBalance = otpWalletBalance
    if (currentBalance === null) {
      setOtpLoadingBalance(true)
      try {
        const result = await getBalance()
        if (result.success && result.data) {
          currentBalance = result.data.balance || 0
          setOtpWalletBalance(currentBalance)
        } else {
          setOtpError('Failed to fetch wallet balance')
          setOtpLoadingBalance(false)
          return
        }
      } catch (error) {
        console.error('Failed to fetch wallet balance:', error)
        setOtpError('Failed to fetch wallet balance')
        setOtpLoadingBalance(false)
        return
      }
      setOtpLoadingBalance(false)
    }

    // If insufficient balance, show deposit modal
    if (currentBalance < otpPrice) {
      setShowOtpDepositModal(true)
      return
    }

    // Process purchase
    await processOtpPurchase()
  }

  return (
    <main className="max-w-container mx-auto px-4 lg:px-12 pb-24">
      {/* Breadcrumbs */}
      <div className="py-4">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Virtual Numbers' }
          ]}
          className="mb-0"
        />
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#43D678]/20 via-[#43D678]/10 to-transparent rounded-2xl lg:rounded-3xl p-4 lg:p-12 mb-8 lg:mb-12">
        <div className="max-w-2xl">
          <h1 className="text-2xl lg:text-4xl font-extrabold text-white mb-4">
            Virtual Phone Numbers
          </h1>
          <p className="text-slate-400 text-sm lg:text-lg mb-6 lg:mb-8">
            {activeTab === 'monthly'
              ? `Get virtual phone numbers from ${countries.length}+ countries. Perfect for business, privacy, and verification.`
              : 'Get instant one-time phone numbers for SMS verification. Pay only for what you use.'}
          </p>

          {/* Tab Switcher */}
          <div className="flex gap-2 bg-surface-dark p-1.5 rounded-xl w-fit">
            <button
              onClick={() => handleTabChange('monthly')}
              className={`flex items-center gap-2 px-5 py-3 rounded-lg font-bold text-sm transition-all ${
                activeTab === 'monthly'
                  ? 'bg-primary text-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon name="phone" size={18} />
              Monthly Numbers
            </button>
            <button
              onClick={() => handleTabChange('otp')}
              className={`flex items-center gap-2 px-5 py-3 rounded-lg font-bold text-sm transition-all ${
                activeTab === 'otp'
                  ? 'bg-primary text-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon name="message" size={18} />
              One-Time OTP
            </button>
          </div>
        </div>
      </div>

      {/* ===== MONTHLY NUMBERS TAB ===== */}
      {activeTab === 'monthly' && (
        <>
          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative max-w-md">
              <Icon name="search" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search by phone number or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-surface-dark border border-border-dark rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Country Filter */}
          <div className="mb-10">
            <h2 className="text-xl font-bold text-white mb-4">Select Country</h2>
            {loadingCountries ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                {countries.map((country) => (
                    <button
                      key={country.id}
                      onClick={() => setSelectedCountry(selectedCountry?.id === country.id ? null : country)}
                      className={`p-4 rounded-2xl border transition-all text-center ${
                        selectedCountry?.id === country.id
                          ? 'bg-primary/10 border-primary'
                          : 'bg-charcoal border-border-dark hover:border-primary/50'
                      }`}
                    >
                      <div className="flex justify-center mb-2">
                        <FlagIcon countryCode={country.isoCode} className="w-8 h-8 rounded" />
                      </div>
                      <h3 className="font-bold text-white text-xs mb-1">{country.name}</h3>
                      <p className="text-xs text-primary font-bold">Starting From {formatPrice(2)}</p>
                    </button>
                ))}
              </div>
            )}
          </div>

          {/* Type Filter - Smart ordering based on availability */}
          <SmartTypeTabs
            masterNumbers={allTypesNumbers}
            loadingNumbers={loadingNumbers}
            numberType={numberType}
            setNumberType={setNumberType}
          />

          {/* Numbers Grid */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Available Numbers</h2>
              <span className="text-slate-500 text-sm">
                {selectedCountry ? `${filteredNumbers.length} numbers in ${selectedCountry.name}` : 'Select a country to view numbers'}
              </span>
            </div>

            {!selectedCountry ? (
              <div className="bg-charcoal border border-border-dark rounded-2xl p-12 text-center">
                <Icon name="call" size={48} className="text-slate-600 mx-auto mb-4" />
                <h3 className="text-white font-bold mb-2">Select a Country</h3>
                <p className="text-slate-500">Choose a country above to see available phone numbers</p>
              </div>
            ) : loadingNumbers ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : filteredNumbers.length === 0 ? (
              <div className="bg-charcoal border border-border-dark rounded-2xl p-12 text-center">
                <Icon name="alert" size={48} className="text-slate-600 mx-auto mb-4" />
                <h3 className="text-white font-bold mb-2">No Numbers Available</h3>
                <p className="text-slate-500">Try a different country or number type</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredNumbers.map((number, idx) => {
                  // Use the smallest plan price (24hr Basic = $2)
                  const startingPrice = 2

                  return (
                    <div
                      key={`${number.phoneNumber}-${idx}`}
                      className="bg-charcoal border border-border-dark hover:border-primary/50 rounded-2xl p-6 transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {selectedCountry?.isoCode ? (
                            <FlagIcon countryCode={selectedCountry.isoCode} className="w-10 h-10 rounded" />
                          ) : (
                            <span className="text-3xl">🌍</span>
                          )}
                          <div>
                            <h3 className="font-bold text-white">{number.friendlyName}</h3>
                            <p className="text-sm text-slate-500">
                              {number.locality || number.region || selectedCountry?.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                            number.type === 'toll-free'
                              ? 'bg-green-500/10 text-green-400'
                              : number.type === 'mobile'
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {number.type.toUpperCase()}
                          </span>
                          {number.source === 'inventory' && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                              <Icon name="timer" size={10} />
                              INSTANT
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Capability badges with upselling messages */}
                      <div className="space-y-2 mb-6">
                        {number.capabilities.sms && (
                          <div className="flex items-center gap-2 text-sm">
                            <Icon name="check" size={14} className="text-green-400" />
                            <span className="text-slate-400">Receive verification codes</span>
                          </div>
                        )}
                        {number.capabilities.voice && (
                          <div className="flex items-center gap-2 text-sm">
                            <Icon name="check" size={14} className="text-green-400" />
                            <span className="text-slate-400">Receive calls & voicemail</span>
                          </div>
                        )}
                        {number.capabilities.mms && (
                          <div className="flex items-center gap-2 text-sm">
                            <Icon name="check" size={14} className="text-green-400" />
                            <span className="text-slate-400">Receive picture messages</span>
                          </div>
                        )}
                        {number.capabilities.voice && (
                          <div className="flex items-center gap-2 text-sm">
                            <Icon name="check" size={14} className="text-blue-400" />
                            <span className="text-slate-400">Forward to your phone</span>
                          </div>
                        )}
                      </div>

                      {/* Starting price display */}
                      <div className="flex items-end justify-between mb-4">
                        <div>
                          <p className="text-slate-500 text-xs mb-1">Starting From</p>
                          <span className="text-2xl font-extrabold text-white">{formatPrice(startingPrice)}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleGetNumber(number)}
                        className="w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 bg-primary text-white hover:brightness-105"
                      >
                        <Icon name="call" size={18} />
                        Get Number
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== OTP TAB ===== */}
      {activeTab === 'otp' && (
        <>
          {/* How it works */}
          <div className="bg-surface-dark border border-border-dark rounded-2xl p-6 mb-8">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Icon name="info" size={18} className="text-primary" />
              How OTP Numbers Work
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">1</span>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Select Service</p>
                  <p className="text-slate-500 text-xs">Choose WhatsApp, Google, etc.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">2</span>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Pick Country</p>
                  <p className="text-slate-500 text-xs">Select your preferred country</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">3</span>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Get Number</p>
                  <p className="text-slate-500 text-xs">Pay with wallet balance</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">4</span>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Receive Code</p>
                  <p className="text-slate-500 text-xs">SMS arrives in seconds</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search Services */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Icon name="search" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search services (WhatsApp, Google, etc.)..."
                value={otpSearchQuery}
                onChange={(e) => setOtpSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-surface-dark border border-border-dark rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Services Grid */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-bold text-white mb-4">Select Service</h2>
              {loadingOtpServices ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredOtpServices.length === 0 ? (
                <div className="bg-charcoal border border-border-dark rounded-2xl p-12 text-center">
                  <Icon name="search" size={48} className="text-slate-600 mx-auto mb-4" />
                  <h3 className="text-white font-bold mb-2">No Services Found</h3>
                  <p className="text-slate-500">Try a different search term</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredOtpServices.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => {
                        setSelectedOtpService(selectedOtpService?.id === service.id ? null : service)
                        setSelectedOtpCountry(null)
                        setOtpPrice(null)
                      }}
                      className={`p-4 rounded-xl border transition-all text-left ${
                        selectedOtpService?.id === service.id
                          ? 'bg-primary/10 border-primary'
                          : 'bg-charcoal border-border-dark hover:border-primary/50'
                      }`}
                    >
                      <span className="text-2xl mb-2 block">
                        {SERVICE_ICONS[service.id.toLowerCase()] || '📱'}
                      </span>
                      <h3 className="font-bold text-white text-sm truncate">{service.name}</h3>
                    </button>
                  ))}
                </div>
              )}

              {/* Countries for selected service */}
              {selectedOtpService && (
                <div className="mt-8">
                  <h2 className="text-xl font-bold text-white mb-4">
                    Select Country for {selectedOtpService.name}
                  </h2>
                  {loadingOtpCountries ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : otpCountries.length === 0 ? (
                    <div className="bg-charcoal border border-border-dark rounded-2xl p-8 text-center">
                      <Icon name="globe" size={48} className="text-slate-600 mx-auto mb-4" />
                      <h3 className="text-white font-bold mb-2">No Countries Available</h3>
                      <p className="text-slate-500">This service may not be available right now</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {otpCountries.map((country) => (
                        <button
                          key={country.code}
                          onClick={() => setSelectedOtpCountry(
                            selectedOtpCountry?.code === country.code ? null : country
                          )}
                          className={`p-3 rounded-xl border transition-all text-center ${
                            selectedOtpCountry?.code === country.code
                              ? 'bg-primary/10 border-primary'
                              : 'bg-charcoal border-border-dark hover:border-primary/50'
                          }`}
                        >
                          <div className="flex justify-center mb-1">
                            <FlagIcon countryCode={country.code} className="w-6 h-6 rounded" />
                          </div>
                          <h3 className="font-medium text-white text-xs truncate">{country.name}</h3>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Purchase Card */}
            <div className="lg:col-span-1">
              <div className="bg-charcoal border border-border-dark rounded-2xl p-6 sticky top-4">
                <h3 className="text-lg font-bold text-white mb-6">Your Selection</h3>

                {/* Service */}
                <div className="mb-4">
                  <p className="text-slate-500 text-sm mb-1">Service</p>
                  {selectedOtpService ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {SERVICE_ICONS[selectedOtpService.id.toLowerCase()] || '📱'}
                      </span>
                      <span className="text-white font-medium">{selectedOtpService.name}</span>
                    </div>
                  ) : (
                    <p className="text-slate-400">Select a service</p>
                  )}
                </div>

                {/* Country */}
                <div className="mb-4">
                  <p className="text-slate-500 text-sm mb-1">Country</p>
                  {selectedOtpCountry ? (
                    <div className="flex items-center gap-2">
                      <FlagIcon countryCode={selectedOtpCountry.code} className="w-6 h-6 rounded" />
                      <span className="text-white font-medium">{selectedOtpCountry.name}</span>
                    </div>
                  ) : (
                    <p className="text-slate-400">
                      {selectedOtpService ? 'Select a country' : '—'}
                    </p>
                  )}
                </div>

                {/* Price */}
                <div className="mb-6 pb-6 border-b border-border-dark">
                  <p className="text-slate-500 text-sm mb-1">Price</p>
                  {loadingOtpPrice ? (
                    <div className="animate-pulse bg-slate-700 h-8 w-20 rounded"></div>
                  ) : otpPrice !== null ? (
                    <span className="text-2xl font-extrabold text-white">{formatPrice(otpPrice)}</span>
                  ) : (
                    <p className="text-slate-400">—</p>
                  )}
                </div>

                {/* Success Message */}
                {otpSuccess && otpSuccessData && (
                  <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <Icon name="check" size={24} className="text-green-400" />
                      <div>
                        <h4 className="text-white font-bold">Purchase Complete!</h4>
                        <p className="text-slate-400 text-sm">Your OTP number is ready.</p>
                      </div>
                    </div>
                    <div className="bg-charcoal rounded-lg p-3 mb-3">
                      <p className="text-slate-500 text-xs">Your Number</p>
                      <p className="text-white font-mono text-lg">{otpSuccessData.phoneNumber}</p>
                    </div>
                    <button
                      onClick={() => router.push(`/checkout/success?otpId=${otpSuccessData.id}&type=otp`)}
                      className="w-full py-3 bg-primary text-black font-bold rounded-xl"
                    >
                      View OTP Details
                    </button>
                  </div>
                )}

                {/* Error */}
                {otpError && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 text-sm">{otpError}</p>
                  </div>
                )}

                {/* Purchase Button */}
                {!otpSuccess && (
                  <button
                    onClick={handlePurchaseOtp}
                    disabled={!selectedOtpService || !selectedOtpCountry || otpPrice === null || purchasingOtp || otpLoadingBalance}
                    className="w-full py-4 rounded-xl bg-primary text-black font-bold hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {purchasingOtp ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                        Processing...
                      </>
                    ) : otpLoadingBalance ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                        Checking Balance...
                      </>
                    ) : isAuthenticated && otpPrice !== null ? (
                      <>
                        <Icon name="wallet" size={18} />
                        Pay {formatPrice(otpPrice)} with Wallet
                      </>
                    ) : (
                      <>
                        <Icon name="wallet" size={18} />
                        Buy with Wallet
                      </>
                    )}
                  </button>
                )}

                {!otpSuccess && (
                  <p className="text-slate-500 text-xs text-center mt-3">
                    Instant deduction from wallet balance
                  </p>
                )}

                {/* Auth Dialog */}
                <AuthDialog
                  isOpen={showOtpAuthDialog}
                  onClose={() => setShowOtpAuthDialog(false)}
                  onSuccess={() => {
                    setShowOtpAuthDialog(false)
                    setPendingOtpPurchase(true)
                    fetchOtpWalletBalance()
                  }}
                />

                {/* Deposit Modal */}
                <DepositModal
                  isOpen={showOtpDepositModal}
                  onClose={async () => {
                    setShowOtpDepositModal(false)
                    // Refresh balance after deposit modal closes
                    setOtpLoadingBalance(true)
                    try {
                      const result = await getBalance()
                      if (result.success && result.data) {
                        const newBalance = result.data.balance || 0
                        setOtpWalletBalance(newBalance)
                        // Auto-complete purchase if now have enough balance
                        if (otpPrice !== null && newBalance >= otpPrice) {
                          processOtpPurchase()
                        }
                      }
                    } catch (error) {
                      console.error('Failed to fetch wallet balance:', error)
                    } finally {
                      setOtpLoadingBalance(false)
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Features Section */}
      <div className="bg-charcoal border border-border-dark rounded-2xl lg:rounded-3xl p-4 lg:p-12 mt-12">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">
          {activeTab === 'monthly' ? 'Virtual Number Benefits' : 'OTP Number Benefits'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {activeTab === 'monthly' ? (
            <>
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Icon name="shield" size={24} className="text-primary" />
                </div>
                <h3 className="font-bold text-white mb-2">Privacy Protection</h3>
                <p className="text-slate-500 text-sm">Keep your personal number private. Use virtual numbers for business.</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Icon name="globe" size={24} className="text-primary" />
                </div>
                <h3 className="font-bold text-white mb-2">Global Presence</h3>
                <p className="text-slate-500 text-sm">Get local numbers in {countries.length}+ countries for your business.</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Icon name="api" size={24} className="text-primary" />
                </div>
                <h3 className="font-bold text-white mb-2">SMS Forwarding</h3>
                <p className="text-slate-500 text-sm">Forward messages to email or another phone number.</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Icon name="message" size={24} className="text-primary" />
                </div>
                <h3 className="font-bold text-white mb-2">SMS & Voice</h3>
                <p className="text-slate-500 text-sm">Send and receive SMS, make and receive calls.</p>
              </div>
            </>
          ) : (
            <>
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Icon name="timer" size={24} className="text-primary" />
                </div>
                <h3 className="font-bold text-white mb-2">Instant Delivery</h3>
                <p className="text-slate-500 text-sm">Get your verification code in seconds, not minutes.</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Icon name="wallet" size={24} className="text-primary" />
                </div>
                <h3 className="font-bold text-white mb-2">Pay Per Use</h3>
                <p className="text-slate-500 text-sm">No subscriptions. Only pay for what you need.</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Icon name="refresh" size={24} className="text-primary" />
                </div>
                <h3 className="font-bold text-white mb-2">Cancel Anytime</h3>
                <p className="text-slate-500 text-sm">Get a full refund if you don&apos;t receive the code.</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Icon name="globe" size={24} className="text-primary" />
                </div>
                <h3 className="font-bold text-white mb-2">100+ Services</h3>
                <p className="text-slate-500 text-sm">Works with WhatsApp, Google, Telegram, and more.</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Plan Selection Modal - Redesigned with Basic/Business */}
      {showPlanModal && selectedNumber && (
        <PlanSelectionModal
          number={selectedNumber}
          country={selectedCountry}
          plans={plans}
          onClose={() => setShowPlanModal(false)}
          onAddToCart={handleAddToCart}
          addItem={addItem}
          router={router}
        />
      )}
    </main>
  )
}

// ============================================================
// Plan Selection Modal Component
// ============================================================

interface MinuteTier {
  id: string
  name: string
  minutes: number
  price: number
}

interface DynamicPricing {
  basic: { duration: number; label: string; price: number; smsLimit: number }[]
  business: { duration: number; label: string; price: number; features: string[] }[]
  minuteTiers: { id: string; minutes: number; price: number }[]
  startingPrice: number
}

// Default fallback pricing (used while loading or if API fails)
const DEFAULT_PRICING: DynamicPricing = {
  basic: [
    { duration: 1, label: '24 Hours', price: 2, smsLimit: 50 },
    { duration: 7, label: '7 Days', price: 8, smsLimit: 200 },
    { duration: 30, label: '30 Days', price: 15, smsLimit: 500 },
  ],
  business: [
    { duration: 1, label: '24 Hours', price: 5, features: ['SMS + Voice', 'Call Forwarding'] },
    { duration: 7, label: '7 Days', price: 20, features: ['SMS + Voice', 'Call Forwarding', 'Voicemail'] },
    { duration: 30, label: '30 Days', price: 45, features: ['SMS + Voice', 'Call Forwarding', 'Voicemail', 'Priority Support'] },
  ],
  minuteTiers: [
    { id: 'tier_30', minutes: 30, price: 5 },
    { id: 'tier_60', minutes: 60, price: 10 },
    { id: 'tier_120', minutes: 120, price: 20 },
  ],
  startingPrice: 2,
}

interface PlanSelectionModalProps {
  number: AvailableNumber
  country: Country | null
  plans: Plan[]
  onClose: () => void
  onAddToCart: () => void
  addItem: (item: any) => void
  router: ReturnType<typeof useRouter>
}

function PlanSelectionModal({
  number,
  country,
  plans,
  onClose,
  onAddToCart,
  addItem,
  router
}: PlanSelectionModalProps) {
  const { user, isAuthenticated, login } = useAuth()
  const { formatPrice } = usePreferences()
  const [planCategory, setPlanCategory] = useState<'basic' | 'business'>('basic')
  const [selectedDuration, setSelectedDuration] = useState<number>(7) // Default 7 days

  // Dynamic pricing state
  const [pricing, setPricing] = useState<DynamicPricing>(DEFAULT_PRICING)
  const [loadingPricing, setLoadingPricing] = useState(true)

  // Derived minute tier state
  const [selectedMinuteTier, setSelectedMinuteTier] = useState<MinuteTier | null>(null)

  // Fetch pricing when modal opens
  useEffect(() => {
    const fetchPricing = async () => {
      setLoadingPricing(true)
      try {
        const countryCode = country?.isoCode || 'US'
        const response = await fetch(`/api/virtual-numbers/pricing?country=${countryCode}&type=${number.type}`)
        const result = await response.json()
        if (result.success && result.data) {
          setPricing(result.data)
          // Set default minute tier from fetched data
          if (result.data.minuteTiers?.length > 0) {
            setSelectedMinuteTier({
              id: result.data.minuteTiers[0].id,
              name: `${result.data.minuteTiers[0].minutes} min`,
              minutes: result.data.minuteTiers[0].minutes,
              price: result.data.minuteTiers[0].price,
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch pricing:', error)
        // Keep default pricing on error
        if (DEFAULT_PRICING.minuteTiers.length > 0) {
          setSelectedMinuteTier({
            id: DEFAULT_PRICING.minuteTiers[0].id,
            name: `${DEFAULT_PRICING.minuteTiers[0].minutes} min`,
            minutes: DEFAULT_PRICING.minuteTiers[0].minutes,
            price: DEFAULT_PRICING.minuteTiers[0].price,
          })
        }
      }
      setLoadingPricing(false)
    }
    fetchPricing()
  }, [country, number.type])

  // Check provider availability when modal opens
  useEffect(() => {
    const checkProvider = async () => {
      setProviderCheckLoading(true)
      try {
        const response = await fetch('/backend/orders/check-provider')
        const result = await response.json()
        setProviderAvailable(result.success && result.data?.providerAvailable === true)
      } catch (error) {
        console.error('Failed to check provider:', error)
        setProviderAvailable(false)
      } finally {
        setProviderCheckLoading(false)
      }
    }
    checkProvider()
  }, [])

  // Wallet checkout state
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [checkoutSuccess, setCheckoutSuccess] = useState(false)

  // Auth and deposit modals
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [pendingWalletCheckout, setPendingWalletCheckout] = useState(false)

  // Provider availability state
  const [providerAvailable, setProviderAvailable] = useState<boolean | null>(null)
  const [providerCheckLoading, setProviderCheckLoading] = useState(true)

  // Calculate total price - must be before effects that use it
  const calculateTotal = () => {
    if (planCategory === 'basic') {
      const plan = pricing.basic.find(p => p.duration === selectedDuration)
      return plan?.price || 0
    } else {
      const plan = pricing.business.find(p => p.duration === selectedDuration)
      const basePrice = plan?.price || 0
      const minutePrice = selectedMinuteTier?.price || 0
      return basePrice + minutePrice
    }
  }
  const totalPrice = calculateTotal()

  const fetchWalletBalance = async () => {
    setLoadingBalance(true)
    try {
      const result = await getBalance()
      if (result.success && result.data) {
        setWalletBalance(result.data.balance || 0)
      }
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error)
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

  // Auto-continue checkout after auth success
  useEffect(() => {
    if (pendingWalletCheckout && isAuthenticated && walletBalance !== null) {
      setPendingWalletCheckout(false)
      // Check balance and proceed
      if (walletBalance >= totalPrice) {
        processWalletPayment()
      } else {
        // Show deposit modal immediately
        setShowDepositModal(true)
      }
    }
  }, [pendingWalletCheckout, isAuthenticated, walletBalance, totalPrice])

  // Handle checkout
  const handleCheckout = () => {
    if (!country) return

    const durationPlan = planCategory === 'basic'
      ? pricing.basic.find(p => p.duration === selectedDuration)
      : pricing.business.find(p => p.duration === selectedDuration)

    if (!durationPlan) return

    // Create virtual number product
    const virtualNumberProduct = {
      id: `vn-${number.phoneNumber.replace(/\+/g, '')}-${Date.now()}`,
      name: `Virtual Number: ${number.friendlyName}`,
      slug: `virtual-number-${number.phoneNumber.replace(/\+/g, '')}`,
      description: `${country.name} ${number.type} number - ${durationPlan.label} ${planCategory === 'basic' ? 'Basic' : 'Business'} plan`,
      price: totalPrice,
      rating: 5,
      reviewCount: 0,
      category: 'virtual-numbers',
      icon: 'phone',
      iconColor: 'text-primary',
      tags: ['virtual-number', country.isoCode.toLowerCase()],
      image: '/images/products/virtual-number.png',
      metadata: {
        productType: 'virtual_number',
        phoneNumber: number.phoneNumber,
        countryId: country.id,
        countryName: country.name,
        countryIsoCode: country.isoCode,  // For FlagIcon component
        countryFlag: country.flagEmoji || '🌍',  // Fallback emoji
        numberType: number.type,
        friendlyName: number.friendlyName,
        planCategory,
        durationDays: selectedDuration,
        durationLabel: durationPlan.label,
        ...(planCategory === 'basic' && 'smsLimit' in durationPlan && { smsLimit: durationPlan.smsLimit }),
        ...(planCategory === 'business' && selectedMinuteTier && {
          minuteTier: selectedMinuteTier.id,
          minuteTierName: selectedMinuteTier.name,
          minuteIncluded: selectedMinuteTier.minutes,
          minuteTierPrice: selectedMinuteTier.price,
        }),
      }
    }

    // Always add to cart (so user doesn't lose their selection)
    addItem(virtualNumberProduct as any)

    // If provider unavailable, show error but keep item in cart
    if (providerAvailable === false) {
      setCheckoutError('Virtual number service is currently unavailable. Your item has been saved to cart - you can complete your purchase when service is restored.')
      return
    }

    // Provider available - proceed to cart
    onClose()
    router.push('/cart')
  }

  const currentBasicPlan = pricing.basic.find(p => p.duration === selectedDuration)
  const currentBusinessPlan = pricing.business.find(p => p.duration === selectedDuration)

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-dark rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">Choose Your Plan</h3>
            <p className="text-slate-400 text-sm mt-1">
              Number: {number.friendlyName} ({country?.name})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <Icon name="close" size={24} />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 bg-charcoal p-1 rounded-xl">
          <button
            onClick={() => setPlanCategory('basic')}
            className={`flex-1 px-4 py-3 rounded-lg font-bold text-sm transition-all ${
              planCategory === 'basic'
                ? 'bg-primary text-black border-2 border-primary'
                : 'text-slate-400 hover:text-white border border-border-dark hover:border-slate-500'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Icon name="message" size={16} />
              Basic (SMS Only)
            </div>
            <p className="text-xs mt-1 opacity-70">Receive verification codes</p>
          </button>
          <button
            onClick={() => {
              setPlanCategory('business')
              if (!selectedMinuteTier && pricing.minuteTiers.length > 0) {
                const tier = pricing.minuteTiers[0]
                setSelectedMinuteTier({
                  id: tier.id,
                  name: `${tier.minutes} min`,
                  minutes: tier.minutes,
                  price: tier.price,
                })
              }
            }}
            className={`flex-1 px-4 py-3 rounded-lg font-bold text-sm transition-all ${
              planCategory === 'business'
                ? 'bg-primary text-black border-2 border-primary'
                : 'text-slate-400 hover:text-white border border-border-dark hover:border-slate-500'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Icon name="call" size={16} />
              Business (Calls + SMS)
            </div>
            <p className="text-xs mt-1 opacity-70">Full phone features</p>
          </button>
        </div>

        {/* Duration Selection */}
        <div className="mb-6">
          <h4 className="text-white font-bold mb-3">Select Duration</h4>
          <div className="grid grid-cols-3 gap-3">
            {(planCategory === 'basic' ? pricing.basic : pricing.business).map((plan) => (
              <button
                key={plan.duration}
                onClick={() => setSelectedDuration(plan.duration)}
                className={`p-4 rounded-xl border text-center transition-all ${
                  selectedDuration === plan.duration
                    ? 'bg-primary/10 border-primary'
                    : 'bg-charcoal border-border-dark hover:border-primary/50'
                }`}
              >
                <h5 className="font-bold text-white text-lg">{plan.label}</h5>
                <p className="text-2xl font-extrabold text-primary mt-2">{formatPrice(plan.price)}</p>
                {planCategory === 'basic' && 'smsLimit' in plan && (
                  <p className="text-slate-500 text-xs mt-1">{plan.smsLimit} SMS</p>
                )}
                {planCategory === 'business' && (
                  <p className="text-slate-500 text-xs mt-1">+ minute package</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Minute Tier Selection (Business only) */}
        {planCategory === 'business' && (
          <div className="mb-6">
            <h4 className="text-white font-bold mb-3">Call Forwarding Minutes</h4>
            <div className="grid grid-cols-3 gap-2">
              {pricing.minuteTiers.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => setSelectedMinuteTier({
                    id: tier.id,
                    name: `${tier.minutes} min`,
                    minutes: tier.minutes,
                    price: tier.price,
                  })}
                  className={`px-3 py-2 rounded-lg border text-center transition-all ${
                    selectedMinuteTier?.id === tier.id
                      ? 'bg-blue-500/10 border-blue-500'
                      : 'bg-charcoal border-border-dark hover:border-blue-500/50'
                  }`}
                >
                  <p className="text-base font-bold text-white">{tier.minutes} min</p>
                  <p className="text-blue-400 text-sm font-medium">+{formatPrice(tier.price)}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Plan Summary */}
        <div className="bg-charcoal rounded-xl p-4 mb-6">
          <h4 className="text-white font-bold mb-3">Plan Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Number</span>
              <span className="text-white">{number.friendlyName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Plan Type</span>
              <span className="text-white">{planCategory === 'basic' ? 'Basic (SMS)' : 'Business (Calls + SMS)'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Duration</span>
              <span className="text-white">{planCategory === 'basic' ? currentBasicPlan?.label : currentBusinessPlan?.label}</span>
            </div>
            {planCategory === 'basic' && currentBasicPlan && (
              <div className="flex justify-between">
                <span className="text-slate-400">SMS Included</span>
                <span className="text-white">{currentBasicPlan.smsLimit} messages</span>
              </div>
            )}
            {planCategory === 'business' && selectedMinuteTier && (
              <div className="flex justify-between">
                <span className="text-slate-400">Call Minutes</span>
                <span className="text-white">{selectedMinuteTier.minutes} minutes</span>
              </div>
            )}
            <div className="border-t border-border-dark my-3"></div>
            <div className="flex justify-between text-lg">
              <span className="font-bold text-white">Total</span>
              <span className="font-extrabold text-primary">{formatPrice(totalPrice)}</span>
            </div>
          </div>
        </div>

        {/* Auth Dialog */}
        <AuthDialog
          isOpen={showAuthDialog}
          onClose={() => setShowAuthDialog(false)}
          onSuccess={() => {
            setShowAuthDialog(false)
            setPendingWalletCheckout(true)
            fetchWalletBalance()
          }}
        />

        {/* Deposit Modal */}
        <DepositModal
          isOpen={showDepositModal}
          onClose={async () => {
            setShowDepositModal(false)
            // Refresh balance after deposit modal closes
            setLoadingBalance(true)
            try {
              const result = await getBalance()
              if (result.success && result.data) {
                const newBalance = result.data.balance || 0
                setWalletBalance(newBalance)
                // Auto-complete purchase if now have enough balance
                if (newBalance >= totalPrice) {
                  processWalletPayment()
                }
              }
            } catch (error) {
              console.error('Failed to fetch wallet balance:', error)
            } finally {
              setLoadingBalance(false)
            }
          }}
        />

        {/* Success Message */}
        {checkoutSuccess && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <Icon name="check" size={24} className="text-green-400" />
              <div>
                <h4 className="text-white font-bold">Purchase Complete!</h4>
                <p className="text-slate-400 text-sm">Your virtual number is now active.</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/profile/library?filter=virtual-numbers')}
              className="mt-4 w-full py-3 bg-primary text-black font-bold rounded-xl"
            >
              View My Numbers
            </button>
          </div>
        )}

        {/* Error Message */}
        {checkoutError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <Icon name="alert" size={20} className="text-red-400" />
              <p className="text-red-400 text-sm">{checkoutError}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!checkoutSuccess && (
          <div className="flex gap-3">
            {/* Pay with Wallet Button - 3/5 width */}
            <button
              onClick={handleInstantCheckout}
              disabled={processingPayment || loadingBalance}
              className="w-3/5 py-4 rounded-xl bg-green-500 text-white font-bold hover:brightness-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {processingPayment ? (
                <>
                  <Icon name="loading" size={18} className="animate-spin" />
                  Processing...
                </>
              ) : loadingBalance ? (
                <>
                  <Icon name="loading" size={18} className="animate-spin" />
                  Checking Balance...
                </>
              ) : isAuthenticated ? (
                <>
                  <Icon name="wallet" size={18} />
                  Pay {formatPrice(totalPrice)} with Wallet
                </>
              ) : (
                <>
                  <Icon name="wallet" size={18} />
                  Pay with Wallet
                </>
              )}
            </button>

            {/* Add to Cart Button - 2/5 width */}
            <button
              onClick={handleCheckout}
              className="w-2/5 py-4 rounded-xl bg-charcoal border border-border-dark text-white font-bold hover:border-primary/50 transition-all flex items-center justify-center gap-2"
            >
              <Icon name="cart" size={18} />
              Cart
            </button>
          </div>
        )}
      </div>
    </div>
  )

  // Process wallet payment (extracted for reuse after auth/deposit)
  async function processWalletPayment() {
    setProcessingPayment(true)
    setCheckoutError(null)

    try {
      if (!country) throw new Error('Country not selected')

      const durationPlan = planCategory === 'basic'
        ? pricing.basic.find(p => p.duration === selectedDuration)
        : pricing.business.find(p => p.duration === selectedDuration)

      if (!durationPlan) throw new Error('Plan not found')

      // Create order via API
      const orderData = {
        items: [{
          productId: `vn-instant-${Date.now()}`,
          productType: 'virtual_number',
          quantity: 1,
          price: totalPrice,
          metadata: {
            phoneNumber: number.phoneNumber,
            countryId: country.id,
            countryName: country.name,
            numberType: number.type,
            friendlyName: number.friendlyName,
            planCategory,
            durationDays: selectedDuration,
            durationLabel: durationPlan.label,
            ...(planCategory === 'basic' && 'smsLimit' in durationPlan && { smsLimit: durationPlan.smsLimit }),
            ...(planCategory === 'business' && selectedMinuteTier && {
              minuteTier: selectedMinuteTier.id,
              minuteTierName: selectedMinuteTier.name,
              minuteIncluded: selectedMinuteTier.minutes,
              minuteTierPrice: selectedMinuteTier.price,
            }),
          }
        }],
        paymentMethod: 'wallet',
        total: totalPrice,
      }

      // Use backend instant checkout API
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/backend/orders/instant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(orderData),
      })
      const result = await response.json() as {
        success: boolean
        error?: string
        data?: {
          orderId: string
          orderNumber: string
          refunded?: boolean
          newBalance?: number
          fulfillment?: {
            success: boolean
            itemsFailed?: number
            details?: Array<{ status: string; error?: string }>
          }
        }
      }

      if (result.success) {
        // Check if fulfillment also succeeded
        const fulfillment = result.data?.fulfillment
        if (fulfillment && !fulfillment.success) {
          // Get the first error message from failed items
          const failedItem = fulfillment.details?.find(d => d.status === 'failed')
          const errorMsg = failedItem?.error || 'Failed to provision virtual number'
          setCheckoutError(errorMsg)
          console.error('Fulfillment failed:', fulfillment)
        } else {
          setCheckoutSuccess(true)
          // Refresh wallet balance
          fetchWalletBalance()
        }
      } else {
        // Check if this was a refunded failed order
        if (result.data?.refunded) {
          const errorMsg = result.error || 'Failed to provision virtual number'
          setCheckoutError(`${errorMsg}. Your wallet has been refunded.`)
          // Refresh wallet balance to show refund
          fetchWalletBalance()
        } else {
          setCheckoutError(result.error || 'Failed to process payment')
        }
      }
    } catch (error: any) {
      setCheckoutError(error.message || 'Failed to process payment')
    } finally {
      setProcessingPayment(false)
    }
  }

  // Handle instant checkout with wallet
  async function handleInstantCheckout() {
    setCheckoutError(null)

    // If not authenticated, show auth dialog
    if (!isAuthenticated) {
      setShowAuthDialog(true)
      return
    }

    // Check wallet balance - fetch if null and proceed
    let currentBalance = walletBalance
    if (currentBalance === null) {
      setLoadingBalance(true)
      try {
        const result = await getBalance()
        if (result.success && result.data) {
          currentBalance = result.data.balance || 0
          setWalletBalance(currentBalance)
        } else {
          setCheckoutError('Failed to fetch wallet balance')
          setLoadingBalance(false)
          return
        }
      } catch (error) {
        console.error('Failed to fetch wallet balance:', error)
        setCheckoutError('Failed to fetch wallet balance')
        setLoadingBalance(false)
        return
      }
      setLoadingBalance(false)
    }

    // If insufficient balance, show deposit modal immediately
    if (currentBalance === null || currentBalance < totalPrice) {
      setShowDepositModal(true)
      return
    }

    // Process payment
    await processWalletPayment()
  }
}
