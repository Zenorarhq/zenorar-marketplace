'use client'

import { useState, useEffect, useCallback } from 'react'

interface GalleryImage {
  src?: string
  alt?: string
}

interface ImageGallerySectionProps {
  props: {
    title?: string
    columns?: number
    images?: GalleryImage[]
    backgroundColor?: string
    padding?: 'none' | 'small' | 'medium' | 'large'
    gap?: 'small' | 'medium' | 'large'
    borderRadius?: 'none' | 'small' | 'medium' | 'large'
    lightbox?: boolean
    hideOnMobile?: boolean
  }
}

export default function ImageGallerySection({ props }: ImageGallerySectionProps) {
  const {
    title,
    columns = 3,
    images = [],
    backgroundColor,
    padding = 'medium',
    gap = 'medium',
    borderRadius = 'medium',
    lightbox = false,
    hideOnMobile,
  } = props

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const openLightbox = (index: number) => {
    if (lightbox) setLightboxIndex(index)
  }

  const closeLightbox = () => setLightboxIndex(null)

  const nextImage = useCallback(() => {
    if (lightboxIndex === null || images.length === 0) return
    setLightboxIndex((lightboxIndex + 1) % images.length)
  }, [lightboxIndex, images.length])

  const prevImage = useCallback(() => {
    if (lightboxIndex === null || images.length === 0) return
    setLightboxIndex((lightboxIndex - 1 + images.length) % images.length)
  }, [lightboxIndex, images.length])

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      else if (e.key === 'ArrowRight') nextImage()
      else if (e.key === 'ArrowLeft') prevImage()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightboxIndex, nextImage, prevImage])

  const paddingClasses: Record<string, string> = {
    none: 'py-2',
    small: 'py-4 sm:py-6',
    medium: 'py-6 sm:py-8 lg:py-12',
    large: 'py-10 sm:py-14 lg:py-20',
  }

  const gapClasses: Record<string, string> = {
    small: 'gap-1 sm:gap-2',
    medium: 'gap-2 sm:gap-4',
    large: 'gap-4 sm:gap-6',
  }

  const radiusClasses: Record<string, string> = {
    none: '',
    small: 'rounded-sm',
    medium: 'rounded-md sm:rounded-lg',
    large: 'rounded-xl',
  }

  if (images.length === 0) {
    return (
      <div className="py-6 sm:py-8 px-4">
        <div className="max-w-4xl mx-auto bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 sm:p-12 text-center">
          <p className="text-slate-500 text-sm sm:text-base">No images in gallery</p>
        </div>
      </div>
    )
  }

  const gridCols: Record<number, string> = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
  }

  return (
    <>
      <section
        className={`${paddingClasses[padding]} px-4 ${hideOnMobile ? 'hidden md:block' : ''}`}
        style={{ backgroundColor: backgroundColor || undefined }}
      >
        <div className="max-w-6xl mx-auto">
          {title && (
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-6 text-center">{title}</h2>
          )}
          <div className={`grid ${gridCols[columns as number] || gridCols[3]} ${gapClasses[gap]}`}>
            {images.map((image, index) => (
              <div
                key={index}
                className={`aspect-square bg-[#1a1a1a] ${radiusClasses[borderRadius]} overflow-hidden ${lightbox && image.src ? 'cursor-pointer group' : ''}`}
                onClick={() => image.src && openLightbox(index)}
                role={lightbox && image.src ? 'button' : undefined}
                aria-label={lightbox && image.src ? `View ${image.alt || `image ${index + 1}`}` : undefined}
              >
                {image.src ? (
                  <div className="relative w-full h-full">
                    <img
                      src={image.src}
                      alt={image.alt || ''}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {lightbox && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
                        </svg>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-slate-500 text-xs sm:text-sm">No image</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && images[lightboxIndex]?.src && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
          role="dialog"
          aria-label="Image lightbox"
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
            aria-label="Close lightbox"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          {/* Prev button */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prevImage() }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
              aria-label="Previous image"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          )}

          {/* Image */}
          <div
            className="max-w-[90vw] max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[lightboxIndex].src}
              alt={images[lightboxIndex].alt || ''}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          </div>

          {/* Next button */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); nextImage() }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
              aria-label="Next image"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          )}

          {/* Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
              {lightboxIndex + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </>
  )
}