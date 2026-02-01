'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/cart-context'
import Icon from '@/components/ui/Icon'
import PreferencesDialog from '@/components/dialogs/PreferencesDialog'
import SearchDropdown from '@/components/search/SearchDropdown'

export default function Header() {
  const router = useRouter()
  const { itemCount } = useCart()
  const [searchQuery, setSearchQuery] = useState('')
  const [showPreferences, setShowPreferences] = useState(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setShowSearchDropdown(false)
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleInputFocus = () => {
    setShowSearchDropdown(true)
  }

  const handleViewAllResults = () => {
    if (searchQuery.trim()) {
      setShowSearchDropdown(false)
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleCloseDropdown = () => {
    setShowSearchDropdown(false)
  }

  return (
    <header className="border-b border-border-dark bg-background-dark/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-container mx-auto px-8 lg:px-12 h-16 flex items-center justify-start gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary flex-shrink-0 mr-4"
        >
          <Icon name="grid-view" size={24} />
          Marketplace
        </Link>

        {/* Search Bar */}
        <div className="w-full max-w-md relative z-[60]">
          <form onSubmit={handleSearch} className="relative">
            <label htmlFor="header-search" className="sr-only">
              Search products
            </label>
            <Icon name="search" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-20 pointer-events-none" />
            <input
              ref={searchInputRef}
              id="header-search"
              name="search"
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              placeholder="Search Scripts, eSIMs, Numbers..."
              autoComplete="off"
              className={`w-full bg-surface-dark border rounded-lg py-2.5 pl-10 pr-4 text-sm transition-all placeholder:text-slate-500 text-slate-200 relative z-10 ${
                showSearchDropdown
                  ? 'ring-2 ring-primary border-primary shadow-lg'
                  : 'border-border-dark focus:ring-1 focus:ring-primary'
              }`}
            />
          </form>

          <SearchDropdown
            isOpen={showSearchDropdown}
            onClose={handleCloseDropdown}
            searchQuery={searchQuery}
            onViewAllResults={handleViewAllResults}
            inputRef={searchInputRef}
          />
        </div>

        {/* Spacer */}
        <div className="flex-grow" />

        {/* Navigation */}
        <nav className="flex items-center gap-8 text-sm font-medium text-slate-400 flex-shrink-0">
          <Link
            href="/help"
            prefetch={true}
            className="flex items-center gap-1.5 hover:text-primary transition-colors"
          >
            <Icon name="help" size={20} />
            Help
          </Link>

          <Link
            href="/login"
            prefetch={true}
            className="flex items-center gap-1.5 hover:text-primary transition-colors"
          >
            <Icon name="user-circle" size={20} />
            Login
          </Link>

          <Link
            href="/cart"
            prefetch={true}
            className="flex items-center gap-1.5 hover:text-primary transition-colors relative"
          >
            <Icon name="cart" size={20} />
            Cart
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-primary text-[10px] text-black font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setShowPreferences(true)}
            aria-label="Change language and currency"
            className="flex items-center gap-1.5 hover:text-primary transition-colors uppercase tracking-wider text-[11px] border border-border-dark px-2.5 py-1 rounded-md bg-surface-dark"
          >
            <Icon name="language" size={16} />
            EN/BTC
          </button>
        </nav>
      </div>

      <PreferencesDialog
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
      />
    </header>
  )
}
