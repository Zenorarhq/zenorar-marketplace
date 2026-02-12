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

  const hasPropsContent = title || text || imageUrl || buttonText
  const hasChildren = React.Children.count(children) > 0

  return (
    <div
      className={`${paddingClasses[padding]} ${radiusClasses[borderRadius]} ${alignClasses[alignment]} bg-[#141414]`}
      style={{ backgroundColor: backgroundColor || undefined }}
    >
      {/* Priority 1: Render nested children */}
      {hasChildren ? (
        <div className="space-y-4">
          {children}
        </div>
      ) : hasPropsContent ? (
        // Priority 2: Render props content (backward compatibility)
        <>
          {imageUrl && (
            <img
              src={imageUrl}
              alt={imageAlt || title || ''}
              className="w-full h-48 object-cover rounded-lg mb-4"
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
        // Priority 3: Show placeholder
        <div className="border-2 border-dashed border-[#2a2a2a] rounded-lg p-8 text-center min-h-[100px] flex items-center justify-center">
          <div>
            <p className="text-slate-500">Content Block</p>
            <p className="text-slate-600 text-xs mt-1">Drop sections here or configure in properties</p>
          </div>
        </div>
      )}
    </div>
  )
}
