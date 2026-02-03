import { StarIcon } from 'hugeicons-react'

interface StarRatingProps {
  rating: number
  size?: 'sm' | 'md' | 'lg'
  showEmpty?: boolean
}

export default function StarRating({ rating, size = 'sm', showEmpty = false }: StarRatingProps) {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

  const sizeMap = {
    sm: 12,
    md: 14,
    lg: 16,
  }

  const iconSize = sizeMap[size]

  return (
    <div className="flex">
      {/* Full stars */}
      {Array.from({ length: fullStars }).map((_, i) => (
        <StarIcon key={`full-${i}`} size={iconSize} className="text-yellow-500 fill-yellow-500" />
      ))}

      {/* Half star */}
      {hasHalfStar && (
        <div className="relative" style={{ width: iconSize, height: iconSize }}>
          {/* Empty star background */}
          <StarIcon size={iconSize} className="text-slate-600 fill-slate-600 absolute inset-0" />
          {/* Half-filled overlay */}
          <div className="absolute inset-0 overflow-hidden" style={{ width: iconSize / 2 }}>
            <StarIcon size={iconSize} className="text-yellow-500 fill-yellow-500" />
          </div>
        </div>
      )}

      {/* Empty stars */}
      {showEmpty && Array.from({ length: emptyStars }).map((_, i) => (
        <StarIcon key={`empty-${i}`} size={iconSize} className="text-slate-600 fill-slate-600" />
      ))}
    </div>
  )
}
