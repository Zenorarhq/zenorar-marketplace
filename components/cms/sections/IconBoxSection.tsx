'use client'

interface IconBoxSectionProps {
  props: {
    icon?: string
    title?: string
    description?: string
    iconSize?: 'small' | 'medium' | 'large' | 'xl'
    iconColor?: string
    iconPosition?: 'top' | 'left' | 'right'
    alignment?: 'left' | 'center' | 'right'
    titleTag?: 'h3' | 'h4' | 'h5' | 'h6'
    linkUrl?: string
    linkTarget?: '_self' | '_blank'
    backgroundColor?: string
    textColor?: string
    padding?: 'none' | 'small' | 'medium' | 'large'
    borderRadius?: 'none' | 'small' | 'medium' | 'large'
    borderWidth?: 'none' | '1' | '2'
    borderColor?: string
    shadow?: 'none' | 'small' | 'medium' | 'large'
    customClassName?: string
    hideOnMobile?: boolean
  }
}

export default function IconBoxSection({ props }: IconBoxSectionProps) {
  const {
    icon = '\uD83D\uDE80',
    title = 'Feature Title',
    description = 'A short description of this feature or service.',
    iconSize = 'large',
    iconColor,
    iconPosition = 'top',
    alignment = 'center',
    titleTag = 'h3',
    linkUrl,
    linkTarget = '_self',
    backgroundColor,
    textColor,
    padding = 'medium',
    borderRadius = 'medium',
    borderWidth = 'none',
    borderColor,
    shadow = 'none',
    customClassName,
    hideOnMobile,
  } = props

  const iconSizeClasses: Record<string, string> = {
    small: 'text-2xl',
    medium: 'text-3xl',
    large: 'text-4xl',
    xl: 'text-5xl',
  }

  const alignmentClasses: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }

  const paddingClasses: Record<string, string> = {
    none: 'p-0',
    small: 'p-4',
    medium: 'p-6',
    large: 'p-8',
  }

  const borderRadiusClasses: Record<string, string> = {
    none: 'rounded-none',
    small: 'rounded-md',
    medium: 'rounded-lg',
    large: 'rounded-2xl',
  }

  const borderWidthClasses: Record<string, string> = {
    none: '',
    '1': 'border',
    '2': 'border-2',
  }

  const shadowClasses: Record<string, string> = {
    none: '',
    small: 'shadow-sm',
    medium: 'shadow-md',
    large: 'shadow-lg',
  }

  const layoutClasses: Record<string, string> = {
    top: 'flex-col',
    left: 'flex-row',
    right: 'flex-row-reverse',
  }

  const TitleTag = titleTag as keyof React.JSX.IntrinsicElements

  const boxStyle: React.CSSProperties = {
    backgroundColor: backgroundColor || undefined,
    color: textColor || undefined,
    borderColor: borderWidth !== 'none' ? (borderColor || '#2a2a2a') : undefined,
  }

  const content = (
    <div
      className={`flex ${layoutClasses[iconPosition]} ${iconPosition === 'top' ? 'items-center' : 'items-start'} gap-4 ${paddingClasses[padding]} ${borderRadiusClasses[borderRadius]} ${borderWidthClasses[borderWidth]} ${shadowClasses[shadow]} ${alignmentClasses[alignment]} ${hideOnMobile ? 'hidden md:block' : ''} ${customClassName || ''}`}
      style={boxStyle}
    >
      <span className={`${iconSizeClasses[iconSize]} flex-shrink-0`} style={{ color: iconColor || undefined }}>
        {icon}
      </span>
      <div>
        {title && (
          <TitleTag className="text-white font-semibold text-lg mb-2">
            {title}
          </TitleTag>
        )}
        {description && (
          <p className="text-slate-400 text-sm leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  )

  if (linkUrl) {
    return (
      <a href={linkUrl} target={linkTarget} rel={linkTarget === '_blank' ? 'noopener noreferrer' : undefined} className="block hover:opacity-90 transition-opacity">
        {content}
      </a>
    )
  }

  return content
}
