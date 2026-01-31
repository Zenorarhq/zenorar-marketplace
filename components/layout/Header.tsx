'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/lib/cart-context'

export default function Header() {
  const { itemCount } = useCart()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  return (
    <header className="border-b border-border-dark bg-background-dark/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-container mx-auto px-8 lg:px-12 h-16 flex items-center justify-start gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary flex-shrink-0 mr-4"
        >
          <span className="material-symbols-outlined text-2xl">grid_view</span>
          Marketplace
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="w-full max-w-md relative">
          <label htmlFor="header-search" className="sr-only">
            Search products
          </label>
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
            search
          </span>
          <input
            id="header-search"
            name="search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Scripts, eSIMs, Numbers..."
            className="w-full bg-surface-dark border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-500 text-slate-200"
          />
        </form>

        {/* Spacer */}
        <div className="flex-grow" />

        {/* Navigation */}
        <nav className="flex items-center gap-8 text-sm font-medium text-slate-400 flex-shrink-0">
          <Link
            href="/help"
            className="flex items-center gap-1.5 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">help</span>
            Help
          </Link>

          <Link
            href="/login"
            className="flex items-center gap-1.5 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">account_circle</span>
            Login
          </Link>

          <Link
            href="/cart"
            className="flex items-center gap-1.5 hover:text-primary transition-colors relative"
          >
            <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
            Cart
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-primary text-[10px] text-black font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            aria-label="Change language and currency"
            className="flex items-center gap-1.5 hover:text-primary transition-colors uppercase tracking-wider text-[11px] border border-border-dark px-2.5 py-1 rounded-md bg-surface-dark"
          >
            <span className="material-symbols-outlined text-[16px]">language</span>
            EN/BTC
          </button>
        </nav>
      </div>
    </header>
  )
}
