'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Icon from '@/components/ui/Icon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import FilterSidebar, { FilterState } from '@/components/filters/FilterSidebar'
import ProductCard from '@/components/cards/ProductCard'
import { productsApi } from '@/lib/api/products'
import { categoriesApi } from '@/lib/api/categories'
import { Product } from '@/lib/types'

type SortOption = 'popular' | 'newest' | 'price-low' | 'price-high'

function mapProduct(p: any): Product {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description || p.shortDescription || '',
    price: p.price,
    rating: p.avgRating || p.averageRating || 0,
    reviewCount: p._count?.reviews || p.reviewCount || 0,
    category: p.category?.name || 'Scripts',
    icon: 'code',
    iconColor: 'primary',
    tags: p.tags || [],
    images: p.images?.map((img: any) => ({ url: img.url, isPrimary: img.isPrimary })) || [],
  }
}

function getSortParams(sortBy: SortOption) {
  switch (sortBy) {
    case 'newest': return { sortBy: 'createdAt', sortOrder: 'desc' as const }
    case 'price-low': return { sortBy: 'price', sortOrder: 'asc' as const }
    case 'price-high': return { sortBy: 'price', sortOrder: 'desc' as const }
    case 'popular':
    default: return { sortBy: 'sales', sortOrder: 'desc' as const }
  }
}

export default function ScriptsPage() {
  const [sortBy, setSortBy] = useState<SortOption>('popular')
  const [visibleCount, setVisibleCount] = useState(6)
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    categories: [],
    tags: [],
    priceRange: 1000,
    minRating: 0,
  })

  const sortParams = getSortParams(sortBy)

  // Fetch sub-categories of "Scripts"
  const { data: subCategories = [] } = useQuery({
    queryKey: ['scripts-subcategories'],
    queryFn: async () => {
      const result = await categoriesApi.getBySlug('scripts')
      if (result.success && result.data && result.data.children) {
        return result.data.children.map((c: any) => ({ id: c.id, name: c.name, slug: c.slug }))
      }
      return []
    },
  })

  // Fetch products with filters
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['scripts-products', sortParams.sortBy, sortParams.sortOrder, activeFilters],
    queryFn: async () => {
      const filters: any = {
        sortBy: sortParams.sortBy,
        sortOrder: sortParams.sortOrder,
        limit: 50,
      }

      if (activeFilters.priceRange < 1000) {
        filters.maxPrice = activeFilters.priceRange
      }
      if (activeFilters.minRating > 0) {
        filters.minRating = activeFilters.minRating
      }
      if (activeFilters.tags.length > 0) {
        filters.tags = activeFilters.tags.join(',')
      }
      if (activeFilters.categories.length > 0) {
        filters.categoryIds = activeFilters.categories.join(',')
      }

      filters.category = 'scripts'
      const result = await productsApi.listPublic(filters)
      if (result.success && result.data) {
        return result.data.map(mapProduct)
      }
      return []
    },
  })

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(6)
  }, [activeFilters])

  // Derive unique tags from fetched products
  const uniqueTags = [...new Set(products.flatMap((p: any) => p.tags || []))]

  const visibleProducts = products.slice(0, visibleCount)
  const hasMore = visibleCount < products.length

  return (
    <main className="max-w-container mx-auto px-4 lg:px-12 pb-24">
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
      <div className="bg-gradient-to-r from-[#43D678]/20 via-[#43D678]/10 to-transparent rounded-2xl lg:rounded-3xl p-6 lg:p-12 mb-8 lg:mb-12">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl lg:text-4xl font-extrabold text-white mb-2">Premium Scripts</h1>
            <p className="text-slate-500 text-sm lg:text-base max-w-2xl">
              High-performance automation tools, scrapers, and full-stack kits developed by industry experts.
            </p>
          </div>

          <div className="hidden lg:flex items-center gap-3 text-sm">
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
      </div>

      {/* Mobile Filter Pills */}
      <div className="lg:hidden mb-6">
        <FilterSidebar
          variant="inline"
          onFilterChange={setActiveFilters}
          categories={subCategories}
          availableTags={uniqueTags}
          sortBy={sortBy}
          onSortChange={(v) => setSortBy(v as SortOption)}
        />
      </div>

      {/* Main Content */}
      <div className="flex gap-8">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <FilterSidebar
            onFilterChange={setActiveFilters}
            categories={subCategories}
            availableTags={uniqueTags}
          />
        </div>

        {/* Product Grid */}
        <div className="flex-grow">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-slate-400">Loading scripts...</p>
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-24">
              <Icon name="code" size={64} className="text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No scripts found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                {visibleProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Show More Button */}
              {hasMore && (
                <div className="mt-16 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 6)}
                    className="bg-surface-dark border border-border-dark text-white px-8 py-3 rounded-xl font-bold hover:border-primary transition-all flex items-center gap-2"
                  >
                    Show More Results
                    <Icon name="chevron-down" size={16} />
                  </button>
                </div>
              )}

              {/* Results count */}
              <p className="mt-8 text-center text-slate-500 text-sm">
                Showing {visibleProducts.length} of {products.length} products
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
