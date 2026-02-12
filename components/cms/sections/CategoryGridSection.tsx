'use client'

import Link from 'next/link'

interface Category {
  name?: string
  image?: string
  link?: string
}

interface CategoryGridSectionProps {
  props: {
    title?: string
    categories?: Category[]
    columns?: number
  }
}

export default function CategoryGridSection({ props }: CategoryGridSectionProps) {
  const {
    title,
    categories = [],
    columns = 4,
  } = props

  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  }

  return (
    <section className="py-10 sm:py-12 lg:py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {title && (
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white text-center mb-8 sm:mb-10 lg:mb-16">
            {title}
          </h2>
        )}

        {categories.length === 0 ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 sm:p-12 text-center">
            <p className="text-slate-500 text-sm sm:text-base">No categories added. Add categories in the editor.</p>
          </div>
        ) : (
          <div className={`grid ${gridCols[columns as keyof typeof gridCols] || gridCols[4]} gap-3 sm:gap-4 lg:gap-6`}>
            {categories.map((category, index) => (
              <Link
                key={index}
                href={category.link || '#'}
                className="group relative aspect-square bg-[#141414] border border-[#1f1f1f] rounded-lg sm:rounded-xl overflow-hidden hover:border-primary/30 transition-colors"
              >
                {category.image ? (
                  <img
                    src={category.image}
                    alt={category.name || ''}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-[#1a1a1a]" />
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Category Name */}
                {category.name && (
                  <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                    <h3 className="text-white font-semibold text-sm sm:text-base lg:text-lg">{category.name}</h3>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
