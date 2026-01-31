'use client'

import { useState } from 'react'
import Link from 'next/link'
import OrderSummary from '@/components/checkout/OrderSummary'

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

export default function CheckoutPage() {
  const currentYear = new Date().getFullYear()
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleDeliveryChange = (method: 'standard' | 'express') => {
    setFormData((prev) => ({ ...prev, deliveryMethod: method }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // TODO: Implement actual checkout logic
      console.log('Checkout form data:', formData)

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Redirect to payment step
      window.location.href = '/checkout/payment'
    } catch (error) {
      console.error('Checkout error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-dark">
      {/* Checkout Header */}
      <header className="border-b border-border-dark bg-background-dark/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-container mx-auto px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl">grid_view</span>
            Marketplace
          </Link>

          {/* Checkout Steps */}
          <nav aria-label="Checkout progress" className="flex items-center gap-12">
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

          {/* Exit Button */}
          <Link
            href="/"
            className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
            Exit
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-container mx-auto px-8 py-12">
        <div className="grid grid-cols-12 gap-16">
          {/* Left Column - Form */}
          <div className="col-span-12 lg:col-span-7">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
                Shipping Details
              </h1>
              <p className="text-slate-500 mb-10">
                Please enter your delivery information to proceed with your order.
              </p>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Name & Email */}
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
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
                        required
                        autoComplete="name"
                        className="w-full bg-charcoal border-border-dark rounded-xl py-4 px-5 text-slate-200 placeholder:text-slate-600 focus:ring-primary focus:border-primary transition-all"
                      />
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
                        required
                        autoComplete="email"
                        className="w-full bg-charcoal border-border-dark rounded-xl py-4 px-5 text-slate-200 placeholder:text-slate-600 focus:ring-primary focus:border-primary transition-all"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <label htmlFor="address" className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Shipping Address
                    </label>
                    <input
                      id="address"
                      name="address"
                      type="text"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Street address, apartment, suite"
                      required
                      autoComplete="street-address"
                      className="w-full bg-charcoal border-border-dark rounded-xl py-4 px-5 text-slate-200 placeholder:text-slate-600 focus:ring-primary focus:border-primary transition-all mb-4"
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="city" className="sr-only">City</label>
                        <input
                          id="city"
                          name="city"
                          type="text"
                          value={formData.city}
                          onChange={handleInputChange}
                          placeholder="City"
                          required
                          autoComplete="address-level2"
                          className="w-full bg-charcoal border-border-dark rounded-xl py-4 px-5 text-slate-200 placeholder:text-slate-600 focus:ring-primary focus:border-primary transition-all"
                        />
                      </div>
                      <div>
                        <label htmlFor="state" className="sr-only">State/Province</label>
                        <input
                          id="state"
                          name="state"
                          type="text"
                          value={formData.state}
                          onChange={handleInputChange}
                          placeholder="State/Province"
                          required
                          autoComplete="address-level1"
                          className="w-full bg-charcoal border-border-dark rounded-xl py-4 px-5 text-slate-200 placeholder:text-slate-600 focus:ring-primary focus:border-primary transition-all"
                        />
                      </div>
                      <div>
                        <label htmlFor="zipCode" className="sr-only">Zip Code</label>
                        <input
                          id="zipCode"
                          name="zipCode"
                          type="text"
                          value={formData.zipCode}
                          onChange={handleInputChange}
                          placeholder="Zip Code"
                          required
                          autoComplete="postal-code"
                          className="w-full bg-charcoal border-border-dark rounded-xl py-4 px-5 text-slate-200 placeholder:text-slate-600 focus:ring-primary focus:border-primary transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <label htmlFor="phone" className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Phone Number
                    </label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 material-symbols-outlined" aria-hidden="true">
                        call
                      </span>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+1 (555) 000-0000"
                        required
                        autoComplete="tel"
                        className="w-full bg-charcoal border-border-dark rounded-xl py-4 pl-14 pr-5 text-slate-200 placeholder:text-slate-600 focus:ring-primary focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery Method */}
                <fieldset className="pt-6 border-t border-border-dark">
                  <legend className="text-white font-bold mb-4">Delivery Method</legend>
                  <div className="grid grid-cols-2 gap-4">
                    <label
                      className={`relative flex items-center p-5 bg-charcoal border rounded-xl cursor-pointer transition-colors ${
                        formData.deliveryMethod === 'standard' ? 'border-primary' : 'border-border-dark hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="deliveryMethod"
                        value="standard"
                        checked={formData.deliveryMethod === 'standard'}
                        onChange={() => handleDeliveryChange('standard')}
                        className="text-primary bg-background-dark border-border-dark focus:ring-primary w-5 h-5"
                      />
                      <div className="ml-4">
                        <div className="text-white font-bold text-sm">Standard Shipping</div>
                        <div className="text-slate-500 text-xs mt-0.5">3-5 business days</div>
                      </div>
                      <span className="ml-auto text-white font-bold text-sm">Free</span>
                    </label>

                    <label
                      className={`relative flex items-center p-5 bg-charcoal border rounded-xl cursor-pointer transition-colors ${
                        formData.deliveryMethod === 'express' ? 'border-primary' : 'border-border-dark hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="deliveryMethod"
                        value="express"
                        checked={formData.deliveryMethod === 'express'}
                        onChange={() => handleDeliveryChange('express')}
                        className="text-primary bg-background-dark border-border-dark focus:ring-primary w-5 h-5"
                      />
                      <div className="ml-4">
                        <div className="text-white font-bold text-sm">Express Delivery</div>
                        <div className="text-slate-500 text-xs mt-0.5">1-2 business days</div>
                      </div>
                      <span className="ml-auto text-white font-bold text-sm">+$15.00</span>
                    </label>
                  </div>
                </fieldset>

                {/* Hidden submit button for mobile - form is submitted via OrderSummary button */}
                <button type="submit" className="sr-only">Continue to Payment</button>
              </form>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="col-span-12 lg:col-span-5 relative">
            <OrderSummary onSubmit={handleSubmit} isSubmitting={isSubmitting} />
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="mt-24 border-t border-border-dark py-12">
        <div className="max-w-container mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6 text-slate-500 text-xs">
          <div className="flex items-center gap-8">
            <p>&copy; {currentYear} Marketplace Inc.</p>
            <div className="flex gap-6 uppercase tracking-widest font-bold">
              <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
              <Link href="/cookies" className="hover:text-primary transition-colors">Cookies</Link>
            </div>
          </div>
          <div className="flex items-center gap-4 grayscale opacity-50" aria-label="Accepted payment methods">
            <span className="material-symbols-outlined" aria-label="PayPal">payments</span>
            <span className="material-symbols-outlined" aria-label="Credit Card">credit_card</span>
            <span className="material-symbols-outlined" aria-label="Bank Transfer">account_balance</span>
            <span className="material-symbols-outlined" aria-label="Bitcoin">currency_bitcoin</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
