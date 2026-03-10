'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Icon from '@/components/ui/Icon'
import FlagIcon from '@/components/ui/FlagIcon'
import { useCart } from '@/lib/cart-context'
import { usePreferences } from '@/contexts/PreferencesContext'

interface CartDropdownProps {
  isOpen: boolean
  onClose: () => void
  variant?: 'dropdown' | 'modal'
}

export default function CartDropdown({ isOpen, onClose, variant = 'dropdown' }: CartDropdownProps) {
  const { items, total, itemCount, removeItem } = useCart()
  const { formatPrice } = usePreferences()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Provider availability state
  const [providerAvailable, setProviderAvailable] = useState<boolean | null>(null)
  const [providerCheckLoading, setProviderCheckLoading] = useState(false)

  // Check which items are virtual numbers
  const virtualNumberItems = items.filter(item => item.product?.metadata?.productType === 'virtual_number')
  const nonVirtualNumberItems = items.filter(item => item.product?.metadata?.productType !== 'virtual_number')
  const hasVirtualNumbers = virtualNumberItems.length > 0
  const hasOnlyVirtualNumbers = hasVirtualNumbers && nonVirtualNumberItems.length === 0

  // Checkout should be disabled if ONLY virtual numbers and provider unavailable
  const shouldDisableCheckout = hasOnlyVirtualNumbers && providerAvailable === false

  // Check provider availability when cart has virtual numbers
  useEffect(() => {
    if (!isOpen || !hasVirtualNumbers) {
      setProviderAvailable(null)
      return
    }

    const checkProvider = async () => {
      setProviderCheckLoading(true)
      try {
        const response = await fetch('/backend/orders/check-provider')
        const result = await response.json()
        setProviderAvailable(result.success && result.data?.providerAvailable === true)
      } catch (error) {
        console.error('Failed to check provider availability:', error)
        setProviderAvailable(false)
      } finally {
        setProviderCheckLoading(false)
      }
    }

    checkProvider()
  }, [isOpen, hasVirtualNumbers])

  // Handle checkout with exclusion logic for unavailable virtual numbers
  const handleCheckout = useCallback(() => {
    // If provider unavailable and we have mixed items, exclude virtual numbers
    if (providerAvailable === false && hasVirtualNumbers && !hasOnlyVirtualNumbers) {
      // Store excluded items in sessionStorage so checkout page knows to exclude them
      sessionStorage.setItem('excludeVirtualNumbers', 'true')
    } else {
      sessionStorage.removeItem('excludeVirtualNumbers')
    }
    onClose()
    router.push('/checkout')
  }, [providerAvailable, hasVirtualNumbers, hasOnlyVirtualNumbers, onClose, router])

  // Handle click outside (only if this instance is actually visible in the DOM)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current) return
      // Skip if this instance is hidden (inside a display:none container)
      if (dropdownRef.current.getClientRects().length === 0) return
      if (!dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen && variant === 'modal') {
      document.body.style.overflow = 'hidden'
    } else if (variant === 'modal') {
      document.body.style.overflow = ''
    }
    return () => {
      if (variant === 'modal') {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen, variant])

  if (!isOpen) return null

  const isEmpty = !items || items.length === 0

  if (isEmpty) {
    return (
      <div
        ref={dropdownRef}
        className={variant === 'modal'
          ? "relative w-[calc(100vw-2rem)] sm:w-[380px] bg-[#0D0D0D] rounded-2xl p-6 shadow-2xl border border-white/10 z-[101]"
          : "absolute right-0 top-full mt-2 w-[380px] bg-[#0D0D0D] rounded-2xl p-6 shadow-2xl border border-white/10 z-[70]"
        }
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Icon name="cart" size={20} className="text-primary" />
            </div>
            <h2 className="text-white text-lg font-bold">My Cart</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Icon name="cart" size={32} className="text-slate-600" />
          </div>
          <h3 className="text-white font-bold text-base mb-1">Your cart is empty</h3>
          <p className="text-slate-400 text-sm">Looks like you haven't added anything to your cart yet. <Link href="/products" onClick={onClose} className="text-primary hover:underline">Browse products</Link>.</p>
        </div>
      </div>
    )
  }

  const content = (
    <div
      ref={dropdownRef}
      className={variant === 'modal'
        ? "relative w-[calc(100vw-2rem)] sm:w-[380px] bg-[#0D0D0D] rounded-2xl p-6 shadow-2xl border border-white/10 z-[101]"
        : "absolute right-0 top-full mt-2 w-[380px] bg-[#0D0D0D] rounded-2xl p-6 shadow-2xl border border-white/10 z-[70]"
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Icon name="cart" size={20} className="text-primary" />
          </div>
          <h2 className="text-white text-lg font-bold">
            My Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
        >
          <Icon name="close" size={20} />
        </button>
      </div>

      {/* Items List */}
      <div className="max-h-[300px] overflow-y-auto space-y-3 mb-4 pr-1">
        {items.map((item) => (
          <div
            key={`${item.product.id}-${item.license}`}
            className="flex gap-3 p-3 bg-surface-dark rounded-xl"
          >
            <div className="w-12 h-12 bg-charcoal rounded-lg overflow-hidden flex-shrink-0">
              {(() => {
                const imageUrl = item.product.image
                  || item.product.images?.[0]?.url
                  || (item.product as any).imageUrl
                  || item.product.metadata?.imageUrl
                const isVirtualNumber = item.product.metadata?.productType === 'virtual_number'
                const isGiftCard = item.product.metadata?.productType === 'gift_card'

                if (isVirtualNumber && item.product.metadata?.countryIsoCode) {
                  return (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                      <FlagIcon countryCode={item.product.metadata.countryIsoCode} className="w-8 h-8 rounded" />
                    </div>
                  )
                }
                if (imageUrl) {
                  return (
                    <>
                      <img
                        src={imageUrl}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement
                          if (fallback) fallback.style.display = 'flex'
                        }}
                      />
                      <div className="w-full h-full items-center justify-center hidden">
                        <Icon name={isGiftCard ? 'gift' : (item.product.icon || 'package')} size={20} className="text-slate-600" />
                      </div>
                    </>
                  )
                }
                return (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon name={isGiftCard ? 'gift' : (item.product.icon || 'package')} size={20} className="text-slate-600" />
                  </div>
                )
              })()}
            </div>
            <div className="flex-grow min-w-0">
              <h3 className="text-white font-bold text-sm truncate">
                {item.product.metadata?.productType === 'virtual_number'
                  ? (item.product.metadata?.friendlyName || item.product.name)
                  : item.product.name}
              </h3>
              <p className="text-slate-400 text-xs truncate">
                {item.product.metadata?.productType === 'virtual_number'
                  ? `${item.product.metadata?.planCategory?.toUpperCase() || 'Basic'} - ${item.product.metadata?.durationDays || 30} days`
                  : item.product.category}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-slate-500 text-xs">
                  {item.quantity} × {formatPrice(item.price)}
                </span>
                <span className="text-white font-bold text-sm">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            </div>
            <button
              onClick={() => removeItem(item.product.id, item.license)}
              className="text-slate-500 hover:text-red-400 transition-colors p-1 self-start flex-shrink-0"
              aria-label={`Remove ${item.product.name}`}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between py-3 border-t border-white/10 mb-4">
        <span className="text-slate-400 font-medium">Total</span>
        <span className="text-white font-bold text-lg">{formatPrice(total)}</span>
      </div>

      {/* Provider unavailable warning */}
      {hasVirtualNumbers && providerAvailable === false && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <div className="flex items-start gap-2">
            <Icon name="alert" size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              {hasOnlyVirtualNumbers ? (
                <p className="text-amber-200">
                  Virtual number service is currently unavailable. Please try again later.
                </p>
              ) : (
                <p className="text-amber-200">
                  Virtual number service is unavailable. These items will be excluded from checkout.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/cart"
          onClick={onClose}
          className="bg-surface-dark border border-border-dark text-white font-bold py-3 px-4 rounded-xl hover:border-primary/50 transition-all flex items-center justify-center gap-2"
        >
          View Cart
        </Link>
        {shouldDisableCheckout || providerCheckLoading ? (
          <button
            disabled
            className="bg-slate-600 text-slate-400 font-bold py-3 px-4 rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
          >
            {providerCheckLoading ? (
              <>
                <Icon name="loading" size={18} className="animate-spin" />
                Checking...
              </>
            ) : (
              <>
                Checkout
                <Icon name="arrow-right" size={18} />
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleCheckout}
            className="bg-primary text-black font-bold py-3 px-4 rounded-xl hover:brightness-105 transition-all flex items-center justify-center gap-2"
          >
            Checkout
            <Icon name="arrow-right" size={18} />
          </button>
        )}
      </div>
    </div>
  )

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-20">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        {content}
      </div>
    )
  }

  return content
}
