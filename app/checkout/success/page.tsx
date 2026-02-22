'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import CategoryNav from '@/components/layout/CategoryNav'
import Footer from '@/components/layout/Footer'
import Icon from '@/components/ui/Icon'
import { apiFetch } from '@/lib/api/client'
import { trackPurchase } from '@/lib/tracking'

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

function SuccessPageContent() {
  const searchParams = useSearchParams()
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

  // Fetch order data from backend
  useEffect(() => {
    async function fetchOrder() {
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
  }, [orderNumberParam])

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
            <p className="text-slate-400">Loading order details...</p>
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
