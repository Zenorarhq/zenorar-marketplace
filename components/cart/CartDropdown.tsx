'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Icon from '@/components/ui/Icon'
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
              {(item.product.image || item.product.images?.[0]?.url) ? (
                <Image
                  src={item.product.image || item.product.images?.[0]?.url || ''}
                  alt={item.product.name}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Icon name={item.product.icon} size={20} className="text-slate-600" />
                </div>
              )}
            </div>
            <div className="flex-grow min-w-0">
              <h3 className="text-white font-bold text-sm truncate">{item.product.name}</h3>
              <p className="text-slate-400 text-xs truncate">{item.product.category}</p>
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

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/cart"
          onClick={onClose}
          className="bg-surface-dark border border-border-dark text-white font-bold py-3 px-4 rounded-xl hover:border-primary/50 transition-all flex items-center justify-center gap-2"
        >
          View Cart
        </Link>
        <Link
          href="/checkout"
          onClick={onClose}
          className="bg-primary text-black font-bold py-3 px-4 rounded-xl hover:brightness-105 transition-all flex items-center justify-center gap-2"
        >
          Checkout
          <Icon name="arrow-right" size={18} />
        </Link>
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
