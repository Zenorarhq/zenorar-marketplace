'use client'

import Link from 'next/link'
import Icon from '@/components/ui/Icon'

interface ButtonCtaSectionProps {
  props: {
    text?: string
    link?: string
    variant?: 'primary' | 'secondary' | 'outline'
    size?: 'small' | 'medium' | 'large'
    alignment?: 'left' | 'center' | 'right'
    backgroundColor?: string
    textColor?: string
    borderRadius?: 'none' | 'small' | 'medium' | 'large'
    borderWidth?: 'none' | '1' | '2' | '4'
    borderColor?: string
    padding?: 'none' | 'small' | 'medium' | 'large'
    fullWidth?: boolean
    icon?: string
    target?: '_self' | '_blank'
    hideOnMobile?: boolean
  }
}

export default function ButtonCtaSection({ props }: ButtonCtaSectionProps) {
  const {
    text = 'Click Here',
    link = '/',
    variant = 'primary',
    size = 'medium',
    alignment = 'center',
    backgroundColor,
    textColor,
    borderRadius = 'medium',
    borderWidth = 'none',
    borderColor,
    padding = 'small',
    fullWidth,
    icon,
    target = '_self',
    hideOnMobile,
  } = props

  const alignClass: Record<string, string> = { left: 'text-left', center: 'text-center', right: 'text-right' }

  const sizeClass: Record<string, string> = {
    small: 'px-4 py-2 text-sm',
    medium: 'px-6 py-3 text-base',
    large: 'px-8 py-4 text-lg',
  }

  const variantClass: Record<string, string> = {
    primary: 'bg-primary text-black hover:bg-primary/90',
    secondary: 'bg-[#3B82F6] text-white hover:bg-[#3B82F6]/90',
    outline: 'bg-transparent text-white border-2 border-white/20 hover:border-white/40',
  }

  const radiusClasses: Record<string, string> = {
    none: 'rounded-none',
    small: 'rounded-md',
    medium: 'rounded-lg',
    large: 'rounded-full',
  }

  const paddingClasses: Record<string, string> = {
    none: 'py-2',
    small: 'py-6',
    medium: 'py-8',
    large: 'py-12',
  }

  const borderWidthClasses: Record<string, string> = {
    none: '',
    '1': 'border',
    '2': 'border-2',
    '4': 'border-4',
  }

  const btnStyle: React.CSSProperties = {}
  if (backgroundColor) btnStyle.backgroundColor = backgroundColor
  if (textColor) btnStyle.color = textColor
  if (borderColor && borderWidth !== 'none') btnStyle.borderColor = borderColor

  return (
    <div className={`${paddingClasses[padding]} px-4 ${alignClass[alignment]} ${hideOnMobile ? 'hidden md:block' : ''}`}>
      <Link
        href={link}
        target={target}
        rel={target === '_blank' ? 'noopener noreferrer' : undefined}
        className={`${fullWidth ? 'block w-full text-center' : 'inline-flex items-center gap-2'} ${sizeClass[size]} ${variantClass[variant]} ${radiusClasses[borderRadius]} ${borderWidthClasses[borderWidth]} font-semibold transition-all hover:scale-105`}
        style={btnStyle}
      >
        {icon && <Icon name={icon} size={size === 'small' ? 16 : size === 'large' ? 24 : 20} />}
        {text}
      </Link>
    </div>
  )
}
