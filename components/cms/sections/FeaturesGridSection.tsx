'use client'

import Icon from '@/components/ui/Icon'

interface Feature {
  icon?: string
  title?: string
  description?: string
}

interface FeaturesGridSectionProps {
  props: {
    title?: string
    subtitle?: string
    columns?: number
    features?: Feature[]
  }
}

export default function FeaturesGridSection({ props }: FeaturesGridSectionProps) {
  const {
    title,
    subtitle,
    columns = 3,
    features = [],
  } = props

  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <section className="py-10 sm:py-12 lg:py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        {(title || subtitle) && (
          <div className="text-center mb-8 sm:mb-10 lg:mb-16">
            {title && (
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-slate-400 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto px-4">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Features Grid */}
        <div className={`grid ${gridCols[columns as keyof typeof gridCols] || gridCols[3]} gap-4 sm:gap-6 lg:gap-8`}>
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-[#141414] border border-[#1f1f1f] rounded-lg sm:rounded-xl p-5 sm:p-6 lg:p-8 hover:border-primary/30 transition-colors"
            >
              {feature.icon && (
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                  <Icon name={feature.icon} size={20} className="text-primary sm:hidden" />
                  <Icon name={feature.icon} size={24} className="text-primary hidden sm:block" />
                </div>
              )}
              {feature.title && (
                <h3 className="text-white font-semibold text-base sm:text-lg mb-2">
                  {feature.title}
                </h3>
              )}
              {feature.description && (
                <p className="text-slate-400 text-xs sm:text-sm">
                  {feature.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
