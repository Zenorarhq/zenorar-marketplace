// Search API

import { localApiFetch, buildQueryString } from './client'
import { Product } from './products'

export interface SearchFilters {
  q?: string
  query?: string
  category?: string
  categories?: string[]
  minPrice?: number
  maxPrice?: number
  minRating?: number
  inStock?: boolean
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'popular' | string
  page?: number
  limit?: number
}

export interface SearchResult {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  comparePrice: number | null
  image: string | null
  category: { id: string; name: string; slug: string } | null
  reviewCount: number
  inStock: boolean
  isFeatured: boolean
}

export interface SearchAggregations {
  priceRange: {
    min: number
    max: number
  }
  categories: Array<{
    id: string
    name: string
    slug: string
    count: number
  }>
}

export interface AutocompleteResult {
  products: Array<{
    id: string
    name: string
    slug: string
    price: number
    image: string | null
  }>
  categories: Array<{
    id: string
    name: string
    slug: string
    productCount: number
  }>
  suggestions: string[]
}

export interface GlobalSearchResult {
  products: Array<{
    type: 'product'
    id: string
    title: string
    url: string
    image: string | null
  }>
  categories: Array<{
    type: 'category'
    id: string
    title: string
    url: string
  }>
  pages: Array<{
    type: 'page'
    id: string
    title: string
    url: string
  }>
}

export const searchApi = {
  async searchProducts(filters: SearchFilters) {
    const query = buildQueryString(filters)
    return localApiFetch<SearchResult[]>(`/search/products${query}`)
  },

  async autocomplete(query: string, limit = 5) {
    return localApiFetch<AutocompleteResult>(`/search/autocomplete?q=${encodeURIComponent(query)}&limit=${limit}`)
  },

  async globalSearch(query: string, limit = 10) {
    return localApiFetch<GlobalSearchResult>(`/search/global?q=${encodeURIComponent(query)}&limit=${limit}`)
  },

  async getTrending(limit = 10) {
    return localApiFetch<string[]>(`/search/trending?limit=${limit}`)
  },

  async getCategorySuggestions(categorySlug: string, limit = 10) {
    return localApiFetch<string[]>(`/search/suggestions/${categorySlug}?limit=${limit}`)
  },
}
