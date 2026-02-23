'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/contexts/AuthContext'
import { usePreferences } from '@/contexts/PreferencesContext'
import { useNotifications } from '@/hooks/use-notifications'
import Icon from '@/components/ui/Icon'
import FlagIcon from '@/components/ui/FlagIcon'
import PreferencesDialog from '@/components/dialogs/PreferencesDialog'
import SearchDropdown from '@/components/search/SearchDropdown'
import CartPopupWrapper from '@/components/cart/CartPopupWrapper'
import CartDropdown from '@/components/cart/CartDropdown'
import NotificationsDropdown from '@/components/notifications/NotificationsDropdown'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import { navCategories } from '@/lib/mock-data'

function MobileNavItem({ item, pathname, onClose }: { item: { label: string; url: string; children?: { label: string; url: string }[] }; pathname: string; onClose: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = item.children && item.children.length > 0
  const isActive = pathname === item.url

  return (
    <div>
      <div className="flex items-center">
        <Link href={item.url || '#'} onClick={onClose} className={`flex-1 block py-4 text-lg font-medium ${isActive ? 'text-primary' : 'text-white'}`}>
          {item.label}
        </Link>
        {hasChildren && (
          <button onClick={() => setExpanded(!expanded)} className="p-2 text-slate-400">
            <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} />
          </button>
        )}
      </div>
      {hasChildren && expanded && (
        <div className="pl-4 pb-2">
          {item.children!.map((child, ci) => (
            <Link key={ci} href={child.url || '#'} onClick={onClose} className={`block py-2 text-base ${pathname === child.url ? 'text-primary' : 'text-slate-400'}`}>
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { itemCount } = useCart()
  const { user, isAuthenticated, logout } = useAuth()
  const { preferences } = usePreferences()
  const { unreadCount } = useNotifications()
  const { siteName, logoUrl, rawSettings, isLoaded } = useSiteSettings()

  // Parse CMS header config
  const headerConfig = (() => {
    try {
      const raw = rawSettings?.site_header
      if (!raw) return null
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      const data = parsed?.value ? (typeof parsed.value === 'string' ? JSON.parse(parsed.value) : parsed.value) : parsed
      return data && typeof data === 'object' ? data : null
    } catch { return null }
  })()
  const showSearch = headerConfig?.showSearch !== false
  const showCart = headerConfig?.showCart !== false
  const showSiteName = headerConfig ? headerConfig.showSiteName !== false : !logoUrl
  const logoMaxHeight = headerConfig?.logoMaxHeight || 'medium'
  const logoHeightClass = ({ small: 'h-7 sm:h-7 md:h-7', medium: 'h-8 sm:h-9 md:h-10', large: 'h-10 sm:h-11 md:h-12' } as Record<string, string>)[logoMaxHeight] || 'h-8 sm:h-9 md:h-10'
  const isSticky = headerConfig?.sticky !== false
  const bgStyle = headerConfig?.backgroundStyle || 'blur'
  const [searchQuery, setSearchQuery] = useState('')
  const [showPreferences, setShowPreferences] = useState(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileUserMenu, setShowMobileUserMenu] = useState(false)
  const [showCartDropdown, setShowCartDropdown] = useState(false)
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const mobileUserMenuRef = useRef<HTMLDivElement>(null)
  const cartDropdownRef = useRef<HTMLDivElement>(null)

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

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
    setShowMobileUserMenu(false)
    router.push('/')
  }

  // Close user menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showUserMenu])

  // Close mobile user menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileUserMenuRef.current && !mobileUserMenuRef.current.contains(event.target as Node)) {
        setShowMobileUserMenu(false)
      }
    }
    if (showMobileUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMobileUserMenu])

  // Close cart dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cartDropdownRef.current && !cartDropdownRef.current.contains(event.target as Node)) {
        setShowCartDropdown(false)
      }
    }
    if (showCartDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showCartDropdown])


  return (
    <>
      <header className={`border-b border-border-dark z-50 ${isSticky ? 'sticky top-0' : ''} ${bgStyle === 'blur' ? 'bg-background-dark/80 backdrop-blur-md' : bgStyle === 'transparent' ? 'bg-transparent' : 'bg-background-dark'}`}>
        {/* Main Header Row */}
        <div className="max-w-container mx-auto px-3 sm:px-4 md:px-4 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-3 md:gap-3">
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
              {isLoaded && (logoUrl ? (
                <>
                  <img src={logoUrl} alt={siteName} className={`${logoHeightClass} w-auto object-contain`} />
                  {showSiteName && <span>{siteName}</span>}
                </>
              ) : siteName ? (
                <span>{siteName}</span>
              ) : null)}
            </Link>
          </div>

          {/* Desktop Search Bar */}
          {showSearch && <div className="hidden md:flex flex-1 relative z-[60] mx-2 lg:mx-6" style={{ minWidth: '280px', maxWidth: '600px' }}>
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
          </div>}

          {/* Right Section: Icons */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Mobile/Tablet: Notifications (authenticated only) */}
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                className="md:hidden flex items-center justify-center p-2 text-slate-400 hover:text-primary transition-colors relative"
                aria-label="Notifications"
              >
                <Icon name="bell" size={22} />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-red-500 text-[9px] text-white font-bold w-4 h-4 flex items-center justify-center rounded-full">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}

            {/* Mobile/Tablet: Language/Currency */}
            <button
              type="button"
              onClick={() => setShowPreferences(true)}
              aria-label="Change language and currency"
              className="md:hidden flex items-center gap-0.5 p-2 hover:text-primary transition-colors"
            >
              <div className="relative w-9 h-6">
                {/* Flag circle (bottom/back) */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface-dark border border-border-dark overflow-hidden flex items-center justify-center">
                  <FlagIcon countryCode={preferences.country.code} className="w-full h-full object-cover" />
                </div>
                {/* Currency circle (top/front) */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary text-black flex items-center justify-center text-xs font-bold shadow-md">
                  {preferences.currency.symbol}
                </div>
              </div>
              <Icon name="chevron-down" size={14} className="text-slate-400" />
            </button>

            {/* Mobile/Tablet: User Menu/Login */}
            {isAuthenticated ? (
              <div className="md:hidden relative" ref={mobileUserMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowMobileUserMenu(!showMobileUserMenu)}
                  className="flex items-center gap-0.5 p-2 text-slate-400 hover:text-primary transition-colors"
                  aria-label="User menu"
                >
                  {user?.avatar ? (
                    <div className="w-6 h-6 rounded-full overflow-hidden relative ring-2 ring-transparent hover:ring-primary/50 transition-all">
                      <Image src={user.avatar} alt={user.name || 'Profile'} fill className="object-cover" />
                    </div>
                  ) : (
                    <Icon name="user-circle" size={22} />
                  )}
                  <Icon name="chevron-down" size={14} className={`text-slate-400 transition-transform ${showMobileUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {showMobileUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-charcoal border border-border-dark rounded-lg shadow-xl overflow-hidden z-[70]">
                    <Link
                      href="/profile/orders"
                      onClick={() => setShowMobileUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-white/5 transition-colors"
                    >
                      <Icon name="box" size={16} />
                      Orders
                    </Link>
                    <Link
                      href="/profile/library"
                      onClick={() => setShowMobileUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-white/5 transition-colors"
                    >
                      <Icon name="library" size={16} />
                      Library
                    </Link>
                    <Link
                      href="/profile/wishlist"
                      onClick={() => setShowMobileUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-white/5 transition-colors"
                    >
                      <Icon name="heart" size={16} />
                      Wishlist
                    </Link>
                    <Link
                      href="/profile/wallet"
                      onClick={() => setShowMobileUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-white/5 transition-colors"
                    >
                      <Icon name="wallet" size={16} />
                      Wallet & Credit
                    </Link>
                    <Link
                      href="/profile"
                      onClick={() => setShowMobileUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-white/5 transition-colors"
                    >
                      <Icon name="user" size={16} />
                      Profile
                    </Link>
                    <div className="border-t border-border-dark" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors"
                    >
                      <Icon name="logout" size={16} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                prefetch={true}
                className="md:hidden flex items-center justify-center p-2 text-slate-400 hover:text-primary transition-colors"
                aria-label="Login"
              >
                <Icon name="user-circle" size={22} />
              </Link>
            )}

            {/* Mobile/Tablet: Cart */}
            {showCart && (
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
            )}

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-3 lg:gap-4 text-sm font-medium text-slate-400 flex-shrink-0">
              {/* Notifications (authenticated only) */}
              {isAuthenticated && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                    className="flex items-center justify-center hover:text-primary transition-colors relative"
                    aria-label="Notifications"
                  >
                    <Icon name="bell" size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-[10px] text-white font-bold w-4 h-4 flex items-center justify-center rounded-full">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  <NotificationsDropdown
                    isOpen={showNotificationsDropdown}
                    onClose={() => setShowNotificationsDropdown(false)}
                  />
                </div>
              )}

              {/* Language & Currency */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPreferences(!showPreferences)}
                  aria-label="Change language and currency"
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <div className="relative w-9 h-6">
                    {/* Flag circle (bottom/back) */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface-dark border border-border-dark overflow-hidden flex items-center justify-center">
                      <FlagIcon countryCode={preferences.country.code} className="w-full h-full object-cover" />
                    </div>
                    {/* Currency circle (top/front) */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary text-black flex items-center justify-center text-xs font-bold shadow-md">
                      {preferences.currency.symbol}
                    </div>
                  </div>
                  <Icon name="chevron-down" size={14} className={`text-slate-400 transition-transform ${showPreferences ? 'rotate-180' : ''}`} />
                </button>
                <PreferencesDialog
                  isOpen={showPreferences}
                  onClose={() => setShowPreferences(false)}
                />
              </div>

              {/* User Menu / Login */}
              {isAuthenticated ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                    aria-label="User menu"
                  >
                    {user?.avatar ? (
                      <div className="w-6 h-6 rounded-full overflow-hidden relative ring-2 ring-transparent hover:ring-primary/50 transition-all">
                        <Image src={user.avatar} alt={user.name || 'Profile'} fill className="object-cover" />
                      </div>
                    ) : (
                      <Icon name="user-circle" size={20} />
                    )}
                    <Icon name="chevron-down" size={14} className={`transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-charcoal border border-border-dark rounded-lg shadow-xl overflow-hidden z-[70]">
                      <Link
                        href="/profile/orders"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-white/5 transition-colors"
                      >
                        <Icon name="box" size={16} />
                        Orders
                      </Link>
                      <Link
                        href="/profile/library"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-white/5 transition-colors"
                      >
                        <Icon name="library" size={16} />
                        Library
                      </Link>
                      <Link
                        href="/profile/wishlist"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-white/5 transition-colors"
                      >
                        <Icon name="heart" size={16} />
                        Wishlist
                      </Link>
                      <Link
                        href="/profile/wallet"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-white/5 transition-colors"
                      >
                        <Icon name="wallet" size={16} />
                        Wallet & Credit
                      </Link>
                      <Link
                        href="/profile"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-white/5 transition-colors"
                      >
                        <Icon name="user" size={16} />
                        Profile
                      </Link>
                      <div className="border-t border-border-dark" />
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors"
                      >
                        <Icon name="logout" size={16} />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  prefetch={true}
                  className="flex items-center justify-center hover:text-primary transition-colors"
                  aria-label="Login"
                >
                  <Icon name="user-circle" size={20} />
                </Link>
              )}

              {/* Cart */}
              {showCart && <div className="relative" ref={cartDropdownRef}>
                <div className="flex items-center gap-0.5">
                  <Link
                    href="/cart"
                    prefetch={true}
                    className="flex items-center justify-center hover:text-primary transition-colors relative"
                    aria-label="Cart"
                  >
                    <Icon name="cart" size={20} />
                    {itemCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-primary text-[10px] text-black font-bold w-4 h-4 flex items-center justify-center rounded-full">
                        {itemCount > 99 ? '99+' : itemCount}
                      </span>
                    )}
                  </Link>
                  {itemCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowCartDropdown(!showCartDropdown)}
                      className="hover:text-primary transition-colors"
                      aria-label="Toggle cart dropdown"
                    >
                      <Icon name="chevron-down" size={14} className={`transition-transform ${showCartDropdown ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
                <CartDropdown
                  isOpen={showCartDropdown}
                  onClose={() => setShowCartDropdown(false)}
                />
                <CartPopupWrapper />
              </div>}
            </nav>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {showSearch && <div className="md:hidden border-t border-border-dark bg-background-dark/80 px-3 sm:px-4 py-2">
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
        </div>}


        {/* Mobile Preferences Modal */}
        <div className="md:hidden">
          <PreferencesDialog
            variant="modal"
            isOpen={showPreferences}
            onClose={() => setShowPreferences(false)}
          />
        </div>

        {/* Mobile Notifications Modal */}
        <div className="md:hidden">
          <NotificationsDropdown
            variant="modal"
            isOpen={showNotificationsDropdown}
            onClose={() => setShowNotificationsDropdown(false)}
          />
        </div>
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
            {/* Categories - CMS navigation or default */}
            <nav className="flex-1 overflow-y-auto pt-8 px-5">
              {(headerConfig?.navigation && headerConfig.navigation.length > 0) ? (
                headerConfig.navigation.map((navItem: any, idx: number) => (
                  <MobileNavItem key={idx} item={navItem} pathname={pathname} onClose={closeMobileMenu} />
                ))
              ) : (
                navCategories.map((category) => {
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
                })
              )}
            </nav>

            {/* Bottom Section */}
            <div className="flex-shrink-0">
              {/* Download App */}
              <div className="px-5 py-4 border-t border-[#333]">
                <button
                  type="button"
                  onClick={() => {
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
                  <div className="relative w-10 h-7">
                    {/* Flag circle (bottom/back) */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#1a1a1a] border border-border-dark overflow-hidden flex items-center justify-center">
                      <FlagIcon countryCode={preferences.country.code} className="w-full h-full object-cover" />
                    </div>
                    {/* Currency circle (top/front) */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-primary text-black flex items-center justify-center text-sm font-bold shadow-md">
                      {preferences.currency.symbol}
                    </div>
                  </div>
                  <span className="text-[15px] font-medium">{preferences.language.code.toUpperCase()} / {preferences.currency.code}</span>
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
