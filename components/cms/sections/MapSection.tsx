'use client'

interface MapSectionProps {
  props: {
    embedUrl?: string
    height?: 'small' | 'medium' | 'large'
    padding?: 'none' | 'small' | 'medium' | 'large'
    borderRadius?: 'none' | 'small' | 'medium' | 'large'
    hideOnMobile?: boolean
  }
}

export default function MapSection({ props }: MapSectionProps) {
  const {
    embedUrl,
    height = 'medium',
    padding = 'medium',
    borderRadius = 'medium',
    hideOnMobile,
  } = props

  const heightClass: Record<string, string> = { small: 'h-[250px]', medium: 'h-[400px]', large: 'h-[550px]' }
  const paddingClasses: Record<string, string> = { none: 'py-2', small: 'py-4', medium: 'py-8', large: 'py-12' }
  const radiusClasses: Record<string, string> = { none: '', small: 'rounded-md', medium: 'rounded-xl', large: 'rounded-2xl' }

  if (!embedUrl) {
    return (
      <div className="py-8 px-4">
        <div className={`max-w-6xl mx-auto bg-[#141414] border border-[#1f1f1f] rounded-xl ${heightClass[height]} flex items-center justify-center`}>
          <p className="text-slate-500">Enter a Google Maps embed URL to display a map.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${paddingClasses[padding]} px-4 ${hideOnMobile ? 'hidden md:block' : ''}`}>
      <div className={`max-w-6xl mx-auto ${radiusClasses[borderRadius]} overflow-hidden ${heightClass[height]}`}>
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