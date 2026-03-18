'use client'

import { useState, useCallback, useEffect } from 'react'
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
  variant?: 'sidebar' | 'inline'
  sortBy?: string
  onSortChange?: (value: string) => void
}

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
]

export default function FilterSidebar({ onFilterChange, categories = [], availableTags = [], variant = 'sidebar', sortBy, onSortChange }: FilterSidebarProps) {
  const { formatPrice } = usePreferences()
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    tags: [],
    priceRange: 1000,
    minRating: 0,
  })
  const [activeSheet, setActiveSheet] = useState<string | null>(null)

  // Lock body scroll when bottom sheet is open
  useEffect(() => {
    if (activeSheet) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
    } else {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [activeSheet])

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
  const isPriceActive = filters.priceRange < 1000
  const isRatingActive = filters.minRating > 0
  const isCategoryActive = filters.categories.length > 0
  const isTagsActive = filters.tags.length > 0
  const closeSheet = () => setActiveSheet(null)

  const filterContent = (
    <>
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
    </>
  )

  // Inline mode (mobile - pill buttons with bottom sheets)
  if (variant === 'inline') {
    const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Most Popular'

    const sheetTitles: Record<string, string> = {
      all: 'All Filters',
      sort: 'Sort By',
      price: 'Price Range',
      rating: 'Rating',
      category: 'Category',
      tags: 'Tags',
    }

    return (
      <>
        {/* Pill row */}
        <div className="flex overflow-x-auto gap-2 no-scrollbar">
          {/* Filter icon pill (icon only) */}
          <button
            type="button"
            onClick={() => setActiveSheet(activeSheet === 'all' ? null : 'all')}
            className={`flex items-center gap-1 px-3 py-2 rounded-full text-xs font-semibold flex-shrink-0 border transition-colors ${
              hasActiveFilters ? 'border-primary text-primary bg-primary/10' : 'border-border-dark text-slate-300 bg-charcoal'
            }`}
          >
            <Icon name="filter" size={14} />
            {hasActiveFilters && (
              <span className="bg-primary text-black text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </button>

          {/* Sort pill */}
          <button
            type="button"
            onClick={() => setActiveSheet(activeSheet === 'sort' ? null : 'sort')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 border transition-colors border-border-dark text-slate-300 bg-charcoal"
          >
            {currentSortLabel}
            <Icon name="chevron-down" size={12} className={`transition-transform ${activeSheet === 'sort' ? 'rotate-180' : ''}`} />
          </button>

          {/* Price pill */}
          <button
            type="button"
            onClick={() => setActiveSheet(activeSheet === 'price' ? null : 'price')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 border transition-colors ${
              isPriceActive ? 'border-primary text-primary bg-primary/10' : 'border-border-dark text-slate-300 bg-charcoal'
            }`}
          >
            Price
            <Icon name="chevron-down" size={12} className={`transition-transform ${activeSheet === 'price' ? 'rotate-180' : ''}`} />
          </button>

          {/* Rating pill */}
          <button
            type="button"
            onClick={() => setActiveSheet(activeSheet === 'rating' ? null : 'rating')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 border transition-colors ${
              isRatingActive ? 'border-primary text-primary bg-primary/10' : 'border-border-dark text-slate-300 bg-charcoal'
            }`}
          >
            Rating
            <Icon name="chevron-down" size={12} className={`transition-transform ${activeSheet === 'rating' ? 'rotate-180' : ''}`} />
          </button>

          {/* Category pill */}
          {categories.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveSheet(activeSheet === 'category' ? null : 'category')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 border transition-colors ${
                isCategoryActive ? 'border-primary text-primary bg-primary/10' : 'border-border-dark text-slate-300 bg-charcoal'
              }`}
            >
              Category
              <Icon name="chevron-down" size={12} className={`transition-transform ${activeSheet === 'category' ? 'rotate-180' : ''}`} />
            </button>
          )}

          {/* Tags pill */}
          {availableTags.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveSheet(activeSheet === 'tags' ? null : 'tags')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 border transition-colors ${
                isTagsActive ? 'border-primary text-primary bg-primary/10' : 'border-border-dark text-slate-300 bg-charcoal'
              }`}
            >
              Tags
              <Icon name="chevron-down" size={12} className={`transition-transform ${activeSheet === 'tags' ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* Bottom sheet backdrop */}
        {activeSheet && (
          <div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={closeSheet}
          />
        )}

        {/* Bottom sheet panel */}
        {activeSheet && (
          <div className="fixed bottom-0 left-0 right-0 z-[70] bg-charcoal border-t border-border-dark rounded-t-2xl max-h-[70vh] overflow-y-auto no-scrollbar">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-border-dark rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4">
              <h3 className="text-white font-bold text-sm">{sheetTitles[activeSheet]}</h3>
              <button type="button" onClick={closeSheet} className="text-slate-400 hover:text-white transition-colors">
                <Icon name="close" size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 pb-6 space-y-6">
              {/* All Filters sheet */}
              {activeSheet === 'all' && filterContent}

              {/* Sort sheet */}
              {activeSheet === 'sort' && (
                <div className="space-y-1">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => { onSortChange?.(option.value); closeSheet() }}
                      className={`flex items-center justify-between w-full py-2.5 px-3 rounded-lg text-sm transition-colors ${
                        sortBy === option.value
                          ? 'bg-primary/10 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {option.label}
                      {sortBy === option.value && <Icon name="check" size={16} className="text-primary" />}
                    </button>
                  ))}
                </div>
              )}

              {/* Price Range sheet */}
              {activeSheet === 'price' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-white font-bold text-sm">Price Range</span>
                    <span className="text-[11px] text-primary font-bold">{formatPrice(0)} - {formatPrice(filters.priceRange)}</span>
                  </div>
                  <input
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
              )}

              {/* Rating sheet */}
              {activeSheet === 'rating' && (
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => handleRatingClick(rating)}
                      className={`flex items-center gap-2 text-sm w-full py-2 px-3 rounded-lg transition-colors ${
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
              )}

              {/* Category sheet */}
              {activeSheet === 'category' && categories.length > 0 && (
                <div className="space-y-3">
                  {categories.map((category) => (
                    <label
                      key={category.id}
                      className="flex items-center gap-3 text-sm text-slate-400 cursor-pointer hover:text-white transition-colors"
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
              )}

              {/* Tags sheet */}
              {activeSheet === 'tags' && availableTags.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {availableTags.map((tag) => (
                    <label
                      key={tag}
                      className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer hover:text-white transition-colors"
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
              )}
            </div>
          </div>
        )}
      </>
    )
  }

  // Desktop sidebar mode (default)
  return (
    <aside className="w-64 flex-shrink-0 space-y-8 bg-charcoal p-6 rounded-2xl border border-border-dark h-fit sticky top-24">
      {filterContent}
    </aside>
  )
}
