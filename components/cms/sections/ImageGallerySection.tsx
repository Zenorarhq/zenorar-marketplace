'use client'

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
    hideOnMobile,
  } = props

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
            <div key={index} className={`aspect-square bg-[#1a1a1a] ${radiusClasses[borderRadius]} overflow-hidden`}>
              {image.src ? (
                <img
                  src={image.src}
                  alt={image.alt || ''}
                  className="w-full h-full object-cover"
                />
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
  )
}
