'use client'

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import CategoryNav from '@/components/layout/CategoryNav'
import Footer from '@/components/layout/Footer'
import Icon from '@/components/ui/Icon'
import { apiFetch } from '@/lib/api/client'
import { trackPurchase } from '@/lib/tracking'
import * as otpNumbersApi from '@/lib/api/otp-numbers'

interface PaymentInfo {
  method: string
  crypto?: string
  txHash?: string
  amount?: string
  usdAmount?: number
  walletAddress?: string
  orderId?: string
  orderNumber?: string
}

interface OrderData {
  id: string
  orderNumber: string
  total: number
  status: string
  paymentStatus: string
  email: string
  items: Array<{
    id: string
    productId: string
    product: {
      id: string
      name: string
      slug: string
    }
    quantity: number
    price: number
  }>
  createdAt: string
}

interface OtpData {
  id: string
  phoneNumber: string
  service: string
  country: string
  status: 'pending' | 'received' | 'cancelled' | 'expired'
  code?: string
  fullSms?: string
  expiresAt?: string
}

function SuccessPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewStates, setReviewStates] = useState<Record<string, {
    rating: number
    hover: number
    content: string
    submitting: boolean
    submitted: boolean
    error: string | null
  }>>({})

  // OTP State
  const [otpData, setOtpData] = useState<OtpData | null>(null)
  const [otpStatus, setOtpStatus] = useState<'pending' | 'received' | 'cancelled' | 'expired'>('pending')
  const [otpCode, setOtpCode] = useState<string | null>(null)
  const [otpFullSms, setOtpFullSms] = useState<string | null>(null)
  const [otpPolling, setOtpPolling] = useState(false)
  const [otpCancelling, setOtpCancelling] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [codeCopied, setCodeCopied] = useState(false)

  function updateReviewState(productId: string, updates: Partial<typeof reviewStates[string]>) {
    setReviewStates(prev => {
      const current = prev[productId] || { rating: 0, hover: 0, content: '', submitting: false, submitted: false, error: null }
      return { ...prev, [productId]: { ...current, ...updates } }
    })
  }

  async function handleGuestReview(productId: string) {
    if (!orderData) return
    const state = reviewStates[productId]
    if (!state?.rating) return

    updateReviewState(productId, { submitting: true, error: null })

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          orderId: orderData.id,
          email: orderData.email,
          rating: state.rating,
          content: state.content || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        updateReviewState(productId, { submitted: true, submitting: false })
      } else {
        updateReviewState(productId, { error: data.error || 'Failed to submit review', submitting: false })
      }
    } catch {
      updateReviewState(productId, { error: 'Failed to submit review', submitting: false })
    }
  }

  const txHashParam = searchParams.get('txHash')
  const orderNumberParam = searchParams.get('orderNumber')
  const otpIdParam = searchParams.get('otpId')
  const typeParam = searchParams.get('type')

  const isOtpFlow = typeParam === 'otp' && otpIdParam

  // Poll for OTP SMS
  const pollOtpStatus = useCallback(async () => {
    if (!otpIdParam || otpStatus !== 'pending') return

    try {
      const result = await otpNumbersApi.checkSms(otpIdParam)
      if (result.success && result.data) {
        setOtpStatus(result.data.status)
        if (result.data.status === 'received' && result.data.code) {
          setOtpCode(result.data.code)
          setOtpFullSms(result.data.fullSms || null)
          setOtpPolling(false)
        } else if (result.data.status === 'expired' || result.data.status === 'cancelled') {
          setOtpPolling(false)
        }
      }
    } catch (err) {
      console.error('Error polling OTP status:', err)
    }
  }, [otpIdParam, otpStatus])

  // Handle OTP cancellation
  const handleCancelOtp = async () => {
    if (!otpIdParam) return

    setOtpCancelling(true)
    setOtpError(null)

    try {
      const result = await otpNumbersApi.cancelNumber(otpIdParam)
      if (result.success) {
        setOtpStatus('cancelled')
        setOtpPolling(false)
      } else {
        setOtpError(result.error || 'Failed to cancel')
      }
    } catch (err: any) {
      setOtpError(err.message || 'Failed to cancel')
    } finally {
      setOtpCancelling(false)
    }
  }

  // Copy code to clipboard
  const handleCopyCode = () => {
    if (otpCode) {
      navigator.clipboard.writeText(otpCode)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    }
  }

  // Invalidate stale caches on payment success so library and orders show fresh data
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['user-library'] })
    router.refresh()
  }, [])

  // Start OTP polling if this is an OTP flow
  useEffect(() => {
    if (isOtpFlow && otpStatus === 'pending') {
      setOtpPolling(true)

      // Poll every 3 seconds
      const interval = setInterval(pollOtpStatus, 3000)

      // Initial poll
      pollOtpStatus()

      // Stop after 10 minutes (max wait time)
      const timeout = setTimeout(() => {
        setOtpPolling(false)
        if (otpStatus === 'pending') {
          setOtpStatus('expired')
        }
      }, 10 * 60 * 1000)

      return () => {
        clearInterval(interval)
        clearTimeout(timeout)
      }
    }
  }, [isOtpFlow, otpStatus, pollOtpStatus])

  // Fetch order data from backend
  useEffect(() => {
    async function fetchOrder() {
      // If this is OTP flow, skip order fetching
      if (isOtpFlow) {
        setIsLoading(false)
        return
      }

      if (!orderNumberParam) {
        // No order number in URL, fall back to session storage
        const storedPayment = sessionStorage.getItem('checkoutPayment')
        if (storedPayment) {
          setPaymentInfo(JSON.parse(storedPayment))
        }
        setIsLoading(false)
        return
      }

      try {
        const result = await apiFetch<OrderData>(`/orders/lookup/${orderNumberParam}`)
        if (result.success && result.data) {
          setOrderData(result.data)
          setError(null)
          // Fire Purchase conversion event
          trackPurchase(
            result.data.orderNumber,
            result.data.total,
            result.data.items.map(i => ({ id: i.productId, name: i.product.name, price: i.price, quantity: i.quantity }))
          )
        } else {
          setError('Order not found')
          // Fall back to session storage
          const storedPayment = sessionStorage.getItem('checkoutPayment')
          if (storedPayment) {
            setPaymentInfo(JSON.parse(storedPayment))
          }
        }
      } catch (err) {
        console.error('Failed to fetch order:', err)
        setError('Failed to load order details')
        // Fall back to session storage
        const storedPayment = sessionStorage.getItem('checkoutPayment')
        if (storedPayment) {
          setPaymentInfo(JSON.parse(storedPayment))
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrder()
  }, [orderNumberParam, isOtpFlow])

  const orderNumber = orderNumberParam || orderData?.orderNumber || paymentInfo?.orderNumber || `ZEN-${Date.now().toString(36).toUpperCase()}`
  const txHash = txHashParam || paymentInfo?.txHash

  const getExplorerUrl = (network: string, hash: string) => {
    switch (network?.toUpperCase()) {
      case 'ETH':
        return `https://etherscan.io/tx/${hash}`
      case 'BNB':
        return `https://bscscan.com/tx/${hash}`
      case 'MATIC':
        return `https://polygonscan.com/tx/${hash}`
      default:
        return `https://etherscan.io/tx/${hash}`
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-dark flex flex-col">
        <Header />
        <CategoryNav />
        <main className="flex-grow max-w-container mx-auto px-8 lg:px-12 pb-24 w-full">
          <div className="max-w-2xl mx-auto py-16 text-center">
            <Icon name="loading" size={48} className="text-primary animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // ===== OTP FLOW =====
  if (isOtpFlow) {
    return (
      <div className="min-h-screen bg-background-dark flex flex-col">
        <Header />
        <CategoryNav />

        <main className="flex-grow max-w-container mx-auto px-8 lg:px-12 pb-24 w-full">
          <div className="max-w-xl mx-auto py-16">
            {/* Header */}
            <div className="text-center mb-8">
              {otpStatus === 'received' ? (
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                  <Icon name="check" size={40} className="text-green-400" />
                </div>
              ) : otpStatus === 'cancelled' ? (
                <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-6">
                  <Icon name="close" size={40} className="text-yellow-400" />
                </div>
              ) : otpStatus === 'expired' ? (
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                  <Icon name="alert" size={40} className="text-red-400" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                  <Icon name="message" size={40} className="text-primary animate-pulse" />
                </div>
              )}

              <h1 className="text-3xl font-extrabold text-white mb-2">
                {otpStatus === 'received'
                  ? 'Code Received!'
                  : otpStatus === 'cancelled'
                  ? 'Number Cancelled'
                  : otpStatus === 'expired'
                  ? 'Number Expired'
                  : 'Waiting for SMS...'}
              </h1>
              <p className="text-slate-400">
                {otpStatus === 'received'
                  ? 'Your verification code has arrived'
                  : otpStatus === 'cancelled'
                  ? 'Your purchase has been refunded'
                  : otpStatus === 'expired'
                  ? 'The number has expired without receiving a code'
                  : 'Use this number for verification, the code will appear here'}
              </p>
            </div>

            {/* Code Display */}
            {otpStatus === 'received' && otpCode && (
              <div className="bg-green-500/10 border-2 border-green-500/30 rounded-2xl p-8 mb-6 text-center">
                <p className="text-green-400 text-sm font-medium mb-3">VERIFICATION CODE</p>
                <div className="flex items-center justify-center gap-4">
                  <span className="text-5xl font-mono font-extrabold text-white tracking-widest">
                    {otpCode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-3 rounded-xl bg-green-500/20 hover:bg-green-500/30 transition-colors"
                    title="Copy code"
                  >
                    <Icon name={codeCopied ? 'check' : 'copy'} size={24} className="text-green-400" />
                  </button>
                </div>
                {codeCopied && (
                  <p className="text-green-400 text-sm mt-3">Copied to clipboard!</p>
                )}
              </div>
            )}

            {/* Full SMS */}
            {otpStatus === 'received' && otpFullSms && (
              <div className="bg-charcoal border border-border-dark rounded-xl p-4 mb-6">
                <p className="text-slate-500 text-xs mb-2">Full Message:</p>
                <p className="text-white text-sm">{otpFullSms}</p>
              </div>
            )}

            {/* Waiting State */}
            {otpStatus === 'pending' && (
              <>
                <div className="bg-charcoal border border-border-dark rounded-2xl p-6 mb-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon name="phone" size={24} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm">Your temporary number</p>
                      <p className="text-white font-mono text-lg font-bold">
                        Loading...
                      </p>
                    </div>
                  </div>

                  {/* Progress indicator */}
                  <div className="relative h-2 bg-surface-dark rounded-full overflow-hidden">
                    <div className="absolute inset-0 bg-primary/30 animate-pulse"></div>
                    <div className="absolute left-0 top-0 h-full w-1/3 bg-primary rounded-full animate-[slide_2s_ease-in-out_infinite]"></div>
                  </div>
                  <p className="text-slate-500 text-xs mt-3 text-center">
                    Checking for SMS every 3 seconds...
                  </p>
                </div>

                {/* Instructions */}
                <div className="bg-surface-dark border border-border-dark rounded-xl p-4 mb-6">
                  <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                    <Icon name="info" size={16} className="text-primary" />
                    How to use
                  </h3>
                  <ol className="text-slate-400 text-sm space-y-2">
                    <li>1. Copy the phone number above</li>
                    <li>2. Paste it into the service requesting verification</li>
                    <li>3. Wait for the code to appear here</li>
                    <li>4. Enter the code on the service</li>
                  </ol>
                </div>

                {/* Cancel Button */}
                <div className="text-center">
                  {otpError && (
                    <p className="text-red-400 text-sm mb-3">{otpError}</p>
                  )}
                  <button
                    onClick={handleCancelOtp}
                    disabled={otpCancelling}
                    className="text-slate-400 hover:text-white text-sm font-medium transition-colors inline-flex items-center gap-2"
                  >
                    {otpCancelling ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400"></div>
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <Icon name="close" size={16} />
                        Cancel &amp; Get Refund
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Cancelled/Expired State */}
            {(otpStatus === 'cancelled' || otpStatus === 'expired') && (
              <div className="text-center">
                <div className={`${otpStatus === 'cancelled' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30'} border rounded-xl p-6 mb-6`}>
                  <p className={`${otpStatus === 'cancelled' ? 'text-yellow-400' : 'text-red-400'} font-medium`}>
                    {otpStatus === 'cancelled'
                      ? 'Your wallet balance has been refunded'
                      : 'The number expired before receiving a code'}
                  </p>
                </div>

                <Link
                  href="/virtual-numbers"
                  className="inline-flex items-center gap-2 bg-primary text-black font-bold px-6 py-3 rounded-xl hover:brightness-105 transition-all"
                >
                  <Icon name="refresh" size={18} />
                  Try Again
                </Link>
              </div>
            )}

            {/* Success Actions */}
            {otpStatus === 'received' && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/virtual-numbers"
                  className="bg-primary text-black font-bold px-6 py-3 rounded-xl hover:brightness-105 transition-all inline-flex items-center justify-center gap-2"
                >
                  <Icon name="add" size={18} />
                  Get Another Number
                </Link>
                <Link
                  href="/profile/library"
                  className="bg-surface-dark border border-border-dark text-white font-bold px-6 py-3 rounded-xl hover:border-primary/50 transition-all inline-flex items-center justify-center gap-2"
                >
                  <Icon name="clock" size={18} />
                  View History
                </Link>
              </div>
            )}
          </div>
        </main>

        <Footer />

        {/* Slide animation keyframes */}
        <style jsx>{`
          @keyframes slide {
            0%, 100% { transform: translateX(-100%); }
            50% { transform: translateX(300%); }
          }
        `}</style>
      </div>
    )
  }

  // ===== REGULAR ORDER FLOW =====
  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      <Header />
      <CategoryNav />

      <main className="flex-grow max-w-container mx-auto px-8 lg:px-12 pb-24 w-full">
        <div className="max-w-2xl mx-auto py-16 text-center">
          {/* Success Icon */}
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-8">
            <Icon name="check" size={48} className="text-primary" />
          </div>

          {/* Success Message */}
          <h1 className="text-4xl font-extrabold text-white mb-4">
            Order Confirmed!
          </h1>
          <p className="text-slate-400 text-lg mb-8">
            Thank you for your purchase. Your order has been successfully processed.
          </p>

          {/* Order Number */}
          <div className="bg-charcoal border border-border-dark rounded-xl p-6 mb-8">
            <p className="text-slate-500 text-sm mb-2">Order Number</p>
            <p className="text-2xl font-bold text-white font-mono">{orderNumber}</p>
          </div>

          {/* Order Details from API */}
          {orderData && (
            <div className="bg-charcoal border border-border-dark rounded-xl p-6 mb-8 text-left">
              <h2 className="text-white font-bold mb-4">Order Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Status:</span>
                  <span className="text-primary font-medium capitalize">{orderData.status}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Payment Status:</span>
                  <span className="text-green-400 font-medium capitalize">{orderData.paymentStatus}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total:</span>
                  <span className="text-white font-bold">${Number(orderData.total).toFixed(2)}</span>
                </div>
                {orderData.items && orderData.items.length > 0 && (
                  <div className="pt-3 border-t border-border-dark">
                    <p className="text-slate-500 text-xs mb-2">Items ({orderData.items.length}):</p>
                    <ul className="space-y-2">
                      {orderData.items.map((item) => (
                        <li key={item.id} className="flex justify-between items-center text-sm">
                          <span className="text-white">
                            {item.product.name} <span className="text-slate-500">x{item.quantity}</span>
                          </span>
                          <span className="text-slate-400">${(Number(item.price) * item.quantity).toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Crypto Transaction Info */}
          {txHash && paymentInfo?.method === 'wallet' && (
            <div className="bg-charcoal border border-primary/30 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Icon name="wallet" size={20} className="text-primary" />
                <p className="text-primary font-bold">Crypto Payment Confirmed</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Network:</span>
                  <span className="text-white font-medium">{paymentInfo.crypto}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Amount:</span>
                  <span className="text-white font-medium">
                    {paymentInfo.amount} {paymentInfo.crypto}
                    <span className="text-slate-500 ml-1">(${paymentInfo.usdAmount?.toFixed(2)})</span>
                  </span>
                </div>
                <div className="flex flex-col gap-1 pt-2 border-t border-border-dark mt-2">
                  <span className="text-slate-500 text-xs">Transaction Hash:</span>
                  <a
                    href={getExplorerUrl(paymentInfo.crypto || 'ETH', txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-xs font-mono hover:underline break-all"
                  >
                    {txHash}
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-surface-dark border border-border-dark rounded-xl p-8 mb-8 text-left">
            <h2 className="text-white font-bold mb-6 flex items-center gap-2">
              <Icon name="info" size={20} className="text-primary" />
              What happens next?
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">1</span>
                </div>
                <div>
                  <p className="text-white font-medium">Confirmation Email</p>
                  <p className="text-slate-500 text-sm">
                    You&apos;ll receive an email with your order details and download links.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">2</span>
                </div>
                <div>
                  <p className="text-white font-medium">Access Your Products</p>
                  <p className="text-slate-500 text-sm">
                    Visit your library to download your purchased products anytime.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">3</span>
                </div>
                <div>
                  <p className="text-white font-medium">Get Support</p>
                  <p className="text-slate-500 text-sm">
                    Need help? Our support team is available 24/7 to assist you.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Review Your Purchase */}
          {orderData && orderData.items && orderData.items.length > 0 && (
            <div className="bg-charcoal border border-border-dark rounded-xl p-6 mb-8 text-left">
              <h2 className="text-white font-bold mb-2 flex items-center gap-2">
                <Icon name="star" size={20} className="text-primary" />
                Review Your Purchase
              </h2>
              <p className="text-slate-500 text-sm mb-6">
                Share your experience! You can leave a review for each product you purchased.
              </p>
              <div className="space-y-6">
                {orderData.items.map((item) => {
                  const state = reviewStates[item.productId] || { rating: 0, hover: 0, content: '', submitting: false, submitted: false, error: null }

                  if (state.submitted) {
                    return (
                      <div key={item.productId} className="border-b border-border-dark pb-4 last:border-0 last:pb-0">
                        <p className="text-white font-medium text-sm">{item.product.name}</p>
                        <p className="text-green-400 text-sm mt-1">Review submitted! Thank you.</p>
                      </div>
                    )
                  }

                  return (
                    <div key={item.productId} className="border-b border-border-dark pb-4 last:border-0 last:pb-0">
                      <p className="text-white font-medium text-sm mb-3">{item.product.name}</p>

                      {/* Star Selector */}
                      <div className="flex gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => updateReviewState(item.productId, { rating: star })}
                            onMouseEnter={() => updateReviewState(item.productId, { hover: star })}
                            onMouseLeave={() => updateReviewState(item.productId, { hover: 0 })}
                            className="p-0.5"
                          >
                            <Icon
                              name="star"
                              size={22}
                              className={(state.hover || state.rating) >= star ? 'text-yellow-500' : 'text-slate-600'}
                            />
                          </button>
                        ))}
                      </div>

                      {/* Content */}
                      <textarea
                        value={state.content}
                        onChange={e => updateReviewState(item.productId, { content: e.target.value })}
                        placeholder="Share your thoughts (optional)..."
                        rows={2}
                        className="w-full bg-surface-dark border border-border-dark rounded-lg text-white text-sm px-3 py-2 mb-3 focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-slate-600"
                      />

                      {/* Error */}
                      {state.error && (
                        <p className="text-red-400 text-sm mb-2">{state.error}</p>
                      )}

                      {/* Submit */}
                      <button
                        onClick={() => handleGuestReview(item.productId)}
                        disabled={!state.rating || state.submitting}
                        className="bg-primary text-black font-bold py-2 px-4 rounded-lg hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {state.submitting ? 'Submitting...' : 'Submit Review'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/profile/library"
              className="bg-primary text-black font-bold px-8 py-4 rounded-xl hover:brightness-105 transition-all inline-flex items-center justify-center gap-2"
            >
              <Icon name="download" size={20} />
              Go to My Library
            </Link>
            <Link
              href="/profile/orders"
              className="bg-surface-dark border border-border-dark text-white font-bold px-8 py-4 rounded-xl hover:border-primary/50 transition-all inline-flex items-center justify-center gap-2"
            >
              <Icon name="file" size={20} />
              View Order Details
            </Link>
          </div>

          {/* Continue Shopping */}
          <Link
            href="/scripts"
            className="inline-flex items-center gap-2 text-primary font-bold mt-8 hover:underline"
          >
            Continue Shopping
            <Icon name="arrow-right" size={18} />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background-dark" />}>
      <SuccessPageContent />
    </Suspense>
  )
}
