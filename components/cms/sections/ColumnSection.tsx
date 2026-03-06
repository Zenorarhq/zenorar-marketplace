'use client'

import React from 'react'

interface ColumnSectionProps {
  props: {
    title?: string
    text?: string
    imageUrl?: string
    imageAlt?: string
    buttonText?: string
    buttonLink?: string
    backgroundColor?: string
    padding?: 'none' | 'small' | 'medium' | 'large'
    borderRadius?: 'none' | 'small' | 'medium' | 'large'
    alignment?: 'left' | 'center' | 'right'
    margin?: 'none' | 'small' | 'medium' | 'large'
    borderWidth?: 'none' | '1' | '2' | '4'
    borderColor?: string
    borderStyle?: 'solid' | 'dashed' | 'dotted'
    backgroundImage?: string
    overlayOpacity?: 'none' | 'light' | 'medium' | 'dark'
    gradientFrom?: string
    gradientTo?: string
    customClassName?: string
    hideOnMobile?: boolean
    hideOnTablet?: boolean
    verticalAlign?: 'top' | 'center' | 'bottom'
    horizontalAlign?: 'left' | 'center' | 'right'
  }
  children?: React.ReactNode
}

export default function ColumnSection({ props, children }: ColumnSectionProps) {
  const {
    title,
    text,
    imageUrl,
    imageAlt,
    buttonText,
    buttonLink,
    backgroundColor,
    padding = 'medium',
    borderRadius = 'medium',
    alignment = 'left',
    margin = 'none',
    borderWidth = 'none',
    borderColor,
    borderStyle = 'solid',
    backgroundImage,
    overlayOpacity = 'none',
    gradientFrom,
    gradientTo,
    customClassName,
    hideOnMobile,
    hideOnTablet,
    verticalAlign,
    horizontalAlign,
  } = props

  const paddingClasses: Record<string, string> = {
    none: 'p-0',
    small: 'p-2 md:p-4',
    medium: 'p-4 md:p-6',
    large: 'p-6 md:p-10',
  }

  const radiusClasses: Record<string, string> = {
    none: 'rounded-none',
    small: 'rounded-md',
    medium: 'rounded-lg',
    large: 'rounded-2xl',
  }

  const alignClasses: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }

  const marginClasses: Record<string, string> = {
    none: '',
    small: 'my-2 md:my-4',
    medium: 'my-4 md:my-6',
    large: 'my-6 md:my-10',
  }

  const borderWidthClasses: Record<string, string> = {
    none: '',
    '1': 'border',
    '2': 'border-2',
    '4': 'border-4',
  }

  const borderStyleClasses: Record<string, string> = {
    solid: 'border-solid',
    dashed: 'border-dashed',
    dotted: 'border-dotted',
  }

  const overlayClasses: Record<string, string> = {
    none: '',
    light: 'bg-black/20',
    medium: 'bg-black/50',
    dark: 'bg-black/70',
  }

  const verticalAlignClasses: Record<string, string> = {
    top: 'justify-start',
    center: 'justify-center',
    bottom: 'justify-end',
  }

  const horizontalAlignClasses: Record<string, string> = {
    left: 'items-start',
    center: 'items-center',
    right: 'items-end',
  }

  const hasPropsContent = title || text || imageUrl || buttonText
  const hasChildren = React.Children.count(children) > 0

  const style: React.CSSProperties = {}
  if (backgroundColor) style.backgroundColor = backgroundColor
  if (backgroundImage) {
    style.backgroundImage = `url(${backgroundImage})`
    style.backgroundSize = 'cover'
    style.backgroundPosition = 'center'
  }
  if (gradientFrom && gradientTo && !backgroundImage) {
    style.background = `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`
  }
  if (borderColor && borderWidth !== 'none') {
    style.borderColor = borderColor
  }

  const visibilityClasses = [
    hideOnMobile ? 'hidden md:block' : '',
    hideOnTablet ? 'md:hidden lg:block' : '',
  ].filter(Boolean).join(' ')

  const flexClasses = (verticalAlign || horizontalAlign)
    ? `flex flex-col ${verticalAlignClasses[verticalAlign || 'top'] || ''} ${horizontalAlignClasses[horizontalAlign || alignment] || ''}`
    : ''

  return (
    <div
      className={`${paddingClasses[padding]} ${radiusClasses[borderRadius]} ${alignClasses[alignment]} bg-[#141414] relative ${marginClasses[margin]} ${borderWidthClasses[borderWidth]} ${borderWidth !== 'none' ? borderStyleClasses[borderStyle] : ''} ${visibilityClasses} ${flexClasses} ${customClassName || ''}`}
      style={style}
    >
      {backgroundImage && overlayOpacity !== 'none' && (
        <div className={`absolute inset-0 ${overlayClasses[overlayOpacity]} ${radiusClasses[borderRadius]}`} />
      )}

      <div className="relative w-full">
        {hasChildren ? (
          <div className="space-y-4">
            {children}
          </div>
        ) : hasPropsContent ? (
          <>
            {imageUrl && (
              <img
                src={imageUrl}
                alt={imageAlt || title || ''}
                className="w-full h-48 object-cover rounded-lg mb-4"
                loading="lazy"
              />
            )}
            {title && (
              <h3 className="text-xl md:text-2xl font-semibold text-white mb-3">
                {title}
              </h3>
            )}
            {text && (
              <p className="text-slate-400 text-sm md:text-base mb-4 leading-relaxed">
                {text}
              </p>
            )}
            {buttonText && buttonLink && (
              <a
                href={buttonLink}
                className="inline-block px-4 py-2 bg-primary text-black rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                {buttonText}
              </a>
            )}
          </>
        ) : (
          <div className="border-2 border-dashed border-[#2a2a2a] rounded-lg p-8 text-center min-h-[100px] flex items-center justify-center">
            <div>
              <p className="text-slate-500">Content Block</p>
              <p className="text-slate-600 text-xs mt-1">Drop sections here or configure in properties</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
