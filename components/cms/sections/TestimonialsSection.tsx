'use client'

interface Testimonial {
  quote?: string
  author?: string
  role?: string
  avatar?: string
}

interface TestimonialsSectionProps {
  props: {
    title?: string
    layout?: 'carousel' | 'grid'
    testimonials?: Testimonial[]
  }
}

export default function TestimonialsSection({ props }: TestimonialsSectionProps) {
  const {
    title,
    layout = 'grid',
    testimonials = [],
  } = props

  if (testimonials.length === 0) {
    return null
  }

  return (
    <section className="py-10 sm:py-12 lg:py-20 px-4 bg-[#0d0d0d]">
      <div className="max-w-6xl mx-auto">
        {title && (
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white text-center mb-8 sm:mb-10 lg:mb-16">
            {title}
          </h2>
        )}

        <div className={`grid ${layout === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-4 sm:gap-6`}>
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-[#141414] border border-[#1f1f1f] rounded-lg sm:rounded-xl p-5 sm:p-6 lg:p-8"
            >
              {testimonial.quote && (
                <p className="text-slate-300 text-xs sm:text-sm lg:text-base mb-4 sm:mb-6 italic">
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
