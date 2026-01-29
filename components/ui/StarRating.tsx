interface StarRatingProps {
  rating: number
  size?: 'sm' | 'md' | 'lg'
  showEmpty?: boolean
}

export default function StarRating({ rating, size = 'sm', showEmpty = false }: StarRatingProps) {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

  const sizeClasses = {
    sm: 'text-[12px]',
    md: 'text-[14px]',
    lg: 'text-[16px]',
  }

  return (
    <div className="flex text-yellow-500">
      {/* Full stars */}
      {Array.from({ length: fullStars }).map((_, i) => (
        <span key={`full-${i}`} className={`material-symbols-outlined ${sizeClasses[size]} icon-filled`}>
          star
        </span>
      ))}

      {/* Half star */}
      {hasHalfStar && (
        <span className={`material-symbols-outlined ${sizeClasses[size]} icon-filled`}>
          star_half
        </span>
      )}

      {/* Empty stars */}
      {showEmpty && Array.from({ length: emptyStars }).map((_, i) => (
        <span key={`empty-${i}`} className={`material-symbols-outlined ${sizeClasses[size]}`}>
          star
        </span>
      ))}
    </div>
  )
}
