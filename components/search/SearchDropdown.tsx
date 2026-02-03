'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'

interface SearchDropdownProps {
  isOpen: boolean
  onClose: () => void
  searchQuery: string
  onViewAllResults: () => void
  inputRef?: React.RefObject<HTMLInputElement>
}

const recentSearches = [
  'Python Bot',
  'Global eSIM',
]

const trendingProducts = [
  'High-Speed US Virtual Number',
  'Discord Automation Suite',
  '5G Travel eSIM Europe',
]

const popularCategories = [
  { label: 'Scripts', href: '/scripts' },
  { label: 'eSIMs', href: '/esim' },
  { label: 'Virtual Numbers', href: '/virtual-numbers' },
  { label: 'Gift Cards', href: '/gift-cards' },
]

export default function SearchDropdown({
  isOpen,
  onClose,
  searchQuery,
  onViewAllResults,
  inputRef,
}: SearchDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      // Don't close if clicking on the input
      if (inputRef?.current && inputRef.current.contains(target)) {
        return
      }
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose, inputRef])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop - positioned below the header */}
      <div
        className="fixed inset-0 top-16 z-40 bg-black/65 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dropdown - positioned below search input */}
      <div
        ref={dropdownRef}
        className="absolute top-full left-0 w-full mt-2 bg-charcoal border-t-2 border-primary rounded-lg shadow-2xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto"
      >
        {/* Recent Searches */}
        <div className="p-4 border-b border-white/5">
          <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
            Recent Searches
          </h5>
          <div className="space-y-1">
            {recentSearches.map((search, idx) => (
              <Link
                key={idx}
                href={`/search?q=${encodeURIComponent(search)}`}
                prefetch={true}
                onClick={onClose}
                className="flex items-center gap-3 px-2 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-primary rounded-md transition-colors group"
              >
                <Icon name="history" size={18} className="text-slate-500 group-hover:text-primary" />
                {search}
              </Link>
            ))}
          </div>
        </div>

        {/* Trending Products */}
        <div className="p-4 border-b border-white/5">
          <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
            Trending Products
          </h5>
          <div className="space-y-1">
            {trendingProducts.map((product, idx) => (
              <Link
                key={idx}
                href={`/search?q=${encodeURIComponent(product)}`}
                prefetch={true}
                onClick={onClose}
                className="flex items-center gap-3 px-2 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-primary rounded-md transition-colors group"
              >
                <Icon name="fire" size={18} className="text-orange-500" />
                {product}
              </Link>
            ))}
          </div>
        </div>

        {/* Popular Categories */}
        <div className="p-4">
          <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
            Popular Categories
          </h5>
          <div className="flex flex-wrap gap-2 px-2">
            {popularCategories.map((category) => (
              <Link
                key={category.label}
                href={category.href}
                prefetch={true}
                onClick={onClose}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-md text-xs text-slate-400 hover:border-primary hover:text-primary transition-all"
              >
                {category.label}
              </Link>
            ))}
          </div>
        </div>

        {/* View All Results */}
        {searchQuery && (
          <div className="bg-white/5 p-3 text-center border-t border-white/5">
            <button
              onClick={onViewAllResults}
              className="text-xs font-bold text-primary hover:underline"
            >
              View all results for &quot;{searchQuery}&quot;
            </button>
          </div>
        )}
      </div>
    </>
  )
}
