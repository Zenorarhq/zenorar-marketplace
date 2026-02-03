'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useCart } from '@/lib/cart-context'
import Icon from '@/components/ui/Icon'
import Flag from '@/components/ui/Flag'
import PreferencesDialog from '@/components/dialogs/PreferencesDialog'
import SearchDropdown from '@/components/search/SearchDropdown'
import { navCategories } from '@/lib/mock-data'

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { itemCount } = useCart()
  const [searchQuery, setSearchQuery] = useState('')
  const [showPreferences, setShowPreferences] = useState(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

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

  const openMobileMenu = () => {
    setMobileMenuOpen(true)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  return (
    <>
      <header className="border-b border-border-dark bg-background-dark/80 backdrop-blur-md sticky top-0 z-50">
        {/* Main Header Row */}
        <div className="max-w-container mx-auto px-3 sm:px-4 md:px-8 lg:px-12 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-3 md:gap-4">
          {/* Left Section: Menu Button (mobile/tablet) + Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={openMobileMenu}
              className="md:hidden flex items-center justify-center p-1.5 text-slate-400 hover:text-primary transition-colors"
              aria-label="Open menu"
            >
              <Icon name="menu" size={24} />
            </button>

            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-1.5 sm:gap-2 font-bold text-base sm:text-lg md:text-xl tracking-tight text-primary flex-shrink-0"
            >
              <span className="hidden md:flex w-6 h-6 items-center justify-center [&>svg]:w-full [&>svg]:h-full">
                <Icon name="grid-view" size={24} />
              </span>
              <span>Marketplace</span>
            </Link>
          </div>

          {/* Desktop Search Bar */}
          <div className="hidden md:flex flex-1 min-w-0 max-w-xl relative z-[60] mx-4 lg:mx-8">
            <form onSubmit={handleSearch} className="relative w-full">
              <label htmlFor="header-search-desktop" className="sr-only">
                Search products
              </label>
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-20 pointer-events-none w-5 h-5 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full">
                <Icon name="search" size={20} />
              </span>
              <input
                ref={searchInputRef}
                id="header-search-desktop"
                name="search"
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                placeholder="Search for products or phone number"
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

          {/* Spacer for desktop */}
          <div className="flex-grow hidden md:block" />

          {/* Right Section: Icons */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Mobile/Tablet: Icon-only buttons */}
            <button
              type="button"
              onClick={() => setShowPreferences(true)}
              aria-label="Change language and currency"
              className="md:hidden flex items-center justify-center p-2 text-slate-400 hover:text-primary transition-colors"
            >
              <Flag country="US" size={18} />
            </button>

            <Link
              href="/login"
              prefetch={true}
              className="md:hidden flex items-center justify-center p-2 text-slate-400 hover:text-primary transition-colors"
              aria-label="Login"
            >
              <Icon name="user-circle" size={22} />
            </Link>

            <Link
              href="/cart"
              prefetch={true}
              className="md:hidden flex items-center justify-center p-2 text-slate-400 hover:text-primary transition-colors relative"
              aria-label="Cart"
            >
              <Icon name="cart" size={22} />
              {itemCount > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-primary text-[9px] text-black font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium text-slate-400 flex-shrink-0">
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
                className="flex items-center gap-2 hover:text-primary transition-colors uppercase tracking-wider text-[11px] border border-border-dark px-2.5 py-1.5 rounded-md bg-surface-dark"
              >
                <Flag country="US" size={14} />
                EN/BTC
              </button>
            </nav>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden border-t border-border-dark bg-background-dark/80 px-3 sm:px-4 py-2">
          <div className="relative z-[60]">
            <form onSubmit={handleSearch} className="relative">
              <label htmlFor="header-search-mobile" className="sr-only">
                Search products
              </label>
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-20 pointer-events-none w-4 h-4 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full">
                <Icon name="search" size={18} />
              </span>
              <input
                id="header-search-mobile"
                name="search-mobile"
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                placeholder="Search for products or phone number"
                autoComplete="off"
                className={`w-full bg-surface-dark border rounded-lg py-2.5 pl-9 pr-4 text-sm transition-all placeholder:text-slate-500 text-slate-200 relative z-10 ${
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
        </div>

        <PreferencesDialog
          isOpen={showPreferences}
          onClose={() => setShowPreferences(false)}
        />
      </header>

      {/* Mobile Menu - Using Portal-like pattern outside header */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[9999]">
          {/* Dark Overlay */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeMobileMenu}
          />

          {/* Close Button - Outside drawer on overlay */}
          <button
            type="button"
            onClick={closeMobileMenu}
            className="absolute top-4 z-10 p-2 text-white"
            style={{ left: 'calc(min(85vw, 320px) + 8px)' }}
            aria-label="Close menu"
          >
            <Icon name="close" size={24} />
          </button>

          {/* Side Drawer */}
          <div className="absolute top-0 left-0 bottom-0 w-[85vw] max-w-[320px] bg-[#1a1a1a] flex flex-col">
            {/* Categories - All direct links */}
            <nav className="flex-1 overflow-y-auto pt-8 px-5">
              {navCategories.map((category) => {
                const isActive = pathname === category.href

                return (
                  <Link
                    key={category.label}
                    href={category.href}
                    onClick={closeMobileMenu}
                    className={`block py-4 text-lg font-medium ${
                      isActive ? 'text-primary' : 'text-white'
                    }`}
                  >
                    {category.label}
                  </Link>
                )
              })}
            </nav>

            {/* Bottom Section */}
            <div className="flex-shrink-0">
              {/* Download App */}
              <div className="px-5 py-4 border-t border-[#333]">
                <button
                  type="button"
                  onClick={() => {
                    window.open('/download', '_blank')
                    closeMobileMenu()
                  }}
                  className="w-full flex items-center gap-3 py-3 text-white"
                >
                  <Icon name="download" size={20} />
                  <span className="text-[15px] font-medium">Download the app</span>
                </button>
              </div>

              {/* Language & Help */}
              <div className="px-5 py-4 bg-[#252525]">
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu()
                    setShowPreferences(true)
                  }}
                  className="w-full flex items-center gap-3 py-3 text-white"
                >
                  <Flag country="US" size={20} />
                  <span className="text-[15px] font-medium">EN / USD</span>
                </button>

                <Link
                  href="/help"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 py-3 text-white"
                >
                  <Icon name="help" size={20} />
                  <span className="text-[15px] font-medium">Help</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
