'use client'

interface GalleryImage {
  src?: string
  alt?: string
}

interface ImageGallerySectionProps {
  props: {
    columns?: number
    images?: GalleryImage[]
  }
}

export default function ImageGallerySection({ props }: ImageGallerySectionProps) {
  const {
    columns = 3,
    images = [],
  } = props

  if (images.length === 0) {
    return (
      <div className="py-6 sm:py-8 px-4">
        <div className="max-w-4xl mx-auto bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 sm:p-12 text-center">
          <p className="text-slate-500 text-sm sm:text-base">No images in gallery</p>
        </div>
      </div>
    )
  }

  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
  }

  return (
    <section className="py-6 sm:py-8 lg:py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className={`grid ${gridCols[columns as keyof typeof gridCols] || gridCols[3]} gap-2 sm:gap-4`}>
          {images.map((image, index) => (
            <div key={index} className="aspect-square bg-[#1a1a1a] rounded-md sm:rounded-lg overflow-hidden">
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
