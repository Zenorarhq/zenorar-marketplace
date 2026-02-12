'use client'

import { useState, useCallback } from 'react'
import { searchApi, AutocompleteResult, SearchResult, SearchFilters } from '@/lib/api'

export function useSearch() {
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompleteResult | null>(null)

  const search = useCallback(async (filters: SearchFilters) => {
    setIsSearching(true)
    const result = await searchApi.searchProducts(filters)
    if (result.success && result.data) {
      setResults(result.data)
    }
    setIsSearching(false)
    return result
  }, [])

  const autocomplete = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setAutocompleteResults(null)
      return
    }

    const result = await searchApi.autocomplete(query)
    if (result.success && result.data) {
      setAutocompleteResults(result.data)
    }
  }, [])

  const clearAutocomplete = useCallback(() => {
    setAutocompleteResults(null)
  }, [])

  return {
    isSearching,
    results,
    autocompleteResults,
    search,
    autocomplete,
    clearAutocomplete,
  }
}

export function useGlobalSearch() {
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<{
    products: any[]
    categories: any[]
    pages: any[]
  } | null>(null)

  const search = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setResults(null)
      return
    }

    setIsSearching(true)
    const result = await searchApi.globalSearch(query)
    if (result.success && result.data) {
      setResults(result.data)
    }
    setIsSearching(false)
  }, [])

  const clear = useCallback(() => {
    setResults(null)
  }, [])

  return {
    isSearching,
    results,
    search,
    clear,
  }
}
