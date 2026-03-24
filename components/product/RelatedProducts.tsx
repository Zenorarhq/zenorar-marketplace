'use client'

import Image from 'next/image'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import { usePreferences } from '@/contexts/PreferencesContext'

interface RelatedProduct {
  id: string
  name: string
  slug: string
  price: number
  rating: number
  reviewCount: number
  category: string
  icon: string
  image?: string
}

interface RelatedProductsProps {
  products: RelatedProduct[]
}

export default function RelatedProducts({ products }: RelatedProductsProps) {
  const { formatPrice } = usePreferences()

  if (products.length === 0) return null

  return (
    <div className="mt-16 w-full">
      <h2 className="text-2xl font-bold text-white mb-8">Related Products</h2>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/scripts/${product.slug}`}
            className="bg-charcoal border border-border-dark p-4 rounded-2xl hover:border-primary/50 transition-all group cursor-pointer flex flex-col"
          >
            {/* Product Image */}
            <div className="w-full aspect-square bg-surface-dark rounded-xl mb-4 flex items-center justify-center border border-border-dark overflow-hidden">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  width={200}
                  height={200}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80"
                />
              ) : (
                <Icon name={product.icon} size={36} className="text-slate-600" />
              )}
            </div>

            {/* Product Info */}
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-white text-sm line-clamp-1">{product.name}</h4>
              <div className="flex items-center text-yellow-500 scale-75 origin-right">
                <Icon name="star" size={16}  />
                <span className="text-slate-300 text-xs ml-1 font-bold">{product.rating.toFixed(1)}</span>
              </div>
            </div>

            {/* Category */}
            <div className="flex items-center gap-2 mb-4">
              <Icon name={product.icon} size={12} className="text-primary" />
              <span className="text-[10px] text-slate-500 uppercase font-bold">{product.category}</span>
            </div>

            {/* Price & Cart Button */}
            <div className="flex items-center justify-between mt-auto">
              <span className="text-lg font-extrabold text-white">{formatPrice(product.price)}</span>
              <button className="w-8 h-8 rounded-lg bg-surface-dark border border-border-dark flex items-center justify-center hover:bg-primary hover:text-black transition-colors">
                <Icon name="add-shopping-cart" size={18} />
              </button>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
