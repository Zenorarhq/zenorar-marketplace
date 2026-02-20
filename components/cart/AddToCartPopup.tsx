'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Icon from '@/components/ui/Icon'
import { Product } from '@/lib/types'
import { formatPrice } from '@/lib/currency'

interface AddToCartPopupProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  quantity?: number
  price?: number
}

export default function AddToCartPopup({
  isOpen,
  onClose,
  product,
  quantity = 1,
  price,
}: AddToCartPopupProps) {
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

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
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

  if (!isOpen || !product) return null

  const displayPrice = price ?? product.price

  return (
    <div
      ref={popupRef}
      className="absolute right-0 top-full mt-2 w-[380px] bg-[#0D0D0D] rounded-2xl p-6 shadow-2xl border border-white/10 z-[70]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
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

        {/* Product Info */}
        <div className="flex gap-4 p-4 bg-surface-dark rounded-xl mb-6">
          <div className="w-16 h-16 bg-charcoal rounded-lg overflow-hidden flex-shrink-0">
            {product.image ? (
              <Image
                src={product.image}
                alt={product.name}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Icon name={product.icon} size={24} className="text-slate-600" />
              </div>
            )}
          </div>
          <div className="flex-grow min-w-0">
            <h3 className="text-white font-bold text-sm truncate">{product.name}</h3>
            <p className="text-slate-400 text-xs truncate">{product.category}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-slate-500 text-xs">Qty: {quantity}</span>
              <span className="text-white font-bold">{formatPrice(Number(displayPrice))}</span>
            </div>
          </div>
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
