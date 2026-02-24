export interface Seller {
  id: string
  name: string
  avatar: string
  verified: boolean
  badge?: string
}

export interface Feature {
  icon: string
  title: string
  description: string
}

export interface Spec {
  label: string
  value: string
}

export interface Review {
  id: string
  author: string
  rating: number
  content: string
  date: string
  adminReply?: string | null
  adminReplyAt?: string | null
}

export interface ProductFile {
  id: string
  fileName: string
  fileSize: string | null
  fileType: string | null
  version: string | null
  isLatest: boolean | null
  createdAt: string | null
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  price: number
  priceRange?: { min: number; max: number }
  rating: number
  reviewCount: number
  category: string
  categoryId?: string | null
  icon: string
  iconColor: string
  tags: string[]
  image?: string
  images?: { url: string; isPrimary: boolean }[]
  seller?: Seller
  features?: Feature[]
  specs?: Spec[]
  reviews?: Review[]
  files?: ProductFile[]
  badge?: string
  videoUrl?: string
  demoUrl?: string
  demoInfo?: string
  purchaseCount?: number
}

export interface CartItem {
  product: Product
  quantity: number
  license: 'standard' | 'extended'
  price: number
}

export interface Category {
  id: string
  name: string
  icon: string
  href: string
}

export interface ConnectivityOption {
  id: string
  name: string
  icon: string
  href: string
}

export interface NavItem {
  label: string
  href: string
  icon?: string
}

// eSIM Types
export interface EsimPlan {
  id: string
  name: string
  region: string
  countries: string[]
  data: string
  validity: string
  price: number
  originalPrice?: number
  popular?: boolean
  features: string[]
}

export interface EsimRegion {
  id: string
  name: string
  flag: string
  planCount: number
  startingPrice: number
}

// Virtual Number Types
export interface VirtualNumber {
  id: string
  country: string
  countryCode: string
  flag: string
  areaCode: string
  type: 'local' | 'toll-free' | 'mobile'
  price: number
  setupFee: number
  features: string[]
  available: boolean
}

export interface VirtualNumberCountry {
  id: string
  name: string
  flag: string
  code: string
  numberCount: number
  startingPrice: number
}

// Gift Card Types
export interface GiftCard {
  id: string
  brand: string
  category: string
  denominations: number[]
  discount: number
  image: string
  popular?: boolean
  description: string
}

export interface GiftCardCategory {
  id: string
  name: string
  icon: string
  cardCount: number
}
