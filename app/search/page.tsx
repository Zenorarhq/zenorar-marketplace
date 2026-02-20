'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import CategoryNav from '@/components/layout/CategoryNav'
import Footer from '@/components/layout/Footer'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import Icon from '@/components/ui/Icon'
import { searchApi, SearchResult, categoriesApi } from '@/lib/api'
import { useCart } from '@/lib/cart-context'
import { formatPrice } from '@/lib/currency'

type SortOption = 'popular' | 'newest' | 'price-low' | 'price-high'

interface Category {
  id: string
  name: string
  slug: string
}

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const searchQuery = searchParams.get('q') || ''
  const categoryParam = searchParams.get('category') || ''
  const { addItem, showAddedToCartPopup } = useCart()

  const [sortBy, setSortBy] = useState<SortOption>('popular')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(categoryParam ? [categoryParam] : [])
  const [priceRange, setPriceRange] = useState(1000)
  const [minRating, setMinRating] = useState(0)
  const [products, setProducts] = useState<SearchResult[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalResults, setTotalResults] = useState(0)

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      const result = await categoriesApi.list()
      if (result.success && result.data) {
        setCategories(result.data)
      }
    }
    fetchCategories()
  }, [])

  // Fetch search results
  const fetchResults = useCallback(async () => {
    setIsLoading(true)

    const sortMap: Record<SortOption, string> = {
      'popular': 'relevance',
      'newest': 'newest',
      'price-low': 'price_asc',
      'price-high': 'price_desc',
    }

    const result = await searchApi.searchProducts({
      query: searchQuery || undefined,
      categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      maxPrice: priceRange < 1000 ? priceRange : undefined,
      minRating: minRating > 0 ? minRating : undefined,
      sortBy: sortMap[sortBy],
      page,
      limit: 12,
    })

    if (result.success && result.data) {
      setProducts(result.data)
      if (result.pagination) {
        setTotalResults(result.pagination.total)
        setTotalPages(result.pagination.totalPages)
      } else {
        setTotalResults(result.data.length)
        setTotalPages(1)
      }
    } else {
      setProducts([])
      setTotalResults(0)
    }

    setIsLoading(false)
  }, [searchQuery, selectedCategories, priceRange, minRating, sortBy, page])

  useEffect(() => {
    fetchResults()
  }, [fetchResults])

  const handleAddToCart = async (product: SearchResult) => {
    await addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      price: Number(product.price),
      rating: 0,
      reviewCount: product.reviewCount,
      category: product.category?.name || '',
      icon: 'package',
      iconColor: 'text-primary',
      tags: [],
      image: product.image || undefined,
    }, 'standard')
    showAddedToCartPopup({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      price: Number(product.price),
      rating: 0,
      reviewCount: product.reviewCount,
      category: product.category?.name || '',
      icon: 'package',
      iconColor: 'text-primary',
      tags: [],
      image: product.image || undefined,
    }, Number(product.price))
  }

  const toggleCategory = (categorySlug: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categorySlug)
        ? prev.filter((c) => c !== categorySlug)
        : [...prev, categorySlug]
    )
    setPage(1)
  }

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort)
    setPage(1)
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
                {categories.map((category) => (
                  <label key={category.id} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.slug)}
                      onChange={() => toggleCategory(category.slug)}
                      className="w-4 h-4 rounded border-border-dark bg-transparent text-primary focus:ring-primary focus:ring-offset-0"
                    />
                    <span className="text-sm text-slate-300 group-hover:text-white">
                      {category.name}
                    </span>
                  </label>
                ))}
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
                onChange={(e) => {
                  setPriceRange(Number(e.target.value))
                  setPage(1)
                }}
                className="w-full h-1.5 bg-border-dark rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between mt-3 text-xs text-slate-400">
                <span>$0</span>
                <span>{priceRange >= 1000 ? 'Any' : `$${priceRange}`}</span>
              </div>
            </div>

            {/* Rating Filter */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold mb-4">Rating</h4>
              <div className="space-y-3">
                {[4, 3, 2, 0].map((rating) => (
                  <label
                    key={rating}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="radio"
                      name="rating"
                      checked={minRating === rating}
                      onChange={() => {
                        setMinRating(rating)
                        setPage(1)
                      }}
                      className="w-4 h-4 border-border-dark bg-transparent text-primary focus:ring-primary focus:ring-offset-0"
                    />
                    {rating > 0 ? (
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
                    ) : (
                      <span className="text-sm text-slate-300">Any Rating</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setSelectedCategories([])
                setPriceRange(1000)
                setMinRating(0)
                setPage(1)
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
                {isLoading ? 'Searching...' : `${totalResults} results found`}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-500">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as SortOption)}
                className="bg-charcoal border border-border-dark rounded-lg text-sm px-3 py-1.5 focus:ring-primary focus:border-primary text-slate-300"
              >
                <option value="popular">Most Relevant</option>
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Icon name="loading" size={40} className="animate-spin text-primary" />
            </div>
          )}

          {/* Results Grid */}
          {!isLoading && products.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-charcoal rounded-xl border border-border-dark overflow-hidden group hover:border-primary/50 transition-all"
                >
                  {product.image && (
                    <div className="aspect-video bg-surface-dark overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    {!product.image && (
                      <div className="w-12 h-12 mb-4 bg-primary/10 rounded-lg flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Icon name="package" size={24} />
                      </div>
                    )}
                    <Link href={`/products/${product.slug}`}>
                      <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                    </Link>
                    {product.category && (
                      <span className="text-xs text-slate-500 mb-2 block">{product.category.name}</span>
                    )}
                    <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-white">
                        {formatPrice(Number(product.price))}
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
          )}

          {/* No Results */}
          {!isLoading && products.length === 0 && (
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
          {!isLoading && products.length > 0 && totalPages > 1 && (
            <div className="flex justify-center mt-12 gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-border-dark hover:border-primary transition-colors disabled:opacity-50"
              >
                <Icon name="chevron-left" size={18} />
              </button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = i + 1
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg ${
                      page === pageNum
                        ? 'bg-primary text-black font-bold'
                        : 'border border-border-dark hover:border-primary transition-colors'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-border-dark hover:border-primary transition-colors disabled:opacity-50"
              >
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
