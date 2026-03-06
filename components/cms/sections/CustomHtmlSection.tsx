'use client'

import DOMPurify from 'dompurify'

interface CustomHtmlSectionProps {
  props: {
    html?: string
    padding?: 'none' | 'small' | 'medium' | 'large'
    backgroundColor?: string
    maxWidth?: 'full' | 'container' | 'narrow'
    hideOnMobile?: boolean
  }
}

export default function CustomHtmlSection({ props }: CustomHtmlSectionProps) {
  const {
    html,
    padding = 'small',
    backgroundColor,
    maxWidth = 'container',
    hideOnMobile,
  } = props

  const paddingClasses: Record<string, string> = {
    none: 'py-0',
    small: 'py-4',
    medium: 'py-8',
    large: 'py-12',
  }

  const maxWidthClasses: Record<string, string> = {
    full: 'max-w-full',
    container: 'max-w-6xl',
    narrow: 'max-w-4xl',
  }

  if (!html) {
    return (
      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto bg-[#141414] border border-[#1f1f1f] rounded-xl p-8 text-center">
          <p className="text-slate-500">Add HTML code to render custom content.</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`${paddingClasses[padding]} px-4 ${hideOnMobile ? 'hidden md:block' : ''}`}
      style={{ backgroundColor: backgroundColor || undefined }}
    >
      <div className={`${maxWidthClasses[maxWidth]} mx-auto`} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
    </div>
  )
}