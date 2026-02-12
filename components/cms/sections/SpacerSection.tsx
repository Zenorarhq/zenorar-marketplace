'use client'

interface SpacerSectionProps {
  props: {
    height?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  }
}

export default function SpacerSection({ props }: SpacerSectionProps) {
  const { height = 'md' } = props

  const heightClasses = {
    xs: 'h-4',
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-20',
    xl: 'h-32',
    '2xl': 'h-48',
  }

  return <div className={heightClasses[height]} aria-hidden="true" />
}
