'use client'

import { Suspense } from 'react'
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
  const handleGetApp = () => {
    // App not yet available
  }

  return (
    <div className="hidden md:block border-b border-border-dark bg-background-dark">
      <div className="max-w-container mx-auto px-3 sm:px-4 md:px-8 lg:px-12 h-12 md:h-14 flex items-center justify-between gap-2">
        {/* Category Links wrapped in Suspense */}
        <Suspense fallback={<CategoryLinksFallback />}>
          <CategoryLinks />
        </Suspense>

        {/* Get App Button */}
        <button
          type="button"
          onClick={handleGetApp}
          className="bg-primary text-black text-xs font-bold px-4 py-2 rounded-lg hover:brightness-105 transition-all flex-shrink-0 flex items-center gap-1.5"
        >
          <span className="flex w-4 h-4 items-center justify-center [&>svg]:w-full [&>svg]:h-full">
            <Icon name="download" size={16} />
          </span>
          Get App
        </button>
      </div>
    </div>
  )
}
