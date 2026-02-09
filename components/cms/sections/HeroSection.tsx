'use client'

import Link from 'next/link'

interface HeroSectionProps {
  props: {
    title?: string
    subtitle?: string
    backgroundImage?: string
    ctaText?: string
    ctaLink?: string
    alignment?: 'left' | 'center' | 'right'
  }
}

export default function HeroSection({ props }: HeroSectionProps) {
  const {
    title = 'Welcome',
    subtitle,
    backgroundImage,
    ctaText,
    ctaLink,
    alignment = 'center',
  } = props

  const alignmentClasses = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  }

  return (
    <section
      className="relative min-h-[300px] sm:min-h-[350px] lg:min-h-[500px] flex items-center justify-center py-12 sm:py-16 lg:py-24"
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay */}
      {backgroundImage && (
        <div className="absolute inset-0 bg-black/60" />
      )}

      {/* Content */}
      <div className={`relative z-10 max-w-4xl mx-auto px-4 flex flex-col ${alignmentClasses[alignment]}`}>
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-3 sm:mb-4 lg:mb-6">
          {title}
        </h1>

        {subtitle && (
          <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-slate-300 mb-5 sm:mb-6 lg:mb-8 max-w-2xl">
            {subtitle}
          </p>
        )}

        {ctaText && ctaLink && (
          <Link
            href={ctaLink}
            className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 lg:px-8 lg:py-4 bg-primary text-black font-semibold rounded-lg hover:bg-primary/90 transition-colors text-sm sm:text-base lg:text-lg"
          >
            {ctaText}
          </Link>
        )}
      </div>
    </section>
  )
}
