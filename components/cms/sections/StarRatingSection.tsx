'use client'

interface StarRatingSectionProps {
  props: {
    rating?: number
    maxStars?: number
    size?: 'small' | 'medium' | 'large' | 'xl'
    filledColor?: string
    emptyColor?: string
    showNumber?: boolean
    numberPosition?: 'left' | 'right'
    label?: string
    alignment?: 'left' | 'center' | 'right'
    backgroundColor?: string
    padding?: 'none' | 'small' | 'medium' | 'large'
    customClassName?: string
    hideOnMobile?: boolean
  }
}

export default function StarRatingSection({ props }: StarRatingSectionProps) {
  const {
    rating = 4.5,
    maxStars = 5,
    size = 'medium',
    filledColor = '#FBBF24',
    emptyColor = '#374151',
    showNumber = true,
    numberPosition = 'right',
    label = '',
    alignment = 'center',
    backgroundColor,
    padding = 'none',
    customClassName,
    hideOnMobile,
  } = props

  const sizeClasses: Record<string, string> = {
    small: 'text-lg',
    medium: 'text-2xl',
    large: 'text-3xl',
    xl: 'text-4xl',
  }

  const alignmentClasses: Record<string, string> = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }

  const paddingClasses: Record<string, string> = {
    none: '',
    small: 'py-4 px-4',
    medium: 'py-8 px-4',
    large: 'py-12 px-4',
  }

  const clampedRating = Math.min(maxStars, Math.max(0, rating))
  const fullStars = Math.floor(clampedRating)
  const hasHalf = clampedRating - fullStars >= 0.25 && clampedRating - fullStars < 0.75
  const hasAlmostFull = clampedRating - fullStars >= 0.75
  const emptyStars = maxStars - fullStars - (hasHalf ? 1 : 0) - (hasAlmostFull ? 1 : 0)

  const adjustedFull = fullStars + (hasAlmostFull ? 1 : 0)

  const numberEl = showNumber ? (
    <span className="text-slate-300 font-semibold" style={{ fontSize: 'inherit' }}>
      {clampedRating.toFixed(1)}
    </span>
  ) : null

  return (
    <div
      className={`${paddingClasses[padding]} ${hideOnMobile ? 'hidden md:block' : ''} ${customClassName || ''}`}
      style={{ backgroundColor: backgroundColor || undefined }}
    >
      <div className={`flex flex-col ${alignment === 'left' ? 'items-start' : alignment === 'right' ? 'items-end' : 'items-center'} gap-1`}>
        <div className={`flex ${alignmentClasses[alignment]} items-center gap-2 ${sizeClasses[size]}`}>
          {numberPosition === 'left' && numberEl}
          <div className="flex items-center">
            {Array.from({ length: adjustedFull }).map((_, i) => (
              <span key={`full-${i}`} style={{ color: filledColor }}>{'\u2605'}</span>
            ))}
            {hasHalf && (
              <span className="relative inline-block">
                <span style={{ color: emptyColor }}>{'\u2605'}</span>
                <span className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                  <span style={{ color: filledColor }}>{'\u2605'}</span>
                </span>
              </span>
            )}
            {Array.from({ length: Math.max(0, emptyStars) }).map((_, i) => (
              <span key={`empty-${i}`} style={{ color: emptyColor }}>{'\u2605'}</span>
            ))}
          </div>
          {numberPosition === 'right' && numberEl}
        </div>
        {label && (
          <p className="text-slate-400 text-sm">{label}</p>
        )}
      </div>
    </div>
  )
}