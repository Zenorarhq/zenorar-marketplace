'use client'

import { useState } from 'react'

interface FaqItem {
  question?: string
  answer?: string
}

interface FaqAccordionSectionProps {
  props: {
    title?: string
    subtitle?: string
    items?: FaqItem[]
    backgroundColor?: string
    textColor?: string
    accentColor?: string
    padding?: 'none' | 'small' | 'medium' | 'large'
    maxWidth?: 'full' | 'container' | 'narrow'
    openFirst?: boolean
    hideOnMobile?: boolean
  }
}

export default function FaqAccordionSection({ props }: FaqAccordionSectionProps) {
  const {
    title,
    subtitle,
    items = [],
    backgroundColor,
    textColor,
    accentColor,
    padding = 'medium',
    maxWidth = 'narrow',
    openFirst,
    hideOnMobile,
  } = props

  const [openIndex, setOpenIndex] = useState<number | null>(openFirst ? 0 : null)

  const paddingClasses: Record<string, string> = {
    none: 'py-4',
    small: 'py-6',
    medium: 'py-10',
    large: 'py-14 lg:py-20',
  }

  const maxWidthClasses: Record<string, string> = {
    full: 'max-w-full',
    container: 'max-w-5xl',
    narrow: 'max-w-3xl',
  }

  if (items.length === 0) {
    return (
      <div className="py-8 px-4">
        <div className="max-w-3xl mx-auto bg-[#141414] border border-[#1f1f1f] rounded-xl p-8 text-center">
          <p className="text-slate-500">Add FAQ items to display an accordion.</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`${paddingClasses[padding]} px-4 ${hideOnMobile ? 'hidden md:block' : ''}`}
      style={{ backgroundColor: backgroundColor || undefined }}
    >
      <div className={`${maxWidthClasses[maxWidth]} mx-auto`}>
        {(title || subtitle) && (
          <div className="text-center mb-8">
            {title && (
              <h2
                className="text-2xl font-bold text-white mb-2"
                style={{ color: textColor || undefined }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-slate-400 text-sm">{subtitle}</p>
            )}
          </div>
        )}
        <div className="space-y-3">
          {items.map((item, i) => (
            <div
              key={i}
              className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden"
              style={accentColor && openIndex === i ? { borderColor: accentColor } : undefined}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex items-center justify-between w-full p-5 text-left"
                aria-expanded={openIndex === i}
              >
                <span
                  className="text-white font-medium text-sm pr-4"
                  style={{ color: textColor || undefined }}
                >
                  {item.question || `Question ${i + 1}`}
                </span>
                <span className={`text-slate-400 flex-shrink-0 transition-transform ${openIndex === i ? 'rotate-180' : ''}`} style={{ color: accentColor || undefined }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
              </button>
              {openIndex === i && item.answer && (
                <div className="px-5 pb-5 -mt-1">
                  <p className="text-slate-400 text-sm leading-relaxed">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}