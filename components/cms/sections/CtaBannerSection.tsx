'use client'

import Link from 'next/link'

interface CtaBannerSectionProps {
  props: {
    title?: string
    description?: string
    buttonText?: string
    buttonLink?: string
    backgroundColor?: string
  }
}

export default function CtaBannerSection({ props }: CtaBannerSectionProps) {
  const {
    title = 'Ready to get started?',
    description,
    buttonText = 'Get Started',
    buttonLink = '#',
    backgroundColor = '#43D678',
  } = props

  return (
    <section
      className="py-10 sm:py-12 lg:py-16 px-4"
      style={{ backgroundColor }}
    >
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-black mb-3 sm:mb-4">
          {title}
        </h2>

        {description && (
          <p className="text-black/80 text-sm sm:text-base lg:text-lg mb-5 sm:mb-6 lg:mb-8 max-w-2xl mx-auto px-4">
            {description}
          </p>
        )}

        {buttonText && buttonLink && (
          <Link
            href={buttonLink}
            className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 lg:px-8 lg:py-4 bg-black text-white font-semibold text-sm sm:text-base rounded-lg hover:bg-black/80 transition-colors"
          >
            {buttonText}
          </Link>
        )}
      </div>
    </section>
  )
}
