'use client'

import { useState, useEffect, useCallback } from 'react'

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

  const [currentSlide, setCurrentSlide] = useState(0)

  const nextSlide = useCallback(() => {
    if (testimonials.length === 0) return
    setCurrentSlide(prev => (prev + 1) % testimonials.length)
  }, [testimonials.length])

  const prevSlide = useCallback(() => {
    if (testimonials.length === 0) return
    setCurrentSlide(prev => (prev - 1 + testimonials.length) % testimonials.length)
  }, [testimonials.length])

  // Autoplay for carousel
  useEffect(() => {
    if (layout !== 'carousel' || testimonials.length <= 1) return
    const timer = setInterval(nextSlide, 5000)
    return () => clearInterval(timer)
  }, [layout, testimonials.length, nextSlide])

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

  const renderCard = (testimonial: Testimonial, index: number) => (
    <div
      key={index}
      className={`border border-[#1f1f1f] ${cardRadiusClasses[cardBorderRadius]} p-5 sm:p-6 lg:p-8 transition-shadow hover:shadow-lg hover:shadow-black/20`}
      style={{ backgroundColor: cardBackgroundColor || '#141414' }}
    >
      {showStars && (
        <div className="text-yellow-500 text-sm mb-3" role="img" aria-label={`Rating: ${parseInt(testimonial.rating || '5', 10)} out of 5`}>
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
            alt={testimonial.author || ''}
            loading="lazy"
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
  )

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

        {layout === 'carousel' ? (
          <div className="relative">
            {/* Carousel */}
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {testimonials.map((testimonial, index) => (
                  <div key={index} className="w-full flex-shrink-0 px-2">
                    <div className="max-w-2xl mx-auto">
                      {renderCard(testimonial, index)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prev/Next Buttons */}
            {testimonials.length > 1 && (
              <>
                <button
                  onClick={prevSlide}
                  className="absolute left-0 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                  aria-label="Previous testimonial"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                  aria-label="Next testimonial"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </>
            )}

            {/* Dots */}
            {testimonials.length > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${index === currentSlide ? 'bg-primary' : 'bg-white/20'}`}
                    aria-label={`Go to testimonial ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {testimonials.map((testimonial, index) => renderCard(testimonial, index))}
          </div>
        )}
      </div>
    </section>
  )
}