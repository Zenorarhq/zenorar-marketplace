'use client'

interface TextBlockSectionProps {
  props: {
    content?: string
    alignment?: 'left' | 'center' | 'right'
  }
}

export default function TextBlockSection({ props }: TextBlockSectionProps) {
  const {
    content = '',
    alignment = 'left',
  } = props

  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }

  return (
    <section className="py-6 sm:py-8 lg:py-12 px-4">
      <div className={`max-w-4xl mx-auto prose prose-invert prose-sm sm:prose-base lg:prose-lg ${alignmentClasses[alignment]}`}>
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    </section>
  )
}
