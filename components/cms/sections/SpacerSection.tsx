'use client'

interface SpacerSectionProps {
  props: {
    height?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
    hideOnMobile?: boolean
    hideOnTablet?: boolean
  }
}

export default function SpacerSection({ props }: SpacerSectionProps) {
  const { height = 'md', hideOnMobile, hideOnTablet } = props

  const heightClasses: Record<string, string> = {
    xs: 'h-4',
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-20',
    xl: 'h-32',
    '2xl': 'h-48',
  }

  const visibilityClasses = [
    hideOnMobile ? 'hidden md:block' : '',
    hideOnTablet ? 'md:hidden lg:block' : '',
  ].filter(Boolean).join(' ')

  return <div className={`${heightClasses[height]} ${visibilityClasses}`} aria-hidden="true" />
}
