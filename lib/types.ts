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
  icon: string
  iconColor: string
  tags: string[]
  image?: string
  seller?: Seller
  features?: Feature[]
  specs?: Spec[]
  reviews?: Review[]
  badge?: string
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
