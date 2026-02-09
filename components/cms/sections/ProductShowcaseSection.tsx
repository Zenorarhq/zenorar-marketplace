'use client'

interface ProductShowcaseSectionProps {
  props: {
    title?: string
    productIds?: string[]
    columns?: number
    showPrice?: boolean
    showRating?: boolean
  }
}

export default function ProductShowcaseSection({ props }: ProductShowcaseSectionProps) {
  const {
    title,
    productIds = [],
    columns = 4,
    showPrice = true,
    showRating = true,
  } = props

  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
  }

  // TODO: Fetch actual products from API based on productIds
  // For now, show placeholder

  return (
    <section className="py-10 sm:py-12 lg:py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {title && (
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white text-center mb-8 sm:mb-10 lg:mb-16">
            {title}
          </h2>
        )}

        {productIds.length === 0 ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 sm:p-12 text-center">
            <p className="text-slate-500 text-sm sm:text-base">No products selected. Add product IDs in the editor.</p>
          </div>
        ) : (
          <div className={`grid ${gridCols[columns as keyof typeof gridCols] || gridCols[4]} gap-3 sm:gap-4 lg:gap-6`}>
            {productIds.map((id, index) => (
              <div
                key={index}
                className="bg-[#141414] border border-[#1f1f1f] rounded-lg sm:rounded-xl overflow-hidden group hover:border-primary/30 transition-colors"
              >
                <div className="aspect-square bg-[#1a1a1a] flex items-center justify-center">
                  <p className="text-slate-500 text-xs sm:text-sm">Product #{id}</p>
                </div>
                <div className="p-3 sm:p-4">
                  <h3 className="text-white font-medium text-sm sm:text-base mb-1 sm:mb-2">Product Name</h3>
                  {showPrice && (
                    <p className="text-primary font-bold text-sm sm:text-base">$XX.XX</p>
                  )}
                  {showRating && (
                    <div className="flex items-center gap-1 mt-1.5 sm:mt-2">
                      <span className="text-yellow-500 text-xs sm:text-sm">★★★★★</span>
                      <span className="text-slate-500 text-xs sm:text-sm">(0)</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
