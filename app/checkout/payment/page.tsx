'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import CategoryNav from '@/components/layout/CategoryNav'
import Footer from '@/components/layout/Footer'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import Icon from '@/components/ui/Icon'
import { useCart } from '@/lib/cart-context'

type PaymentMethod = 'crypto' | 'card'

export default function PaymentPage() {
  const router = useRouter()
  const { items, total } = useCart()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('crypto')
  const [cardData, setCardData] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
    cardName: '',
  })
  const [selectedCrypto, setSelectedCrypto] = useState<string>('BTC')

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCardData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500))
      router.push('/checkout/review')
    } catch (error) {
      console.error('Payment error:', error)
    } finally {
      setIsSubmitting(false)
    }
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
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('crypto')}
                    className={`relative flex flex-col items-center p-6 bg-charcoal border rounded-xl cursor-pointer transition-colors ${
                      paymentMethod === 'crypto' ? 'border-primary ring-2 ring-primary/20' : 'border-border-dark hover:border-slate-700'
                    }`}
                  >
                    <Icon name="bitcoin" size={32} className="text-primary mb-3" />
                    <div className="text-white font-bold text-sm">Cryptocurrency</div>
                    <div className="text-slate-500 text-xs mt-1">BTC, ETH, USDT</div>
                    {paymentMethod === 'crypto' && (
                      <div className="absolute top-3 right-3">
                        <Icon name="check-circle" size={20} className="text-primary" />
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`relative flex flex-col items-center p-6 bg-charcoal border rounded-xl cursor-pointer transition-colors ${
                      paymentMethod === 'card' ? 'border-primary ring-2 ring-primary/20' : 'border-border-dark hover:border-slate-700'
                    }`}
                  >
                    <Icon name="credit-card" size={32} className="text-primary mb-3" />
                    <div className="text-white font-bold text-sm">Credit Card</div>
                    <div className="text-slate-500 text-xs mt-1">Visa, Mastercard</div>
                    {paymentMethod === 'card' && (
                      <div className="absolute top-3 right-3">
                        <Icon name="check-circle" size={20} className="text-primary" />
                      </div>
                    )}
                  </button>
                </div>

                {/* Crypto Payment */}
                {paymentMethod === 'crypto' && (
                  <div className="bg-charcoal border border-border-dark rounded-xl p-6 space-y-6">
                    <div className="text-center">
                      <h3 className="text-white font-bold mb-2">Select Cryptocurrency</h3>
                      <p className="text-slate-500 text-sm">Choose your preferred cryptocurrency</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { name: 'Bitcoin', symbol: 'BTC', icon: 'bitcoin' },
                        { name: 'Ethereum', symbol: 'ETH', icon: 'diamond' },
                        { name: 'USDT', symbol: 'USDT', icon: 'wallet' },
                      ].map((crypto) => (
                        <button
                          key={crypto.symbol}
                          type="button"
                          onClick={() => setSelectedCrypto(crypto.symbol)}
                          className={`p-4 bg-surface-dark border rounded-xl transition-colors text-center ${
                            selectedCrypto === crypto.symbol
                              ? 'border-primary ring-2 ring-primary/20'
                              : 'border-border-dark hover:border-primary/50'
                          }`}
                        >
                          <Icon name={crypto.icon} size={24} className="text-primary mx-auto mb-2" />
                          <div className="text-white text-sm font-bold">{crypto.symbol}</div>
                          <div className="text-slate-500 text-xs">{crypto.name}</div>
                        </button>
                      ))}
                    </div>

                    <div className="bg-surface-dark rounded-xl p-4 text-center">
                      <p className="text-slate-400 text-sm mb-2">Amount to pay:</p>
                      <p className="text-2xl font-bold text-white">${total.toFixed(2)}</p>
                      <p className="text-primary text-sm mt-1">≈ 0.00234 BTC</p>
                    </div>
                  </div>
                )}

                {/* Card Payment */}
                {paymentMethod === 'card' && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label htmlFor="cardNumber" className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Card Number
                      </label>
                      <div className="relative">
                        <Icon name="credit-card" size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          id="cardNumber"
                          name="cardNumber"
                          type="text"
                          value={cardData.cardNumber}
                          onChange={handleCardChange}
                          placeholder="1234 5678 9012 3456"
                          required={paymentMethod === 'card'}
                          className="w-full bg-charcoal border-border-dark rounded-xl py-4 pl-14 pr-5 text-slate-200 placeholder:text-slate-600 focus:ring-primary focus:border-primary transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label htmlFor="expiry" className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Expiry Date
                        </label>
                        <input
                          id="expiry"
                          name="expiry"
                          type="text"
                          value={cardData.expiry}
                          onChange={handleCardChange}
                          placeholder="MM/YY"
                          required={paymentMethod === 'card'}
                          className="w-full bg-charcoal border-border-dark rounded-xl py-4 px-5 text-slate-200 placeholder:text-slate-600 focus:ring-primary focus:border-primary transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="cvv" className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                          CVV
                        </label>
                        <input
                          id="cvv"
                          name="cvv"
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          value={cardData.cvv}
                          onChange={handleCardChange}
                          placeholder="•••"
                          required={paymentMethod === 'card'}
                          autoComplete="cc-csc"
                          className="w-full bg-charcoal border-border-dark rounded-xl py-4 px-5 text-slate-200 placeholder:text-slate-600 focus:ring-primary focus:border-primary transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="cardName" className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Cardholder Name
                      </label>
                      <input
                        id="cardName"
                        name="cardName"
                        type="text"
                        value={cardData.cardName}
                        onChange={handleCardChange}
                        placeholder="John Doe"
                        required={paymentMethod === 'card'}
                        className="w-full bg-charcoal border-border-dark rounded-xl py-4 px-5 text-slate-200 placeholder:text-slate-600 focus:ring-primary focus:border-primary transition-all"
                      />
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

                {/* Navigation Buttons */}
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
                <div className="flex justify-between text-slate-400">
                  <span>Tax</span>
                  <span className="text-white">$0.00</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-3 border-t border-border-dark">
                  <span className="text-white">Total</span>
                  <span className="text-white">${total.toFixed(2)}</span>
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
