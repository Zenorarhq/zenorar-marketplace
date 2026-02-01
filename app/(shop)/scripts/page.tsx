'use client'

import { useState, useMemo } from 'react'
import Icon from '@/components/ui/Icon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import FilterSidebar from '@/components/filters/FilterSidebar'
import ScriptCard from '@/components/cards/ScriptCard'
import { scriptProducts } from '@/lib/mock-data'

type SortOption = 'popular' | 'newest' | 'price-low' | 'price-high'

export default function ScriptsPage() {
  const [sortBy, setSortBy] = useState<SortOption>('popular')
  const [visibleCount, setVisibleCount] = useState(6)
  const [isLoading, setIsLoading] = useState(false)

  const sortedProducts = useMemo(() => {
    const products = [...scriptProducts]

    switch (sortBy) {
      case 'newest':
        // In a real app, we'd sort by date
        return products.reverse()
      case 'price-low':
        return products.sort((a, b) => a.price - b.price)
      case 'price-high':
        return products.sort((a, b) => b.price - a.price)
      case 'popular':
      default:
        return products.sort((a, b) => b.reviewCount - a.reviewCount)
    }
  }, [sortBy])

  const visibleProducts = sortedProducts.slice(0, visibleCount)
  const hasMore = visibleCount < sortedProducts.length

  const handleShowMore = async () => {
    setIsLoading(true)
    // Simulate loading
    await new Promise(resolve => setTimeout(resolve, 300))
    setVisibleCount((prev) => Math.min(prev + 6, sortedProducts.length))
    setIsLoading(false)
  }

  return (
    <main className="max-w-container mx-auto px-8 lg:px-12 pb-24">
      {/* Breadcrumbs */}
      <div className="py-4">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Scripts' }
          ]}
          className="mb-0"
        />
      </div>

      {/* Page Header */}
      <header className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-white mb-2">Premium Scripts</h1>
          <p className="text-slate-500 max-w-2xl">
            High-performance automation tools, scrapers, and full-stack kits developed by industry experts.
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <label htmlFor="sort-by" className="text-slate-500">Sort by:</label>
          <select
            id="sort-by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-surface-dark border-border-dark rounded-lg text-slate-300 text-sm focus:ring-primary focus:border-primary px-3 py-2"
          >
            <option value="popular">Most Popular</option>
            <option value="newest">Newest</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex gap-8">
        {/* Sidebar */}
        <FilterSidebar />

        {/* Product Grid */}
        <div className="flex-grow">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleProducts.map((product) => (
              <ScriptCard key={product.id} product={product} />
            ))}
          </div>

          {/* Show More Button */}
          {hasMore && (
            <div className="mt-16 flex justify-center">
              <button
                type="button"
                onClick={handleShowMore}
                disabled={isLoading}
                className="bg-surface-dark border border-border-dark text-white px-8 py-3 rounded-xl font-bold hover:border-primary transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Show More Results'}
                {!isLoading && (
                  <Icon name="chevron-down" size={16} />
                )}
              </button>
            </div>
          )}

          {/* Results count */}
          <p className="mt-8 text-center text-slate-500 text-sm">
            Showing {visibleProducts.length} of {sortedProducts.length} products
          </p>
        </div>
      </div>
    </main>
  )
}
