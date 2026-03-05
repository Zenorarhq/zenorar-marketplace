'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BrowserProvider, parseEther, formatEther } from 'ethers'
import Header from '@/components/layout/Header'
import CategoryNav from '@/components/layout/CategoryNav'
import Footer from '@/components/layout/Footer'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import Icon from '@/components/ui/Icon'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/contexts/AuthContext'
import { usePreferences } from '@/contexts/PreferencesContext'
import { apiFetch, getSessionId } from '@/lib/api/client'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

// Receiving wallet address - should be set via environment variable in production
const RECEIVING_WALLET = process.env.NEXT_PUBLIC_RECEIVING_WALLET || '0x742d35Cc6634C0532925a3b844Bc9e7595f5bE21'

// Crypto conversion rates (in production, fetch from API)
const CRYPTO_RATES: Record<string, number> = {
  ETH: 0.00042, // 1 USD = 0.00042 ETH (approx $2380/ETH)
  BNB: 0.0033,  // 1 USD = 0.0033 BNB (approx $300/BNB)
  MATIC: 1.25,  // 1 USD = 1.25 MATIC (approx $0.80/MATIC)
}

type PaymentMethod = 'wallet' | 'crypto-processor' | 'card'
type CryptoNetwork = 'ETH' | 'BNB' | 'MATIC'

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
  const [paymentConfig, setPaymentConfig] = useState({ stripeEnabled: false, paystackEnabled: false })
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null)
  const [paystackPublicKey, setPaystackPublicKey] = useState<string | null>(null)
  const [cardError, setCardError] = useState('')
  const [selectedNetwork, setSelectedNetwork] = useState<CryptoNetwork>('ETH')
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

  // Load discount from sessionStorage
  useEffect(() => {
    const code = sessionStorage.getItem('discount_code')
    const amount = sessionStorage.getItem('discount_amount')
    if (code && amount) {
      setDiscountCode(code)
      setDiscountAmount(parseFloat(amount))
    }
  }, [])

  // Load payment gateway configuration
  useEffect(() => {
    fetch('/api/settings/payments')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPaymentConfig(data.data)
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
          if (data.data.stripeEnabled) {
            fetch(`${apiUrl}/payments/stripe/config`)
              .then(res => res.json())
              .then(stripeData => {
                if (stripeData.success) {
                  setStripePromise(loadStripe(stripeData.data.publishableKey))
                }
              })
              .catch(err => console.error('Failed to load Stripe config:', err))
          }
          if (data.data.paystackEnabled) {
            fetch(`${apiUrl}/payments/paystack/config`)
              .then(res => res.json())
              .then(paystackData => {
                if (paystackData.success) {
                  setPaystackPublicKey(paystackData.data.publicKey)
                  // Load Paystack inline script
                  if (!document.querySelector('script[src*="paystack"]')) {
                    const script = document.createElement('script')
                    script.src = 'https://js.paystack.co/v1/inline.js'
                    document.head.appendChild(script)
                  }
                }
              })
              .catch(err => console.error('Failed to load Paystack config:', err))
          }
        }
      })
      .catch(err => console.error('Failed to load payment settings:', err))
  }, [])

  // Calculate crypto amount based on USD total (after discount)
  const finalTotal = total - discountAmount
  const getCryptoAmount = (network: CryptoNetwork): string => {
    const rate = CRYPTO_RATES[network] || 0.00042
    return (finalTotal * rate).toFixed(6)
  }

  // Connect wallet
  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setWalletError('Please install MetaMask or another Web3 wallet')
      return
    }

    setPaymentStatus('connecting')
    setWalletError('')

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[]

      if (!accounts || accounts.length === 0) {
        throw new Error('No wallet account found')
      }

      const provider = new BrowserProvider(window.ethereum)
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
      setWalletError(err instanceof Error ? err.message : 'Failed to connect wallet')
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

      // Create the order via Railway API
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
      const orderResponse = await fetch(`${apiUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': getSessionId(),
          ...(localStorage.getItem('accessToken') && {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          }),
        },
        body: JSON.stringify({
          email: shippingData.email || '',
          phone: shippingData.phone,
          // Shipping address fields
          shippingName: shippingData.fullName,
          shippingStreet: shippingData.address,
          shippingCity: shippingData.city,
          shippingState: shippingData.state,
          shippingZip: shippingData.zipCode,
          shippingPhone: shippingData.phone,
          customerNote: shippingData.notes,
          paymentMethod: `crypto_${selectedNetwork.toLowerCase()}`,
          discountCode: discountCode || undefined,
          discountAmount: discountAmount > 0 ? discountAmount : undefined,
          // Explicitly send cart items for validation
          items: items.map(item => ({
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

      // Create transaction
      const tx = await signer.sendTransaction({
        to: RECEIVING_WALLET,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Only used for crypto-processor "Continue to Review" button
    if (paymentMethod !== 'crypto-processor') return

    setIsSubmitting(true)
    try {
      sessionStorage.setItem('checkoutPayment', JSON.stringify({
        method: paymentMethod,
        crypto: selectedNetwork,
        usdAmount: finalTotal,
      }))
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

        <div className="grid grid-cols-12 gap-16">
          {/* Left Column - Payment Form */}
          <div className="col-span-12 lg:col-span-7">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
                Payment Method
              </h1>
              <p className="text-slate-500 mb-10">
                Choose your preferred payment method to complete your order.
              </p>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Payment Method Selection */}
                <div className="grid grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('wallet')}
                    className={`relative flex flex-col items-center p-5 bg-charcoal border rounded-xl cursor-pointer transition-colors ${
                      paymentMethod === 'wallet' ? 'border-primary ring-2 ring-primary/20' : 'border-border-dark hover:border-slate-700'
                    }`}
                  >
                    <Icon name="wallet" size={28} className="text-primary mb-2" />
                    <div className="text-white font-bold text-sm">Pay with Wallet</div>
                    <div className="text-slate-500 text-[10px] mt-1">ETH, BNB, MATIC</div>
                    {paymentMethod === 'wallet' && (
                      <div className="absolute top-2 right-2">
                        <Icon name="check-circle" size={18} className="text-primary" />
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('crypto-processor')}
                    className={`relative flex flex-col items-center p-5 bg-charcoal border rounded-xl cursor-pointer transition-colors ${
                      paymentMethod === 'crypto-processor' ? 'border-primary ring-2 ring-primary/20' : 'border-border-dark hover:border-slate-700'
                    }`}
                  >
                    <Icon name="bitcoin" size={28} className="text-primary mb-2" />
                    <div className="text-white font-bold text-sm">Crypto Invoice</div>
                    <div className="text-slate-500 text-[10px] mt-1">BTC, ETH, USDT</div>
                    {paymentMethod === 'crypto-processor' && (
                      <div className="absolute top-2 right-2">
                        <Icon name="check-circle" size={18} className="text-primary" />
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`relative flex flex-col items-center p-5 bg-charcoal border rounded-xl cursor-pointer transition-colors ${
                      paymentMethod === 'card' ? 'border-primary ring-2 ring-primary/20' : 'border-border-dark hover:border-slate-700'
                    }`}
                  >
                    <Icon name="credit-card" size={28} className="text-primary mb-2" />
                    <div className="text-white font-bold text-sm">Credit Card</div>
                    <div className="text-slate-500 text-[10px] mt-1">Visa, Mastercard</div>
                    {paymentMethod === 'card' && (
                      <div className="absolute top-2 right-2">
                        <Icon name="check-circle" size={18} className="text-primary" />
                      </div>
                    )}
                  </button>
                </div>

                {/* Wallet Payment */}
                {paymentMethod === 'wallet' && (
                  <div className="bg-charcoal border border-border-dark rounded-xl p-6 space-y-6">
                    {/* Network Selection */}
                    <div>
                      <h3 className="text-white font-bold mb-3">Select Network</h3>
                      <div className="grid grid-cols-3 gap-3">
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
                        <Icon name="wallet" size={48} className="text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400 text-sm mb-4">Connect your wallet to pay with crypto</p>
                        <button
                          type="button"
                          onClick={connectWallet}
                          disabled={paymentStatus === 'connecting'}
                          className="bg-primary text-black font-bold px-8 py-3 rounded-xl hover:brightness-105 transition-all disabled:opacity-50"
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

                {/* Crypto Processor Payment (Invoice-based) */}
                {paymentMethod === 'crypto-processor' && (
                  <div className="bg-charcoal border border-border-dark rounded-xl p-6 space-y-6">
                    <div className="text-center">
                      <h3 className="text-white font-bold mb-2">Pay with Crypto Invoice</h3>
                      <p className="text-slate-500 text-sm">Send crypto to a unique payment address</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { name: 'Bitcoin', symbol: 'BTC', icon: 'bitcoin' },
                        { name: 'Ethereum', symbol: 'ETH', icon: 'diamond' },
                        { name: 'USDT', symbol: 'USDT', icon: 'wallet' },
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
                          <div className="text-white text-xs font-bold">{crypto.symbol}</div>
                        </button>
                      ))}
                    </div>

                    <div className="bg-surface-dark rounded-xl p-4 text-center">
                      <p className="text-slate-400 text-sm mb-1">Amount to pay:</p>
                      <p className="text-2xl font-bold text-white">{formatPrice(finalTotal)}</p>
                    </div>

                    {/* Not configured fallback */}
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
                      <Icon name="info" size={24} className="text-yellow-400 mx-auto mb-2" />
                      <p className="text-yellow-400 font-medium text-sm">Crypto invoice payments are not available at this time.</p>
                      <p className="text-slate-500 text-xs mt-2">
                        The store administrator has not configured a crypto payment processor yet.
                        Please use the Wallet or Card payment option instead.
                      </p>
                    </div>

                    <div className="flex gap-4">
                      <Link
                        href="/checkout"
                        className="flex-1 bg-surface-dark border border-border-dark text-white font-bold py-4 rounded-xl hover:border-primary/50 transition-all flex items-center justify-center gap-2"
                      >
                        <Icon name="arrow-left" size={18} />
                        Back
                      </Link>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('wallet')}
                        className="flex-1 bg-primary text-black font-bold py-4 rounded-xl hover:brightness-105 transition-all flex items-center justify-center gap-2"
                      >
                        <Icon name="wallet" size={18} />
                        Use Wallet Instead
                      </button>
                    </div>
                  </div>
                )}

                {/* Card Payment */}
                {paymentMethod === 'card' && (() => {
                  const handleCardSuccess = (orderId: string, orderNumber: string) => {
                    sessionStorage.setItem('checkoutPayment', JSON.stringify({
                      method: 'card',
                      usdAmount: finalTotal,
                      orderId,
                      orderNumber,
                    }))
                    apiFetch('/notifications/create', {
                      method: 'POST',
                      body: JSON.stringify({
                        type: 'PAYMENT_RECEIVED',
                        title: 'Payment Confirmed',
                        message: `Payment for order #${orderNumber} confirmed via card.`,
                        data: { orderId, orderNumber },
                      }),
                    }).catch(() => {})
                    clearCart()
                    router.push(`/checkout/success?orderNumber=${orderNumber}`)
                  }
                  const handleBack = () => router.push('/checkout')

                  if (stripePromise) {
                    return (
                      <Elements stripe={stripePromise}>
                        <StripeCardForm
                          amount={finalTotal}
                          items={items}
                          discountCode={discountCode}
                          discountAmount={discountAmount}
                          formatPrice={formatPrice}
                          onSuccess={handleCardSuccess}
                          onBack={handleBack}
                        />
                      </Elements>
                    )
                  }

                  if (paystackPublicKey) {
                    return (
                      <PaystackCardForm
                        amount={finalTotal}
                        items={items}
                        discountCode={discountCode}
                        discountAmount={discountAmount}
                        formatPrice={formatPrice}
                        publicKey={paystackPublicKey}
                        onSuccess={handleCardSuccess}
                        onBack={handleBack}
                      />
                    )
                  }

                  return (
                    <div className="bg-charcoal border border-border-dark rounded-xl p-6 text-center">
                      <Icon name="credit-card" size={48} className="text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400 text-sm">Card payments are not available at this time.</p>
                      <p className="text-slate-500 text-xs mt-2">Please contact the store administrator.</p>
                      <Link
                        href="/checkout"
                        className="mt-4 inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm"
                      >
                        <Icon name="arrow-left" size={16} />
                        Back to Shipping
                      </Link>
                    </div>
                  )
                })()}

                {/* Security Notice */}
                <div className="flex items-center gap-3 p-4 bg-surface-dark rounded-xl border border-border-dark">
                  <Icon name="shield" size={24} className="text-primary flex-shrink-0" />
                  <p className="text-slate-400 text-sm">
                    Your payment information is encrypted and secure. We never store your card details.
                  </p>
                </div>

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
          <div className="col-span-12 lg:col-span-5">
            <div className="bg-charcoal border border-border-dark rounded-2xl p-8 sticky top-24">
              <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>

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
      // Get shipping info
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
          email: shippingData.email || '',
          phone: shippingData.phone,
          shippingName: shippingData.fullName,
          shippingStreet: shippingData.address,
          shippingCity: shippingData.city,
          shippingState: shippingData.state,
          shippingZip: shippingData.zipCode,
          shippingPhone: shippingData.phone,
          customerNote: shippingData.notes,
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
      // Get shipping info
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
          email: shippingData.email || '',
          phone: shippingData.phone,
          shippingName: shippingData.fullName,
          shippingStreet: shippingData.address,
          shippingCity: shippingData.city,
          shippingState: shippingData.state,
          shippingZip: shippingData.zipCode,
          shippingPhone: shippingData.phone,
          customerNote: shippingData.notes,
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
        amount: Math.round(amount * 100), // Amount in smallest currency unit
        currency: 'USD',
        ref: `ORDER_${orderNumber}_${Date.now()}`,
        callback: async (response: any) => {
          try {
            // 3. Verify payment
            const verifyResponse = await fetch(`${apiUrl}/payments/paystack/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reference: response.reference }),
            })

            if (verifyResponse.ok) {
              onSuccess(orderId, orderNumber)
            } else {
              setError('Payment verification failed. Please contact support.')
              setProcessing(false)
            }
          } catch {
            setError('Payment verification failed. Please contact support.')
            setProcessing(false)
          }
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
          <p className="text-slate-500 text-sm">You&apos;ll be redirected to a secure payment page</p>
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
