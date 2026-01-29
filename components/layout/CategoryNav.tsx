'use client'

import Link from 'next/link'
import { navCategories } from '@/lib/mock-data'

interface CategoryNavProps {
  activeCategory?: string
}

export default function CategoryNav({ activeCategory }: CategoryNavProps) {
  return (
    <div className="border-b border-border-dark bg-background-dark">
      <div className="max-w-container mx-auto px-8 lg:px-12 h-14 flex items-center justify-between">
        {/* Category Links */}
        <nav className="flex items-center gap-1 text-sm font-medium text-slate-400 overflow-x-auto no-scrollbar -ml-2">
          {navCategories.map((category) => (
            <Link
              key={category.label}
              href={category.href}
              className={`whitespace-nowrap px-3 py-1 hover:text-primary transition-colors ${
                activeCategory === category.label ? 'text-primary' : ''
              }`}
            >
              {category.label}
            </Link>
          ))}
        </nav>

        {/* Download App Button */}
        <button className="bg-primary text-black text-xs font-bold px-4 py-2 rounded-lg hover:brightness-105 transition-all flex-shrink-0 flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">download</span>
          Download App
        </button>
      </div>
    </div>
  )
}
