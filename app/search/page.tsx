'use client'

import { useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import CategoryNav from '@/components/layout/CategoryNav'
import Footer from '@/components/layout/Footer'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import Icon from '@/components/ui/Icon'
import { scriptProducts } from '@/lib/mock-data'
import { useCart } from '@/lib/cart-context'

type SortOption = 'popular' | 'newest' | 'price-low' | 'price-high'

function SearchContent() {
  const searchParams = useSearchParams()
  const searchQuery = searchParams.get('q') || ''
  const { addItem, showAddedToCartPopup } = useCart()

  const [sortBy, setSortBy] = useState<SortOption>('popular')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['scripts'])
  const [priceRange, setPriceRange] = useState(500)
  const [minRating, setMinRating] = useState(4)

  const filteredProducts = useMemo(() => {
    let products = [...scriptProducts]

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.tags?.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // Filter by price
    products = products.filter((p) => p.price <= priceRange)

    // Filter by rating
    products = products.filter((p) => p.rating >= minRating)

    // Sort (use spread to avoid mutating)
    switch (sortBy) {
      case 'newest':
        return [...products].reverse()
      case 'price-low':
        return [...products].sort((a, b) => a.price - b.price)
      case 'price-high':
        return [...products].sort((a, b) => b.price - a.price)
      case 'popular':
      default:
        return [...products].sort((a, b) => b.reviewCount - a.reviewCount)
    }
  }, [searchQuery, sortBy, priceRange, minRating])

  const handleAddToCart = (product: typeof scriptProducts[0]) => {
    addItem(product, 'standard')
    showAddedToCartPopup(product, product.price)
  }

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    )
  }

  return (
    <main className="flex-grow max-w-container mx-auto px-8 lg:px-12 pb-24 w-full">
      <div className="py-4">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Search Results' },
          ]}
          className="mb-0"
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filter Sidebar */}
        <aside className="w-full lg:w-72 flex-shrink-0 space-y-6">
          <div className="bg-charcoal border border-border-dark rounded-xl p-6">
            <h3 className="font-bold text-sm mb-6 uppercase tracking-wider text-slate-400">
              Filters
            </h3>

            {/* Category Filter */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold mb-4">Category</h4>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes('scripts')}
                    onChange={() => toggleCategory('scripts')}
                    className="w-4 h-4 rounded border-border-dark bg-transparent text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <span className="text-sm text-slate-300 group-hover:text-white">
                    Scripts
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes('esims')}
                    onChange={() => toggleCategory('esims')}
                    className="w-4 h-4 rounded border-border-dark bg-transparent text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <span className="text-sm text-slate-300 group-hover:text-white">
                    eSIMs
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes('virtual-numbers')}
                    onChange={() => toggleCategory('virtual-numbers')}
                    className="w-4 h-4 rounded border-border-dark bg-transparent text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <span className="text-sm text-slate-300 group-hover:text-white">
                    Virtual Numbers
                  </span>
                </label>
              </div>
            </div>

            {/* Price Range */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold mb-4">Price Range</h4>
              <input
                type="range"
                min="0"
                max="1000"
                value={priceRange}
                onChange={(e) => setPriceRange(Number(e.target.value))}
                className="w-full h-1.5 bg-border-dark rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between mt-3 text-xs text-slate-400">
                <span>$0</span>
                <span>${priceRange}+</span>
              </div>
            </div>

            {/* Rating Filter */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold mb-4">Rating</h4>
              <div className="space-y-3">
                {[4, 3, 2].map((rating) => (
                  <label
                    key={rating}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="radio"
                      name="rating"
                      checked={minRating === rating}
                      onChange={() => setMinRating(rating)}
                      className="w-4 h-4 border-border-dark bg-transparent text-primary focus:ring-primary focus:ring-offset-0"
                    />
                    <div className="flex items-center gap-1 text-yellow-500">
                      {[...Array(5)].map((_, i) => (
                        <Icon
                          key={i}
                          name="star"
                          size={12}
                          className={i < rating ? 'text-yellow-500' : 'text-slate-600'}
                        />
                      ))}
                      <span className="text-xs text-slate-300 ml-1">& Up</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setSelectedCategories(['scripts'])
                setPriceRange(500)
                setMinRating(4)
              }}
              className="w-full text-sm text-slate-400 hover:text-primary transition-colors"
            >
              Clear all filters
            </button>
          </div>
        </aside>

        {/* Results Section */}
        <section className="flex-1">
          <div className="flex items-baseline justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">
                {searchQuery
                  ? `Search results for "${searchQuery}"`
                  : 'All Products'}
              </h1>
              <p className="text-sm text-slate-500">
                {filteredProducts.length} results found
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-500">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-charcoal border border-border-dark rounded-lg text-sm px-3 py-1.5 focus:ring-primary focus:border-primary text-slate-300"
              >
                <option value="popular">Most Popular</option>
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Results Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-charcoal rounded-xl border border-border-dark overflow-hidden group hover:border-primary/50 transition-all"
                >
                  <div className="p-5">
                    <div className="w-12 h-12 mb-4 bg-primary/10 rounded-lg flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Icon name={product.icon || 'code'} size={24} />
                    </div>
                    <Link href={`/products/${product.slug}`}>
                      <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-1 text-yellow-500 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Icon
                          key={i}
                          name="star"
                          size={12}
                          className={
                            i < Math.floor(product.rating)
                              ? 'text-yellow-500'
                              : 'text-slate-600'
                          }
                        />
                      ))}
                      <span className="text-xs text-slate-500 ml-1">
                        ({product.reviewCount})
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-white">
                        ${product.price.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="p-2 rounded-lg bg-surface-dark border border-border-dark hover:bg-primary hover:text-black transition-colors"
                      >
                        <Icon name="cart" size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Icon name="search" size={60} className="text-slate-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">No results found</h2>
              <p className="text-slate-400 mb-6">
                Try adjusting your search or filters to find what you&apos;re looking for.
              </p>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-primary text-black font-bold px-6 py-3 rounded-xl hover:brightness-105 transition-all"
              >
                Browse All Products
                <Icon name="arrow-right" size={18} />
              </Link>
            </div>
          )}

          {/* Pagination */}
          {filteredProducts.length > 0 && (
            <div className="flex justify-center mt-12 gap-2">
              <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-border-dark hover:border-primary transition-colors">
                <Icon name="chevron-left" size={18} />
              </button>
              <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary text-black font-bold">
                1
              </button>
              <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-border-dark hover:border-primary transition-colors">
                2
              </button>
              <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-border-dark hover:border-primary transition-colors">
                3
              </button>
              <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-border-dark hover:border-primary transition-colors">
                <Icon name="chevron-right" size={18} />
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      <Header />
      <CategoryNav />
      <Suspense fallback={<div className="flex-grow flex items-center justify-center"><Icon name="loading" size={40} className="animate-spin text-primary" /></div>}>
        <SearchContent />
      </Suspense>
      <Footer />
    </div>
  )
}
