'use client'

interface MapSectionProps {
  props: {
    embedUrl?: string
    height?: 'small' | 'medium' | 'large'
  }
}

export default function MapSection({ props }: MapSectionProps) {
  const { embedUrl, height = 'medium' } = props

  const heightClass = { small: 'h-[250px]', medium: 'h-[400px]', large: 'h-[550px]' }[height] || 'h-[400px]'

  if (!embedUrl) {
    return (
      <div className="py-8 px-4">
        <div className={`max-w-6xl mx-auto bg-[#141414] border border-[#1f1f1f] rounded-xl ${heightClass} flex items-center justify-center`}>
          <p className="text-slate-500">Enter a Google Maps embed URL to display a map.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8 px-4">
      <div className={`max-w-6xl mx-auto rounded-xl overflow-hidden ${heightClass}`}>
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  )
}
