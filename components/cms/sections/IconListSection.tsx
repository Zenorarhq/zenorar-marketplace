'use client'

interface IconListItem {
  icon?: string
  text?: string
  linkUrl?: string
}

interface IconListSectionProps {
  props: {
    items?: IconListItem[]
    layout?: 'vertical' | 'horizontal'
    iconColor?: string
    iconSize?: 'small' | 'medium' | 'large'
    textColor?: string
    fontSize?: 'small' | 'base' | 'large'
    spacing?: 'tight' | 'normal' | 'relaxed'
    divider?: boolean
    dividerColor?: string
    alignment?: 'left' | 'center' | 'right'
    backgroundColor?: string
    padding?: 'none' | 'small' | 'medium' | 'large'
    maxWidth?: 'full' | 'container' | 'narrow'
    customClassName?: string
    hideOnMobile?: boolean
  }
}

export default function IconListSection({ props }: IconListSectionProps) {
  const {
    items = [{ icon: '\u2705', text: 'First item' }, { icon: '\u2705', text: 'Second item' }, { icon: '\u2705', text: 'Third item' }],
    layout = 'vertical',
    iconColor,
    iconSize = 'medium',
    textColor,
    fontSize = 'base',
    spacing = 'normal',
    divider = false,
    dividerColor,
    alignment = 'left',
    backgroundColor,
    padding = 'none',
    maxWidth = 'full',
    customClassName,
    hideOnMobile,
  } = props

  const iconSizeClasses: Record<string, string> = {
    small: 'text-base',
    medium: 'text-lg',
    large: 'text-2xl',
  }

  const fontSizeClasses: Record<string, string> = {
    small: 'text-sm',
    base: 'text-base',
    large: 'text-lg',
  }

  const spacingClasses: Record<string, string> = {
    tight: 'gap-1',
    normal: 'gap-3',
    relaxed: 'gap-5',
  }

  const alignmentClasses: Record<string, string> = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }

  const paddingClasses: Record<string, string> = {
    none: '',
    small: 'py-4 px-4',
    medium: 'py-8 px-4',
    large: 'py-12 px-4',
  }

  const maxWidthClasses: Record<string, string> = {
    full: 'max-w-full',
    container: 'max-w-6xl',
    narrow: 'max-w-4xl',
  }

  const dividerClass = divider
    ? layout === 'vertical'
      ? 'border-b border-[#2a2a2a]'
      : 'border-r border-[#2a2a2a]'
    : ''

  const dividerStyle = divider && dividerColor ? { borderColor: dividerColor } : undefined

  return (
    <div
      className={`${paddingClasses[padding]} ${hideOnMobile ? 'hidden md:block' : ''} ${customClassName || ''}`}
      style={{ backgroundColor: backgroundColor || undefined }}
    >
      <div className={`${maxWidthClasses[maxWidth]} mx-auto`}>
        <div className={`flex ${layout === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'} ${spacingClasses[spacing]} ${alignmentClasses[alignment]}`}>
          {items.map((item, index) => {
            const isLast = index === items.length - 1
            const textContent = (
              <span className={`${fontSizeClasses[fontSize]}`} style={{ color: textColor || '#cbd5e1' }}>
                {item.text}
              </span>
            )

            return (
              <div
                key={index}
                className={`flex items-center gap-2 ${!isLast ? dividerClass : ''} ${layout === 'vertical' && divider && !isLast ? 'pb-3' : ''} ${layout === 'horizontal' && divider && !isLast ? 'pr-3' : ''}`}
                style={!isLast ? dividerStyle : undefined}
              >
                <span className={`${iconSizeClasses[iconSize]} flex-shrink-0`} style={{ color: iconColor || undefined }}>
                  {item.icon || '\u2705'}
                </span>
                {item.linkUrl ? (
                  <a href={item.linkUrl} className="hover:text-primary transition-colors">
                    {textContent}
                  </a>
                ) : textContent}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}