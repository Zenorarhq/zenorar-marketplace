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
    backgroundColor?: string
    padding?: 'none' | 'small' | 'medium' | 'large'
    cardBackgroundColor?: string
    cardBorderRadius?: 'none' | 'small' | 'medium' | 'large'
    hideOnMobile?: boolean
  }
}

export default function CategoryGridSection({ props }: CategoryGridSectionProps) {
  const {
    title,
    categories = [],
    columns = 4,
    backgroundColor,
    padding = 'large',
    cardBackgroundColor,
    cardBorderRadius = 'medium',
    hideOnMobile,
  } = props

  const gridCols: Record<number, string> = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  }

  const paddingClasses: Record<string, string> = {
    none: 'py-4',
    small: 'py-6 sm:py-8',
    medium: 'py-10 sm:py-12 lg:py-16',
    large: 'py-10 sm:py-12 lg:py-20',
  }

  const cardRadiusClasses: Record<string, string> = {
    none: 'rounded-none',
    small: 'rounded-md',
    medium: 'rounded-lg sm:rounded-xl',
    large: 'rounded-2xl',
  }

  return (
    <section
      className={`${paddingClasses[padding]} px-4 ${hideOnMobile ? 'hidden md:block' : ''}`}
      style={{ backgroundColor: backgroundColor || undefined }}
    >
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
          <div className={`grid ${gridCols[columns as number] || gridCols[4]} gap-3 sm:gap-4 lg:gap-6`}>
            {categories.map((category, index) => (
              <Link
                key={index}
                href={category.link || '#'}
                aria-label={category.name || 'Category'}
                className={`group relative aspect-square border border-[#1f1f1f] ${cardRadiusClasses[cardBorderRadius]} overflow-hidden hover:border-primary/30 transition-colors`}
                style={{ backgroundColor: cardBackgroundColor || '#141414' }}
              >
                {category.image ? (
                  <img
                    src={category.image}
                    alt={category.name || ''}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-[#1a1a1a]" />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

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