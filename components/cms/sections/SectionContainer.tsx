'use client'

import React from 'react'

interface ColumnContent {
  title?: string
  text?: string
  imageUrl?: string
  buttonText?: string
  buttonLink?: string
}

interface SectionContainerProps {
  props: {
    title?: string
    layout?: string
    gap?: 'none' | 'small' | 'medium' | 'large'
    padding?: 'none' | 'small' | 'medium' | 'large'
    backgroundColor?: string
    maxWidth?: 'full' | 'container' | 'narrow'
    verticalAlign?: 'top' | 'center' | 'bottom' | 'stretch'
    columns?: ColumnContent[]
    backgroundImage?: string
    overlayOpacity?: 'none' | 'light' | 'medium' | 'dark'
    gradientFrom?: string
    gradientTo?: string
    borderWidth?: 'none' | '1' | '2' | '4'
    borderColor?: string
    borderStyle?: 'solid' | 'dashed' | 'dotted'
    borderRadius?: 'none' | 'small' | 'medium' | 'large'
    margin?: 'none' | 'small' | 'medium' | 'large'
    paddingTop?: 'none' | 'small' | 'medium' | 'large'
    paddingBottom?: 'none' | 'small' | 'medium' | 'large'
    customClassName?: string
    customId?: string
    hideOnMobile?: boolean
    hideOnTablet?: boolean
    horizontalAlign?: 'left' | 'center' | 'right'
  }
  children?: React.ReactNode
}

export default function SectionContainer({ props, children }: SectionContainerProps) {
  const {
    title,
    layout = '1',
    gap = 'medium',
    padding = 'medium',
    backgroundColor,
    maxWidth = 'container',
    verticalAlign = 'top',
    columns = [],
    backgroundImage,
    overlayOpacity = 'none',
    gradientFrom,
    gradientTo,
    borderWidth = 'none',
    borderColor,
    borderStyle = 'solid',
    borderRadius = 'none',
    margin = 'none',
    paddingTop,
    paddingBottom,
    customClassName,
    customId,
    hideOnMobile,
    hideOnTablet,
    horizontalAlign,
  } = props

  const layoutToGrid: Record<string, string> = {
    '1': 'grid-cols-1',
    '1/2-1/2': 'grid-cols-1 md:grid-cols-2',
    '1/3-2/3': 'grid-cols-1 md:grid-cols-3 [&>*:first-child]:md:col-span-1 [&>*:last-child]:md:col-span-2',
    '2/3-1/3': 'grid-cols-1 md:grid-cols-3 [&>*:first-child]:md:col-span-2 [&>*:last-child]:md:col-span-1',
    '1/3-1/3-1/3': 'grid-cols-1 md:grid-cols-3',
    '1/4-1/4-1/4-1/4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    '1/4-1/2-1/4': 'grid-cols-1 md:grid-cols-4 [&>*:nth-child(1)]:md:col-span-1 [&>*:nth-child(2)]:md:col-span-2 [&>*:nth-child(3)]:md:col-span-1',
    '1/4-3/4': 'grid-cols-1 md:grid-cols-4 [&>*:first-child]:md:col-span-1 [&>*:last-child]:md:col-span-3',
    '3/4-1/4': 'grid-cols-1 md:grid-cols-4 [&>*:first-child]:md:col-span-3 [&>*:last-child]:md:col-span-1',
  }

  const gapClasses: Record<string, string> = {
    none: 'gap-0',
    small: 'gap-2 md:gap-4',
    medium: 'gap-4 md:gap-6',
    large: 'gap-6 md:gap-10',
  }

  const paddingClasses: Record<string, string> = {
    none: 'py-0',
    small: 'py-4 md:py-6',
    medium: 'py-8 md:py-12',
    large: 'py-12 md:py-20',
  }

  const paddingTopClasses: Record<string, string> = {
    none: 'pt-0',
    small: 'pt-4 md:pt-6',
    medium: 'pt-8 md:pt-12',
    large: 'pt-12 md:pt-20',
  }

  const paddingBottomClasses: Record<string, string> = {
    none: 'pb-0',
    small: 'pb-4 md:pb-6',
    medium: 'pb-8 md:pb-12',
    large: 'pb-12 md:pb-20',
  }

  const maxWidthClasses: Record<string, string> = {
    full: 'max-w-full',
    container: 'max-w-7xl',
    narrow: 'max-w-4xl',
  }

  const alignClasses: Record<string, string> = {
    top: 'items-start',
    center: 'items-center',
    bottom: 'items-end',
    stretch: 'items-stretch',
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

  const radiusClasses: Record<string, string> = {
    none: '',
    small: 'rounded-md',
    medium: 'rounded-lg',
    large: 'rounded-2xl',
  }

  const overlayClasses: Record<string, string> = {
    none: '',
    light: 'bg-black/20',
    medium: 'bg-black/50',
    dark: 'bg-black/70',
  }

  const horizontalAlignClasses: Record<string, string> = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }

  const getColumnCount = (layoutStr: string): number => {
    const parts = layoutStr.split('-')
    return parts.length
  }
  const expectedColumns = getColumnCount(layout)

  const pyClass = paddingTop || paddingBottom
    ? `${paddingTopClasses[paddingTop || padding] || ''} ${paddingBottomClasses[paddingBottom || padding] || ''}`
    : paddingClasses[padding] || paddingClasses.medium

  const sectionStyle: React.CSSProperties = {}
  if (backgroundColor) sectionStyle.backgroundColor = backgroundColor
  if (backgroundImage) {
    sectionStyle.backgroundImage = `url(${backgroundImage})`
    sectionStyle.backgroundSize = 'cover'
    sectionStyle.backgroundPosition = 'center'
  }
  if (gradientFrom && gradientTo && !backgroundImage) {
    sectionStyle.background = `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`
  }
  if (borderColor && borderWidth !== 'none') {
    sectionStyle.borderColor = borderColor
  }

  const visibilityClasses = [
    hideOnMobile ? 'hidden md:block' : '',
    hideOnTablet ? 'md:hidden lg:block' : '',
  ].filter(Boolean).join(' ')

  return (
    <section
      id={customId || undefined}
      className={`${pyClass} px-4 relative ${marginClasses[margin]} ${borderWidthClasses[borderWidth]} ${borderWidth !== 'none' ? borderStyleClasses[borderStyle] : ''} ${radiusClasses[borderRadius]} ${visibilityClasses} ${customClassName || ''}`}
      style={sectionStyle}
    >
      {backgroundImage && overlayOpacity !== 'none' && (
        <div className={`absolute inset-0 ${overlayClasses[overlayOpacity]} ${radiusClasses[borderRadius]}`} />
      )}

      <div className={`${maxWidthClasses[maxWidth] || maxWidthClasses.container} mx-auto relative`}>
        {title && (
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 md:mb-8 text-center">
            {title}
          </h2>
        )}
        <div className={`grid ${layoutToGrid[layout] || 'grid-cols-1'} ${gapClasses[gap] || gapClasses.medium} ${alignClasses[verticalAlign] || alignClasses.top} ${horizontalAlign ? horizontalAlignClasses[horizontalAlign] : ''}`}>
          {children ? (
            children
          ) : columns.length > 0 ? (
            columns.map((column, index) => (
              <div key={index} className="bg-[#141414] rounded-lg p-4 md:p-6">
                {column.imageUrl && (
                  <img
                    src={column.imageUrl}
                    alt={column.title || ''}
                    className="w-full h-40 object-cover rounded-lg mb-4"
                  />
                )}
                {column.title && (
                  <h3 className="text-lg md:text-xl font-semibold text-white mb-2">
                    {column.title}
                  </h3>
                )}
                {column.text && (
                  <p className="text-slate-400 text-sm md:text-base mb-4">
                    {column.text}
                  </p>
                )}
                {column.buttonText && column.buttonLink && (
                  <a
                    href={column.buttonLink}
                    className="inline-block px-4 py-2 bg-primary text-black rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    {column.buttonText}
                  </a>
                )}
              </div>
            ))
          ) : (
            Array.from({ length: expectedColumns }).map((_, index) => (
              <div key={index} className="bg-[#1a1a1a] border-2 border-dashed border-[#2a2a2a] rounded-lg p-8 text-center min-h-[120px] flex items-center justify-center">
                <div>
                  <p className="text-slate-500">Column {index + 1}</p>
                  <p className="text-slate-600 text-xs mt-1">Add sections here or configure in properties</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}