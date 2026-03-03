'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/ui/Icon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { useCart } from '@/lib/cart-context'
import * as virtualNumbersApi from '@/lib/api/virtual-numbers'
import * as otpNumbersApi from '@/lib/api/otp-numbers'

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
  type: string
  capabilities: {
    sms: boolean
    voice: boolean
    mms: boolean
  }
  monthlyPrice: number
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

export default function VirtualNumbersPage() {
  const router = useRouter()
  const { addItem } = useCart()

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('monthly')

  // ===== MONTHLY NUMBERS STATE =====
  const [countries, setCountries] = useState<Country[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>([])
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [numberType, setNumberType] = useState<NumberType>('all')
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

  // Fetch available numbers when country changes
  useEffect(() => {
    if (!selectedCountry) {
      setAvailableNumbers([])
      return
    }

    async function fetchNumbers() {
      setLoadingNumbers(true)
      try {
        const result = await virtualNumbersApi.searchAvailableNumbers({
          countryCode: selectedCountry!.isoCode,
          type: numberType === 'all' ? undefined : numberType as any
        })
        if (result.success && result.data) {
          setAvailableNumbers(result.data)
        }
      } catch (error) {
        console.error('Error fetching numbers:', error)
      } finally {
        setLoadingNumbers(false)
      }
    }
    fetchNumbers()
  }, [selectedCountry, numberType])

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

    const virtualNumberProduct = {
      id: `vn-${selectedNumber.phoneNumber}-${Date.now()}`,
      name: `Virtual Number: ${selectedNumber.friendlyName}`,
      slug: `virtual-number-${selectedNumber.phoneNumber.replace(/\+/g, '')}`,
      description: `${selectedCountry.name} ${selectedNumber.type} number with ${selectedPlan.name} plan`,
      price: selectedPlan.basePrice + (selectedCountry.retailMonthly || 0),
      rating: 5,
      reviewCount: 0,
      category: 'virtual-numbers',
      icon: 'phone',
      iconColor: 'text-primary',
      tags: ['virtual-number', selectedCountry.isoCode.toLowerCase()],
      image: '/images/products/virtual-number.png',
      metadata: {
        productType: 'virtual-number',
        phoneNumber: selectedNumber.phoneNumber,
        countryId: selectedCountry.id,
        countryName: selectedCountry.name,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        numberType: selectedNumber.type
      }
    }

    addItem(virtualNumberProduct as any)
    setShowPlanModal(false)
    router.push('/cart')
  }

  // Handle OTP purchase
  const handlePurchaseOtp = async () => {
    if (!selectedOtpService || !selectedOtpCountry || otpPrice === null) return

    setPurchasingOtp(true)
    setOtpError(null)

    try {
      const result = await otpNumbersApi.requestNumber(
        selectedOtpService.id,
        selectedOtpCountry.code
      )

      if (result.success && result.data) {
        // Redirect to success page with OTP ID for polling
        router.push(`/checkout/success?otpId=${result.data.id}&type=otp`)
      } else {
        setOtpError(result.error || 'Failed to purchase OTP number')
      }
    } catch (error: any) {
      setOtpError(error.message || 'Failed to purchase OTP number')
    } finally {
      setPurchasingOtp(false)
    }
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
              onClick={() => setActiveTab('monthly')}
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
              onClick={() => setActiveTab('otp')}
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
                    <span className="text-2xl mb-2 block">{country.flagEmoji || '🌍'}</span>
                    <h3 className="font-bold text-white text-xs mb-1">{country.name}</h3>
                    <p className="text-xs text-primary font-bold">${country.retailMonthly}/mo</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Type Filter */}
          <div className="flex gap-3 mb-8 overflow-x-auto no-scrollbar">
            {(['all', 'local', 'toll-free', 'mobile'] as NumberType[]).map((type) => (
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
              </button>
            ))}
          </div>

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
                {filteredNumbers.map((number, idx) => (
                  <div
                    key={`${number.phoneNumber}-${idx}`}
                    className="bg-charcoal border border-border-dark hover:border-primary/50 rounded-2xl p-6 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{selectedCountry?.flagEmoji || '🌍'}</span>
                        <div>
                          <h3 className="font-bold text-white">{number.friendlyName}</h3>
                          <p className="text-sm text-slate-500">
                            {number.locality || selectedCountry?.name}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        number.type === 'toll-free'
                          ? 'bg-green-500/10 text-green-400'
                          : number.type === 'mobile'
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {number.type.toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-2 mb-6">
                      {number.capabilities.sms && (
                        <div className="flex items-center gap-2 text-sm">
                          <Icon name="check" size={14} className="text-green-400" />
                          <span className="text-slate-400">SMS Enabled</span>
                        </div>
                      )}
                      {number.capabilities.voice && (
                        <div className="flex items-center gap-2 text-sm">
                          <Icon name="check" size={14} className="text-green-400" />
                          <span className="text-slate-400">Voice Calls</span>
                        </div>
                      )}
                      {number.capabilities.mms && (
                        <div className="flex items-center gap-2 text-sm">
                          <Icon name="check" size={14} className="text-green-400" />
                          <span className="text-slate-400">MMS Support</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-end justify-between mb-4">
                      <div>
                        <span className="text-2xl font-extrabold text-white">${number.monthlyPrice}</span>
                        <span className="text-slate-500 text-sm">/month</span>
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
                ))}
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
                          <span className="text-xl mb-1 block">{country.flag || '🌍'}</span>
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
                      <span className="text-xl">{selectedOtpCountry.flag || '🌍'}</span>
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
                    <span className="text-2xl font-extrabold text-white">${otpPrice.toFixed(2)}</span>
                  ) : (
                    <p className="text-slate-400">—</p>
                  )}
                </div>

                {/* Error */}
                {otpError && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 text-sm">{otpError}</p>
                  </div>
                )}

                {/* Purchase Button */}
                <button
                  onClick={handlePurchaseOtp}
                  disabled={!selectedOtpService || !selectedOtpCountry || otpPrice === null || purchasingOtp}
                  className="w-full py-4 rounded-xl bg-primary text-black font-bold hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {purchasingOtp ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Icon name="wallet" size={18} />
                      Buy with Wallet
                    </>
                  )}
                </button>

                <p className="text-slate-500 text-xs text-center mt-3">
                  Instant deduction from wallet balance
                </p>
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

      {/* Plan Selection Modal */}
      {showPlanModal && selectedNumber && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-dark rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Choose Your Plan</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Number: {selectedNumber.friendlyName}
                </p>
              </div>
              <button
                onClick={() => setShowPlanModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <Icon name="close" size={24} />
              </button>
            </div>

            {loadingPlans ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4 mb-6">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      selectedPlan?.id === plan.id
                        ? 'bg-primary/10 border-primary'
                        : 'bg-charcoal border-border-dark hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white">{plan.name}</h4>
                        {plan.isFeatured && (
                          <span className="text-xs bg-primary text-black px-2 py-0.5 rounded-full font-bold">
                            POPULAR
                          </span>
                        )}
                      </div>
                      <span className="text-xl font-bold text-white">${plan.basePrice}<span className="text-sm text-slate-400">/mo</span></span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {plan.features.slice(0, 4).map((feature, idx) => (
                        <span key={idx} className="text-xs text-slate-400 bg-surface-dark px-2 py-1 rounded">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={handleAddToCart}
              disabled={!selectedPlan}
              className="w-full py-4 rounded-xl bg-primary text-black font-bold hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add to Cart - ${selectedPlan?.basePrice || 0}/month
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
