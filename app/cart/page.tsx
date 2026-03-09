'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import CategoryNav from '@/components/layout/CategoryNav'
import Footer from '@/components/layout/Footer'
import Icon from '@/components/ui/Icon'
import FlagIcon from '@/components/ui/FlagIcon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { useCart } from '@/lib/cart-context'
import { usePreferences } from '@/contexts/PreferencesContext'
import { discountsApi, type ValidateDiscountResponse } from '@/lib/api/discounts'
import { settingsApi } from '@/lib/api/settings'

export default function CartPage() {
  const router = useRouter()
  const { items, itemCount, total, updateQuantity, removeItem, clearCart, validateCart } = useCart()
  const { formatPrice } = usePreferences()
  const [promoCode, setPromoCode] = useState('')
  const [discount, setDiscount] = useState<ValidateDiscountResponse | null>(null)
  const [promoError, setPromoError] = useState('')
  const [isValidating, setIsValidating] = useState(false)

  // Tax settings
  const [taxRate, setTaxRate] = useState(0)

  // Cart validation
  const [validationErrors, setValidationErrors] = useState<Array<{ productId: string; issue: string }>>([])
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  // Virtual number provider availability
  const [providerAvailable, setProviderAvailable] = useState<boolean | null>(null)
  const [providerCheckLoading, setProviderCheckLoading] = useState(false)

  // Check which items are virtual numbers
  const virtualNumberItems = items.filter(item => item.product?.metadata?.productType === 'virtual_number')
  const nonVirtualNumberItems = items.filter(item => item.product?.metadata?.productType !== 'virtual_number')
  const hasVirtualNumbers = virtualNumberItems.length > 0
  const hasOnlyVirtualNumbers = hasVirtualNumbers && nonVirtualNumberItems.length === 0

  // Checkout should be disabled if ONLY virtual numbers and provider unavailable
  const shouldDisableCheckout = hasOnlyVirtualNumbers && providerAvailable === false

  // Pre-fill promo code and discount from session
  useEffect(() => {
    const savedCode = sessionStorage.getItem('promo_code')
    if (savedCode) setPromoCode(savedCode)

    // Restore full discount object if it exists
    const savedDiscount = sessionStorage.getItem('applied_discount')
    if (savedDiscount) {
      try {
        const discountData = JSON.parse(savedDiscount)
        setDiscount(discountData)
        setPromoCode(discountData.code)
      } catch (e) {
        // Invalid JSON, clear it
        sessionStorage.removeItem('applied_discount')
      }
    }
  }, [])

  // Load tax settings
  useEffect(() => {
    settingsApi.getPublicSettings().then((res) => {
      if (res.success && res.data) {
        setTaxRate(parseFloat(res.data.taxRate || '0'))
      }
    })
  }, [])

  // Check virtual number provider availability when cart has virtual numbers
  useEffect(() => {
    if (!hasVirtualNumbers) {
      setProviderAvailable(true)
      return
    }

    const checkProvider = async () => {
      setProviderCheckLoading(true)
      try {
        const response = await fetch('/backend/orders/check-provider')
        const result = await response.json()
        setProviderAvailable(result.success && result.data?.providerAvailable === true)
      } catch (error) {
        console.error('Failed to check provider:', error)
        setProviderAvailable(false)
      } finally {
        setProviderCheckLoading(false)
      }
    }
    checkProvider()
  }, [hasVirtualNumbers])

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return
    setIsValidating(true)
    setPromoError('')
    try {
      const res = await discountsApi.validate(promoCode.trim(), total)
      if (res.success && res.data) {
        setDiscount(res.data)
        // Save full discount object for persistence across refreshes
        sessionStorage.setItem('applied_discount', JSON.stringify(res.data))
        sessionStorage.setItem('discount_code', res.data.code)
        sessionStorage.setItem('discount_amount', String(res.data.discountAmount))
      } else {
        setPromoError(res.error || 'Invalid promo code')
        setDiscount(null)
        sessionStorage.removeItem('applied_discount')
        sessionStorage.removeItem('discount_code')
        sessionStorage.removeItem('discount_amount')
      }
    } catch {
      setPromoError('Failed to validate code')
    }
    setIsValidating(false)
  }

  const handleRemovePromo = () => {
    setDiscount(null)
    setPromoCode('')
    setPromoError('')
    sessionStorage.removeItem('promo_code')
    sessionStorage.removeItem('discount_code')
    sessionStorage.removeItem('discount_amount')
    sessionStorage.removeItem('applied_discount')
  }

  const handleProceedToCheckout = async () => {
    setIsCheckingOut(true)
    setValidationErrors([])

    // Validate cart before proceeding
    const validation = await validateCart()

    if (!validation.valid) {
      setValidationErrors(validation.issues)
      setIsCheckingOut(false)
      return
    }

    // Save tax and shipping to session for checkout page
    sessionStorage.setItem('shipping_amount', '0.00')
    sessionStorage.setItem('tax_amount', calculatedTax.toFixed(2))
    sessionStorage.setItem('tax_rate', taxRate.toString())

    // If provider unavailable and we have mixed items, set exclusion flag
    if (providerAvailable === false && hasVirtualNumbers && !hasOnlyVirtualNumbers) {
      sessionStorage.setItem('excludeVirtualNumbers', 'true')
    } else {
      sessionStorage.removeItem('excludeVirtualNumbers')
    }

    // Navigate to checkout
    router.push('/checkout')
  }

  const discountAmount = discount?.discountAmount ?? 0
  const subtotal = total - discountAmount

  // Calculate tax on subtotal (digital marketplace — no shipping)
  const calculatedTax = subtotal * (taxRate / 100)

  // Final total
  const finalTotal = subtotal + calculatedTax

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
              Looks like you haven&apos;t added anything to your cart yet. Start browsing our products to find something you&apos;ll love.
            </p>
            <Link
              href="/scripts"
              className="bg-primary text-black font-bold px-8 py-4 rounded-xl hover:brightness-105 transition-all inline-flex items-center gap-2"
            >
              <Icon name="compass" size={24} />
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
          <Breadcrumbs className="mb-0" />
        </div>
        <div className="flex items-center justify-between mb-6 md:mb-10">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2 tracking-tight">Shopping Cart</h1>
            <p className="text-sm md:text-base text-slate-500">{itemCount} item{itemCount !== 1 ? 's' : ''} in your cart</p>
          </div>
          <button
            onClick={clearCart}
            className="text-slate-400 hover:text-red-400 text-sm font-bold flex items-center gap-2 transition-colors"
          >
            <Icon name="delete" size={18} />
            Clear Cart
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {(items || []).map((item) => (
              <div
                key={`${item.product.id}-${item.license}`}
                className="bg-surface-dark border border-border-dark rounded-2xl p-4 md:p-6 flex gap-4 md:gap-6"
              >
                {/* Product Image / Flag for Virtual Numbers / Gift Card Image */}
                <div className="w-24 h-24 bg-charcoal rounded-xl overflow-hidden flex-shrink-0">
                  {item.product.metadata?.productType === 'virtual_number' && item.product.metadata?.countryIsoCode ? (
                    // Virtual number - show country flag image
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                      <FlagIcon countryCode={item.product.metadata.countryIsoCode} className="w-16 h-16 rounded" />
                    </div>
                  ) : ((item.product as any).productType === 'gift_card' || (item.product as any).product_type === 'gift_card' || item.product.metadata?.productType === 'gift_card') && ((item.product as any).imageUrl || item.product.metadata?.imageUrl) ? (
                    // Gift card - show brand image
                    <Image
                      src={(item.product as any).imageUrl || item.product.metadata?.imageUrl || ''}
                      alt={item.product.name}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (item.product.image || item.product.images?.[0]?.url) ? (
                    <Image
                      src={item.product.image || item.product.images?.[0]?.url || ''}
                      alt={item.product.name}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon name={item.product.icon || 'phone'} size={30} className="text-slate-600" />
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    {item.product.metadata?.productType === 'virtual_number' ? (
                      // Virtual number - show phone number as title
                      <div className="flex flex-col">
                        <span className="text-lg font-bold text-white">
                          {item.product.metadata?.friendlyName || item.product.name}
                        </span>
                        <span className="text-xs text-slate-400">
                          {item.product.metadata?.countryName || 'Virtual Number'}
                        </span>
                      </div>
                    ) : (
                      <Link
                        href={`/products/${item.product.slug}`}
                        className="text-lg font-bold text-white hover:text-primary transition-colors"
                      >
                        {item.product.name}
                      </Link>
                    )}
                    <button
                      onClick={() => removeItem(item.product.id, item.license)}
                      className="text-slate-400 hover:text-red-400 transition-colors"
                      aria-label="Remove item"
                    >
                      <Icon name="close" size={24} />
                    </button>
                  </div>

                  <div className="text-xs text-primary font-bold uppercase tracking-wider mb-4">
                    {item.product.metadata?.productType === 'virtual_number' ? (
                      // Show plan info for virtual numbers
                      `${item.product.metadata?.planCategory?.toUpperCase() || 'BASIC'} PLAN - ${item.product.metadata?.durationDays || 30} DAYS`
                    ) : (
                      item.license === 'extended' ? 'Extended License' : 'Standard License'
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-3 bg-charcoal rounded-lg p-1">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-surface-dark transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Icon name="minus" size={18} />
                      </button>
                      <span className="w-8 text-center text-white font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-surface-dark transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Icon name="plus" size={18} />
                      </button>
                    </div>

                    {/* Price */}
                    <div className="text-xl font-bold text-white">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-charcoal border border-border-dark rounded-2xl p-8 sticky top-24">
              <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span className="text-white font-medium">{formatPrice(total)}</span>
                </div>
                {discount && (
                  <div className="flex justify-between text-slate-400">
                    <span className="flex items-center gap-1">
                      Discount
                      <span className="text-xs text-primary">({discount.code})</span>
                    </span>
                    <span className="text-primary font-medium">-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Tax</span>
                  <span className="text-white font-medium">{formatPrice(calculatedTax)}</span>
                </div>
              </div>

              <div className="border-t border-border-dark pt-4 mb-8">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-white">Total</span>
                  <span className="text-2xl font-extrabold text-white">{formatPrice(finalTotal)}</span>
                </div>
              </div>

              {/* Promo Code */}
              <div className="mb-6">
                <label htmlFor="promo" className="block text-sm font-bold text-slate-400 mb-2">
                  Promo Code
                </label>
                {discount ? (
                  <div className="w-full flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-lg py-2 px-4">
                    <span className="flex-grow text-primary font-mono font-bold">{discount.code}</span>
                    <button
                      onClick={handleRemovePromo}
                      className="text-slate-400 hover:text-red-400 text-sm font-bold whitespace-nowrap px-4 py-2"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-full flex gap-2">
                      <input
                        id="promo"
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                        placeholder="Enter code"
                        className="flex-grow bg-background-dark border border-border-dark rounded-lg py-2 px-4 text-white placeholder:text-slate-500 focus:ring-primary focus:border-primary transition-all font-mono"
                      />
                      <button
                        onClick={handleApplyPromo}
                        disabled={isValidating || !promoCode.trim()}
                        className="bg-surface-dark border border-border-dark text-white px-4 py-2 rounded-lg font-bold hover:border-primary transition-colors disabled:opacity-50"
                      >
                        {isValidating ? '...' : 'Apply'}
                      </button>
                    </div>
                    {promoError && (
                      <p className="text-red-400 text-xs mt-1">{promoError}</p>
                    )}
                  </>
                )}
              </div>

              {/* Provider Unavailable Warning */}
              {hasVirtualNumbers && providerAvailable === false && (
                <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Icon name="alert" size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-400 font-bold text-sm mb-1">Service Temporarily Unavailable</p>
                      <p className="text-amber-400/80 text-xs">
                        {hasOnlyVirtualNumbers
                          ? 'Virtual number service is currently unavailable. Please try again later.'
                          : 'Virtual number service is unavailable. These items will be excluded from checkout, but you can proceed with other items.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Errors */}
              {validationErrors && validationErrors.length > 0 && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 font-bold mb-2">Cart Validation Issues:</p>
                  <ul className="text-red-400 text-sm space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Icon name="alert" size={16} className="mt-0.5 flex-shrink-0" />
                        <span>{error.issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={handleProceedToCheckout}
                disabled={isCheckingOut || shouldDisableCheckout || providerCheckLoading}
                className="w-full bg-primary text-black font-bold py-4 rounded-xl hover:brightness-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCheckingOut ? (
                  <>
                    Validating...
                    <Icon name="loading" size={24} className="animate-spin" />
                  </>
                ) : providerCheckLoading ? (
                  <>
                    Checking availability...
                    <Icon name="loading" size={24} className="animate-spin" />
                  </>
                ) : (
                  <>
                    Proceed to Checkout
                    <Icon name="arrow-right" size={24} />
                  </>
                )}
              </button>

              <Link
                href="/scripts"
                className="block text-center text-primary text-sm font-bold mt-4 hover:underline"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
