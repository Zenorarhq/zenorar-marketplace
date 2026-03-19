'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import TestModeBanner from '@/components/ui/TestModeBanner'
import ServiceLogo from '@/components/ui/ServiceLogo'
import WalletDisplay from '@/components/ui/WalletDisplay'
import { usePreferences } from '@/contexts/PreferencesContext'

type NumberType = 'all' | 'local' | 'toll-free' | 'mobile'
type TabType = 'monthly' | 'otp'

const COUNTRIES_PER_PAGE = 24
const OTP_SERVICES_PER_PAGE = 24

// Resolve country name from ISO code using Intl API
function resolveCountryName(isoCode: string, dbName: string | null): string {
  if (dbName && dbName !== isoCode) return dbName
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' })
    return displayNames.of(isoCode) || isoCode
  } catch {
    return isoCode
  }
}

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
  source?: 'inventory' | 'provider'  // inventory = instant activation
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
  // Fetch countries with React Query caching
  const { data: countries = [], isLoading: loadingCountries } = useQuery({
    queryKey: ['virtual-numbers-countries'],
    queryFn: async () => {
      const result = await virtualNumbersApi.getCountries()
      if (result.success && result.data) {
        return result.data
      }
      return []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Fetch plans with React Query caching
  const { data: plansData, isLoading: loadingPlans } = useQuery({
    queryKey: ['virtual-numbers-plans'],
    queryFn: async () => {
      const result = await virtualNumbersApi.getPlans()
      if (result.success && result.data) {
        return result.data
      }
      return []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  const plans = plansData ?? []

  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>([])
  const [allTypesNumbers, setAllTypesNumbers] = useState<AvailableNumber[]>([]) // Master list from "All Types" fetch
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [numberType, setNumberType] = useState<NumberType>('all')
  const prevCountryIdRef = useRef<string | null>(null)
  const [countryPage, setCountryPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')

  // Reset pagination when search changes
  useEffect(() => { setCountryPage(1) }, [searchQuery])
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [selectedNumber, setSelectedNumber] = useState<AvailableNumber | null>(null)

  // Monthly loading states
  const [loadingNumbers, setLoadingNumbers] = useState(false)

  // ===== OTP STATE =====
  const [otpServices, setOtpServices] = useState<OtpService[]>([])
  const [otpCountries, setOtpCountries] = useState<OtpCountry[]>([])
  const [selectedOtpService, setSelectedOtpService] = useState<OtpService | null>(null)
  const [selectedOtpCountry, setSelectedOtpCountry] = useState<OtpCountry | null>(null)
  const [otpPrice, setOtpPrice] = useState<number | null>(null)
  const [otpServicePage, setOtpServicePage] = useState(1)
  const [otpCountryPage, setOtpCountryPage] = useState(1)
  const [otpSearchQuery, setOtpSearchQuery] = useState(searchParams.get('search') || '')
  const [otpCountrySearchQuery, setOtpCountrySearchQuery] = useState('')
  const [otpActiveStep, setOtpActiveStep] = useState<'service' | 'country'>('service')
  const countrySectionRef = useRef<HTMLDivElement>(null)

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

  // Test mode state (for testing OTP flow without real API credentials)
  const [otpTestMode, setOtpTestMode] = useState(false)
  const [togglingTestMode, setTogglingTestMode] = useState(false)

  // Global test mode check (controls visibility of OTP test features)
  const [globalTestEnabled, setGlobalTestEnabled] = useState(false)
  useEffect(() => {
    if (!isAuthenticated) return
    const token = localStorage.getItem('auth_token')
    fetch('/api/test-mode', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { if (data.success) setGlobalTestEnabled(data.data.enabled) })
      .catch(() => {})
  }, [isAuthenticated])

  // OTP Modal state
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [otpModalStatus, setOtpModalStatus] = useState<'pending' | 'received' | 'cancelled' | 'expired'>('pending')
  const [otpModalCode, setOtpModalCode] = useState<string | null>(null)
  const [otpModalFullSms, setOtpModalFullSms] = useState<string | null>(null)
  const [otpModalTimeLeft, setOtpModalTimeLeft] = useState(5 * 60) // 5 minutes to receive SMS
  const [otpModalCancelling, setOtpModalCancelling] = useState(false)
  const [otpModalError, setOtpModalError] = useState<string | null>(null)
  const [numberCopied, setNumberCopied] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [otpCodeExpiryTime, setOtpCodeExpiryTime] = useState(3 * 60) // 3 minutes for code expiry

  // ===== MONTHLY NUMBERS EFFECTS =====

  // Auto-select featured plan when plans load
  useEffect(() => {
    if (plans.length > 0 && !selectedPlan) {
      const featured = plans.find(p => p.isFeatured)
      if (featured) setSelectedPlan(featured)
    }
  }, [plans, selectedPlan])

  // Fetch available numbers when country or type changes
  // Default to US numbers when no country is selected
  useEffect(() => {
    // Determine which country code to use - default to US if no selection
    const countryCode = selectedCountry?.isoCode || 'US'
    const countryId = selectedCountry?.id || 'default-us'

    const countryChanged = prevCountryIdRef.current !== countryId
    prevCountryIdRef.current = countryId

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
            countryCode: countryCode,
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
            countryCode: countryCode,
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

  // Toggle test mode
  const handleToggleTestMode = async () => {
    setTogglingTestMode(true)
    try {
      const newMode = !otpTestMode
      // Call API to toggle test mode
      const response = await fetch(`/api/otp-numbers?testMode=${newMode}&action=testModeStatus`)
      const result = await response.json()
      if (result.success) {
        setOtpTestMode(result.testMode)
        // Clear current selections and refetch services
        setSelectedOtpService(null)
        setSelectedOtpCountry(null)
        setOtpPrice(null)
        setOtpServices([]) // Force refetch
        setOtpError(null)
        setOtpSuccess(false)
      }
    } catch (error) {
      console.error('Error toggling test mode:', error)
    } finally {
      setTogglingTestMode(false)
    }
  }

  // Fetch OTP services when OTP tab is active or test mode changes
  useEffect(() => {
    if (activeTab !== 'otp') return
    if (otpServices.length > 0) return

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
  }, [activeTab, otpServices.length, otpTestMode])

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

  // OTP Modal - Poll for SMS when modal is open
  useEffect(() => {
    if (!showOtpModal || !otpSuccessData || otpModalStatus !== 'pending') return

    const pollInterval = setInterval(async () => {
      try {
        const result = await otpNumbersApi.checkSms(otpSuccessData.id)
        if (result.success && result.data) {
          if (result.data.status === 'received' && result.data.code) {
            setOtpModalStatus('received')
            setOtpModalCode(result.data.code)
            setOtpModalFullSms(result.data.fullSms || null)
            setOtpCodeExpiryTime(3 * 60) // Reset code expiry timer to 3 minutes
          } else if (result.data.status === 'expired') {
            setOtpModalStatus('expired')
          } else if (result.data.status === 'cancelled') {
            setOtpModalStatus('cancelled')
          }
        }
      } catch (err) {
        console.error('Error polling OTP status:', err)
      }
    }, 3000)

    return () => clearInterval(pollInterval)
  }, [showOtpModal, otpSuccessData, otpModalStatus])

  // OTP Modal - Countdown timer (waiting for code)
  useEffect(() => {
    if (!showOtpModal || otpModalStatus !== 'pending' || otpModalTimeLeft <= 0) return

    const timerInterval = setInterval(() => {
      setOtpModalTimeLeft(prev => {
        if (prev <= 1) {
          setOtpModalStatus('expired')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timerInterval)
  }, [showOtpModal, otpModalStatus, otpModalTimeLeft])

  // OTP Modal - Code expiry timer (after code received)
  useEffect(() => {
    if (!showOtpModal || otpModalStatus !== 'received' || otpCodeExpiryTime <= 0) return

    const expiryInterval = setInterval(() => {
      setOtpCodeExpiryTime(prev => {
        if (prev <= 1) {
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(expiryInterval)
  }, [showOtpModal, otpModalStatus, otpCodeExpiryTime])

  // Handle OTP modal cancel
  const handleOtpModalCancel = async () => {
    if (!otpSuccessData || otpModalCancelling) return

    setOtpModalCancelling(true)
    setOtpModalError(null)

    try {
      const result = await otpNumbersApi.cancelNumber(otpSuccessData.id)
      if (result.success) {
        setOtpModalStatus('cancelled')
        fetchOtpWalletBalance() // Refresh balance after refund
      } else {
        setOtpModalError(result.error || 'Failed to cancel')
      }
    } catch (err: any) {
      setOtpModalError(err.message || 'Failed to cancel')
    } finally {
      setOtpModalCancelling(false)
    }
  }

  // Copy number to clipboard
  const handleCopyNumber = () => {
    if (otpSuccessData?.phoneNumber) {
      navigator.clipboard.writeText(otpSuccessData.phoneNumber)
      setNumberCopied(true)
      setTimeout(() => setNumberCopied(false), 2000)
    }
  }

  // Copy code to clipboard
  const handleCopyCode = () => {
    if (otpModalCode) {
      navigator.clipboard.writeText(otpModalCode)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    }
  }

  // Open OTP modal
  const openOtpModal = () => {
    setOtpModalStatus('pending')
    setOtpModalCode(null)
    setOtpModalFullSms(null)
    setOtpModalTimeLeft(5 * 60) // 5 minutes to receive SMS
    setOtpCodeExpiryTime(3 * 60) // 3 minutes for code expiry
    setOtpModalError(null)
    setShowOtpModal(true)
  }

  // Close OTP modal and reset
  const closeOtpModal = () => {
    setShowOtpModal(false)
    // Reset success state if code was received or cancelled
    if (otpModalStatus === 'received' || otpModalStatus === 'cancelled') {
      setOtpSuccess(false)
      setOtpSuccessData(null)
      setSelectedOtpService(null)
      setSelectedOtpCountry(null)
      setOtpPrice(null)
    }
  }

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

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

  // Filter OTP countries by search
  const filteredOtpCountries = otpCountries.filter((country) => {
    if (!otpCountrySearchQuery) return true
    return country.name.toLowerCase().includes(otpCountrySearchQuery.toLowerCase()) ||
           country.code.toLowerCase().includes(otpCountrySearchQuery.toLowerCase())
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
        selectedOtpCountry.code,
        { testMode: otpTestMode }
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
      <div className="bg-gradient-to-r from-[#43D678]/20 via-[#43D678]/10 to-transparent rounded-2xl lg:rounded-3xl p-6 lg:p-12 mb-8 lg:mb-12">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl lg:text-4xl font-extrabold text-white mb-2">
              Virtual Phone Numbers
            </h1>
            <p className="text-slate-500 text-sm lg:text-base max-w-2xl">
              {activeTab === 'monthly'
                ? `Get virtual phone numbers from ${countries.length}+ countries. Perfect for business, privacy, and verification.`
                : 'Get instant one-time phone numbers for SMS verification. Pay only for what you use.'}
            </p>
          </div>

          {/* Wallet Balance - Desktop */}
          <WalletDisplay variant="desktop" />
        </header>
        {/* Search */}
        <div className="mt-6 relative max-w-xl">
          <Icon name="search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder={activeTab === 'monthly' ? 'Search countries...' : 'Search services (WhatsApp, Google, etc.)...'}
            value={activeTab === 'monthly' ? searchQuery : otpSearchQuery}
            onChange={(e) => activeTab === 'monthly' ? setSearchQuery(e.target.value) : setOtpSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-charcoal border border-border-dark rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      {/* Wallet Balance - Mobile */}
      <WalletDisplay variant="mobile" />

      {/* Tab Switcher - Below Hero */}
      <div className="mb-8">
        <div className="flex gap-2 p-1 bg-surface-dark rounded-xl border border-border-dark w-fit">
          <button
            onClick={() => handleTabChange('monthly')}
            className={`px-4 lg:px-6 py-2.5 lg:py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'monthly'
                ? 'bg-primary text-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Icon name="phone" size={18} />
              <span className="hidden sm:inline">Monthly Numbers</span>
              <span className="sm:hidden">Monthly</span>
            </span>
          </button>
          <button
            onClick={() => handleTabChange('otp')}
            className={`px-4 lg:px-6 py-2.5 lg:py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'otp'
                ? 'bg-primary text-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Icon name="message" size={18} />
              <span className="hidden sm:inline">One-Time OTP</span>
              <span className="sm:hidden">OTP</span>
            </span>
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          {activeTab === 'monthly'
            ? 'Rent phone numbers with SMS & voice for recurring use'
            : 'One-time numbers for SMS verification'}
        </p>
      </div>

      {/* ===== MONTHLY NUMBERS TAB ===== */}
      {activeTab === 'monthly' && (
        <>
          {/* Sandbox Mode Banner */}
          <TestModeBanner />

          {/* Country Selection */}
          <div className="mb-10">
            <h2 className="text-xl font-bold text-white mb-4">Select Country</h2>
            {loadingCountries ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : selectedCountry ? (
              <div className="bg-primary/10 border border-primary rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <FlagIcon countryCode={selectedCountry.isoCode} className="w-10 h-10 rounded" />
                  <div>
                    <h3 className="font-bold text-white">{resolveCountryName(selectedCountry.isoCode, selectedCountry.name)}</h3>
                    <p className="text-sm text-slate-400">{selectedCountry.dialCode}</p>
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
            ) : (() => {
              // Hide countries with no pricing (empty countries)
              const activeCountries = countries.filter(c => c.retailMonthly > 0)
              const filteredCountries = searchQuery
                ? activeCountries.filter(c =>
                    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    c.isoCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    c.dialCode.includes(searchQuery)
                  )
                : activeCountries
              const totalCountryPages = Math.ceil(filteredCountries.length / COUNTRIES_PER_PAGE)
              const paginatedCountries = filteredCountries.slice(
                (countryPage - 1) * COUNTRIES_PER_PAGE,
                countryPage * COUNTRIES_PER_PAGE
              )
              return (
                <>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                    {paginatedCountries.map((country) => (
                      <button
                        key={country.id}
                        onClick={() => setSelectedCountry(country)}
                        className="group relative flex flex-col items-center justify-center aspect-[3/4] bg-gradient-to-b from-charcoal to-[#1a1a2e] hover:from-primary/10 hover:to-primary/5 transition-all"
                        style={{ clipPath: 'polygon(0 8%, 8% 0, 100% 0, 100% 100%, 0 100%)' }}
                      >
                        {/* SIM chip detail */}
                        <div className="absolute top-2 right-2 w-5 h-4 rounded-sm border border-white/10 bg-white/5" />
                        {/* Outline overlay */}
                        <div
                          className="absolute inset-0 border border-border-dark group-hover:border-primary/50 transition-colors pointer-events-none"
                          style={{ clipPath: 'polygon(0 8%, 8% 0, 100% 0, 100% 100%, 0 100%)' }}
                        />
                        <div className="w-14 h-10 sm:w-16 sm:h-12 rounded-lg overflow-hidden mb-3 shadow-lg border border-white/10">
                          <FlagIcon countryCode={country.isoCode} className="w-full h-full object-cover" />
                        </div>
                        <h3 className="font-medium text-white text-xs text-center truncate w-full px-2">{resolveCountryName(country.isoCode, country.name)}</h3>
                        <p className="text-[10px] text-slate-500">From {formatPrice(country.retailMonthly)}</p>
                      </button>
                    ))}
                  </div>
                  {totalCountryPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-xs text-slate-500">
                        {((countryPage - 1) * COUNTRIES_PER_PAGE) + 1} - {Math.min(countryPage * COUNTRIES_PER_PAGE, filteredCountries.length)} of {filteredCountries.length}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCountryPage(p => Math.max(1, p - 1))}
                          disabled={countryPage === 1}
                          className="px-2 py-1 bg-surface-dark border border-border-dark rounded text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Icon name="chevron-left" size={14} />
                        </button>
                        <span className="text-xs text-slate-400 px-2">{countryPage} / {totalCountryPages}</span>
                        <button
                          onClick={() => setCountryPage(p => Math.min(totalCountryPages, p + 1))}
                          disabled={countryPage === totalCountryPages}
                          className="px-2 py-1 bg-surface-dark border border-border-dark rounded text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Icon name="chevron-right" size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
          </div>

          {/* Type Filter & Numbers - Only shown after country selection */}
          {selectedCountry && (
          <>
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
                {filteredNumbers.length} numbers in {selectedCountry?.name || 'United States'}
              </span>
            </div>

            {loadingNumbers ? (
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
                  const startingPrice = plans.length > 0 ? Math.min(...plans.map(p => p.basePrice)) : 2

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
        </>
      )}

      {/* ===== OTP TAB ===== */}
      {activeTab === 'otp' && (
        <>
          {/* Test Mode Toggle — only visible when global test mode is enabled */}
          {globalTestEnabled && (
          <div className={`mb-4 p-4 rounded-xl border ${otpTestMode ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-surface-dark border-border-dark'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon name="code" size={20} className={otpTestMode ? 'text-yellow-400' : 'text-slate-500'} />
                <div>
                  <p className={`font-bold text-sm ${otpTestMode ? 'text-yellow-400' : 'text-slate-400'}`}>
                    {otpTestMode ? 'Test Mode Active' : 'Test Mode'}
                  </p>
                  <p className="text-slate-500 text-xs">
                    {otpTestMode
                      ? 'Using mock data. Real wallet balance will be charged, but OTP will be simulated.'
                      : 'Enable to test the OTP flow without real provider API'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleToggleTestMode}
                disabled={togglingTestMode}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  otpTestMode
                    ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                    : 'bg-charcoal border border-border-dark text-slate-400 hover:text-white hover:border-primary/50'
                }`}
              >
                {togglingTestMode ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    Switching...
                  </span>
                ) : otpTestMode ? (
                  'Disable Test Mode'
                ) : (
                  'Enable Test Mode'
                )}
              </button>
            </div>
            {otpTestMode && (
              <div className="mt-3 pt-3 border-t border-yellow-500/20">
                <p className="text-yellow-400/80 text-xs">
                  In test mode: Select any service → Select any country → Buy with wallet → SMS code will auto-arrive in 5-10 seconds. You can also test cancellation and refunds.
                </p>
              </div>
            )}
          </div>
          )}

          {/* How it works */}
          <div className="bg-surface-dark border border-border-dark rounded-2xl p-6 mb-8">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Icon name="info" size={18} className="text-primary" />
              How OTP Numbers Work
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">1</span>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Select Service</p>
                  <p className="text-slate-500 text-xs">Choose or search for WhatsApp, Google, etc.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">2</span>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Pick Country</p>
                  <p className="text-slate-500 text-xs">Choose or search for your preferred country</p>
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Service & Country - Tab Based Selection */}
            <div className="lg:col-span-2">
              {/* Tab Headers */}
              <div className="flex gap-2 mb-4">
                {/* Service Tab Header */}
                {selectedOtpService ? (
                  <button
                    onClick={() => {
                      setSelectedOtpService(null)
                      setSelectedOtpCountry(null)
                      setOtpPrice(null)
                      setOtpSearchQuery('')
                      setOtpActiveStep('service')
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 border border-primary rounded-xl hover:bg-primary/20 transition-all group"
                  >
                    <ServiceLogo name={selectedOtpService.name} size={24} />
                    <span className="text-white font-bold text-sm truncate max-w-[120px]">{selectedOtpService.name}</span>
                    <Icon name="x" size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                  </button>
                ) : (
                  <button
                    onClick={() => setOtpActiveStep('service')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                      otpActiveStep === 'service'
                        ? 'bg-primary text-black'
                        : 'bg-charcoal border border-border-dark text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-xs">1</span>
                    Service
                  </button>
                )}

                {/* Country Tab Header */}
                {selectedOtpCountry ? (
                  <button
                    onClick={() => {
                      setSelectedOtpCountry(null)
                      setOtpPrice(null)
                      setOtpCountrySearchQuery('')
                      setOtpActiveStep('country')
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 border border-primary rounded-xl hover:bg-primary/20 transition-all group"
                  >
                    <FlagIcon countryCode={selectedOtpCountry.code} className="w-6 h-6 rounded" />
                    <span className="text-white font-bold text-sm truncate max-w-[120px]">{selectedOtpCountry.name}</span>
                    <Icon name="x" size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                  </button>
                ) : (
                  <button
                    onClick={() => selectedOtpService && setOtpActiveStep('country')}
                    disabled={!selectedOtpService}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                      otpActiveStep === 'country' && selectedOtpService
                        ? 'bg-primary text-black'
                        : selectedOtpService
                        ? 'bg-charcoal border border-border-dark text-slate-400 hover:text-white'
                        : 'bg-charcoal/50 border border-border-dark text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                      selectedOtpService ? 'bg-black/20' : 'bg-slate-800'
                    }`}>2</span>
                    Country
                  </button>
                )}
              </div>

              {/* Tab Content Area */}
              <div className="bg-charcoal border border-border-dark rounded-2xl p-5">
                {/* Service Tab Content */}
                {otpActiveStep === 'service' && !selectedOtpService && (
                  <>
                    <h2 className="text-lg font-bold text-white mb-4">Select a Service</h2>

                    {/* Search Services */}
                    <div className="mb-4">
                      <div className="relative">
                        <Icon name="search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Search services (WhatsApp, Google, etc.)..."
                          value={otpSearchQuery}
                          onChange={(e) => setOtpSearchQuery(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-surface-dark border border-border-dark rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                      </div>
                    </div>

                    {/* Services Grid */}
                    {loadingOtpServices ? (
                      <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : filteredOtpServices.length === 0 ? (
                      <div className="text-center py-16">
                        <Icon name="search" size={48} className="text-slate-600 mx-auto mb-3" />
                        <h3 className="text-white font-bold mb-1">No Services Found</h3>
                        <p className="text-slate-500 text-sm">Try a different search term</p>
                      </div>
                    ) : (() => {
                        const totalOtpPages = Math.ceil(filteredOtpServices.length / OTP_SERVICES_PER_PAGE)
                        const paginatedServices = filteredOtpServices.slice(
                          (otpServicePage - 1) * OTP_SERVICES_PER_PAGE,
                          otpServicePage * OTP_SERVICES_PER_PAGE
                        )
                        return (
                          <>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-3">
                              {paginatedServices.map((service) => (
                                <button
                                  key={service.id}
                                  onClick={() => {
                                    setSelectedOtpService(service)
                                    setSelectedOtpCountry(null)
                                    setOtpPrice(null)
                                    setOtpSearchQuery('')
                                    setOtpServicePage(1)
                                    setOtpActiveStep('country')
                                  }}
                                  className="p-3 rounded-xl border transition-all text-center bg-surface-dark border-border-dark hover:border-primary/50 hover:bg-charcoal"
                                >
                                  <div className="flex justify-center mb-2">
                                    <ServiceLogo name={service.name} size={32} />
                                  </div>
                                  <h3 className="font-bold text-white text-xs truncate">{service.name}</h3>
                                </button>
                              ))}
                            </div>
                            {totalOtpPages > 1 && (
                              <div className="mt-4 flex items-center justify-between">
                                <p className="text-xs text-slate-500">
                                  {((otpServicePage - 1) * OTP_SERVICES_PER_PAGE) + 1} - {Math.min(otpServicePage * OTP_SERVICES_PER_PAGE, filteredOtpServices.length)} of {filteredOtpServices.length}
                                </p>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setOtpServicePage(p => Math.max(1, p - 1))}
                                    disabled={otpServicePage === 1}
                                    className="px-2 py-1 bg-surface-dark border border-border-dark rounded text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <Icon name="chevron-left" size={14} />
                                  </button>
                                  <span className="text-xs text-slate-400 px-2">{otpServicePage} / {totalOtpPages}</span>
                                  <button
                                    onClick={() => setOtpServicePage(p => Math.min(totalOtpPages, p + 1))}
                                    disabled={otpServicePage === totalOtpPages}
                                    className="px-2 py-1 bg-surface-dark border border-border-dark rounded text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <Icon name="chevron-right" size={14} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )
                      })()}
                  </>
                )}

                {/* Country Tab Content */}
                {(otpActiveStep === 'country' || selectedOtpService) && !selectedOtpCountry && selectedOtpService && (
                  <>
                    <h2 className="text-lg font-bold text-white mb-4">Select a Country</h2>

                    {/* Search Countries */}
                    <div className="mb-4">
                      <div className="relative">
                        <Icon name="search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Search countries..."
                          value={otpCountrySearchQuery}
                          onChange={(e) => setOtpCountrySearchQuery(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-surface-dark border border-border-dark rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                      </div>
                    </div>

                    {/* Countries Grid */}
                    {loadingOtpCountries ? (
                      <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : filteredOtpCountries.length === 0 ? (
                      <div className="text-center py-16">
                        <Icon name="globe" size={48} className="text-slate-600 mx-auto mb-3" />
                        <h3 className="text-white font-bold mb-1">
                          {otpCountrySearchQuery ? 'No Countries Found' : 'No Countries Available'}
                        </h3>
                        <p className="text-slate-500 text-sm">
                          {otpCountrySearchQuery ? 'Try a different search term' : 'This service may not be available right now'}
                        </p>
                      </div>
                    ) : (() => {
                        const OTP_COUNTRIES_PER_PAGE = 24
                        const totalOtpCountryPages = Math.ceil(filteredOtpCountries.length / OTP_COUNTRIES_PER_PAGE)
                        const paginatedOtpCountries = filteredOtpCountries.slice(
                          (otpCountryPage - 1) * OTP_COUNTRIES_PER_PAGE,
                          otpCountryPage * OTP_COUNTRIES_PER_PAGE
                        )
                        return (
                          <>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-3">
                              {paginatedOtpCountries.map((country) => (
                                <button
                                  key={country.code}
                                  onClick={() => {
                                    setSelectedOtpCountry(country)
                                    setOtpCountrySearchQuery('')
                                    setOtpCountryPage(1)
                                  }}
                                  className="p-3 rounded-xl border transition-all text-center bg-surface-dark border-border-dark hover:border-primary/50"
                                >
                                  <div className="flex justify-center mb-2">
                                    <FlagIcon countryCode={country.code} className="w-8 h-8 rounded" />
                                  </div>
                                  <h3 className="font-medium text-white text-xs truncate">{country.name}</h3>
                                </button>
                              ))}
                            </div>
                            {totalOtpCountryPages > 1 && (
                              <div className="mt-4 flex items-center justify-between">
                                <p className="text-xs text-slate-500">
                                  {((otpCountryPage - 1) * OTP_COUNTRIES_PER_PAGE) + 1} - {Math.min(otpCountryPage * OTP_COUNTRIES_PER_PAGE, filteredOtpCountries.length)} of {filteredOtpCountries.length}
                                </p>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setOtpCountryPage(p => Math.max(1, p - 1))}
                                    disabled={otpCountryPage === 1}
                                    className="px-2 py-1 bg-surface-dark border border-border-dark rounded text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <Icon name="chevron-left" size={14} />
                                  </button>
                                  <span className="text-xs text-slate-400 px-2">{otpCountryPage} / {totalOtpCountryPages}</span>
                                  <button
                                    onClick={() => setOtpCountryPage(p => Math.min(totalOtpCountryPages, p + 1))}
                                    disabled={otpCountryPage === totalOtpCountryPages}
                                    className="px-2 py-1 bg-surface-dark border border-border-dark rounded text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <Icon name="chevron-right" size={14} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )
                      })()}
                  </>
                )}

                {/* Both Selected - Show Summary */}
                {selectedOtpService && selectedOtpCountry && (
                  <div className="text-center py-8">
                    <div className="flex items-center justify-center gap-4 mb-6">
                      <div className="flex flex-col items-center">
                        <ServiceLogo name={selectedOtpService.name} size={48} />
                        <span className="text-white font-bold mt-2">{selectedOtpService.name}</span>
                      </div>
                      <Icon name="arrow-right" size={24} className="text-slate-500" />
                      <div className="flex flex-col items-center">
                        <FlagIcon countryCode={selectedOtpCountry.code} className="w-12 h-12 rounded" />
                        <span className="text-white font-bold mt-2">{selectedOtpCountry.name}</span>
                      </div>
                    </div>
                    <div className="mb-6">
                      {loadingOtpPrice ? (
                        <div className="animate-pulse bg-slate-700 h-10 w-24 rounded mx-auto"></div>
                      ) : otpPrice !== null ? (
                        <span className="text-4xl font-extrabold text-primary">{formatPrice(otpPrice)}</span>
                      ) : (
                        <span className="text-slate-400">Loading price...</span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm">
                      Click the pills above to change your selection
                    </p>
                  </div>
                )}
              </div>

              {/* Mobile: Your Selection Panel (inline, not fixed) */}
              <div className="lg:hidden mt-6">
                <div className="bg-charcoal border border-border-dark rounded-2xl p-5">
                  <h3 className="text-lg font-bold text-white mb-4">Your Selection</h3>

                  <div className="flex gap-4 mb-4">
                    {/* Service */}
                    <div className="flex-1">
                      <p className="text-slate-500 text-xs mb-1">Service</p>
                      {selectedOtpService ? (
                        <div className="flex items-center gap-2">
                          <ServiceLogo name={selectedOtpService.name} size={20} />
                          <span className="text-white font-medium text-sm truncate">{selectedOtpService.name}</span>
                        </div>
                      ) : (
                        <p className="text-slate-400 text-sm">Select a service</p>
                      )}
                    </div>

                    {/* Country */}
                    <div className="flex-1">
                      <p className="text-slate-500 text-xs mb-1">Country</p>
                      {selectedOtpCountry ? (
                        <div className="flex items-center gap-2">
                          <FlagIcon countryCode={selectedOtpCountry.code} className="w-5 h-5 rounded" />
                          <span className="text-white font-medium text-sm truncate">{selectedOtpCountry.name}</span>
                        </div>
                      ) : (
                        <p className="text-slate-400 text-sm">
                          {selectedOtpService ? 'Select country' : '—'}
                        </p>
                      )}
                    </div>

                    {/* Price */}
                    <div className="flex-shrink-0">
                      <p className="text-slate-500 text-xs mb-1">Price</p>
                      {loadingOtpPrice ? (
                        <div className="animate-pulse bg-slate-700 h-6 w-14 rounded"></div>
                      ) : otpPrice !== null ? (
                        <span className="text-xl font-extrabold text-white">{formatPrice(otpPrice)}</span>
                      ) : (
                        <p className="text-slate-400 text-sm">—</p>
                      )}
                    </div>
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
                      <div className="bg-surface-dark rounded-lg p-3 mb-3">
                        <p className="text-slate-500 text-xs">Your Number</p>
                        <div className="flex items-center justify-between">
                          <p className="text-white font-mono text-lg">{otpSuccessData.phoneNumber}</p>
                          <button
                            onClick={handleCopyNumber}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            title="Copy number"
                          >
                            <Icon name={numberCopied ? 'check' : 'copy'} size={18} className={numberCopied ? 'text-green-400' : 'text-slate-400'} />
                          </button>
                        </div>
                        {numberCopied && <p className="text-green-400 text-xs mt-1">Copied!</p>}
                      </div>
                      <button
                        onClick={openOtpModal}
                        className="w-full py-3 bg-primary text-black font-bold rounded-xl animate-pulse hover:animate-none relative overflow-hidden"
                      >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          <Icon name="message" size={18} />
                          View OTP Details
                        </span>
                      </button>
                      <p className="text-yellow-400 text-xs text-center mt-2 flex items-center justify-center gap-1">
                        <Icon name="alert" size={14} />
                        Tap now! Code expires soon
                      </p>
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
                </div>
              </div>
            </div>

            {/* Purchase Card - Desktop Only */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="bg-charcoal border border-border-dark rounded-2xl p-6 sticky top-4">
                <h3 className="text-lg font-bold text-white mb-6">Your Selection</h3>

                {/* Service */}
                <div className="mb-4">
                  <p className="text-slate-500 text-sm mb-1">Service</p>
                  {selectedOtpService ? (
                    <div className="flex items-center gap-2">
                      <ServiceLogo name={selectedOtpService.name} size={24} />
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
                      <div className="flex items-center justify-between">
                        <p className="text-white font-mono text-lg">{otpSuccessData.phoneNumber}</p>
                        <button
                          onClick={handleCopyNumber}
                          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                          title="Copy number"
                        >
                          <Icon name={numberCopied ? 'check' : 'copy'} size={18} className={numberCopied ? 'text-green-400' : 'text-slate-400'} />
                        </button>
                      </div>
                      {numberCopied && <p className="text-green-400 text-xs mt-1">Copied!</p>}
                    </div>
                    <button
                      onClick={openOtpModal}
                      className="w-full py-3 bg-primary text-black font-bold rounded-xl animate-pulse hover:animate-none relative overflow-hidden"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <Icon name="message" size={18} />
                        View OTP Details
                      </span>
                    </button>
                    <p className="text-yellow-400 text-xs text-center mt-2 flex items-center justify-center gap-1">
                      <Icon name="alert" size={14} />
                      Tap now! Code expires soon
                    </p>
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
              </div>
            </div>
          </div>

          {/* Auth Dialog - Outside grid for both mobile and desktop */}
          <AuthDialog
            isOpen={showOtpAuthDialog}
            onClose={() => setShowOtpAuthDialog(false)}
            onSuccess={() => {
              setShowOtpAuthDialog(false)
              setPendingOtpPurchase(true)
              fetchOtpWalletBalance()
            }}
          />

          {/* Deposit Modal - Outside grid for both mobile and desktop */}
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

          {/* OTP Details Modal */}
          {showOtpModal && otpSuccessData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop - clicking does NOT close modal */}
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

              {/* Modal */}
              <div className="relative bg-charcoal border border-border-dark rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                {/* Close button */}
                <button
                  onClick={closeOtpModal}
                  className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors z-10"
                >
                  <Icon name="x" size={20} className="text-slate-400" />
                </button>

                <div className="p-6">
                  {/* Header */}
                  <div className="text-center mb-6">
                    {otpModalStatus === 'received' ? (
                      <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                        <Icon name="check" size={32} className="text-green-400" />
                      </div>
                    ) : otpModalStatus === 'cancelled' ? (
                      <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
                        <Icon name="close" size={32} className="text-yellow-400" />
                      </div>
                    ) : otpModalStatus === 'expired' ? (
                      <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                        <Icon name="alert" size={32} className="text-red-400" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                        <Icon name="message" size={32} className="text-primary animate-pulse" />
                      </div>
                    )}

                    <h2 className="text-xl font-bold text-white">
                      {otpModalStatus === 'received'
                        ? 'Code Received!'
                        : otpModalStatus === 'cancelled'
                        ? 'Number Cancelled'
                        : otpModalStatus === 'expired'
                        ? 'Time Expired'
                        : 'Waiting for SMS...'}
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                      {otpModalStatus === 'received'
                        ? 'Your verification code has arrived'
                        : otpModalStatus === 'cancelled'
                        ? 'Your purchase has been refunded'
                        : otpModalStatus === 'expired'
                        ? 'You can now request a refund'
                        : 'Use this number for verification'}
                    </p>
                  </div>

                  {/* Phone Number */}
                  <div className="bg-surface-dark rounded-xl p-4 mb-4">
                    <p className="text-slate-500 text-xs mb-1">Your Number</p>
                    <div className="flex items-center justify-between">
                      <p className="text-white font-mono text-lg">{otpSuccessData.phoneNumber}</p>
                      <button
                        onClick={handleCopyNumber}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm"
                      >
                        <Icon name={numberCopied ? 'check' : 'copy'} size={14} className={numberCopied ? 'text-green-400' : 'text-slate-400'} />
                        <span className={numberCopied ? 'text-green-400' : 'text-slate-400'}>{numberCopied ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Timer - Only show when pending */}
                  {otpModalStatus === 'pending' && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-sm">Time remaining</span>
                        <span className={`font-mono font-bold ${otpModalTimeLeft < 60 ? 'text-red-400' : otpModalTimeLeft < 300 ? 'text-yellow-400' : 'text-white'}`}>
                          {formatTime(otpModalTimeLeft)}
                        </span>
                      </div>
                      <div className="h-2 bg-surface-dark rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-1000 ${otpModalTimeLeft < 60 ? 'bg-red-500' : otpModalTimeLeft < 300 ? 'bg-yellow-500' : 'bg-primary'}`}
                          style={{ width: `${(otpModalTimeLeft / (20 * 60)) * 100}%` }}
                        />
                      </div>
                      <p className="text-slate-500 text-xs mt-2 text-center">
                        Checking for SMS every 3 seconds...
                      </p>
                    </div>
                  )}

                  {/* Code Display - Only show when received */}
                  {otpModalStatus === 'received' && otpModalCode && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 mb-4 text-center">
                      <p className="text-green-400 text-xs font-medium mb-2">VERIFICATION CODE</p>
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-4xl font-mono font-extrabold text-white tracking-widest">
                          {otpModalCode}
                        </span>
                        <button
                          onClick={handleCopyCode}
                          className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 transition-colors"
                        >
                          <Icon name={codeCopied ? 'check' : 'copy'} size={20} className="text-green-400" />
                        </button>
                      </div>
                      {codeCopied && <p className="text-green-400 text-xs mt-2">Copied to clipboard!</p>}

                      {/* Code Expiry Timer */}
                      <div className={`mt-4 pt-3 border-t border-green-500/20 ${otpCodeExpiryTime <= 60 ? 'animate-pulse' : ''}`}>
                        <p className={`text-xs font-medium ${otpCodeExpiryTime <= 60 ? 'text-red-400' : 'text-slate-400'}`}>
                          {otpCodeExpiryTime > 0 ? (
                            <>
                              <Icon name="clock" size={12} className="inline mr-1" />
                              Code expires in {Math.floor(otpCodeExpiryTime / 60)}:{(otpCodeExpiryTime % 60).toString().padStart(2, '0')}
                            </>
                          ) : (
                            <>
                              <Icon name="close" size={12} className="inline mr-1" />
                              Code may have expired - use quickly!
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Full SMS - Only show when received */}
                  {otpModalStatus === 'received' && otpModalFullSms && (
                    <div className="bg-surface-dark rounded-xl p-3 mb-4">
                      <p className="text-slate-500 text-xs mb-1">Full Message</p>
                      <p className="text-white text-sm">{otpModalFullSms}</p>
                    </div>
                  )}

                  {/* Error */}
                  {otpModalError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                      <p className="text-red-400 text-sm">{otpModalError}</p>
                    </div>
                  )}

                  {/* Cancelled/Expired Message */}
                  {otpModalStatus === 'cancelled' && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4 text-center">
                      <p className="text-yellow-400 font-medium">Your wallet balance has been refunded</p>
                    </div>
                  )}

                  {otpModalStatus === 'expired' && !otpModalCode && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4 text-center">
                      <p className="text-red-400 font-medium">No code received within the time limit</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-3">
                    {/* Cancel Button - Only enabled when expired and no code */}
                    {otpModalStatus === 'pending' && (
                      <button
                        onClick={handleOtpModalCancel}
                        disabled={otpModalTimeLeft > 0 || otpModalCancelling}
                        className="w-full py-3 rounded-xl border border-border-dark text-slate-400 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-red-500/50 hover:text-red-400 disabled:hover:border-border-dark disabled:hover:text-slate-400"
                      >
                        {otpModalCancelling ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400"></div>
                            Cancelling...
                          </span>
                        ) : otpModalTimeLeft > 0 ? (
                          <span className="flex items-center justify-center gap-2">
                            <Icon name="clock" size={16} />
                            Cancel available after timer
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <Icon name="close" size={16} />
                            Cancel & Get Refund
                          </span>
                        )}
                      </button>
                    )}

                    {/* Cancel Button for expired state */}
                    {otpModalStatus === 'expired' && !otpModalCode && (
                      <button
                        onClick={handleOtpModalCancel}
                        disabled={otpModalCancelling}
                        className="w-full py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-medium hover:bg-red-500/30 transition-all disabled:opacity-50"
                      >
                        {otpModalCancelling ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                            Cancelling...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <Icon name="close" size={16} />
                            Cancel & Get Refund
                          </span>
                        )}
                      </button>
                    )}

                    {/* Get Another Number - show when received or cancelled */}
                    {(otpModalStatus === 'received' || otpModalStatus === 'cancelled') && (
                      <button
                        onClick={closeOtpModal}
                        className="w-full py-3 rounded-xl bg-primary text-black font-bold hover:brightness-105 transition-all flex items-center justify-center gap-2"
                      >
                        <Icon name="add" size={18} />
                        Get Another Number
                      </button>
                    )}

                    {/* View History */}
                    {otpModalStatus === 'received' && (
                      <button
                        onClick={() => router.push('/profile/library')}
                        className="w-full py-3 rounded-xl border border-border-dark text-slate-400 font-medium hover:border-primary/50 hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <Icon name="clock" size={16} />
                        View History
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
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

    // Block wallet payment if provider is unavailable
    if (providerAvailable === false) {
      setCheckoutError('Virtual number service is currently unavailable. Please try again later or use the cart to pay when service is restored.')
      return
    }

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
