'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'

interface NavLink {
  label?: string
  href?: string
}

interface HeaderSectionProps {
  props: {
    showLogo?: boolean
    logoImage?: string
    logoAlignment?: 'left' | 'center' | 'right'
    siteName?: string
    titleFontFamily?: 'default' | 'serif' | 'mono' | 'display'
    titleFontSize?: 'small' | 'medium' | 'large' | 'xlarge'
    titleShadow?: boolean
    navLinks?: NavLink[]
    showSearch?: boolean
    showCart?: boolean
    showLogin?: boolean
    backgroundColor?: string
    sticky?: boolean
    textColor?: string
    padding?: 'none' | 'small' | 'medium' | 'large'
    // Legacy props
    logoText?: string
    logoIcon?: string
  }
}

const fontFamilyClasses: Record<string, string> = {
  default: 'font-sans',
  serif: 'font-serif',
  mono: 'font-mono',
  display: 'font-sans tracking-widest uppercase',
}

const fontSizeClasses: Record<string, string> = {
  small: 'text-sm sm:text-base',
  medium: 'text-base sm:text-lg md:text-xl',
  large: 'text-lg sm:text-xl md:text-2xl',
  xlarge: 'text-xl sm:text-2xl md:text-3xl',
}

export default function HeaderSection({ props }: HeaderSectionProps) {
  const {
    showLogo = true,
    logoImage = '',
    logoAlignment = 'left',
    siteName,
    titleFontFamily = 'default',
    titleFontSize = 'medium',
    titleShadow = false,
    navLinks = [],
    showSearch = true,
    showCart = true,
    showLogin = true,
    backgroundColor,
    sticky = true,
    textColor,
    padding = 'none',
    // Legacy fallbacks
    logoText,
    logoIcon,
  } = props

  const displayName = siteName || logoText || 'Marketplace'

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileMenuOpen])

  const paddingClasses: Record<string, string> = {
    none: '',
    small: 'py-1',
    medium: 'py-2',
    large: 'py-4',
  }

  const titleStyle: React.CSSProperties = {
    color: textColor || undefined,
    textShadow: titleShadow ? '0 2px 8px rgba(0,0,0,0.5)' : undefined,
  }

  const fontClass = fontFamilyClasses[titleFontFamily] || ''
  const sizeClass = fontSizeClasses[titleFontSize] || fontSizeClasses.medium

  // Logo/branding element
  const LogoBrand = (
    <Link
      href="/"
      className={`flex items-center gap-2 font-bold text-primary flex-shrink-0 ${fontClass} ${sizeClass}`}
      style={titleStyle}
    >
      {showLogo && logoImage ? (
        <img
          src={logoImage}
          alt={displayName}
          className="h-8 sm:h-10 w-auto object-contain"
        />
      ) : showLogo && logoIcon ? (
        <span className="hidden md:flex w-6 h-6 items-center justify-center">
          <Icon name={logoIcon} size={24} />
        </span>
      ) : null}
      {displayName && <span>{displayName}</span>}
    </Link>
  )

  // Alignment: left = logo left + nav right (default), center = nav left + logo center + icons right, right = nav left + logo right
  const isCenter = logoAlignment === 'center'
  const isRight = logoAlignment === 'right'

  return (
    <>
      <header
        className={`border-b border-[#1f1f1f] bg-[#0a0a0a]/80 backdrop-blur-md ${
          sticky ? 'sticky top-0 z-50' : ''
        } ${paddingClasses[padding]}`}
        style={{ backgroundColor: backgroundColor || undefined }}
      >
        {/* Main Header Row */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 lg:px-12 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-3 md:gap-4">
          {/* Left Section */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Menu Button */}
            <button
              type="button"
              className="md:hidden flex items-center justify-center p-1.5 text-slate-400 hover:text-primary transition-colors"
              aria-label="Open menu"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Icon name="menu" size={24} />
            </button>

            {/* Logo on left (default) */}
            {!isCenter && !isRight && LogoBrand}

            {/* Nav on left when logo is center or right */}
            {(isCenter || isRight) && (
              <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-sm font-medium text-slate-400" style={{ color: textColor || undefined }}>
                {navLinks.map((link, index) => (
                  link.label && link.href && (
                    <Link key={index} href={link.href} className="hover:text-primary transition-colors">
                      {link.label}
                    </Link>
                  )
                ))}
              </nav>
            )}
          </div>

          {/* Center Section (logo when centered) */}
          {isCenter && (
            <div className="flex-1 flex justify-center">
              {LogoBrand}
            </div>
          )}

          {/* Desktop Search Bar (only for left alignment) */}
          {!isCenter && !isRight && showSearch && (
            <div className="hidden md:flex flex-1 min-w-0 max-w-xl relative z-[60] mx-4 lg:mx-8">
              <div className="relative w-full">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-20 pointer-events-none">
                  <Icon name="search" size={20} />
                </span>
                <input
                  type="text"
                  placeholder="Search for products..."
                  className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg py-2.5 pl-10 pr-4 text-sm placeholder:text-slate-500 text-slate-200 focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                />
              </div>
            </div>
          )}

          {/* Spacer for left-aligned layout */}
          {!isCenter && !isRight && <div className="flex-grow hidden md:block" />}

          {/* Right Section */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Mobile Icons */}
            {showLogin && (
              <Link
                href="/login"
                className="md:hidden flex items-center justify-center p-2 text-slate-400 hover:text-primary transition-colors"
                aria-label="Login"
              >
                <Icon name="user-circle" size={22} />
              </Link>
            )}

            {showCart && (
              <Link
                href="/cart"
                className="md:hidden flex items-center justify-center p-2 text-slate-400 hover:text-primary transition-colors relative"
                aria-label="Cart"
              >
                <Icon name="cart" size={22} />
              </Link>
            )}

            {/* Logo on right */}
            {isRight && LogoBrand}

            {/* Desktop Navigation (only for left alignment) */}
            {!isCenter && !isRight && (
              <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-sm font-medium text-slate-400 flex-shrink-0" style={{ color: textColor || undefined }}>
                {navLinks.map((link, index) => (
                  link.label && link.href && (
                    <Link key={index} href={link.href} className="hover:text-primary transition-colors">
                      {link.label}
                    </Link>
                  )
                ))}

                {showLogin && (
                  <Link href="/login" className="flex items-center gap-1.5 hover:text-primary transition-colors">
                    <Icon name="user-circle" size={20} />
                    Login
                  </Link>
                )}

                {showCart && (
                  <Link href="/cart" className="flex items-center gap-1.5 hover:text-primary transition-colors">
                    <Icon name="cart" size={20} />
                    Cart
                  </Link>
                )}
              </nav>
            )}

            {/* Icons for center/right alignment */}
            {(isCenter || isRight) && (
              <div className="hidden md:flex items-center gap-3 text-slate-400" style={{ color: textColor || undefined }}>
                {showSearch && (
                  <button className="p-2 hover:text-primary transition-colors" aria-label="Search">
                    <Icon name="search" size={20} />
                  </button>
                )}
                {showLogin && (
                  <Link href="/login" className="p-2 hover:text-primary transition-colors" aria-label="Login">
                    <Icon name="user-circle" size={20} />
                  </Link>
                )}
                {showCart && (
                  <Link href="/cart" className="p-2 hover:text-primary transition-colors" aria-label="Cart">
                    <Icon name="cart" size={20} />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Search Bar */}
        {showSearch && (
          <div className="md:hidden border-t border-[#1f1f1f] bg-[#0a0a0a]/80 px-3 sm:px-4 py-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Icon name="search" size={18} />
              </span>
              <input
                type="text"
                placeholder="Search for products..."
                className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg py-2.5 pl-9 pr-4 text-sm placeholder:text-slate-500 text-slate-200 focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
          </div>
        )}
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer */}
          <nav
            className="absolute top-0 left-0 bottom-0 w-72 bg-[#0d0d0d] border-r border-[#1f1f1f] flex flex-col animate-slide-in-left"
            style={{ animation: 'slideInLeft 0.25s ease-out' }}
            role="dialog"
            aria-label="Mobile navigation"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-[#1f1f1f]">
              {showLogo && logoImage ? (
                <img src={logoImage} alt={displayName} className="h-8 w-auto object-contain" />
              ) : (
                <span className="text-primary font-bold text-lg">{displayName}</span>
              )}
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white transition-colors"
                aria-label="Close menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Nav Links */}
            <div className="flex-1 overflow-y-auto py-4">
              {navLinks.map((link, index) => (
                link.label && link.href && (
                  <Link
                    key={index}
                    href={link.href}
                    className="flex items-center px-4 py-3 text-slate-300 hover:text-primary hover:bg-white/5 transition-colors text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                )
              ))}
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-[#1f1f1f] p-4 space-y-2">
              {showLogin && (
                <Link
                  href="/login"
                  className="flex items-center gap-2 px-3 py-2.5 text-slate-300 hover:text-primary hover:bg-white/5 rounded-lg transition-colors text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon name="user-circle" size={18} />
                  Login
                </Link>
              )}
              {showCart && (
                <Link
                  href="/cart"
                  className="flex items-center gap-2 px-3 py-2.5 text-slate-300 hover:text-primary hover:bg-white/5 rounded-lg transition-colors text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon name="cart" size={18} />
                  Cart
                </Link>
              )}
            </div>
          </nav>

          <style jsx>{`
            @keyframes slideInLeft {
              from { transform: translateX(-100%); }
              to { transform: translateX(0); }
            }
          `}</style>
        </div>
      )}
    </>
  )
}