import Image from 'next/image'
import Breadcrumb from '@/components/layout/Breadcrumb'
import ProductTabs from '@/components/product/ProductTabs'
import ProductPurchasePanel from '@/components/product/ProductPurchasePanel'
import RelatedProducts from '@/components/product/RelatedProducts'
import { scriptProducts } from '@/lib/mock-data'

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  // Find product by slug (in real app, this would fetch from API)
  const product = scriptProducts.find((p) => p.slug === slug) || scriptProducts[0]

  return (
    <main className="max-w-container mx-auto px-8 lg:px-12 py-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Scripts', href: '/products' },
          { label: product.name },
        ]}
      />

      {/* Product Title */}
      <div className="flex items-center gap-3 mb-8 mt-6">
        <h1 className="text-4xl font-extrabold text-white">{product.name}</h1>
        <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-primary/20">
          <span className="material-symbols-outlined text-sm icon-filled">verified</span>
          Verified
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-8 items-start mb-12">
        {/* Left Column - Gallery & Tabs */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          {/* Product Image/Gallery */}
          <div className="w-full aspect-video bg-surface-dark rounded-2xl border border-border-dark overflow-hidden relative group">
            <Image
              src={product.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDvwgfYMEvcI_nX3811VEyCy34SMnKHy9dmdnqG3nSMOUjjKLHrwM1Buu7vIN4sHUv_IHj3lxtx8AuvVgtQJrjdBjilef-qD6NbH3AMwpj-xP3Cl3XD4r8kxRx3ZJzJe8Y-Z4MqVrZdrhg60-dWHm_iNTlUzZhPqmEvucOUsNN2Cqq1nlRE-lUiK6PR4GpN2-YM32iXvk86ERNf_KfTr8v3fkU0u395JRo_hw-hlhfenuygiypi5Pyn0V13zGizBFBqXGrkP8TTlHSx'}
              alt={product.name}
              fill
              className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
            />

            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-gradient-to-t from-background-dark/80 to-transparent flex items-end p-8">
              <div className="flex gap-4">
                <button
                  type="button"
                  aria-label="Zoom in on image"
                  className="w-12 h-12 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center border border-white/20 cursor-pointer hover:bg-white/20"
                >
                  <span className="material-symbols-outlined">zoom_in</span>
                </button>
                <button
                  type="button"
                  aria-label="Play product video"
                  className="w-12 h-12 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center border border-white/20 cursor-pointer hover:bg-white/20"
                >
                  <span className="material-symbols-outlined">play_circle</span>
                </button>
              </div>
            </div>
          </div>

          {/* Product Tabs */}
          <ProductTabs product={product} />
        </div>

        {/* Right Column - Purchase Panel */}
        <div className="col-span-12 lg:col-span-4">
          <ProductPurchasePanel product={product} />
        </div>
      </div>

      {/* Related Products */}
      <RelatedProducts />
    </main>
  )
}

// Generate static params for demo purposes
export function generateStaticParams() {
  return scriptProducts.map((product) => ({
    slug: product.slug,
  }))
}
