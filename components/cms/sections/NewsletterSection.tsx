'use client'

import { useState } from 'react'

interface NewsletterSectionProps {
  props: {
    title?: string
    subtitle?: string
    buttonText?: string
    placeholder?: string
    backgroundColor?: string
    textColor?: string
    buttonColor?: string
    buttonTextColor?: string
    padding?: 'none' | 'small' | 'medium' | 'large'
    alignment?: 'left' | 'center' | 'right'
    borderRadius?: 'none' | 'small' | 'medium' | 'large'
    maxWidth?: 'full' | 'container' | 'narrow'
    successMessage?: string
    hideOnMobile?: boolean
  }
}

export default function NewsletterSection({ props }: NewsletterSectionProps) {
  const {
    title = 'Subscribe to our newsletter',
    subtitle,
    buttonText = 'Subscribe',
    placeholder = 'Enter your email',
    backgroundColor,
    textColor,
    buttonColor,
    buttonTextColor,
    padding = 'medium',
    alignment = 'center',
    borderRadius = 'none',
    maxWidth = 'narrow',
    successMessage = 'Thanks for subscribing!',
    hideOnMobile,
  } = props

  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) setSubmitted(true)
  }

  const paddingClasses: Record<string, string> = {
    none: 'py-4',
    small: 'py-6',
    medium: 'py-12',
    large: 'py-16 lg:py-20',
  }

  const alignClasses: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }

  const radiusClasses: Record<string, string> = {
    none: '',
    small: 'rounded-md',
    medium: 'rounded-lg',
    large: 'rounded-2xl',
  }

  const maxWidthClasses: Record<string, string> = {
    full: 'max-w-full',
    container: 'max-w-3xl',
    narrow: 'max-w-xl',
  }

  return (
    <div
      className={`${paddingClasses[padding]} px-4 ${radiusClasses[borderRadius]} ${hideOnMobile ? 'hidden md:block' : ''}`}
      style={{ backgroundColor: backgroundColor || undefined }}
    >
      <div className={`${maxWidthClasses[maxWidth]} mx-auto ${alignClasses[alignment]}`}>
        {title && (
          <h2 className="text-2xl font-bold text-white mb-2" style={{ color: textColor || undefined }}>
            {title}
          </h2>
        )}
        {subtitle && <p className="text-slate-400 text-sm mb-6">{subtitle}</p>}
        {submitted ? (
          <p className="text-green-400 font-medium">{successMessage}</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={placeholder}
              required
              className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-primary text-black rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors flex-shrink-0"
              style={{
                backgroundColor: buttonColor || undefined,
                color: buttonTextColor || undefined,
              }}
            >
              {buttonText}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}