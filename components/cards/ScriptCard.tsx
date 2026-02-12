'use client'

import Link from 'next/link'
import { Product } from '@/lib/types'
import StarRating from '@/components/ui/StarRating'
import Icon from '@/components/ui/Icon'
import { usePreferences } from '@/contexts/PreferencesContext'

interface ScriptCardProps {
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

export default function ScriptCard({ product }: ScriptCardProps) {
  const { formatPrice } = usePreferences()
  const colorClass = iconColorClasses[product.iconColor] || iconColorClasses.primary

  return (
    <Link
      href={`/products/${product.slug}`}
      className="bg-charcoal p-5 rounded-2xl border border-border-dark hover:border-primary/40 transition-all cursor-pointer group shadow-lg"
    >
      <div className={`w-10 h-10 mb-4 rounded-lg flex items-center justify-center ${colorClass}`}>
        <Icon name={product.icon} size={24} />
      </div>

      <h3 className="font-bold text-sm mb-1 group-hover:text-primary transition-colors">
        {product.name}
      </h3>

      <div className="mb-3">
        <StarRating rating={product.rating} size="md" />
      </div>

      <p className="text-slate-300 font-bold">
        {product.priceRange
          ? `${formatPrice(product.priceRange.min)} - ${formatPrice(product.priceRange.max)}`
          : formatPrice(product.price)}
      </p>
    </Link>
  )
}
