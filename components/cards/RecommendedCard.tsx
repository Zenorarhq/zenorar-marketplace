'use client'

import Link from 'next/link'
import { Product } from '@/lib/types'
import StarRating from '@/components/ui/StarRating'
import Icon from '@/components/ui/Icon'
import { usePreferences } from '@/contexts/PreferencesContext'

interface RecommendedCardProps {
  product: Product
}

const iconColorClasses: Record<string, string> = {
  orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  green: 'bg-green-500/10 text-green-500 border-green-500/20',
  blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  indigo: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  primary: 'bg-primary/10 text-primary border-primary/20',
  pink: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  red: 'bg-red-500/10 text-red-500 border-red-500/20',
}

const badgeClasses: Record<string, string> = {
  KSU: 'bg-primary/10 text-primary',
  HOT: 'bg-slate-500/20 text-slate-400',
  NEW: 'bg-slate-500/20 text-slate-400',
}

export default function RecommendedCard({ product }: RecommendedCardProps) {
  const { formatPrice } = usePreferences()
  const colorClass = iconColorClasses[product.iconColor] || iconColorClasses.primary
  const badgeClass = product.badge ? badgeClasses[product.badge] || badgeClasses.HOT : ''

  return (
    <Link
      href={`/products/${product.slug}`}
      className="flex items-center gap-4 group cursor-pointer"
    >
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${colorClass}`}>
        <Icon name={product.icon} size={24} />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold truncate group-hover:text-primary transition-colors">
          {product.name}
        </h4>

        <div className="mt-0.5">
          <StarRating rating={product.rating} size="sm" />
        </div>

        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-slate-500">{formatPrice(product.price)}</span>
          {product.badge && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${badgeClass}`}>
              {product.badge}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
