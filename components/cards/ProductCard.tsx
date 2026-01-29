import Link from 'next/link'
import { Product } from '@/lib/types'
import StarRating from '@/components/ui/StarRating'

interface ProductCardProps {
  product: Product
}

const iconColorClasses: Record<string, string> = {
  orange: 'bg-orange-500/10 text-orange-500',
  green: 'bg-green-500/10 text-green-500',
  blue: 'bg-blue-500/10 text-blue-500',
  purple: 'bg-purple-500/10 text-purple-500',
  indigo: 'bg-indigo-500/10 text-indigo-500',
  primary: 'bg-primary/10 text-primary',
  pink: 'bg-pink-500/10 text-pink-500',
  cyan: 'bg-cyan-500/10 text-cyan-500',
  yellow: 'bg-yellow-500/10 text-yellow-500',
  red: 'bg-red-500/10 text-red-500',
}

export default function ProductCard({ product }: ProductCardProps) {
  const colorClass = iconColorClasses[product.iconColor] || iconColorClasses.primary

  return (
    <Link
      href={`/products/${product.slug}`}
      className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-slate-200 dark:border-border-dark hover:border-primary/50 transition-all cursor-pointer group"
    >
      <div className={`w-10 h-10 mb-4 rounded-lg flex items-center justify-center ${colorClass}`}>
        <span className="material-symbols-outlined">{product.icon}</span>
      </div>

      <h3 className="font-bold text-sm mb-1 group-hover:text-primary transition-colors">
        {product.name}
      </h3>

      <div className="mb-2">
        <StarRating rating={product.rating} size="sm" />
      </div>

      <p className="text-slate-500 text-xs">
        {product.priceRange
          ? `$${product.priceRange.min} - $${product.priceRange.max}`
          : `$${product.price}`}
      </p>
    </Link>
  )
}
