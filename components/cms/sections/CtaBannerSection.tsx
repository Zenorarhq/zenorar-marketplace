'use client'

import Link from 'next/link'

interface CtaBannerSectionProps {
  props: {
    title?: string
    description?: string
    buttonText?: string
    buttonLink?: string
    backgroundColor?: string
    gradientFrom?: string
    gradientTo?: string
    backgroundImage?: string
    titleColor?: string
    subtitleColor?: string
    buttonColor?: string
    buttonTextColor?: string
    alignment?: 'left' | 'center' | 'right'
    padding?: 'none' | 'small' | 'medium' | 'large'
    borderRadius?: 'none' | 'small' | 'medium' | 'large'
    secondButtonText?: string
    secondButtonLink?: string
    hideOnMobile?: boolean
  }
}

export default function CtaBannerSection({ props }: CtaBannerSectionProps) {
  const {
    title = 'Ready to get started?',
    description,
    buttonText = 'Get Started',
    buttonLink = '#',
    backgroundColor = '#43D678',
    gradientFrom,
    gradientTo,
    backgroundImage,
    titleColor,
    subtitleColor,
    buttonColor,
    buttonTextColor,
    alignment = 'center',
    padding = 'medium',
    borderRadius = 'none',
    secondButtonText,
    secondButtonLink,
    hideOnMobile,
  } = props

  const alignClasses: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }

  const paddingClasses: Record<string, string> = {
    none: 'py-4 sm:py-6',
    small: 'py-6 sm:py-8',
    medium: 'py-10 sm:py-12 lg:py-16',
    large: 'py-14 sm:py-16 lg:py-24',
  }

  const radiusClasses: Record<string, string> = {
    none: '',
    small: 'rounded-md',
    medium: 'rounded-lg',
    large: 'rounded-2xl',
  }

  const sectionStyle: React.CSSProperties = { backgroundColor }
  if (gradientFrom && gradientTo) {
    sectionStyle.background = `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`
  }
  if (backgroundImage) {
    sectionStyle.backgroundImage = `url(${backgroundImage})`
    sectionStyle.backgroundSize = 'cover'
    sectionStyle.backgroundPosition = 'center'
  }

  const btnAlignClasses: Record<string, string> = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }

  return (
    <section
      className={`${paddingClasses[padding]} px-4 relative overflow-hidden ${radiusClasses[borderRadius]} ${hideOnMobile ? 'hidden md:block' : ''}`}
      style={sectionStyle}
    >
      <div className={`max-w-4xl mx-auto ${alignClasses[alignment]}`}>
        <h2
          className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-black mb-3 sm:mb-4"
          style={{ color: titleColor || undefined }}
        >
          {title}
        </h2>

        {description && (
          <p
            className="text-black/80 text-sm sm:text-base lg:text-lg mb-5 sm:mb-6 lg:mb-8 max-w-2xl mx-auto px-4"
            style={{ color: subtitleColor || undefined }}
          >
            {description}
          </p>
        )}

        <div className={`flex flex-wrap gap-3 sm:gap-4 ${btnAlignClasses[alignment]}`}>
          {buttonText && buttonLink && (
            <Link
              href={buttonLink}
              className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 lg:px-8 lg:py-4 bg-black text-white font-semibold text-sm sm:text-base rounded-lg hover:bg-black/80 hover:scale-105 transition-all"
              style={{
                backgroundColor: buttonColor || undefined,
                color: buttonTextColor || undefined,
              }}
            >
              {buttonText}
            </Link>
          )}

          {secondButtonText && secondButtonLink && (
            <Link
              href={secondButtonLink}
              className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 lg:px-8 lg:py-4 bg-transparent text-black border-2 border-black/30 font-semibold text-sm sm:text-base rounded-lg hover:border-black/60 hover:scale-105 transition-all"
            >
              {secondButtonText}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}