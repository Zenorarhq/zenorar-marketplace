'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import FlagIcon from '@/components/ui/FlagIcon'
import { Product, CartItem } from '@/lib/types'
import { usePreferences } from '@/contexts/PreferencesContext'
import { CardVisualMini } from '@/components/cards/CardVisual'

interface AddToCartPopupProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  quantity?: number
  price?: number
  cartItems?: CartItem[]
  cartTotal?: number
  cartItemCount?: number
}

// Separate component for cart item row to properly handle image error state
function CartItemRow({
  item,
  isJustAdded,
  formatPrice,
}: {
  item: CartItem
  isJustAdded: boolean
  formatPrice: (price: number) => string
}) {
  const [imageError, setImageError] = useState(false)

  // Support multiple image sources: standard image, images array, imageUrl, metadata imageUrl
  const itemImageUrl = item.product.image || item.product.images?.[0]?.url || (item.product as any).imageUrl || (item.product as any).metadata?.imageUrl

  // Check product types
  const productType = (item.product as any).metadata?.productType
  const isInstantCard = productType === 'instant_card' ||
    (item.product as any).productType === 'instant_card' ||
    (item.product as any).product_type === 'instant_card'
  const isVirtualCard = productType === 'virtual_card' ||
    (item.product as any).productType === 'virtual_card' ||
    (item.product as any).product_type === 'virtual_card'
  const hasCountryFlag = (productType === 'esim' || productType === 'virtual_number') && (item.product as any).metadata?.countryIsoCode

  const cardMetadata = (item.product as any).metadata || {}

  return (
    <div
      className={`flex gap-3 p-3 rounded-xl ${isJustAdded ? 'bg-primary/10 border border-primary/20' : 'bg-surface-dark'}`}
    >
      <div className="flex-shrink-0">
        {isInstantCard || isVirtualCard ? (
          <CardVisualMini
            brand={cardMetadata.brand === 'mastercard' ? 'mastercard' : 'visa'}
            type={isVirtualCard ? 'virtual' : 'instant'}
            denomination={cardMetadata.denomination}
          />
        ) : hasCountryFlag ? (
          <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
            <FlagIcon countryCode={cardMetadata.countryIsoCode} className="w-8 h-8 rounded" />
          </div>
        ) : (
          <div className="w-12 h-12 bg-charcoal rounded-lg overflow-hidden">
            {itemImageUrl && !imageError ? (
              <img
                src={itemImageUrl}
                alt={item.product.name}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Icon name={item.product.icon || ((item.product as any).metadata?.productType === 'gift_card' ? 'gift' : 'box')} size={20} className="text-slate-600" />
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex-grow min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-white font-bold text-xs truncate">{item.product.name}</h3>
          {isJustAdded && (
            <span className="text-primary text-[10px] font-bold flex-shrink-0">NEW</span>
          )}
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-slate-500 text-xs">Qty: {item.quantity}</span>
          <span className="text-white font-bold text-sm">{formatPrice(item.price * item.quantity)}</span>
        </div>
      </div>
    </div>
  )
}

export default function AddToCartPopup({
  isOpen,
  onClose,
  product,
  quantity = 1,
  price,
  cartItems = [],
  cartTotal = 0,
  cartItemCount = 0,
}: AddToCartPopupProps) {
  const { formatPrice } = usePreferences()
  const [isHovered, setIsHovered] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  // Auto close after 3 seconds (only when not hovered)
  useEffect(() => {
    if (isOpen && !isHovered) {
      timerRef.current = setTimeout(() => {
        onClose()
      }, 3000)
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current)
        }
      }
    }
  }, [isOpen, isHovered, onClose])

  // Clear timer when hovered
  useEffect(() => {
    if (isHovered && timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [isHovered])

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

  // Handle click outside — use 'click' not 'mousedown' so inner links/buttons fire first
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('click', handleClickOutside)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen || !product) return null

  return (
    <div
      ref={popupRef}
      className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-[380px] bg-[#0D0D0D] rounded-2xl p-6 shadow-2xl border border-white/10 z-[70]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Icon name="check" size={20} className="text-primary" />
            </div>
            <h2 className="text-white text-lg font-bold">Added to Cart</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="max-h-[240px] overflow-y-auto space-y-2 mb-4" style={{ scrollbarWidth: 'thin' }}>
          {cartItems.map((item) => (
            <CartItemRow
              key={`${item.product.id}-${item.license}`}
              item={item}
              isJustAdded={item.product.id === product.id}
              formatPrice={formatPrice}
            />
          ))}
        </div>

        {/* Cart Total */}
        <div className="flex items-center justify-between py-3 px-1 border-t border-white/10 mb-4">
          <span className="text-slate-400 text-sm">{cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}</span>
          <span className="text-white font-bold">{formatPrice(cartTotal)}</span>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="bg-surface-dark border border-border-dark text-white font-bold py-3 px-4 rounded-xl hover:border-primary/50 transition-all flex items-center justify-center gap-2"
          >
            <Icon name="arrow-left" size={18} />
            Continue Shopping
          </button>
          <Link
            href="/checkout"
            onClick={onClose}
            className="bg-primary text-black font-bold py-3 px-4 rounded-xl hover:brightness-105 transition-all flex items-center justify-center gap-2"
          >
            Checkout
            <Icon name="arrow-right" size={18} />
          </Link>
        </div>

        {/* View Cart Link */}
        <Link
          href="/cart"
          onClick={onClose}
          className="block text-center text-primary text-sm font-bold mt-4 hover:underline"
        >
          View Cart
        </Link>
    </div>
  )
}
