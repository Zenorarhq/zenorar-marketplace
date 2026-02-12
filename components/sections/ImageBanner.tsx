'use client'

import Link from 'next/link'

export default function ImageBanner({ config }: { config?: { imageUrl?: string; title?: string; subtitle?: string; buttonText?: string; buttonLink?: string; height?: string; overlayDarkness?: string; style?: Record<string, any> } }) {
  const heightClass = ({ small: 'h-[300px]', medium: 'h-[400px]', large: 'h-[500px]' } as Record<string, string>)[config?.height || 'medium'] || 'h-[400px]'
  const overlayOpacity = ({ light: 'bg-black/30', medium: 'bg-black/50', dark: 'bg-black/70' } as Record<string, string>)[config?.overlayDarkness || 'medium'] || 'bg-black/50'

  if (!config?.imageUrl) {
    return (
      <section className="mb-12">
        <div className={`${heightClass} rounded-2xl bg-[#141414] border border-[#1f1f1f] flex items-center justify-center`}>
          <p className="text-slate-500 italic">No image set. Edit this section to add a banner image.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="mb-12">
      <div className={`relative ${heightClass} rounded-2xl overflow-hidden`}>
        <img src={config.imageUrl} alt={config?.title || 'Banner'} className="w-full h-full object-cover" />
        <div className={`absolute inset-0 ${overlayOpacity}`} />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          {config?.title && (
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">{config.title}</h2>
          )}
          {config?.subtitle && (
            <p className="text-lg md:text-xl text-slate-200 mb-6 max-w-2xl">{config.subtitle}</p>
          )}
          {config?.buttonText && config?.buttonLink && (
            <Link href={config.buttonLink} className="px-6 py-3 bg-primary text-black rounded-lg font-semibold hover:bg-primary/90 transition-colors">
              {config.buttonText}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
