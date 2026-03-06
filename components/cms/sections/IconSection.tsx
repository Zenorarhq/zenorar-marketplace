'use client'

interface IconSectionProps {
  props: {
    icon?: string
    size?: 'small' | 'medium' | 'large' | 'xl' | '2xl'
    color?: string
    alignment?: 'left' | 'center' | 'right'
    linkUrl?: string
    linkTarget?: '_self' | '_blank'
    backgroundColor?: string
    backgroundShape?: 'none' | 'circle' | 'square' | 'rounded'
    padding?: 'none' | 'small' | 'medium' | 'large'
    customClassName?: string
    hideOnMobile?: boolean
  }
}

export default function IconSection({ props }: IconSectionProps) {
  const {
    icon = '\u2B50',
    size = 'large',
    color,
    alignment = 'center',
    linkUrl,
    linkTarget = '_self',
    backgroundColor,
    backgroundShape = 'none',
    padding = 'none',
    customClassName,
    hideOnMobile,
  } = props

  const sizeClasses: Record<string, string> = {
    small: 'text-2xl',
    medium: 'text-3xl',
    large: 'text-4xl',
    xl: 'text-5xl',
    '2xl': 'text-6xl',
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

  const shapeClasses: Record<string, string> = {
    none: '',
    circle: 'rounded-full p-4',
    square: 'rounded-none p-4',
    rounded: 'rounded-lg p-4',
  }

  const iconElement = (
    <span
      className={`${sizeClasses[size]} ${backgroundShape !== 'none' ? shapeClasses[backgroundShape] : ''} inline-flex items-center justify-center`}
      style={{
        color: color || undefined,
        backgroundColor: backgroundShape !== 'none' ? (backgroundColor || '#1a1a1a') : undefined,
      }}
    >
      {icon}
    </span>
  )

  const content = linkUrl ? (
    <a href={linkUrl} target={linkTarget} rel={linkTarget === '_blank' ? 'noopener noreferrer' : undefined} className="inline-flex">
      {iconElement}
    </a>
  ) : iconElement

  return (
    <div
      className={`flex ${alignmentClasses[alignment]} ${paddingClasses[padding]} ${hideOnMobile ? 'hidden md:block' : ''} ${customClassName || ''}`}
      style={{ backgroundColor: backgroundShape === 'none' ? (backgroundColor || undefined) : undefined }}
    >
      {content}
    </div>
  )
}