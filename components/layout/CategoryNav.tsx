'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { navCategories } from '@/lib/mock-data'

export default function CategoryNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentCategory = searchParams.get('category')

  const handleDownloadApp = () => {
    // TODO: Implement app download modal or redirect to app store
    window.open('/download', '_blank')
  }

  return (
    <div className="border-b border-border-dark bg-background-dark">
      <div className="max-w-container mx-auto px-8 lg:px-12 h-14 flex items-center justify-between">
        {/* Category Links */}
        <nav aria-label="Product categories" className="flex items-center gap-1 text-sm font-medium text-slate-400 overflow-x-auto no-scrollbar -ml-2">
          {navCategories.map((category) => {
            const categorySlug = category.href.split('category=')[1]
            const isActive = pathname === '/products' && currentCategory === categorySlug

            return (
              <Link
                key={category.label}
                href={category.href}
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

        {/* Download App Button */}
        <button
          type="button"
          onClick={handleDownloadApp}
          className="bg-primary text-black text-xs font-bold px-4 py-2 rounded-lg hover:brightness-105 transition-all flex-shrink-0 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg" aria-hidden="true">download</span>
          Download App
        </button>
      </div>
    </div>
  )
}
