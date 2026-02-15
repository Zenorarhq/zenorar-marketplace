'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BrowserProvider, parseEther, formatEther, getAddress } from 'ethers'
import { loadStripe, Stripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import Header from '@/components/layout/Header'
import CategoryNav from '@/components/layout/CategoryNav'
import Footer from '@/components/layout/Footer'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import Icon from '@/components/ui/Icon'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/contexts/AuthContext'
import { usePreferences } from '@/contexts/PreferencesContext'
import { apiFetch, getSessionId } from '@/lib/api/client'

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
}

type PaymentMethod = 'wallet' | 'manual-crypto' | 'stripe' | 'paystack' | 'paypal'
type CryptoNetwork = 'BTC' | 'ETH' | 'USDT_ERC20' | 'USDT_BEP20' | 'USDT_TRC20' | 'BNB' | 'USDC' | 'SOL' | 'MATIC'

interface WalletState {
  address: string | null
  balance: string | null
  network: string | null
  isConnected: boolean
}

export default function PaymentPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { items, total, clearCart } = useCart()
  const { formatPrice } = usePreferences()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wallet')
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [paystackPublicKey, setPaystackPublicKey] = useState<string>('')
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
  const [receivingWallet, setReceivingWallet] = useState<string>(process.env.NEXT_PUBLIC_RECEIVING_WALLET || '0x742d35Cc6634C0532925a3b844Bc9e7595f5bE21')
  const [enabledProviders, setEnabledProviders] = useState({
    wallet: true, // MetaMask is always available
    manualCrypto: false,
    stripe: false,
    paystack: false,
    paypal: false,
  })

  // Load discount from sessionStorage
  useEffect(() => {
    const code = sessionStorage.getItem('discount_code')
    const amount = sessionStorage.getItem('discount_amount')
    if (code && amount) {
      setDiscountCode(code)
      setDiscountAmount(parseFloat(amount))
    }
  }, [])

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

          // Set receiving wallet address from settings
          if (data.receivingWalletAddress) {
            setReceivingWallet(data.receivingWalletAddress)
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
      fetch(`${apiUrl}/payments/stripe/config`)
        .then(res => res.json())
        .then(data => {
          if (data.data?.publishableKey) {
            setStripePromise(loadStripe(data.data.publishableKey))
          }
        })
        .catch(err => console.error('Failed to load Stripe config:', err))
    }
  }, [enabledProviders.stripe])

  // Load Paystack public key + script when Paystack is enabled
  useEffect(() => {
    if (enabledProviders.paystack) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
      fetch(`${apiUrl}/payments/paystack/config`)
        .then(res => res.json())
        .then(data => {
          if (data.data?.publicKey) {
            setPaystackPublicKey(data.data.publicKey)
          }
        })
        .catch(err => console.error('Failed to load Paystack config:', err))

      // Load Paystack inline script
      if (!document.querySelector('script[src*="paystack"]')) {
        const script = document.createElement('script')
        script.src = 'https://js.paystack.co/v1/inline.js'
        script.async = true
        document.head.appendChild(script)
      }
    }
  }, [enabledProviders.paystack])

  // Calculate crypto amount based on USD total (after discount)
  const finalTotal = total - discountAmount
  const getCryptoAmount = (network: CryptoNetwork): string => {
    const rate = CRYPTO_RATES[network] || 0.00042
    return (finalTotal * rate).toFixed(6)
  }

  // Connect wallet - Supports MetaMask, WalletConnect, Coinbase Wallet, and other Web3 wallets
  const connectWallet = async () => {
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

  // Process wallet payment
  const processWalletPayment = async () => {
    if (!walletState.isConnected || !window.ethereum) {
      setWalletError('Please connect your wallet first')
      return
    }

    setPaymentStatus('paying')
    setWalletError('')

    try {
      // Get shipping info from session storage
      const shippingDataStr = sessionStorage.getItem('checkoutShipping')
      const shippingData = shippingDataStr ? JSON.parse(shippingDataStr) : {}

      // First, create the order
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
      const orderResponse = await fetch(`${apiUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': getSessionId(),
          ...(localStorage.getItem('auth_token') && {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          }),
        },
        body: JSON.stringify({
          fullName: shippingData.fullName || 'Guest',
          email: shippingData.email || '',
          phone: shippingData.phone || '',
          address: shippingData.address || 'Digital Delivery',
          city: shippingData.city || 'N/A',
          state: shippingData.state || 'N/A',
          zipCode: shippingData.zipCode || '00000',
          customerNote: shippingData.notes || '',
          paymentMethod: `crypto_${selectedNetwork.toLowerCase()}`,
          discountCode: discountCode || undefined,
          discountAmount: discountAmount > 0 ? discountAmount : undefined,
          items: items.map((item: any) => ({
            productId: item.product.id,
            quantity: item.quantity,
            license: item.license,
            price: item.price,
          })),
        }),
      })

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json()
        console.error('Order creation failed:', errorData)
        throw new Error(errorData.error || errorData.message || 'Failed to create order')
      }

      const orderResult = await orderResponse.json()
      const orderId = orderResult.data.id
      const orderNumber = orderResult.data.orderNumber

      // Notify user: order placed
      apiFetch('/notifications/create', {
        method: 'POST',
        body: JSON.stringify({ type: 'ORDER_PLACED', title: 'Order Placed', message: `Your order #${orderNumber} has been placed successfully.`, data: { orderId, orderNumber } }),
      }).catch(() => {})

      // Record discount usage if a discount was applied
      if (discountCode && discountAmount > 0) {
        apiFetch('/orders/apply-discount', {
          method: 'POST',
          body: JSON.stringify({ orderId, discountCode, discountAmount }),
        }).catch(err => console.error('Failed to save discount to order:', err))

        apiFetch('/discounts/use', {
          method: 'POST',
          body: JSON.stringify({ code: discountCode }),
        }).catch(err => console.error('Failed to increment discount usage:', err))
      }

      const provider = new BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const cryptoAmount = getCryptoAmount(selectedNetwork)

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
        // Record the crypto payment in the backend
        const paymentResponse = await fetch(`${apiUrl}/payments/crypto`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId,
            txHash: tx.hash,
            walletAddress: walletState.address,
            network: selectedNetwork,
            cryptoAmount,
            usdAmount: finalTotal,
          }),
        })

        if (!paymentResponse.ok) {
          console.error('Failed to record payment, but transaction was successful')
        }

        // Store payment info
        sessionStorage.setItem('checkoutPayment', JSON.stringify({
          method: 'wallet',
          crypto: selectedNetwork,
          txHash: tx.hash,
          amount: cryptoAmount,
          usdAmount: finalTotal,
          walletAddress: walletState.address,
          orderId,
          orderNumber: orderResult.data.orderNumber,
        }))

        // Notify user: payment confirmed
        apiFetch('/notifications/create', {
          method: 'POST',
          body: JSON.stringify({ type: 'PAYMENT_RECEIVED', title: 'Payment Confirmed', message: `Payment for order #${orderNumber} confirmed. Tx: ${tx.hash.slice(0, 10)}...`, data: { orderId, orderNumber, txHash: tx.hash } }),
        }).catch(() => {})

        setPaymentStatus('success')

        // Redirect to success page after short delay
        setTimeout(() => {
          clearCart()
          router.push(`/checkout/success?txHash=${tx.hash}&orderNumber=${orderNumber}`)
        }, 2000)
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

  if (items.length === 0) {
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

      <main className="flex-grow max-w-container mx-auto px-8 lg:px-12 pb-24 w-full">
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

              <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
                {/* Payment Method Selection */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
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
                      <Icon name="credit-card" size={28} className="text-primary mb-2" />
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
                      <Icon name="credit-card" size={28} className="text-primary mb-2" />
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
                      <Icon name="wallet" size={28} className="text-primary mb-2" />
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
                  <div className="bg-charcoal border border-border-dark rounded-xl p-4 md:p-6 space-y-4 md:space-y-6">
                    {/* Network Selection */}
                    <div>
                      <h3 className="text-white font-bold text-sm md:text-base mb-2 md:mb-3">Select Network</h3>
                      <div className="grid grid-cols-3 gap-2 md:gap-3">
                        {[
                          { name: 'Ethereum', symbol: 'ETH', icon: 'diamond' },
                          { name: 'BNB Chain', symbol: 'BNB', icon: 'hexagon' },
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

                    {/* Wallet Connection */}
                    {!walletState.isConnected ? (
                      <div className="text-center py-4">
                        <Icon name="wallet" size={40} className="md:size-48 text-slate-600 mx-auto mb-3 md:mb-4" />
                        <p className="text-slate-400 text-xs md:text-sm mb-3 md:mb-4 px-2">
                          {typeof window !== 'undefined' && !window.ethereum
                            ? 'Please install a Web3 wallet to continue'
                            : 'Connect your wallet to pay with crypto'
                          }
                        </p>
                        {typeof window !== 'undefined' && !window.ethereum ? (
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
                            disabled={paymentStatus === 'connecting'}
                            className="bg-primary text-black font-bold px-6 md:px-8 py-2.5 md:py-3 text-sm md:text-base rounded-xl hover:brightness-105 transition-all disabled:opacity-50"
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
                            disabled={paymentStatus === 'paying'}
                            className="w-full bg-primary text-black font-bold py-4 rounded-xl hover:brightness-105 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
                      <p className="text-slate-400 text-xs mb-2">Send to this address:</p>
                      {loadingWallets ? (
                        <div className="bg-charcoal rounded-lg p-3 text-center">
                          <Icon name="loading" size={20} className="text-primary animate-spin mx-auto" />
                        </div>
                      ) : cryptoWallets[selectedNetwork] ? (
                        <div className="space-y-2">
                          <div className="bg-charcoal rounded-lg p-3 font-mono text-xs text-white break-all">
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

                    <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                      <Icon name="info" size={20} className="text-yellow-500" />
                      <p className="text-slate-300 text-xs">
                        Please send the exact amount to the wallet address. Your order will be processed after payment confirmation.
                      </p>
                    </div>
                  </div>
                )}

                {/* Stripe Payment (Secure Stripe Elements) */}
                {paymentMethod === 'stripe' && (
                  stripePromise ? (
                    <Elements stripe={stripePromise}>
                      <StripeCardForm
                        amount={finalTotal}
                        items={items}
                        discountCode={discountCode}
                        discountAmount={discountAmount}
                        formatPrice={formatPrice}
                        onSuccess={handleCardPaymentSuccess}
                        onBack={() => router.push('/checkout')}
                      />
                    </Elements>
                  ) : (
                    <div className="bg-charcoal border border-border-dark rounded-xl p-6 text-center">
                      <Icon name="loading" size={32} className="text-primary animate-spin mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">Loading Stripe...</p>
                    </div>
                  )
                )}

                {/* Paystack Payment (Secure Popup) */}
                {paymentMethod === 'paystack' && (
                  paystackPublicKey ? (
                    <PaystackCardForm
                      amount={finalTotal}
                      items={items}
                      discountCode={discountCode}
                      discountAmount={discountAmount}
                      formatPrice={formatPrice}
                      publicKey={paystackPublicKey}
                      onSuccess={handleCardPaymentSuccess}
                      onBack={() => router.push('/checkout')}
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
                      disabled={isSubmitting}
                      className="flex-1 bg-primary text-black font-bold py-4 rounded-xl hover:brightness-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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

              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={`${item.product.id}-${item.license}`} className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-surface-dark rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon name={item.product.icon || 'code'} size={20} className="text-slate-500" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-white text-sm font-medium truncate">{item.product.name}</p>
                      <p className="text-slate-500 text-xs">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-white font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-border-dark pt-4 space-y-3">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span className="text-white">${total.toFixed(2)}</span>
                </div>
                {discountCode && discountAmount > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Discount <span className="text-xs text-primary">({discountCode})</span></span>
                    <span className="text-primary">-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Tax</span>
                  <span className="text-white">$0.00</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-3 border-t border-border-dark">
                  <span className="text-white">Total</span>
                  <span className="text-white">${(total - discountAmount).toFixed(2)}</span>
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
  items,
  discountCode,
  discountAmount,
  formatPrice: formatPriceFn,
  onSuccess,
  onBack,
}: {
  amount: number
  items: any[]
  discountCode: string
  discountAmount: number
  formatPrice: (amount: number) => string
  onSuccess: (orderId: string, orderNumber: string) => void
  onBack: () => void
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

      // 1. Create order via Railway API
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
      const orderResponse = await fetch(`${apiUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': getSessionId(),
          ...(localStorage.getItem('auth_token') && {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          }),
        },
        body: JSON.stringify({
          fullName: shippingData.fullName || 'Guest',
          email: shippingData.email || '',
          phone: shippingData.phone || '',
          address: shippingData.address || 'Digital Delivery',
          city: shippingData.city || 'N/A',
          state: shippingData.state || 'N/A',
          zipCode: shippingData.zipCode || '00000',
          customerNote: shippingData.notes || '',
          paymentMethod: 'card_stripe',
          discountCode: discountCode || undefined,
          discountAmount: discountAmount > 0 ? discountAmount : undefined,
          items: items.map((item: any) => ({
            productId: item.product.id,
            quantity: item.quantity,
            license: item.license,
            price: item.price,
          })),
        }),
      })

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json()
        throw new Error(errorData.error || 'Failed to create order')
      }

      const orderResult = await orderResponse.json()
      const orderId = orderResult.data.id
      const orderNumber = orderResult.data.orderNumber

      // 2. Create PaymentIntent
      const intentResponse = await fetch('/api/payments/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, orderId }),
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, paymentIntentId: paymentIntent.id }),
        })
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
          disabled={processing || !stripe}
          className="flex-1 bg-primary text-black font-bold py-4 rounded-xl hover:brightness-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {processing ? (
            <>
              <Icon name="loading" size={20} className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Icon name="credit-card" size={20} />
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
  items,
  discountCode,
  discountAmount,
  formatPrice: formatPriceFn,
  publicKey,
  onSuccess,
  onBack,
}: {
  amount: number
  items: any[]
  discountCode: string
  discountAmount: number
  formatPrice: (amount: number) => string
  publicKey: string
  onSuccess: (orderId: string, orderNumber: string) => void
  onBack: () => void
}) {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const handlePayment = async () => {
    setProcessing(true)
    setError('')

    try {
      const shippingDataStr = sessionStorage.getItem('checkoutShipping')
      const shippingData = shippingDataStr ? JSON.parse(shippingDataStr) : {}

      // 1. Create order via Railway API
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
      const orderResponse = await fetch(`${apiUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': getSessionId(),
          ...(localStorage.getItem('auth_token') && {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          }),
        },
        body: JSON.stringify({
          fullName: shippingData.fullName || 'Guest',
          email: shippingData.email || '',
          phone: shippingData.phone || '',
          address: shippingData.address || 'Digital Delivery',
          city: shippingData.city || 'N/A',
          state: shippingData.state || 'N/A',
          zipCode: shippingData.zipCode || '00000',
          customerNote: shippingData.notes || '',
          paymentMethod: 'card_paystack',
          discountCode: discountCode || undefined,
          discountAmount: discountAmount > 0 ? discountAmount : undefined,
          items: items.map((item: any) => ({
            productId: item.product.id,
            quantity: item.quantity,
            license: item.license,
            price: item.price,
          })),
        }),
      })

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json()
        throw new Error(errorData.error || 'Failed to create order')
      }

      const orderResult = await orderResponse.json()
      const orderId = orderResult.data.id
      const orderNumber = orderResult.data.orderNumber

      // 2. Open Paystack popup
      const PaystackPop = (window as any).PaystackPop
      if (!PaystackPop) {
        throw new Error('Paystack is still loading. Please try again.')
      }

      const handler = PaystackPop.setup({
        key: publicKey,
        email: shippingData.email || 'customer@checkout.com',
        amount: Math.round(amount * 100),
        currency: 'USD',
        ref: `ORDER_${orderNumber}_${Date.now()}`,
        callback: (response: any) => {
          // Wrap async verification in a non-async callback (Paystack requires a plain function)
          fetch(`${apiUrl}/payments/paystack/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference: response.reference }),
          })
            .then(verifyResponse => {
              if (verifyResponse.ok) {
                onSuccess(orderId, orderNumber)
              } else {
                setError('Payment verification failed. Please contact support.')
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
          <Icon name="credit-card" size={48} className="text-primary mx-auto mb-4" />
          <h3 className="text-white font-bold mb-2">Pay with Card</h3>
          <p className="text-slate-500 text-sm">Secure payments via Paystack — supports Visa, Mastercard, Verve, and mobile money</p>
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
          disabled={processing}
          className="flex-1 bg-primary text-black font-bold py-4 rounded-xl hover:brightness-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {processing ? (
            <>
              <Icon name="loading" size={20} className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Icon name="credit-card" size={20} />
              Pay {formatPriceFn(amount)}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
