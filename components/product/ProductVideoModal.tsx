'use client'

import { useState } from 'react'
import Icon from '@/components/ui/Icon'

interface ProductVideoModalProps {
  videoUrl: string
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

export default function ProductVideoModal({ videoUrl }: ProductVideoModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const embedUrl = getEmbedUrl(videoUrl)

  return (
    <>
      <button
        type="button"
        aria-label="Play product video"
        onClick={() => setIsOpen(true)}
        className="w-12 h-12 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center border border-white/20 cursor-pointer hover:bg-white/20"
      >
        <Icon name="play-circle" size={24} />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white"
            >
              <Icon name="x" size={24} />
            </button>

            {/* Video content */}
            <div className="relative pb-[56.25%] rounded-xl overflow-hidden bg-black">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title="Product Video"
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  className="absolute inset-0 w-full h-full"
                >
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
