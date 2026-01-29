import Breadcrumb from '@/components/layout/Breadcrumb'
import FilterSidebar from '@/components/filters/FilterSidebar'
import ScriptCard from '@/components/cards/ScriptCard'
import { scriptProducts } from '@/lib/mock-data'

export default function ProductsPage() {
  return (
    <main className="max-w-container mx-auto px-8 lg:px-12 pb-24">
      {/* Breadcrumb */}
      <div className="py-4">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Scripts' },
          ]}
        />
      </div>

      {/* Page Header */}
      <header className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-white mb-2">Premium Scripts</h1>
          <p className="text-slate-500 max-w-2xl">
            High-performance automation tools, scrapers, and full-stack kits developed by industry experts.
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-500">Sort by:</span>
          <select className="bg-surface-dark border-border-dark rounded-lg text-slate-300 text-sm focus:ring-primary focus:border-primary px-3 py-2">
            <option>Most Popular</option>
            <option>Newest</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
          </select>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex gap-8">
        {/* Sidebar */}
        <FilterSidebar />

        {/* Product Grid */}
        <div className="flex-grow">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scriptProducts.map((product) => (
              <ScriptCard key={product.id} product={product} />
            ))}
          </div>

          {/* Show More Button */}
          <div className="mt-16 flex justify-center">
            <button className="bg-surface-dark border border-border-dark text-white px-8 py-3 rounded-xl font-bold hover:border-primary transition-all flex items-center gap-2">
              Show More Results
              <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
