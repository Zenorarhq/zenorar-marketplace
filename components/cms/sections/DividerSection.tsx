'use client'

interface DividerSectionProps {
  props: {
    style?: 'solid' | 'dashed' | 'dotted'
    color?: string
    width?: 'full' | '3/4' | '1/2' | '1/4'
  }
}

export default function DividerSection({ props }: DividerSectionProps) {
  const {
    style = 'solid',
    color,
    width = 'full',
  } = props

  const widthClasses = {
    full: 'w-full',
    '3/4': 'w-3/4',
    '1/2': 'w-1/2',
    '1/4': 'w-1/4',
  }

  const styleClasses = {
    solid: 'border-solid',
    dashed: 'border-dashed',
    dotted: 'border-dotted',
  }

  return (
    <div className="py-4 flex justify-center">
      <hr
        className={`${widthClasses[width]} ${styleClasses[style]} border-t`}
        style={{ borderColor: color || '#2a2a2a' }}
      />
    </div>
  )
}
