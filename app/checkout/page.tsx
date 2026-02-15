'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import CategoryNav from '@/components/layout/CategoryNav'
import Footer from '@/components/layout/Footer'
import OrderSummary from '@/components/checkout/OrderSummary'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import Icon from '@/components/ui/Icon'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/lib/cart-context'
import { discountsApi } from '@/lib/api/discounts'

interface ShippingForm {
  fullName: string
  email: string
  address: string
  city: string
  state: string
  zipCode: string
  phone: string
  deliveryMethod: 'standard' | 'express'
}

interface FormErrors {
  fullName?: string
  email?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  phone?: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { items, total } = useCart()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [discountCode, setDiscountCode] = useState('')
  const [discountAmount, setDiscountAmount] = useState(0)
  const [discountInput, setDiscountInput] = useState('')
  const [discountError, setDiscountError] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [formData, setFormData] = useState<ShippingForm>({
    fullName: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    deliveryMethod: 'standard',
  })

  // Redirect to cart if cart is empty
  useEffect(() => {
    if (!authLoading && items.length === 0) {
      router.push('/cart')
    }
  }, [items, authLoading, router])

  // Load discount from sessionStorage (set in cart page)
  useEffect(() => {
    const code = sessionStorage.getItem('discount_code')
    const amount = sessionStorage.getItem('discount_amount')
    if (code && amount) {
      setDiscountCode(code)
      setDiscountAmount(parseFloat(amount))
      setDiscountInput(code)
    }
  }, [])

  const handleApplyDiscount = async () => {
    if (!discountInput.trim()) return
    setIsValidating(true)
    setDiscountError('')

    try {
      const res = await discountsApi.validate(discountInput.trim(), total)

      if (res.success && res.data) {
        setDiscountCode(res.data.code)
        setDiscountAmount(res.data.discountAmount)
        sessionStorage.setItem('discount_code', res.data.code)
        sessionStorage.setItem('discount_amount', String(res.data.discountAmount))
      } else {
        setDiscountError(res.error || 'Invalid discount code')
        setDiscountCode('')
        setDiscountAmount(0)
        sessionStorage.removeItem('discount_code')
        sessionStorage.removeItem('discount_amount')
      }
    } catch {
      setDiscountError('Failed to validate discount code')
    }

    setIsValidating(false)
  }

  const handleRemoveDiscount = () => {
    setDiscountCode('')
    setDiscountAmount(0)
    setDiscountInput('')
    setDiscountError('')
    sessionStorage.removeItem('discount_code')
    sessionStorage.removeItem('discount_amount')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleDeliveryChange = (method: 'standard' | 'express') => {
    setFormData((prev) => ({ ...prev, deliveryMethod: method }))
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!/^[\d\s\-+()]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number'
    }

    // Auto-fill hidden fields for digital delivery
    if (!formData.address) formData.address = 'Digital Delivery'
    if (!formData.city) formData.city = 'N/A'
    if (!formData.state) formData.state = 'N/A'
    if (!formData.zipCode) formData.zipCode = '00000'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Store shipping data for the payment step
      sessionStorage.setItem('checkoutShipping', JSON.stringify(formData))

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Redirect to payment step
      router.push('/checkout/payment')
    } catch (error) {
      console.error('Checkout error:', error)
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

  // Show empty cart message
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

      {/* Main Content */}
      <main className="flex-grow max-w-container mx-auto px-8 lg:px-12 pb-24 w-full">
        <div className="py-4">
          <Breadcrumbs className="mb-0" />
        </div>

        {/* Checkout Steps */}
        <div className="mb-8">
          <nav aria-label="Checkout progress" className="flex items-center justify-center">
            <ol className="flex items-center gap-4">
              {/* Step 1 - Active */}
              <li className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center font-bold text-sm" aria-current="step">
                  1
                </span>
                <span className="text-primary font-bold text-sm tracking-wide">Shipping</span>
              </li>

              <li aria-hidden="true" className="w-12 h-px bg-border-dark" />

              {/* Step 2 */}
              <li className="flex items-center gap-3 opacity-40">
                <span className="w-8 h-8 rounded-full bg-surface-dark text-slate-400 border border-border-dark flex items-center justify-center font-bold text-sm">
                  2
                </span>
                <span className="text-slate-400 font-bold text-sm tracking-wide">Payment</span>
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
          {/* Left Column - Form */}
          <div className="col-span-1 lg:col-span-7">
            <div className="max-w-2xl">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2 tracking-tight">
                Contact Information
              </h1>
              <p className="text-sm md:text-base text-slate-500 mb-6 md:mb-10">
                Please enter your contact information. Digital products will be delivered to your email instantly.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
                {/* Name & Email */}
                <div className="space-y-4 md:space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <label htmlFor="fullName" className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Full Name
                      </label>
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        placeholder="John Doe"
                        autoComplete="name"
                        className={`w-full bg-charcoal border rounded-xl py-4 px-5 text-slate-200 placeholder:text-slate-600 focus:ring-primary focus:border-primary transition-all ${
                          errors.fullName ? 'border-red-500' : 'border-border-dark'
                        }`}
                      />
                      {errors.fullName && (
                        <p className="text-red-400 text-xs mt-1">{errors.fullName}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="email" className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Email Address
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="john@example.com"
                        autoComplete="email"
                        className={`w-full bg-charcoal border rounded-xl py-4 px-5 text-slate-200 placeholder:text-slate-600 focus:ring-primary focus:border-primary transition-all ${
                          errors.email ? 'border-red-500' : 'border-border-dark'
                        }`}
                      />
                      {errors.email && (
                        <p className="text-red-400 text-xs mt-1">{errors.email}</p>
                      )}
                    </div>
                  </div>

                  {/* Hidden for digital products - kept for validation compatibility */}
                  <input type="hidden" name="address" value="Digital Delivery" />
                  <input type="hidden" name="city" value="N/A" />
                  <input type="hidden" name="state" value="N/A" />
                  <input type="hidden" name="zipCode" value="00000" />

                  {/* Phone */}
                  <div className="space-y-2">
                    <label htmlFor="phone" className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Phone Number
                    </label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true">
                        <Icon name="call" size={20} />
                      </span>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+1 (555) 000-0000"
                        autoComplete="tel"
                        className={`w-full bg-charcoal border rounded-xl py-4 pl-14 pr-5 text-slate-200 placeholder:text-slate-600 focus:ring-primary focus:border-primary transition-all ${
                          errors.phone ? 'border-red-500' : 'border-border-dark'
                        }`}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-red-400 text-xs mt-1">{errors.phone}</p>
                    )}
                  </div>
                </div>

                {/* Digital Delivery Info */}
                <div className="pt-4 md:pt-6 border-t border-border-dark">
                  <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
                    <Icon name="flash" size={20} className="text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white font-bold text-sm mb-1">Instant Digital Delivery</p>
                      <p className="text-slate-300 text-xs">
                        Your purchase will be delivered to your email immediately after payment confirmation. No shipping required!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Discount Code */}
                <div className="pt-4 md:pt-6 border-t border-border-dark">
                  <label htmlFor="discount" className="block text-white font-bold text-sm md:text-base mb-3 md:mb-4">
                    Discount Code
                  </label>
                  {discountCode ? (
                    <div className="w-full flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-xl py-3 px-5">
                      <div className="flex-grow flex items-center gap-3">
                        <Icon name="check-circle" size={20} className="text-primary" />
                        <span className="text-primary font-mono font-bold">{discountCode}</span>
                        <span className="text-slate-400 text-sm">-${discountAmount.toFixed(2)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveDiscount}
                        className="text-slate-400 hover:text-red-400 text-sm font-bold transition-colors whitespace-nowrap px-4 py-2"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="w-full">
                      <div className="w-full flex gap-3">
                        <div className="flex-grow relative">
                          <Icon name="ticket" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input
                            id="discount"
                            type="text"
                            value={discountInput}
                            onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApplyDiscount())}
                            placeholder="Enter discount code"
                            className="w-full bg-charcoal border border-border-dark rounded-xl py-4 pl-12 pr-5 text-slate-200 placeholder:text-slate-600 focus:ring-primary focus:border-primary transition-all font-mono"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleApplyDiscount}
                          disabled={isValidating || !discountInput.trim()}
                          className="bg-primary text-black font-bold px-6 py-4 rounded-xl hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {isValidating ? 'Checking...' : 'Apply'}
                        </button>
                      </div>
                      {discountError && (
                        <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                          <Icon name="alert-circle" size={14} />
                          {discountError}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Hidden submit button for mobile - form is submitted via OrderSummary button */}
                <button type="submit" className="sr-only">Continue to Payment</button>
              </form>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="col-span-1 lg:col-span-5 relative lg:order-last">
            <OrderSummary onSubmit={handleSubmit} isSubmitting={isSubmitting} discountCode={discountCode} discountAmount={discountAmount} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
