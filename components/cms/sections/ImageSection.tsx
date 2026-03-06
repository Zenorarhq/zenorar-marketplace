'use client'

interface ImageSectionProps {
  props: {
    src?: string
    alt?: string
    caption?: string
    width?: 'full' | 'large' | 'medium' | 'small'
    borderRadius?: 'none' | 'small' | 'medium' | 'large'
    alignment?: 'left' | 'center' | 'right'
    linkUrl?: string
    linkTarget?: '_self' | '_blank'
    shadow?: 'none' | 'small' | 'medium' | 'large'
    padding?: 'none' | 'small' | 'medium' | 'large'
    backgroundColor?: string
    objectFit?: 'cover' | 'contain' | 'fill' | 'none'
    hideOnMobile?: boolean
  }
}

export default function ImageSection({ props }: ImageSectionProps) {
  const {
    src,
    alt = '',
    caption,
    width = 'full',
    borderRadius = 'medium',
    alignment = 'center',
    linkUrl,
    linkTarget = '_self',
    shadow = 'none',
    padding = 'medium',
    backgroundColor,
    objectFit = 'cover',
    hideOnMobile,
  } = props

  if (!src) {
    return (
      <div className="py-6 sm:py-8 px-4">
        <div className="max-w-4xl mx-auto bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 sm:p-12 text-center">
          <p className="text-slate-500 text-sm sm:text-base">No image selected</p>
        </div>
      </div>
    )
  }

  const widthClasses: Record<string, string> = {
    full: 'max-w-full',
    large: 'max-w-5xl',
    medium: 'max-w-3xl',
    small: 'max-w-xl',
  }

  const radiusClasses: Record<string, string> = {
    none: 'rounded-none',
    small: 'rounded-md',
    medium: 'rounded-lg',
    large: 'rounded-2xl',
  }

  const alignClasses: Record<string, string> = {
    left: 'mr-auto',
    center: 'mx-auto',
    right: 'ml-auto',
  }

  const shadowClasses: Record<string, string> = {
    none: '',
    small: 'shadow-md',
    medium: 'shadow-lg',
    large: 'shadow-2xl',
  }

  const paddingClasses: Record<string, string> = {
    none: 'py-0',
    small: 'py-3 sm:py-4',
    medium: 'py-6 sm:py-8',
    large: 'py-10 sm:py-14',
  }

  const objectFitClasses: Record<string, string> = {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
    none: 'object-none',
  }

  const imgEl = (
    <img
      src={src}
      alt={alt}
      className={`w-full ${radiusClasses[borderRadius]} ${shadowClasses[shadow]} ${objectFitClasses[objectFit]}`}
    />
  )

  return (
    <figure
      className={`${paddingClasses[padding]} px-4 ${hideOnMobile ? 'hidden md:block' : ''}`}
      style={{ backgroundColor: backgroundColor || undefined }}
    >
      <div className={`${widthClasses[width]} ${alignClasses[alignment]}`}>
        {linkUrl ? (
          <a href={linkUrl} target={linkTarget} rel={linkTarget === '_blank' ? 'noopener noreferrer' : undefined}>
            {imgEl}
          </a>
        ) : (
          imgEl
        )}
        {caption && (
          <figcaption className="text-slate-500 text-xs sm:text-sm text-center mt-3 sm:mt-4">
            {caption}
          </figcaption>
        )}
      </div>
    </figure>
  )
}