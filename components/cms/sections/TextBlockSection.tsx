'use client'

import DOMPurify from 'dompurify'

interface TextBlockSectionProps {
  props: {
    content?: string
    alignment?: 'left' | 'center' | 'right'
    backgroundColor?: string
    textColor?: string
    padding?: 'none' | 'small' | 'medium' | 'large'
    margin?: 'none' | 'small' | 'medium' | 'large'
    borderRadius?: 'none' | 'small' | 'medium' | 'large'
    fontSize?: 'small' | 'medium' | 'large' | 'xl'
    maxWidth?: 'full' | 'container' | 'narrow'
    customClassName?: string
    hideOnMobile?: boolean
  }
}

export default function TextBlockSection({ props }: TextBlockSectionProps) {
  const {
    content = '',
    alignment = 'left',
    backgroundColor,
    textColor,
    padding = 'medium',
    margin = 'none',
    borderRadius = 'none',
    fontSize = 'medium',
    maxWidth = 'narrow',
    customClassName,
    hideOnMobile,
  } = props

  const alignmentClasses: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }

  const paddingClasses: Record<string, string> = {
    none: 'py-0',
    small: 'py-3 sm:py-4',
    medium: 'py-6 sm:py-8 lg:py-12',
    large: 'py-10 sm:py-14 lg:py-20',
  }

  const marginClasses: Record<string, string> = {
    none: '',
    small: 'my-2 md:my-4',
    medium: 'my-4 md:my-6',
    large: 'my-6 md:my-10',
  }

  const radiusClasses: Record<string, string> = {
    none: '',
    small: 'rounded-md',
    medium: 'rounded-lg',
    large: 'rounded-2xl',
  }

  const fontSizeClasses: Record<string, string> = {
    small: 'prose-sm',
    medium: 'prose-sm sm:prose-base',
    large: 'prose-sm sm:prose-base lg:prose-lg',
    xl: 'prose-base sm:prose-lg lg:prose-xl',
  }

  const maxWidthClasses: Record<string, string> = {
    full: 'max-w-full',
    container: 'max-w-6xl',
    narrow: 'max-w-4xl',
  }

  const style: React.CSSProperties = {}
  if (backgroundColor) style.backgroundColor = backgroundColor
  if (textColor) style.color = textColor

  return (
    <section
      className={`${paddingClasses[padding]} px-4 ${marginClasses[margin]} ${radiusClasses[borderRadius]} ${hideOnMobile ? 'hidden md:block' : ''} ${customClassName || ''}`}
      style={style}
    >
      <div className={`${maxWidthClasses[maxWidth]} mx-auto prose prose-invert ${fontSizeClasses[fontSize]} ${alignmentClasses[alignment]}`}>
        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
      </div>
    </section>
  )
}