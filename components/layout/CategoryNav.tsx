'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { navCategories } from '@/lib/mock-data'
import Icon from '@/components/ui/Icon'

function CategoryLinks() {
  const pathname = usePathname()

  return (
    <nav aria-label="Product categories" className="flex items-center gap-1 text-sm font-medium text-slate-400 -ml-2">
      {navCategories.map((category) => {
        const isActive = pathname === category.href

        return (
          <Link
            key={category.label}
            href={category.href}
            prefetch={true}
            className={`whitespace-nowrap px-3 py-1 hover:text-primary transition-colors ${
              isActive ? 'text-primary' : ''
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {category.label}
          </Link>
        )
      })}
    </nav>
  )
}

function CategoryLinksFallback() {
  return (
    <nav aria-label="Product categories" className="flex items-center gap-1 text-sm font-medium text-slate-400 -ml-2">
      {navCategories.map((category) => (
        <Link
          key={category.label}
          href={category.href}
          prefetch={true}
          className="whitespace-nowrap px-3 py-1 hover:text-primary transition-colors"
        >
          {category.label}
        </Link>
      ))}
    </nav>
  )
}

export default function CategoryNav() {
  const [showAppModal, setShowAppModal] = useState(false)

  return (
    <>
      <div className="hidden md:block border-b border-border-dark bg-background-dark">
        <div className="max-w-container mx-auto px-3 sm:px-4 md:px-8 lg:px-12 h-12 md:h-14 flex items-center justify-between gap-2">
          {/* Category Links wrapped in Suspense */}
          <Suspense fallback={<CategoryLinksFallback />}>
            <CategoryLinks />
          </Suspense>

          {/* Get App Button */}
          <button
            type="button"
            onClick={() => setShowAppModal(true)}
            className="bg-primary text-black text-xs font-bold px-4 py-2 rounded-lg hover:brightness-105 transition-all flex-shrink-0 flex items-center gap-1.5"
          >
            <span className="flex w-4 h-4 items-center justify-center [&>svg]:w-full [&>svg]:h-full">
              <Icon name="download" size={16} />
            </span>
            Get App
          </button>
        </div>
      </div>

      {/* App Coming Soon Modal */}
      {showAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAppModal(false)} />
          <div className="relative bg-[#121212] border border-border-dark rounded-2xl w-full max-w-md p-8 text-center shadow-2xl">
            {/* Close */}
            <button
              onClick={() => setShowAppModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
            >
              <Icon name="x" size={20} />
            </button>

            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
              <Icon name="smartphone" size={32} className="text-primary" />
            </div>

            {/* Heading */}
            <h2 className="text-2xl font-bold text-white mb-2">Mobile App Coming Soon</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              We're crafting a dedicated mobile experience for Zenorar — bringing your digital products,
              eSIMs, gift cards, and more to iOS and Android. Our app is currently in active development
              and will be available shortly.
            </p>

            {/* Store Badges (placeholder) */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-dark border border-border-dark rounded-xl opacity-50 cursor-not-allowed select-none">
                <Icon name="smartphone" size={18} className="text-slate-400" />
                <div className="text-left">
                  <p className="text-[9px] text-slate-500 leading-none">Available on the</p>
                  <p className="text-xs font-semibold text-slate-300 leading-tight">App Store</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-dark border border-border-dark rounded-xl opacity-50 cursor-not-allowed select-none">
                <Icon name="smartphone" size={18} className="text-slate-400" />
                <div className="text-left">
                  <p className="text-[9px] text-slate-500 leading-none">Get it on</p>
                  <p className="text-xs font-semibold text-slate-300 leading-tight">Google Play</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowAppModal(false)}
              className="w-full py-3 bg-primary text-black font-bold rounded-xl hover:brightness-105 transition-all"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  )
}
