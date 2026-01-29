import Image from 'next/image'
import Link from 'next/link'
import { relatedProducts } from '@/lib/mock-data'

export default function RelatedProducts() {
  return (
    <div className="mt-16 w-full">
      <h2 className="text-2xl font-bold text-white mb-8">Related Products</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {relatedProducts.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.slug}`}
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
                <span className="material-symbols-outlined text-4xl text-slate-600">
                  {product.icon}
                </span>
              )}
            </div>

            {/* Product Info */}
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-white text-sm line-clamp-1">{product.name}</h4>
              <div className="flex items-center text-yellow-500 scale-75 origin-right">
                <span className="material-symbols-outlined icon-filled">star</span>
                <span className="text-slate-300 text-xs ml-1 font-bold">{product.rating}</span>
              </div>
            </div>

            {/* Category */}
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary text-xs">{product.icon}</span>
              <span className="text-[10px] text-slate-500 uppercase font-bold">{product.category}</span>
            </div>

            {/* Price & Cart Button */}
            <div className="flex items-center justify-between mt-auto">
              <span className="text-lg font-extrabold text-white">${product.price}</span>
              <button className="w-8 h-8 rounded-lg bg-surface-dark border border-border-dark flex items-center justify-center hover:bg-primary hover:text-black transition-colors">
                <span className="material-symbols-outlined text-lg">add_shopping_cart</span>
              </button>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
