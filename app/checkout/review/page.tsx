'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import CategoryNav from '@/components/layout/CategoryNav'
import Footer from '@/components/layout/Footer'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import Icon from '@/components/ui/Icon'
import { useCart } from '@/lib/cart-context'

export default function ReviewPage() {
  const router = useRouter()
  const { items, total, clearCart } = useCart()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [discountCode, setDiscountCode] = useState('')
  const [discountAmount, setDiscountAmount] = useState(0)

  useEffect(() => {
    const code = sessionStorage.getItem('discount_code')
    const amount = sessionStorage.getItem('discount_amount')
    if (code && amount) {
      setDiscountCode(code)
      setDiscountAmount(parseFloat(amount))
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreedToTerms) return

    setIsSubmitting(true)

    try {
      // Simulate order processing
      await new Promise(resolve => setTimeout(resolve, 2000))
      clearCart()
      // Clean up discount from sessionStorage
      sessionStorage.removeItem('discount_code')
      sessionStorage.removeItem('discount_amount')
      sessionStorage.removeItem('promo_code')
      router.push('/checkout/success')
    } catch (error) {
      console.error('Order error:', error)
    } finally {
      setIsSubmitting(false)
    }
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
              { label: 'Review' }
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

              {/* Step 2 - Completed */}
              <li className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center font-bold text-sm">
                  <Icon name="check" size={16} />
                </span>
                <span className="text-primary font-bold text-sm tracking-wide">Payment</span>
              </li>

              <li aria-hidden="true" className="w-12 h-px bg-primary" />

              {/* Step 3 - Active */}
              <li className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center font-bold text-sm" aria-current="step">
                  3
                </span>
                <span className="text-primary font-bold text-sm tracking-wide">Review</span>
              </li>
            </ol>
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
          {/* Left Column - Review Details */}
          <div className="col-span-1 lg:col-span-7">
            <div className="max-w-2xl">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2 tracking-tight">
                Review Your Order
              </h1>
              <p className="text-sm md:text-base text-slate-500 mb-6 md:mb-10">
                Please review your order details before completing your purchase.
              </p>

              {/* Order Items */}
              <div className="bg-charcoal border border-border-dark rounded-xl p-4 md:p-6 mb-4 md:mb-6">
                <h2 className="text-white font-bold text-sm md:text-base mb-3 md:mb-4 flex items-center gap-2">
                  <Icon name="package" size={20} className="text-primary" />
                  Order Items ({items.length})
                </h2>
                <div className="space-y-3 md:space-y-4">
                  {items.map((item) => (
                    <div key={`${item.product.id}-${item.license}`} className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-surface-dark rounded-xl">
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-charcoal rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon name={item.product.icon || 'code'} size={20} className="md:size-24 text-slate-500" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="text-white font-bold text-sm md:text-base truncate">{item.product.name}</p>
                        <p className="text-primary text-[10px] md:text-xs uppercase font-bold">
                          {item.license === 'extended' ? 'Extended License' : 'Standard License'}
                        </p>
                        <p className="text-slate-500 text-xs md:text-sm">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-white font-bold text-base md:text-lg">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Details */}
              <div className="bg-charcoal border border-border-dark rounded-xl p-4 md:p-6 mb-4 md:mb-6">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <h2 className="text-white font-bold text-sm md:text-base flex items-center gap-2">
                    <Icon name="location" size={20} className="text-primary" />
                    Shipping Details
                  </h2>
                  <Link href="/checkout" className="text-primary text-sm font-bold hover:underline">
                    Edit
                  </Link>
                </div>
                <div className="text-slate-400 space-y-1">
                  <p className="text-white">Digital Delivery</p>
                  <p>Products will be delivered to your email</p>
                  <p>Instant delivery after payment confirmation</p>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-charcoal border border-border-dark rounded-xl p-4 md:p-6 mb-4 md:mb-6">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <h2 className="text-white font-bold text-sm md:text-base flex items-center gap-2">
                    <Icon name="credit-card" size={20} className="text-primary" />
                    Payment Method
                  </h2>
                  <Link href="/checkout/payment" className="text-primary text-sm font-bold hover:underline">
                    Edit
                  </Link>
                </div>
                <div className="flex items-center gap-3">
                  <Icon name="bitcoin" size={24} className="text-primary" />
                  <div>
                    <p className="text-white">Cryptocurrency</p>
                    <p className="text-slate-500 text-sm">Bitcoin (BTC)</p>
                  </div>
                </div>
              </div>

              {/* Terms Agreement */}
              <form onSubmit={handleSubmit}>
                <label className="flex items-start gap-3 p-3 md:p-4 bg-surface-dark rounded-xl border border-border-dark cursor-pointer mb-4 md:mb-6">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-border-dark bg-transparent text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <span className="text-slate-400 text-sm">
                    I agree to the{' '}
                    <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                    . I understand that digital products are non-refundable once delivered.
                  </span>
                </label>

                {/* Navigation Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                  <Link
                    href="/checkout/payment"
                    className="flex-1 bg-surface-dark border border-border-dark text-white font-bold py-3 md:py-4 text-sm md:text-base rounded-xl hover:border-primary/50 transition-all flex items-center justify-center gap-2"
                  >
                    <Icon name="arrow-left" size={16} className="md:size-18" />
                    Back
                  </Link>
                  <button
                    type="submit"
                    disabled={isSubmitting || !agreedToTerms}
                    className="flex-1 bg-primary text-black font-bold py-3 md:py-4 text-sm md:text-base rounded-xl hover:brightness-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Icon name="loading" size={18} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Place Order
                        <Icon name="check" size={18} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="col-span-1 lg:col-span-5 order-first lg:order-last">
            <div className="bg-charcoal border border-border-dark rounded-2xl p-4 md:p-8 lg:sticky lg:top-24">
              <h2 className="text-lg md:text-xl font-bold text-white mb-4 md:mb-6">Order Total</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal ({items.length} items)</span>
                  <span className="text-white">${total.toFixed(2)}</span>
                </div>
                {discountCode && discountAmount > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Discount <span className="text-xs text-primary">({discountCode})</span></span>
                    <span className="text-primary">-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Shipping</span>
                  <span className="text-primary">Free</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tax</span>
                  <span className="text-white">$0.00</span>
                </div>
              </div>

              <div className="border-t border-border-dark pt-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-white">Total</span>
                  <span className="text-2xl font-extrabold text-white">${(total - discountAmount).toFixed(2)}</span>
                </div>
              </div>

              {/* Security Badges */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-slate-400 text-sm">
                  <Icon name="shield" size={18} className="text-primary" />
                  <span>Secure SSL Encryption</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 text-sm">
                  <Icon name="flash" size={18} className="text-primary" />
                  <span>Instant Digital Delivery</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 text-sm">
                  <Icon name="headphones" size={18} className="text-primary" />
                  <span>24/7 Customer Support</span>
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
