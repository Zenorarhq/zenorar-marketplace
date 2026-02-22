'use client'

import { useState, useEffect } from 'react'
import { loadStripe, Stripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { QRCodeSVG } from 'qrcode.react'
import Icon from '@/components/ui/Icon'
import { apiFetch } from '@/lib/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { convertPrice, PAYSTACK_CURRENCIES, setExchangeRates } from '@/lib/currency'

type PaymentMethod = 'stripe' | 'paystack' | 'paypal' | 'crypto' | 'bank'
type CryptoNetwork = 'BTC' | 'ETH' | 'USDT_TRC20' | 'SOL' | 'BNB' | 'TRON'

const CRYPTO_OPTIONS: { id: CryptoNetwork; label: string; settingKey: string }[] = [
  { id: 'BTC', label: 'Bitcoin', settingKey: 'btcAddress' },
  { id: 'ETH', label: 'Ethereum', settingKey: 'ethAddress' },
  { id: 'USDT_TRC20', label: 'USDT (TRC20)', settingKey: 'usdtTronAddress' },
  { id: 'SOL', label: 'Solana', settingKey: 'solAddress' },
  { id: 'BNB', label: 'BNB', settingKey: 'bnbAddress' },
  { id: 'TRON', label: 'TRON', settingKey: 'usdtTronAddress' },
]

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
  onBackToWallet?: () => void
}

// Stripe Card Form component - uses local API routes
function StripeCardForm({
  amount,
  onSuccess,
  onError
}: {
  amount: number
  onSuccess: () => void
  onError: (msg: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    try {
      // Create deposit via local API route
      const response = await fetch('/api/deposits/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('auth_token') && {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          }),
        },
        body: JSON.stringify({ amount }),
      })
      const result = await response.json()

      if (!result.success || !result.data?.clientSecret) {
        throw new Error(result.error || 'Failed to create payment')
      }

      const { depositId, clientSecret } = result.data

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement)! }
      })

      if (error) {
        onError(error.message || 'Payment failed')
      } else if (paymentIntent?.status === 'succeeded') {
        // Confirm deposit via local API route (verifies with Stripe, then credits wallet via Railway)
        const confirmRes = await fetch('/api/deposits/stripe/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('auth_token') && {
              Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
            }),
          },
          body: JSON.stringify({ depositId, paymentIntentId: paymentIntent.id }),
        })
        const confirmResult = await confirmRes.json()
        if (!confirmRes.ok || !confirmResult.success) {
          console.error('Stripe completion failed:', confirmResult)
        }
        onSuccess()
      } else {
        onError('Payment was not completed')
      }
    } catch (err: any) {
      onError(err.message || 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-surface-dark border border-border-dark rounded-xl p-4">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#ffffff',
                '::placeholder': { color: '#64748b' },
              },
            },
          }}
        />
      </div>
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full py-3 bg-primary text-black font-bold rounded-xl hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Icon name="loading" size={20} className="animate-spin" />
            Processing...
          </>
        ) : (
          `Pay $${amount.toFixed(2)}`
        )}
      </button>
    </form>
  )
}

export default function DepositModal({ isOpen, onClose, onBackToWallet }: DepositModalProps) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [method, setMethod] = useState<PaymentMethod>('stripe')
  const [amount, setAmount] = useState<number>(50)
  const [customAmount, setCustomAmount] = useState('')
  const [step, setStep] = useState<'amount' | 'payment' | 'success'>('amount')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Settings from backend
  const [enabledProviders, setEnabledProviders] = useState({
    stripe: false,
    paystack: false,
    paypal: false,
    crypto: false,
    bank: false,
  })
  const [, setSettings] = useState<any>(null)
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [paystackPublicKey, setPaystackPublicKey] = useState('')
  const [paystackScriptReady, setPaystackScriptReady] = useState(false)
  const [paystackCurrency, setPaystackCurrency] = useState('NGN') // Default to NGN
  const [exchangeRatesLoaded, setExchangeRatesLoaded] = useState(false)
  const [paystackEmail, setPaystackEmail] = useState('') // Email input for Paystack

  // Crypto with 45-min verification
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoNetwork>('BTC')
  const [cryptoWallets, setCryptoWallets] = useState<Record<string, string>>({})
  const [pendingDepositId, setPendingDepositId] = useState<string | null>(null)
  const [cryptoTimeRemaining, setCryptoTimeRemaining] = useState<number>(45 * 60 * 1000)
  const [cryptoVerificationStatus, setCryptoVerificationStatus] = useState<'idle' | 'pending' | 'confirmed' | 'expired'>('idle')
  const [userTxHash, setUserTxHash] = useState('')
  const [confirmedTxHash, setConfirmedTxHash] = useState('')
  const [explorerUrl, setExplorerUrl] = useState('')

  // Bank
  const [bankDepositId, setBankDepositId] = useState<string | null>(null)
  const [bankDetails, setBankDetails] = useState<any>(null)
  const [proofUrl, setProofUrl] = useState('')
  const [proofSubmitted, setProofSubmitted] = useState(false)
  const [proofType, setProofType] = useState<'upload' | 'url'>('upload')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [uploadingProof, setUploadingProof] = useState(false)
  const [bankTransferStep, setBankTransferStep] = useState<'details' | 'confirm' | 'proof'>('details')

  const presets = [10, 25, 50, 100, 500]
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

  // Load settings from backend
  useEffect(() => {
    if (!isOpen) return

    apiFetch('/settings/public')
      .then((result) => {
        if (result.success && result.data) {
          const data = result.data as any
          setSettings(data)
          setEnabledProviders({
            stripe: data.stripeEnabled === true,
            paystack: data.paystackEnabled === true,
            paypal: data.paypalEnabled === true,
            crypto: data.cryptoEnabled === true,
            bank: data.depositBankEnabled === true,
          })

          // Set crypto wallets
          const wallets: Record<string, string> = {}
          if (data.btcAddress) wallets['BTC'] = data.btcAddress
          if (data.ethAddress) wallets['ETH'] = data.ethAddress
          if (data.usdtTronAddress) wallets['USDT_TRC20'] = data.usdtTronAddress
          if (data.solAddress) wallets['SOL'] = data.solAddress
          if (data.bnbAddress) wallets['BNB'] = data.bnbAddress
          if (data.usdtTronAddress) wallets['TRON'] = data.usdtTronAddress
          setCryptoWallets(wallets)

          // Set default method to first enabled
          if (data.stripeEnabled) setMethod('stripe')
          else if (data.paystackEnabled) setMethod('paystack')
          else if (data.paypalEnabled) setMethod('paypal')
          else if (data.cryptoEnabled) setMethod('crypto')
          else if (data.depositBankEnabled) setMethod('bank')
        }
      })
      .catch(err => console.error('Failed to load settings:', err))
  }, [isOpen])

  // Load Stripe when enabled (external backend like checkout)
  useEffect(() => {
    if (!isOpen || !enabledProviders.stripe || stripePromise) return

    fetch(`${apiUrl}/payments/stripe/config`)
      .then(res => {
        if (!res.ok) throw new Error('Railway failed')
        return res.json()
      })
      .catch(() => {
        console.log('Falling back to local Stripe config')
        return fetch('/api/payments/stripe/config').then(res => res.json())
      })
      .then(data => {
        if (data.data?.publishableKey) {
          setStripePromise(loadStripe(data.data.publishableKey))
        }
      })
      .catch(err => console.error('Failed to load Stripe config:', err))
  }, [isOpen, enabledProviders.stripe, stripePromise])

  // Load Paystack when enabled (Railway + local fallback)
  useEffect(() => {
    if (!isOpen || !enabledProviders.paystack || paystackPublicKey) return

    // Try Railway first (fast), fall back to local API (reliable)
    fetch(`${apiUrl}/payments/paystack/config`)
      .then(res => {
        if (!res.ok) throw new Error('Railway failed')
        return res.json()
      })
      .catch(() => {
        // Fallback to local API route
        console.log('Falling back to local Paystack config')
        return fetch('/api/payments/paystack/config').then(res => res.json())
      })
      .then(data => {
        if (data.data?.publicKey) {
          setPaystackPublicKey(data.data.publicKey)
          // Load Paystack script
          if ((window as any).PaystackPop) {
            setPaystackScriptReady(true)
          } else if (!document.querySelector('script[src*="paystack"]')) {
            const script = document.createElement('script')
            script.src = 'https://js.paystack.co/v1/inline.js'
            script.async = true
            script.onload = () => setPaystackScriptReady(true)
            document.head.appendChild(script)
          } else {
            // Script tag exists but still loading — poll until ready
            const poll = setInterval(() => {
              if ((window as any).PaystackPop) {
                setPaystackScriptReady(true)
                clearInterval(poll)
              }
            }, 100)
          }
        }
      })
      .catch(err => console.error('Failed to load Paystack config:', err))
  }, [isOpen, enabledProviders.paystack, paystackPublicKey, apiUrl])

  // Fetch live exchange rates for Paystack currency conversion
  useEffect(() => {
    if (!isOpen || exchangeRatesLoaded) return

    fetch(`${apiUrl}/currency/rates`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.rates) {
          setExchangeRates(data.data.rates)
        }
        setExchangeRatesLoaded(true)
      })
      .catch(() => {
        // Fallback rates will be used
        setExchangeRatesLoaded(true)
      })
  }, [isOpen, exchangeRatesLoaded, apiUrl])

  // Pre-fill Paystack email from user data (if real email exists)
  useEffect(() => {
    if (!isOpen || paystackEmail) return

    // Auth context is the authoritative source for the logged-in user's email
    if (user?.email && !user.email.endsWith('@wallet.local')) {
      setPaystackEmail(user.email)
      return
    }

    // Fallback to localStorage (for wallet-auth users without email in context)
    try {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const userData = JSON.parse(storedUser)
        // Only use if it's a real email (not wallet-generated)
        if (userData.email && !userData.email.endsWith('@wallet.local')) {
          setPaystackEmail(userData.email)
        }
      }
    } catch {
      // JSON parse error
    }
  }, [isOpen, user])

  // Crypto verification polling (45-min auto-confirm)
  useEffect(() => {
    if (!pendingDepositId || cryptoVerificationStatus !== 'pending') return

    let pollInterval: NodeJS.Timeout | null = null
    let countdownInterval: NodeJS.Timeout | null = null

    // Poll blockchain every 10 seconds
    const pollPayment = async () => {
      try {
        const response = await fetch(`/api/deposits/crypto/check/${pendingDepositId}`, {
          headers: {
            ...(localStorage.getItem('auth_token') && {
              Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
            }),
          },
        })
        const result = await response.json()

        if (result.success && result.data) {
          if (result.data.status === 'CONFIRMED') {
            setCryptoVerificationStatus('confirmed')
            setConfirmedTxHash(result.data.txHash || '')
            setExplorerUrl(result.data.explorerUrl || '')
            if (pollInterval) clearInterval(pollInterval)
            if (countdownInterval) clearInterval(countdownInterval)
            queryClient.invalidateQueries({ queryKey: ['wallet'] })
          } else if (result.data.status === 'EXPIRED') {
            setCryptoVerificationStatus('expired')
            if (pollInterval) clearInterval(pollInterval)
            if (countdownInterval) clearInterval(countdownInterval)
          } else if (result.data.timeRemaining !== undefined) {
            setCryptoTimeRemaining(result.data.timeRemaining)
          }
        }
      } catch (err) {
        console.error('Poll payment error:', err)
      }
    }

    // Initial poll
    pollPayment()

    // Set up intervals
    pollInterval = setInterval(pollPayment, 10000) // Every 10 seconds
    countdownInterval = setInterval(() => {
      setCryptoTimeRemaining(prev => {
        if (prev <= 1000) {
          setCryptoVerificationStatus('expired')
          if (pollInterval) clearInterval(pollInterval)
          if (countdownInterval) clearInterval(countdownInterval)
          return 0
        }
        return prev - 1000
      })
    }, 1000)

    return () => {
      if (pollInterval) clearInterval(pollInterval)
      if (countdownInterval) clearInterval(countdownInterval)
    }
  }, [pendingDepositId, cryptoVerificationStatus, queryClient])

  // Clear error when payment method changes
  useEffect(() => {
    setError('')
  }, [method])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('amount')
      setAmount(50)
      setCustomAmount('')
      setError('')
      setPendingDepositId(null)
      setCryptoVerificationStatus('idle')
      setCryptoTimeRemaining(45 * 60 * 1000)
      setUserTxHash('')
      setConfirmedTxHash('')
      setExplorerUrl('')
      setBankDepositId(null)
      setBankDetails(null)
      setProofUrl('')
      setProofSubmitted(false)
      setProofFile(null)
      setBankTransferStep('details')
    }
  }, [isOpen])

  if (!isOpen) return null

  const finalAmount = customAmount ? parseFloat(customAmount) : amount
  const isValidAmount = finalAmount >= 5 && finalAmount <= 10000

  const formatTimeRemaining = (ms: number) => {
    if (ms <= 0) return '00:00'
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const handleProceed = async () => {
    if (!isValidAmount) {
      setError('Amount must be between $5 and $10,000')
      return
    }
    setError('')
    setLoading(true)

    try {
      if (method === 'stripe') {
        setStep('payment')
      } else if (method === 'paystack') {
        if (!paystackPublicKey || !(window as any).PaystackPop) {
          throw new Error('Paystack is not configured')
        }

        // Validate email - Paystack requires a valid real email
        const emailToUse = paystackEmail.trim()
        if (!emailToUse || !emailToUse.includes('@') || emailToUse.endsWith('@wallet.local')) {
          throw new Error('Please enter a valid email address for payment receipt')
        }

        // Convert USD to selected Paystack currency
        const chargeAmount = convertPrice(finalAmount, paystackCurrency)

        const depositRef = `DEP-${Date.now()}-${Math.random().toString(36).substring(7)}`
        const authToken = localStorage.getItem('auth_token')

        // Create deposit record before opening popup
        const createRes = await fetch('/api/deposits/paystack', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken && { Authorization: `Bearer ${authToken}` }),
          },
          body: JSON.stringify({ amount: finalAmount, reference: depositRef }),
        })
        const createData = await createRes.json()
        if (!createData.success) {
          throw new Error(createData.error || 'Failed to create deposit')
        }
        const paystackDepositId = createData.data.depositId

        if (!(window as any).PaystackPop) {
          throw new Error('Payment system is still loading. Please wait a moment and try again.')
        }

        const handler = (window as any).PaystackPop.setup({
          key: paystackPublicKey,
          email: emailToUse,
          amount: Math.round(chargeAmount * 100),
          currency: paystackCurrency,
          ref: depositRef,
          callback: (response: any) => {
            // Verify payment and credit wallet via local route
            fetch('/api/deposits/paystack/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(authToken && { Authorization: `Bearer ${authToken}` }),
              },
              body: JSON.stringify({ depositId: paystackDepositId, reference: response.reference }),
            })
              .then(res => res.json())
              .then(result => {
                if (result.success) {
                  queryClient.invalidateQueries({ queryKey: ['wallet'] })
                  queryClient.invalidateQueries({ queryKey: ['deposits'] })
                  setStep('success')
                } else {
                  setError(result.error || 'Payment verification failed. Please contact support.')
                }
                setLoading(false)
              })
              .catch(() => {
                setError('Payment verification failed. Please contact support.')
                setLoading(false)
              })
          },
          onClose: () => setLoading(false),
        })
        handler.openIframe()
      } else if (method === 'paypal') {
        // Call PayPal API directly
        const response = await fetch('/api/deposits/paypal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('auth_token') && {
              Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
            }),
          },
          body: JSON.stringify({ amount: finalAmount }),
        })
        const result = await response.json()
        if (result.success && result.data?.approvalUrl) {
          window.location.href = result.data.approvalUrl
        } else {
          throw new Error('We\'re working to configure this payment method. Please use another payment method.')
        }
      } else if (method === 'crypto') {
        // Initiate crypto deposit with 45-min verification via local route
        const response = await fetch('/api/deposits/crypto/initiate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('auth_token') && {
              Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
            }),
          },
          body: JSON.stringify({
            amount: finalAmount,
            network: selectedCrypto,
          }),
        })
        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error || 'Failed to initiate deposit')
        }
        setPendingDepositId(result.data.depositId)
        // Use server-provided timeRemaining if available, otherwise calculate from expiresAt
        const remaining = result.data.timeRemaining ?? (new Date(result.data.expiresAt).getTime() - Date.now())
        setCryptoTimeRemaining(Math.max(0, remaining))
        setCryptoVerificationStatus('pending')
        setStep('payment')
      } else if (method === 'bank') {
        // Create bank deposit via local route
        const response = await fetch('/api/deposits/bank', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('auth_token') && {
              Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
            }),
          },
          body: JSON.stringify({ amount: finalAmount }),
        })
        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error || 'Failed to create deposit')
        }
        setBankDepositId(result.data.depositId)
        setBankDetails(result.data.bankDetails)
        setStep('payment')
      }
    } catch (err: any) {
      let errorMessage = err.message || 'Something went wrong'

      // Handle database connection errors (Neon cold start)
      if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
        errorMessage = 'Service temporarily unavailable. Please try again in a few seconds.'
      }
      // Handle auth errors when token is missing
      else if (errorMessage.includes('Authentication required')) {
        errorMessage = 'Please log in again to continue.'
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Submit transaction hash for crypto
  const handleCryptoTxHashSubmit = async () => {
    if (!userTxHash.trim() || !pendingDepositId) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/deposits/crypto/check/${pendingDepositId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('auth_token') && {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          }),
        },
        body: JSON.stringify({ userTxHash }),
      })
      const result = await response.json()
      if (result.success) {
        setExplorerUrl(result.data.explorerUrl || '')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit')
    } finally {
      setLoading(false)
    }
  }

  // Submit bank proof
  const handleBankProofSubmit = async (url: string) => {
    if (!bankDepositId) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/deposits/bank/${bankDepositId}/proof`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('auth_token') && {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          }),
        },
        body: JSON.stringify({ proofUrl: url }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit proof')
      }
      setProofSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Failed to submit proof')
    } finally {
      setLoading(false)
    }
  }

  const handleUploadProof = async () => {
    if (!proofFile) return
    setUploadingProof(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', proofFile)

      // Try Railway API first, fallback to local
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
      let uploadRes = await fetch(`${apiUrl}/deposits/upload-proof`, {
        method: 'POST',
        body: formData,
        headers: {
          ...(localStorage.getItem('auth_token') && {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          }),
        },
      })

      // Fallback to local upload if Railway fails
      if (!uploadRes.ok) {
        console.log('Railway upload failed, trying local')
        uploadRes = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        })
      }

      const uploadData = await uploadRes.json()
      const imageUrl = uploadData.data?.url || uploadData.url
      if (!uploadRes.ok || !imageUrl) {
        throw new Error(uploadData.error || 'Failed to upload image')
      }
      await handleBankProofSubmit(imageUrl)
    } catch (err: any) {
      setError(err.message || 'Failed to upload proof')
    } finally {
      setUploadingProof(false)
    }
  }

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['wallet'] })
    setStep('success')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const methodTabs = [
    { id: 'stripe' as const, label: 'Stripe', icon: 'stripe', enabled: enabledProviders.stripe },
    { id: 'paystack' as const, label: 'Paystack', icon: 'paystack', enabled: enabledProviders.paystack },
    { id: 'paypal' as const, label: 'PayPal', icon: 'paypal', enabled: enabledProviders.paypal },
    { id: 'crypto' as const, label: 'Crypto', icon: 'bitcoin', enabled: enabledProviders.crypto },
    { id: 'bank' as const, label: 'Bank', icon: 'bank', enabled: enabledProviders.bank },
  ].filter(tab => tab.enabled)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[#0a0a0a] border border-border-dark rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-dark sticky top-0 bg-[#0a0a0a] z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Icon name="wallet" size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Add Money</h2>
              <p className="text-slate-500 text-sm">Deposit funds to your wallet</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface-dark flex items-center justify-center text-slate-400 hover:text-white">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="p-6">
          {/* Success */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                <Icon name="check-circle" size={40} className="text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Deposit Successful!</h3>
              <p className="text-slate-400 mb-6">Your wallet has been credited with ${finalAmount.toFixed(2)}</p>
              <button onClick={onClose} className="px-8 py-3 bg-primary text-black font-bold rounded-xl hover:brightness-105">
                Done
              </button>
            </div>
          )}

          {/* Amount Selection */}
          {step === 'amount' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-3">Select amount</label>
                <div className="grid grid-cols-5 gap-2">
                  {presets.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => { setAmount(preset); setCustomAmount('') }}
                      className={`py-2 rounded-lg text-sm font-bold transition-all ${
                        amount === preset && !customAmount ? 'bg-primary text-black' : 'bg-surface-dark text-slate-400 hover:bg-border-dark'
                      }`}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Custom amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    min="5"
                    max="10000"
                    placeholder="0.00"
                    value={customAmount}
                    onChange={(e) => { setCustomAmount(e.target.value); setAmount(0) }}
                    className="w-full bg-surface-dark border border-border-dark rounded-xl pl-8 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-primary"
                  />
                </div>
                <p className="text-slate-600 text-xs mt-1">Min: $5 | Max: $10,000</p>
              </div>

              {methodTabs.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-3">Payment method</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {methodTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setMethod(tab.id)}
                        className={`relative flex flex-col items-center p-4 bg-charcoal border rounded-xl transition-all ${
                          method === tab.id
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-border-dark hover:border-slate-600'
                        }`}
                      >
                        <Icon name={tab.icon as any} size={24} className={method === tab.id ? 'text-primary' : 'text-slate-400'} />
                        <span className={`mt-2 text-sm font-bold ${method === tab.id ? 'text-white' : 'text-slate-400'}`}>{tab.label}</span>
                        {method === tab.id && (
                          <Icon name="check-circle" size={16} className="absolute top-2 right-2 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {method === 'crypto' && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Select cryptocurrency</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CRYPTO_OPTIONS.filter(opt => cryptoWallets[opt.id]).map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setSelectedCrypto(option.id)}
                        className={`py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${
                          selectedCrypto === option.id ? 'bg-primary text-black' : 'bg-surface-dark text-slate-400 hover:bg-border-dark'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Paystack Currency Selection - shown when Paystack is selected */}
              {method === 'paystack' && (
                <div className="space-y-3">
                  {/* Email input for payment receipt */}
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Email for receipt</label>
                    <input
                      type="email"
                      placeholder="Enter your email address"
                      value={paystackEmail}
                      onChange={(e) => setPaystackEmail(e.target.value)}
                      className="w-full bg-surface-dark border border-border-dark rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Select payment currency</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {PAYSTACK_CURRENCIES.map((curr) => {
                        const convertedAmount = convertPrice(finalAmount, curr.code)
                        return (
                          <button
                            key={curr.code}
                            onClick={() => setPaystackCurrency(curr.code)}
                            className={`relative flex flex-col items-center p-3 rounded-xl transition-all ${
                              paystackCurrency === curr.code
                                ? 'bg-primary text-black ring-2 ring-primary/20'
                                : 'bg-surface-dark text-slate-400 hover:bg-border-dark border border-border-dark'
                            }`}
                          >
                            <span className="text-xs font-bold">{curr.code}</span>
                            <span className={`text-[10px] mt-0.5 ${paystackCurrency === curr.code ? 'text-black/70' : 'text-slate-500'}`}>
                              {curr.symbol}{convertedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            {paystackCurrency === curr.code && (
                              <Icon name="check-circle" size={14} className="absolute top-1 right-1 text-black" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Amount Preview */}
                  <div className="bg-surface-dark border border-border-dark rounded-xl p-4 text-center">
                    <p className="text-slate-500 text-xs mb-1">You will be charged</p>
                    <p className="text-xl font-bold text-white">
                      {PAYSTACK_CURRENCIES.find(c => c.code === paystackCurrency)?.symbol}
                      {convertPrice(finalAmount, paystackCurrency).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="text-slate-500 text-sm ml-2">{paystackCurrency}</span>
                    </p>
                    <p className="text-slate-600 text-xs mt-1">= ${finalAmount.toFixed(2)} USD</p>
                  </div>
                </div>
              )}

              {/* PayPal Info - shown when PayPal is selected */}
              {method === 'paypal' && (
                <div className="bg-surface-dark border border-border-dark rounded-xl p-4 space-y-3">
                  <div className="text-center">
                    <Icon name="paypal" size={32} className="text-primary mx-auto mb-2" />
                    <h4 className="text-white font-bold text-sm">Pay with PayPal</h4>
                    <p className="text-slate-500 text-xs">Fast and secure deposit with your PayPal account</p>
                  </div>

                  <div className="flex items-center gap-2 p-2 bg-black rounded-lg">
                    <Icon name="info" size={16} className="text-slate-400 flex-shrink-0" />
                    <p className="text-slate-400 text-xs">
                      You&apos;ll be redirected to PayPal to complete your deposit.
                    </p>
                  </div>

                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
                    <p className="text-primary text-xs font-bold">Buyer Protection Included</p>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>
              )}

              <button
                onClick={handleProceed}
                disabled={!isValidAmount || loading || methodTabs.length === 0}
                className="w-full py-4 bg-primary text-black font-bold rounded-xl hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
              >
                {loading ? (
                  <><Icon name="loading" size={20} className="animate-spin" /> Please wait...</>
                ) : methodTabs.length === 0 ? (
                  'No payment methods available'
                ) : method === 'paystack' ? (
                  <>
                    Continue — {PAYSTACK_CURRENCIES.find(c => c.code === paystackCurrency)?.symbol}
                    {convertPrice(finalAmount || 0, paystackCurrency).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <Icon name="arrow-right" size={20} />
                  </>
                ) : (
                  <>Continue — ${(finalAmount || 0).toFixed(2)} <Icon name="arrow-right" size={20} /></>
                )}
              </button>
            </div>
          )}

          {/* Payment Step */}
          {step === 'payment' && (
            <div className="space-y-6">
              <button onClick={() => setStep('amount')} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm">
                <Icon name="arrow-left" size={16} /> Back
              </button>

              {/* Stripe */}
              {method === 'stripe' && (
                <div>
                  <h3 className="font-bold text-white mb-4">Pay with Stripe — ${finalAmount.toFixed(2)}</h3>
                  {stripePromise ? (
                    <Elements stripe={stripePromise}>
                      <StripeCardForm amount={finalAmount} onSuccess={handleSuccess} onError={(msg) => setError(msg)} />
                    </Elements>
                  ) : (
                    <div className="text-center py-8">
                      <Icon name="loading" size={24} className="animate-spin text-primary mx-auto mb-3" />
                      <p className="text-slate-400">Loading Stripe...</p>
                    </div>
                  )}
                </div>
              )}

              {/* Crypto with 45-min verification */}
              {method === 'crypto' && cryptoWallets[selectedCrypto] && (
                <div>
                  <h3 className="font-bold text-white mb-4">{selectedCrypto} Deposit — ${finalAmount.toFixed(2)}</h3>

                  {/* Confirmed */}
                  {cryptoVerificationStatus === 'confirmed' && (
                    <div className="bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border border-green-500/20 rounded-xl p-6 text-center space-y-4">
                      <Icon name="check-circle" size={48} className="text-green-500 mx-auto" />
                      <div>
                        <h4 className="text-green-400 font-bold text-lg mb-2">Payment Confirmed!</h4>
                        <p className="text-slate-400 text-sm">Your wallet has been credited with ${finalAmount.toFixed(2)}</p>
                        {confirmedTxHash && (
                          <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline mt-2 inline-block">
                            View Transaction
                          </a>
                        )}
                      </div>
                      <button onClick={onClose} className="px-6 py-2 bg-primary text-black font-bold rounded-xl">
                        Done
                      </button>
                    </div>
                  )}

                  {/* Expired */}
                  {cryptoVerificationStatus === 'expired' && (
                    <div className="bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border border-red-500/20 rounded-xl p-6 text-center space-y-4">
                      <Icon name="x-circle" size={48} className="text-red-500 mx-auto" />
                      <div>
                        <h4 className="text-red-400 font-bold text-lg mb-2">Payment Window Expired</h4>
                        <p className="text-slate-400 text-sm">We couldn't detect your payment within the 45-minute window.</p>
                        <p className="text-slate-500 text-xs mt-2">If you've sent payment, please contact support with your transaction hash.</p>
                      </div>
                      <button onClick={() => { setCryptoVerificationStatus('idle'); setPendingDepositId(null); setStep('amount') }}
                        className="px-6 py-2 bg-surface-dark text-white font-bold rounded-xl">
                        Try Again
                      </button>
                    </div>
                  )}

                  {/* Pending - Waiting for payment */}
                  {cryptoVerificationStatus === 'pending' && (
                    <div className="bg-surface-dark border border-border-dark rounded-xl p-4 space-y-4">
                      {/* Countdown */}
                      <div className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Icon name="clock" size={18} className="text-yellow-500" />
                          <span className="text-yellow-400 text-sm font-medium">Payment window</span>
                        </div>
                        <span className="text-yellow-400 font-mono font-bold">{formatTimeRemaining(cryptoTimeRemaining)}</span>
                      </div>

                      {/* QR and Address */}
                      <div className="flex justify-center">
                        <QRCodeSVG value={cryptoWallets[selectedCrypto]} size={150} bgColor="#1a1a1a" fgColor="#a3ff40" />
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs uppercase mb-2">Send to this address</p>
                        <div className="flex items-center gap-2">
                          <code className="text-primary text-sm flex-1 break-all">{cryptoWallets[selectedCrypto]}</code>
                          <button onClick={() => copyToClipboard(cryptoWallets[selectedCrypto])} className="p-2 bg-primary/10 hover:bg-primary/20 rounded-lg">
                            <Icon name="copy" size={16} className="text-primary" />
                          </button>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <Icon name="loading" size={16} className="animate-spin text-primary" />
                        <span>Scanning blockchain for your payment...</span>
                      </div>

                      {/* Optional: Submit tx hash */}
                      <div className="border-t border-border-dark pt-4">
                        <p className="text-slate-400 text-sm mb-3">Already sent? Paste your transaction hash to speed up verification:</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Transaction hash (optional)"
                            value={userTxHash}
                            onChange={(e) => setUserTxHash(e.target.value)}
                            className="flex-1 bg-black border border-border-dark rounded-xl px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-primary"
                          />
                          <button
                            onClick={handleCryptoTxHashSubmit}
                            disabled={!userTxHash.trim() || loading}
                            className="px-4 py-2.5 bg-surface-dark text-white font-medium rounded-xl hover:bg-border-dark disabled:opacity-50 text-sm"
                          >
                            Submit
                          </button>
                        </div>
                        {explorerUrl && (
                          <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-xs hover:underline mt-2 inline-block">
                            View on Explorer
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Idle - Show QR (fallback, shouldn't happen normally) */}
                  {cryptoVerificationStatus === 'idle' && (
                    <div className="bg-surface-dark border border-border-dark rounded-xl p-4 space-y-4">
                      <div className="flex justify-center">
                        <QRCodeSVG value={cryptoWallets[selectedCrypto]} size={150} bgColor="#1a1a1a" fgColor="#a3ff40" />
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs uppercase mb-2">Send to this address</p>
                        <div className="flex items-center gap-2">
                          <code className="text-primary text-sm flex-1 break-all">{cryptoWallets[selectedCrypto]}</code>
                          <button onClick={() => copyToClipboard(cryptoWallets[selectedCrypto])} className="p-2 bg-primary/10 hover:bg-primary/20 rounded-lg">
                            <Icon name="copy" size={16} className="text-primary" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bank Transfer */}
              {method === 'bank' && bankDetails && (
                <div>
                  <h3 className="font-bold text-white mb-4">Bank Transfer — ${finalAmount.toFixed(2)}</h3>
                  <div className="bg-surface-dark border border-border-dark rounded-xl p-4 space-y-3">
                    {[
                      { label: 'Account Name', value: bankDetails.accountName },
                      { label: 'Account Number', value: bankDetails.accountNumber },
                      { label: 'Bank Name', value: bankDetails.bankName },
                      { label: 'Routing/Sort Code', value: bankDetails.routingNumber },
                      { label: 'Reference', value: bankDetails.reference },
                    ].filter(item => item.value && item.value !== 'N/A').map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">{label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium text-sm">{value}</span>
                          <button onClick={() => copyToClipboard(value)} className="p-1 hover:text-primary">
                            <Icon name="copy" size={14} className="text-slate-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {bankDetails.instructions && (
                      <p className="text-yellow-400 text-xs mt-2 bg-yellow-500/10 p-2 rounded-lg">{bankDetails.instructions}</p>
                    )}
                  </div>

                  <div className="mt-4">
                    {!proofSubmitted ? (
                      <div className="space-y-4">
                        {/* Step 1: Show "I've Completed Transfer" button */}
                        {bankTransferStep === 'details' && (
                          <button
                            onClick={() => setBankTransferStep('confirm')}
                            className="w-full py-3 bg-primary text-black font-bold rounded-xl hover:brightness-105 transition-all"
                          >
                            I've Completed the Transfer
                          </button>
                        )}

                        {/* Step 2: Show options after clicking */}
                        {bankTransferStep === 'confirm' && (
                          <div className="space-y-3 p-4 bg-surface-dark border border-border-dark rounded-xl">
                            <p className="text-slate-400 text-sm">
                              You can upload proof now for faster verification, or wait for admin confirmation (up to 30 minutes).
                            </p>
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => setBankTransferStep('proof')}
                                className="w-full py-2.5 bg-primary text-black font-bold rounded-xl hover:brightness-105 text-sm"
                              >
                                Upload Proof Now (Recommended)
                              </button>
                              <button
                                onClick={() => {
                                  setProofSubmitted(true)
                                }}
                                className="w-full py-2.5 bg-surface-dark border border-border-dark text-white font-medium rounded-xl hover:bg-border-dark text-sm"
                              >
                                Wait for Admin Confirmation
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Step 3: Proof upload UI */}
                        {bankTransferStep === 'proof' && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-slate-400 text-sm">Upload payment proof:</p>
                              <button
                                onClick={() => setBankTransferStep('confirm')}
                                className="text-slate-500 text-xs hover:text-white"
                              >
                                Back
                              </button>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setProofType('upload')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${proofType === 'upload' ? 'bg-primary text-black' : 'bg-surface-dark text-slate-400'}`}
                              >
                                Upload
                              </button>
                              <button
                                onClick={() => setProofType('url')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${proofType === 'url' ? 'bg-primary text-black' : 'bg-surface-dark text-slate-400'}`}
                              >
                                URL
                              </button>
                            </div>
                            {proofType === 'upload' ? (
                              <div className="space-y-3">
                                <input type="file" accept="image/*" onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                  className="w-full bg-black border border-border-dark rounded-xl px-4 py-2.5 text-white text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-primary file:text-black" />
                                {proofFile && (
                                  <button onClick={handleUploadProof} disabled={uploadingProof}
                                    className="w-full px-4 py-2 bg-primary text-black font-bold rounded-lg hover:brightness-105 disabled:opacity-50 text-sm">
                                    {uploadingProof ? 'Uploading...' : 'Submit Proof'}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <input type="url" placeholder="https://..." value={proofUrl} onChange={(e) => setProofUrl(e.target.value)}
                                  className="flex-1 bg-black border border-border-dark rounded-xl px-4 py-2.5 text-white placeholder-slate-600 text-sm" />
                                <button onClick={() => handleBankProofSubmit(proofUrl)} disabled={!proofUrl.trim() || loading}
                                  className="px-4 py-2.5 bg-primary text-black font-bold rounded-xl disabled:opacity-50 text-sm">
                                  Submit
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                        <p className="text-green-500 text-sm flex items-center gap-2">
                          <Icon name="check-circle" size={16} />
                          {proofUrl || proofFile ? 'Proof submitted!' : 'Transfer noted!'} Admin will verify and credit your wallet.
                        </p>
                        <p className="text-slate-500 text-xs mt-2">This usually takes up to 30 minutes during business hours.</p>
                        <button
                          onClick={() => { onClose(); onBackToWallet?.() }}
                          className="mt-4 w-full py-3 bg-primary text-black font-bold rounded-xl hover:brightness-105 transition-all"
                        >
                          Back to Wallet
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <p className="text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
