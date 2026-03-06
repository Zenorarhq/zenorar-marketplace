'use client'

interface VideoEmbedSectionProps {
  props: {
    url?: string
    title?: string
    aspectRatio?: '16:9' | '4:3' | '1:1'
    backgroundColor?: string
    padding?: 'none' | 'small' | 'medium' | 'large'
    maxWidth?: 'full' | 'container' | 'narrow'
    borderRadius?: 'none' | 'small' | 'medium' | 'large'
    autoplay?: boolean
    muted?: boolean
    showControls?: boolean
    caption?: string
    hideOnMobile?: boolean
  }
}

function getEmbedUrl(url: string, autoplay?: boolean, muted?: boolean, showControls?: boolean): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (ytMatch) {
    const params = new URLSearchParams()
    if (autoplay) params.set('autoplay', '1')
    if (muted) params.set('mute', '1')
    if (showControls === false) params.set('controls', '0')
    const qs = params.toString()
    return `https://www.youtube.com/embed/${ytMatch[1]}${qs ? '?' + qs : ''}`
  }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) {
    const params = new URLSearchParams()
    if (autoplay) params.set('autoplay', '1')
    if (muted) params.set('muted', '1')
    const qs = params.toString()
    return `https://player.vimeo.com/video/${vimeoMatch[1]}${qs ? '?' + qs : ''}`
  }
  return null
}

export default function VideoEmbedSection({ props }: VideoEmbedSectionProps) {
  const {
    url,
    title,
    aspectRatio = '16:9',
    backgroundColor,
    padding = 'medium',
    maxWidth = 'narrow',
    borderRadius = 'medium',
    autoplay,
    muted,
    showControls = true,
    caption,
    hideOnMobile,
  } = props

  const embedUrl = url ? getEmbedUrl(url, autoplay, muted, showControls) : null

  const paddingMap: Record<string, string> = {
    '16:9': 'pb-[56.25%]',
    '4:3': 'pb-[75%]',
    '1:1': 'pb-[100%]',
  }

  const paddingClasses: Record<string, string> = {
    none: 'py-2',
    small: 'py-4',
    medium: 'py-8',
    large: 'py-12',
  }

  const maxWidthClasses: Record<string, string> = {
    full: 'max-w-full',
    container: 'max-w-5xl',
    narrow: 'max-w-4xl',
  }

  const radiusClasses: Record<string, string> = {
    none: '',
    small: 'rounded-md',
    medium: 'rounded-xl',
    large: 'rounded-2xl',
  }

  if (!embedUrl) {
    return (
      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto bg-[#141414] border border-[#1f1f1f] rounded-xl p-8 text-center">
          <p className="text-slate-500">Enter a YouTube or Vimeo URL to embed a video.</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`${paddingClasses[padding]} px-4 ${hideOnMobile ? 'hidden md:block' : ''}`}
      style={{ backgroundColor: backgroundColor || undefined }}
    >
      <div className={`${maxWidthClasses[maxWidth]} mx-auto`}>
        {title && <h2 className="text-2xl font-bold text-white mb-4 text-center">{title}</h2>}
        <div className={`relative ${paddingMap[aspectRatio] || paddingMap['16:9']} ${radiusClasses[borderRadius]} overflow-hidden`}>
          <iframe
            src={embedUrl}
            title={title || 'Video'}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {caption && (
          <p className="text-slate-500 text-xs sm:text-sm text-center mt-3">{caption}</p>
        )}
      </div>
    </div>
  )
}