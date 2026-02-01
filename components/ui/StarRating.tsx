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
    <div className="flex text-yellow-500">
      {/* Full stars */}
      {Array.from({ length: fullStars }).map((_, i) => (
        <StarIcon key={`full-${i}`} size={iconSize}  className="text-yellow-500" />
      ))}

      {/* Half star - using solid with reduced opacity as approximation */}
      {hasHalfStar && (
        <div className="relative">
          <StarIcon size={iconSize}  className="text-yellow-500" />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <StarIcon size={iconSize}  className="text-yellow-500" />
          </div>
        </div>
      )}

      {/* Empty stars */}
      {showEmpty && Array.from({ length: emptyStars }).map((_, i) => (
        <StarIcon key={`empty-${i}`} size={iconSize}  className="text-yellow-500" />
      ))}
    </div>
  )
}
