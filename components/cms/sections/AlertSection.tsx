'use client'

import { useState } from 'react'

interface AlertSectionProps {
  props: {
    message?: string
    title?: string
    type?: 'info' | 'success' | 'warning' | 'error'
    icon?: string
    showIcon?: boolean
    dismissible?: boolean
    backgroundColor?: string
    textColor?: string
    borderColor?: string
    borderWidth?: 'none' | '1' | '2' | '4'
    borderRadius?: 'none' | 'small' | 'medium' | 'large'
    padding?: 'none' | 'small' | 'medium' | 'large'
    alignment?: 'left' | 'center' | 'right'
    customClassName?: string
    hideOnMobile?: boolean
  }
}

const typePresets: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  info: { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', text: '#93c5fd', icon: '\u2139\uFE0F' },
  success: { bg: 'rgba(34, 197, 94, 0.1)', border: '#22c55e', text: '#86efac', icon: '\u2705' },
  warning: { bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b', text: '#fcd34d', icon: '\u26A0\uFE0F' },
  error: { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', text: '#fca5a5', icon: '\u274C' },
}

export default function AlertSection({ props }: AlertSectionProps) {
  const {
    message = 'This is an important notice.',
    title = '',
    type = 'info',
    icon = '',
    showIcon = true,
    dismissible = false,
    backgroundColor,
    textColor,
    borderColor,
    borderWidth = '1',
    borderRadius = 'medium',
    padding = 'medium',
    alignment = 'left',
    customClassName,
    hideOnMobile,
  } = props

  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const preset = typePresets[type] || typePresets.info

  const borderRadiusClasses: Record<string, string> = {
    none: 'rounded-none',
    small: 'rounded-md',
    medium: 'rounded-lg',
    large: 'rounded-xl',
  }

  const paddingClasses: Record<string, string> = {
    none: 'p-0',
    small: 'p-3',
    medium: 'p-4',
    large: 'p-6',
  }

  const borderWidthClasses: Record<string, string> = {
    none: '',
    '1': 'border',
    '2': 'border-2',
    '4': 'border-4',
  }

  const alignmentClasses: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }

  const resolvedIcon = showIcon ? (icon || preset.icon) : null

  return (
    <div
      className={`flex items-start gap-3 ${paddingClasses[padding]} ${borderRadiusClasses[borderRadius]} ${borderWidthClasses[borderWidth]} ${alignmentClasses[alignment]} ${hideOnMobile ? 'hidden md:block' : ''} ${customClassName || ''}`}
      style={{
        backgroundColor: backgroundColor || preset.bg,
        color: textColor || preset.text,
        borderColor: borderWidth !== 'none' ? (borderColor || preset.border) : undefined,
      }}
      role="alert"
    >
      {resolvedIcon && (
        <span className="text-lg flex-shrink-0 mt-0.5">{resolvedIcon}</span>
      )}
      <div className="flex-1 min-w-0">
        {title && (
          <p className="font-semibold mb-1">{title}</p>
        )}
        <p className="text-sm leading-relaxed">{message}</p>
      </div>
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity text-lg leading-none"
          aria-label="Dismiss"
        >
          {'\u00D7'}
        </button>
      )}
    </div>
  )
}