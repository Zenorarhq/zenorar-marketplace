import { popularProducts } from '@/lib/mock-data'
import ProductCard from '@/components/cards/ProductCard'
import Icon from '@/components/ui/Icon'

export default function MostPopular() {
  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold mb-6 text-primary flex items-center gap-2">
        <Icon name="chart" size={24} />
        Most Popular
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {popularProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
