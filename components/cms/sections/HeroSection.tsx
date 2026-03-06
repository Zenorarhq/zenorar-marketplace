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
    titleColor?: string
    subtitleColor?: string
    buttonColor?: string
    buttonTextColor?: string
    secondButtonText?: string
    secondButtonLink?: string
    gradientFrom?: string
    gradientTo?: string
    padding?: 'none' | 'small' | 'medium' | 'large'
    borderRadius?: 'none' | 'small' | 'medium' | 'large'
    overlayOpacity?: 'none' | 'light' | 'medium' | 'dark'
    videoUrl?: string
    hideOnMobile?: boolean
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
    titleColor,
    subtitleColor,
    buttonColor,
    buttonTextColor,
    secondButtonText,
    secondButtonLink,
    gradientFrom,
    gradientTo,
    padding = 'large',
    borderRadius = 'none',
    overlayOpacity = 'medium',
    hideOnMobile,
  } = props

  const alignmentClasses: Record<string, string> = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  }

  const paddingClasses: Record<string, string> = {
    none: 'py-6 sm:py-8',
    small: 'py-8 sm:py-12',
    medium: 'py-12 sm:py-16 lg:py-24',
    large: 'py-16 sm:py-20 lg:py-32',
  }

  const radiusClasses: Record<string, string> = {
    none: '',
    small: 'rounded-md',
    medium: 'rounded-lg',
    large: 'rounded-2xl',
  }

  const overlayClasses: Record<string, string> = {
    none: '',
    light: 'bg-black/30',
    medium: 'bg-black/60',
    dark: 'bg-black/80',
  }

  const sectionStyle: React.CSSProperties = {}
  if (backgroundImage) {
    sectionStyle.backgroundImage = `url(${backgroundImage})`
    sectionStyle.backgroundSize = 'cover'
    sectionStyle.backgroundPosition = 'center'
  }
  if (gradientFrom && gradientTo && !backgroundImage) {
    sectionStyle.background = `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`
  }

  return (
    <section
      className={`relative min-h-[300px] sm:min-h-[350px] lg:min-h-[500px] flex items-center justify-center ${paddingClasses[padding]} ${radiusClasses[borderRadius]} overflow-hidden ${hideOnMobile ? 'hidden md:flex' : ''}`}
      style={sectionStyle}
    >
      {backgroundImage && overlayOpacity !== 'none' && (
        <div className={`absolute inset-0 ${overlayClasses[overlayOpacity]}`} />
      )}

      <div className={`relative z-10 max-w-4xl mx-auto px-4 flex flex-col ${alignmentClasses[alignment]}`}>
        <h1
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-3 sm:mb-4 lg:mb-6"
          style={{ color: titleColor || undefined }}
        >
          {title}
        </h1>

        {subtitle && (
          <p
            className="text-base sm:text-lg lg:text-xl xl:text-2xl text-slate-300 mb-5 sm:mb-6 lg:mb-8 max-w-2xl"
            style={{ color: subtitleColor || undefined }}
          >
            {subtitle}
          </p>
        )}

        <div className="flex flex-wrap gap-3 sm:gap-4">
          {ctaText && ctaLink && (
            <Link
              href={ctaLink}
              className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 lg:px-8 lg:py-4 bg-primary text-black font-semibold rounded-lg hover:brightness-110 transition-all text-sm sm:text-base lg:text-lg"
              style={{
                backgroundColor: buttonColor || undefined,
                color: buttonTextColor || undefined,
              }}
            >
              {ctaText}
            </Link>
          )}

          {secondButtonText && secondButtonLink && (
            <Link
              href={secondButtonLink}
              className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 lg:px-8 lg:py-4 bg-transparent text-white border-2 border-white/30 font-semibold rounded-lg hover:border-white/60 transition-all text-sm sm:text-base lg:text-lg"
            >
              {secondButtonText}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
