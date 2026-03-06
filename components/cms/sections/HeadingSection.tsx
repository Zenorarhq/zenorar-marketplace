'use client'

interface HeadingSectionProps {
  props: {
    text?: string
    tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    alignment?: 'left' | 'center' | 'right'
    color?: string
    fontSize?: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl'
    fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold'
    lineHeight?: 'tight' | 'normal' | 'relaxed'
    letterSpacing?: 'tighter' | 'normal' | 'wide' | 'wider'
    textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
    maxWidth?: 'full' | 'container' | 'narrow'
    backgroundColor?: string
    padding?: 'none' | 'small' | 'medium' | 'large'
    margin?: 'none' | 'small' | 'medium' | 'large'
    customClassName?: string
    hideOnMobile?: boolean
  }
}

export default function HeadingSection({ props }: HeadingSectionProps) {
  const {
    text = 'Your Heading Here',
    tag = 'h2',
    alignment = 'left',
    color,
    fontSize = '3xl',
    fontWeight = 'bold',
    lineHeight = 'tight',
    letterSpacing = 'normal',
    textTransform = 'none',
    maxWidth = 'full',
    backgroundColor,
    padding = 'none',
    margin = 'none',
    customClassName,
    hideOnMobile,
  } = props

  const fontSizeClasses: Record<string, string> = {
    sm: 'text-sm', base: 'text-base', lg: 'text-lg', xl: 'text-xl',
    '2xl': 'text-2xl', '3xl': 'text-3xl', '4xl': 'text-4xl', '5xl': 'text-5xl', '6xl': 'text-6xl',
  }
  const fontWeightClasses: Record<string, string> = {
    normal: 'font-normal', medium: 'font-medium', semibold: 'font-semibold', bold: 'font-bold', extrabold: 'font-extrabold',
  }
  const alignmentClasses: Record<string, string> = { left: 'text-left', center: 'text-center', right: 'text-right' }
  const lineHeightClasses: Record<string, string> = { tight: 'leading-tight', normal: 'leading-normal', relaxed: 'leading-relaxed' }
  const letterSpacingClasses: Record<string, string> = { tighter: 'tracking-tighter', normal: 'tracking-normal', wide: 'tracking-wide', wider: 'tracking-wider' }
  const textTransformClasses: Record<string, string> = { none: '', uppercase: 'uppercase', lowercase: 'lowercase', capitalize: 'capitalize' }
  const maxWidthClasses: Record<string, string> = { full: 'max-w-full', container: 'max-w-6xl', narrow: 'max-w-4xl' }
  const paddingClasses: Record<string, string> = { none: '', small: 'py-4 px-4', medium: 'py-8 px-4', large: 'py-12 px-4' }
  const marginClasses: Record<string, string> = { none: '', small: 'my-2', medium: 'my-4', large: 'my-8' }

  const Tag = tag as keyof React.JSX.IntrinsicElements

  return (
    <div
      className={`${paddingClasses[padding]} ${marginClasses[margin]} ${maxWidthClasses[maxWidth]} mx-auto ${hideOnMobile ? 'hidden md:block' : ''} ${customClassName || ''}`}
      style={{ backgroundColor: backgroundColor || undefined }}
    >
      <Tag
        className={`${fontSizeClasses[fontSize]} ${fontWeightClasses[fontWeight]} ${alignmentClasses[alignment]} ${lineHeightClasses[lineHeight]} ${letterSpacingClasses[letterSpacing]} ${textTransformClasses[textTransform]} text-white`}
        style={{ color: color || undefined }}
      >
        {text}
      </Tag>
    </div>
  )
}
