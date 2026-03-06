'use client'

import Link from 'next/link'
import Icon from '@/components/ui/Icon'

interface Plan {
  name?: string
  price?: string
  period?: string
  features?: string[]
  buttonText?: string
  buttonLink?: string
  highlighted?: boolean
  description?: string
  badge?: string
}

interface PricingTableSectionProps {
  props: {
    title?: string
    subtitle?: string
    plans?: Plan[]
    backgroundColor?: string
    highlightColor?: string
    cardBackgroundColor?: string
    padding?: 'none' | 'small' | 'medium' | 'large'
    columns?: 'auto' | '2' | '3' | '4'
    hideOnMobile?: boolean
  }
}

export default function PricingTableSection({ props }: PricingTableSectionProps) {
  const {
    title,
    subtitle,
    plans = [],
    backgroundColor,
    highlightColor,
    cardBackgroundColor,
    padding = 'large',
    columns = 'auto',
    hideOnMobile,
  } = props

  const paddingClasses: Record<string, string> = {
    none: 'py-4',
    small: 'py-6 sm:py-8',
    medium: 'py-10 sm:py-12 lg:py-16',
    large: 'py-10 sm:py-12 lg:py-20',
  }

  const getGridCols = (count: number) => {
    if (columns !== 'auto') {
      const colMap: Record<string, string> = {
        '2': 'grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto',
        '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        '4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
      }
      return colMap[columns] || colMap['3']
    }
    if (count === 1) return 'grid-cols-1 max-w-md mx-auto'
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto'
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
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

        {plans.length === 0 ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 sm:p-12 text-center">
            <p className="text-slate-500 text-sm sm:text-base">No pricing plans added. Add plans in the editor.</p>
          </div>
        ) : (
          <div className={`grid ${getGridCols(plans.length)} gap-4 sm:gap-6 lg:gap-8`}>
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative rounded-xl sm:rounded-2xl p-5 sm:p-6 lg:p-8 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-1 transition-all ${
                  plan.highlighted
                    ? 'border-2'
                    : 'border border-[#1f1f1f]'
                }`}
                style={{
                  backgroundColor: plan.highlighted
                    ? (highlightColor ? `${highlightColor}15` : 'rgba(67,214,120,0.1)')
                    : (cardBackgroundColor || '#141414'),
                  borderColor: plan.highlighted ? (highlightColor || undefined) : undefined,
                }}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className="text-black text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap"
                      style={{ backgroundColor: highlightColor || undefined }}
                    >
                      {plan.badge || 'Most Popular'}
                    </span>
                  </div>
                )}

                {plan.name && (
                  <h3 className="text-white font-semibold text-lg sm:text-xl mb-2">{plan.name}</h3>
                )}

                {plan.description && (
                  <p className="text-slate-400 text-xs sm:text-sm mb-3">{plan.description}</p>
                )}

                <div className="mb-4 sm:mb-6">
                  <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">{plan.price || '$0'}</span>
                  {plan.period && (
                    <span className="text-slate-500 text-sm sm:text-base ml-1">{plan.period}</span>
                  )}
                </div>

                {plan.features && plan.features.length > 0 && (
                  <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-2 sm:gap-3 text-slate-300">
                        <Icon name="check" size={16} className="text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-xs sm:text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {plan.buttonText && plan.buttonLink && (
                  <Link
                    href={plan.buttonLink}
                    className={`block w-full text-center py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-colors ${
                      plan.highlighted
                        ? 'bg-primary text-black hover:bg-primary/90'
                        : 'bg-[#1a1a1a] text-white border border-[#2a2a2a] hover:border-primary/50'
                    }`}
                    style={plan.highlighted && highlightColor ? { backgroundColor: highlightColor } : undefined}
                  >
                    {plan.buttonText}
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}