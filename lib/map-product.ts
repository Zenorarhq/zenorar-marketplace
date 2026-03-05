import { Product } from '@/lib/types'

export function mapProduct(p: any): Product {
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
    badge: p.badge || undefined,
  }
}
