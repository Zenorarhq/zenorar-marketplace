'use client'

import Icon from '@/components/ui/Icon'

interface Feature {
  icon?: string
  title?: string
  description?: string
  imageUrl?: string
  linkUrl?: string
}

interface FeaturesGridSectionProps {
  props: {
    title?: string
    subtitle?: string
    columns?: number
    features?: Feature[]
    backgroundColor?: string
    textColor?: string
    iconColor?: string
    cardBackgroundColor?: string
    cardBorderRadius?: 'none' | 'small' | 'medium' | 'large'
    cardBorder?: boolean
    padding?: 'none' | 'small' | 'medium' | 'large'
    alignment?: 'left' | 'center' | 'right'
    showIcons?: boolean
    hideOnMobile?: boolean
  }
}

export default function FeaturesGridSection({ props }: FeaturesGridSectionProps) {
  const {
    title,
    subtitle,
    columns = 3,
    features = [],
    backgroundColor,
    textColor,
    iconColor,
    cardBackgroundColor,
    cardBorderRadius = 'medium',
    cardBorder = true,
    padding = 'large',
    alignment = 'left',
    showIcons = true,
    hideOnMobile,
  } = props

  const gridCols: Record<number, string> = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
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

  const alignClasses: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }

  return (
    <section
      className={`${paddingClasses[padding]} px-4 ${hideOnMobile ? 'hidden md:block' : ''}`}
      style={{ backgroundColor: backgroundColor || undefined }}
    >
      <div className="max-w-6xl mx-auto">
        {(title || subtitle) && (
          <div className="text-center mb-8 sm:mb-10 lg:mb-16">
            {title && (
              <h2
                className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4"
                style={{ color: textColor || undefined }}
              >
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

        <div className={`grid ${gridCols[columns as number] || gridCols[3]} gap-4 sm:gap-6 lg:gap-8`}>
          {features.map((feature, index) => {
            const card = (
              <div
                key={index}
                className={`${cardRadiusClasses[cardBorderRadius]} p-5 sm:p-6 lg:p-8 hover:border-primary/30 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-1 transition-all ${cardBorder ? 'border border-[#1f1f1f]' : ''} ${alignClasses[alignment]}`}
                style={{ backgroundColor: cardBackgroundColor || '#141414' }}
              >
                {showIcons && feature.icon && (
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3 sm:mb-4 ${alignment === 'center' ? 'mx-auto' : ''}`} style={{ color: iconColor || undefined }}>
                    <Icon name={feature.icon} size={20} className="sm:hidden" />
                    <Icon name={feature.icon} size={24} className="hidden sm:block" />
                  </div>
                )}
                {feature.imageUrl && (
                  <img src={feature.imageUrl} alt={feature.title || ''} loading="lazy" className="w-full h-32 object-cover rounded-lg mb-3 sm:mb-4" />
                )}
                {feature.title && (
                  <h3
                    className="text-white font-semibold text-base sm:text-lg mb-2"
                    style={{ color: textColor || undefined }}
                  >
                    {feature.title}
                  </h3>
                )}
                {feature.description && (
                  <p className="text-slate-400 text-xs sm:text-sm">
                    {feature.description}
                  </p>
                )}
              </div>
            )

            if (feature.linkUrl) {
              return (
                <a key={index} href={feature.linkUrl} className="block">
                  {card}
                </a>
              )
            }
            return card
          })}
        </div>
      </div>
    </section>
  )
}