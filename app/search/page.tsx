'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import CategoryNav from '@/components/layout/CategoryNav'
import Footer from '@/components/layout/Footer'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import Icon from '@/components/ui/Icon'
import FilterSidebar, { FilterState } from '@/components/filters/FilterSidebar'
import { searchApi, SearchResult, categoriesApi } from '@/lib/api'
import { useCart } from '@/lib/cart-context'
import { formatPrice } from '@/lib/currency'

type SortOption = 'popular' | 'newest' | 'price-low' | 'price-high'

// Only show verified categories in search sidebar
const VERIFIED_CATEGORY_SLUGS = ['gift-cards', 'cards', 'esim', 'virtual-numbers', 'scripts']

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
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    categories: categoryParam ? [categoryParam] : [],
    tags: [],
    priceRange: 1000,
    minRating: 0,
  })
  const [products, setProducts] = useState<SearchResult[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalResults, setTotalResults] = useState(0)

  // Fetch categories (filtered to verified only)
  useEffect(() => {
    const fetchCategories = async () => {
      const result = await categoriesApi.list()
      if (result.success && result.data) {
        // Filter to only show verified categories
        const verifiedCategories = result.data.filter(
          c => VERIFIED_CATEGORY_SLUGS.includes(c.slug)
        )
        setCategories(verifiedCategories)
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
      q: searchQuery || undefined,
      categories: activeFilters.categories.length > 0 ? activeFilters.categories : undefined,
      maxPrice: activeFilters.priceRange < 1000 ? activeFilters.priceRange : undefined,
      minRating: activeFilters.minRating > 0 ? activeFilters.minRating : undefined,
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
  }, [searchQuery, activeFilters, sortBy, page])

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

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [activeFilters])

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

      {/* Mobile Filter Pills */}
      <div className="lg:hidden mb-6">
        <FilterSidebar
          variant="inline"
          onFilterChange={setActiveFilters}
          categories={categories.map(c => ({ id: c.id, name: c.name, slug: c.slug }))}
          sortBy={sortBy}
          onSortChange={(v) => handleSortChange(v as SortOption)}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Desktop Filter Sidebar */}
        <div className="hidden lg:block">
          <FilterSidebar
            onFilterChange={setActiveFilters}
            categories={categories.map(c => ({ id: c.id, name: c.name, slug: c.slug }))}
          />
        </div>

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
                href="/scripts"
                className="inline-flex items-center gap-2 bg-primary text-black font-bold px-6 py-3 rounded-xl hover:brightness-105 transition-all"
              >
                Browse All Products
                <Icon name="arrow-right" size={18} />
              </Link>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && products.length > 0 && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2 py-1 bg-surface-dark border border-border-dark rounded text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon name="chevron-left" size={14} />
                </button>
                <span className="text-xs text-slate-400 px-2">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2 py-1 bg-surface-dark border border-border-dark rounded text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon name="chevron-right" size={14} />
                </button>
              </div>
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
