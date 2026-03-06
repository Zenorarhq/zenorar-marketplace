'use client'

interface DividerSectionProps {
  props: {
    style?: 'solid' | 'dashed' | 'dotted'
    color?: string
    width?: 'full' | '3/4' | '1/2' | '1/4'
    padding?: 'none' | 'small' | 'medium' | 'large'
    maxWidth?: string
    hideOnMobile?: boolean
  }
}

export default function DividerSection({ props }: DividerSectionProps) {
  const {
    style = 'solid',
    color,
    width = 'full',
    padding = 'small',
    hideOnMobile,
  } = props

  const widthClasses: Record<string, string> = {
    full: 'w-full',
    '3/4': 'w-3/4',
    '1/2': 'w-1/2',
    '1/4': 'w-1/4',
  }

  const styleClasses: Record<string, string> = {
    solid: 'border-solid',
    dashed: 'border-dashed',
    dotted: 'border-dotted',
  }

  const paddingClasses: Record<string, string> = {
    none: 'py-1',
    small: 'py-4',
    medium: 'py-8',
    large: 'py-12',
  }

  return (
    <div className={`${paddingClasses[padding]} flex justify-center ${hideOnMobile ? 'hidden md:flex' : ''}`}>
      <hr
        className={`${widthClasses[width]} ${styleClasses[style]} border-t`}
        style={{ borderColor: color || '#2a2a2a' }}
      />
    </div>
  )
}
