'use client'

interface Testimonial {
  quote?: string
  author?: string
  role?: string
  avatar?: string
  rating?: string
}

interface TestimonialsSectionProps {
  props: {
    title?: string
    subtitle?: string
    layout?: 'carousel' | 'grid'
    testimonials?: Testimonial[]
    backgroundColor?: string
    cardBackgroundColor?: string
    textColor?: string
    cardBorderRadius?: 'none' | 'small' | 'medium' | 'large'
    showStars?: boolean
    padding?: 'none' | 'small' | 'medium' | 'large'
    hideOnMobile?: boolean
  }
}

export default function TestimonialsSection({ props }: TestimonialsSectionProps) {
  const {
    title,
    subtitle,
    layout = 'grid',
    testimonials = [],
    backgroundColor,
    cardBackgroundColor,
    textColor,
    cardBorderRadius = 'medium',
    showStars = true,
    padding = 'large',
    hideOnMobile,
  } = props

  if (testimonials.length === 0) {
    return null
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

  const renderStars = (rating?: string) => {
    const count = Math.min(5, Math.max(0, parseInt(rating || '5', 10) || 5))
    return '★'.repeat(count) + '☆'.repeat(5 - count)
  }

  return (
    <section
      className={`${paddingClasses[padding]} px-4 ${hideOnMobile ? 'hidden md:block' : ''}`}
      style={{ backgroundColor: backgroundColor || '#0d0d0d' }}
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

        <div className={`grid ${layout === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-4 sm:gap-6`}>
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className={`border border-[#1f1f1f] ${cardRadiusClasses[cardBorderRadius]} p-5 sm:p-6 lg:p-8`}
              style={{ backgroundColor: cardBackgroundColor || '#141414' }}
            >
              {showStars && (
                <div className="text-yellow-500 text-sm mb-3">
                  {renderStars(testimonial.rating)}
                </div>
              )}

              {testimonial.quote && (
                <p
                  className="text-slate-300 text-xs sm:text-sm lg:text-base mb-4 sm:mb-6 italic"
                  style={{ color: textColor || undefined }}
                >
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
              )}

              <div className="flex items-center gap-3">
                {testimonial.avatar ? (
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.author}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-semibold text-sm sm:text-base">
                      {testimonial.author?.charAt(0) || '?'}
                    </span>
                  </div>
                )}
                <div>
                  {testimonial.author && (
                    <p className="text-white font-medium text-xs sm:text-sm">{testimonial.author}</p>
                  )}
                  {testimonial.role && (
                    <p className="text-slate-500 text-[10px] sm:text-xs">{testimonial.role}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}