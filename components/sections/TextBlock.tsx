'use client'

import DOMPurify from 'dompurify'

export default function TextBlock({ config }: { config?: { title?: string; content?: string; alignment?: string; style?: Record<string, any> } }) {
  const alignClass = ({ left: 'text-left', center: 'text-center', right: 'text-right' } as Record<string, string>)[config?.alignment || 'left'] || 'text-left'

  return (
    <section className="mb-12">
      <div className={`max-w-4xl mx-auto ${alignClass}`}>
        {config?.title && (
          <h2 className={`${({ small: 'text-xl', large: 'text-3xl', xl: 'text-4xl' } as Record<string, string>)[config?.style?.headingSize] || 'text-2xl'} ${({ normal: 'font-normal', semibold: 'font-semibold', extrabold: 'font-extrabold' } as Record<string, string>)[config?.style?.headingWeight] || 'font-bold'} text-white mb-4`}>
            {config.title}
          </h2>
        )}
        {config?.content ? (
          <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(config.content) }} />
        ) : (
          <p className="text-slate-500 italic">No content yet. Edit this section to add text.</p>
        )}
      </div>
    </section>
  )
}
