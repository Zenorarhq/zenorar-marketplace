'use client'

interface Testimonial {
  quote: string
  author: string
  role?: string
  avatar?: string
}

export default function Testimonials({ config }: { config?: { title?: string; testimonials?: Testimonial[]; style?: Record<string, any> } }) {
  const testimonials = config?.testimonials || []

  if (testimonials.length === 0) {
    return (
      <section className="mb-12">
        <p className="text-slate-500 italic text-center py-8">No testimonials yet. Edit this section to add testimonials.</p>
      </section>
    )
  }

  return (
    <section className="mb-12">
      {config?.title && (
        <h2 className={`${({ small: 'text-xl', large: 'text-3xl', xl: 'text-4xl' } as Record<string, string>)[config?.style?.headingSize] || 'text-2xl'} ${({ normal: 'font-normal', semibold: 'font-semibold', extrabold: 'font-extrabold' } as Record<string, string>)[config?.style?.headingWeight] || 'font-bold'} text-white mb-6 text-center`}>
          {config.title}
        </h2>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {testimonials.map((t, i) => (
          <div key={i} className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-6">
            {t.quote && (
              <p className="text-slate-300 text-sm mb-4 italic">&ldquo;{t.quote}&rdquo;</p>
            )}
            <div className="flex items-center gap-3">
              {t.avatar ? (
                <img src={t.avatar} alt={t.author} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-primary font-semibold">{t.author?.charAt(0) || '?'}</span>
                </div>
              )}
              <div>
                {t.author && <p className="text-white font-medium text-sm">{t.author}</p>}
                {t.role && <p className="text-slate-500 text-xs">{t.role}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
