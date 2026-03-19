// Search API

import { apiFetch, buildQueryString, localApiFetch } from './client'
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
  esims?: Array<{
    id: string
    name: string
    slug: string
    dataAmountDisplay: string
    validityDays: number
    retailPrice: number
    coverageType: string
  }>
  giftCards?: Array<{
    id: string
    brand: string
    slug: string
    imageUrl: string | null
  }>
  virtualNumbers?: Array<{
    id: string
    name: string
    isoCode: string
    flagEmoji: string
    retailMonthly: number
  }>
  carrierEsims?: Array<{
    id: string
    carrierName: string
    carrierSlug: string
    planName: string
    retailPrice: number
    dataAmountDisplay: string
  }>
}

export interface TrendingProduct {
  id: string
  name: string
  slug: string
  price: number
  image: string | null
}

export interface PopularCategory {
  id: string
  name: string
  slug: string
  productCount: number
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

// Universal search types
export interface EsimSearchResult {
  id: string
  name: string
  slug: string
  description: string | null
  dataAmountGb: number
  dataAmountDisplay: string
  validityDays: number
  isUnlimited: boolean
  networkType: string
  retailPrice: number
  currency: string
  coverageType: string
  countries: string[]
}

export interface GiftCardSearchResult {
  id: string
  brand: string
  slug: string
  category: string
  description: string | null
  imageUrl: string | null
  denominations: any
  discountPercent: number
  minCustomAmount: number | null
  maxCustomAmount: number | null
}

export interface VirtualNumberSearchResult {
  id: string
  name: string
  isoCode: string
  dialCode: string
  flagEmoji: string
  smsEnabled: boolean
  voiceEnabled: boolean
  retailMonthly: number
}

export interface CarrierEsimSearchResult {
  id: string
  carrierName: string
  carrierSlug: string
  planName: string
  description: string | null
  country: string
  dataAmountDisplay: string
  isUnlimited: boolean
  voiceDisplay: string
  smsDisplay: string
  networkType: string
  retailPrice: number
  currency: string
}

export interface UniversalSearchResponse {
  results: {
    scripts: { items: SearchResult[]; total: number }
    esims: { items: EsimSearchResult[]; total: number }
    gift_cards: { items: GiftCardSearchResult[]; total: number }
    virtual_numbers: { items: VirtualNumberSearchResult[]; total: number }
    carrier_esims: { items: CarrierEsimSearchResult[]; total: number }
  }
  query: string
  totalResults: number
}

export const searchApi = {
  async searchProducts(filters: SearchFilters) {
    const query = buildQueryString(filters)
    return apiFetch<SearchResult[]>(`/search/products${query}`)
  },

  async autocomplete(query: string, limit = 5) {
    return localApiFetch<AutocompleteResult>(`/search/autocomplete?q=${encodeURIComponent(query)}&limit=${limit}`)
  },

  async globalSearch(query: string, limit = 10) {
    return apiFetch<GlobalSearchResult>(`/search/global?q=${encodeURIComponent(query)}&limit=${limit}`)
  },

  async getTrending(limit = 10) {
    return localApiFetch<TrendingProduct[]>(`/search/trending?limit=${limit}`)
  },

  async getPopularCategories(limit = 6) {
    return localApiFetch<PopularCategory[]>(`/search/popular-categories?limit=${limit}`)
  },

  async getCategorySuggestions(categorySlug: string, limit = 10) {
    return apiFetch<string[]>(`/search/suggestions/${categorySlug}?limit=${limit}`)
  },

  async universalSearch(query: string, category = 'all', page = 1, limit = 12) {
    return localApiFetch<UniversalSearchResponse>(
      `/search/universal?q=${encodeURIComponent(query)}&category=${category}&page=${page}&limit=${limit}`
    )
  },
}
