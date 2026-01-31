'use client'

import { useState, useCallback } from 'react'
import { filterCategories, filterLanguages } from '@/lib/mock-data'

interface FilterState {
  categories: string[]
  languages: string[]
  priceRange: number
  ratings: number[]
}

interface FilterSidebarProps {
  onFilterChange?: (filters: FilterState) => void
}

export default function FilterSidebar({ onFilterChange }: FilterSidebarProps) {
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    languages: [],
    priceRange: 1000,
    ratings: [],
  })

  const updateFilters = useCallback((newFilters: FilterState) => {
    setFilters(newFilters)
    onFilterChange?.(newFilters)
  }, [onFilterChange])

  const handleCategoryChange = (category: string, checked: boolean) => {
    const newCategories = checked
      ? [...filters.categories, category]
      : filters.categories.filter((c) => c !== category)
    updateFilters({ ...filters, categories: newCategories })
  }

  const handleLanguageChange = (language: string, checked: boolean) => {
    const newLanguages = checked
      ? [...filters.languages, language]
      : filters.languages.filter((l) => l !== language)
    updateFilters({ ...filters, languages: newLanguages })
  }

  const handlePriceChange = (value: number) => {
    updateFilters({ ...filters, priceRange: value })
  }

  const handleRatingChange = (rating: number, checked: boolean) => {
    const newRatings = checked
      ? [...filters.ratings, rating]
      : filters.ratings.filter((r) => r !== rating)
    updateFilters({ ...filters, ratings: newRatings })
  }

  const handleClearAll = () => {
    const clearedFilters: FilterState = {
      categories: [],
      languages: [],
      priceRange: 1000,
      ratings: [],
    }
    updateFilters(clearedFilters)
  }

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.languages.length > 0 ||
    filters.ratings.length > 0 ||
    filters.priceRange < 1000

  return (
    <aside className="w-64 flex-shrink-0 space-y-8 bg-charcoal p-6 rounded-2xl border border-border-dark h-fit sticky top-24">
      {/* Category Filter */}
      <fieldset>
        <legend className="text-white font-bold text-sm mb-4">Category</legend>
        <div className="space-y-3">
          {filterCategories.map((category) => (
            <label
              key={category}
              className="flex items-center gap-3 text-sm text-slate-400 cursor-pointer group hover:text-white transition-colors"
            >
              <input
                type="checkbox"
                checked={filters.categories.includes(category)}
                onChange={(e) => handleCategoryChange(category, e.target.checked)}
                className="rounded border-border-dark bg-background-dark text-primary focus:ring-primary focus:ring-offset-0"
              />
              {category}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Price Range Filter */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <label htmlFor="price-range" className="text-white font-bold text-sm">Price Range</label>
          <span className="text-[11px] text-primary font-bold">$0 - ${filters.priceRange}</span>
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
          aria-label={`Price up to $${filters.priceRange}`}
        />
      </div>

      {/* Rating Filter */}
      <fieldset>
        <legend className="text-white font-bold text-sm mb-4">Rating</legend>
        <div className="space-y-3">
          <label className="flex items-center gap-3 text-sm text-slate-400 cursor-pointer group hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={filters.ratings.includes(5)}
              onChange={(e) => handleRatingChange(5, e.target.checked)}
              className="rounded border-border-dark bg-background-dark text-primary focus:ring-primary focus:ring-offset-0"
            />
            <div className="flex text-yellow-500" aria-label="5 stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="material-symbols-outlined text-[16px] icon-filled" aria-hidden="true">
                  star
                </span>
              ))}
            </div>
          </label>
          <label className="flex items-center gap-3 text-sm text-slate-400 cursor-pointer group hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={filters.ratings.includes(4)}
              onChange={(e) => handleRatingChange(4, e.target.checked)}
              className="rounded border-border-dark bg-background-dark text-primary focus:ring-primary focus:ring-offset-0"
            />
            <div className="flex text-yellow-500" aria-label="4 stars and up">
              {[1, 2, 3, 4].map((star) => (
                <span key={star} className="material-symbols-outlined text-[16px] icon-filled" aria-hidden="true">
                  star
                </span>
              ))}
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">star</span>
              <span className="ml-1 text-[11px] text-slate-500">&amp; up</span>
            </div>
          </label>
        </div>
      </fieldset>

      {/* Language Filter */}
      <fieldset>
        <legend className="text-white font-bold text-sm mb-4">Language</legend>
        <div className="grid grid-cols-2 gap-3">
          {filterLanguages.map((language) => (
            <label
              key={language}
              className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer group hover:text-white transition-colors"
            >
              <input
                type="checkbox"
                checked={filters.languages.includes(language)}
                onChange={(e) => handleLanguageChange(language, e.target.checked)}
                className="rounded border-border-dark bg-background-dark text-primary focus:ring-primary focus:ring-offset-0"
              />
              {language}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Clear All Button */}
      <button
        type="button"
        onClick={handleClearAll}
        disabled={!hasActiveFilters}
        className="w-full bg-border-dark text-slate-300 py-2 rounded-lg text-xs font-bold hover:bg-surface-dark transition-all border border-transparent hover:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Clear All {hasActiveFilters && `(${filters.categories.length + filters.languages.length + filters.ratings.length + (filters.priceRange < 1000 ? 1 : 0)})`}
      </button>
    </aside>
  )
}
