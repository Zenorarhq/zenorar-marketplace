'use client'

interface VideoEmbedSectionProps {
  props: {
    url?: string
    title?: string
    aspectRatio?: '16:9' | '4:3' | '1:1'
  }
}

function getEmbedUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  return null
}

export default function VideoEmbedSection({ props }: VideoEmbedSectionProps) {
  const { url, title, aspectRatio = '16:9' } = props
  const embedUrl = url ? getEmbedUrl(url) : null

  const paddingMap: Record<string, string> = {
    '16:9': 'pb-[56.25%]',
    '4:3': 'pb-[75%]',
    '1:1': 'pb-[100%]',
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
    <div className="py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {title && <h2 className="text-2xl font-bold text-white mb-4 text-center">{title}</h2>}
        <div className={`relative ${paddingMap[aspectRatio] || paddingMap['16:9']} rounded-xl overflow-hidden`}>
          <iframe
            src={embedUrl}
            title={title || 'Video'}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  )
}
