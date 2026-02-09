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
}

interface PricingTableSectionProps {
  props: {
    title?: string
    subtitle?: string
    plans?: Plan[]
  }
}

export default function PricingTableSection({ props }: PricingTableSectionProps) {
  const {
    title,
    subtitle,
    plans = [],
  } = props

  // Determine grid columns based on number of plans
  const getGridCols = (count: number) => {
    if (count === 1) return 'grid-cols-1 max-w-md mx-auto'
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto'
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
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

        {plans.length === 0 ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 sm:p-12 text-center">
            <p className="text-slate-500 text-sm sm:text-base">No pricing plans added. Add plans in the editor.</p>
          </div>
        ) : (
          <div className={`grid ${getGridCols(plans.length)} gap-4 sm:gap-6 lg:gap-8`}>
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative rounded-xl sm:rounded-2xl p-5 sm:p-6 lg:p-8 ${
                  plan.highlighted
                    ? 'bg-primary/10 border-2 border-primary'
                    : 'bg-[#141414] border border-[#1f1f1f]'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-black text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan Name */}
                {plan.name && (
                  <h3 className="text-white font-semibold text-lg sm:text-xl mb-2">{plan.name}</h3>
                )}

                {/* Price */}
                <div className="mb-4 sm:mb-6">
                  <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">{plan.price || '$0'}</span>
                  {plan.period && (
                    <span className="text-slate-500 text-sm sm:text-base ml-1">{plan.period}</span>
                  )}
                </div>

                {/* Features */}
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

                {/* CTA Button */}
                {plan.buttonText && plan.buttonLink && (
                  <Link
                    href={plan.buttonLink}
                    className={`block w-full text-center py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-colors ${
                      plan.highlighted
                        ? 'bg-primary text-black hover:bg-primary/90'
                        : 'bg-[#1a1a1a] text-white border border-[#2a2a2a] hover:border-primary/50'
                    }`}
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
