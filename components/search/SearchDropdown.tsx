'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/ui/Icon'
import { searchApi, AutocompleteResult, TrendingProduct, PopularCategory } from '@/lib/api'
import { usePreferences } from '@/contexts/PreferencesContext'

interface SearchDropdownProps {
  isOpen: boolean
  onClose: () => void
  searchQuery: string
  onViewAllResults: () => void
  inputRef?: React.RefObject<HTMLInputElement>
}

export default function SearchDropdown({
  isOpen,
  onClose,
  searchQuery,
  onViewAllResults,
  inputRef,
}: SearchDropdownProps) {
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { formatPrice } = usePreferences()
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompleteResult | null>(null)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [trendingProducts, setTrendingProducts] = useState<TrendingProduct[]>([])
  const [popularCategories, setPopularCategories] = useState<PopularCategory[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('recentSearches')
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored).slice(0, 5))
        } catch {
          // Invalid JSON, ignore
        }
      }
    }
  }, [])

  // Fetch trending products and popular categories on mount
  useEffect(() => {
    const fetchTrending = async () => {
      const result = await searchApi.getTrending(5)
      if (result.success && result.data) {
        setTrendingProducts(result.data)
      }
    }
    const fetchCategories = async () => {
      const result = await searchApi.getPopularCategories(6)
      if (result.success && result.data) {
        setPopularCategories(result.data)
      }
    }
    fetchTrending()
    fetchCategories()
  }, [])

  // Debounced autocomplete
  const fetchAutocomplete = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setAutocompleteResults(null)
      return
    }

    setIsLoading(true)
    try {
      const result = await searchApi.autocomplete(query)
      if (result.success && result.data) {
        setAutocompleteResults(result.data)
      } else {
        setAutocompleteResults(null)
      }
    } catch {
      setAutocompleteResults(null)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchAutocomplete(searchQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, fetchAutocomplete])

  // Save search to recent searches
  const saveRecentSearch = useCallback((search: string) => {
    if (typeof window !== 'undefined' && search.trim()) {
      const stored = localStorage.getItem('recentSearches')
      let searches: string[] = []
      if (stored) {
        try {
          searches = JSON.parse(stored)
        } catch {
          // Invalid JSON, ignore
        }
      }
      // Remove if exists and add to front
      searches = [search, ...searches.filter((s) => s !== search)].slice(0, 10)
      localStorage.setItem('recentSearches', JSON.stringify(searches))
      setRecentSearches(searches.slice(0, 5))
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      // Don't close if clicking on the input
      if (inputRef?.current && inputRef.current.contains(target)) {
        return
      }
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose, inputRef])

  const handleViewAll = () => {
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim())
    }
    onViewAllResults()
  }

  // Map category slugs to universal search category keys
  const categorySlugToSearchKey = (slug: string): string => {
    const map: Record<string, string> = {
      'gift-cards': 'gift_cards',
      'esim': 'esims',
      'virtual-numbers': 'virtual_numbers',
      'scripts': 'scripts',
      'cards': 'scripts',
    }
    return map[slug] || slug
  }

  if (!isOpen) return null

  const hasAutocomplete = autocompleteResults && (
    autocompleteResults.products.length > 0 ||
    autocompleteResults.categories.length > 0 ||
    autocompleteResults.suggestions.length > 0 ||
    (autocompleteResults.esims && autocompleteResults.esims.length > 0) ||
    (autocompleteResults.giftCards && autocompleteResults.giftCards.length > 0) ||
    (autocompleteResults.virtualNumbers && autocompleteResults.virtualNumbers.length > 0) ||
    (autocompleteResults.carrierEsims && autocompleteResults.carrierEsims.length > 0)
  )

  return (
    <>
      {/* Backdrop - positioned below the header, lower z-index than header */}
      <div
        className="fixed inset-x-0 bottom-0 top-[120px] md:top-[130px] z-40 bg-black/65 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dropdown - positioned below search input */}
      <div
        ref={dropdownRef}
        className="absolute top-full left-0 w-full mt-2 bg-charcoal border-t-2 border-primary rounded-lg shadow-2xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto"
      >
        {/* Loading indicator */}
        {isLoading && searchQuery.length >= 2 && (
          <div className="p-4 text-center">
            <Icon name="loading" size={20} className="animate-spin text-primary mx-auto" />
          </div>
        )}

        {/* Autocomplete Results */}
        {hasAutocomplete && !isLoading && (
          <>
            {/* Product Suggestions */}
            {autocompleteResults.products.length > 0 && (
              <div className="p-4 border-b border-white/5">
                <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
                  Products
                </h5>
                <div className="space-y-1">
                  {autocompleteResults.products.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        saveRecentSearch(searchQuery)
                        onClose()
                        router.push(`/products/${product.slug}`)
                      }}
                      className="flex items-center gap-3 px-2 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-primary rounded-md transition-colors group w-full text-left"
                    >
                      <Icon name="package" size={18} className="text-slate-500 group-hover:text-primary" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{product.name}</div>
                        <div className="text-xs text-slate-500">{formatPrice(Number(product.price))}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Category Suggestions */}
            {autocompleteResults.categories.length > 0 && (
              <div className="p-4 border-b border-white/5">
                <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
                  Categories
                </h5>
                <div className="flex flex-wrap gap-2 px-2">
                  {autocompleteResults.categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => {
                        saveRecentSearch(searchQuery)
                        onClose()
                        router.push(`/search?q=${encodeURIComponent(searchQuery)}&category=${categorySlugToSearchKey(category.slug)}`)
                      }}
                      className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-md text-xs text-slate-400 hover:border-primary hover:text-primary transition-all"
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* eSIM Suggestions */}
            {autocompleteResults.esims && autocompleteResults.esims.length > 0 && (
              <div className="p-4 border-b border-white/5">
                <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
                  eSIMs
                </h5>
                <div className="space-y-1">
                  {autocompleteResults.esims.map((esim) => (
                    <button
                      key={esim.id}
                      type="button"
                      onClick={() => {
                        saveRecentSearch(searchQuery)
                        onClose()
                        router.push(`/search?q=${encodeURIComponent(esim.name)}&category=esims`)
                      }}
                      className="flex items-center gap-3 px-2 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-primary rounded-md transition-colors group w-full text-left"
                    >
                      <Icon name="globe" size={18} className="text-slate-500 group-hover:text-primary" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{esim.name}</div>
                        <div className="text-xs text-slate-500">{esim.dataAmountDisplay} &middot; {esim.validityDays} days &middot; {formatPrice(esim.retailPrice)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Gift Card Suggestions */}
            {autocompleteResults.giftCards && autocompleteResults.giftCards.length > 0 && (
              <div className="p-4 border-b border-white/5">
                <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
                  Gift Cards
                </h5>
                <div className="space-y-1">
                  {autocompleteResults.giftCards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => {
                        saveRecentSearch(searchQuery)
                        onClose()
                        router.push(`/search?q=${encodeURIComponent(card.brand)}&category=gift_cards`)
                      }}
                      className="flex items-center gap-3 px-2 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-primary rounded-md transition-colors group w-full text-left"
                    >
                      <Icon name="gift" size={18} className="text-slate-500 group-hover:text-primary" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{card.brand}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Virtual Number Suggestions */}
            {autocompleteResults.virtualNumbers && autocompleteResults.virtualNumbers.length > 0 && (
              <div className="p-4 border-b border-white/5">
                <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
                  Virtual Numbers
                </h5>
                <div className="space-y-1">
                  {autocompleteResults.virtualNumbers.map((vn) => (
                    <button
                      key={vn.id}
                      type="button"
                      onClick={() => {
                        saveRecentSearch(searchQuery)
                        onClose()
                        router.push(`/search?q=${encodeURIComponent(vn.name)}&category=virtual_numbers`)
                      }}
                      className="flex items-center gap-3 px-2 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-primary rounded-md transition-colors group w-full text-left"
                    >
                      <span className="text-lg">{vn.flagEmoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{vn.name}</div>
                        <div className="text-xs text-slate-500">{formatPrice(vn.retailMonthly)}/mo</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Carrier eSIM Suggestions */}
            {autocompleteResults.carrierEsims && autocompleteResults.carrierEsims.length > 0 && (
              <div className="p-4 border-b border-white/5">
                <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
                  Carrier eSIMs
                </h5>
                <div className="space-y-1">
                  {autocompleteResults.carrierEsims.map((carrier) => (
                    <button
                      key={carrier.id}
                      type="button"
                      onClick={() => {
                        saveRecentSearch(searchQuery)
                        onClose()
                        router.push(`/search?q=${encodeURIComponent(carrier.carrierName)}&category=carrier_esims`)
                      }}
                      className="flex items-center gap-3 px-2 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-primary rounded-md transition-colors group w-full text-left"
                    >
                      <Icon name="smartphone" size={18} className="text-slate-500 group-hover:text-primary" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{carrier.carrierName} — {carrier.planName}</div>
                        <div className="text-xs text-slate-500">{carrier.dataAmountDisplay} &middot; {formatPrice(carrier.retailPrice)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Suggestions */}
            {autocompleteResults.suggestions.length > 0 && (
              <div className="p-4 border-b border-white/5">
                <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
                  Suggestions
                </h5>
                <div className="space-y-1">
                  {autocompleteResults.suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        saveRecentSearch(suggestion)
                        onClose()
                        router.push(`/search?q=${encodeURIComponent(suggestion)}`)
                      }}
                      className="flex items-center gap-3 px-2 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-primary rounded-md transition-colors group w-full text-left"
                    >
                      <Icon name="search" size={18} className="text-slate-500 group-hover:text-primary" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Default content when no search query or no results */}
        {!hasAutocomplete && !isLoading && (
          <>
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="p-4 border-b border-white/5">
                <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
                  Recent Searches
                </h5>
                <div className="space-y-1">
                  {recentSearches.map((search, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        onClose()
                        router.push(`/search?q=${encodeURIComponent(search)}`)
                      }}
                      className="flex items-center gap-3 px-2 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-primary rounded-md transition-colors group w-full text-left"
                    >
                      <Icon name="history" size={18} className="text-slate-500 group-hover:text-primary" />
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Products */}
            {trendingProducts.length > 0 && (
              <div className="p-4 border-b border-white/5">
                <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
                  Trending Products
                </h5>
                <div className="space-y-1">
                  {trendingProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        onClose()
                        router.push(`/products/${product.slug}`)
                      }}
                      className="flex items-center gap-3 px-2 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-primary rounded-md transition-colors group w-full text-left"
                    >
                      <Icon name="fire" size={18} className="text-orange-500" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{product.name}</div>
                        <div className="text-xs text-slate-500">{formatPrice(Number(product.price))}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Categories */}
            {popularCategories.length > 0 && (
              <div className="p-4">
                <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
                  Popular Categories
                </h5>
                <div className="flex flex-wrap gap-2 px-2">
                  {popularCategories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => {
                        onClose()
                        router.push(`/search?category=${categorySlugToSearchKey(category.slug)}`)
                      }}
                      className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-md text-xs text-slate-400 hover:border-primary hover:text-primary transition-all"
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* View All Results */}
        {searchQuery && (
          <div className="bg-white/5 p-3 text-center border-t border-white/5">
            <button
              onClick={handleViewAll}
              className="text-xs font-bold text-primary hover:underline"
            >
              View all results for &quot;{searchQuery}&quot;
            </button>
          </div>
        )}
      </div>
    </>
  )
}
