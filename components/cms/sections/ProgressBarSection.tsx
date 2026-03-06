'use client'

import { useState, useEffect } from 'react'

interface ProgressItem {
  label?: string
  percentage?: number
  color?: string
}

interface ProgressBarSectionProps {
  props: {
    items?: ProgressItem[]
    barColor?: string
    barBackgroundColor?: string
    textColor?: string
    showPercentage?: boolean
    barHeight?: 'thin' | 'medium' | 'thick'
    barBorderRadius?: 'none' | 'small' | 'full'
    spacing?: 'small' | 'medium' | 'large'
    animated?: boolean
    backgroundColor?: string
    padding?: 'none' | 'small' | 'medium' | 'large'
    maxWidth?: 'full' | 'container' | 'narrow'
    customClassName?: string
    hideOnMobile?: boolean
  }
}

export default function ProgressBarSection({ props }: ProgressBarSectionProps) {
  const {
    items = [{ label: 'Web Design', percentage: 90 }, { label: 'Development', percentage: 85 }, { label: 'Marketing', percentage: 70 }],
    barColor,
    barBackgroundColor,
    textColor,
    showPercentage = true,
    barHeight = 'medium',
    barBorderRadius = 'full',
    spacing = 'medium',
    animated = true,
    backgroundColor,
    padding = 'medium',
    maxWidth = 'container',
    customClassName,
    hideOnMobile,
  } = props

  const [mounted, setMounted] = useState(!animated)

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => setMounted(true), 100)
      return () => clearTimeout(timer)
    }
  }, [animated])

  const barHeightClasses: Record<string, string> = {
    thin: 'h-2',
    medium: 'h-4',
    thick: 'h-6',
  }

  const barRadiusClasses: Record<string, string> = {
    none: 'rounded-none',
    small: 'rounded-sm',
    full: 'rounded-full',
  }

  const spacingClasses: Record<string, string> = {
    small: 'gap-4',
    medium: 'gap-6',
    large: 'gap-8',
  }

  const paddingClasses: Record<string, string> = {
    none: '',
    small: 'py-4 px-4',
    medium: 'py-8 px-4',
    large: 'py-12 px-4',
  }

  const maxWidthClasses: Record<string, string> = {
    full: 'max-w-full',
    container: 'max-w-6xl',
    narrow: 'max-w-4xl',
  }

  return (
    <div
      className={`${paddingClasses[padding]} ${hideOnMobile ? 'hidden md:block' : ''} ${customClassName || ''}`}
      style={{ backgroundColor: backgroundColor || undefined }}
    >
      <div className={`${maxWidthClasses[maxWidth]} mx-auto flex flex-col ${spacingClasses[spacing]}`}>
        {items.map((item, index) => {
          const pct = Math.min(100, Math.max(0, item.percentage || 0))
          const itemColor = item.color || barColor || '#2563eb'

          return (
            <div key={index}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium" style={{ color: textColor || '#e2e8f0' }}>
                  {item.label}
                </span>
                {showPercentage && (
                  <span className="text-sm" style={{ color: textColor || '#94a3b8' }}>
                    {pct}%
                  </span>
                )}
              </div>
              <div
                className={`w-full ${barHeightClasses[barHeight]} ${barRadiusClasses[barBorderRadius]} overflow-hidden`}
                style={{ backgroundColor: barBackgroundColor || '#1f1f1f' }}
              >
                <div
                  className={`${barHeightClasses[barHeight]} ${barRadiusClasses[barBorderRadius]} ${animated ? 'transition-all duration-1000 ease-out' : ''}`}
                  style={{
                    width: mounted ? `${pct}%` : '0%',
                    backgroundColor: itemColor,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}