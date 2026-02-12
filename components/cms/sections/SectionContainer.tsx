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
  } = props

  // Layout to grid columns mapping
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

  // Determine expected column count from layout
  const getColumnCount = (layoutStr: string): number => {
    const parts = layoutStr.split('-')
    return parts.length
  }
  const expectedColumns = getColumnCount(layout)

  return (
    <section
      className={`${paddingClasses[padding] || paddingClasses.medium} px-4`}
      style={{ backgroundColor: backgroundColor || undefined }}
    >
      <div className={`${maxWidthClasses[maxWidth] || maxWidthClasses.container} mx-auto`}>
        {title && (
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 md:mb-8 text-center">
            {title}
          </h2>
        )}
        <div className={`grid ${layoutToGrid[layout] || 'grid-cols-1'} ${gapClasses[gap] || gapClasses.medium} ${alignClasses[verticalAlign] || alignClasses.top}`}>
          {/* Priority 1: Render nested children (from children prop) */}
          {children ? (
            children
          ) : columns.length > 0 ? (
            // Priority 2: Render columns from props (backward compatibility)
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
            // Priority 3: Show placeholder columns based on layout
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
