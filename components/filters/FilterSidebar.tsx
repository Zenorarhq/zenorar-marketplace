'use client'

import { useState, useCallback } from 'react'
import Icon from '@/components/ui/Icon'
import { usePreferences } from '@/contexts/PreferencesContext'

export interface FilterState {
  categories: string[]
  tags: string[]
  priceRange: number
  minRating: number
}

interface CategoryOption {
  id: string
  name: string
  slug: string
}

interface FilterSidebarProps {
  onFilterChange?: (filters: FilterState) => void
  categories?: CategoryOption[]
  availableTags?: string[]
}

export default function FilterSidebar({ onFilterChange, categories = [], availableTags = [] }: FilterSidebarProps) {
  const { formatPrice } = usePreferences()
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    tags: [],
    priceRange: 1000,
    minRating: 0,
  })

  const updateFilters = useCallback((newFilters: FilterState) => {
    setFilters(newFilters)
    onFilterChange?.(newFilters)
  }, [onFilterChange])

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    const newCategories = checked
      ? [...filters.categories, categoryId]
      : filters.categories.filter((c) => c !== categoryId)
    updateFilters({ ...filters, categories: newCategories })
  }

  const handleTagChange = (tag: string, checked: boolean) => {
    const newTags = checked
      ? [...filters.tags, tag]
      : filters.tags.filter((t) => t !== tag)
    updateFilters({ ...filters, tags: newTags })
  }

  const handlePriceChange = (value: number) => {
    updateFilters({ ...filters, priceRange: value })
  }

  const handleRatingClick = (rating: number) => {
    const newRating = filters.minRating === rating ? 0 : rating
    updateFilters({ ...filters, minRating: newRating })
  }

  const handleClearAll = () => {
    updateFilters({
      categories: [],
      tags: [],
      priceRange: 1000,
      minRating: 0,
    })
  }

  const activeCount =
    filters.categories.length +
    filters.tags.length +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.priceRange < 1000 ? 1 : 0)

  const hasActiveFilters = activeCount > 0

  return (
    <aside className="w-64 flex-shrink-0 space-y-8 bg-charcoal p-6 rounded-2xl border border-border-dark h-fit sticky top-24">
      {/* Category Filter */}
      {categories.length > 0 && (
        <fieldset>
          <legend className="text-white font-bold text-sm mb-4">Category</legend>
          <div className="space-y-3">
            {categories.map((category) => (
              <label
                key={category.id}
                className="flex items-center gap-3 text-sm text-slate-400 cursor-pointer group hover:text-white transition-colors"
              >
                <input
                  type="checkbox"
                  checked={filters.categories.includes(category.id)}
                  onChange={(e) => handleCategoryChange(category.id, e.target.checked)}
                  className="rounded border-border-dark bg-background-dark text-primary focus:ring-primary focus:ring-offset-0"
                />
                {category.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Price Range Filter */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <label htmlFor="price-range" className="text-white font-bold text-sm">Price Range</label>
          <span className="text-[11px] text-primary font-bold">{formatPrice(0)} - {formatPrice(filters.priceRange)}</span>
        </div>
        <input
          id="price-range"
          type="range"
          min="0"
          max="1000"
          step="10"
          value={filters.priceRange}
          onChange={(e) => handlePriceChange(Number(e.target.value))}
          className="w-full h-1.5 bg-border-dark rounded-lg appearance-none cursor-pointer"
          aria-label={`Price up to ${formatPrice(filters.priceRange)}`}
        />
      </div>

      {/* Rating Filter - Clickable Stars */}
      <fieldset>
        <legend className="text-white font-bold text-sm mb-4">Rating</legend>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => handleRatingClick(rating)}
              className={`flex items-center gap-2 text-sm w-full py-1.5 px-2 rounded-lg transition-colors ${
                filters.minRating === rating
                  ? 'bg-primary/10 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Icon
                    key={star}
                    name="star"
                    size={16}
                    className={star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-slate-600'}
                  />
                ))}
              </div>
              {rating < 5 && <span className="text-[11px] text-slate-500">& up</span>}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Tags Filter */}
      {availableTags.length > 0 && (
        <fieldset>
          <legend className="text-white font-bold text-sm mb-4">Tags</legend>
          <div className="grid grid-cols-2 gap-3">
            {availableTags.map((tag) => (
              <label
                key={tag}
                className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer group hover:text-white transition-colors"
              >
                <input
                  type="checkbox"
                  checked={filters.tags.includes(tag)}
                  onChange={(e) => handleTagChange(tag, e.target.checked)}
                  className="rounded border-border-dark bg-background-dark text-primary focus:ring-primary focus:ring-offset-0"
                />
                {tag}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Clear All Button */}
      <button
        type="button"
        onClick={handleClearAll}
        disabled={!hasActiveFilters}
        className="w-full bg-border-dark text-slate-300 py-2 rounded-lg text-xs font-bold hover:bg-surface-dark transition-all border border-transparent hover:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Clear All {hasActiveFilters && `(${activeCount})`}
      </button>
    </aside>
  )
}
