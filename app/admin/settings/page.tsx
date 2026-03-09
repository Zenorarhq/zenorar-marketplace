'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { profileApi } from '@/lib/api/profile'
import { settingsApi } from '@/lib/api/settings'
import { mediaApi } from '@/lib/api/media'
import { apiFetch } from '@/lib/api/client'
import { usersApi } from '@/lib/api/users'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import EmailConfigSection from '@/components/admin/EmailConfigSection'
import ProtectionLevelsSection from '@/components/admin/ProtectionLevelsSection'
import PinSetupForm from '@/components/admin/PinSetupForm'
import VirtualNumberPricingSection from '@/components/admin/VirtualNumberPricingSection'

type SettingsTab = 'profile' | 'general' | 'security' | 'notifications' | 'payments' | 'referral' | 'api' | 'virtual-numbers' | 'email' | 'marketing' | 'seo' | 'activity'

const tabs: { id: SettingsTab; label: string; icon: string }[] = [
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'general', label: 'General', icon: 'settings' },
  { id: 'security', label: 'Security', icon: 'shield' },
  { id: 'notifications', label: 'Notifications', icon: 'bell' },
  { id: 'payments', label: 'Payments', icon: 'credit-card' },
  { id: 'referral', label: 'Referral Program', icon: 'gift' },
  { id: 'api', label: 'API Keys', icon: 'key' },
  { id: 'virtual-numbers', label: 'Virtual Numbers', icon: 'phone' },
  { id: 'email', label: 'Email Service', icon: 'mail' },
  { id: 'marketing', label: 'Marketing', icon: 'campaign' },
  { id: 'seo', label: 'SEO', icon: 'search' },
  { id: 'activity', label: 'Activity Log', icon: 'history' },
]

export default function AdminSettingsPage() {
  const { user, updateUser, refreshUser } = useAuth()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Track initial settings values to detect unsaved changes
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const initialSettingsRef = useRef<{
    general?: any
    security?: any
    notification?: any
    payment?: any
    api?: any
    esim?: any
    voiceEsim?: any
    virtualNumber?: any
    giftCard?: any
    otp?: any
    cron?: any
    referral?: any
    marketing?: any
    seo?: any
    profile?: any
    exchangeRate?: any
  }>({})

  // Auto-clear message after 4 seconds
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(null), 4000)
    return () => clearTimeout(timer)
  }, [message])

  // Admin PIN state
  const [pinStatus, setPinStatus] = useState<{ hasPin: boolean; setAt: string | null } | null>(null)
  const [showPinSetup, setShowPinSetup] = useState(false)
  const [showPinEnforce, setShowPinEnforce] = useState(false)
  const [resetingPin, setResetingPin] = useState(false)

  // Activity Log state
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [activityPagination, setActivityPagination] = useState<{ page: number; pages: number; total: number }>({ page: 1, pages: 1, total: 0 })
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityFilter, setActivityFilter] = useState('')

  // Fetch PIN status on mount
  useEffect(() => {
    apiFetch<{ hasPin: boolean; setAt: string | null }>('/admin/pin/status').then((res) => {
      if (res.success && res.data) {
        setPinStatus(res.data)
        if (!res.data.hasPin) setShowPinEnforce(true)
      }
    })
  }, [])

  // Fetch activity logs when tab is active
  useEffect(() => {
    if (activeTab !== 'activity') return
    loadActivityLogs(1)
  }, [activeTab, activityFilter])

  const loadActivityLogs = async (page: number) => {
    setActivityLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '50' })
    if (activityFilter) params.set('action', activityFilter)
    const res = await apiFetch<any[]>(`/admin/activity-logs?${params}`)
    if (res.success) {
      setActivityLogs(res.data || [])
      if (res.pagination) setActivityPagination({ page: res.pagination.page, pages: res.pagination.totalPages, total: res.pagination.total })
    }
    setActivityLoading(false)
  }

  const handlePinResetRequest = async () => {
    setResetingPin(true)
    const res = await apiFetch('/admin/pin/request-reset', { method: 'POST' })
    if (res.success) {
      setMessage({ type: 'success', text: 'PIN reset link sent to your email' })
    } else {
      setMessage({ type: 'error', text: res.message || res.error || 'Failed to send reset email' })
    }
    setResetingPin(false)
  }

  const tabsRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)

  // Profile Settings State
  const [profileSettings, setProfileSettings] = useState({
    name: user?.name || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Sync profile settings with user data
  useEffect(() => {
    if (user) {
      setProfileSettings((prev) => ({
        ...prev,
        name: user.name,
      }))
    }
  }, [user])

  const handleTabClick = (tabId: SettingsTab, index: number) => {
    setActiveTab(tabId)
    setMessage(null)
    // Scroll the clicked tab into view within the container
    if (tabsRef.current) {
      const container = tabsRef.current
      const tabElements = container.children
      if (tabElements[index]) {
        const tab = tabElements[index] as HTMLElement
        const scrollLeft = tab.offsetLeft - container.offsetWidth / 2 + tab.offsetWidth / 2
        container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' })
      }
    }
  }

  // General Settings State
  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'Zenorar Marketplace',
    siteDescription: 'Premium digital marketplace for scripts, plugins, and eSIMs',
    supportEmail: 'support@zenorar.com',
    timezone: 'auto',
    currency: 'USD',
    maintenanceMode: false,
    logoUrl: '',
    logoMediaId: '',
    faviconUrl: '',
    faviconMediaId: '',
    promoBannerCode: '',
  })
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: true,
    sessionTimeout: '30',
    ipWhitelist: '',
    loginAttempts: '5',
    passwordExpiry: '90',
  })

  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState({
    emailNewOrder: true,
    emailNewUser: true,
    emailLowStock: false,
    emailTicket: true,
    pushEnabled: true,
    slackWebhook: '',
  })

  // Send Notification State
  const [sendNotif, setSendNotif] = useState({ type: 'SYSTEM' as 'SYSTEM' | 'PROMOTIONAL', title: '', message: '' })
  const [sendingNotif, setSendingNotif] = useState(false)
  const [sendMode, setSendMode] = useState<'all' | 'targeted'>('all')
  const [targetUserSearch, setTargetUserSearch] = useState('')
  const [targetUsers, setTargetUsers] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [targetSearchResults, setTargetSearchResults] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [searchingUsers, setSearchingUsers] = useState(false)

  // Sent Notifications State
  const [sentNotifications, setSentNotifications] = useState<any[]>([])
  const [loadingSent, setLoadingSent] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null)
  const [recipients, setRecipients] = useState<any[]>([])
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false)
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set())
  const [deletingBulk, setDeletingBulk] = useState(false)

  // Payment Settings State
  const [paymentSettings, setPaymentSettings] = useState({
    // Web3 Wallet
    walletEnabled: true,

    // Stripe
    stripeEnabled: false,
    stripeMode: 'test' as 'test' | 'live',
    stripeTestPublicKey: '',
    stripeTestSecretKey: '',
    stripeTestWebhookSecret: '',
    stripeLivePublicKey: '',
    stripeLiveSecretKey: '',
    stripeLiveWebhookSecret: '',

    // Paystack
    paystackEnabled: false,
    paystackMode: 'test' as 'test' | 'live',
    paystackTestPublicKey: '',
    paystackTestSecretKey: '',
    paystackTestWebhookSecret: '',
    paystackLivePublicKey: '',
    paystackLiveSecretKey: '',
    paystackLiveWebhookSecret: '',

    // Enhanced Crypto
    cryptoEnabled: false,
    cryptoMethod: 'manual' as 'manual' | 'processor',
    receivingWalletAddress: '',
    btcAddress: '',
    ethAddress: '',
    usdtEthAddress: '',
    usdtBscAddress: '',
    usdtTronAddress: '',
    bnbAddress: '',
    usdcAddress: '',
    solAddress: '',
    cryptoProcessor: 'coinbase',
    cryptoApiKey: '',
    cryptoWebhookSecret: '',

    // PayPal
    paypalEnabled: false,
    paypalMode: 'test' as 'test' | 'live',
    paypalPlatform: 'express' as 'express' | 'commerce',
    paypalTestClientId: '',
    paypalTestSecretKey: '',
    paypalLiveClientId: '',
    paypalLiveSecretKey: '',

    // General
    autoWithdraw: false,
    withdrawThreshold: '100',

    // Wallet Deposits
    walletDepositsEnabled: true,
    depositMinAmount: '5',
    depositMaxAmount: '10000',
    depositCardEnabled: true,
    depositPaystackEnabled: true,
    depositPaypalEnabled: true,
    depositCryptoEnabled: true,
    depositBankEnabled: true,
    // Bank Transfer Account Details
    bankAccountName: '',
    bankAccountNumber: '',
    bankBankName: '',
    bankRoutingNumber: '',
    bankInstructions: '',
  })
  const [showStripeSecrets, setShowStripeSecrets] = useState<Record<string, boolean>>({})
  const [showPaystackSecrets, setShowPaystackSecrets] = useState<Record<string, boolean>>({})

  // API Settings State
  const [apiSettings, setApiSettings] = useState({
    apiEnabled: true,
    rateLimit: '1000',
    webhookUrl: '',
  })

  // Cron Jobs Settings State
  const [cronSettings, setCronSettings] = useState({
    cronEnabled: true,
    cronSecret: '',
  })
  const [showCronSecret, setShowCronSecret] = useState(false)

  // Section collapse states (all expanded by default)
  const [expandedSections, setExpandedSections] = useState({
    apiAccess: false,
    cronJobs: false,
    exchangeRates: false,
    esimProviders: false,
    voiceEsimProviders: false,
    virtualNumbers: false,
    giftCardProviders: false,
    otpProviders: false,
    cloudflareR2: false,
    apiKeys: false,
    legalPages: false,
    scriptProtection: false,
    emailNotifications: false,
    sendNotification: false,
    stripe: false,
    paystack: false,
    crypto: false,
    paypal: false,
    walletDeposits: false,
    bankTransfer: false,
    trackingAnalytics: false,
    socialSharing: false,
    codeInjection: false,
    globalMetaTags: false,
    searchVerification: false,
    openGraph: false,
    structuredData: false,
    robotsTxt: false,
  })
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [newKeyName, setNewKeyName] = useState('')
  const [generatingKey, setGeneratingKey] = useState(false)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  // R2 Storage Settings State
  const [r2Settings, setR2Settings] = useState({
    accountId: '',
    accessKeyId: '',
    secretAccessKey: '',
    bucketName: 'zenorar-scripts',
    isConfigured: false,
  })
  const [r2SecretPlaceholder, setR2SecretPlaceholder] = useState('')
  const [showR2Secret, setShowR2Secret] = useState(false)
  const [r2TestResult, setR2TestResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [testingR2, setTestingR2] = useState(false)
  const [savingR2, setSavingR2] = useState(false)

  // Data eSIM Provider Settings State (travel data only)
  const [esimSettings, setEsimSettings] = useState({
    esimDefaultProvider: 'esimgo' as 'esimgo' | 'airalo' | 'mobimatter',
    // eSIM Go
    esimGoEnabled: false,
    esimGoApiKey: '',
    // Airalo
    airaloEnabled: false,
    airaloMode: 'sandbox' as 'sandbox' | 'production',
    airaloSandboxClientId: '',
    airaloSandboxClientSecret: '',
    airaloProductionClientId: '',
    airaloProductionClientSecret: '',
    // MobiMatter
    mobimatterEnabled: false,
    mobimatterMerchantId: '',
    mobimatterApiKey: '',
  })

  // Voice eSIM Provider Settings State (with phone number, calls, SMS)
  const [voiceEsimSettings, setVoiceEsimSettings] = useState({
    voiceEsimDefaultProvider: 'telnyx' as 'telnyx' | 'alosim' | 'twise',
    // Telnyx
    telnyxEnabled: false,
    telnyxApiKey: '',
    // aloSIM
    alosimEnabled: false,
    alosimApiKey: '',
    // Twise
    twiseEnabled: false,
    twiseApiKey: '',
  })

  // Virtual Numbers Settings State
  const [virtualNumberSettings, setVirtualNumberSettings] = useState({
    virtualNumbersEnabled: false,
    virtualNumbersProvider: 'twilio' as 'twilio' | 'plivo' | 'vonage',
    // Twilio
    twilioEnabled: false,
    twilioMode: 'test' as 'test' | 'live',
    twilioTestAccountSid: '',
    twilioTestAuthToken: '',
    twilioTestPhoneNumber: '',
    twilioLiveAccountSid: '',
    twilioLiveAuthToken: '',
    twilioLivePhoneNumber: '',
    // Plivo
    plivoEnabled: false,
    plivoAuthId: '',
    plivoAuthToken: '',
    // Vonage
    vonageEnabled: false,
    vonageApiKey: '',
    vonageApiSecret: '',
  })

  // Gift Card Providers Settings State
  const [giftCardSettings, setGiftCardSettings] = useState({
    giftCardDefaultProvider: 'reloadly' as 'reloadly' | 'ezgiftcard' | 'bitrefill' | 'tango' | 'ezpin',
    // Reloadly
    reloadlyEnabled: false,
    reloadlyMode: 'sandbox' as 'sandbox' | 'production',
    reloadlySandboxClientId: '',
    reloadlySandboxClientSecret: '',
    reloadlyProductionClientId: '',
    reloadlyProductionClientSecret: '',
    // EZGiftCard (RapidAPI)
    ezgiftcardEnabled: false,
    ezgiftcardApiKey: '',
    // Bitrefill
    bitrefillEnabled: false,
    bitrefillApiKey: '',
    bitrefillApiSecret: '',
    // Tango Card (RaaS)
    tangoEnabled: false,
    tangoMode: 'sandbox' as 'sandbox' | 'production',
    tangoSandboxPlatformName: '',
    tangoSandboxPlatformKey: '',
    tangoProductionPlatformName: '',
    tangoProductionPlatformKey: '',
    // EZ Pin
    ezpinEnabled: false,
    ezpinMode: 'sandbox' as 'sandbox' | 'production',
    ezpinSandboxApiKey: '',
    ezpinSandboxApiSecret: '',
    ezpinProductionApiKey: '',
    ezpinProductionApiSecret: '',
  })

  // OTP Providers Settings State
  const [otpSettings, setOtpSettings] = useState({
    otpDefaultProvider: 'smspool' as 'smspool' | '5sim',
    // SMSPool
    smspoolEnabled: false,
    smspoolApiKey: '',
    // 5sim
    fivesimEnabled: false,
    fivesimApiKey: '',
  })

  // Show/hide secrets for services
  const [showServiceSecrets, setShowServiceSecrets] = useState<Record<string, boolean>>({})

  // Exchange Rate API Keys State
  const [exchangeRateKeys, setExchangeRateKeys] = useState({
    exchangerate_api_key: '',
    coingecko_api_key: '',
  })

  // Referral Program Settings State
  const [referralSettings, setReferralSettings] = useState({
    referralProgramEnabled: true,
    referrerRewardAmount: '10.00',
    refereeRewardAmount: '10.00',
    minFirstPurchase: '0.00',
  })

  // Marketing Settings State
  const [marketingSettings, setMarketingSettings] = useState({
    facebookPixelId: '',
    ga4MeasurementId: '',
    defaultOgImage: '',
    customHeadCode: '',
    customBodyCode: '',
  })

  // SEO Settings State
  const [seoSettings, setSeoSettings] = useState({
    globalMetaTitleTemplate: '{{title}} | Zenorar',
    globalMetaDescription: '',
    canonicalUrlPrefix: '',
    googleSiteVerification: '',
    defaultOgTitle: '',
    defaultOgDescription: '',
    defaultOgType: 'website',
    twitterCardType: 'summary_large_image',
    structuredDataOrgName: '',
    structuredDataOrgLogo: '',
    structuredDataOrgUrl: '',
    structuredDataSocialProfiles: '',
    robotsTxtContent: '',
  })

  // Audit log state
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [showAuditLog, setShowAuditLog] = useState(false)

  // Export/Import state
  const [importing, setImporting] = useState(false)

  // Payment test state
  const [testingPayment, setTestingPayment] = useState<string | null>(null)
  const [paymentTestResult, setPaymentTestResult] = useState<{ provider: string; success: boolean; message: string } | null>(null)

  // Load general settings from API on mount
  useEffect(() => {
    settingsApi.getSettingsByGroup('general').then((res) => {
      if (res.success && res.data) {
        const d = res.data
        setGeneralSettings((prev) => ({
          ...prev,
          siteName: d.siteName ?? prev.siteName,
          siteDescription: d.siteDescription ?? prev.siteDescription,
          supportEmail: d.supportEmail ?? prev.supportEmail,
          timezone: d.timezone ?? prev.timezone,
          currency: d.currency ?? prev.currency,
          maintenanceMode: d.maintenanceMode ?? prev.maintenanceMode,
          logoUrl: d.logoUrl ?? prev.logoUrl,
          logoMediaId: d.logoMediaId ?? prev.logoMediaId,
          faviconUrl: d.faviconUrl ?? prev.faviconUrl,
          faviconMediaId: d.faviconMediaId ?? prev.faviconMediaId,
          promoBannerCode: d.promoBannerCode ?? prev.promoBannerCode,
        }))
      }
    })
  }, [])

  // Load security settings from API on mount
  useEffect(() => {
    settingsApi.getSettingsByGroup('security').then((res) => {
      if (res.success && res.data) {
        const d = res.data
        setSecuritySettings((prev) => ({
          ...prev,
          twoFactorAuth: d.twoFactorAuth ?? prev.twoFactorAuth,
          sessionTimeout: d.sessionTimeout ?? prev.sessionTimeout,
          loginAttempts: d.loginAttempts ?? prev.loginAttempts,
          passwordExpiry: d.passwordExpiry ?? prev.passwordExpiry,
          ipWhitelist: d.ipWhitelist ?? prev.ipWhitelist,
        }))
      }
    })
  }, [])

  // Load notification settings from API on mount
  useEffect(() => {
    settingsApi.getSettingsByGroup('notifications').then((res) => {
      if (res.success && res.data) {
        const d = res.data
        setNotificationSettings((prev) => ({
          ...prev,
          emailNewOrder: d.emailNewOrder ?? prev.emailNewOrder,
          emailNewUser: d.emailNewUser ?? prev.emailNewUser,
          emailLowStock: d.emailLowStock ?? prev.emailLowStock,
          emailTicket: d.emailTicket ?? prev.emailTicket,
          pushEnabled: d.pushEnabled ?? prev.pushEnabled,
          slackWebhook: d.slackWebhook ?? prev.slackWebhook,
        }))
      }
    })
    // Load sent notifications
    fetchSentNotifications()
    // Load payment settings
    settingsApi.getSettingsByGroup('payments').then((res) => {
      if (res.success && res.data) {
        const d = res.data
        setPaymentSettings((prev) => ({
          ...prev,
          // Web3 Wallet
          walletEnabled: d.walletEnabled ?? prev.walletEnabled,
          // Stripe
          stripeEnabled: d.stripeEnabled ?? prev.stripeEnabled,
          stripeMode: d.stripeMode ?? prev.stripeMode,
          stripeTestPublicKey: d.stripeTestPublicKey ?? prev.stripeTestPublicKey,
          stripeTestSecretKey: d.stripeTestSecretKey ?? prev.stripeTestSecretKey,
          stripeTestWebhookSecret: d.stripeTestWebhookSecret ?? prev.stripeTestWebhookSecret,
          stripeLivePublicKey: d.stripeLivePublicKey ?? prev.stripeLivePublicKey,
          stripeLiveSecretKey: d.stripeLiveSecretKey ?? prev.stripeLiveSecretKey,
          stripeLiveWebhookSecret: d.stripeLiveWebhookSecret ?? prev.stripeLiveWebhookSecret,
          // Paystack
          paystackEnabled: d.paystackEnabled ?? prev.paystackEnabled,
          paystackMode: d.paystackMode ?? prev.paystackMode,
          paystackTestPublicKey: d.paystackTestPublicKey ?? prev.paystackTestPublicKey,
          paystackTestSecretKey: d.paystackTestSecretKey ?? prev.paystackTestSecretKey,
          paystackTestWebhookSecret: d.paystackTestWebhookSecret ?? prev.paystackTestWebhookSecret,
          paystackLivePublicKey: d.paystackLivePublicKey ?? prev.paystackLivePublicKey,
          paystackLiveSecretKey: d.paystackLiveSecretKey ?? prev.paystackLiveSecretKey,
          paystackLiveWebhookSecret: d.paystackLiveWebhookSecret ?? prev.paystackLiveWebhookSecret,
          // Enhanced Crypto
          cryptoEnabled: d.cryptoEnabled ?? prev.cryptoEnabled,
          cryptoMethod: d.cryptoMethod ?? prev.cryptoMethod,
          receivingWalletAddress: d.receivingWalletAddress ?? prev.receivingWalletAddress,
          btcAddress: d.btcAddress ?? prev.btcAddress,
          ethAddress: d.ethAddress ?? prev.ethAddress,
          usdtEthAddress: d.usdtEthAddress ?? prev.usdtEthAddress,
          usdtBscAddress: d.usdtBscAddress ?? prev.usdtBscAddress,
          usdtTronAddress: d.usdtTronAddress ?? prev.usdtTronAddress,
          bnbAddress: d.bnbAddress ?? prev.bnbAddress,
          usdcAddress: d.usdcAddress ?? prev.usdcAddress,
          solAddress: d.solAddress ?? prev.solAddress,
          cryptoProcessor: d.cryptoProcessor ?? prev.cryptoProcessor,
          cryptoApiKey: d.cryptoApiKey ?? prev.cryptoApiKey,
          cryptoWebhookSecret: d.cryptoWebhookSecret ?? prev.cryptoWebhookSecret,
          // PayPal
          paypalEnabled: d.paypalEnabled ?? prev.paypalEnabled,
          paypalMode: d.paypalMode ?? prev.paypalMode,
          paypalPlatform: d.paypalPlatform ?? prev.paypalPlatform,
          paypalTestClientId: d.paypalTestClientId ?? prev.paypalTestClientId,
          paypalTestSecretKey: d.paypalTestSecretKey ?? prev.paypalTestSecretKey,
          paypalLiveClientId: d.paypalLiveClientId ?? prev.paypalLiveClientId,
          paypalLiveSecretKey: d.paypalLiveSecretKey ?? prev.paypalLiveSecretKey,
          // General
          autoWithdraw: d.autoWithdraw ?? prev.autoWithdraw,
          withdrawThreshold: d.withdrawThreshold ?? prev.withdrawThreshold,
          // Wallet Deposits
          walletDepositsEnabled: d.walletDepositsEnabled ?? prev.walletDepositsEnabled,
          depositMinAmount: d.depositMinAmount ?? prev.depositMinAmount,
          depositMaxAmount: d.depositMaxAmount ?? prev.depositMaxAmount,
          depositCardEnabled: d.depositCardEnabled ?? prev.depositCardEnabled,
          depositPaystackEnabled: d.depositPaystackEnabled ?? prev.depositPaystackEnabled,
          depositPaypalEnabled: d.depositPaypalEnabled ?? prev.depositPaypalEnabled,
          depositCryptoEnabled: d.depositCryptoEnabled ?? prev.depositCryptoEnabled,
          depositBankEnabled: d.depositBankEnabled ?? prev.depositBankEnabled,
          // Bank Transfer Account Details
          bankAccountName: d.bankAccountName ?? prev.bankAccountName,
          bankAccountNumber: d.bankAccountNumber ?? prev.bankAccountNumber,
          bankBankName: d.bankBankName ?? prev.bankBankName,
          bankRoutingNumber: d.bankRoutingNumber ?? prev.bankRoutingNumber,
          bankInstructions: d.bankInstructions ?? prev.bankInstructions,
        }))
      }
    })
    // Load API settings (Exchange Rates, eSIM, Virtual Numbers)
    settingsApi.getSettingsByGroup('api').then((res) => {
      if (res.success && res.data) {
        const d = res.data
        setExchangeRateKeys((prev) => ({
          exchangerate_api_key: d.exchangerate_api_key ?? prev.exchangerate_api_key,
          coingecko_api_key: d.coingecko_api_key ?? prev.coingecko_api_key,
        }))
        setApiSettings((prev) => ({
          ...prev,
          apiEnabled: d.apiEnabled ?? prev.apiEnabled,
          rateLimit: d.rateLimit ?? prev.rateLimit,
          webhookUrl: d.webhookUrl ?? prev.webhookUrl,
        }))
        // Data eSIM Provider settings
        setEsimSettings((prev) => ({
          esimDefaultProvider: d.esimDefaultProvider ?? prev.esimDefaultProvider,
          esimGoEnabled: d.esimGoEnabled ?? prev.esimGoEnabled,
          esimGoApiKey: d.esimGoApiKey ?? prev.esimGoApiKey,
          airaloEnabled: d.airaloEnabled ?? prev.airaloEnabled,
          airaloMode: d.airaloMode ?? prev.airaloMode,
          airaloSandboxClientId: d.airaloSandboxClientId ?? prev.airaloSandboxClientId,
          airaloSandboxClientSecret: d.airaloSandboxClientSecret ?? prev.airaloSandboxClientSecret,
          airaloProductionClientId: d.airaloProductionClientId ?? prev.airaloProductionClientId,
          airaloProductionClientSecret: d.airaloProductionClientSecret ?? prev.airaloProductionClientSecret,
          mobimatterEnabled: d.mobimatterEnabled ?? prev.mobimatterEnabled,
          mobimatterMerchantId: d.mobimatterMerchantId ?? prev.mobimatterMerchantId,
          mobimatterApiKey: d.mobimatterApiKey ?? prev.mobimatterApiKey,
        }))
        // Voice eSIM Provider settings
        setVoiceEsimSettings((prev) => ({
          voiceEsimDefaultProvider: d.voiceEsimDefaultProvider ?? prev.voiceEsimDefaultProvider,
          telnyxEnabled: d.telnyxEnabled ?? prev.telnyxEnabled,
          telnyxApiKey: d.telnyxApiKey ?? prev.telnyxApiKey,
          alosimEnabled: d.alosimEnabled ?? prev.alosimEnabled,
          alosimApiKey: d.alosimApiKey ?? prev.alosimApiKey,
          twiseEnabled: d.twiseEnabled ?? prev.twiseEnabled,
          twiseApiKey: d.twiseApiKey ?? prev.twiseApiKey,
        }))
        // Virtual Numbers settings
        setVirtualNumberSettings((prev) => ({
          virtualNumbersEnabled: d.virtualNumbersEnabled ?? prev.virtualNumbersEnabled,
          virtualNumbersProvider: d.virtualNumbersProvider ?? prev.virtualNumbersProvider,
          // Twilio
          twilioEnabled: d.twilioEnabled ?? prev.twilioEnabled,
          twilioMode: d.twilioMode ?? prev.twilioMode,
          twilioTestAccountSid: d.twilioTestAccountSid ?? prev.twilioTestAccountSid,
          twilioTestAuthToken: d.twilioTestAuthToken ?? prev.twilioTestAuthToken,
          twilioTestPhoneNumber: d.twilioTestPhoneNumber ?? prev.twilioTestPhoneNumber,
          twilioLiveAccountSid: d.twilioLiveAccountSid ?? prev.twilioLiveAccountSid,
          twilioLiveAuthToken: d.twilioLiveAuthToken ?? prev.twilioLiveAuthToken,
          twilioLivePhoneNumber: d.twilioLivePhoneNumber ?? prev.twilioLivePhoneNumber,
          // Plivo
          plivoEnabled: d.plivoEnabled ?? prev.plivoEnabled,
          plivoAuthId: d.plivoAuthId ?? prev.plivoAuthId,
          plivoAuthToken: d.plivoAuthToken ?? prev.plivoAuthToken,
          // Vonage
          vonageEnabled: d.vonageEnabled ?? prev.vonageEnabled,
          vonageApiKey: d.vonageApiKey ?? prev.vonageApiKey,
          vonageApiSecret: d.vonageApiSecret ?? prev.vonageApiSecret,
        }))
        // Gift Card Providers settings
        setGiftCardSettings((prev) => ({
          giftCardDefaultProvider: d.giftCardDefaultProvider ?? prev.giftCardDefaultProvider,
          // Reloadly
          reloadlyEnabled: d.reloadlyEnabled ?? prev.reloadlyEnabled,
          reloadlyMode: d.reloadlyMode ?? prev.reloadlyMode,
          reloadlySandboxClientId: d.reloadlySandboxClientId ?? prev.reloadlySandboxClientId,
          reloadlySandboxClientSecret: d.reloadlySandboxClientSecret ?? prev.reloadlySandboxClientSecret,
          reloadlyProductionClientId: d.reloadlyProductionClientId ?? prev.reloadlyProductionClientId,
          reloadlyProductionClientSecret: d.reloadlyProductionClientSecret ?? prev.reloadlyProductionClientSecret,
          // EZGiftCard
          ezgiftcardEnabled: d.ezgiftcardEnabled ?? prev.ezgiftcardEnabled,
          ezgiftcardApiKey: d.ezgiftcardApiKey ?? prev.ezgiftcardApiKey,
          // Bitrefill
          bitrefillEnabled: d.bitrefillEnabled ?? prev.bitrefillEnabled,
          bitrefillApiKey: d.bitrefillApiKey ?? prev.bitrefillApiKey,
          bitrefillApiSecret: d.bitrefillApiSecret ?? prev.bitrefillApiSecret,
          // Tango Card
          tangoEnabled: d.tangoEnabled ?? prev.tangoEnabled,
          tangoMode: d.tangoMode ?? prev.tangoMode,
          tangoSandboxPlatformName: d.tangoSandboxPlatformName ?? prev.tangoSandboxPlatformName,
          tangoSandboxPlatformKey: d.tangoSandboxPlatformKey ?? prev.tangoSandboxPlatformKey,
          tangoProductionPlatformName: d.tangoProductionPlatformName ?? prev.tangoProductionPlatformName,
          tangoProductionPlatformKey: d.tangoProductionPlatformKey ?? prev.tangoProductionPlatformKey,
          // EZ Pin
          ezpinEnabled: d.ezpinEnabled ?? prev.ezpinEnabled,
          ezpinMode: d.ezpinMode ?? prev.ezpinMode,
          ezpinSandboxApiKey: d.ezpinSandboxApiKey ?? prev.ezpinSandboxApiKey,
          ezpinSandboxApiSecret: d.ezpinSandboxApiSecret ?? prev.ezpinSandboxApiSecret,
          ezpinProductionApiKey: d.ezpinProductionApiKey ?? prev.ezpinProductionApiKey,
          ezpinProductionApiSecret: d.ezpinProductionApiSecret ?? prev.ezpinProductionApiSecret,
        }))
        // OTP Providers (stored in 'api' group)
        setOtpSettings((prev) => ({
          otpDefaultProvider: d.otpDefaultProvider ?? prev.otpDefaultProvider,
          smspoolEnabled: d.smspoolEnabled ?? prev.smspoolEnabled,
          smspoolApiKey: d.smspoolApiKey ?? prev.smspoolApiKey,
          fivesimEnabled: d.fivesimEnabled ?? prev.fivesimEnabled,
          fivesimApiKey: d.fivesimApiKey ?? prev.fivesimApiKey,
        }))
      }
    })
    // Load cron settings
    settingsApi.getSettingsByGroup('cron').then((res) => {
      if (res.success && res.data) {
        const d = res.data
        setCronSettings((prev) => ({
          cronEnabled: d.cronEnabled ?? prev.cronEnabled,
          cronSecret: d.cronSecret ?? prev.cronSecret,
        }))
      }
    })
    // Load referral settings
    settingsApi.getSettingsByGroup('referral').then((res) => {
      if (res.success && res.data) {
        const d = res.data
        setReferralSettings((prev) => ({
          referralProgramEnabled: d.referralProgramEnabled ?? prev.referralProgramEnabled,
          referrerRewardAmount: d.referrerRewardAmount ?? prev.referrerRewardAmount,
          refereeRewardAmount: d.refereeRewardAmount ?? prev.refereeRewardAmount,
          minFirstPurchase: d.minFirstPurchase ?? prev.minFirstPurchase,
        }))
      }
    })
    // Load marketing settings
    settingsApi.getSettingsByGroup('marketing').then((res) => {
      if (res.success && res.data) {
        const d = res.data
        setMarketingSettings((prev) => ({
          ...prev,
          facebookPixelId: d.facebookPixelId ?? prev.facebookPixelId,
          ga4MeasurementId: d.ga4MeasurementId ?? prev.ga4MeasurementId,
          defaultOgImage: d.defaultOgImage ?? prev.defaultOgImage,
          customHeadCode: d.customHeadCode ?? prev.customHeadCode,
          customBodyCode: d.customBodyCode ?? prev.customBodyCode,
        }))
      }
    })
  }, [])

  // Load SEO settings on mount
  useEffect(() => {
    settingsApi.getSettingsByGroup('seo').then((res) => {
      if (res.success && res.data) {
        const d = res.data
        setSeoSettings((prev) => {
          const updated = { ...prev }
          for (const key of Object.keys(prev)) {
            if (d[key] !== undefined && d[key] !== null) (updated as any)[key] = d[key]
          }
          return updated
        })
      }
    }).catch(() => {})
  }, [])

  // Load R2 settings on mount
  useEffect(() => {
    settingsApi.getR2Settings().then((res) => {
      if (res.success && res.data) {
        const d = res.data
        setR2Settings({
          accountId: d.accountId || '',
          accessKeyId: d.accessKeyId || '',
          secretAccessKey: '',
          bucketName: d.bucketName || 'zenorar-scripts',
          isConfigured: d.isConfigured,
        })
        setR2SecretPlaceholder(d.secretAccessKey || '')
      }
    })
  }, [])

  // Load API keys on mount
  useEffect(() => {
    apiFetch<any[]>('/apikeys').then((res) => {
      if (res.success) setApiKeys(res.data || [])
    }).catch(() => {})
  }, [])

  // Capture initial settings after all API calls complete
  const captureInitialSettings = useCallback(() => {
    initialSettingsRef.current = {
      general: { ...generalSettings },
      security: { ...securitySettings },
      notification: { ...notificationSettings },
      payment: { ...paymentSettings },
      api: { ...apiSettings },
      esim: { ...esimSettings },
      voiceEsim: { ...voiceEsimSettings },
      virtualNumber: { ...virtualNumberSettings },
      giftCard: { ...giftCardSettings },
      otp: { ...otpSettings },
      cron: { ...cronSettings },
      referral: { ...referralSettings },
      marketing: { ...marketingSettings },
      seo: { ...seoSettings },
      profile: { name: profileSettings.name },
      exchangeRate: { ...exchangeRateKeys },
    }
    setSettingsLoaded(true)
  }, [generalSettings, securitySettings, notificationSettings, paymentSettings, apiSettings, esimSettings, voiceEsimSettings, virtualNumberSettings, giftCardSettings, otpSettings, cronSettings, referralSettings, marketingSettings, seoSettings, profileSettings.name, exchangeRateKeys])

  // Capture initial state after a short delay to ensure all API calls complete
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!settingsLoaded) {
        captureInitialSettings()
      }
    }, 1500) // Wait for API calls to complete
    return () => clearTimeout(timer)
  }, [captureInitialSettings, settingsLoaded])

  // Compute whether there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!settingsLoaded) return false

    const initial = initialSettingsRef.current

    // Compare each settings group
    const compareObjects = (a: any, b: any): boolean => {
      if (!a || !b) return false
      return JSON.stringify(a) !== JSON.stringify(b)
    }

    return (
      compareObjects(initial.general, generalSettings) ||
      compareObjects(initial.security, securitySettings) ||
      compareObjects(initial.notification, notificationSettings) ||
      compareObjects(initial.payment, paymentSettings) ||
      compareObjects(initial.api, apiSettings) ||
      compareObjects(initial.esim, esimSettings) ||
      compareObjects(initial.voiceEsim, voiceEsimSettings) ||
      compareObjects(initial.virtualNumber, virtualNumberSettings) ||
      compareObjects(initial.giftCard, giftCardSettings) ||
      compareObjects(initial.otp, otpSettings) ||
      compareObjects(initial.cron, cronSettings) ||
      compareObjects(initial.referral, referralSettings) ||
      compareObjects(initial.marketing, marketingSettings) ||
      compareObjects(initial.seo, seoSettings) ||
      (initial.profile && initial.profile.name !== profileSettings.name) ||
      compareObjects(initial.exchangeRate, exchangeRateKeys)
    )
  }, [settingsLoaded, generalSettings, securitySettings, notificationSettings, paymentSettings, apiSettings, esimSettings, voiceEsimSettings, virtualNumberSettings, giftCardSettings, otpSettings, cronSettings, referralSettings, marketingSettings, seoSettings, profileSettings.name, exchangeRateKeys])

  // Reset settings to initial values (for Cancel button)
  const handleCancelChanges = useCallback(() => {
    const initial = initialSettingsRef.current
    if (initial.general) setGeneralSettings(initial.general)
    if (initial.security) setSecuritySettings(initial.security)
    if (initial.notification) setNotificationSettings(initial.notification)
    if (initial.payment) setPaymentSettings(initial.payment)
    if (initial.api) setApiSettings(initial.api)
    if (initial.esim) setEsimSettings(initial.esim)
    if (initial.voiceEsim) setVoiceEsimSettings(initial.voiceEsim)
    if (initial.virtualNumber) setVirtualNumberSettings(initial.virtualNumber)
    if (initial.giftCard) setGiftCardSettings(initial.giftCard)
    if (initial.otp) setOtpSettings(initial.otp)
    if (initial.cron) setCronSettings(initial.cron)
    if (initial.referral) setReferralSettings(initial.referral)
    if (initial.marketing) setMarketingSettings(initial.marketing)
    if (initial.seo) setSeoSettings(initial.seo)
    if (initial.profile) setProfileSettings(prev => ({ ...prev, name: initial.profile.name }))
    if (initial.exchangeRate) setExchangeRateKeys(initial.exchangeRate)
    setMessage(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Generate new API key
  const handleGenerateKey = async () => {
    if (!newKeyName.trim()) return
    setGeneratingKey(true)
    try {
      const res = await apiFetch<any>('/apikeys', { method: 'POST', body: JSON.stringify({ name: newKeyName }) })
      if (res.success) {
        setNewlyCreatedKey(res.data.key)
        setNewKeyName('')
        // Refresh list
        const list = await apiFetch<any[]>('/apikeys')
        if (list.success) setApiKeys(list.data || [])
      }
    } catch (error) {
      console.error('Failed to generate key:', error)
    }
    setGeneratingKey(false)
  }

  // Delete API key
  const handleDeleteKey = async (id: string) => {
    try {
      await apiFetch(`/apikeys/${id}`, { method: 'DELETE' })
      setApiKeys((prev) => prev.filter((k) => k.id !== id))
    } catch (error) {
      console.error('Failed to delete key:', error)
    }
  }

  // Export settings as JSON download
  const handleExportSettings = async () => {
    try {
      const res = await settingsApi.exportSettings()
      if (res.success && res.data) {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `zenorar-settings-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to export settings:', error)
    }
  }

  // Import settings from JSON file
  const handleImportSettings = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const settings = JSON.parse(text)
      await settingsApi.importSettings(settings)
      setMessage({ type: 'success', text: 'Settings imported successfully! Reloading...' })
      setTimeout(() => window.location.reload(), 1500)
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to import settings. Check the file format.' })
    }
    setImporting(false)
    e.target.value = ''
  }

  // Test payment provider connection
  const handleTestPayment = async (provider: string) => {
    setTestingPayment(provider)
    setPaymentTestResult(null)
    try {
      const res = await settingsApi.testPaymentConnection(provider)
      setPaymentTestResult({ provider, success: res.success, message: res.data?.message || 'Connection successful' })
    } catch (error: any) {
      setPaymentTestResult({ provider, success: false, message: error?.message || 'Connection failed' })
    }
    setTestingPayment(null)
  }

  // Fetch audit log
  const handleFetchAuditLog = async () => {
    try {
      const res = await settingsApi.getAuditLog()
      if (res.success) setAuditLogs(res.data?.logs || [])
    } catch (error) {
      console.error('Failed to fetch audit log:', error)
    }
  }

  // Fetch sent notifications from backend
  const fetchSentNotifications = async () => {
    setLoadingSent(true)
    try {
      const data = await apiFetch<any[]>('/notifications/sent')
      if (data.success) {
        setSentNotifications(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch sent notifications:', error)
    }
    setLoadingSent(false)
  }

  // Fetch recipients for a batch
  const fetchRecipients = async (batchId: string) => {
    setLoadingRecipients(true)
    try {
      const data = await apiFetch<any[]>(`/notifications/sent/${batchId}/recipients`)
      if (data.success) {
        setRecipients(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch recipients:', error)
    }
    setLoadingRecipients(false)
  }

  // Delete a notification batch
  const deleteBatch = async (batchId: string) => {
    if (!confirm('Are you sure? This will delete this notification from all users.')) return
    try {
      const data = await apiFetch<{ count: number }>(`/notifications/sent/${batchId}`, {
        method: 'DELETE',
      })
      if (data.success) {
        setMessage({ type: 'success', text: `Deleted ${data.data?.count || 0} notifications` })
        fetchSentNotifications() // Refresh list
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete notification batch' })
    }
  }

  const toggleSelectBatch = (batchId: string) => {
    setSelectedBatchIds((prev) => {
      const next = new Set(prev)
      if (next.has(batchId)) next.delete(batchId)
      else next.add(batchId)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedBatchIds.size === sentNotifications.length) {
      setSelectedBatchIds(new Set())
    } else {
      setSelectedBatchIds(new Set(sentNotifications.map((b) => b.batchId)))
    }
  }

  const bulkDelete = async (batchIds: string[]) => {
    setDeletingBulk(true)
    try {
      const data = await apiFetch<{ count: number }>('/notifications/sent/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ batchIds }),
      })
      if (data.success) {
        setMessage({ type: 'success', text: `Deleted ${data.data?.count || 0} notifications` })
        setSelectedBatchIds(new Set())
        fetchSentNotifications()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete notifications' })
    }
    setDeletingBulk(false)
  }

  const deleteSelected = async () => {
    if (selectedBatchIds.size === 0) return
    if (!confirm(`Delete ${selectedBatchIds.size} selected notification(s) from all users?`)) return
    await bulkDelete(Array.from(selectedBatchIds))
  }

  const deleteAll = async () => {
    if (sentNotifications.length === 0) return
    if (!confirm(`Delete all ${sentNotifications.length} notification batch(es) from all users? This cannot be undone.`)) return
    await bulkDelete(sentNotifications.map((b) => b.batchId))
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Avatar file size must be less than 5MB' })
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Avatar must be an image file' })
      return
    }

    setSaving(true)
    setMessage(null)

    // Remove old avatar from Cloudinary before uploading new one
    if (user?.avatar) {
      await profileApi.removeAvatar()
    }
    const result = await profileApi.uploadAvatar(file)

    if (result.success && result.data) {
      updateUser(result.data)
      setMessage({ type: 'success', text: 'Avatar updated successfully!' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to upload avatar' })
    }

    setSaving(false)
  }

  const handleRemoveAvatar = async () => {
    if (!confirm('Are you sure you want to remove your avatar?')) return

    setSaving(true)
    setMessage(null)

    const result = await profileApi.removeAvatar()

    if (result.success && result.data) {
      updateUser(result.data)
      setMessage({ type: 'success', text: 'Avatar removed successfully!' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to remove avatar' })
    }

    setSaving(false)
  }

  const handleUpdateProfile = async () => {
    if (!profileSettings.name.trim()) {
      setMessage({ type: 'error', text: 'Name is required' })
      return
    }

    setSaving(true)
    setMessage(null)

    const result = await profileApi.update({ name: profileSettings.name })

    if (result.success && result.data) {
      updateUser(result.data)
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update profile' })
    }

    setSaving(false)
  }

  const handleUpdatePassword = async () => {
    // Validate inputs
    if (!profileSettings.currentPassword) {
      setMessage({ type: 'error', text: 'Current password is required' })
      return
    }

    if (!profileSettings.newPassword) {
      setMessage({ type: 'error', text: 'New password is required' })
      return
    }

    if (profileSettings.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' })
      return
    }

    if (profileSettings.newPassword !== profileSettings.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }

    setSaving(true)
    setMessage(null)

    const result = await profileApi.updatePassword({
      currentPassword: profileSettings.currentPassword,
      newPassword: profileSettings.newPassword,
    })

    if (result.success) {
      // Update password_changed_at timestamp for expiry tracking
      apiFetch('/auth/password-changed', {
        method: 'POST',
      }).catch(() => {}) // Non-critical
      setMessage({ type: 'success', text: 'Password updated successfully!' })
      setProfileSettings({
        ...profileSettings,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update password' })
    }

    setSaving(false)
  }

  // Logo upload handler
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Logo file must be less than 5MB' })
      return
    }
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Logo must be an image file' })
      return
    }
    setUploadingLogo(true)
    setMessage(null)
    const result = await mediaApi.upload(file, { title: 'Site Logo' })
    if (result.success && result.data) {
      setGeneralSettings((prev) => ({ ...prev, logoUrl: result.data!.url, logoMediaId: result.data!.id }))
      setMessage({ type: 'success', text: 'Logo uploaded! Click Save Changes to apply.' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to upload logo' })
    }
    setUploadingLogo(false)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  // Favicon upload handler
  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Favicon file must be less than 2MB' })
      return
    }
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Favicon must be an image file' })
      return
    }
    setUploadingFavicon(true)
    setMessage(null)
    const result = await mediaApi.upload(file, { title: 'Site Favicon' })
    if (result.success && result.data) {
      setGeneralSettings((prev) => ({ ...prev, faviconUrl: result.data!.url, faviconMediaId: result.data!.id }))
      setMessage({ type: 'success', text: 'Favicon uploaded! Click Save Changes to apply.' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to upload favicon' })
    }
    setUploadingFavicon(false)
    if (faviconInputRef.current) faviconInputRef.current.value = ''
  }

  const handleTestR2 = async () => {
    setTestingR2(true)
    setR2TestResult(null)
    const secretToUse = r2Settings.secretAccessKey || r2SecretPlaceholder
    const res = await settingsApi.testR2Connection({
      accountId: r2Settings.accountId,
      accessKeyId: r2Settings.accessKeyId,
      secretAccessKey: secretToUse,
      bucketName: r2Settings.bucketName,
    })
    if (res.success && res.data) {
      setR2TestResult(res.data)
    } else {
      setR2TestResult({ success: false, error: res.error || 'Test failed' })
    }
    setTestingR2(false)
  }

  const handleSaveR2 = async () => {
    // Don't allow save if secret not provided and not already configured
    const secretToSave = r2Settings.secretAccessKey
    if (!secretToSave && !r2Settings.isConfigured) {
      setMessage({ type: 'error', text: 'Secret Access Key is required' })
      return
    }
    if (!r2Settings.accountId || !r2Settings.accessKeyId || !r2Settings.bucketName) {
      setMessage({ type: 'error', text: 'All R2 fields are required' })
      return
    }
    setSavingR2(true)
    setMessage(null)
    const res = await settingsApi.updateR2Settings({
      accountId: r2Settings.accountId,
      accessKeyId: r2Settings.accessKeyId,
      secretAccessKey: secretToSave || r2SecretPlaceholder,
      bucketName: r2Settings.bucketName,
    })
    setSavingR2(false)
    if (res.success) {
      setMessage({ type: 'success', text: 'R2 credentials saved and connection verified' })
      setR2Settings(prev => ({ ...prev, isConfigured: true, secretAccessKey: '' }))
      // Reload masked placeholder
      settingsApi.getR2Settings().then(r => {
        if (r.success && r.data) setR2SecretPlaceholder(r.data.secretAccessKey || '')
      })
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to save R2 settings' })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    const settingsToSave = [
      { key: 'siteName', value: generalSettings.siteName, group: 'general', isPublic: true },
      { key: 'siteDescription', value: generalSettings.siteDescription, group: 'general', isPublic: true },
      { key: 'supportEmail', value: generalSettings.supportEmail, group: 'general', isPublic: true },
      { key: 'timezone', value: generalSettings.timezone, group: 'general', isPublic: true },
      { key: 'currency', value: generalSettings.currency, group: 'general', isPublic: true },
      { key: 'maintenanceMode', value: generalSettings.maintenanceMode, group: 'general', isPublic: true },
      { key: 'logoUrl', value: generalSettings.logoUrl, group: 'general', isPublic: true },
      { key: 'logoMediaId', value: generalSettings.logoMediaId, group: 'general', isPublic: false },
      { key: 'faviconUrl', value: generalSettings.faviconUrl, group: 'general', isPublic: true },
      { key: 'faviconMediaId', value: generalSettings.faviconMediaId, group: 'general', isPublic: false },
      { key: 'promoBannerCode', value: generalSettings.promoBannerCode, group: 'general', isPublic: true },
      // Security settings
      { key: 'twoFactorAuth', value: securitySettings.twoFactorAuth, group: 'security', isPublic: false },
      { key: 'sessionTimeout', value: securitySettings.sessionTimeout, group: 'security', isPublic: false },
      { key: 'loginAttempts', value: securitySettings.loginAttempts, group: 'security', isPublic: false },
      { key: 'passwordExpiry', value: securitySettings.passwordExpiry, group: 'security', isPublic: false },
      { key: 'ipWhitelist', value: securitySettings.ipWhitelist, group: 'security', isPublic: false },
      // Notification settings
      { key: 'emailNewOrder', value: notificationSettings.emailNewOrder, group: 'notifications', isPublic: false },
      { key: 'emailNewUser', value: notificationSettings.emailNewUser, group: 'notifications', isPublic: false },
      { key: 'emailLowStock', value: notificationSettings.emailLowStock, group: 'notifications', isPublic: false },
      { key: 'emailTicket', value: notificationSettings.emailTicket, group: 'notifications', isPublic: false },
      { key: 'pushEnabled', value: notificationSettings.pushEnabled, group: 'notifications', isPublic: false },
      { key: 'slackWebhook', value: notificationSettings.slackWebhook, group: 'notifications', isPublic: false },
      // Exchange Rate API keys
      { key: 'exchangerate_api_key', value: exchangeRateKeys.exchangerate_api_key, group: 'api', isPublic: false },
      { key: 'coingecko_api_key', value: exchangeRateKeys.coingecko_api_key, group: 'api', isPublic: false },
      // API access settings
      { key: 'apiEnabled', value: apiSettings.apiEnabled, group: 'api', isPublic: false },
      { key: 'rateLimit', value: apiSettings.rateLimit, group: 'api', isPublic: false },
      { key: 'webhookUrl', value: apiSettings.webhookUrl, group: 'api', isPublic: false },
      // Payment settings - Web3 Wallet
      { key: 'walletEnabled', value: paymentSettings.walletEnabled, group: 'payments', isPublic: true },
      // Payment settings - Stripe
      { key: 'stripeEnabled', value: paymentSettings.stripeEnabled, group: 'payments', isPublic: true },
      { key: 'stripeMode', value: paymentSettings.stripeMode, group: 'payments', isPublic: false },
      { key: 'stripeTestPublicKey', value: paymentSettings.stripeTestPublicKey, group: 'payments', isPublic: false },
      { key: 'stripeTestSecretKey', value: paymentSettings.stripeTestSecretKey, group: 'payments', isPublic: false },
      { key: 'stripeTestWebhookSecret', value: paymentSettings.stripeTestWebhookSecret, group: 'payments', isPublic: false },
      { key: 'stripeLivePublicKey', value: paymentSettings.stripeLivePublicKey, group: 'payments', isPublic: false },
      { key: 'stripeLiveSecretKey', value: paymentSettings.stripeLiveSecretKey, group: 'payments', isPublic: false },
      { key: 'stripeLiveWebhookSecret', value: paymentSettings.stripeLiveWebhookSecret, group: 'payments', isPublic: false },
      // Payment settings - Paystack
      { key: 'paystackEnabled', value: paymentSettings.paystackEnabled, group: 'payments', isPublic: true },
      { key: 'paystackMode', value: paymentSettings.paystackMode, group: 'payments', isPublic: false },
      { key: 'paystackTestPublicKey', value: paymentSettings.paystackTestPublicKey, group: 'payments', isPublic: false },
      { key: 'paystackTestSecretKey', value: paymentSettings.paystackTestSecretKey, group: 'payments', isPublic: false },
      { key: 'paystackTestWebhookSecret', value: paymentSettings.paystackTestWebhookSecret, group: 'payments', isPublic: false },
      { key: 'paystackLivePublicKey', value: paymentSettings.paystackLivePublicKey, group: 'payments', isPublic: false },
      { key: 'paystackLiveSecretKey', value: paymentSettings.paystackLiveSecretKey, group: 'payments', isPublic: false },
      { key: 'paystackLiveWebhookSecret', value: paymentSettings.paystackLiveWebhookSecret, group: 'payments', isPublic: false },
      // Payment settings - Enhanced Crypto
      { key: 'cryptoEnabled', value: paymentSettings.cryptoEnabled, group: 'payments', isPublic: true },
      { key: 'cryptoMethod', value: paymentSettings.cryptoMethod, group: 'payments', isPublic: true },
      { key: 'receivingWalletAddress', value: paymentSettings.receivingWalletAddress, group: 'payments', isPublic: true },
      { key: 'btcAddress', value: paymentSettings.btcAddress, group: 'payments', isPublic: true },
      { key: 'ethAddress', value: paymentSettings.ethAddress, group: 'payments', isPublic: true },
      { key: 'usdtEthAddress', value: paymentSettings.usdtEthAddress, group: 'payments', isPublic: true },
      { key: 'usdtBscAddress', value: paymentSettings.usdtBscAddress, group: 'payments', isPublic: true },
      { key: 'usdtTronAddress', value: paymentSettings.usdtTronAddress, group: 'payments', isPublic: true },
      { key: 'bnbAddress', value: paymentSettings.bnbAddress, group: 'payments', isPublic: true },
      { key: 'usdcAddress', value: paymentSettings.usdcAddress, group: 'payments', isPublic: true },
      { key: 'solAddress', value: paymentSettings.solAddress, group: 'payments', isPublic: true },
      { key: 'cryptoProcessor', value: paymentSettings.cryptoProcessor, group: 'payments', isPublic: false },
      { key: 'cryptoApiKey', value: paymentSettings.cryptoApiKey, group: 'payments', isPublic: false },
      { key: 'cryptoWebhookSecret', value: paymentSettings.cryptoWebhookSecret, group: 'payments', isPublic: false },
      // Payment settings - PayPal
      { key: 'paypalEnabled', value: paymentSettings.paypalEnabled, group: 'payments', isPublic: true },
      { key: 'paypalMode', value: paymentSettings.paypalMode, group: 'payments', isPublic: false },
      { key: 'paypalPlatform', value: paymentSettings.paypalPlatform, group: 'payments', isPublic: false },
      { key: 'paypalTestClientId', value: paymentSettings.paypalTestClientId, group: 'payments', isPublic: false },
      { key: 'paypalTestSecretKey', value: paymentSettings.paypalTestSecretKey, group: 'payments', isPublic: false },
      { key: 'paypalLiveClientId', value: paymentSettings.paypalLiveClientId, group: 'payments', isPublic: false },
      { key: 'paypalLiveSecretKey', value: paymentSettings.paypalLiveSecretKey, group: 'payments', isPublic: false },
      // Payment settings - General
      { key: 'autoWithdraw', value: paymentSettings.autoWithdraw, group: 'payments', isPublic: false },
      { key: 'withdrawThreshold', value: paymentSettings.withdrawThreshold, group: 'payments', isPublic: false },
      // Payment settings - Wallet Deposits
      { key: 'walletDepositsEnabled', value: paymentSettings.walletDepositsEnabled, group: 'payments', isPublic: true },
      { key: 'depositMinAmount', value: paymentSettings.depositMinAmount, group: 'payments', isPublic: true },
      { key: 'depositMaxAmount', value: paymentSettings.depositMaxAmount, group: 'payments', isPublic: true },
      { key: 'depositCardEnabled', value: paymentSettings.depositCardEnabled, group: 'payments', isPublic: true },
      { key: 'depositPaystackEnabled', value: paymentSettings.depositPaystackEnabled, group: 'payments', isPublic: true },
      { key: 'depositPaypalEnabled', value: paymentSettings.depositPaypalEnabled, group: 'payments', isPublic: true },
      { key: 'depositCryptoEnabled', value: paymentSettings.depositCryptoEnabled, group: 'payments', isPublic: true },
      { key: 'depositBankEnabled', value: paymentSettings.depositBankEnabled, group: 'payments', isPublic: true },
      // Bank Transfer Account Details
      { key: 'bankAccountName', value: paymentSettings.bankAccountName, group: 'payments', isPublic: true },
      { key: 'bankAccountNumber', value: paymentSettings.bankAccountNumber, group: 'payments', isPublic: true },
      { key: 'bankBankName', value: paymentSettings.bankBankName, group: 'payments', isPublic: true },
      { key: 'bankRoutingNumber', value: paymentSettings.bankRoutingNumber, group: 'payments', isPublic: true },
      { key: 'bankInstructions', value: paymentSettings.bankInstructions, group: 'payments', isPublic: true },
      // Referral Program settings
      { key: 'referralProgramEnabled', value: referralSettings.referralProgramEnabled, group: 'referral', isPublic: true },
      { key: 'referrerRewardAmount', value: referralSettings.referrerRewardAmount, group: 'referral', isPublic: true },
      { key: 'refereeRewardAmount', value: referralSettings.refereeRewardAmount, group: 'referral', isPublic: true },
      { key: 'minFirstPurchase', value: referralSettings.minFirstPurchase, group: 'referral', isPublic: true },
      // Marketing settings
      { key: 'facebookPixelId', value: marketingSettings.facebookPixelId, group: 'marketing', isPublic: true },
      { key: 'ga4MeasurementId', value: marketingSettings.ga4MeasurementId, group: 'marketing', isPublic: true },
      { key: 'defaultOgImage', value: marketingSettings.defaultOgImage, group: 'marketing', isPublic: true },
      { key: 'customHeadCode', value: marketingSettings.customHeadCode, group: 'marketing', isPublic: true },
      { key: 'customBodyCode', value: marketingSettings.customBodyCode, group: 'marketing', isPublic: true },
      // SEO settings
      { key: 'globalMetaTitleTemplate', value: seoSettings.globalMetaTitleTemplate, group: 'seo', isPublic: true },
      { key: 'globalMetaDescription', value: seoSettings.globalMetaDescription, group: 'seo', isPublic: true },
      { key: 'canonicalUrlPrefix', value: seoSettings.canonicalUrlPrefix, group: 'seo', isPublic: true },
      { key: 'googleSiteVerification', value: seoSettings.googleSiteVerification, group: 'seo', isPublic: true },
      { key: 'defaultOgTitle', value: seoSettings.defaultOgTitle, group: 'seo', isPublic: true },
      { key: 'defaultOgDescription', value: seoSettings.defaultOgDescription, group: 'seo', isPublic: true },
      { key: 'defaultOgType', value: seoSettings.defaultOgType, group: 'seo', isPublic: true },
      { key: 'twitterCardType', value: seoSettings.twitterCardType, group: 'seo', isPublic: true },
      { key: 'structuredDataOrgName', value: seoSettings.structuredDataOrgName, group: 'seo', isPublic: true },
      { key: 'structuredDataOrgLogo', value: seoSettings.structuredDataOrgLogo, group: 'seo', isPublic: true },
      { key: 'structuredDataOrgUrl', value: seoSettings.structuredDataOrgUrl, group: 'seo', isPublic: true },
      { key: 'structuredDataSocialProfiles', value: seoSettings.structuredDataSocialProfiles, group: 'seo', isPublic: true },
      { key: 'robotsTxtContent', value: seoSettings.robotsTxtContent, group: 'seo', isPublic: true },
      // eSIM Providers
      { key: 'esimDefaultProvider', value: esimSettings.esimDefaultProvider, group: 'api', isPublic: false },
      { key: 'esimGoEnabled', value: esimSettings.esimGoEnabled, group: 'api', isPublic: true },
      { key: 'esimGoApiKey', value: esimSettings.esimGoApiKey, group: 'api', isPublic: false },
      { key: 'airaloEnabled', value: esimSettings.airaloEnabled, group: 'api', isPublic: true },
      { key: 'airaloMode', value: esimSettings.airaloMode, group: 'api', isPublic: false },
      { key: 'airaloSandboxClientId', value: esimSettings.airaloSandboxClientId, group: 'api', isPublic: false },
      { key: 'airaloSandboxClientSecret', value: esimSettings.airaloSandboxClientSecret, group: 'api', isPublic: false },
      { key: 'airaloProductionClientId', value: esimSettings.airaloProductionClientId, group: 'api', isPublic: false },
      { key: 'airaloProductionClientSecret', value: esimSettings.airaloProductionClientSecret, group: 'api', isPublic: false },
      // MobiMatter
      { key: 'mobimatterEnabled', value: esimSettings.mobimatterEnabled, group: 'api', isPublic: true },
      { key: 'mobimatterMerchantId', value: esimSettings.mobimatterMerchantId, group: 'api', isPublic: false },
      { key: 'mobimatterApiKey', value: esimSettings.mobimatterApiKey, group: 'api', isPublic: false },
      // Voice eSIM Providers (with phone number, calls, SMS)
      { key: 'voiceEsimDefaultProvider', value: voiceEsimSettings.voiceEsimDefaultProvider, group: 'api', isPublic: false },
      { key: 'telnyxEnabled', value: voiceEsimSettings.telnyxEnabled, group: 'api', isPublic: true },
      { key: 'telnyxApiKey', value: voiceEsimSettings.telnyxApiKey, group: 'api', isPublic: false },
      { key: 'alosimEnabled', value: voiceEsimSettings.alosimEnabled, group: 'api', isPublic: true },
      { key: 'alosimApiKey', value: voiceEsimSettings.alosimApiKey, group: 'api', isPublic: false },
      { key: 'twiseEnabled', value: voiceEsimSettings.twiseEnabled, group: 'api', isPublic: true },
      { key: 'twiseApiKey', value: voiceEsimSettings.twiseApiKey, group: 'api', isPublic: false },
      // Virtual Numbers
      { key: 'virtualNumbersEnabled', value: virtualNumberSettings.virtualNumbersEnabled, group: 'api', isPublic: true },
      { key: 'virtualNumbersProvider', value: virtualNumberSettings.virtualNumbersProvider, group: 'api', isPublic: false },
      // Twilio
      { key: 'twilioEnabled', value: virtualNumberSettings.twilioEnabled, group: 'api', isPublic: true },
      { key: 'twilioMode', value: virtualNumberSettings.twilioMode, group: 'api', isPublic: false },
      { key: 'twilioTestAccountSid', value: virtualNumberSettings.twilioTestAccountSid, group: 'api', isPublic: false },
      { key: 'twilioTestAuthToken', value: virtualNumberSettings.twilioTestAuthToken, group: 'api', isPublic: false },
      { key: 'twilioTestPhoneNumber', value: virtualNumberSettings.twilioTestPhoneNumber, group: 'api', isPublic: false },
      { key: 'twilioLiveAccountSid', value: virtualNumberSettings.twilioLiveAccountSid, group: 'api', isPublic: false },
      { key: 'twilioLiveAuthToken', value: virtualNumberSettings.twilioLiveAuthToken, group: 'api', isPublic: false },
      { key: 'twilioLivePhoneNumber', value: virtualNumberSettings.twilioLivePhoneNumber, group: 'api', isPublic: false },
      // Plivo
      { key: 'plivoEnabled', value: virtualNumberSettings.plivoEnabled, group: 'api', isPublic: true },
      { key: 'plivoAuthId', value: virtualNumberSettings.plivoAuthId, group: 'api', isPublic: false },
      { key: 'plivoAuthToken', value: virtualNumberSettings.plivoAuthToken, group: 'api', isPublic: false },
      // Vonage
      { key: 'vonageEnabled', value: virtualNumberSettings.vonageEnabled, group: 'api', isPublic: true },
      { key: 'vonageApiKey', value: virtualNumberSettings.vonageApiKey, group: 'api', isPublic: false },
      { key: 'vonageApiSecret', value: virtualNumberSettings.vonageApiSecret, group: 'api', isPublic: false },
      // Gift Card Providers
      { key: 'giftCardDefaultProvider', value: giftCardSettings.giftCardDefaultProvider, group: 'api', isPublic: false },
      // Reloadly
      { key: 'reloadlyEnabled', value: giftCardSettings.reloadlyEnabled, group: 'api', isPublic: true },
      { key: 'reloadlyMode', value: giftCardSettings.reloadlyMode, group: 'api', isPublic: false },
      { key: 'reloadlySandboxClientId', value: giftCardSettings.reloadlySandboxClientId, group: 'api', isPublic: false },
      { key: 'reloadlySandboxClientSecret', value: giftCardSettings.reloadlySandboxClientSecret, group: 'api', isPublic: false },
      { key: 'reloadlyProductionClientId', value: giftCardSettings.reloadlyProductionClientId, group: 'api', isPublic: false },
      { key: 'reloadlyProductionClientSecret', value: giftCardSettings.reloadlyProductionClientSecret, group: 'api', isPublic: false },
      // EZGiftCard
      { key: 'ezgiftcardEnabled', value: giftCardSettings.ezgiftcardEnabled, group: 'api', isPublic: true },
      { key: 'ezgiftcardApiKey', value: giftCardSettings.ezgiftcardApiKey, group: 'api', isPublic: false },
      // Bitrefill
      { key: 'bitrefillEnabled', value: giftCardSettings.bitrefillEnabled, group: 'api', isPublic: true },
      { key: 'bitrefillApiKey', value: giftCardSettings.bitrefillApiKey, group: 'api', isPublic: false },
      { key: 'bitrefillApiSecret', value: giftCardSettings.bitrefillApiSecret, group: 'api', isPublic: false },
      // Tango Card
      { key: 'tangoEnabled', value: giftCardSettings.tangoEnabled, group: 'api', isPublic: true },
      { key: 'tangoMode', value: giftCardSettings.tangoMode, group: 'api', isPublic: false },
      { key: 'tangoSandboxPlatformName', value: giftCardSettings.tangoSandboxPlatformName, group: 'api', isPublic: false },
      { key: 'tangoSandboxPlatformKey', value: giftCardSettings.tangoSandboxPlatformKey, group: 'api', isPublic: false },
      { key: 'tangoProductionPlatformName', value: giftCardSettings.tangoProductionPlatformName, group: 'api', isPublic: false },
      { key: 'tangoProductionPlatformKey', value: giftCardSettings.tangoProductionPlatformKey, group: 'api', isPublic: false },
      // EZ Pin
      { key: 'ezpinEnabled', value: giftCardSettings.ezpinEnabled, group: 'api', isPublic: true },
      { key: 'ezpinMode', value: giftCardSettings.ezpinMode, group: 'api', isPublic: false },
      { key: 'ezpinSandboxApiKey', value: giftCardSettings.ezpinSandboxApiKey, group: 'api', isPublic: false },
      { key: 'ezpinSandboxApiSecret', value: giftCardSettings.ezpinSandboxApiSecret, group: 'api', isPublic: false },
      { key: 'ezpinProductionApiKey', value: giftCardSettings.ezpinProductionApiKey, group: 'api', isPublic: false },
      { key: 'ezpinProductionApiSecret', value: giftCardSettings.ezpinProductionApiSecret, group: 'api', isPublic: false },
      // OTP Providers (stored in 'api' group for consistency)
      { key: 'otpDefaultProvider', value: otpSettings.otpDefaultProvider, group: 'api', isPublic: false },
      { key: 'smspoolEnabled', value: otpSettings.smspoolEnabled, group: 'api', isPublic: true },
      { key: 'smspoolApiKey', value: otpSettings.smspoolApiKey, group: 'api', isPublic: false },
      { key: 'fivesimEnabled', value: otpSettings.fivesimEnabled, group: 'api', isPublic: true },
      { key: 'fivesimApiKey', value: otpSettings.fivesimApiKey, group: 'api', isPublic: false },
      // Cron Jobs
      { key: 'cronEnabled', value: cronSettings.cronEnabled, group: 'cron', isPublic: false },
      { key: 'cronSecret', value: cronSettings.cronSecret, group: 'cron', isPublic: false },
    ]

    const result = await settingsApi.updateSettings(settingsToSave)

    if (result.success) {
      setMessage({ type: 'success', text: 'Settings saved successfully!' })

      // Update initial settings ref to match current state (so "Saved" shows correctly)
      captureInitialSettings()

      // Auto-sync gift card providers if any are enabled with credentials
      const shouldSyncGiftCards = (
        (giftCardSettings.reloadlyEnabled && (giftCardSettings.reloadlySandboxClientId || giftCardSettings.reloadlyProductionClientId)) ||
        (giftCardSettings.tangoEnabled && (giftCardSettings.tangoSandboxPlatformName || giftCardSettings.tangoProductionPlatformName)) ||
        (giftCardSettings.ezpinEnabled && (giftCardSettings.ezpinSandboxApiKey || giftCardSettings.ezpinProductionApiKey))
      )

      if (shouldSyncGiftCards) {
        // Trigger background sync
        fetch('/api/admin/gift-cards/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ countryCode: 'US' })
        }).then(async (res) => {
          const syncResult = await res.json()
          if (syncResult.success) {
            const total = syncResult.totalSynced + syncResult.totalUpdated
            if (total > 0) {
              setMessage({ type: 'success', text: `Settings saved! Synced ${total} gift cards from providers.` })
            }
          }
        }).catch(console.error)
      }
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to save settings' })
    }

    setSaving(false)
  }

  return (
    <AdminLayout>
      {/* Enforce PIN setup for admins who don't have one */}
      {showPinEnforce && (
        <PinSetupForm
          hasExistingPin={false}
          fullScreen
          onSuccess={() => {
            setShowPinEnforce(false)
            setPinStatus({ hasPin: true, setAt: new Date().toISOString() })
            setMessage({ type: 'success', text: 'Security PIN set successfully' })
          }}
        />
      )}

      <div className="max-w-full overflow-hidden">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1">Settings</h1>
            <p className="text-slate-500 text-xs sm:text-sm">Manage your marketplace configuration and preferences</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportSettings} className="text-xs sm:text-sm px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-colors">Export</button>
            <label className="text-xs sm:text-sm px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-colors cursor-pointer">
              {importing ? 'Importing...' : 'Import'}
              <input type="file" accept=".json" onChange={handleImportSettings} className="hidden" />
            </label>
          </div>
        </div>

        {/* Tabs Navigation - Pill style like Reports page */}
        <div
          ref={tabsRef}
          className="flex gap-2 mb-6 overflow-x-auto max-w-full"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id, index)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-primary text-black'
                  : 'bg-[#1a1a1a] text-slate-400 hover:text-white border border-[#2a2a2a]'
              }`}
            >
              <Icon name={tab.icon} size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4 sm:p-6 mb-6">
          {/* Success/Error Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg border ${
              message.type === 'success'
                ? 'bg-primary/10 border-primary/20 text-primary'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          )}

          {/* Profile Settings */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />

              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-24 h-24 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center overflow-hidden">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <Icon name="user" size={40} className="text-slate-600" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAvatarClick}
                      disabled={saving}
                      className="bg-[#1a1a1a] hover:bg-white/5 text-white text-xs px-3 py-1.5 rounded-lg transition-colors border border-[#2a2a2a] disabled:opacity-50"
                    >
                      Change
                    </button>
                    {user?.avatar && (
                      <button
                        onClick={handleRemoveAvatar}
                        disabled={saving}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs px-3 py-1.5 rounded-lg transition-colors border border-red-500/20 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 w-full space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Full Name</label>
                    <input
                      type="text"
                      value={profileSettings.name}
                      onChange={(e) => setProfileSettings({ ...profileSettings, name: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Email Address</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-slate-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-500">Email cannot be changed</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Role</label>
                    <input
                      type="text"
                      value={user?.role || ''}
                      disabled
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  <button
                    onClick={handleUpdateProfile}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-black rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>

              <div className="pt-6 border-t border-[#2a2a2a] space-y-4">
                <h3 className="text-white font-medium mb-4">Change Password</h3>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Current Password</label>
                  <input
                    type="password"
                    value={profileSettings.currentPassword}
                    onChange={(e) => setProfileSettings({ ...profileSettings, currentPassword: e.target.value })}
                    placeholder="Enter your current password"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">New Password</label>
                    <input
                      type="password"
                      value={profileSettings.newPassword}
                      onChange={(e) => setProfileSettings({ ...profileSettings, newPassword: e.target.value })}
                      placeholder="Enter new password"
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Confirm New Password</label>
                    <input
                      type="password"
                      value={profileSettings.confirmPassword}
                      onChange={(e) => setProfileSettings({ ...profileSettings, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-blue-400 text-sm">
                    <strong>Password requirements:</strong> At least 8 characters, including uppercase, lowercase, number, and special character.
                  </p>
                </div>

                <button
                  onClick={handleUpdatePassword}
                  disabled={saving || !profileSettings.currentPassword || !profileSettings.newPassword || !profileSettings.confirmPassword}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-black rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          )}

          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Site Name</label>
                  <input
                    type="text"
                    value={generalSettings.siteName}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, siteName: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Support Email</label>
                  <input
                    type="email"
                    value={generalSettings.supportEmail}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Site Description</label>
                <textarea
                  value={generalSettings.siteDescription}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, siteDescription: e.target.value })}
                  rows={3}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Timezone</label>
                  <select
                    value={generalSettings.timezone}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, timezone: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                  >
                    <option value="auto">Default (User&apos;s Location)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Currency</label>
                  <select
                    value={generalSettings.currency}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, currency: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="BTC">BTC (₿)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Promo Banner Code</label>
                <input
                  type="text"
                  value={generalSettings.promoBannerCode}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, promoBannerCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. WELCOME10"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 font-mono"
                />
                <p className="text-slate-500 text-xs">Enter an active discount code to display on the homepage promo banner. Leave empty to hide the banner.</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                <div>
                  <p className="text-white font-medium">Maintenance Mode</p>
                  <p className="text-slate-500 text-sm">Temporarily disable the marketplace for visitors</p>
                </div>
                <button
                  onClick={() => {
                    if (!generalSettings.maintenanceMode && !confirm('Enable maintenance mode? This will disable the marketplace for all visitors.')) return
                    setGeneralSettings({ ...generalSettings, maintenanceMode: !generalSettings.maintenanceMode })
                  }}
                  className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                    generalSettings.maintenanceMode ? 'bg-primary' : 'bg-[#2a2a2a]'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      generalSettings.maintenanceMode ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Logo & Favicon Uploads */}
              <div className="pt-6 border-t border-[#2a2a2a]">
                <h3 className="text-white font-medium mb-4">Branding</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Logo Upload */}
                  <div className="p-5 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
                    <p className="text-white font-medium mb-1">Site Logo</p>
                    <p className="text-slate-500 text-xs mb-4">Displayed in the header and footer. Recommended: 200-400px wide, 50-80px tall. PNG or SVG, max 5MB.</p>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-[#141414] border border-[#2a2a2a] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {generalSettings.logoUrl ? (
                          <img src={generalSettings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <Icon name="image" size={24} className="text-slate-600" />
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => logoInputRef.current?.click()}
                          disabled={uploadingLogo}
                          className="bg-[#222] hover:bg-white/5 text-white text-xs px-3 py-1.5 rounded-lg transition-colors border border-[#2a2a2a] disabled:opacity-50"
                        >
                          {uploadingLogo ? 'Uploading...' : generalSettings.logoUrl ? 'Change Logo' : 'Upload Logo'}
                        </button>
                        {generalSettings.logoUrl && (
                          <button
                            onClick={async () => {
                              if (generalSettings.logoMediaId) {
                                await mediaApi.delete(generalSettings.logoMediaId)
                              }
                              setGeneralSettings((prev) => ({ ...prev, logoUrl: '', logoMediaId: '' }))
                            }}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs px-3 py-1.5 rounded-lg transition-colors border border-red-500/20"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Favicon Upload */}
                  <div className="p-5 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
                    <p className="text-white font-medium mb-1">Favicon</p>
                    <p className="text-slate-500 text-xs mb-4">Browser tab icon. Recommended: 512x512px square. PNG or ICO, max 2MB.</p>
                    <input
                      ref={faviconInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFaviconUpload}
                      className="hidden"
                    />
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-[#141414] border border-[#2a2a2a] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {generalSettings.faviconUrl ? (
                          <img src={generalSettings.faviconUrl} alt="Favicon" className="w-full h-full object-contain" />
                        ) : (
                          <Icon name="globe" size={24} className="text-slate-600" />
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => faviconInputRef.current?.click()}
                          disabled={uploadingFavicon}
                          className="bg-[#222] hover:bg-white/5 text-white text-xs px-3 py-1.5 rounded-lg transition-colors border border-[#2a2a2a] disabled:opacity-50"
                        >
                          {uploadingFavicon ? 'Uploading...' : generalSettings.faviconUrl ? 'Change Favicon' : 'Upload Favicon'}
                        </button>
                        {generalSettings.faviconUrl && (
                          <button
                            onClick={async () => {
                              if (generalSettings.faviconMediaId) {
                                await mediaApi.delete(generalSettings.faviconMediaId)
                              }
                              setGeneralSettings((prev) => ({ ...prev, faviconUrl: '', faviconMediaId: '' }))
                            }}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs px-3 py-1.5 rounded-lg transition-colors border border-red-500/20"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Legal Pages Links */}
              <div className="bg-surface rounded-xl p-4 sm:p-6 border border-white/5">
                <button onClick={() => toggleSection('legalPages')} className="w-full flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-semibold text-white">Legal Pages</h3>
                  <Icon name={expandedSections.legalPages ? 'chevron-up' : 'chevron-down'} size={20} className="text-slate-400 flex-shrink-0" />
                </button>
                {expandedSections.legalPages && (
                  <div className="mt-4">
                    <p className="text-sm text-slate-400 mb-4">Manage your legal pages using the Page Builder.</p>
                    <div className="space-y-2">
                      <a href="/admin/frontend?slug=terms" className="flex items-center gap-2 text-primary hover:underline text-sm"><Icon name="description" size={16} /> Edit Terms of Service</a>
                      <a href="/admin/frontend?slug=privacy" className="flex items-center gap-2 text-primary hover:underline text-sm"><Icon name="description" size={16} /> Edit Privacy Policy</a>
                      <a href="/admin/frontend?slug=cookies" className="flex items-center gap-2 text-primary hover:underline text-sm"><Icon name="description" size={16} /> Edit Cookie Policy</a>
                    </div>
                  </div>
                )}
              </div>
              {/* Script Protection Levels */}
              <ProtectionLevelsSection />
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon name="shield" size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Two-Factor Authentication</p>
                    <p className="text-slate-500 text-sm">Require 2FA for all admin accounts</p>
                  </div>
                </div>
                <button
                  onClick={() => setSecuritySettings({ ...securitySettings, twoFactorAuth: !securitySettings.twoFactorAuth })}
                  className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                    securitySettings.twoFactorAuth ? 'bg-primary' : 'bg-[#2a2a2a]'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      securitySettings.twoFactorAuth ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Session Timeout (minutes)</label>
                  <input
                    type="number"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Max Login Attempts</label>
                  <input
                    type="number"
                    value={securitySettings.loginAttempts}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, loginAttempts: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Password Expiry (days)</label>
                <input
                  type="number"
                  value={securitySettings.passwordExpiry}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, passwordExpiry: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                  placeholder="0 to disable"
                />
                <p className="text-slate-500 text-xs">Set to 0 to disable password expiration</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">IP Whitelist</label>
                <textarea
                  value={securitySettings.ipWhitelist}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, ipWhitelist: e.target.value })}
                  rows={3}
                  placeholder="Enter IP addresses, one per line..."
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 resize-none font-mono text-sm"
                />
                <p className="text-slate-500 text-xs">Leave empty to allow all IPs</p>
              </div>

              {/* Admin Security PIN */}
              <div className="p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <Icon name="lock" size={20} className="text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Admin Security PIN</p>
                    <p className="text-slate-500 text-sm">
                      {pinStatus?.hasPin
                        ? `PIN is set${pinStatus.setAt ? ` (last updated ${new Date(pinStatus.setAt).toLocaleDateString()})` : ''}`
                        : 'No PIN set — required for sensitive actions'}
                    </p>
                  </div>
                </div>

                {showPinSetup ? (
                  <PinSetupForm
                    hasExistingPin={!!pinStatus?.hasPin}
                    onSuccess={() => {
                      setShowPinSetup(false)
                      setPinStatus({ hasPin: true, setAt: new Date().toISOString() })
                      setMessage({ type: 'success', text: pinStatus?.hasPin ? 'PIN changed' : 'PIN set successfully' })
                    }}
                    onCancel={() => setShowPinSetup(false)}
                  />
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowPinSetup(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                    >
                      {pinStatus?.hasPin ? 'Change PIN' : 'Set Up PIN'}
                    </button>
                    {pinStatus?.hasPin && (
                      <button
                        onClick={handlePinResetRequest}
                        disabled={resetingPin}
                        className="px-4 py-2 bg-[#2a2a2a] text-gray-300 rounded hover:bg-[#333] transition-colors text-sm"
                      >
                        {resetingPin ? 'Sending...' : 'Reset via Email'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="bg-surface rounded-xl p-4 sm:p-6 border border-white/5">
                <button onClick={() => toggleSection('emailNotifications')} className="w-full flex items-center justify-between">
                  <h3 className="text-white font-medium">Email Notifications</h3>
                  <Icon name={expandedSections.emailNotifications ? 'chevron-up' : 'chevron-down'} size={20} className="text-slate-400 flex-shrink-0" />
                </button>

                {expandedSections.emailNotifications && (
                  <div className="space-y-4 mt-4">
                    {[
                      { key: 'emailNewOrder', label: 'New Order', description: 'Receive email when a new order is placed' },
                      { key: 'emailNewUser', label: 'New User Registration', description: 'Receive email when a new user signs up' },
                      { key: 'emailLowStock', label: 'Low Stock Alert', description: 'Receive email when product stock is low' },
                      { key: 'emailTicket', label: 'Support Ticket', description: 'Receive email for new support tickets' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                        <div>
                          <p className="text-white font-medium">{item.label}</p>
                          <p className="text-slate-500 text-sm">{item.description}</p>
                        </div>
                        <button
                          onClick={() => setNotificationSettings({ ...notificationSettings, [item.key]: !notificationSettings[item.key as keyof typeof notificationSettings] })}
                          className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                            notificationSettings[item.key as keyof typeof notificationSettings] ? 'bg-primary' : 'bg-[#2a2a2a]'
                          }`}
                        >
                          <span
                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                              notificationSettings[item.key as keyof typeof notificationSettings] ? 'left-7' : 'left-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[#2a2a2a]">
                <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Icon name="bell" size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Push Notifications</p>
                      <p className="text-slate-500 text-sm">Enable browser push notifications</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotificationSettings({ ...notificationSettings, pushEnabled: !notificationSettings.pushEnabled })}
                    className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                      notificationSettings.pushEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        notificationSettings.pushEnabled ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Slack Webhook URL</label>
                  <input
                    type="url"
                    value={notificationSettings.slackWebhook}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, slackWebhook: e.target.value })}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                  />
                  <p className="text-slate-500 text-xs">Send notifications to a Slack channel</p>
                </div>
              </div>

              {/* Send Notification */}
              <div className="bg-surface rounded-xl p-4 sm:p-6 border border-white/5">
                <button onClick={() => toggleSection('sendNotification')} className="w-full flex items-center justify-between">
                  <h3 className="text-white font-medium">Send Notification</h3>
                  <Icon name={expandedSections.sendNotification ? 'chevron-up' : 'chevron-down'} size={20} className="text-slate-400 flex-shrink-0" />
                </button>
                {expandedSections.sendNotification && (
                <div className="space-y-4 mt-4">
                  {/* Send Mode Toggle */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSendMode('all')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        sendMode === 'all' ? 'bg-primary text-black' : 'bg-[#1a1a1a] text-slate-400 hover:text-white border border-[#2a2a2a]'
                      }`}
                    >
                      All Users
                    </button>
                    <button
                      onClick={() => setSendMode('targeted')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        sendMode === 'targeted' ? 'bg-primary text-black' : 'bg-[#1a1a1a] text-slate-400 hover:text-white border border-[#2a2a2a]'
                      }`}
                    >
                      Targeted
                    </button>
                  </div>

                  {/* Targeted User Selection */}
                  {sendMode === 'targeted' && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-slate-300">Select Users</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={targetUserSearch}
                          onChange={async (e) => {
                            const q = e.target.value
                            setTargetUserSearch(q)
                            if (q.length < 2) { setTargetSearchResults([]); return }
                            setSearchingUsers(true)
                            try {
                              const res = await usersApi.list({ search: q, limit: 10 })
                              if (res.success && res.data) {
                                setTargetSearchResults(
                                  res.data.users
                                    .filter((u: any) => !targetUsers.some(t => t.id === u.id))
                                    .map((u: any) => ({ id: u.id, name: u.name || 'Unnamed', email: u.email }))
                                )
                              }
                            } catch {}
                            setSearchingUsers(false)
                          }}
                          placeholder="Search users by name or email..."
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                        />
                        {targetSearchResults.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg max-h-48 overflow-y-auto">
                            {targetSearchResults.map(u => (
                              <button
                                key={u.id}
                                onClick={() => {
                                  setTargetUsers(prev => [...prev, u])
                                  setTargetSearchResults([])
                                  setTargetUserSearch('')
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-[#2a2a2a] transition-colors"
                              >
                                <span className="text-white text-sm">{u.name}</span>
                                <span className="text-slate-500 text-xs ml-2">{u.email}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {targetUsers.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {targetUsers.map(u => (
                            <span key={u.id} className="inline-flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full px-3 py-1 text-sm">
                              <span className="text-white">{u.name}</span>
                              <button
                                onClick={() => setTargetUsers(prev => prev.filter(t => t.id !== u.id))}
                                className="text-slate-500 hover:text-red-400 ml-1"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Type</label>
                    <select
                      value={sendNotif.type}
                      onChange={(e) => setSendNotif({ ...sendNotif, type: e.target.value as 'SYSTEM' | 'PROMOTIONAL' })}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                    >
                      <option value="SYSTEM">System</option>
                      <option value="PROMOTIONAL">Promotional</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Title</label>
                    <input
                      type="text"
                      value={sendNotif.title}
                      onChange={(e) => setSendNotif({ ...sendNotif, title: e.target.value })}
                      placeholder="Notification title..."
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Message</label>
                    <textarea
                      value={sendNotif.message}
                      onChange={(e) => setSendNotif({ ...sendNotif, message: e.target.value })}
                      placeholder="Notification message..."
                      rows={3}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 resize-none"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      if (!sendNotif.title || !sendNotif.message) {
                        setMessage({ type: 'error', text: 'Title and message are required' })
                        return
                      }
                      if (sendMode === 'targeted' && targetUsers.length === 0) {
                        setMessage({ type: 'error', text: 'Select at least one user for targeted notification' })
                        return
                      }
                      setSendingNotif(true)
                      setMessage(null)
                      try {
                        if (sendMode === 'targeted') {
                          const data = await apiFetch<{ message: string }>('/notifications/promotional', {
                            method: 'POST',
                            body: JSON.stringify({
                              userIds: targetUsers.map(u => u.id),
                              type: sendNotif.type,
                              title: sendNotif.title,
                              message: sendNotif.message,
                            }),
                          })
                          if (data.success) {
                            setMessage({ type: 'success', text: `Notification sent to ${targetUsers.length} user(s)` })
                            setSendNotif({ type: 'SYSTEM', title: '', message: '' })
                            setTargetUsers([])
                          } else {
                            setMessage({ type: 'error', text: data.error || 'Failed to send notification' })
                          }
                        } else {
                          const data = await apiFetch<{ message: string }>('/notifications/broadcast', {
                            method: 'POST',
                            body: JSON.stringify(sendNotif),
                          })
                          if (data.success) {
                            setMessage({ type: 'success', text: data.data?.message || 'Notification sent!' })
                            setSendNotif({ type: 'SYSTEM', title: '', message: '' })
                            fetchSentNotifications()
                          } else {
                            setMessage({ type: 'error', text: data.error || 'Failed to send notification' })
                          }
                        }
                      } catch {
                        setMessage({ type: 'error', text: 'Failed to send notification' })
                      }
                      setSendingNotif(false)
                    }}
                    disabled={sendingNotif}
                    className="w-full bg-primary hover:bg-primary/90 text-black font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {sendingNotif ? 'Sending...' : sendMode === 'targeted' ? `Send to ${targetUsers.length} User(s)` : 'Send to All Users'}
                  </button>
                </div>
                )}
              </div>

              {/* Sent Notifications History */}
              <div className="pt-6 border-t border-[#2a2a2a]">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                    className="flex items-center gap-2 text-white font-medium hover:text-primary transition-colors"
                  >
                    <Icon name={isHistoryExpanded ? 'chevron-up' : 'chevron-down'} size={18} />
                    <span>Sent Notifications History</span>
                  </button>
                  <div className="flex items-center gap-2">
                    {isHistoryExpanded && sentNotifications.length > 0 && (
                      <>
                        {selectedBatchIds.size > 0 && (
                          <button
                            onClick={deleteSelected}
                            disabled={deletingBulk}
                            className="text-sm px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-colors disabled:opacity-50"
                          >
                            Delete Selected ({selectedBatchIds.size})
                          </button>
                        )}
                        <button
                          onClick={deleteAll}
                          disabled={deletingBulk}
                          className="text-sm px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-colors disabled:opacity-50"
                        >
                          Delete All
                        </button>
                      </>
                    )}
                    <button
                      onClick={fetchSentNotifications}
                      disabled={loadingSent}
                      className="text-sm text-primary hover:text-primary/80 disabled:opacity-50"
                    >
                      {loadingSent ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>
                </div>

                {isHistoryExpanded && (
                  <>
                    {loadingSent ? (
                      <div className="text-center py-8 text-slate-500">Loading sent notifications...</div>
                    ) : sentNotifications.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">No notifications sent yet</div>
                    ) : (
                      <div className="space-y-2">
                        {/* Select All row */}
                        <div className="flex items-center gap-3 px-1 pb-1">
                          <input
                            type="checkbox"
                            checked={selectedBatchIds.size === sentNotifications.length}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 accent-primary cursor-pointer"
                          />
                          <span className="text-xs text-slate-500">Select all</span>
                        </div>
                        {sentNotifications.map((batch) => (
                          <div
                            key={batch.batchId}
                            className={`p-4 bg-[#1a1a1a] rounded-lg border transition-colors ${selectedBatchIds.has(batch.batchId) ? 'border-primary/40' : 'border-[#2a2a2a]'}`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={selectedBatchIds.has(batch.batchId)}
                                onChange={() => toggleSelectBatch(batch.batchId)}
                                className="mt-1 w-4 h-4 accent-primary cursor-pointer flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0 flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded ${
                                        batch.type === 'PROMOTIONAL' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                                      }`}
                                    >
                                      {batch.type}
                                    </span>
                                    <span className="text-sm text-white font-medium truncate">{batch.title}</span>
                                  </div>
                                  <p className="text-sm text-slate-400 line-clamp-1">{batch.message}</p>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                    <span>{batch.stats.total} recipients</span>
                                    <span
                                      className={`px-2 py-0.5 rounded ${
                                        batch.stats.unread > 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
                                      }`}
                                    >
                                      {batch.stats.unread} unread / {batch.stats.total} total
                                    </span>
                                    <span>{new Date(batch.sentAt).toLocaleString()}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedBatch(batch)
                                      fetchRecipients(batch.batchId)
                                    }}
                                    className="text-sm px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded transition-colors"
                                  >
                                    View Recipients
                                  </button>
                                  <button
                                    onClick={() => deleteBatch(batch.batchId)}
                                    className="text-sm px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Recipients Modal */}
              {selectedBatch && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedBatch(null)}>
                  <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] max-w-3xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    <div className="p-6 border-b border-[#2a2a2a]">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                selectedBatch.type === 'PROMOTIONAL' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                              }`}
                            >
                              {selectedBatch.type}
                            </span>
                            <h3 className="text-lg font-medium text-white">{selectedBatch.title}</h3>
                          </div>
                          <p className="text-slate-400 text-sm mb-2">{selectedBatch.message}</p>
                          <p className="text-xs text-slate-500">Sent: {new Date(selectedBatch.sentAt).toLocaleString()}</p>
                        </div>
                        <button onClick={() => setSelectedBatch(null)} className="text-slate-400 hover:text-white">
                          <Icon name="x" size={20} />
                        </button>
                      </div>
                    </div>

                    <div className="p-6 overflow-y-auto max-h-[60vh]">
                      {loadingRecipients ? (
                        <div className="text-center py-8 text-slate-500">Loading recipients...</div>
                      ) : recipients.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">No recipients found</div>
                      ) : (
                        <div className="space-y-2">
                          {recipients.map((recipient) => (
                            <div key={recipient.id} className="flex items-center justify-between p-3 bg-[#141414] rounded-lg">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-white font-medium">{recipient.name || 'Unknown'}</span>
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded ${
                                      recipient.isRead ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                    }`}
                                  >
                                    {recipient.isRead ? 'Read' : 'Unread'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500">{recipient.email}</p>
                                {recipient.readAt && (
                                  <p className="text-xs text-slate-600 mt-0.5">Read: {new Date(recipient.readAt).toLocaleString()}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment Settings */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              {/* Test Connections */}
              {(paymentSettings.stripeEnabled || paymentSettings.paystackEnabled || paymentSettings.paypalEnabled) && (
                <div className="p-5 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
                  <h3 className="text-white font-medium mb-3">Test Connections</h3>
                  <p className="text-slate-500 text-sm mb-4">Verify your payment provider credentials are working correctly.</p>
                  <div className="flex flex-wrap gap-3">
                    {paymentSettings.stripeEnabled && (
                      <button
                        onClick={() => handleTestPayment('stripe')}
                        disabled={testingPayment === 'stripe'}
                        className="px-4 py-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg text-sm hover:bg-purple-500/20 transition-colors disabled:opacity-50"
                      >
                        {testingPayment === 'stripe' ? 'Testing...' : 'Test Stripe'}
                      </button>
                    )}
                    {paymentSettings.paystackEnabled && (
                      <button
                        onClick={() => handleTestPayment('paystack')}
                        disabled={testingPayment === 'paystack'}
                        className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                      >
                        {testingPayment === 'paystack' ? 'Testing...' : 'Test Paystack'}
                      </button>
                    )}
                    {paymentSettings.paypalEnabled && (
                      <button
                        onClick={() => handleTestPayment('paypal')}
                        disabled={testingPayment === 'paypal'}
                        className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                      >
                        {testingPayment === 'paypal' ? 'Testing...' : 'Test PayPal'}
                      </button>
                    )}
                  </div>
                  {paymentTestResult && (
                    <div className={`mt-3 p-3 rounded-lg text-sm ${paymentTestResult.success ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                      <strong>{paymentTestResult.provider}:</strong> {paymentTestResult.message}
                    </div>
                  )}
                </div>
              )}

              {/* Web3 Wallet */}
              <div className="p-5 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon name="wallet" size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Web3 Wallet Payments</p>
                      <p className="text-slate-500 text-sm">Accept crypto payments via MetaMask, WalletConnect, Coinbase Wallet, etc.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPaymentSettings({ ...paymentSettings, walletEnabled: !paymentSettings.walletEnabled })}
                    className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                      paymentSettings.walletEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        paymentSettings.walletEnabled ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
                {paymentSettings.walletEnabled && (
                  <div className="mt-4 pt-4 border-t border-[#2a2a2a]">
                    <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                      <Icon name="info" size={16} className="text-primary flex-shrink-0" />
                      <p className="text-slate-300 text-xs">
                        Users can pay directly with their Web3 wallets (MetaMask, WalletConnect, Coinbase Wallet, etc.) on ETH, BNB, and Polygon networks. Configure receiving wallet address in your environment variables.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Stripe */}
              <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleSection('stripe')}
                    className="flex items-center gap-4 flex-1 text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <Icon name="credit-card" size={24} className="text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-lg">Stripe</p>
                      <p className="text-slate-500 text-sm">Accept credit card payments</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setPaymentSettings({ ...paymentSettings, stripeEnabled: !paymentSettings.stripeEnabled })}
                      className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                        paymentSettings.stripeEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          paymentSettings.stripeEnabled ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                    <Icon
                      name={expandedSections.stripe ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      className="text-slate-400 flex-shrink-0"
                    />
                  </div>
                </div>
                {expandedSections.stripe && (
                  <div className="space-y-4 mt-6 pt-6 border-t border-[#1f1f1f]">
                    {/* Test / Live Toggle */}
                    <div className="flex items-center gap-3">
                      <div className="flex bg-[#141414] rounded-lg border border-[#2a2a2a] p-1">
                        <button
                          type="button"
                          onClick={() => setPaymentSettings({ ...paymentSettings, stripeMode: 'test' })}
                          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            paymentSettings.stripeMode === 'test'
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Test Mode
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentSettings({ ...paymentSettings, stripeMode: 'live' })}
                          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            paymentSettings.stripeMode === 'live'
                              ? 'bg-green-500/20 text-green-400'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Live Mode
                        </button>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        paymentSettings.stripeMode === 'test'
                          ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                          : 'bg-green-500/10 text-green-400 border-green-500/20'
                      }`}>
                        {paymentSettings.stripeMode === 'test' ? 'TEST MODE' : 'LIVE'}
                      </span>
                    </div>

                    {/* Key Fields */}
                    {(() => {
                      const prefix = paymentSettings.stripeMode === 'test' ? 'stripeTest' : 'stripeLive'
                      const pkPlaceholder = paymentSettings.stripeMode === 'test' ? 'pk_test_...' : 'pk_live_...'
                      const skPlaceholder = paymentSettings.stripeMode === 'test' ? 'sk_test_...' : 'sk_live_...'
                      const fields = [
                        { key: `${prefix}PublicKey` as keyof typeof paymentSettings, label: 'Publishable Key', placeholder: pkPlaceholder, secret: false },
                        { key: `${prefix}SecretKey` as keyof typeof paymentSettings, label: 'Secret Key', placeholder: skPlaceholder, secret: true },
                        { key: `${prefix}WebhookSecret` as keyof typeof paymentSettings, label: 'Webhook Secret', placeholder: 'whsec_...', secret: true },
                      ]
                      return (
                        <div className="space-y-3">
                          {fields.map((field) => (
                            <div key={field.key} className="space-y-1.5">
                              <label className="text-sm font-medium text-slate-300">{field.label}</label>
                              <div className="relative">
                                <input
                                  type={field.secret && !showStripeSecrets[field.key] ? 'password' : 'text'}
                                  value={paymentSettings[field.key] as string}
                                  onChange={(e) => setPaymentSettings({ ...paymentSettings, [field.key]: e.target.value })}
                                  placeholder={field.placeholder}
                                  className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-primary/50 pr-12"
                                />
                                {field.secret && (
                                  <button
                                    type="button"
                                    onClick={() => setShowStripeSecrets((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                  >
                                    <Icon name={showStripeSecrets[field.key] ? 'eye-off' : 'eye'} size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>

              {/* Paystack */}
              <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleSection('paystack')}
                    className="flex items-center gap-4 flex-1 text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Icon name="credit-card" size={24} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-lg">Paystack</p>
                      <p className="text-slate-500 text-sm">Accept payments in Africa (Nigeria, Ghana, Kenya, South Africa)</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setPaymentSettings({ ...paymentSettings, paystackEnabled: !paymentSettings.paystackEnabled })}
                      className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                        paymentSettings.paystackEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          paymentSettings.paystackEnabled ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                    <Icon
                      name={expandedSections.paystack ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      className="text-slate-400 flex-shrink-0"
                    />
                  </div>
                </div>
                {expandedSections.paystack && (
                  <div className="space-y-4 mt-6 pt-6 border-t border-[#1f1f1f]">
                    {/* Test / Live Toggle */}
                    <div className="flex items-center gap-3">
                      <div className="flex bg-[#141414] rounded-lg border border-[#2a2a2a] p-1">
                        <button
                          type="button"
                          onClick={() => setPaymentSettings({ ...paymentSettings, paystackMode: 'test' })}
                          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            paymentSettings.paystackMode === 'test'
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Test Mode
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentSettings({ ...paymentSettings, paystackMode: 'live' })}
                          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            paymentSettings.paystackMode === 'live'
                              ? 'bg-green-500/20 text-green-400'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Live Mode
                        </button>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        paymentSettings.paystackMode === 'test'
                          ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                          : 'bg-green-500/10 text-green-400 border-green-500/20'
                      }`}>
                        {paymentSettings.paystackMode === 'test' ? 'TEST MODE' : 'LIVE'}
                      </span>
                    </div>

                    {/* Key Fields */}
                    {(() => {
                      const prefix = paymentSettings.paystackMode === 'test' ? 'paystackTest' : 'paystackLive'
                      const fields = [
                        { key: `${prefix}PublicKey` as keyof typeof paymentSettings, label: 'Public Key', placeholder: 'pk_test_...', secret: false },
                        { key: `${prefix}SecretKey` as keyof typeof paymentSettings, label: 'Secret Key', placeholder: 'sk_test_...', secret: true },
                        { key: `${prefix}WebhookSecret` as keyof typeof paymentSettings, label: 'Webhook Secret', placeholder: 'whsec_...', secret: true },
                      ]
                      return (
                        <div className="space-y-3">
                          {fields.map((field) => (
                            <div key={field.key} className="space-y-1.5">
                              <label className="text-sm font-medium text-slate-300">{field.label}</label>
                              <div className="relative">
                                <input
                                  type={field.secret && !showPaystackSecrets[field.key] ? 'password' : 'text'}
                                  value={paymentSettings[field.key] as string}
                                  onChange={(e) => setPaymentSettings({ ...paymentSettings, [field.key]: e.target.value })}
                                  placeholder={field.placeholder}
                                  className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-primary/50 pr-12"
                                />
                                {field.secret && (
                                  <button
                                    type="button"
                                    onClick={() => setShowPaystackSecrets((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                  >
                                    <Icon name={showPaystackSecrets[field.key] ? 'eye-off' : 'eye'} size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })()}

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mt-4">
                      <p className="text-blue-400 text-xs">
                        <strong>Get your Paystack keys:</strong> Visit{' '}
                        <a
                          href="https://dashboard.paystack.com/#/settings/developers"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          Paystack Dashboard → Settings → API Keys & Webhooks
                        </a>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Enhanced Crypto */}
              <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleSection('crypto')}
                    className="flex items-center gap-4 flex-1 text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                      <Icon name="bitcoin" size={24} className="text-orange-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-lg">Cryptocurrency Payments</p>
                      <p className="text-slate-500 text-sm">BTC, ETH, USDT, BNB, USDC, SOL/Phantom</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setPaymentSettings({ ...paymentSettings, cryptoEnabled: !paymentSettings.cryptoEnabled })}
                      className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                        paymentSettings.cryptoEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          paymentSettings.cryptoEnabled ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                    <Icon
                      name={expandedSections.crypto ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      className="text-slate-400 flex-shrink-0"
                    />
                  </div>
                </div>

                {expandedSections.crypto && (
                  <div className="space-y-4 mt-6 pt-6 border-t border-[#1f1f1f]">
                    {/* Payment Method Toggle */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Payment Method</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentSettings({ ...paymentSettings, cryptoMethod: 'manual' })}
                          className={`flex-1 px-4 py-3 rounded-lg border transition-colors ${
                            paymentSettings.cryptoMethod === 'manual'
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-[#141414] border-[#2a2a2a] text-slate-400'
                          }`}
                        >
                          <div className="text-left">
                            <div className="font-medium text-sm">Manual Wallets</div>
                            <div className="text-xs opacity-80">Customers send to your wallet addresses</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentSettings({ ...paymentSettings, cryptoMethod: 'processor' })}
                          className={`flex-1 px-4 py-3 rounded-lg border transition-colors ${
                            paymentSettings.cryptoMethod === 'processor'
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-[#141414] border-[#2a2a2a] text-slate-400'
                          }`}
                        >
                          <div className="text-left">
                            <div className="font-medium text-sm">Third-Party Processor</div>
                            <div className="text-xs opacity-80">CoinBase Commerce, NOWPayments, etc.</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {paymentSettings.cryptoMethod === 'manual' && (
                      <div className="space-y-3 p-4 bg-[#0a0a0a] rounded-lg">
                        <h4 className="text-sm font-medium text-white mb-3">Wallet Addresses</h4>

                        {/* Receiving Wallet (for Web3 payments) */}
                        <div className="space-y-1.5 pb-3 border-b border-[#2a2a2a]">
                          <label className="text-sm text-slate-400 flex items-center gap-2">
                            <Icon name="wallet" size={14} className="text-primary" />
                            Receiving Wallet Address (Web3 Payments)
                          </label>
                          <input
                            type="text"
                            value={paymentSettings.receivingWalletAddress || ''}
                            onChange={(e) => setPaymentSettings({ ...paymentSettings, receivingWalletAddress: e.target.value })}
                            placeholder="0x... (for MetaMask, Trust Wallet, Phantom, etc.)"
                            className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-primary/50"
                          />
                          <p className="text-xs text-slate-500">This wallet receives payments from Web3 wallets (MetaMask, Trust Wallet, Phantom). Supports ETH and EVM-compatible chains.</p>
                        </div>

                        {/* BTC */}
                        <div className="space-y-1.5">
                          <label className="text-sm text-slate-400 flex items-center gap-2">
                            <Icon name="bitcoin" size={14} className="text-orange-400" />
                            Bitcoin (BTC)
                          </label>
                          <input
                            type="text"
                            value={paymentSettings.btcAddress || ''}
                            onChange={(e) => setPaymentSettings({ ...paymentSettings, btcAddress: e.target.value })}
                            placeholder="bc1q... (Native SegWit address)"
                            className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-primary/50"
                          />
                        </div>

                        {/* ETH */}
                        <div className="space-y-1.5">
                          <label className="text-sm text-slate-400 flex items-center gap-2">
                            <Icon name="globe" size={14} className="text-purple-400" />
                            Ethereum (ETH)
                          </label>
                          <input
                            type="text"
                            value={paymentSettings.ethAddress || ''}
                            onChange={(e) => setPaymentSettings({ ...paymentSettings, ethAddress: e.target.value })}
                            placeholder="0x... (ERC20 compatible)"
                            className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-primary/50"
                          />
                        </div>

                        {/* USDT (ERC20) */}
                        <div className="space-y-1.5">
                          <label className="text-sm text-slate-400 flex items-center gap-2">
                            <Icon name="dollar" size={14} className="text-green-400" />
                            USDT (Ethereum ERC20)
                          </label>
                          <input
                            type="text"
                            value={paymentSettings.usdtEthAddress || ''}
                            onChange={(e) => setPaymentSettings({ ...paymentSettings, usdtEthAddress: e.target.value })}
                            placeholder="0x... (ERC20 - Ethereum network)"
                            className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-primary/50"
                          />
                        </div>

                        {/* USDT (BEP20) */}
                        <div className="space-y-1.5">
                          <label className="text-sm text-slate-400 flex items-center gap-2">
                            <Icon name="dollar" size={14} className="text-yellow-400" />
                            USDT (BSC BEP20)
                          </label>
                          <input
                            type="text"
                            value={paymentSettings.usdtBscAddress || ''}
                            onChange={(e) => setPaymentSettings({ ...paymentSettings, usdtBscAddress: e.target.value })}
                            placeholder="0x... (BEP20 - Binance Smart Chain)"
                            className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-primary/50"
                          />
                        </div>

                        {/* USDT (TRC20) */}
                        <div className="space-y-1.5">
                          <label className="text-sm text-slate-400 flex items-center gap-2">
                            <Icon name="dollar" size={14} className="text-red-400" />
                            USDT (Tron TRC20)
                          </label>
                          <input
                            type="text"
                            value={paymentSettings.usdtTronAddress || ''}
                            onChange={(e) => setPaymentSettings({ ...paymentSettings, usdtTronAddress: e.target.value })}
                            placeholder="T... (TRC20 - Tron network)"
                            className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-primary/50"
                          />
                        </div>

                        {/* BNB */}
                        <div className="space-y-1.5">
                          <label className="text-sm text-slate-400 flex items-center gap-2">
                            <Icon name="globe" size={14} className="text-yellow-400" />
                            BNB (Binance Coin)
                          </label>
                          <input
                            type="text"
                            value={paymentSettings.bnbAddress || ''}
                            onChange={(e) => setPaymentSettings({ ...paymentSettings, bnbAddress: e.target.value })}
                            placeholder="0x... (BEP20)"
                            className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-primary/50"
                          />
                        </div>

                        {/* USDC */}
                        <div className="space-y-1.5">
                          <label className="text-sm text-slate-400 flex items-center gap-2">
                            <Icon name="dollar" size={14} className="text-blue-400" />
                            USDC (USD Coin)
                          </label>
                          <input
                            type="text"
                            value={paymentSettings.usdcAddress || ''}
                            onChange={(e) => setPaymentSettings({ ...paymentSettings, usdcAddress: e.target.value })}
                            placeholder="0x... (ERC20 or specify chain)"
                            className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-primary/50"
                          />
                        </div>

                        {/* SOL/Phantom */}
                        <div className="space-y-1.5">
                          <label className="text-sm text-slate-400 flex items-center gap-2">
                            <Icon name="zap" size={14} className="text-purple-400" />
                            Solana (SOL / Phantom)
                          </label>
                          <input
                            type="text"
                            value={paymentSettings.solAddress || ''}
                            onChange={(e) => setPaymentSettings({ ...paymentSettings, solAddress: e.target.value })}
                            placeholder="Solana address (base58)"
                            className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-primary/50"
                          />
                        </div>
                      </div>
                    )}

                    {paymentSettings.cryptoMethod === 'processor' && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-300">Select Processor</label>
                          <select
                            value={paymentSettings.cryptoProcessor || 'coinbase'}
                            onChange={(e) => setPaymentSettings({ ...paymentSettings, cryptoProcessor: e.target.value })}
                            className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                          >
                            <option value="coinbase">Coinbase Commerce</option>
                            <option value="nowpayments">NOWPayments</option>
                            <option value="coinpayments">CoinPayments</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-300">API Key</label>
                          <input
                            type="text"
                            value={paymentSettings.cryptoApiKey || ''}
                            onChange={(e) => setPaymentSettings({ ...paymentSettings, cryptoApiKey: e.target.value })}
                            placeholder="Enter your API key..."
                            className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-primary/50"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-300">Webhook Secret</label>
                          <input
                            type="password"
                            value={paymentSettings.cryptoWebhookSecret || ''}
                            onChange={(e) => setPaymentSettings({ ...paymentSettings, cryptoWebhookSecret: e.target.value })}
                            placeholder="Webhook secret..."
                            className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-primary/50"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Enhanced PayPal */}
              <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleSection('paypal')}
                    className="flex items-center gap-4 flex-1 text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Icon name="wallet" size={24} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-lg">PayPal</p>
                      <p className="text-slate-500 text-sm">Accept PayPal and credit cards</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setPaymentSettings({ ...paymentSettings, paypalEnabled: !paymentSettings.paypalEnabled })}
                      className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                        paymentSettings.paypalEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          paymentSettings.paypalEnabled ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                    <Icon
                      name={expandedSections.paypal ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      className="text-slate-400 flex-shrink-0"
                    />
                  </div>
                </div>

                {expandedSections.paypal && (
                  <div className="space-y-4 mt-6 pt-6 border-t border-[#1f1f1f]">
                    {/* Platform Choice */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">PayPal Platform</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentSettings({ ...paymentSettings, paypalPlatform: 'express' })}
                          className={`flex-1 px-4 py-3 rounded-lg border transition-colors ${
                            paymentSettings.paypalPlatform === 'express'
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-[#141414] border-[#2a2a2a] text-slate-400'
                          }`}
                        >
                          <div className="text-left">
                            <div className="font-medium text-sm">Express Checkout</div>
                            <div className="text-xs opacity-80">Simple PayPal button integration</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentSettings({ ...paymentSettings, paypalPlatform: 'commerce' })}
                          className={`flex-1 px-4 py-3 rounded-lg border transition-colors ${
                            paymentSettings.paypalPlatform === 'commerce'
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-[#141414] border-[#2a2a2a] text-slate-400'
                          }`}
                        >
                          <div className="text-left">
                            <div className="font-medium text-sm">Commerce Platform</div>
                            <div className="text-xs opacity-80">Advanced features & subscriptions</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Test/Live Mode Toggle */}
                    <div className="flex items-center gap-3">
                      <div className="flex bg-[#141414] rounded-lg border border-[#2a2a2a] p-1">
                        <button
                          type="button"
                          onClick={() => setPaymentSettings({ ...paymentSettings, paypalMode: 'test' })}
                          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            paymentSettings.paypalMode === 'test'
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Sandbox
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentSettings({ ...paymentSettings, paypalMode: 'live' })}
                          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            paymentSettings.paypalMode === 'live'
                              ? 'bg-green-500/20 text-green-400'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Live Mode
                        </button>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        paymentSettings.paypalMode === 'test'
                          ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                          : 'bg-green-500/10 text-green-400 border-green-500/20'
                      }`}>
                        {paymentSettings.paypalMode === 'test' ? 'SANDBOX' : 'LIVE'}
                      </span>
                    </div>

                    {/* API Credentials */}
                    {(() => {
                      const prefix = paymentSettings.paypalMode === 'test' ? 'paypalTest' : 'paypalLive'
                      return (
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-300">Client ID</label>
                            <input
                              type="text"
                              value={paymentSettings[`${prefix}ClientId` as keyof typeof paymentSettings] as string || ''}
                              onChange={(e) => setPaymentSettings({ ...paymentSettings, [`${prefix}ClientId`]: e.target.value })}
                              placeholder={paymentSettings.paypalMode === 'test' ? 'Sandbox Client ID' : 'Live Client ID'}
                              className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-primary/50"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-300">Secret Key</label>
                            <input
                              type="password"
                              value={paymentSettings[`${prefix}SecretKey` as keyof typeof paymentSettings] as string || ''}
                              onChange={(e) => setPaymentSettings({ ...paymentSettings, [`${prefix}SecretKey`]: e.target.value })}
                              placeholder={paymentSettings.paypalMode === 'test' ? 'Sandbox Secret' : 'Live Secret'}
                              className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-primary/50"
                            />
                          </div>
                        </div>
                      )
                    })()}

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mt-4">
                      <p className="text-blue-400 text-xs">
                        <strong>Get your PayPal keys:</strong> Visit{' '}
                        <a
                          href="https://developer.paypal.com/dashboard/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          PayPal Developer Dashboard
                        </a>
                        {' '}to create a REST API app and get your credentials.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Auto Withdraw */}
              <div className="pt-4 border-t border-[#2a2a2a]">
                <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] mb-4">
                  <div>
                    <p className="text-white font-medium">Auto Withdraw</p>
                    <p className="text-slate-500 text-sm">Automatically withdraw funds when threshold is reached</p>
                  </div>
                  <button
                    onClick={() => setPaymentSettings({ ...paymentSettings, autoWithdraw: !paymentSettings.autoWithdraw })}
                    className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                      paymentSettings.autoWithdraw ? 'bg-primary' : 'bg-[#2a2a2a]'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        paymentSettings.autoWithdraw ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {paymentSettings.autoWithdraw && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Withdrawal Threshold ($)</label>
                    <input
                      type="number"
                      value={paymentSettings.withdrawThreshold}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, withdrawThreshold: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                    />
                  </div>
                )}
              </div>

              {/* Wallet Deposits */}
            <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => toggleSection('walletDeposits')}
                  className="flex items-center gap-4 flex-1 text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon name="wallet" size={24} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-lg">Wallet Deposits</p>
                    <p className="text-slate-500 text-sm">Configure which deposit methods customers can use to add funds to their wallet</p>
                  </div>
                </button>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setPaymentSettings({ ...paymentSettings, walletDepositsEnabled: !paymentSettings.walletDepositsEnabled })}
                    className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${paymentSettings.walletDepositsEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${paymentSettings.walletDepositsEnabled ? 'left-7' : 'left-1'}`} />
                  </button>
                  <Icon
                    name={expandedSections.walletDeposits ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    className="text-slate-400 flex-shrink-0"
                  />
                </div>
              </div>

              {expandedSections.walletDeposits && (
                <div className="space-y-4 mt-6 pt-6 border-t border-[#1f1f1f]">
                  {/* Min/Max deposit amounts */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Minimum Deposit (USD)</label>
                      <input
                        type="number"
                        min="1"
                        value={paymentSettings.depositMinAmount}
                        onChange={(e) => setPaymentSettings({ ...paymentSettings, depositMinAmount: e.target.value })}
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Maximum Deposit (USD)</label>
                      <input
                        type="number"
                        min="1"
                        value={paymentSettings.depositMaxAmount}
                        onChange={(e) => setPaymentSettings({ ...paymentSettings, depositMaxAmount: e.target.value })}
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                      />
                    </div>
                  </div>

                  {/* Deposit method toggles */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Enabled Deposit Methods</label>
                    {[
                      { key: 'depositCardEnabled', label: 'Credit / Debit Card (Stripe)', desc: 'Card payments via Stripe — instant deposit' },
                      { key: 'depositPaystackEnabled', label: 'Paystack (Africa)', desc: 'Card, bank transfer, USSD and mobile money for African markets' },
                      { key: 'depositPaypalEnabled', label: 'PayPal', desc: 'Redirect-based PayPal checkout' },
                      { key: 'depositCryptoEnabled', label: 'Cryptocurrency (BTC, ETH, USDT)', desc: 'Manual crypto deposits — admin reviews tx hash' },
                      { key: 'depositBankEnabled', label: 'Bank Transfer', desc: 'Manual bank transfer — admin approves on proof upload' },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                        <div>
                          <p className="text-white text-sm font-medium">{label}</p>
                          <p className="text-slate-500 text-xs">{desc}</p>
                        </div>
                        <button
                          onClick={() => setPaymentSettings({ ...paymentSettings, [key]: !(paymentSettings as any)[key] })}
                          className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${(paymentSettings as any)[key] ? 'bg-primary' : 'bg-[#2a2a2a]'}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${(paymentSettings as any)[key] ? 'left-5' : 'left-0.5'}`} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Bank Transfer Account Details */}
                  {paymentSettings.depositBankEnabled && (
                    <div className="mt-6 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                      <button
                        onClick={() => toggleSection('bankTransfer')}
                        className="w-full flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Icon name="bank" size={20} className="text-primary" />
                          </div>
                          <div className="text-left">
                            <p className="text-white font-semibold">Bank Transfer Account Details</p>
                            <p className="text-slate-500 text-xs">Configure the bank account where customers should send transfers</p>
                          </div>
                        </div>
                        <Icon
                          name={expandedSections.bankTransfer ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          className="text-slate-400 flex-shrink-0"
                        />
                      </button>
                      {expandedSections.bankTransfer && (
                      <div className="mt-4 pt-4 border-t border-[#1f1f1f]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-300">
                            Account Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="John Doe"
                            value={paymentSettings.bankAccountName}
                            onChange={(e) => setPaymentSettings({ ...paymentSettings, bankAccountName: e.target.value })}
                            className="w-full bg-black border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-300">
                            Account Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="1234567890"
                            value={paymentSettings.bankAccountNumber}
                            onChange={(e) => setPaymentSettings({ ...paymentSettings, bankAccountNumber: e.target.value })}
                            className="w-full bg-black border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-300">
                            Bank Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Chase Bank"
                            value={paymentSettings.bankBankName}
                            onChange={(e) => setPaymentSettings({ ...paymentSettings, bankBankName: e.target.value })}
                            className="w-full bg-black border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-300">Routing / Sort Code</label>
                          <input
                            type="text"
                            placeholder="021000021"
                            value={paymentSettings.bankRoutingNumber}
                            onChange={(e) => setPaymentSettings({ ...paymentSettings, bankRoutingNumber: e.target.value })}
                            className="w-full bg-black border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-medium text-slate-300">Transfer Instructions</label>
                          <textarea
                            placeholder="Additional instructions for customers (e.g., reference format, processing time)..."
                            value={paymentSettings.bankInstructions}
                            onChange={(e) => setPaymentSettings({ ...paymentSettings, bankInstructions: e.target.value })}
                            rows={3}
                            className="w-full bg-black border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 resize-none"
                          />
                        </div>
                      </div>
                      </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            </div>
          )}

          {/* API Settings */}
          {activeTab === 'api' && (
            <div className="space-y-8">
              {/* API Access Card */}
              <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
                <button
                  onClick={() => toggleSection('apiAccess')}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon name="code" size={24} className="text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-white font-semibold text-lg">API Access</p>
                      <p className="text-slate-500 text-sm">Rate limits and webhook configuration</p>
                    </div>
                  </div>
                  <Icon
                    name={expandedSections.apiAccess ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    className="text-slate-400 flex-shrink-0"
                  />
                </button>

                {expandedSections.apiAccess && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-[#1f1f1f]">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Rate Limit (requests/hour)</label>
                      <input
                        type="number"
                        value={apiSettings.rateLimit}
                        onChange={(e) => setApiSettings({ ...apiSettings, rateLimit: e.target.value })}
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Webhook URL</label>
                      <input
                        type="url"
                        value={apiSettings.webhookUrl}
                        onChange={(e) => setApiSettings({ ...apiSettings, webhookUrl: e.target.value })}
                        placeholder="https://your-server.com/webhook"
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Cron Jobs Card */}
              <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
                <button
                  onClick={() => toggleSection('cronJobs')}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Icon name="clock" size={24} className="text-amber-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-white font-semibold text-lg">Cron Jobs</p>
                      <p className="text-slate-500 text-sm">Scheduled cleanup tasks and secret management</p>
                    </div>
                  </div>
                  <Icon
                    name={expandedSections.cronJobs ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    className="text-slate-400 flex-shrink-0"
                  />
                </button>

                {expandedSections.cronJobs && (
                  <div className="mt-6 pt-6 border-t border-[#1f1f1f] space-y-6">
                    <div className="bg-[#1a1a1a] rounded-lg p-4">
                      <h4 className="text-white font-medium mb-2">About Cron Jobs</h4>
                      <p className="text-slate-400 text-sm mb-3">
                        Cron jobs run scheduled cleanup tasks to maintain your store. These include:
                      </p>
                      <ul className="text-slate-400 text-sm list-disc list-inside space-y-1">
                        <li>Releasing stale eSIM inventory reservations</li>
                        <li>Retrying failed eSIM provisions</li>
                        <li>Releasing expired gift card reservations</li>
                        <li>Marking expired gift card codes</li>
                        <li>Expiring virtual numbers</li>
                      </ul>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg">
                      <div>
                        <p className="text-white font-medium">Enable Cron Jobs</p>
                        <p className="text-slate-500 text-sm">Allow scheduled cleanup tasks to run</p>
                      </div>
                      <button
                        onClick={() => setCronSettings({ ...cronSettings, cronEnabled: !cronSettings.cronEnabled })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          cronSettings.cronEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            cronSettings.cronEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-300">Cron Secret</label>
                        <button
                          onClick={() => {
                            const newSecret = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
                            setCronSettings({ ...cronSettings, cronSecret: newSecret })
                          }}
                          className="text-xs text-primary hover:text-primary/80 font-medium"
                        >
                          Generate New Secret
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showCronSecret ? 'text' : 'password'}
                          value={cronSettings.cronSecret}
                          onChange={(e) => setCronSettings({ ...cronSettings, cronSecret: e.target.value })}
                          placeholder="Enter or generate a cron secret"
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCronSecret(!showCronSecret)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          <Icon name={showCronSecret ? 'eye-off' : 'eye'} size={18} />
                        </button>
                      </div>
                      <p className="text-xs text-slate-600">
                        This secret authenticates cron requests. Keep it secure and use it when configuring external cron services.
                      </p>
                    </div>

                    <div className="bg-[#1a1a1a] rounded-lg p-4">
                      <h4 className="text-white font-medium mb-3">Cron Endpoint</h4>
                      <div className="space-y-3">
                        <div>
                          <p className="text-slate-400 text-sm mb-1">URL:</p>
                          <code className="text-xs bg-[#0f0f0f] text-primary px-3 py-2 rounded block overflow-x-auto">
                            {typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/cron/cleanup
                          </code>
                        </div>
                        <div>
                          <p className="text-slate-400 text-sm mb-1">Authorization Header:</p>
                          <code className="text-xs bg-[#0f0f0f] text-primary px-3 py-2 rounded block">
                            Authorization: Bearer {cronSettings.cronSecret || '<your-cron-secret>'}
                          </code>
                        </div>
                        <div>
                          <p className="text-slate-400 text-sm mb-1">Schedule:</p>
                          <p className="text-white text-sm">Every 15 minutes (configured in vercel.json)</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Icon name="alert" size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-amber-400 font-medium text-sm">External Cron Service</p>
                          <p className="text-amber-400/80 text-xs mt-1">
                            If not using Vercel Cron, you can set up an external service like cron-job.org to call this endpoint.
                            Configure it to make a GET request every 15-30 minutes with the Authorization header above.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* All sections below are always visible */}
              <>
                  {/* Exchange Rate APIs Card */}
                  <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
                    <button
                      onClick={() => toggleSection('exchangeRates')}
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <Icon name="chart" size={20} className="text-green-400" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-white font-semibold text-lg">Exchange Rate APIs</h3>
                          <p className="text-slate-500 text-sm">Optional API keys for live currency exchange rates</p>
                        </div>
                      </div>
                      <Icon
                        name={expandedSections.exchangeRates ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        className="text-slate-400 flex-shrink-0"
                      />
                    </button>
                    {expandedSections.exchangeRates && (
                      <>
                        <p className="text-slate-600 text-sm mb-4 mt-4">Free endpoints are used when keys are not provided, but API keys give higher rate limits.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">ExchangeRate-API Key</label>
                        <input
                          type="password"
                          value={exchangeRateKeys.exchangerate_api_key}
                          onChange={(e) => setExchangeRateKeys({ ...exchangeRateKeys, exchangerate_api_key: e.target.value })}
                          placeholder="Your ExchangeRate-API key (optional)"
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                        />
                        <p className="text-xs text-slate-600">For fiat currency rates (EUR, GBP, NGN, etc.)</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">CoinGecko API Key</label>
                        <input
                          type="password"
                          value={exchangeRateKeys.coingecko_api_key}
                          onChange={(e) => setExchangeRateKeys({ ...exchangeRateKeys, coingecko_api_key: e.target.value })}
                          placeholder="Your CoinGecko API key (optional)"
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                        />
                        <p className="text-xs text-slate-600">For crypto rates (BTC, ETH, BNB, SOL, USDT)</p>
                      </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* eSIM Providers Card */}
                  <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
                    <button
                      onClick={() => toggleSection('esimProviders')}
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Icon name="sim-card" size={20} className="text-blue-400" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-white font-semibold text-lg">eSIM Providers</h3>
                          <p className="text-slate-500 text-sm">Configure providers for selling travel eSIM data plans</p>
                        </div>
                      </div>
                      <Icon
                        name={expandedSections.esimProviders ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        className="text-slate-400 flex-shrink-0"
                      />
                    </button>

                    {expandedSections.esimProviders && (
                      <>
                        {/* Default Provider */}
                        <div className="mb-6 mt-6">
                      <label className="text-sm font-medium text-slate-300 mb-2 block">Default Provider</label>
                      <select
                        value={esimSettings.esimDefaultProvider}
                        onChange={(e) => setEsimSettings({ ...esimSettings, esimDefaultProvider: e.target.value as 'esimgo' | 'airalo' | 'mobimatter' })}
                        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-4 pr-10 py-3 text-white focus:outline-none focus:border-primary/50 min-w-[160px] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat"
                      >
                        <option value="esimgo">eSIM Go</option>
                        <option value="airalo">Airalo</option>
                        <option value="mobimatter">MobiMatter</option>
                      </select>
                    </div>

                    {/* eSIM Go */}
                    <div className="p-5 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] mb-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Icon name="sim-card" size={20} className="text-blue-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">eSIM Go</p>
                            <p className="text-slate-500 text-sm">No minimum order, good for testing</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEsimSettings({ ...esimSettings, esimGoEnabled: !esimSettings.esimGoEnabled })}
                          className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${esimSettings.esimGoEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${esimSettings.esimGoEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                      {esimSettings.esimGoEnabled && (
                        <div className="pt-4 border-t border-[#2a2a2a]">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">API Key</label>
                            <div className="relative">
                              <input
                                type={showServiceSecrets.esimGoApiKey ? 'text' : 'password'}
                                value={esimSettings.esimGoApiKey}
                                onChange={(e) => setEsimSettings({ ...esimSettings, esimGoApiKey: e.target.value })}
                                placeholder="Your eSIM Go API key"
                                className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 pr-12"
                              />
                              <button
                                type="button"
                                onClick={() => setShowServiceSecrets(prev => ({ ...prev, esimGoApiKey: !prev.esimGoApiKey }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                              >
                                <Icon name={showServiceSecrets.esimGoApiKey ? 'eye-off' : 'eye'} size={16} />
                              </button>
                            </div>
                            <p className="text-xs text-slate-600">Get your API key at <a href="https://esimgo.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">esimgo.com</a></p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Airalo */}
                    <div className="p-5 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <Icon name="globe" size={20} className="text-green-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">Airalo</p>
                            <p className="text-slate-500 text-sm">Best coverage, recommended for production</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEsimSettings({ ...esimSettings, airaloEnabled: !esimSettings.airaloEnabled })}
                          className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${esimSettings.airaloEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${esimSettings.airaloEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                      {esimSettings.airaloEnabled && (
                        <div className="pt-4 border-t border-[#2a2a2a] space-y-4">
                          {/* Mode Toggle */}
                          <div className="flex items-center gap-3">
                            <div className="flex bg-[#141414] rounded-lg border border-[#2a2a2a] p-1">
                              <button
                                type="button"
                                onClick={() => setEsimSettings({ ...esimSettings, airaloMode: 'sandbox' })}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${esimSettings.airaloMode === 'sandbox' ? 'bg-orange-500/20 text-orange-400' : 'text-slate-500 hover:text-slate-300'}`}
                              >
                                Sandbox
                              </button>
                              <button
                                type="button"
                                onClick={() => setEsimSettings({ ...esimSettings, airaloMode: 'production' })}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${esimSettings.airaloMode === 'production' ? 'bg-green-500/20 text-green-400' : 'text-slate-500 hover:text-slate-300'}`}
                              >
                                Production
                              </button>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${esimSettings.airaloMode === 'sandbox' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                              {esimSettings.airaloMode === 'sandbox' ? 'SANDBOX' : 'PRODUCTION'}
                            </span>
                          </div>

                          {/* Credentials based on mode */}
                          {(() => {
                            const prefix = esimSettings.airaloMode === 'sandbox' ? 'airaloSandbox' : 'airaloProduction'
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-slate-300">Client ID</label>
                                  <input
                                    type="text"
                                    value={esimSettings[`${prefix}ClientId` as keyof typeof esimSettings] as string}
                                    onChange={(e) => setEsimSettings({ ...esimSettings, [`${prefix}ClientId`]: e.target.value })}
                                    placeholder="Your Airalo Client ID"
                                    className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-slate-300">Client Secret</label>
                                  <div className="relative">
                                    <input
                                      type={showServiceSecrets[`${prefix}ClientSecret`] ? 'text' : 'password'}
                                      value={esimSettings[`${prefix}ClientSecret` as keyof typeof esimSettings] as string}
                                      onChange={(e) => setEsimSettings({ ...esimSettings, [`${prefix}ClientSecret`]: e.target.value })}
                                      placeholder="Your Airalo Client Secret"
                                      className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 pr-12"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowServiceSecrets(prev => ({ ...prev, [`${prefix}ClientSecret`]: !prev[`${prefix}ClientSecret`] }))}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                    >
                                      <Icon name={showServiceSecrets[`${prefix}ClientSecret`] ? 'eye-off' : 'eye'} size={16} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          })()}
                          <p className="text-xs text-slate-600">Apply at <a href="https://partners.airalo.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">partners.airalo.com</a></p>
                        </div>
                      )}
                    </div>

                    {/* MobiMatter */}
                    <div className="p-5 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] mt-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <Icon name="globe" size={20} className="text-purple-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">MobiMatter</p>
                            <p className="text-slate-500 text-sm">150+ countries, REST API integration</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEsimSettings({ ...esimSettings, mobimatterEnabled: !esimSettings.mobimatterEnabled })}
                          className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${esimSettings.mobimatterEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${esimSettings.mobimatterEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                      {esimSettings.mobimatterEnabled && (
                        <div className="pt-4 border-t border-[#2a2a2a] space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-300">Merchant ID</label>
                              <input
                                type="text"
                                value={esimSettings.mobimatterMerchantId}
                                onChange={(e) => setEsimSettings({ ...esimSettings, mobimatterMerchantId: e.target.value })}
                                placeholder="Your MobiMatter Merchant ID"
                                className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-300">API Key</label>
                              <div className="relative">
                                <input
                                  type={showServiceSecrets.mobimatterApiKey ? 'text' : 'password'}
                                  value={esimSettings.mobimatterApiKey}
                                  onChange={(e) => setEsimSettings({ ...esimSettings, mobimatterApiKey: e.target.value })}
                                  placeholder="Your MobiMatter API Key"
                                  className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 pr-12"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowServiceSecrets(prev => ({ ...prev, mobimatterApiKey: !prev.mobimatterApiKey }))}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                  <Icon name={showServiceSecrets.mobimatterApiKey ? 'eye-off' : 'eye'} size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600">Get your credentials at <a href="https://mobimatter.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">mobimatter.com</a> ($250 minimum wallet top-up required)</p>
                        </div>
                      )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Voice eSIM Providers Configuration */}
                  <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
                    <button
                      onClick={() => toggleSection('voiceEsimProviders')}
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                          <Icon name="call" size={20} className="text-teal-400" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-white font-semibold text-lg">Voice eSIM Providers</h3>
                          <p className="text-slate-500 text-sm">eSIMs with phone numbers, calls, and SMS capability</p>
                        </div>
                      </div>
                      <Icon
                        name={expandedSections.voiceEsimProviders ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        className="text-slate-400 flex-shrink-0"
                      />
                    </button>

                    {expandedSections.voiceEsimProviders && (
                      <>
                        {/* Default Voice eSIM Provider */}
                        <div className="mb-6 mt-6">
                      <label className="text-sm font-medium text-slate-300 mb-2 block">Default Voice eSIM Provider</label>
                      <select
                        value={voiceEsimSettings.voiceEsimDefaultProvider}
                        onChange={(e) => setVoiceEsimSettings({ ...voiceEsimSettings, voiceEsimDefaultProvider: e.target.value as 'telnyx' | 'alosim' | 'twise' })}
                        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-4 pr-10 py-3 text-white focus:outline-none focus:border-primary/50 min-w-[160px] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat"
                      >
                        <option value="telnyx">Telnyx</option>
                        <option value="alosim">aloSIM</option>
                        <option value="twise">Twise</option>
                      </select>
                    </div>

                    {/* Telnyx */}
                    <div className="p-5 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] mb-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                            <Icon name="call" size={20} className="text-teal-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">Telnyx</p>
                            <p className="text-slate-500 text-sm">eSIMs with phone numbers for calls & SMS</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setVoiceEsimSettings({ ...voiceEsimSettings, telnyxEnabled: !voiceEsimSettings.telnyxEnabled })}
                          className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${voiceEsimSettings.telnyxEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${voiceEsimSettings.telnyxEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                      {voiceEsimSettings.telnyxEnabled && (
                        <div className="pt-4 border-t border-[#2a2a2a]">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">API Key</label>
                            <div className="relative">
                              <input
                                type={showServiceSecrets.telnyxApiKey ? 'text' : 'password'}
                                value={voiceEsimSettings.telnyxApiKey}
                                onChange={(e) => setVoiceEsimSettings({ ...voiceEsimSettings, telnyxApiKey: e.target.value })}
                                placeholder="Your Telnyx API key"
                                className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 pr-12"
                              />
                              <button
                                type="button"
                                onClick={() => setShowServiceSecrets(prev => ({ ...prev, telnyxApiKey: !prev.telnyxApiKey }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                              >
                                <Icon name={showServiceSecrets.telnyxApiKey ? 'eye-off' : 'eye'} size={16} />
                              </button>
                            </div>
                            <p className="text-xs text-slate-600">Get your API key at <a href="https://telnyx.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">telnyx.com</a></p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* aloSIM */}
                    <div className="p-5 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] mb-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                            <Icon name="call" size={20} className="text-cyan-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">aloSIM</p>
                            <p className="text-slate-500 text-sm">Voice-enabled eSIMs for travel</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setVoiceEsimSettings({ ...voiceEsimSettings, alosimEnabled: !voiceEsimSettings.alosimEnabled })}
                          className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${voiceEsimSettings.alosimEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${voiceEsimSettings.alosimEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                      {voiceEsimSettings.alosimEnabled && (
                        <div className="pt-4 border-t border-[#2a2a2a]">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">API Key</label>
                            <div className="relative">
                              <input
                                type={showServiceSecrets.alosimApiKey ? 'text' : 'password'}
                                value={voiceEsimSettings.alosimApiKey}
                                onChange={(e) => setVoiceEsimSettings({ ...voiceEsimSettings, alosimApiKey: e.target.value })}
                                placeholder="Your aloSIM API key"
                                className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 pr-12"
                              />
                              <button
                                type="button"
                                onClick={() => setShowServiceSecrets(prev => ({ ...prev, alosimApiKey: !prev.alosimApiKey }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                              >
                                <Icon name={showServiceSecrets.alosimApiKey ? 'eye-off' : 'eye'} size={16} />
                              </button>
                            </div>
                            <p className="text-xs text-slate-600">Get your API key at <a href="https://alosim.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">alosim.com</a></p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Twise */}
                    <div className="p-5 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                            <Icon name="call" size={20} className="text-indigo-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">Twise</p>
                            <p className="text-slate-500 text-sm">Global voice eSIMs with verification support</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setVoiceEsimSettings({ ...voiceEsimSettings, twiseEnabled: !voiceEsimSettings.twiseEnabled })}
                          className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${voiceEsimSettings.twiseEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${voiceEsimSettings.twiseEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                      {voiceEsimSettings.twiseEnabled && (
                        <div className="pt-4 border-t border-[#2a2a2a]">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">API Key</label>
                            <div className="relative">
                              <input
                                type={showServiceSecrets.twiseApiKey ? 'text' : 'password'}
                                value={voiceEsimSettings.twiseApiKey}
                                onChange={(e) => setVoiceEsimSettings({ ...voiceEsimSettings, twiseApiKey: e.target.value })}
                                placeholder="Your Twise API key"
                                className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 pr-12"
                              />
                              <button
                                type="button"
                                onClick={() => setShowServiceSecrets(prev => ({ ...prev, twiseApiKey: !prev.twiseApiKey }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                              >
                                <Icon name={showServiceSecrets.twiseApiKey ? 'eye-off' : 'eye'} size={16} />
                              </button>
                            </div>
                            <p className="text-xs text-slate-600">Get your API key at <a href="https://twise.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">twise.io</a></p>
                          </div>
                        </div>
                      )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Virtual Numbers Configuration */}
                  <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
                    <button
                      onClick={() => toggleSection('virtualNumbers')}
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                          <Icon name="phone" size={20} className="text-red-400" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-white font-semibold text-lg">Virtual Phone Numbers</h3>
                          <p className="text-slate-500 text-sm">Configure providers for virtual phone number services</p>
                        </div>
                      </div>
                      <Icon
                        name={expandedSections.virtualNumbers ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        className="text-slate-400 flex-shrink-0"
                      />
                    </button>

                    {expandedSections.virtualNumbers && (
                      <>
                        {/* Default VN Provider */}
                        <div className="mb-6 mt-6">
                      <label className="text-sm font-medium text-slate-300 mb-2 block">Default Provider</label>
                      <select
                        value={virtualNumberSettings.virtualNumbersProvider}
                        onChange={(e) => setVirtualNumberSettings({ ...virtualNumberSettings, virtualNumbersProvider: e.target.value as 'twilio' | 'plivo' | 'vonage' })}
                        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-4 pr-10 py-3 text-white focus:outline-none focus:border-primary/50 min-w-[160px] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat"
                      >
                        <option value="twilio">Twilio</option>
                        <option value="plivo">Plivo</option>
                        <option value="vonage">Vonage</option>
                      </select>
                    </div>

                    {/* Twilio */}
                    <div className="p-5 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] mb-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                            <Icon name="phone" size={20} className="text-red-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">Twilio</p>
                            <p className="text-slate-500 text-sm">100+ countries, best documentation, supports 2FA SMS</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setVirtualNumberSettings({ ...virtualNumberSettings, twilioEnabled: !virtualNumberSettings.twilioEnabled })}
                          className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${virtualNumberSettings.twilioEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${virtualNumberSettings.twilioEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                      {virtualNumberSettings.twilioEnabled && (
                        <div className="pt-4 border-t border-[#2a2a2a] space-y-4">
                          {/* Test/Live Mode Toggle */}
                          <div className="flex items-center gap-3">
                            <div className="flex bg-[#141414] rounded-lg border border-[#2a2a2a] p-1">
                              <button
                                type="button"
                                onClick={() => setVirtualNumberSettings({ ...virtualNumberSettings, twilioMode: 'test' })}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                  virtualNumberSettings.twilioMode === 'test'
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : 'text-slate-500 hover:text-slate-300'
                                }`}
                              >
                                Test
                              </button>
                              <button
                                type="button"
                                onClick={() => setVirtualNumberSettings({ ...virtualNumberSettings, twilioMode: 'live' })}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                  virtualNumberSettings.twilioMode === 'live'
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'text-slate-500 hover:text-slate-300'
                                }`}
                              >
                                Live
                              </button>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              virtualNumberSettings.twilioMode === 'test'
                                ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                : 'bg-green-500/10 text-green-400 border-green-500/20'
                            }`}>
                              {virtualNumberSettings.twilioMode === 'test' ? 'TEST' : '✓ LIVE'}
                            </span>
                          </div>

                          {/* Test Mode Credentials */}
                          {virtualNumberSettings.twilioMode === 'test' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Test Account SID</label>
                                <input
                                  type="text"
                                  value={virtualNumberSettings.twilioTestAccountSid}
                                  onChange={(e) => setVirtualNumberSettings({ ...virtualNumberSettings, twilioTestAccountSid: e.target.value })}
                                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                  className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Test Auth Token</label>
                                <div className="relative">
                                  <input
                                    type={showServiceSecrets.twilioTestAuthToken ? 'text' : 'password'}
                                    value={virtualNumberSettings.twilioTestAuthToken}
                                    onChange={(e) => setVirtualNumberSettings({ ...virtualNumberSettings, twilioTestAuthToken: e.target.value })}
                                    placeholder="Your Twilio Test Auth Token"
                                    className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 pr-12"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowServiceSecrets(prev => ({ ...prev, twilioTestAuthToken: !prev.twilioTestAuthToken }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                  >
                                    <Icon name={showServiceSecrets.twilioTestAuthToken ? 'eye-off' : 'eye'} size={16} />
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Test Phone Number</label>
                                <input
                                  type="text"
                                  value={virtualNumberSettings.twilioTestPhoneNumber}
                                  onChange={(e) => setVirtualNumberSettings({ ...virtualNumberSettings, twilioTestPhoneNumber: e.target.value })}
                                  placeholder="+15005550006"
                                  className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                                />
                              </div>
                            </div>
                          )}

                          {/* Live Mode Credentials */}
                          {virtualNumberSettings.twilioMode === 'live' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Live Account SID</label>
                                <input
                                  type="text"
                                  value={virtualNumberSettings.twilioLiveAccountSid}
                                  onChange={(e) => setVirtualNumberSettings({ ...virtualNumberSettings, twilioLiveAccountSid: e.target.value })}
                                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                  className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Live Auth Token</label>
                                <div className="relative">
                                  <input
                                    type={showServiceSecrets.twilioLiveAuthToken ? 'text' : 'password'}
                                    value={virtualNumberSettings.twilioLiveAuthToken}
                                    onChange={(e) => setVirtualNumberSettings({ ...virtualNumberSettings, twilioLiveAuthToken: e.target.value })}
                                    placeholder="Your Twilio Live Auth Token"
                                    className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 pr-12"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowServiceSecrets(prev => ({ ...prev, twilioLiveAuthToken: !prev.twilioLiveAuthToken }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                  >
                                    <Icon name={showServiceSecrets.twilioLiveAuthToken ? 'eye-off' : 'eye'} size={16} />
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Live Phone Number</label>
                                <input
                                  type="text"
                                  value={virtualNumberSettings.twilioLivePhoneNumber}
                                  onChange={(e) => setVirtualNumberSettings({ ...virtualNumberSettings, twilioLivePhoneNumber: e.target.value })}
                                  placeholder="+1234567890"
                                  className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                                />
                              </div>
                            </div>
                          )}

                          <p className="text-xs text-slate-600 mt-3">Get your credentials at <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">console.twilio.com</a>. Twilio is also used for 2FA SMS verification.</p>
                        </div>
                      )}
                    </div>

                    {/* Plivo */}
                    <div className="p-5 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] mb-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <Icon name="phone" size={20} className="text-green-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">Plivo</p>
                            <p className="text-slate-500 text-sm">65+ countries, 30-40% cheaper than Twilio</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setVirtualNumberSettings({ ...virtualNumberSettings, plivoEnabled: !virtualNumberSettings.plivoEnabled })}
                          className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${virtualNumberSettings.plivoEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${virtualNumberSettings.plivoEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                      {virtualNumberSettings.plivoEnabled && (
                        <div className="pt-4 border-t border-[#2a2a2a]">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-300">Auth ID</label>
                              <input
                                type="text"
                                value={virtualNumberSettings.plivoAuthId}
                                onChange={(e) => setVirtualNumberSettings({ ...virtualNumberSettings, plivoAuthId: e.target.value })}
                                placeholder="Your Plivo Auth ID"
                                className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-300">Auth Token</label>
                              <div className="relative">
                                <input
                                  type={showServiceSecrets.plivoAuthToken ? 'text' : 'password'}
                                  value={virtualNumberSettings.plivoAuthToken}
                                  onChange={(e) => setVirtualNumberSettings({ ...virtualNumberSettings, plivoAuthToken: e.target.value })}
                                  placeholder="Your Plivo Auth Token"
                                  className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 pr-12"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowServiceSecrets(prev => ({ ...prev, plivoAuthToken: !prev.plivoAuthToken }))}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                  <Icon name={showServiceSecrets.plivoAuthToken ? 'eye-off' : 'eye'} size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 mt-3">Get your credentials at <a href="https://console.plivo.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">console.plivo.com</a></p>
                        </div>
                      )}
                    </div>

                    {/* Vonage */}
                    <div className="p-5 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                            <Icon name="phone" size={20} className="text-orange-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">Vonage</p>
                            <p className="text-slate-500 text-sm">65+ countries, multi-channel communication</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setVirtualNumberSettings({ ...virtualNumberSettings, vonageEnabled: !virtualNumberSettings.vonageEnabled })}
                          className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${virtualNumberSettings.vonageEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${virtualNumberSettings.vonageEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                      {virtualNumberSettings.vonageEnabled && (
                        <div className="pt-4 border-t border-[#2a2a2a]">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-300">API Key</label>
                              <input
                                type="text"
                                value={virtualNumberSettings.vonageApiKey}
                                onChange={(e) => setVirtualNumberSettings({ ...virtualNumberSettings, vonageApiKey: e.target.value })}
                                placeholder="Your Vonage API Key"
                                className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-300">API Secret</label>
                              <div className="relative">
                                <input
                                  type={showServiceSecrets.vonageApiSecret ? 'text' : 'password'}
                                  value={virtualNumberSettings.vonageApiSecret}
                                  onChange={(e) => setVirtualNumberSettings({ ...virtualNumberSettings, vonageApiSecret: e.target.value })}
                                  placeholder="Your Vonage API Secret"
                                  className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 pr-12"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowServiceSecrets(prev => ({ ...prev, vonageApiSecret: !prev.vonageApiSecret }))}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                  <Icon name={showServiceSecrets.vonageApiSecret ? 'eye-off' : 'eye'} size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 mt-3">Get your credentials at <a href="https://dashboard.vonage.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">dashboard.vonage.com</a></p>
                        </div>
                      )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Gift Card Providers Configuration */}
                  <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
                    <button
                      onClick={() => toggleSection('giftCardProviders')}
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                          <Icon name="gift" size={20} className="text-purple-400" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-white font-semibold text-lg">Gift Card Providers</h3>
                          <p className="text-slate-500 text-sm">Configure providers for digital gift card purchasing via API</p>
                        </div>
                      </div>
                      <Icon
                        name={expandedSections.giftCardProviders ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        className="text-slate-400 flex-shrink-0"
                      />
                    </button>

                    {expandedSections.giftCardProviders && (
                      <>
                        {/* Default Provider */}
                        <div className="mb-6 mt-6">
                      <label className="text-sm font-medium text-slate-300 mb-2 block">Default Provider</label>
                      <select
                        value={giftCardSettings.giftCardDefaultProvider}
                        onChange={(e) => setGiftCardSettings({ ...giftCardSettings, giftCardDefaultProvider: e.target.value as 'reloadly' | 'ezgiftcard' | 'bitrefill' | 'tango' | 'ezpin' })}
                        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-4 pr-10 py-3 text-white focus:outline-none focus:border-primary/50 min-w-[160px] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat"
                      >
                        <option value="reloadly">Reloadly</option>
                        <option value="ezgiftcard">EZGiftCard</option>
                        <option value="bitrefill">Bitrefill</option>
                        <option value="tango">Tango Card</option>
                        <option value="ezpin">EZ Pin</option>
                      </select>
                    </div>

                    {/* Reloadly */}
                    <div className="p-5 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] mb-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <Icon name="gift" size={20} className="text-purple-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">Reloadly</p>
                            <p className="text-slate-500 text-sm">600+ brands, instant delivery, global coverage</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setGiftCardSettings({ ...giftCardSettings, reloadlyEnabled: !giftCardSettings.reloadlyEnabled })}
                          className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${giftCardSettings.reloadlyEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${giftCardSettings.reloadlyEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                      {giftCardSettings.reloadlyEnabled && (
                        <div className="pt-4 border-t border-[#2a2a2a] space-y-4">
                          {/* Mode Toggle */}
                          <div className="flex items-center gap-3">
                            <div className="flex bg-[#141414] rounded-lg border border-[#2a2a2a] p-1">
                              <button
                                type="button"
                                onClick={() => setGiftCardSettings({ ...giftCardSettings, reloadlyMode: 'sandbox' })}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${giftCardSettings.reloadlyMode === 'sandbox' ? 'bg-orange-500/20 text-orange-400' : 'text-slate-500 hover:text-slate-300'}`}
                              >
                                Sandbox
                              </button>
                              <button
                                type="button"
                                onClick={() => setGiftCardSettings({ ...giftCardSettings, reloadlyMode: 'production' })}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${giftCardSettings.reloadlyMode === 'production' ? 'bg-green-500/20 text-green-400' : 'text-slate-500 hover:text-slate-300'}`}
                              >
                                Production
                              </button>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${giftCardSettings.reloadlyMode === 'sandbox' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                              {giftCardSettings.reloadlyMode === 'sandbox' ? 'SANDBOX' : 'PRODUCTION'}
                            </span>
                          </div>

                          {/* Credentials based on mode */}
                          {giftCardSettings.reloadlyMode === 'sandbox' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Sandbox Client ID</label>
                                <input
                                  type="text"
                                  value={giftCardSettings.reloadlySandboxClientId}
                                  onChange={(e) => setGiftCardSettings({ ...giftCardSettings, reloadlySandboxClientId: e.target.value })}
                                  placeholder="Your sandbox Client ID"
                                  className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Sandbox Client Secret</label>
                                <div className="relative">
                                  <input
                                    type={showServiceSecrets.reloadlySandboxClientSecret ? 'text' : 'password'}
                                    value={giftCardSettings.reloadlySandboxClientSecret}
                                    onChange={(e) => setGiftCardSettings({ ...giftCardSettings, reloadlySandboxClientSecret: e.target.value })}
                                    placeholder="Your sandbox Client Secret"
                                    className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 pr-12"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowServiceSecrets(prev => ({ ...prev, reloadlySandboxClientSecret: !prev.reloadlySandboxClientSecret }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                  >
                                    <Icon name={showServiceSecrets.reloadlySandboxClientSecret ? 'eye-off' : 'eye'} size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Production Client ID</label>
                                <input
                                  type="text"
                                  value={giftCardSettings.reloadlyProductionClientId}
                                  onChange={(e) => setGiftCardSettings({ ...giftCardSettings, reloadlyProductionClientId: e.target.value })}
                                  placeholder="Your production Client ID"
                                  className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Production Client Secret</label>
                                <div className="relative">
                                  <input
                                    type={showServiceSecrets.reloadlyProductionClientSecret ? 'text' : 'password'}
                                    value={giftCardSettings.reloadlyProductionClientSecret}
                                    onChange={(e) => setGiftCardSettings({ ...giftCardSettings, reloadlyProductionClientSecret: e.target.value })}
                                    placeholder="Your production Client Secret"
                                    className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 pr-12"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowServiceSecrets(prev => ({ ...prev, reloadlyProductionClientSecret: !prev.reloadlyProductionClientSecret }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                  >
                                    <Icon name={showServiceSecrets.reloadlyProductionClientSecret ? 'eye-off' : 'eye'} size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                          <p className="text-xs text-slate-600">Get your credentials at <a href="https://www.reloadly.com/developers" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">reloadly.com/developers</a></p>
                        </div>
                      )}
                    </div>

                    {/* Tango Card */}
                    <div className="p-5 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] mb-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                            <Icon name="gift" size={20} className="text-teal-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">Tango Card</p>
                            <p className="text-slate-500 text-sm">Enterprise rewards platform, corporate gift cards</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setGiftCardSettings({ ...giftCardSettings, tangoEnabled: !giftCardSettings.tangoEnabled })}
                          className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${giftCardSettings.tangoEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${giftCardSettings.tangoEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                      {giftCardSettings.tangoEnabled && (
                        <div className="pt-4 border-t border-[#2a2a2a] space-y-4">
                          {/* Mode Toggle */}
                          <div className="flex items-center gap-3">
                            <div className="flex bg-[#141414] rounded-lg border border-[#2a2a2a] p-1">
                              <button
                                type="button"
                                onClick={() => setGiftCardSettings({ ...giftCardSettings, tangoMode: 'sandbox' })}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${giftCardSettings.tangoMode === 'sandbox' ? 'bg-orange-500/20 text-orange-400' : 'text-slate-500 hover:text-slate-300'}`}
                              >
                                Sandbox
                              </button>
                              <button
                                type="button"
                                onClick={() => setGiftCardSettings({ ...giftCardSettings, tangoMode: 'production' })}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${giftCardSettings.tangoMode === 'production' ? 'bg-green-500/20 text-green-400' : 'text-slate-500 hover:text-slate-300'}`}
                              >
                                Production
                              </button>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${giftCardSettings.tangoMode === 'sandbox' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                              {giftCardSettings.tangoMode === 'sandbox' ? 'SANDBOX' : 'PRODUCTION'}
                            </span>
                          </div>

                          {/* Credentials based on mode */}
                          {giftCardSettings.tangoMode === 'sandbox' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Sandbox Platform Name</label>
                                <input
                                  type="text"
                                  value={giftCardSettings.tangoSandboxPlatformName}
                                  onChange={(e) => setGiftCardSettings({ ...giftCardSettings, tangoSandboxPlatformName: e.target.value })}
                                  placeholder="Your sandbox platform name"
                                  className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Sandbox Platform Key</label>
                                <div className="relative">
                                  <input
                                    type={showServiceSecrets.tangoSandboxPlatformKey ? 'text' : 'password'}
                                    value={giftCardSettings.tangoSandboxPlatformKey}
                                    onChange={(e) => setGiftCardSettings({ ...giftCardSettings, tangoSandboxPlatformKey: e.target.value })}
                                    placeholder="Your sandbox platform key"
                                    className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 pr-12"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowServiceSecrets(prev => ({ ...prev, tangoSandboxPlatformKey: !prev.tangoSandboxPlatformKey }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                  >
                                    <Icon name={showServiceSecrets.tangoSandboxPlatformKey ? 'eye-off' : 'eye'} size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Production Platform Name</label>
                                <input
                                  type="text"
                                  value={giftCardSettings.tangoProductionPlatformName}
                                  onChange={(e) => setGiftCardSettings({ ...giftCardSettings, tangoProductionPlatformName: e.target.value })}
                                  placeholder="Your production platform name"
                                  className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Production Platform Key</label>
                                <div className="relative">
                                  <input
                                    type={showServiceSecrets.tangoProductionPlatformKey ? 'text' : 'password'}
                                    value={giftCardSettings.tangoProductionPlatformKey}
                                    onChange={(e) => setGiftCardSettings({ ...giftCardSettings, tangoProductionPlatformKey: e.target.value })}
                                    placeholder="Your production platform key"
                                    className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 pr-12"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowServiceSecrets(prev => ({ ...prev, tangoProductionPlatformKey: !prev.tangoProductionPlatformKey }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                  >
                                    <Icon name={showServiceSecrets.tangoProductionPlatformKey ? 'eye-off' : 'eye'} size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                          <p className="text-xs text-slate-600">Get your credentials at <a href="https://www.tangocard.com/raas-api" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">tangocard.com/raas-api</a></p>
                        </div>
                      )}
                    </div>

                    {/* EZ Pin */}
                    <div className="p-5 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] mb-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                            <Icon name="gift" size={20} className="text-indigo-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">EZ Pin</p>
                            <p className="text-slate-500 text-sm">Digital PIN & gift card fulfillment</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setGiftCardSettings({ ...giftCardSettings, ezpinEnabled: !giftCardSettings.ezpinEnabled })}
                          className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${giftCardSettings.ezpinEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${giftCardSettings.ezpinEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                      {giftCardSettings.ezpinEnabled && (
                        <div className="pt-4 border-t border-[#2a2a2a] space-y-4">
                          {/* Mode Toggle */}
                          <div className="flex items-center gap-3">
                            <div className="flex bg-[#141414] rounded-lg border border-[#2a2a2a] p-1">
                              <button
                                type="button"
                                onClick={() => setGiftCardSettings({ ...giftCardSettings, ezpinMode: 'sandbox' })}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${giftCardSettings.ezpinMode === 'sandbox' ? 'bg-orange-500/20 text-orange-400' : 'text-slate-500 hover:text-slate-300'}`}
                              >
                                Sandbox
                              </button>
                              <button
                                type="button"
                                onClick={() => setGiftCardSettings({ ...giftCardSettings, ezpinMode: 'production' })}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${giftCardSettings.ezpinMode === 'production' ? 'bg-green-500/20 text-green-400' : 'text-slate-500 hover:text-slate-300'}`}
                              >
                                Production
                              </button>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${giftCardSettings.ezpinMode === 'sandbox' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                              {giftCardSettings.ezpinMode === 'sandbox' ? 'SANDBOX' : 'PRODUCTION'}
                            </span>
                          </div>

                          {/* Credentials based on mode */}
                          {giftCardSettings.ezpinMode === 'sandbox' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Sandbox API Key</label>
                                <div className="relative">
                                  <input
                                    type={showServiceSecrets.ezpinSandboxApiKey ? 'text' : 'password'}
                                    value={giftCardSettings.ezpinSandboxApiKey}
                                    onChange={(e) => setGiftCardSettings({ ...giftCardSettings, ezpinSandboxApiKey: e.target.value })}
                                    placeholder="Your sandbox API key"
                                    className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 pr-12"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowServiceSecrets(prev => ({ ...prev, ezpinSandboxApiKey: !prev.ezpinSandboxApiKey }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                  >
                                    <Icon name={showServiceSecrets.ezpinSandboxApiKey ? 'eye-off' : 'eye'} size={16} />
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Sandbox API Secret</label>
                                <div className="relative">
                                  <input
                                    type={showServiceSecrets.ezpinSandboxApiSecret ? 'text' : 'password'}
                                    value={giftCardSettings.ezpinSandboxApiSecret}
                                    onChange={(e) => setGiftCardSettings({ ...giftCardSettings, ezpinSandboxApiSecret: e.target.value })}
                                    placeholder="Your sandbox API secret"
                                    className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 pr-12"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowServiceSecrets(prev => ({ ...prev, ezpinSandboxApiSecret: !prev.ezpinSandboxApiSecret }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                  >
                                    <Icon name={showServiceSecrets.ezpinSandboxApiSecret ? 'eye-off' : 'eye'} size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Production API Key</label>
                                <div className="relative">
                                  <input
                                    type={showServiceSecrets.ezpinProductionApiKey ? 'text' : 'password'}
                                    value={giftCardSettings.ezpinProductionApiKey}
                                    onChange={(e) => setGiftCardSettings({ ...giftCardSettings, ezpinProductionApiKey: e.target.value })}
                                    placeholder="Your production API key"
                                    className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 pr-12"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowServiceSecrets(prev => ({ ...prev, ezpinProductionApiKey: !prev.ezpinProductionApiKey }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                  >
                                    <Icon name={showServiceSecrets.ezpinProductionApiKey ? 'eye-off' : 'eye'} size={16} />
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Production API Secret</label>
                                <div className="relative">
                                  <input
                                    type={showServiceSecrets.ezpinProductionApiSecret ? 'text' : 'password'}
                                    value={giftCardSettings.ezpinProductionApiSecret}
                                    onChange={(e) => setGiftCardSettings({ ...giftCardSettings, ezpinProductionApiSecret: e.target.value })}
                                    placeholder="Your production API secret"
                                    className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 pr-12"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowServiceSecrets(prev => ({ ...prev, ezpinProductionApiSecret: !prev.ezpinProductionApiSecret }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                  >
                                    <Icon name={showServiceSecrets.ezpinProductionApiSecret ? 'eye-off' : 'eye'} size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                          <p className="text-xs text-slate-600">Get your credentials at <a href="https://ezpins.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ezpins.com</a></p>
                        </div>
                      )}
                    </div>

                    {/* EZGiftCard (RapidAPI) */}
                    <div className="p-5 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] mb-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Icon name="gift" size={20} className="text-blue-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">EZGiftCard</p>
                            <p className="text-slate-500 text-sm">RapidAPI marketplace, simple integration</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setGiftCardSettings({ ...giftCardSettings, ezgiftcardEnabled: !giftCardSettings.ezgiftcardEnabled })}
                          className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${giftCardSettings.ezgiftcardEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${giftCardSettings.ezgiftcardEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                      {giftCardSettings.ezgiftcardEnabled && (
                        <div className="pt-4 border-t border-[#2a2a2a]">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">RapidAPI Key</label>
                            <div className="relative">
                              <input
                                type={showServiceSecrets.ezgiftcardApiKey ? 'text' : 'password'}
                                value={giftCardSettings.ezgiftcardApiKey}
                                onChange={(e) => setGiftCardSettings({ ...giftCardSettings, ezgiftcardApiKey: e.target.value })}
                                placeholder="Your RapidAPI key"
                                className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 pr-12"
                              />
                              <button
                                type="button"
                                onClick={() => setShowServiceSecrets(prev => ({ ...prev, ezgiftcardApiKey: !prev.ezgiftcardApiKey }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                              >
                                <Icon name={showServiceSecrets.ezgiftcardApiKey ? 'eye-off' : 'eye'} size={16} />
                              </button>
                            </div>
                            <p className="text-xs text-slate-600">Get your API key at <a href="https://rapidapi.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">rapidapi.com</a></p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bitrefill */}
                    <div className="p-5 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                            <Icon name="gift" size={20} className="text-orange-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">Bitrefill</p>
                            <p className="text-slate-500 text-sm">Crypto-friendly, 4000+ products, 180+ countries</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setGiftCardSettings({ ...giftCardSettings, bitrefillEnabled: !giftCardSettings.bitrefillEnabled })}
                          className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${giftCardSettings.bitrefillEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${giftCardSettings.bitrefillEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                      {giftCardSettings.bitrefillEnabled && (
                        <div className="pt-4 border-t border-[#2a2a2a]">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-300">API Key</label>
                              <div className="relative">
                                <input
                                  type={showServiceSecrets.bitrefillApiKey ? 'text' : 'password'}
                                  value={giftCardSettings.bitrefillApiKey}
                                  onChange={(e) => setGiftCardSettings({ ...giftCardSettings, bitrefillApiKey: e.target.value })}
                                  placeholder="Your Bitrefill API key"
                                  className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 pr-12"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowServiceSecrets(prev => ({ ...prev, bitrefillApiKey: !prev.bitrefillApiKey }))}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                  <Icon name={showServiceSecrets.bitrefillApiKey ? 'eye-off' : 'eye'} size={16} />
                                </button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-300">API Secret</label>
                              <div className="relative">
                                <input
                                  type={showServiceSecrets.bitrefillApiSecret ? 'text' : 'password'}
                                  value={giftCardSettings.bitrefillApiSecret}
                                  onChange={(e) => setGiftCardSettings({ ...giftCardSettings, bitrefillApiSecret: e.target.value })}
                                  placeholder="Your Bitrefill API secret"
                                  className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 pr-12"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowServiceSecrets(prev => ({ ...prev, bitrefillApiSecret: !prev.bitrefillApiSecret }))}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                  <Icon name={showServiceSecrets.bitrefillApiSecret ? 'eye-off' : 'eye'} size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 mt-3">Get your credentials at <a href="https://www.bitrefill.com/api" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">bitrefill.com/api</a></p>
                        </div>
                      )}
                    </div>
                      </>
                    )}
                  </div>

                  {/* OTP Verification Providers */}
                  <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
                    <button
                      onClick={() => toggleSection('otpProviders')}
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                          <Icon name="smartphone" size={20} className="text-violet-400" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-white font-semibold text-lg">OTP Verification Providers</h3>
                          <p className="text-slate-500 text-sm">One-time phone numbers for SMS verification codes</p>
                        </div>
                      </div>
                      <Icon
                        name={expandedSections.otpProviders ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        className="text-slate-400 flex-shrink-0"
                      />
                    </button>

                    {expandedSections.otpProviders && (
                      <>
                        {/* Default Provider */}
                        <div className="mb-6 mt-6">
                          <label className="text-sm font-medium text-slate-300 mb-2 block">Default OTP Provider</label>
                          <select
                            value={otpSettings.otpDefaultProvider}
                            onChange={(e) => setOtpSettings({ ...otpSettings, otpDefaultProvider: e.target.value as 'smspool' | '5sim' })}
                            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-4 pr-10 py-3 text-white focus:outline-none focus:border-primary/50 min-w-[160px] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat"
                          >
                            <option value="smspool">SMSPool</option>
                            <option value="5sim">5sim</option>
                          </select>
                        </div>

                        {/* SMSPool */}
                        <div className="p-5 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] mb-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <Icon name="message" size={20} className="text-blue-400" />
                              </div>
                              <div>
                                <p className="text-white font-medium">SMSPool</p>
                                <p className="text-slate-500 text-sm">Affordable SMS verification, 100+ countries</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setOtpSettings({ ...otpSettings, smspoolEnabled: !otpSettings.smspoolEnabled })}
                              className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${otpSettings.smspoolEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'}`}
                            >
                              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${otpSettings.smspoolEnabled ? 'left-7' : 'left-1'}`} />
                            </button>
                          </div>
                          {otpSettings.smspoolEnabled && (
                            <div className="pt-4 border-t border-[#2a2a2a]">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">API Key</label>
                                <div className="relative">
                                  <input
                                    type={showServiceSecrets.smspoolApiKey ? 'text' : 'password'}
                                    value={otpSettings.smspoolApiKey}
                                    onChange={(e) => setOtpSettings({ ...otpSettings, smspoolApiKey: e.target.value })}
                                    placeholder="Your SMSPool API key"
                                    className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 pr-12"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowServiceSecrets(prev => ({ ...prev, smspoolApiKey: !prev.smspoolApiKey }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                  >
                                    <Icon name={showServiceSecrets.smspoolApiKey ? 'eye-off' : 'eye'} size={16} />
                                  </button>
                                </div>
                                <p className="text-xs text-slate-600">Get your API key at <a href="https://www.smspool.net" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">smspool.net</a></p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 5sim */}
                        <div className="p-5 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                <Icon name="tag" size={20} className="text-green-400" />
                              </div>
                              <div>
                                <p className="text-white font-medium">5sim</p>
                                <p className="text-slate-500 text-sm">Fast SMS activation, 180+ countries</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setOtpSettings({ ...otpSettings, fivesimEnabled: !otpSettings.fivesimEnabled })}
                              className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${otpSettings.fivesimEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'}`}
                            >
                              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${otpSettings.fivesimEnabled ? 'left-7' : 'left-1'}`} />
                            </button>
                          </div>
                          {otpSettings.fivesimEnabled && (
                            <div className="pt-4 border-t border-[#2a2a2a]">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">API Key</label>
                                <div className="relative">
                                  <input
                                    type={showServiceSecrets.fivesimApiKey ? 'text' : 'password'}
                                    value={otpSettings.fivesimApiKey}
                                    onChange={(e) => setOtpSettings({ ...otpSettings, fivesimApiKey: e.target.value })}
                                    placeholder="Your 5sim API key"
                                    className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 pr-12"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowServiceSecrets(prev => ({ ...prev, fivesimApiKey: !prev.fivesimApiKey }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                  >
                                    <Icon name={showServiceSecrets.fivesimApiKey ? 'eye-off' : 'eye'} size={16} />
                                  </button>
                                </div>
                                <p className="text-xs text-slate-600">Get your API key at <a href="https://5sim.net" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">5sim.net</a></p>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Cloudflare R2 Storage */}
                  <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
                    <button
                      onClick={() => toggleSection('cloudflareR2')}
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                          <Icon name="cloud" size={20} className="text-orange-400" />
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-3">
                            <h3 className="text-white font-semibold text-lg">Cloudflare R2 — Script File Storage</h3>
                            {r2Settings.isConfigured ? (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-400">Connected</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-400">Not Configured</span>
                            )}
                          </div>
                          <p className="text-slate-500 text-sm">Secure private storage for downloadable script files</p>
                        </div>
                      </div>
                      <Icon
                        name={expandedSections.cloudflareR2 ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        className="text-slate-400 flex-shrink-0"
                      />
                    </button>

                    {expandedSections.cloudflareR2 && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 mt-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Account ID</label>
                        <input
                          type="text"
                          value={r2Settings.accountId}
                          onChange={(e) => setR2Settings({ ...r2Settings, accountId: e.target.value })}
                          placeholder="Your Cloudflare Account ID"
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Bucket Name</label>
                        <input
                          type="text"
                          value={r2Settings.bucketName}
                          onChange={(e) => setR2Settings({ ...r2Settings, bucketName: e.target.value })}
                          placeholder="zenorar-scripts"
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Access Key ID</label>
                        <input
                          type="text"
                          value={r2Settings.accessKeyId}
                          onChange={(e) => setR2Settings({ ...r2Settings, accessKeyId: e.target.value })}
                          placeholder="R2 Access Key ID"
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Secret Access Key</label>
                        <div className="relative">
                          <input
                            type={showR2Secret ? 'text' : 'password'}
                            value={r2Settings.secretAccessKey}
                            onChange={(e) => setR2Settings({ ...r2Settings, secretAccessKey: e.target.value })}
                            placeholder={r2SecretPlaceholder || 'R2 Secret Access Key'}
                            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 pr-10 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                          />
                          <button
                            type="button"
                            onClick={() => setShowR2Secret(!showR2Secret)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            <Icon name={showR2Secret ? 'eye-off' : 'eye'} size={16} />
                          </button>
                        </div>
                        {r2Settings.isConfigured && !r2Settings.secretAccessKey && (
                          <p className="text-xs text-slate-600">Leave blank to keep existing secret</p>
                        )}
                      </div>
                    </div>

                    {r2TestResult && (
                      <div className={`mb-4 p-3 rounded-lg text-sm ${r2TestResult.success ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {r2TestResult.success ? 'Connection successful — bucket is accessible' : `Connection failed: ${r2TestResult.error}`}
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-5">
                      <button
                        onClick={handleTestR2}
                        disabled={testingR2 || !r2Settings.accountId || !r2Settings.accessKeyId || !r2Settings.bucketName}
                        className="bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] text-slate-300 text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-40"
                      >
                        <Icon name={testingR2 ? 'loader' : 'wifi'} size={14} className={testingR2 ? 'animate-spin' : ''} />
                        {testingR2 ? 'Testing...' : 'Test Connection'}
                      </button>
                      <button
                        onClick={handleSaveR2}
                        disabled={savingR2 || !r2Settings.accountId || !r2Settings.accessKeyId || !r2Settings.bucketName}
                        className="bg-primary hover:bg-primary/90 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-40"
                      >
                        <Icon name={savingR2 ? 'loader' : 'save'} size={14} className={savingR2 ? 'animate-spin' : ''} />
                        {savingR2 ? 'Saving...' : 'Save R2 Credentials'}
                      </button>
                    </div>

                        <div className="p-3 bg-[#111] rounded-lg border border-[#2a2a2a] text-xs text-slate-500">
                          Credentials are stored encrypted in the database. Files are served via time-limited signed URLs (1 hour expiry).
                          <a href="https://developers.cloudflare.com/r2/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">R2 docs →</a>
                        </div>
                      </>
                    )}
                  </div>

                  {/* API Keys Table */}
                  <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
                    <button
                      onClick={() => toggleSection('apiKeys')}
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                          <Icon name="key" size={20} className="text-amber-400" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-white font-semibold text-lg">API Keys</h3>
                          <p className="text-slate-500 text-sm">Manage your API access keys</p>
                        </div>
                      </div>
                      <Icon
                        name={expandedSections.apiKeys ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        className="text-slate-400 flex-shrink-0"
                      />
                    </button>

                    {expandedSections.apiKeys && (
                      <>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 mt-6 mb-6">
                          <input
                            type="text"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            placeholder="Key name..."
                            className="w-full sm:w-auto bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                          />
                          <button
                            onClick={handleGenerateKey}
                            disabled={generatingKey || !newKeyName.trim()}
                            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-black text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <Icon name="add" size={16} />
                            {generatingKey ? 'Generating...' : 'Generate New Key'}
                          </button>
                        </div>

                        {newlyCreatedKey && (
                          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
                            <p className="text-green-400 text-sm font-medium mb-2">New API key created! Copy it now — it won&apos;t be shown again.</p>
                            <div className="flex items-center gap-2">
                              <code className="text-green-300 text-sm bg-[#141414] px-3 py-2 rounded flex-1 break-all">{newlyCreatedKey}</code>
                              <button
                                onClick={() => { navigator.clipboard.writeText(newlyCreatedKey); setNewlyCreatedKey(null) }}
                                className="p-2 rounded-lg text-green-400 hover:bg-green-500/20 transition-colors"
                              >
                                <Icon name="copy" size={16} />
                              </button>
                            </div>
                          </div>
                        )}

                    <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                      <table className="w-full min-w-[500px]">
                        <thead>
                          <tr className="border-b border-[#2a2a2a]">
                            <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">Name</th>
                            <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">Key</th>
                            <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">Created</th>
                            <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">Last Used</th>
                            <th className="text-right text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {apiKeys.length === 0 && (
                            <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500 text-sm">No API keys yet. Generate one above.</td></tr>
                          )}
                          {apiKeys.map((apiKey) => (
                            <tr key={apiKey.id} className="border-b border-[#2a2a2a] last:border-0 hover:bg-white/5">
                              <td className="px-5 py-4 text-white text-sm">{apiKey.name}</td>
                              <td className="px-5 py-4">
                                <code className="text-slate-400 text-sm bg-[#141414] px-2 py-1 rounded">{apiKey.key}</code>
                              </td>
                              <td className="px-5 py-4 text-slate-400 text-sm">{new Date(apiKey.createdAt).toLocaleDateString()}</td>
                              <td className="px-5 py-4 text-slate-500 text-sm">{apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt).toLocaleDateString() : 'Never'}</td>
                              <td className="px-5 py-4 text-right">
                                <button
                                  onClick={() => handleDeleteKey(apiKey.id)}
                                  className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                  <Icon name="trash" size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                        </div>
                      </>
                    )}
                  </div>
                </>
            </div>
          )}
        </div>

          {/* Referral Program Settings */}
          {activeTab === 'referral' && (
            <div className="space-y-6">
              <div className="bg-charcoal border border-border-dark rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Icon name="gift" size={24} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Referral Program Settings</h2>
                    <p className="text-slate-500 text-sm">Configure rewards and program rules</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Enable/Disable Program */}
                  <div className="flex items-center justify-between p-4 bg-surface-dark rounded-xl">
                    <div className="flex-1">
                      <label className="text-white font-semibold mb-1 block">Enable Referral Program</label>
                      <p className="text-slate-400 text-sm">Allow users to refer friends and earn rewards</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReferralSettings({ ...referralSettings, referralProgramEnabled: !referralSettings.referralProgramEnabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        referralSettings.referralProgramEnabled ? 'bg-primary' : 'bg-surface-dark border border-border-dark'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          referralSettings.referralProgramEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Referrer Reward */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">
                        Referrer Reward (USD)
                        <span className="text-slate-500 font-normal ml-2">Amount given to referrer</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={referralSettings.referrerRewardAmount}
                          onChange={(e) => setReferralSettings({ ...referralSettings, referrerRewardAmount: e.target.value })}
                          className="w-full bg-surface-dark border border-border-dark rounded-xl pl-8 pr-4 py-3 text-white placeholder-slate-500 focus:border-primary/50 focus:outline-none"
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Credited when referee makes first purchase
                      </p>
                    </div>

                    {/* Referee Reward */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">
                        Referee Welcome Bonus (USD)
                        <span className="text-slate-500 font-normal ml-2">Amount given to new user</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={referralSettings.refereeRewardAmount}
                          onChange={(e) => setReferralSettings({ ...referralSettings, refereeRewardAmount: e.target.value })}
                          className="w-full bg-surface-dark border border-border-dark rounded-xl pl-8 pr-4 py-3 text-white placeholder-slate-500 focus:border-primary/50 focus:outline-none"
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Credited when they make first purchase
                      </p>
                    </div>

                    {/* Minimum Purchase */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-300 mb-2">
                        Minimum First Purchase (USD)
                        <span className="text-slate-500 font-normal ml-2">Optional minimum to trigger rewards</span>
                      </label>
                      <div className="relative max-w-md">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={referralSettings.minFirstPurchase}
                          onChange={(e) => setReferralSettings({ ...referralSettings, minFirstPurchase: e.target.value })}
                          className="w-full bg-surface-dark border border-border-dark rounded-xl pl-8 pr-4 py-3 text-white placeholder-slate-500 focus:border-primary/50 focus:outline-none"
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Set to $0.00 to allow rewards for any purchase amount
                      </p>
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="flex items-start gap-3 p-4 bg-primary/10 border border-primary/20 rounded-xl">
                    <Icon name="info" size={20} className="text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-primary text-sm font-semibold mb-1">How Referral Rewards Work</p>
                      <ul className="text-slate-300 text-xs space-y-1 list-disc list-inside">
                        <li>Users get a unique referral code when they sign up</li>
                        <li>New users can use this code during signup</li>
                        <li>When the referred user makes their first purchase, both receive rewards</li>
                        <li>Rewards are credited to their wallet balances automatically</li>
                        <li>Users can use wallet balance at checkout to pay for orders</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Virtual Numbers Settings */}
          {activeTab === 'virtual-numbers' && (
            <div className="space-y-6">
              <VirtualNumberPricingSection />
            </div>
          )}

          {/* Email Service Settings */}
          {activeTab === 'email' && (
            <div className="space-y-6">
              <EmailConfigSection />
            </div>
          )}

          {/* Marketing Settings */}
          {activeTab === 'marketing' && (
            <div className="space-y-6">
              <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
                <button
                  onClick={() => toggleSection('trackingAnalytics')}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Icon name="analytics" size={24} className="text-blue-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-white font-semibold text-lg">Tracking & Analytics</p>
                      <p className="text-slate-500 text-sm">Connect your Facebook Pixel and Google Analytics to track conversions from ads</p>
                    </div>
                  </div>
                  <Icon
                    name={expandedSections.trackingAnalytics ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    className="text-slate-400 flex-shrink-0"
                  />
                </button>

                {expandedSections.trackingAnalytics && (
                  <div className="space-y-4 mt-6 pt-6 border-t border-[#1f1f1f]">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Facebook Pixel ID</label>
                      <input
                        type="text"
                        value={marketingSettings.facebookPixelId}
                        onChange={(e) => setMarketingSettings({ ...marketingSettings, facebookPixelId: e.target.value })}
                        placeholder="123456789012345"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <p className="text-xs text-slate-500 mt-1">Find this in your Facebook Events Manager. Leave empty to disable.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">GA4 Measurement ID</label>
                      <input
                        type="text"
                        value={marketingSettings.ga4MeasurementId}
                        onChange={(e) => setMarketingSettings({ ...marketingSettings, ga4MeasurementId: e.target.value })}
                        placeholder="G-XXXXXXXXXX"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <p className="text-xs text-slate-500 mt-1">Find this in Google Analytics → Admin → Data Streams. Leave empty to disable.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
                <button
                  onClick={() => toggleSection('socialSharing')}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center">
                      <Icon name="share" size={24} className="text-pink-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-white font-semibold text-lg">Social Sharing</p>
                      <p className="text-slate-500 text-sm">Default images and metadata for social media sharing</p>
                    </div>
                  </div>
                  <Icon
                    name={expandedSections.socialSharing ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    className="text-slate-400 flex-shrink-0"
                  />
                </button>

                {expandedSections.socialSharing && (
                  <div className="space-y-4 mt-6 pt-6 border-t border-[#1f1f1f]">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Default OG Image URL</label>
                      <input
                        type="text"
                        value={marketingSettings.defaultOgImage}
                        onChange={(e) => setMarketingSettings({ ...marketingSettings, defaultOgImage: e.target.value })}
                        placeholder="https://example.com/og-image.jpg"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <p className="text-xs text-slate-500 mt-1">Fallback image shown when pages are shared on social media. Recommended: 1200x630px.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
                <button
                  onClick={() => toggleSection('codeInjection')}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Icon name="code" size={24} className="text-amber-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-white font-semibold text-lg">Custom Code Injection</p>
                      <p className="text-slate-500 text-sm">Add custom scripts, meta tags, or tracking codes injected into the page HTML</p>
                    </div>
                  </div>
                  <Icon
                    name={expandedSections.codeInjection ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    className="text-slate-400 flex-shrink-0"
                  />
                </button>

                {expandedSections.codeInjection && (
                  <div className="space-y-4 mt-6 pt-6 border-t border-[#1f1f1f]">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Custom Head Code</label>
                      <textarea
                        value={marketingSettings.customHeadCode}
                        onChange={(e) => setMarketingSettings({ ...marketingSettings, customHeadCode: e.target.value })}
                        placeholder="<!-- Scripts, meta tags, or styles for <head> -->"
                        rows={4}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm"
                      />
                      <p className="text-xs text-slate-500 mt-1">Injected before &lt;/head&gt;. Use for TikTok Pixel, Hotjar, Crisp, etc.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Custom Body Code</label>
                      <textarea
                        value={marketingSettings.customBodyCode}
                        onChange={(e) => setMarketingSettings({ ...marketingSettings, customBodyCode: e.target.value })}
                        placeholder="<!-- Scripts for end of <body> -->"
                        rows={4}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm"
                      />
                      <p className="text-xs text-slate-500 mt-1">Injected before &lt;/body&gt;.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <h4 className="text-sm font-medium text-blue-400 mb-2">Conversion Events</h4>
                <p className="text-xs text-slate-400">When tracking IDs are configured, the following events fire automatically:</p>
                <ul className="text-xs text-slate-400 mt-2 space-y-1 list-disc list-inside">
                  <li><strong className="text-slate-300">PageView</strong> — Every page load</li>
                  <li><strong className="text-slate-300">ViewContent</strong> — Product detail page</li>
                  <li><strong className="text-slate-300">AddToCart</strong> — Item added to cart</li>
                  <li><strong className="text-slate-300">InitiateCheckout</strong> — Checkout page opened</li>
                  <li><strong className="text-slate-300">Purchase</strong> — Order completed with value</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="space-y-6">
              {/* Meta Tags */}
              <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
                <button onClick={() => toggleSection('globalMetaTags')} className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon name="tag" size={24} className="text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-white font-semibold text-lg">Global Meta Tags</p>
                      <p className="text-slate-500 text-sm">Title template, meta description, and canonical URL</p>
                    </div>
                  </div>
                  <Icon name={expandedSections.globalMetaTags ? 'chevron-up' : 'chevron-down'} size={20} className="text-slate-400 flex-shrink-0" />
                </button>
                {expandedSections.globalMetaTags && (
                  <div className="space-y-4 mt-6 pt-6 border-t border-[#1f1f1f]">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Title Template</label>
                      <input type="text" value={seoSettings.globalMetaTitleTemplate} onChange={(e) => setSeoSettings({ ...seoSettings, globalMetaTitleTemplate: e.target.value })} placeholder="{{title}} | Zenorar" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                      <p className="text-xs text-slate-500 mt-1">Use {'{{title}}'} as placeholder for page title. Example: {'{{title}}'} | My Store</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Default Meta Description</label>
                      <textarea value={seoSettings.globalMetaDescription} onChange={(e) => setSeoSettings({ ...seoSettings, globalMetaDescription: e.target.value })} placeholder="Your marketplace description for search engines..." rows={3} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Canonical URL Prefix</label>
                      <input type="text" value={seoSettings.canonicalUrlPrefix} onChange={(e) => setSeoSettings({ ...seoSettings, canonicalUrlPrefix: e.target.value })} placeholder="https://zenorar.com" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                  </div>
                )}
              </div>

              {/* Search Console */}
              <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
                <button onClick={() => toggleSection('searchVerification')} className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <Icon name="check-circle" size={24} className="text-green-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-white font-semibold text-lg">Search Engine Verification</p>
                      <p className="text-slate-500 text-sm">Google Search Console verification code</p>
                    </div>
                  </div>
                  <Icon name={expandedSections.searchVerification ? 'chevron-up' : 'chevron-down'} size={20} className="text-slate-400 flex-shrink-0" />
                </button>
                {expandedSections.searchVerification && (
                  <div className="mt-6 pt-6 border-t border-[#1f1f1f]">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Google Search Console Verification</label>
                    <input type="text" value={seoSettings.googleSiteVerification} onChange={(e) => setSeoSettings({ ...seoSettings, googleSiteVerification: e.target.value })} placeholder="Google verification code" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    <p className="text-xs text-slate-500 mt-1">The content value from the meta tag Google gives you.</p>
                  </div>
                )}
              </div>

              {/* Open Graph */}
              <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
                <button onClick={() => toggleSection('openGraph')} className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Icon name="share" size={24} className="text-blue-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-white font-semibold text-lg">Open Graph / Social Sharing Defaults</p>
                      <p className="text-slate-500 text-sm">OG title, description, type, and Twitter card settings</p>
                    </div>
                  </div>
                  <Icon name={expandedSections.openGraph ? 'chevron-up' : 'chevron-down'} size={20} className="text-slate-400 flex-shrink-0" />
                </button>
                {expandedSections.openGraph && (
                  <div className="space-y-4 mt-6 pt-6 border-t border-[#1f1f1f]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Default OG Title</label>
                        <input type="text" value={seoSettings.defaultOgTitle} onChange={(e) => setSeoSettings({ ...seoSettings, defaultOgTitle: e.target.value })} placeholder="Zenorar Marketplace" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Default OG Type</label>
                        <select value={seoSettings.defaultOgType} onChange={(e) => setSeoSettings({ ...seoSettings, defaultOgType: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50">
                          <option value="website">website</option>
                          <option value="article">article</option>
                          <option value="product">product</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Default OG Description</label>
                      <textarea value={seoSettings.defaultOgDescription} onChange={(e) => setSeoSettings({ ...seoSettings, defaultOgDescription: e.target.value })} placeholder="Description shown when shared on social media..." rows={2} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Twitter Card Type</label>
                      <select value={seoSettings.twitterCardType} onChange={(e) => setSeoSettings({ ...seoSettings, twitterCardType: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50">
                        <option value="summary_large_image">Summary Large Image</option>
                        <option value="summary">Summary</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Structured Data */}
              <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
                <button onClick={() => toggleSection('structuredData')} className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <Icon name="database" size={24} className="text-purple-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-white font-semibold text-lg">Structured Data (JSON-LD)</p>
                      <p className="text-slate-500 text-sm">Used for rich snippets in Google search results</p>
                    </div>
                  </div>
                  <Icon name={expandedSections.structuredData ? 'chevron-up' : 'chevron-down'} size={20} className="text-slate-400 flex-shrink-0" />
                </button>
                {expandedSections.structuredData && (
                  <div className="space-y-4 mt-6 pt-6 border-t border-[#1f1f1f]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Organization Name</label>
                        <input type="text" value={seoSettings.structuredDataOrgName} onChange={(e) => setSeoSettings({ ...seoSettings, structuredDataOrgName: e.target.value })} placeholder="Zenorar" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Organization URL</label>
                        <input type="text" value={seoSettings.structuredDataOrgUrl} onChange={(e) => setSeoSettings({ ...seoSettings, structuredDataOrgUrl: e.target.value })} placeholder="https://zenorar.com" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Organization Logo URL</label>
                      <input type="text" value={seoSettings.structuredDataOrgLogo} onChange={(e) => setSeoSettings({ ...seoSettings, structuredDataOrgLogo: e.target.value })} placeholder="https://zenorar.com/logo.png" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Social Profiles</label>
                      <textarea value={seoSettings.structuredDataSocialProfiles} onChange={(e) => setSeoSettings({ ...seoSettings, structuredDataSocialProfiles: e.target.value })} placeholder="https://twitter.com/zenorar&#10;https://facebook.com/zenorar&#10;https://instagram.com/zenorar" rows={3} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                      <p className="text-xs text-slate-500 mt-1">One URL per line.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Robots.txt */}
              <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
                <button onClick={() => toggleSection('robotsTxt')} className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                      <Icon name="file" size={24} className="text-orange-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-white font-semibold text-lg">Robots.txt</p>
                      <p className="text-slate-500 text-sm">Control which pages search engines can crawl</p>
                    </div>
                  </div>
                  <Icon name={expandedSections.robotsTxt ? 'chevron-up' : 'chevron-down'} size={20} className="text-slate-400 flex-shrink-0" />
                </button>
                {expandedSections.robotsTxt && (
                  <div className="mt-6 pt-6 border-t border-[#1f1f1f]">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Custom Robots.txt Content</label>
                    <textarea value={seoSettings.robotsTxtContent} onChange={(e) => setSeoSettings({ ...seoSettings, robotsTxtContent: e.target.value })} placeholder="User-agent: *&#10;Allow: /&#10;Disallow: /admin/&#10;Disallow: /api/&#10;Sitemap: https://zenorar.com/sitemap.xml" rows={6} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm" />
                    <p className="text-xs text-slate-500 mt-1">Leave empty to use defaults. Controls which pages search engines can crawl.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Activity Log Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium">Admin Activity Log</h3>
                <select
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm text-white focus:outline-none"
                >
                  <option value="">All Actions</option>
                  <option value="PIN_SETUP">PIN Setup</option>
                  <option value="PIN_CHANGED">PIN Changed</option>
                  <option value="PIN_VERIFICATION_FAILED">PIN Failed</option>
                  <option value="LICENSE_SUSPENDED">License Suspended</option>
                  <option value="LICENSE_REVOKED">License Revoked</option>
                  <option value="LICENSE_GENERATED_MANUAL">License Generated</option>
                  <option value="R2_CREDENTIALS_CHANGED">R2 Settings Changed</option>
                  <option value="PROTECTION_LEVELS_CHANGED">Protection Levels Changed</option>
                  <option value="DATA_REVEALED">Data Revealed</option>
                </select>
              </div>

              {activityLoading ? (
                <p className="text-slate-500 text-sm p-4">Loading...</p>
              ) : activityLogs.length === 0 ? (
                <p className="text-slate-500 text-sm p-4">No activity logs found.</p>
              ) : (
                <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[#141414]">
                        <tr>
                          <th className="text-left p-3 text-slate-400 font-medium">Date</th>
                          <th className="text-left p-3 text-slate-400 font-medium">Admin</th>
                          <th className="text-left p-3 text-slate-400 font-medium">Action</th>
                          <th className="text-left p-3 text-slate-400 font-medium">Target</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activityLogs.map((log: any) => (
                          <tr key={log.id} className="border-t border-[#2a2a2a]">
                            <td className="p-3 text-slate-300 text-xs whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                            <td className="p-3 text-white text-xs">{log.admin?.name || 'Unknown'}</td>
                            <td className="p-3">
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                log.action.includes('FAILED') ? 'bg-red-500/10 text-red-400' :
                                log.action.includes('REVOKED') ? 'bg-red-500/10 text-red-400' :
                                log.action.includes('SUSPENDED') ? 'bg-yellow-500/10 text-yellow-400' :
                                'bg-blue-500/10 text-blue-400'
                              }`}>
                                {log.action.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="p-3 text-slate-400 text-xs font-mono">{log.targetType ? `${log.targetType} ${log.targetId ? '#' + log.targetId.slice(0, 8) : ''}` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {activityPagination.pages > 1 && (
                    <div className="flex items-center justify-between p-3 border-t border-[#2a2a2a]">
                      <span className="text-xs text-slate-500">{activityPagination.total} total entries</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadActivityLogs(activityPagination.page - 1)}
                          disabled={activityPagination.page <= 1}
                          className="px-3 py-1 text-xs bg-[#2a2a2a] text-gray-300 rounded disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <span className="px-3 py-1 text-xs text-slate-400">
                          Page {activityPagination.page} of {activityPagination.pages}
                        </span>
                        <button
                          onClick={() => loadActivityLogs(activityPagination.page + 1)}
                          disabled={activityPagination.page >= activityPagination.pages}
                          className="px-3 py-1 text-xs bg-[#2a2a2a] text-gray-300 rounded disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        {/* Recent Changes (Audit Log) */}
        <div className="mt-6">
          <button
            onClick={() => { setShowAuditLog(!showAuditLog); if (!showAuditLog && auditLogs.length === 0) handleFetchAuditLog() }}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <Icon name={showAuditLog ? 'chevron-down' : 'chevron-right'} size={16} />
            Recent Changes
          </button>
          {showAuditLog && (
            <div className="mt-3 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
              {auditLogs.length === 0 ? (
                <p className="p-4 text-slate-500 text-sm">No recent changes recorded.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#141414] sticky top-0">
                      <tr>
                        <th className="text-left p-3 text-slate-400 font-medium">Setting</th>
                        <th className="text-left p-3 text-slate-400 font-medium">Action</th>
                        <th className="text-left p-3 text-slate-400 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log: any, i: number) => (
                        <tr key={log.id || i} className="border-t border-[#2a2a2a]">
                          <td className="p-3 text-white font-mono text-xs">{log.settingKey}</td>
                          <td className="p-3 text-slate-300">{log.action}</td>
                          <td className="p-3 text-slate-500">{new Date(log.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Sticky Save Bar at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-[#1f1f1f] py-3 px-4 sm:px-6 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-end gap-3 sm:gap-4">
          {hasUnsavedChanges ? (
            <>
              <button
                onClick={handleCancelChanges}
                className="px-4 sm:px-6 py-2 sm:py-2.5 text-slate-400 hover:text-white border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-lg transition-colors text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-primary hover:bg-primary/90 text-black font-semibold px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base min-w-[140px]"
              >
                {saving ? (
                  <>
                    <Icon name="loading" size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Icon name="check" size={16} />
                    Save Changes
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-emerald-500 text-sm sm:text-base">
              <Icon name="check" size={18} />
              <span>Saved</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom padding to account for sticky save bar */}
      <div className="h-20" />
    </AdminLayout>
  )
}
