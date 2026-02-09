'use client'

interface ImageSectionProps {
  props: {
    src?: string
    alt?: string
    caption?: string
    width?: 'full' | 'large' | 'medium' | 'small'
  }
}

export default function ImageSection({ props }: ImageSectionProps) {
  const {
    src,
    alt = '',
    caption,
    width = 'full',
  } = props

  if (!src) {
    return (
      <div className="py-6 sm:py-8 px-4">
        <div className="max-w-4xl mx-auto bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 sm:p-12 text-center">
          <p className="text-slate-500 text-sm sm:text-base">No image selected</p>
        </div>
      </div>
    )
  }

  const widthClasses = {
    full: 'max-w-full',
    large: 'max-w-5xl',
    medium: 'max-w-3xl',
    small: 'max-w-xl',
  }

  return (
    <figure className="py-6 sm:py-8 px-4">
      <div className={`${widthClasses[width]} mx-auto`}>
        <img
          src={src}
          alt={alt}
          className="w-full rounded-lg"
        />
        {caption && (
          <figcaption className="text-slate-500 text-xs sm:text-sm text-center mt-3 sm:mt-4">
            {caption}
          </figcaption>
        )}
      </div>
    </figure>
  )
}
