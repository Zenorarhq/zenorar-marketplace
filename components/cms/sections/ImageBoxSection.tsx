'use client'

interface ImageBoxSectionProps {
  props: {
    imageUrl?: string
    imageAlt?: string
    title?: string
    description?: string
    imagePosition?: 'top' | 'left' | 'right' | 'bottom'
    imageHeight?: 'small' | 'medium' | 'large' | 'auto'
    objectFit?: 'cover' | 'contain'
    alignment?: 'left' | 'center' | 'right'
    titleTag?: 'h3' | 'h4' | 'h5' | 'h6'
    linkUrl?: string
    linkTarget?: '_self' | '_blank'
    backgroundColor?: string
    textColor?: string
    padding?: 'none' | 'small' | 'medium' | 'large'
    borderRadius?: 'none' | 'small' | 'medium' | 'large'
    shadow?: 'none' | 'small' | 'medium' | 'large'
    customClassName?: string
    hideOnMobile?: boolean
  }
}

export default function ImageBoxSection({ props }: ImageBoxSectionProps) {
  const {
    imageUrl,
    imageAlt = '',
    title = 'Image Box Title',
    description = 'A short description below the image.',
    imagePosition = 'top',
    imageHeight = 'medium',
    objectFit = 'cover',
    alignment = 'center',
    titleTag = 'h3',
    linkUrl,
    linkTarget = '_self',
    backgroundColor,
    textColor,
    padding = 'medium',
    borderRadius = 'medium',
    shadow = 'none',
    customClassName,
    hideOnMobile,
  } = props

  const imageHeightClasses: Record<string, string> = {
    small: 'h-32',
    medium: 'h-48',
    large: 'h-64',
    auto: 'h-auto',
  }

  const alignmentClasses: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }

  const borderRadiusClasses: Record<string, string> = {
    none: 'rounded-none',
    small: 'rounded-md',
    medium: 'rounded-lg',
    large: 'rounded-2xl',
  }

  const shadowClasses: Record<string, string> = {
    none: '',
    small: 'shadow-sm',
    medium: 'shadow-md',
    large: 'shadow-lg',
  }

  const paddingClasses: Record<string, string> = {
    none: '',
    small: 'p-3',
    medium: 'p-5',
    large: 'p-8',
  }

  const layoutClasses: Record<string, string> = {
    top: 'flex-col',
    left: 'flex-row',
    right: 'flex-row-reverse',
    bottom: 'flex-col-reverse',
  }

  const isHorizontal = imagePosition === 'left' || imagePosition === 'right'

  const TitleTag = titleTag as keyof React.JSX.IntrinsicElements

  const imageElement = imageUrl ? (
    <img
      src={imageUrl}
      alt={imageAlt}
      loading="lazy"
      className={`w-full ${isHorizontal ? 'w-1/2 flex-shrink-0' : ''} ${imageHeightClasses[imageHeight]} ${objectFit === 'cover' ? 'object-cover' : 'object-contain'}`}
    />
  ) : (
    <div className={`w-full ${isHorizontal ? 'w-1/2 flex-shrink-0' : ''} ${imageHeightClasses[imageHeight]} bg-[#1a1a1a] flex items-center justify-center`}>
      <p className="text-slate-500 text-sm">No Image</p>
    </div>
  )

  const textElement = (
    <div className={`${paddingClasses[padding]} ${alignmentClasses[alignment]}`}>
      {title && (
        <TitleTag className="text-white font-semibold text-lg mb-2">
          {title}
        </TitleTag>
      )}
      {description && (
        <p className="text-slate-400 text-sm leading-relaxed">
          {description}
        </p>
      )}
    </div>
  )

  const content = (
    <div
      className={`flex ${layoutClasses[imagePosition]} overflow-hidden ${borderRadiusClasses[borderRadius]} ${shadowClasses[shadow]} border border-[#1f1f1f] ${hideOnMobile ? 'hidden md:block' : ''} ${customClassName || ''}`}
      style={{ backgroundColor: backgroundColor || '#141414', color: textColor || undefined }}
    >
      {imageElement}
      {textElement}
    </div>
  )

  if (linkUrl) {
    return (
      <a href={linkUrl} target={linkTarget} rel={linkTarget === '_blank' ? 'noopener noreferrer' : undefined} className="block hover:opacity-90 hover:-translate-y-1 hover:shadow-lg transition-all">
        {content}
      </a>
    )
  }

  return content
}