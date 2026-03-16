'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { BrowserProvider, parseEther, formatEther, getAddress } from 'ethers'
import { loadStripe, Stripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import Header from '@/components/layout/Header'
import CategoryNav from '@/components/layout/CategoryNav'
import Footer from '@/components/layout/Footer'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import Icon from '@/components/ui/Icon'
import FlagIcon from '@/components/ui/FlagIcon'
import { CardVisualMini } from '@/components/cards/CardVisual'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/contexts/AuthContext'
import { usePreferences } from '@/contexts/PreferencesContext'
import { apiFetch, getSessionId } from '@/lib/api/client'
import { getBalance } from '@/lib/api/wallet'
import { formatCurrency, convertPrice, getStripeCurrency, getExchangeRate } from '@/lib/currency'

// Crypto conversion rates (in production, fetch from API)
const CRYPTO_RATES: Record<string, number> = {
  BTC: 0.000024,      // 1 USD = 0.000024 BTC (approx $42,000/BTC)
  ETH: 0.00042,       // 1 USD = 0.00042 ETH (approx $2,380/ETH)
  USDT_ERC20: 1.0,    // 1 USD = 1 USDT (stablecoin)
  USDT_BEP20: 1.0,    // 1 USD = 1 USDT (stablecoin)
  USDT_TRC20: 1.0,    // 1 USD = 1 USDT (stablecoin)
  BNB: 0.0033,        // 1 USD = 0.0033 BNB (approx $300/BNB)
  USDC: 1.0,          // 1 USD = 1 USDC (stablecoin)
  SOL: 0.0125,        // 1 USD = 0.0125 SOL (approx $80/SOL)
  MATIC: 1.25,        // 1 USD = 1.25 MATIC (approx $0.80/MATIC) - Legacy support
  TRON: 0.0083,       // 1 USD = 0.0083 TRX (approx $0.12/TRX)
}

type PaymentMethod = 'wallet' | 'manual-crypto' | 'stripe' | 'paystack' | 'paypal'
type CryptoNetwork = 'BTC' | 'ETH' | 'USDT_ERC20' | 'USDT_BEP20' | 'USDT_TRC20' | 'BNB' | 'USDC' | 'SOL' | 'MATIC' | 'TRON'

// Helper to check if a network is EVM-compatible
const isEVMNetwork = (network: CryptoNetwork) => ['ETH', 'BNB', 'MATIC'].includes(network)

interface WalletState {
  address: string | null
  balance: string | null
  network: string | null
  isConnected: boolean
}

export default function PaymentPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { items, total, clearCart } = useCart()
  const { formatPrice, preferences } = usePreferences()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wallet')
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [stripeConfigError, setStripeConfigError] = useState<string | null>(null)
  const [paystackPublicKey, setPaystackPublicKey] = useState<string>('')
  const [paystackKeyLoaded, setPaystackKeyLoaded] = useState(false)
  const [selectedNetwork, setSelectedNetwork] = useState<CryptoNetwork>('BTC')
  const [walletState, setWalletState] = useState<WalletState>({
    address: null,
    balance: null,
    network: null,
    isConnected: false,
  })
  const [walletError, setWalletError] = useState<string>('')
  const [txHash, setTxHash] = useState<string>('')
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'connecting' | 'paying' | 'confirming' | 'success' | 'error'>('idle')
  const [discountCode, setDiscountCode] = useState('')
  const [discountAmount, setDiscountAmount] = useState(0)
  const [cryptoWallets, setCryptoWallets] = useState<Record<string, string>>({})
  const [loadingWallets, setLoadingWallets] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [receivingWallet, setReceivingWallet] = useState<string>(process.env.NEXT_PUBLIC_RECEIVING_WALLET || '0xF9a3ebE268492e32c24F43723eA83Ea5Df013064')
  const [btcReceivingAddress, setBtcReceivingAddress] = useState<string>('')
  const [tronReceivingAddress, setTronReceivingAddress] = useState<string>('')
  const [enabledProviders, setEnabledProviders] = useState({
    wallet: true, // MetaMask is always available
    manualCrypto: false,
    stripe: false,
    paystack: false,
    paypal: false,
  })
  const [useWalletBalance, setUseWalletBalance] = useState(true)

  // Virtual number provider availability state
  const [providerAvailable, setProviderAvailable] = useState<boolean | null>(null)
  const [providerCheckLoading, setProviderCheckLoading] = useState(false)
  const [providerError, setProviderError] = useState<string>('')

  // Crypto verification state
  const [cryptoPaymentInitiated, setCryptoPaymentInitiated] = useState(false)
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null)
  const [cryptoVerificationStatus, setCryptoVerificationStatus] = useState<'idle' | 'pending' | 'confirmed' | 'expired'>('idle')
  const [cryptoTimeRemaining, setCryptoTimeRemaining] = useState<number>(45 * 60 * 1000) // 45 minutes in ms
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null)
  const [userTxHash, setUserTxHash] = useState<string>('')
  const [confirmedTxHash, setConfirmedTxHash] = useState<string>('')
  const [explorerUrl, setExplorerUrl] = useState<string>('')

  // Fetch wallet balance for authenticated users
  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet', 'balance'],
    queryFn: async () => {
      const result = await getBalance()
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load wallet balance')
      }
      return result.data
    },
    enabled: isAuthenticated && !authLoading,
  })

  const walletBalance = walletData?.balance || 0

  // State for excluding virtual numbers when provider is unavailable
  const [excludeVirtualNumbers, setExcludeVirtualNumbers] = useState(false)

  // Load discount from sessionStorage
  useEffect(() => {
    const code = sessionStorage.getItem('discount_code')
    const amount = sessionStorage.getItem('discount_amount')
    if (code && amount) {
      setDiscountCode(code)
      setDiscountAmount(parseFloat(amount))
    }
  }, [])

  // Check if virtual numbers should be excluded (set by CartDropdown when provider unavailable)
  useEffect(() => {
    const shouldExclude = sessionStorage.getItem('excludeVirtualNumbers') === 'true'
    setExcludeVirtualNumbers(shouldExclude)
    // Clean up the flag after reading
    if (shouldExclude) {
      sessionStorage.removeItem('excludeVirtualNumbers')
    }
  }, [])

  // Filter items based on exclusion flag
  const displayItems = excludeVirtualNumbers
    ? items.filter(item => item.product?.metadata?.productType !== 'virtual_number')
    : items

  // Recalculate total for display items
  const displayTotal = displayItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const excludedVirtualNumberCount = items.length - displayItems.length

  // Fetch enabled payment providers on mount
  useEffect(() => {
    apiFetch('/settings/public')
      .then((result) => {
        if (result.success && result.data) {
          const data = result.data as any
          const providers = {
            wallet: data.walletEnabled === true, // Check if wallet is enabled in settings
            manualCrypto: data.cryptoEnabled === true,
            stripe: data.stripeEnabled === true,
            paystack: data.paystackEnabled === true,
            paypal: data.paypalEnabled === true,
          }
          setEnabledProviders(providers)

          // Set receiving wallet addresses from settings
          if (data.receivingWalletAddress) {
            setReceivingWallet(data.receivingWalletAddress)
          }
          if (data.btcAddress) {
            setBtcReceivingAddress(data.btcAddress)
          }
          if (data.usdtTronAddress) {
            setTronReceivingAddress(data.usdtTronAddress) // TRON and USDT TRC20 use same address
          }

          // Set default payment method to first enabled provider
          if (providers.wallet) {
            setPaymentMethod('wallet')
          } else if (providers.manualCrypto) {
            setPaymentMethod('manual-crypto')
          } else if (providers.stripe) {
            setPaymentMethod('stripe')
          } else if (providers.paystack) {
            setPaymentMethod('paystack')
          } else if (providers.paypal) {
            setPaymentMethod('paypal')
          }
        }
      })
      .catch((err) => console.error('❌ Failed to load payment providers:', err))
  }, [])

  // Fetch crypto wallet addresses when manual-crypto is selected
  useEffect(() => {
    if (paymentMethod === 'manual-crypto') {
      setLoadingWallets(true)
      // Fetch wallet addresses from backend settings
      apiFetch('/settings/public')
        .then((result) => {
          if (result.success && result.data) {
            const wallets: Record<string, string> = {}
            const data = result.data as any

            // Map settings to wallet addresses
            if (data.btcAddress) wallets['BTC'] = data.btcAddress
            if (data.ethAddress) wallets['ETH'] = data.ethAddress
            if (data.usdtEthAddress) wallets['USDT_ERC20'] = data.usdtEthAddress
            if (data.usdtBscAddress) wallets['USDT_BEP20'] = data.usdtBscAddress
            if (data.usdtTronAddress) wallets['USDT_TRC20'] = data.usdtTronAddress
            if (data.bnbAddress) wallets['BNB'] = data.bnbAddress
            if (data.usdcAddress) wallets['USDC'] = data.usdcAddress
            if (data.solAddress) wallets['SOL'] = data.solAddress

            setCryptoWallets(wallets)
          }
        })
        .catch((err) => console.error('Failed to load wallet addresses:', err))
        .finally(() => setLoadingWallets(false))
    }
  }, [paymentMethod])

  // Load Stripe publishable key when Stripe is enabled
  useEffect(() => {
    if (enabledProviders.stripe) {
      setStripeConfigError(null)
      fetch('/api/payments/stripe/config')
        .then(res => res.json())
        .then(data => {
          if (data.data?.publishableKey) {
            setStripePromise(loadStripe(data.data.publishableKey))
          } else {
            setStripeConfigError(data.error || 'Stripe is not configured')
          }
        })
        .catch(err => {
          console.error('Failed to load Stripe config:', err)
          setStripeConfigError('Failed to load Stripe. Please try again.')
        })
    }
  }, [enabledProviders.stripe])

  // Load Paystack public key + script when Paystack is enabled
  useEffect(() => {
    if (enabledProviders.paystack) {
      // Try Railway first (fast), fall back to local API (reliable)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
      fetch(`${apiUrl}/payments/paystack/config`)
        .then(res => {
          if (!res.ok) throw new Error('Railway failed')
          return res.json()
        })
        .catch(() => {
          return fetch('/api/payments/paystack/config').then(res => res.json())
        })
        .then(data => {
          if (data.data?.publicKey) {
            setPaystackPublicKey(data.data.publicKey)
          }
          setPaystackKeyLoaded(true)
        })
        .catch(err => {
          console.error('Failed to load Paystack config:', err)
          setPaystackKeyLoaded(true) // Mark as loaded even on error to stop infinite loading
        })

      // Load Paystack inline script
      if (!document.querySelector('script[src*="paystack"]')) {
        const script = document.createElement('script')
        script.src = 'https://js.paystack.co/v1/inline.js'
        script.async = true
        document.head.appendChild(script)
      }
    }
  }, [enabledProviders.paystack])

  // Check virtual number provider availability when cart has virtual numbers
  // Use displayItems (which excludes virtual numbers when exclusion flag is set)
  useEffect(() => {
    // If virtual numbers are being excluded, skip the provider check entirely
    const hasVirtualNumbersInDisplayItems = displayItems.some((item: any) =>
      item.product?.metadata?.productType === 'virtual_number'
    )

    if (!hasVirtualNumbersInDisplayItems) {
      // No virtual numbers in display items, no need to check provider
      setProviderAvailable(true)
      setProviderError('')
      setProviderCheckLoading(false)
      return
    }

    // Check provider availability
    setProviderCheckLoading(true)
    fetch('/backend/orders/check-provider')
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.data?.providerAvailable) {
          setProviderAvailable(true)
          setProviderError('')
        } else {
          setProviderAvailable(false)
          setProviderError('Virtual number service is currently unavailable. Please try again later or contact support.')
        }
      })
      .catch((err) => {
        console.error('Failed to check provider availability:', err)
        setProviderAvailable(false)
        setProviderError('Unable to verify virtual number service availability. Please try again later.')
      })
      .finally(() => setProviderCheckLoading(false))
  }, [displayItems])

  // Polling effect for crypto payment verification
  useEffect(() => {
    if (!pendingPaymentId || cryptoVerificationStatus !== 'pending') return

    let pollInterval: NodeJS.Timeout | null = null
    let countdownInterval: NodeJS.Timeout | null = null

    // Poll every 30 seconds for blockchain verification
    const checkPayment = async () => {
      try {
        const response = await fetch(`/api/payments/crypto/check/${pendingPaymentId}`)
        const result = await response.json()

        if (result.success) {
          setLastCheckTime(new Date())

          if (result.data.status === 'CONFIRMED' || result.data.status === 'MANUALLY_CONFIRMED') {
            setCryptoVerificationStatus('confirmed')
            setConfirmedTxHash(result.data.txHash || '')
            setExplorerUrl(result.data.explorerUrl || '')
            // Clear intervals
            if (pollInterval) clearInterval(pollInterval)
            if (countdownInterval) clearInterval(countdownInterval)
            // Redirect to success after delay
            setTimeout(() => {
              clearCart()
              const orderNumber = sessionStorage.getItem('pending_order_number') || ''
              router.push(`/checkout/success?txHash=${result.data.txHash || ''}&orderNumber=${orderNumber}`)
            }, 3000)
          } else if (result.data.status === 'EXPIRED') {
            setCryptoVerificationStatus('expired')
            if (pollInterval) clearInterval(pollInterval)
            if (countdownInterval) clearInterval(countdownInterval)
          } else {
            setCryptoTimeRemaining(result.data.timeRemaining || 0)
          }
        }
      } catch (error) {
        console.error('Payment check error:', error)
      }
    }

    // Initial check
    checkPayment()

    // Start polling every 30 seconds
    pollInterval = setInterval(checkPayment, 30000)

    // Countdown timer (update every second)
    countdownInterval = setInterval(() => {
      setCryptoTimeRemaining(prev => {
        if (prev <= 1000) {
          setCryptoVerificationStatus('expired')
          return 0
        }
        return prev - 1000
      })
    }, 1000)

    return () => {
      if (pollInterval) clearInterval(pollInterval)
      if (countdownInterval) clearInterval(countdownInterval)
    }
  }, [pendingPaymentId, cryptoVerificationStatus, clearCart, router])

  // Calculate totals (subtract discount and wallet balance if applicable)
  // Use displayTotal when virtual numbers are excluded
  const effectiveTotal = excludeVirtualNumbers ? displayTotal : total
  const subtotalAfterDiscount = effectiveTotal - discountAmount
  const walletAmountToApply = useWalletBalance && walletBalance > 0
    ? Math.min(walletBalance, subtotalAfterDiscount)
    : 0
  const finalTotal = subtotalAfterDiscount - walletAmountToApply

  const getCryptoAmount = (network: CryptoNetwork): string => {
    // Stablecoins are always 1:1 with USD
    const stablecoins = ['USDT_ERC20', 'USDT_BEP20', 'USDT_TRC20', 'USDC']
    if (stablecoins.includes(network)) return (finalTotal * 1.0).toFixed(6)
    // MATIC: legacy, not in live rates
    if (network === 'MATIC') return (finalTotal * 1.25).toFixed(6)
    // BTC, ETH, BNB, SOL, TRON: use live exchange rates
    const rate = getExchangeRate(network)
    return (finalTotal * rate).toFixed(6)
  }

  // Format time remaining as MM:SS
  const formatTimeRemaining = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // Initiate crypto payment verification (when user clicks "I've Sent Payment")
  const initiateCryptoVerification = async () => {
    if (!cryptoWallets[selectedNetwork]) {
      setWalletError('Wallet address not configured for this network')
      return
    }

    setPaymentStatus('paying')
    setWalletError('')

    try {
      // Create order first
      const order = await createOrder()
      sessionStorage.setItem('pending_order_number', order.orderNumber)

      // Initiate payment verification
      const response = await fetch('/api/payments/crypto/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': getSessionId(),
          ...(localStorage.getItem('auth_token') && {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          }),
        },
        body: JSON.stringify({
          orderId: order.id,
          network: selectedNetwork,
          receivingAddress: cryptoWallets[selectedNetwork],
          expectedAmount: getCryptoAmount(selectedNetwork),
          usdAmount: finalTotal,
          userTxHash: userTxHash || undefined,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setPendingPaymentId(result.data.paymentId)
        setCryptoTimeRemaining(new Date(result.data.expiresAt).getTime() - Date.now())
        setCryptoVerificationStatus('pending')
        setCryptoPaymentInitiated(true)
        setPaymentStatus('confirming')
      } else {
        throw new Error(result.error || 'Failed to initiate payment verification')
      }
    } catch (error: any) {
      console.error('Payment initiation error:', error)
      setWalletError(error.message || 'Failed to initiate payment verification')
      setPaymentStatus('error')
    }
  }

  // Update user transaction hash
  const updateUserTxHash = async () => {
    if (!pendingPaymentId || !userTxHash) return

    try {
      const response = await fetch(`/api/payments/crypto/check/${pendingPaymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userTxHash }),
      })
      const result = await response.json()
      if (result.success) {
        setExplorerUrl(result.data.explorerUrl || '')
      }
    } catch (error) {
      console.error('Failed to update transaction hash:', error)
    }
  }

  // Reset crypto verification state
  const resetCryptoVerification = () => {
    setCryptoPaymentInitiated(false)
    setPendingPaymentId(null)
    setCryptoVerificationStatus('idle')
    setCryptoTimeRemaining(45 * 60 * 1000)
    setUserTxHash('')
    setConfirmedTxHash('')
    setExplorerUrl('')
    setPaymentStatus('idle')
    setWalletError('')
  }

  // Connect wallet - Routes to appropriate wallet based on selected network
  const connectWallet = async () => {
    // Route to BTC wallet connection
    if (selectedNetwork === 'BTC') {
      return connectBtcWallet()
    }

    // Route to TRON wallet connection
    if (selectedNetwork === 'TRON') {
      return connectTronWallet()
    }

    // EVM wallet connection (ETH, BNB, MATIC)
    if (typeof window === 'undefined' || !window.ethereum) {
      setWalletError('Please install a Web3 wallet (MetaMask, Coinbase Wallet, etc.)')
      return
    }

    setPaymentStatus('connecting')
    setWalletError('')

    try {
      // Request account access - works with any EIP-1193 compatible wallet
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[]

      if (!accounts || accounts.length === 0) {
        throw new Error('No wallet account found')
      }

      // Use ethers BrowserProvider which handles RPC internally
      const provider = new BrowserProvider(window.ethereum)

      // Get balance using the wallet's provider (avoids RPC URL issues)
      const balance = await provider.getBalance(accounts[0])
      const network = await provider.getNetwork()

      setWalletState({
        address: accounts[0],
        balance: formatEther(balance),
        network: network.name,
        isConnected: true,
      })
      setPaymentStatus('idle')
    } catch (err) {
      console.error('Wallet connection error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet'

      // Provide user-friendly error messages
      if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
        setWalletError('Connection request was rejected. Please try again.')
      } else if (errorMessage.includes('No wallet account')) {
        setWalletError('No wallet accounts found. Please create an account in your wallet.')
      } else if (errorMessage.includes('Invalid RPC') || errorMessage.includes('RPC URL')) {
        setWalletError('Your wallet\'s RPC endpoint is invalid. Please switch to a different network (like Polygon, BSC, or Arbitrum) or update your network RPC settings. For Trust Wallet: Settings → Network → Edit → Change RPC URL to https://eth.llamarpc.com')
      } else {
        setWalletError('Failed to connect wallet. Please try again or use a different payment method.')
      }

      setPaymentStatus('error')
    }
  }

  // Connect BTC wallet via Unisat
  const connectBtcWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).unisat) {
      setWalletError('Please install Unisat wallet extension to pay with Bitcoin')
      return
    }

    setPaymentStatus('connecting')
    setWalletError('')

    try {
      const unisat = (window as any).unisat
      const accounts = await unisat.requestAccounts()

      if (!accounts || accounts.length === 0) {
        throw new Error('No Bitcoin wallet account found')
      }

      const balance = await unisat.getBalance()

      setWalletState({
        address: accounts[0],
        balance: (balance.total / 100000000).toFixed(8), // satoshis to BTC
        network: 'Bitcoin',
        isConnected: true,
      })
      setPaymentStatus('idle')
    } catch (err) {
      console.error('BTC wallet connection error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect Bitcoin wallet'

      if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
        setWalletError('Connection request was rejected. Please try again.')
      } else {
        setWalletError('Failed to connect Bitcoin wallet. Please try again.')
      }
      setPaymentStatus('error')
    }
  }

  // Connect TRON wallet via TronLink
  const connectTronWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).tronWeb) {
      setWalletError('Please install TronLink wallet extension to pay with TRON')
      return
    }

    setPaymentStatus('connecting')
    setWalletError('')

    try {
      const tronWeb = (window as any).tronWeb

      // Wait for TronLink to be ready
      if (!tronWeb.ready) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        if (!tronWeb.ready) {
          throw new Error('TronLink is not ready. Please unlock your wallet.')
        }
      }

      const address = tronWeb.defaultAddress.base58
      if (!address) {
        throw new Error('No TRON wallet account found')
      }

      const balanceSun = await tronWeb.trx.getBalance(address)

      setWalletState({
        address,
        balance: (balanceSun / 1000000).toFixed(6), // SUN to TRX
        network: 'Tron',
        isConnected: true,
      })
      setPaymentStatus('idle')
    } catch (err) {
      console.error('TRON wallet connection error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect TRON wallet'

      if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
        setWalletError('Connection request was rejected. Please try again.')
      } else {
        setWalletError(errorMessage || 'Failed to connect TRON wallet. Please try again.')
      }
      setPaymentStatus('error')
    }
  }

  // Disconnect wallet
  const disconnectWallet = () => {
    setWalletState({
      address: null,
      balance: null,
      network: null,
      isConnected: false,
    })
    setPaymentStatus('idle')
    setTxHash('')
  }

  // Copy wallet address to clipboard
  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      setCopiedAddress(true)
      setTimeout(() => setCopiedAddress(false), 2000)
    } catch (err) {
      console.error('Failed to copy address:', err)
    }
  }

  // Pay with wallet credits only (no external payment needed)
  const processCreditsPayment = async () => {
    setPaymentStatus('paying')
    try {
      // Check if cart has digital products requiring instant fulfillment
      const hasVirtualNumbers = items.some((item: any) => item.product.metadata?.productType === 'virtual_number')
      const hasGiftCards = items.some((item: any) =>
        (item.product as any).productType === 'gift_card' ||
        item.product.metadata?.productType === 'gift_card'
      )
      const hasCards = items.some((item: any) => {
        const productType = item.product.metadata?.productType || (item.product as any).productType
        return productType === 'instant_card' || productType === 'virtual_card'
      })
      const hasEsims = items.some((item: any) =>
        item.product.metadata?.productType === 'esim' ||
        item.product.category === 'esim'
      )
      const hasDigitalProducts = hasVirtualNumbers || hasGiftCards || hasCards || hasEsims

      if (hasDigitalProducts) {
        // Use local instant checkout API for digital products (handles provisioning)
        const response = await fetch('/api/orders/instant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('auth_token') && {
              Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
            }),
          },
          body: JSON.stringify({
            items: displayItems.map((item: any) => ({
              productId: item.product.id,
              name: item.product.name,
              quantity: item.quantity,
              price: item.price,
              // Use actual productType, default to 'digital' for regular products (not 'virtual_number')
              productType: item.product.metadata?.productType || item.product.product_type || 'digital',
              metadata: {
                ...item.product.metadata,
                friendlyName: item.product.name || item.product.metadata?.friendlyName,
                phoneNumber: item.product.metadata?.phoneNumber,
                countryId: item.product.metadata?.countryId,
                countryFlag: item.product.metadata?.countryFlag,
                countryName: item.product.metadata?.countryName,
                planCategory: item.product.metadata?.planCategory,
                durationDays: item.product.metadata?.durationDays,
                smsLimit: item.product.metadata?.smsLimit,
                minuteTier: item.product.metadata?.minuteTier,
                minuteIncluded: item.product.metadata?.minuteIncluded,
                minuteTierPrice: item.product.metadata?.minuteTierPrice,
                numberType: item.product.metadata?.numberType,
              },
            })),
            paymentMethod: 'wallet',
            total: effectiveTotal,
          }),
        })

        const result = await response.json()

        if (!result.success) {
          // Check if this was a refunded failed order
          if (result.data?.refunded) {
            throw new Error(`${result.error}. Your wallet has been refunded.`)
          }
          throw new Error(result.error || 'Failed to process order')
        }

        queryClient.invalidateQueries({ queryKey: ['wallet'] })
        clearCart()
        sessionStorage.setItem('checkoutPayment', JSON.stringify({
          method: 'wallet_credits',
          orderId: result.data.orderId,
          orderNumber: result.data.orderNumber,
        }))
        sessionStorage.setItem('pending_order_number', result.data.orderNumber)
        router.push('/checkout/success')
      } else {
        // Use backend for regular products
        const order = await createOrder('wallet_credits')
        queryClient.invalidateQueries({ queryKey: ['wallet'] })
        clearCart()
        sessionStorage.setItem('checkoutPayment', JSON.stringify({
          method: 'wallet_credits',
          orderId: order.id,
          orderNumber: order.orderNumber,
        }))
        sessionStorage.setItem('pending_order_number', order.orderNumber)
        router.push('/checkout/success')
      }
    } catch (err: any) {
      console.error('Credits payment error:', err)
      setPaymentStatus('error')
      setWalletError(err.message || 'Failed to process payment')
    }
  }

  // Helper function to create order (shared by all payment methods)
  const createOrder = async (overridePaymentMethod?: string) => {
    const shippingDataStr = sessionStorage.getItem('checkoutShipping')
    const shippingData = shippingDataStr ? JSON.parse(shippingDataStr) : {}

    // Transform cart items to order items format
    const orderItems = displayItems.map((item: any) => {
      const productType = item.product.metadata?.productType || item.product.product_type || 'default'
      const isGiftCard = productType === 'gift_card'

      return {
        id: item.product.id,
        productId: item.product.id,
        name: isGiftCard
          ? `${item.product.metadata?.brand || item.product.name} Gift Card ($${item.product.metadata?.denomination || item.price})`
          : item.product.name,
        quantity: item.quantity,
        price: item.price,
        license: isGiftCard ? null : (item.license || 'standard'),
        productType,
        metadata: {
          ...item.product.metadata,
          // Common fields
          friendlyName: item.product.name || item.product.metadata?.friendlyName,
          // Virtual number fields
          phoneNumber: item.product.metadata?.phoneNumber,
          countryId: item.product.metadata?.countryId,
          countryFlag: item.product.metadata?.countryFlag,
          countryName: item.product.metadata?.countryName,
          planCategory: item.product.metadata?.planCategory,
          durationDays: item.product.metadata?.durationDays,
          smsLimit: item.product.metadata?.smsLimit,
          minuteTier: item.product.metadata?.minuteTier,
          minuteIncluded: item.product.metadata?.minuteIncluded,
          minuteTierPrice: item.product.metadata?.minuteTierPrice,
          numberType: item.product.metadata?.numberType,
          // Gift card fields (normalized for fulfillment)
          ...(isGiftCard && {
            gift_card_id: item.product.metadata?.gift_card_id || item.product.metadata?.giftCardId || item.product.id,
            denomination: item.product.metadata?.denomination || item.price,
            brand: item.product.metadata?.brand || item.product.name,
            imageUrl: item.product.imageUrl || item.product.metadata?.imageUrl,
          }),
          // eSIM fields
          ...(productType === 'esim' && {
            esim_plan_id: item.product.metadata?.esim_plan_id || item.product.id,
          }),
        },
      }
    })

    // Use local order creation API
    const orderResponse = await fetch('/api/orders/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('auth_token') && {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        }),
      },
      body: JSON.stringify({
        items: orderItems,
        total: finalTotal,
        subtotal: displayTotal,
        paymentMethod: overridePaymentMethod || `crypto_${selectedNetwork.toLowerCase()}`,
        shippingData: {
          fullName: shippingData.fullName || 'Guest',
          email: shippingData.email || '',
          phone: shippingData.phone || '',
          address: shippingData.address || 'Digital Delivery',
          city: shippingData.city || 'N/A',
          state: shippingData.state || 'N/A',
          zipCode: shippingData.zipCode || '00000',
          notes: shippingData.notes || '',
        },
        discountCode: discountCode || undefined,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        sessionId: getSessionId(),
      }),
    })

    if (!orderResponse.ok) {
      const errorData = await orderResponse.json()
      console.error('Order creation failed:', errorData)
      throw new Error(errorData.error || errorData.message || 'Failed to create order')
    }

    const orderResult = await orderResponse.json()

    // Notify user: order placed
    apiFetch('/notifications/create', {
      method: 'POST',
      body: JSON.stringify({ type: 'ORDER_PLACED', title: 'Order Placed', message: `Your order #${orderResult.data.orderNumber} has been placed successfully.`, data: { orderId: orderResult.data.id, orderNumber: orderResult.data.orderNumber } }),
    }).catch(() => {})

    // Record discount usage if a discount was applied
    // Note: discount is now applied and usage incremented server-side during order creation.
    // This is a fallback in case the discount wasn't linked to the order for any reason.
    if (discountCode && discountAmount > 0) {
      apiFetch('/discounts/apply-to-order', {
        method: 'POST',
        body: JSON.stringify({ orderId: orderResult.data.id, discountCode, discountAmount }),
      }).catch(err => console.error('Failed to save discount to order:', err))
    }

    return orderResult.data
  }

  // Helper function to record payment and complete checkout
  const completePayment = async (orderId: string, orderNumber: string, txHash: string, cryptoAmount: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

    // Record the crypto payment in the backend
    await fetch(`${apiUrl}/payments/crypto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        txHash,
        walletAddress: walletState.address,
        network: selectedNetwork,
        cryptoAmount,
        usdAmount: finalTotal,
      }),
    }).catch(err => console.error('Failed to record payment:', err))

    // Store payment info
    sessionStorage.setItem('checkoutPayment', JSON.stringify({
      method: 'wallet',
      crypto: selectedNetwork,
      txHash,
      amount: cryptoAmount,
      usdAmount: finalTotal,
      walletAddress: walletState.address,
      orderId,
      orderNumber,
    }))

    // Notify user: payment confirmed
    apiFetch('/notifications/create', {
      method: 'POST',
      body: JSON.stringify({ type: 'PAYMENT_RECEIVED', title: 'Payment Confirmed', message: `Payment for order #${orderNumber} confirmed. Tx: ${txHash.slice(0, 10)}...`, data: { orderId, orderNumber, txHash } }),
    }).catch(() => {})

    setPaymentStatus('success')

    // Redirect to success page after short delay
    setTimeout(() => {
      clearCart()
      router.push(`/checkout/success?txHash=${txHash}&orderNumber=${orderNumber}`)
    }, 2000)
  }

  // Process BTC payment via Unisat
  const processBtcPayment = async () => {
    if (!walletState.isConnected || !(window as any).unisat) {
      setWalletError('Please connect your Bitcoin wallet first')
      return
    }

    if (!btcReceivingAddress) {
      setWalletError('Bitcoin receiving address not configured. Please contact support.')
      return
    }

    setPaymentStatus('paying')
    setWalletError('')

    try {
      const order = await createOrder()
      const cryptoAmount = getCryptoAmount('BTC')
      const satoshis = Math.round(parseFloat(cryptoAmount) * 100000000) // BTC to satoshis

      // Send BTC via Unisat
      const txid = await (window as any).unisat.sendBitcoin(btcReceivingAddress, satoshis)

      setTxHash(txid)
      setPaymentStatus('confirming')

      // For BTC, we don't wait for confirmation (takes too long), just record the payment
      await completePayment(order.id, order.orderNumber, txid, cryptoAmount)
    } catch (err: unknown) {
      console.error('BTC Payment error:', err)
      setPaymentStatus('error')
      if (err instanceof Error) {
        if (err.message.includes('User rejected') || err.message.includes('user rejected')) {
          setWalletError('Transaction was cancelled')
        } else if (err.message.includes('Insufficient')) {
          setWalletError('Insufficient BTC balance in your wallet')
        } else {
          setWalletError(err.message)
        }
      } else {
        setWalletError('Bitcoin payment failed. Please try again.')
      }
    }
  }

  // Process TRON payment via TronLink
  const processTronPayment = async () => {
    if (!walletState.isConnected || !(window as any).tronWeb) {
      setWalletError('Please connect your TRON wallet first')
      return
    }

    if (!tronReceivingAddress) {
      setWalletError('TRON receiving address not configured. Please contact support.')
      return
    }

    setPaymentStatus('paying')
    setWalletError('')

    try {
      const order = await createOrder()
      const cryptoAmount = getCryptoAmount('TRON')
      const sunAmount = Math.round(parseFloat(cryptoAmount) * 1000000) // TRX to SUN

      // Send TRX via TronLink
      const tronWeb = (window as any).tronWeb
      const tx = await tronWeb.trx.sendTransaction(tronReceivingAddress, sunAmount)

      if (!tx.result) {
        throw new Error('Transaction failed')
      }

      const txid = tx.txid || tx.transaction?.txID
      setTxHash(txid)
      setPaymentStatus('confirming')

      await completePayment(order.id, order.orderNumber, txid, cryptoAmount)
    } catch (err: unknown) {
      console.error('TRON Payment error:', err)
      setPaymentStatus('error')
      if (err instanceof Error) {
        if (err.message.includes('User rejected') || err.message.includes('Confirmation declined')) {
          setWalletError('Transaction was cancelled')
        } else if (err.message.includes('balance')) {
          setWalletError('Insufficient TRX balance in your wallet')
        } else {
          setWalletError(err.message)
        }
      } else {
        setWalletError('TRON payment failed. Please try again.')
      }
    }
  }

  // Process wallet payment - Routes to appropriate handler based on network
  const processWalletPayment = async () => {
    // Route to BTC payment
    if (selectedNetwork === 'BTC') {
      return processBtcPayment()
    }

    // Route to TRON payment
    if (selectedNetwork === 'TRON') {
      return processTronPayment()
    }

    // EVM payment (ETH, BNB, MATIC)
    if (!walletState.isConnected || !window.ethereum) {
      setWalletError('Please connect your wallet first')
      return
    }

    setPaymentStatus('paying')
    setWalletError('')

    try {
      const order = await createOrder()
      const cryptoAmount = getCryptoAmount(selectedNetwork)

      const provider = new BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()

      // Normalize wallet address to correct checksum format
      const normalizedAddress = getAddress(receivingWallet)

      // Create transaction
      const tx = await signer.sendTransaction({
        to: normalizedAddress,
        value: parseEther(cryptoAmount),
      })

      setTxHash(tx.hash)
      setPaymentStatus('confirming')

      // Wait for confirmation
      const receipt = await tx.wait()

      if (receipt && receipt.status === 1) {
        await completePayment(order.id, order.orderNumber, tx.hash, cryptoAmount)
      } else {
        throw new Error('Transaction failed')
      }
    } catch (err: unknown) {
      console.error('Payment error:', err)
      setPaymentStatus('error')
      if (err instanceof Error) {
        if (err.message.includes('user rejected') || err.message.includes('User denied')) {
          setWalletError('Transaction was cancelled')
        } else if (err.message.includes('insufficient funds')) {
          setWalletError('Insufficient funds in your wallet')
        } else {
          setWalletError(err.message)
        }
      } else {
        setWalletError('Payment failed. Please try again.')
      }
    }
  }

  // Handle card payment success (shared by Stripe and Paystack)
  const handleCardPaymentSuccess = (orderId: string, orderNumber: string) => {
    sessionStorage.setItem('checkoutPayment', JSON.stringify({
      method: paymentMethod,
      orderId,
      orderNumber,
      usdAmount: finalTotal,
    }))
    clearCart()
    router.push(`/checkout/success?orderNumber=${orderNumber}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsSubmitting(true)

    try {
      // Store payment data for the review step
      sessionStorage.setItem('checkoutPayment', JSON.stringify({
        method: paymentMethod,
        crypto: paymentMethod === 'manual-crypto' ? selectedNetwork : null,
        network: paymentMethod === 'manual-crypto' ? selectedNetwork : null,
        usdAmount: finalTotal,
      }))

      await new Promise(resolve => setTimeout(resolve, 1500))
      router.push('/checkout/review')
    } catch (error) {
      console.error('Payment error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <Icon name="loading" size={48} className="text-primary animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!items || items.length === 0) {
    return (
      <div className="min-h-screen bg-background-dark flex flex-col">
        <Header />
        <CategoryNav />
        <main className="flex-grow flex items-center justify-center px-8 py-24">
          <div className="text-center max-w-md mx-auto">
            <div className="w-32 h-32 rounded-full bg-surface-dark flex items-center justify-center mx-auto mb-8">
              <Icon name="cart" size={64} className="text-slate-600" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Your cart is empty</h1>
            <p className="text-slate-400 mb-8">
              Add some products to your cart before checkout.
            </p>
            <Link
              href="/scripts"
              className="bg-primary text-black font-bold px-8 py-4 rounded-xl hover:brightness-105 transition-all inline-flex items-center gap-2"
            >
              Browse Products
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      <Header />
      <CategoryNav />

      <main className="flex-grow max-w-container mx-auto px-4 md:px-8 lg:px-12 pb-24 w-full">
        <div className="py-4">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Checkout', href: '/checkout' },
              { label: 'Payment' }
            ]}
            className="mb-0"
          />
        </div>

        {/* Checkout Steps */}
        <div className="mb-8">
          <nav aria-label="Checkout progress" className="flex items-center justify-center">
            <ol className="flex items-center gap-4">
              {/* Step 1 - Completed */}
              <li className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center font-bold text-sm">
                  <Icon name="check" size={16} />
                </span>
                <span className="text-primary font-bold text-sm tracking-wide">Shipping</span>
              </li>

              <li aria-hidden="true" className="w-12 h-px bg-primary" />

              {/* Step 2 - Active */}
              <li className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center font-bold text-sm" aria-current="step">
                  2
                </span>
                <span className="text-primary font-bold text-sm tracking-wide">Payment</span>
              </li>

              <li aria-hidden="true" className="w-12 h-px bg-border-dark" />

              {/* Step 3 */}
              <li className="flex items-center gap-3 opacity-40">
                <span className="w-8 h-8 rounded-full bg-surface-dark text-slate-400 border border-border-dark flex items-center justify-center font-bold text-sm">
                  3
                </span>
                <span className="text-slate-400 font-bold text-sm tracking-wide">Review</span>
              </li>
            </ol>
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
          {/* Left Column - Payment Form */}
          <div className="col-span-1 lg:col-span-7">
            <div className="max-w-2xl">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2 tracking-tight">
                Payment Method
              </h1>
              <p className="text-sm md:text-base text-slate-500 mb-6 md:mb-10">
                Choose your preferred payment method to complete your order.
              </p>

              {/* Provider unavailable warning - blocks all payments for virtual numbers */}
              {providerError && providerAvailable === false && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 mb-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                      <Icon name="alert" size={24} className="text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-red-400 font-bold text-base mb-1">Service Temporarily Unavailable</h3>
                      <p className="text-red-400/80 text-sm">{providerError}</p>
                      <p className="text-red-400/60 text-xs mt-2">
                        All payment methods are disabled until the service is restored. You will not be charged.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Provider check loading state */}
              {providerCheckLoading && (
                <div className="bg-surface-dark border border-border-dark rounded-2xl p-6 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                    <p className="text-slate-400 text-sm">Verifying service availability...</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
                {/* Wallet Balance Section (Only for authenticated users with balance) */}
                {isAuthenticated && (
                  <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <Icon name="wallet" size={24} className="text-primary" />
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-base">Account Credits</h3>
                          <p className="text-slate-400 text-sm">
                            {walletLoading ? (
                              'Loading...'
                            ) : (
                              <>Available: <span className="text-primary font-bold">{formatCurrency(walletBalance)}</span></>
                            )}
                          </p>
                        </div>
                      </div>
                      {walletBalance > 0 && (
                        <button
                          type="button"
                          onClick={() => setUseWalletBalance(!useWalletBalance)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            useWalletBalance ? 'bg-primary' : 'bg-surface-dark border border-border-dark'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              useWalletBalance ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      )}
                    </div>

                    {walletBalance > 0 && useWalletBalance && (
                      <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-slate-300 text-sm">Credits Applied:</span>
                          <span className="text-primary font-bold text-lg">-{formatCurrency(walletAmountToApply)}</span>
                        </div>
                        <p className="text-slate-400 text-xs">
                          {walletAmountToApply >= subtotalAfterDiscount
                            ? 'Your wallet balance will cover the full amount!'
                            : 'Remaining balance will be charged via your selected payment method.'}
                        </p>
                      </div>
                    )}

                    {walletBalance === 0 && (
                      <div className="bg-surface-dark border border-border-dark rounded-xl p-4 text-center">
                        <p className="text-slate-400 text-sm mb-2">No credits available</p>
                        <Link
                          href="/profile/referrals"
                          className="text-primary text-sm font-medium hover:underline inline-flex items-center gap-1"
                        >
                          Earn credits by referring friends
                          <Icon name="arrow-right" size={14} />
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* Pay with Credits button when wallet covers full amount */}
                {useWalletBalance && finalTotal === 0 && (
                  <div className="mb-6 space-y-3">
                    <button
                      type="button"
                      onClick={processCreditsPayment}
                      disabled={paymentStatus === 'paying' || providerAvailable === false || providerCheckLoading}
                      className="w-full py-4 bg-primary text-black font-bold rounded-xl hover:brightness-105 transition-all flex items-center justify-center gap-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {paymentStatus === 'paying' ? (
                        <>
                          <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Icon name="wallet" size={24} />
                          Pay with Wallet
                        </>
                      )}
                    </button>
                    {/* Error display for wallet credits payment */}
                    {walletError && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <Icon name="alert" size={18} className="text-red-400" />
                          <p className="text-red-400 font-medium">Payment Failed</p>
                        </div>
                        <p className="text-red-400/80 text-sm">{walletError}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Method Selection */}
                <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 ${useWalletBalance && finalTotal === 0 || providerAvailable === false || providerCheckLoading ? 'opacity-30 pointer-events-none' : ''}`}>
                  {enabledProviders.wallet && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('wallet')}
                      className={`relative flex flex-col items-center p-3 md:p-5 bg-charcoal border rounded-xl cursor-pointer transition-colors ${
                        paymentMethod === 'wallet' ? 'border-primary ring-2 ring-primary/20' : 'border-border-dark hover:border-slate-700'
                      }`}
                    >
                      <Icon name="wallet" size={24} className="text-primary mb-1 md:mb-2" />
                      <div className="text-white font-bold text-xs md:text-sm">Web3 Wallet</div>
                      <div className="text-slate-500 text-[9px] md:text-[10px] mt-0.5 md:mt-1">ETH, BNB, MATIC</div>
                      {paymentMethod === 'wallet' && (
                        <div className="absolute top-2 right-2">
                          <Icon name="check-circle" size={18} className="text-primary" />
                        </div>
                      )}
                    </button>
                  )}

                  {enabledProviders.manualCrypto && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('manual-crypto')}
                      className={`relative flex flex-col items-center p-5 bg-charcoal border rounded-xl cursor-pointer transition-colors ${
                        paymentMethod === 'manual-crypto' ? 'border-primary ring-2 ring-primary/20' : 'border-border-dark hover:border-slate-700'
                      }`}
                    >
                      <Icon name="bitcoin" size={28} className="text-primary mb-2" />
                      <div className="text-white font-bold text-sm">Crypto Transfer</div>
                      <div className="text-slate-500 text-[10px] mt-1">BTC, USDT, SOL</div>
                      {paymentMethod === 'manual-crypto' && (
                        <div className="absolute top-2 right-2">
                          <Icon name="check-circle" size={18} className="text-primary" />
                        </div>
                      )}
                    </button>
                  )}

                  {enabledProviders.stripe && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('stripe')}
                      className={`relative flex flex-col items-center p-5 bg-charcoal border rounded-xl cursor-pointer transition-colors ${
                        paymentMethod === 'stripe' ? 'border-primary ring-2 ring-primary/20' : 'border-border-dark hover:border-slate-700'
                      }`}
                    >
                      <Icon name="stripe" size={28} className="text-primary mb-2" />
                      <div className="text-white font-bold text-sm">Credit Card</div>
                      <div className="text-slate-500 text-[10px] mt-1">Stripe</div>
                      {paymentMethod === 'stripe' && (
                        <div className="absolute top-2 right-2">
                          <Icon name="check-circle" size={18} className="text-primary" />
                        </div>
                      )}
                    </button>
                  )}

                  {enabledProviders.paystack && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('paystack')}
                      className={`relative flex flex-col items-center p-5 bg-charcoal border rounded-xl cursor-pointer transition-colors ${
                        paymentMethod === 'paystack' ? 'border-primary ring-2 ring-primary/20' : 'border-border-dark hover:border-slate-700'
                      }`}
                    >
                      <Icon name="paystack" size={28} className="text-primary mb-2" />
                      <div className="text-white font-bold text-sm">Debit Card</div>
                      <div className="text-slate-500 text-[10px] mt-1">Paystack</div>
                      {paymentMethod === 'paystack' && (
                        <div className="absolute top-2 right-2">
                          <Icon name="check-circle" size={18} className="text-primary" />
                        </div>
                      )}
                    </button>
                  )}

                  {enabledProviders.paypal && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('paypal')}
                      className={`relative flex flex-col items-center p-5 bg-charcoal border rounded-xl cursor-pointer transition-colors ${
                        paymentMethod === 'paypal' ? 'border-primary ring-2 ring-primary/20' : 'border-border-dark hover:border-slate-700'
                      }`}
                    >
                      <Icon name="paypal" size={28} className="text-primary mb-2" />
                      <div className="text-white font-bold text-sm">PayPal</div>
                      <div className="text-slate-500 text-[10px] mt-1">Express Checkout</div>
                      {paymentMethod === 'paypal' && (
                        <div className="absolute top-2 right-2">
                          <Icon name="check-circle" size={18} className="text-primary" />
                        </div>
                      )}
                    </button>
                  )}
                </div>

                {/* Wallet Payment */}
                {paymentMethod === 'wallet' && (
                  <div className={`bg-charcoal border border-border-dark rounded-xl p-4 md:p-6 space-y-4 md:space-y-6 ${useWalletBalance && finalTotal === 0 ? 'opacity-30 pointer-events-none' : ''}`}>
                    {/* Network Selection */}
                    <div>
                      <h3 className="text-white font-bold text-sm md:text-base mb-2 md:mb-3">Select Network</h3>
                      <div className="grid grid-cols-5 gap-2 md:gap-3">
                        {[
                          { name: 'Bitcoin', symbol: 'BTC', icon: 'bitcoin' },
                          { name: 'Ethereum', symbol: 'ETH', icon: 'diamond' },
                          { name: 'BNB Chain', symbol: 'BNB', icon: 'hexagon' },
                          { name: 'Tron', symbol: 'TRON', icon: 'zap' },
                          { name: 'Polygon', symbol: 'MATIC', icon: 'layers' },
                        ].map((network) => (
                          <button
                            key={network.symbol}
                            type="button"
                            onClick={() => setSelectedNetwork(network.symbol as CryptoNetwork)}
                            className={`p-3 bg-surface-dark border rounded-xl transition-colors text-center ${
                              selectedNetwork === network.symbol
                                ? 'border-primary ring-2 ring-primary/20'
                                : 'border-border-dark hover:border-primary/50'
                            }`}
                          >
                            <Icon name={network.icon} size={20} className="text-primary mx-auto mb-1" />
                            <div className="text-white text-xs font-bold">{network.symbol}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Wallet Connection - All Networks */}
                    {!walletState.isConnected ? (
                      <div className="text-center py-4">
                        <Icon name="wallet" size={40} className="md:w-48 md:h-48 text-slate-600 mx-auto mb-3 md:mb-4" />
                        <p className="text-slate-400 text-xs md:text-sm mb-3 md:mb-4 px-2">
                          {selectedNetwork === 'BTC'
                            ? (typeof window !== 'undefined' && !(window as any).unisat
                              ? 'Please install Unisat wallet to pay with Bitcoin'
                              : 'Connect your Bitcoin wallet to pay')
                            : selectedNetwork === 'TRON'
                            ? (typeof window !== 'undefined' && !(window as any).tronWeb
                              ? 'Please install TronLink wallet to pay with TRON'
                              : 'Connect your TRON wallet to pay')
                            : (typeof window !== 'undefined' && !window.ethereum
                              ? 'Please install a Web3 wallet to continue'
                              : 'Connect your wallet to pay with crypto')
                          }
                        </p>
                        {selectedNetwork === 'BTC' && typeof window !== 'undefined' && !(window as any).unisat ? (
                          <div className="space-y-3">
                            <a
                              href="https://unisat.io/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2.5 text-sm rounded-xl transition-all inline-flex items-center gap-2"
                            >
                              <Icon name="wallet" size={16} />
                              Install Unisat Wallet
                            </a>
                          </div>
                        ) : selectedNetwork === 'TRON' && typeof window !== 'undefined' && !(window as any).tronWeb ? (
                          <div className="space-y-3">
                            <a
                              href="https://www.tronlink.org/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-red-500 hover:bg-red-600 text-white font-bold px-6 py-2.5 text-sm rounded-xl transition-all inline-flex items-center gap-2"
                            >
                              <Icon name="wallet" size={16} />
                              Install TronLink Wallet
                            </a>
                          </div>
                        ) : typeof window !== 'undefined' && !window.ethereum && isEVMNetwork(selectedNetwork) ? (
                          <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                              <a
                                href="https://metamask.io/download/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2.5 text-sm rounded-xl transition-all inline-flex items-center gap-2"
                              >
                                <Icon name="wallet" size={16} />
                                Install MetaMask
                              </a>
                              <a
                                href="https://www.coinbase.com/wallet/downloads"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-6 py-2.5 text-sm rounded-xl transition-all inline-flex items-center gap-2"
                              >
                                <Icon name="wallet" size={16} />
                                Install Coinbase Wallet
                              </a>
                            </div>
                            <p className="text-slate-500 text-xs">Or use any other Web3 wallet extension</p>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={connectWallet}
                            disabled={paymentStatus === 'connecting' || providerAvailable === false || providerCheckLoading}
                            className="bg-primary text-black font-bold px-6 md:px-8 py-2.5 md:py-3 text-sm md:text-base rounded-xl hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {paymentStatus === 'connecting' ? (
                              <span className="flex items-center gap-2">
                                <Icon name="loading" size={18} className="animate-spin" />
                                Connecting...
                              </span>
                            ) : (
                              <span className="flex items-center gap-2">
                                <Icon name="wallet" size={18} />
                                Connect Wallet
                              </span>
                            )}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Connected Wallet Info */}
                        <div className="bg-surface-dark rounded-xl p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                              <Icon name="wallet" size={20} className="text-primary" />
                            </div>
                            <div>
                              <p className="text-white text-sm font-bold">
                                {walletState.address?.slice(0, 6)}...{walletState.address?.slice(-4)}
                              </p>
                              <p className="text-slate-500 text-xs">
                                Balance: {parseFloat(walletState.balance || '0').toFixed(4)} {selectedNetwork}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={disconnectWallet}
                            className="text-slate-400 hover:text-red-400 text-xs"
                          >
                            Disconnect
                          </button>
                        </div>

                        {/* Payment Amount */}
                        <div className="bg-surface-dark rounded-xl p-4 text-center">
                          <p className="text-slate-400 text-sm mb-1">Amount to pay:</p>
                          <p className="text-2xl font-bold text-white">{formatPrice(finalTotal)}</p>
                          <p className="text-primary text-sm mt-1">≈ {getCryptoAmount(selectedNetwork)} {selectedNetwork}</p>
                        </div>

                        {/* Payment Status */}
                        {paymentStatus === 'success' && (
                          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                            <Icon name="check-circle" size={32} className="text-green-500 mx-auto mb-2" />
                            <p className="text-green-400 font-bold">Payment Successful!</p>
                            <p className="text-slate-400 text-xs mt-1">Redirecting...</p>
                          </div>
                        )}

                        {txHash && paymentStatus === 'confirming' && (
                          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
                            <Icon name="loading" size={24} className="text-yellow-500 mx-auto mb-2 animate-spin" />
                            <p className="text-yellow-400 font-bold text-sm">Confirming transaction...</p>
                            <a
                              href={`https://etherscan.io/tx/${txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary text-xs hover:underline mt-2 inline-block"
                            >
                              View on Etherscan →
                            </a>
                          </div>
                        )}

                        {/* Pay Button */}
                        {paymentStatus !== 'success' && paymentStatus !== 'confirming' && (
                          <button
                            type="button"
                            onClick={processWalletPayment}
                            disabled={paymentStatus === 'paying' || providerAvailable === false || providerCheckLoading}
                            className="w-full bg-primary text-black font-bold py-4 rounded-xl hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {paymentStatus === 'paying' ? (
                              <>
                                <Icon name="loading" size={20} className="animate-spin" />
                                Processing Payment...
                              </>
                            ) : (
                              <>
                                <Icon name="flash" size={20} />
                                Pay {getCryptoAmount(selectedNetwork)} {selectedNetwork}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Wallet Error */}
                    {walletError && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                        <p className="text-red-400 text-sm">{walletError}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Manual Crypto Payment */}
                {paymentMethod === 'manual-crypto' && (
                  <div className="bg-charcoal border border-border-dark rounded-xl p-4 md:p-6 space-y-4 md:space-y-6">
                    <div className="text-center">
                      <h3 className="text-white font-bold text-base md:text-lg mb-1 md:mb-2">Pay with Cryptocurrency</h3>
                      <p className="text-slate-500 text-xs md:text-sm">Select your crypto and send to our wallet address</p>
                    </div>

                    <div>
                      <h4 className="text-white font-bold mb-2 md:mb-3 text-xs md:text-sm">Select Cryptocurrency</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
                        {[
                          { name: 'Bitcoin', symbol: 'BTC', icon: 'bitcoin', label: 'BTC' },
                          { name: 'Ethereum', symbol: 'ETH', icon: 'diamond', label: 'ETH' },
                          { name: 'USDT (ERC20)', symbol: 'USDT_ERC20', icon: 'wallet', label: 'USDT (ETH)' },
                          { name: 'USDT (BEP20)', symbol: 'USDT_BEP20', icon: 'wallet', label: 'USDT (BSC)' },
                          { name: 'USDT (TRC20)', symbol: 'USDT_TRC20', icon: 'wallet', label: 'USDT (TRX)' },
                          { name: 'Binance Coin', symbol: 'BNB', icon: 'hexagon', label: 'BNB' },
                          { name: 'USD Coin', symbol: 'USDC', icon: 'wallet', label: 'USDC' },
                          { name: 'Solana', symbol: 'SOL', icon: 'layers', label: 'SOL' },
                        ].map((crypto) => (
                          <button
                            key={crypto.symbol}
                            type="button"
                            onClick={() => setSelectedNetwork(crypto.symbol as CryptoNetwork)}
                            className={`p-3 bg-surface-dark border rounded-xl transition-colors text-center ${
                              selectedNetwork === crypto.symbol
                                ? 'border-primary ring-2 ring-primary/20'
                                : 'border-border-dark hover:border-primary/50'
                            }`}
                          >
                            <Icon name={crypto.icon} size={20} className="text-primary mx-auto mb-1" />
                            <div className="text-white text-xs font-bold">{crypto.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-surface-dark rounded-xl p-4">
                      <p className="text-slate-400 text-sm mb-3">Amount to pay:</p>
                      <p className="text-2xl font-bold text-white mb-2">{formatPrice(finalTotal)}</p>
                      <p className="text-primary text-sm">
                        ≈ {getCryptoAmount(selectedNetwork)} {selectedNetwork.replace('_', ' ')}
                      </p>
                    </div>

                    <div className="bg-surface-dark rounded-xl p-4">
                      <p className="text-slate-400 text-sm mb-4 text-center">Scan or send to this address:</p>
                      {loadingWallets ? (
                        <div className="bg-charcoal rounded-lg p-6 text-center">
                          <Icon name="loading" size={24} className="text-primary animate-spin mx-auto" />
                        </div>
                      ) : cryptoWallets[selectedNetwork] ? (
                        <div className="space-y-4">
                          {/* QR Code */}
                          <div className="flex justify-center">
                            <div className="bg-white p-3 rounded-xl">
                              <QRCodeSVG
                                value={cryptoWallets[selectedNetwork]}
                                size={160}
                                level="H"
                              />
                            </div>
                          </div>
                          {/* Address */}
                          <div className="bg-charcoal rounded-lg p-3 font-mono text-xs text-white break-all text-center">
                            {cryptoWallets[selectedNetwork]}
                          </div>
                          <button
                            type="button"
                            onClick={() => copyAddress(cryptoWallets[selectedNetwork])}
                            className="w-full bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                          >
                            <Icon name={copiedAddress ? "check" : "copy"} size={16} />
                            {copiedAddress ? "Copied!" : "Copy Address"}
                          </button>
                        </div>
                      ) : (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
                          <p className="text-yellow-400 text-xs">
                            {selectedNetwork.replace('_', ' ')} wallet address not configured. Please contact support or choose another payment method.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Show info message when not initiated */}
                    {!cryptoPaymentInitiated && (
                      <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                        <Icon name="info" size={20} className="text-yellow-500" />
                        <p className="text-slate-300 text-xs">
                          Please send the exact amount to the wallet address, then click "I've Sent the Payment" below.
                        </p>
                      </div>
                    )}

                    {/* Payment Verification Flow - Pending State */}
                    {cryptoPaymentInitiated && cryptoVerificationStatus === 'pending' && (
                      <div className="bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent border border-yellow-500/20 rounded-xl p-6 space-y-4">
                        <div className="text-center">
                          <Icon name="loading" size={40} className="text-yellow-500 mx-auto mb-3 animate-spin" />
                          <h4 className="text-white font-bold text-lg mb-2">Waiting for Payment</h4>
                          <p className="text-slate-400 text-sm">
                            We're checking the blockchain for your payment...
                          </p>
                        </div>

                        {/* Countdown Timer */}
                        <div className="bg-surface-dark rounded-xl p-4 text-center">
                          <p className="text-slate-400 text-xs mb-1">Time Remaining</p>
                          <p className="text-3xl font-mono font-bold text-yellow-400">
                            {formatTimeRemaining(cryptoTimeRemaining)}
                          </p>
                        </div>

                        {/* Transaction Hash Input */}
                        <div className="space-y-2">
                          <label className="text-slate-400 text-xs">[Optional] Enter your transaction hash for faster verification:</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={userTxHash}
                              onChange={(e) => setUserTxHash(e.target.value)}
                              placeholder="0x... or transaction ID"
                              className="flex-1 bg-surface-dark border border-border-dark rounded-lg px-3 py-2 text-white text-sm font-mono placeholder:text-slate-600 focus:border-primary focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={updateUserTxHash}
                              disabled={!userTxHash}
                              className="bg-primary/20 text-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/30 transition-colors disabled:opacity-50"
                            >
                              Save
                            </button>
                          </div>
                          {explorerUrl && (
                            <a
                              href={explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary text-xs hover:underline flex items-center gap-1"
                            >
                              <Icon name="external-link" size={12} />
                              View on blockchain explorer
                            </a>
                          )}
                        </div>

                        {/* Last Check Info */}
                        {lastCheckTime && (
                          <p className="text-slate-500 text-xs text-center">
                            Last checked: {lastCheckTime.toLocaleTimeString()}
                            <br />
                            Checking every 30 seconds...
                          </p>
                        )}

                        {/* Cancel Button */}
                        <button
                          type="button"
                          onClick={resetCryptoVerification}
                          className="w-full bg-surface-dark border border-border-dark text-slate-400 py-3 rounded-xl hover:border-red-500/50 hover:text-red-400 transition-colors text-sm"
                        >
                          Cancel and Start Over
                        </button>
                      </div>
                    )}

                    {/* Payment Confirmed State */}
                    {cryptoVerificationStatus === 'confirmed' && (
                      <div className="bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border border-green-500/20 rounded-xl p-6 text-center space-y-4">
                        <Icon name="check-circle" size={48} className="text-green-500 mx-auto" />
                        <div>
                          <h4 className="text-green-400 font-bold text-lg mb-2">Payment Confirmed!</h4>
                          <p className="text-slate-400 text-sm">
                            Your payment has been verified on the blockchain
                          </p>
                        </div>
                        {confirmedTxHash && (
                          <div className="bg-surface-dark rounded-lg p-3">
                            <p className="text-slate-400 text-xs mb-1">Transaction Hash:</p>
                            <p className="text-white text-xs font-mono break-all">
                              {confirmedTxHash}
                            </p>
                            {explorerUrl && (
                              <a
                                href={explorerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary text-xs hover:underline mt-2 inline-flex items-center gap-1"
                              >
                                <Icon name="external-link" size={12} />
                                View on explorer
                              </a>
                            )}
                          </div>
                        )}
                        <p className="text-primary text-sm">Redirecting to order confirmation...</p>
                      </div>
                    )}

                    {/* Payment Expired State */}
                    {cryptoVerificationStatus === 'expired' && (
                      <div className="bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border border-red-500/20 rounded-xl p-6 text-center space-y-4">
                        <Icon name="x-circle" size={48} className="text-red-500 mx-auto" />
                        <div>
                          <h4 className="text-red-400 font-bold text-lg mb-2">Payment Window Expired</h4>
                          <p className="text-slate-400 text-sm">
                            We couldn't detect your payment within the 45-minute window.
                          </p>
                          <p className="text-slate-500 text-xs mt-2">
                            If you've sent payment, please contact support with your transaction hash.
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={resetCryptoVerification}
                            className="flex-1 bg-primary text-black font-bold py-3 rounded-xl hover:brightness-105 transition-all"
                          >
                            Try Again
                          </button>
                          <Link
                            href="/support"
                            className="flex-1 bg-surface-dark border border-border-dark text-white font-medium py-3 rounded-xl hover:border-primary/50 transition-colors flex items-center justify-center gap-2"
                          >
                            <Icon name="message-circle" size={18} />
                            Contact Support
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* "I've Sent Payment" Button - Only show when wallet configured and not initiated */}
                    {!cryptoPaymentInitiated && cryptoWallets[selectedNetwork] && (
                      <button
                        type="button"
                        onClick={initiateCryptoVerification}
                        disabled={paymentStatus === 'paying' || providerAvailable === false || providerCheckLoading}
                        className="w-full bg-primary text-black font-bold py-4 rounded-xl hover:brightness-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {paymentStatus === 'paying' ? (
                          <>
                            <Icon name="loading" size={20} className="animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Icon name="check" size={20} />
                            I've Sent the Payment
                          </>
                        )}
                      </button>
                    )}

                    {/* Error Message */}
                    {walletError && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                        <p className="text-red-400 text-sm">{walletError}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Stripe Payment (Secure Stripe Elements) */}
                {paymentMethod === 'stripe' && (
                  stripePromise ? (
                    <Elements stripe={stripePromise}>
                      <StripeCardForm
                        amount={finalTotal}
                        currency={getStripeCurrency(preferences.currency.code)}
                        items={displayItems}
                        discountCode={discountCode}
                        discountAmount={discountAmount}
                        useWalletBalance={useWalletBalance}
                        formatPrice={formatPrice}
                        onSuccess={handleCardPaymentSuccess}
                        onBack={() => router.push('/checkout')}
                        providerDisabled={providerAvailable === false || providerCheckLoading}
                      />
                    </Elements>
                  ) : stripeConfigError ? (
                    <div className="bg-charcoal border border-border-dark rounded-xl p-6 text-center">
                      <Icon name="alert" size={32} className="text-red-400 mx-auto mb-3" />
                      <p className="text-red-400 text-sm">{stripeConfigError}</p>
                    </div>
                  ) : (
                    <div className="bg-charcoal border border-border-dark rounded-xl p-6 text-center">
                      <Icon name="loading" size={32} className="text-primary animate-spin mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">Loading Stripe...</p>
                    </div>
                  )
                )}

                {/* Paystack Payment (Secure Popup) */}
                {paymentMethod === 'paystack' && (
                  paystackKeyLoaded ? (
                    <PaystackCardForm
                      amount={finalTotal}
                      currency={preferences.currency.code}
                      items={displayItems}
                      discountCode={discountCode}
                      discountAmount={discountAmount}
                      useWalletBalance={useWalletBalance}
                      formatPrice={formatPrice}
                      publicKey={paystackPublicKey}
                      onSuccess={handleCardPaymentSuccess}
                      onBack={() => router.push('/checkout')}
                      providerDisabled={providerAvailable === false || providerCheckLoading}
                    />
                  ) : (
                    <div className="bg-charcoal border border-border-dark rounded-xl p-6 text-center">
                      <Icon name="loading" size={32} className="text-primary animate-spin mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">Loading Paystack...</p>
                    </div>
                  )
                )}

                {/* PayPal Payment */}
                {paymentMethod === 'paypal' && (
                  <div className="bg-charcoal border border-border-dark rounded-xl p-6 space-y-6">
                    <div className="text-center">
                      <h3 className="text-white font-bold mb-2">Pay with PayPal</h3>
                      <p className="text-slate-500 text-sm">Fast and secure checkout with your PayPal account</p>
                    </div>

                    <div className="bg-surface-dark rounded-xl p-4 text-center">
                      <p className="text-slate-400 text-sm mb-3">Amount to pay:</p>
                      <p className="text-2xl font-bold text-white">{formatPrice(finalTotal)}</p>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-surface-dark rounded-xl">
                      <Icon name="info" size={20} className="text-slate-400" />
                      <p className="text-slate-400 text-xs">
                        You&apos;ll be redirected to PayPal to complete your purchase. You can pay with your PayPal balance, linked bank account, or credit/debit card.
                      </p>
                    </div>

                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
                      <p className="text-primary text-sm font-bold mb-2">Buyer Protection Included</p>
                      <p className="text-slate-300 text-xs">
                        PayPal protects your purchases. Pay confidently with one of the world&apos;s most trusted payment platforms.
                      </p>
                    </div>
                  </div>
                )}

                {/* Security Notice */}
                <div className="flex items-center gap-3 p-4 bg-surface-dark rounded-xl border border-border-dark">
                  <Icon name="shield" size={24} className="text-primary flex-shrink-0" />
                  <p className="text-slate-400 text-sm">
                    Your payment information is encrypted and secure. We never store your card details.
                  </p>
                </div>

                {/* Navigation Buttons - Only show for manual-crypto and paypal */}
                {paymentMethod !== 'wallet' && paymentMethod !== 'stripe' && paymentMethod !== 'paystack' && (
                  <div className="flex gap-4">
                    <Link
                      href="/checkout"
                      className="flex-1 bg-surface-dark border border-border-dark text-white font-bold py-4 rounded-xl hover:border-primary/50 transition-all flex items-center justify-center gap-2"
                    >
                      <Icon name="arrow-left" size={18} />
                      Back
                    </Link>
                    <button
                      type="submit"
                      disabled={isSubmitting || providerAvailable === false || providerCheckLoading}
                      className="flex-1 bg-primary text-black font-bold py-4 rounded-xl hover:brightness-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Processing...' : 'Continue to Review'}
                      {!isSubmitting && <Icon name="arrow-right" size={18} />}
                    </button>
                  </div>
                )}

                {/* Back button only for wallet payment */}
                {paymentMethod === 'wallet' && !walletState.isConnected && (
                  <Link
                    href="/checkout"
                    className="w-full bg-surface-dark border border-border-dark text-white font-bold py-4 rounded-xl hover:border-primary/50 transition-all flex items-center justify-center gap-2"
                  >
                    <Icon name="arrow-left" size={18} />
                    Back to Shipping
                  </Link>
                )}
              </form>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="col-span-1 lg:col-span-5 order-first lg:order-last">
            <div className="bg-charcoal border border-border-dark rounded-2xl p-4 md:p-8 lg:sticky lg:top-24">
              <h2 className="text-lg md:text-xl font-bold text-white mb-4 md:mb-6">Order Summary</h2>

              {/* Excluded virtual numbers notice */}
              {excludedVirtualNumberCount > 0 && (
                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <div className="flex items-start gap-2">
                    <Icon name="alert" size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-200">
                      {excludedVirtualNumberCount} virtual number{excludedVirtualNumberCount > 1 ? 's' : ''} excluded from checkout due to service unavailability.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4 mb-6">
                {displayItems.map((item) => {
                  const productType = (item.product as any).productType || (item.product as any).product_type || item.product.metadata?.productType
                  const isInstantCard = productType === 'instant_card'
                  const isVirtualCard = productType === 'virtual_card'
                  const cardMetadata = (item.product as any).metadata || item.product.metadata || {}

                  return (
                  <div key={`${item.product.id}-${item.license}`} className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {(isInstantCard || isVirtualCard) ? (
                        <CardVisualMini
                          brand={cardMetadata.cardBrand === 'mastercard' ? 'mastercard' : 'visa'}
                          type={isInstantCard ? 'instant' : 'virtual'}
                          isPremium={cardMetadata.isPremium}
                          denomination={cardMetadata.denomination}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-surface-dark rounded-lg flex items-center justify-center overflow-hidden">
                          {(item.product.metadata?.productType === 'virtual_number' || item.product.metadata?.productType === 'esim') && item.product.metadata?.countryIsoCode ? (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                              <FlagIcon countryCode={item.product.metadata.countryIsoCode} className="w-8 h-8 rounded" />
                            </div>
                          ) : item.product.image || item.product.images?.[0]?.url || (item.product as any).imageUrl || (item.product as any).metadata?.imageUrl ? (
                            <>
                              <img
                                src={item.product.image || item.product.images?.[0]?.url || (item.product as any).imageUrl || (item.product as any).metadata?.imageUrl || ''}
                                alt={item.product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.currentTarget
                                  target.style.display = 'none'
                                  const fallback = target.nextElementSibling as HTMLElement
                                  if (fallback) fallback.style.display = 'flex'
                                }}
                              />
                              <div className="w-full h-full items-center justify-center hidden">
                                <Icon name={item.product.icon || (item.product.metadata?.productType === 'gift_card' ? 'gift' : 'code')} size={20} className="text-slate-500" />
                              </div>
                            </>
                          ) : (
                            <Icon name={item.product.icon || (item.product.metadata?.productType === 'virtual_number' ? 'phone' : item.product.metadata?.productType === 'gift_card' ? 'gift' : 'code')} size={20} className="text-slate-500" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {item.product.metadata?.productType === 'virtual_number'
                          ? `Virtual Number: ${item.product.metadata?.friendlyName || item.product.name}`
                          : item.product.name}
                      </p>
                      <p className="text-slate-500 text-xs">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-white font-bold">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                  )
                })}
              </div>

              <div className="border-t border-border-dark pt-4 space-y-3">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span className="text-white">{formatPrice(effectiveTotal)}</span>
                </div>
                {discountCode && discountAmount > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Discount <span className="text-xs text-primary">({discountCode})</span></span>
                    <span className="text-primary">-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                {walletAmountToApply > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span className="flex items-center gap-1">
                      Wallet Credits
                      <Icon name="wallet" size={14} className="text-primary" />
                    </span>
                    <span className="text-primary">-{formatPrice(walletAmountToApply)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Tax</span>
                  <span className="text-white">{formatPrice(0)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-3 border-t border-border-dark">
                  <span className="text-white">Total</span>
                  <span className="text-white">{formatPrice(finalTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

// Stripe Card Form Component (must be rendered inside <Elements>)
function StripeCardForm({
  amount,
  currency,
  items,
  discountCode,
  discountAmount,
  useWalletBalance,
  formatPrice: formatPriceFn,
  onSuccess,
  onBack,
  providerDisabled = false,
}: {
  amount: number
  currency: string
  items: any[]
  discountCode: string
  discountAmount: number
  useWalletBalance: boolean
  formatPrice: (amount: number) => string
  onSuccess: (orderId: string, orderNumber: string) => void
  onBack: () => void
  providerDisabled?: boolean
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const handlePayment = async () => {
    if (!stripe || !elements) return

    setProcessing(true)
    setError('')

    try {
      const shippingDataStr = sessionStorage.getItem('checkoutShipping')
      const shippingData = shippingDataStr ? JSON.parse(shippingDataStr) : {}

      // 1. Create order via local API (fixes doubled total issue)
      const orderItems = items.map((item: any) => {
        const productType = item.product.metadata?.productType || item.product.product_type || 'default'
        const isGiftCard = productType === 'gift_card'
        return {
          id: item.product.id,
          productId: item.product.id,
          name: isGiftCard
            ? `${item.product.metadata?.brand || item.product.name} Gift Card ($${item.product.metadata?.denomination || item.price})`
            : item.product.name,
          quantity: item.quantity,
          price: item.price,
          license: isGiftCard ? null : (item.license || 'standard'),
          productType,
          metadata: {
            ...item.product.metadata,
            friendlyName: item.product.name || item.product.metadata?.friendlyName,
            phoneNumber: item.product.metadata?.phoneNumber,
            countryId: item.product.metadata?.countryId,
            countryFlag: item.product.metadata?.countryFlag,
            countryName: item.product.metadata?.countryName,
            planCategory: item.product.metadata?.planCategory,
            durationDays: item.product.metadata?.durationDays,
            smsLimit: item.product.metadata?.smsLimit,
            minuteTier: item.product.metadata?.minuteTier,
            minuteIncluded: item.product.metadata?.minuteIncluded,
            minuteTierPrice: item.product.metadata?.minuteTierPrice,
            numberType: item.product.metadata?.numberType,
            ...(isGiftCard && {
              gift_card_id: item.product.metadata?.gift_card_id || item.product.metadata?.giftCardId || item.product.id,
              denomination: item.product.metadata?.denomination || item.price,
              brand: item.product.metadata?.brand || item.product.name,
              imageUrl: item.product.imageUrl || item.product.metadata?.imageUrl,
            }),
          },
        }
      })

      const orderResponse = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('auth_token') && {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          }),
        },
        body: JSON.stringify({
          items: orderItems,
          total: amount,
          subtotal: amount + discountAmount,
          paymentMethod: 'stripe',
          shippingData: {
            fullName: shippingData.fullName || 'Guest',
            email: shippingData.email || '',
            phone: shippingData.phone || '',
            address: shippingData.address || 'Digital Delivery',
            city: shippingData.city || 'N/A',
            state: shippingData.state || 'N/A',
            zipCode: shippingData.zipCode || '00000',
            notes: shippingData.notes || '',
          },
          discountCode: discountCode || undefined,
          discountAmount: discountAmount > 0 ? discountAmount : undefined,
          sessionId: getSessionId(),
        }),
      })

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json()
        throw new Error(errorData.error || 'Failed to create order')
      }

      const orderResult = await orderResponse.json()
      const orderId = orderResult.data.id
      const orderNumber = orderResult.data.orderNumber

      // Notify user: order placed
      apiFetch('/notifications/create', {
        method: 'POST',
        body: JSON.stringify({ type: 'ORDER_PLACED', title: 'Order Placed', message: `Your order #${orderNumber} has been placed successfully.`, data: { orderId, orderNumber } }),
      }).catch(() => {})

      // 2. Create PaymentIntent in user's selected currency
      const chargeAmount = currency === 'usd' ? amount : convertPrice(amount, currency.toUpperCase())
      const intentResponse = await fetch('/api/payments/stripe/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('auth_token') && {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          }),
        },
        body: JSON.stringify({ amount: chargeAmount, currency, orderId }),
      })

      if (!intentResponse.ok) {
        const intentError = await intentResponse.json()
        throw new Error(intentError.error || 'Failed to initialize payment')
      }

      const intentResult = await intentResponse.json()

      // 3. Confirm card payment with Stripe Elements
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) throw new Error('Card element not found')

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        intentResult.data.clientSecret,
        { payment_method: { card: cardElement } }
      )

      if (stripeError) throw new Error(stripeError.message)

      if (paymentIntent?.status === 'succeeded') {
        // Confirm payment on backend so order status updates to CONFIRMED
        await fetch('/api/payments/stripe/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('auth_token') && {
              Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
            }),
          },
          body: JSON.stringify({ orderId, paymentIntentId: paymentIntent.id }),
        })
        // Increment discount usage counter
        if (discountCode && discountAmount > 0) {
          apiFetch('/discounts/use', {
            method: 'POST',
            body: JSON.stringify({ code: discountCode }),
          }).catch(err => console.error('Failed to increment discount usage:', err))
        }
        onSuccess(orderId, orderNumber)
      } else {
        throw new Error('Payment was not successful')
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-charcoal border border-border-dark rounded-xl p-6 space-y-6">
        <div>
          <h3 className="text-white font-bold mb-4">Card Details</h3>
          <div className="bg-surface-dark border border-border-dark rounded-xl p-4">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#e2e8f0',
                    '::placeholder': { color: '#475569' },
                  },
                  invalid: { color: '#ef4444' },
                },
              }}
            />
          </div>
        </div>

        <div className="bg-surface-dark rounded-xl p-4 text-center">
          <p className="text-slate-400 text-sm mb-1">Amount to pay:</p>
          <p className="text-2xl font-bold text-white">{formatPriceFn(amount)}</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 bg-surface-dark border border-border-dark text-white font-bold py-4 rounded-xl hover:border-primary/50 transition-all flex items-center justify-center gap-2"
        >
          <Icon name="arrow-left" size={18} />
          Back
        </button>
        <button
          type="button"
          onClick={handlePayment}
          disabled={processing || !stripe || providerDisabled}
          className="flex-1 bg-primary text-black font-bold py-4 rounded-xl hover:brightness-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? (
            <>
              <Icon name="loading" size={20} className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Icon name="stripe" size={20} />
              Pay {formatPriceFn(amount)}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// Paystack Card Form Component (uses Paystack popup)
function PaystackCardForm({
  amount,
  currency,
  items,
  discountCode,
  discountAmount,
  useWalletBalance,
  formatPrice: formatPriceFn,
  publicKey,
  onSuccess,
  onBack,
  providerDisabled = false,
}: {
  amount: number
  currency: string
  items: any[]
  discountCode: string
  discountAmount: number
  useWalletBalance: boolean
  formatPrice: (amount: number) => string
  publicKey: string
  onSuccess: (orderId: string, orderNumber: string) => void
  onBack: () => void
  providerDisabled?: boolean
}) {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const PAYSTACK_SUPPORTED = ['NGN', 'GHS', 'ZAR', 'KES']
  const isCurrencySupported = PAYSTACK_SUPPORTED.includes(currency.toUpperCase())
  const isKeyMissing = !publicKey

  const handlePayment = async () => {
    setProcessing(true)
    setError('')

    try {
      const shippingDataStr = sessionStorage.getItem('checkoutShipping')
      const shippingData = shippingDataStr ? JSON.parse(shippingDataStr) : {}

      // 1. Create order via local API (fixes doubled total issue)
      const orderItems = items.map((item: any) => {
        const productType = item.product.metadata?.productType || item.product.product_type || 'default'
        const isGiftCard = productType === 'gift_card'
        return {
          id: item.product.id,
          productId: item.product.id,
          name: isGiftCard
            ? `${item.product.metadata?.brand || item.product.name} Gift Card ($${item.product.metadata?.denomination || item.price})`
            : item.product.name,
          quantity: item.quantity,
          price: item.price,
          license: isGiftCard ? null : (item.license || 'standard'),
          productType,
          metadata: {
            ...item.product.metadata,
            friendlyName: item.product.name || item.product.metadata?.friendlyName,
            phoneNumber: item.product.metadata?.phoneNumber,
            countryId: item.product.metadata?.countryId,
            countryFlag: item.product.metadata?.countryFlag,
            countryName: item.product.metadata?.countryName,
            planCategory: item.product.metadata?.planCategory,
            durationDays: item.product.metadata?.durationDays,
            smsLimit: item.product.metadata?.smsLimit,
            minuteTier: item.product.metadata?.minuteTier,
            minuteIncluded: item.product.metadata?.minuteIncluded,
            minuteTierPrice: item.product.metadata?.minuteTierPrice,
            numberType: item.product.metadata?.numberType,
            ...(isGiftCard && {
              gift_card_id: item.product.metadata?.gift_card_id || item.product.metadata?.giftCardId || item.product.id,
              denomination: item.product.metadata?.denomination || item.price,
              brand: item.product.metadata?.brand || item.product.name,
              imageUrl: item.product.imageUrl || item.product.metadata?.imageUrl,
            }),
          },
        }
      })

      const orderResponse = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('auth_token') && {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          }),
        },
        body: JSON.stringify({
          items: orderItems,
          total: amount,
          subtotal: amount + discountAmount,
          paymentMethod: 'paystack',
          shippingData: {
            fullName: shippingData.fullName || 'Guest',
            email: shippingData.email || '',
            phone: shippingData.phone || '',
            address: shippingData.address || 'Digital Delivery',
            city: shippingData.city || 'N/A',
            state: shippingData.state || 'N/A',
            zipCode: shippingData.zipCode || '00000',
            notes: shippingData.notes || '',
          },
          discountCode: discountCode || undefined,
          discountAmount: discountAmount > 0 ? discountAmount : undefined,
          sessionId: getSessionId(),
        }),
      })

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json()
        throw new Error(errorData.error || 'Failed to create order')
      }

      const orderResult = await orderResponse.json()
      const orderId = orderResult.data.id
      const orderNumber = orderResult.data.orderNumber

      // Notify user: order placed
      apiFetch('/notifications/create', {
        method: 'POST',
        body: JSON.stringify({ type: 'ORDER_PLACED', title: 'Order Placed', message: `Your order #${orderNumber} has been placed successfully.`, data: { orderId, orderNumber } }),
      }).catch(() => {})

      // 2. Open Paystack popup
      const PaystackPop = (window as any).PaystackPop
      if (!PaystackPop) {
        throw new Error('Paystack is still loading. Please try again.')
      }

      const paystackCurrency = isCurrencySupported ? currency.toUpperCase() : 'USD'
      const chargeAmount = isCurrencySupported ? convertPrice(amount, currency.toUpperCase()) : amount

      const handler = PaystackPop.setup({
        key: publicKey,
        email: shippingData.email || 'customer@checkout.com',
        amount: Math.round(chargeAmount * 100),
        currency: paystackCurrency,
        ref: `ORDER_${orderNumber}_${Date.now()}`,
        callback: (response: any) => {
          // Wrap async verification in a non-async callback (Paystack requires a plain function)
          fetch('/api/payments/paystack/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference: response.reference }),
          })
            .then(verifyResponse => verifyResponse.json())
            .then(verifyData => {
              if (verifyData.success) {
                // Fulfillment is handled by the verify endpoint
                // Increment discount usage counter
                if (discountCode && discountAmount > 0) {
                  apiFetch('/discounts/use', {
                    method: 'POST',
                    body: JSON.stringify({ code: discountCode }),
                  }).catch(err => console.error('Failed to increment discount usage:', err))
                }
                onSuccess(orderId, orderNumber)
              } else {
                setError(verifyData.error || 'Payment verification failed. Please contact support.')
                setProcessing(false)
              }
            })
            .catch(() => {
              setError('Payment verification failed. Please contact support.')
              setProcessing(false)
            })
        },
        onClose: () => {
          setProcessing(false)
        },
      })

      handler.openIframe()
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.')
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-charcoal border border-border-dark rounded-xl p-6 space-y-6">
        <div className="text-center">
          <Icon name="paystack" size={48} className="text-primary mx-auto mb-4" />
          <h3 className="text-white font-bold mb-2">Pay with Card</h3>
          <p className="text-slate-500 text-sm">Secure payments via Paystack — supports Visa, Mastercard, Verve, and mobile money</p>
        </div>

        <div className="bg-surface-dark rounded-xl p-4 text-center">
          <p className="text-slate-400 text-sm mb-1">Amount to pay:</p>
          <p className="text-2xl font-bold text-white">{formatPriceFn(amount)}</p>
        </div>

        {isKeyMissing && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
            <Icon name="alert" size={20} className="text-red-500 mx-auto mb-2" />
            <p className="text-red-400 text-sm font-bold mb-1">Configuration Error</p>
            <p className="text-slate-400 text-xs">
              Paystack is not configured properly. Please try again later or use a different payment method.
            </p>
          </div>
        )}

        {!isCurrencySupported && !isKeyMissing && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
            <Icon name="info" size={20} className="text-yellow-500 mx-auto mb-2" />
            <p className="text-yellow-400 text-sm font-bold mb-1">Currency Not Supported</p>
            <p className="text-slate-400 text-xs">
              Paystack does not support {currency.toUpperCase()} payments.
              Please switch to NGN, GHS, ZAR, or KES in your currency preferences, or use a different payment method.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 bg-surface-dark border border-border-dark text-white font-bold py-4 rounded-xl hover:border-primary/50 transition-all flex items-center justify-center gap-2"
        >
          <Icon name="arrow-left" size={18} />
          Back
        </button>
        <button
          type="button"
          onClick={handlePayment}
          disabled={processing || !isCurrencySupported || isKeyMissing || providerDisabled}
          className="flex-1 bg-primary text-black font-bold py-4 rounded-xl hover:brightness-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? (
            <>
              <Icon name="loading" size={20} className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Icon name="paystack" size={20} />
              Pay {formatPriceFn(amount)}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
