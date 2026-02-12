'use client'

import Link from 'next/link'

interface ButtonCtaSectionProps {
  props: {
    text?: string
    link?: string
    variant?: 'primary' | 'secondary' | 'outline'
    size?: 'small' | 'medium' | 'large'
    alignment?: 'left' | 'center' | 'right'
  }
}

export default function ButtonCtaSection({ props }: ButtonCtaSectionProps) {
  const { text = 'Click Here', link = '/', variant = 'primary', size = 'medium', alignment = 'center' } = props

  const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' }[alignment] || 'text-center'

  const sizeClass = {
    small: 'px-4 py-2 text-sm',
    medium: 'px-6 py-3 text-base',
    large: 'px-8 py-4 text-lg',
  }[size] || 'px-6 py-3 text-base'

  const variantClass = {
    primary: 'bg-primary text-black hover:bg-primary/90',
    secondary: 'bg-[#3B82F6] text-white hover:bg-[#3B82F6]/90',
    outline: 'bg-transparent text-white border-2 border-white/20 hover:border-white/40',
  }[variant] || 'bg-primary text-black hover:bg-primary/90'

  return (
    <div className={`py-6 px-4 ${alignClass}`}>
      <Link
        href={link}
        className={`inline-block ${sizeClass} ${variantClass} rounded-lg font-semibold transition-colors`}
      >
        {text}
      </Link>
    </div>
  )
}
