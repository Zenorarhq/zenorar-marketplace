'use client'

import Icon from '@/components/ui/Icon'

interface CardVisualProps {
  brand: 'visa' | 'mastercard'
  type: 'virtual' | 'instant'
  isPremium?: boolean
  denomination?: number | null
  balance?: number
  lastFour?: string
  expiry?: string
  cardholderName?: string
  status?: 'active' | 'frozen' | 'used' | 'expired' | 'pending'
  size?: 'sm' | 'md' | 'lg'
  showDetails?: boolean
  className?: string
}

export default function CardVisual({
  brand,
  type,
  isPremium = false,
  denomination,
  balance,
  lastFour,
  expiry,
  cardholderName,
  status = 'active',
  size = 'md',
  showDetails = true,
  className = ''
}: CardVisualProps) {
  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'w-full max-w-[200px] h-[126px]',
      logo: 'w-10 h-6',
      chip: 'w-6 h-5',
      brandText: 'text-[10px]',
      cardNumber: 'text-xs',
      value: 'text-sm',
      label: 'text-[8px]',
      expiry: 'text-[10px]',
      badge: 'text-[8px] px-1.5 py-0.5'
    },
    md: {
      container: 'w-full max-w-[280px] h-[176px]',
      logo: 'w-14 h-8',
      chip: 'w-8 h-6',
      brandText: 'text-xs',
      cardNumber: 'text-sm',
      value: 'text-lg',
      label: 'text-[10px]',
      expiry: 'text-xs',
      badge: 'text-[10px] px-2 py-0.5'
    },
    lg: {
      container: 'w-full max-w-[340px] h-[214px]',
      logo: 'w-16 h-10',
      chip: 'w-10 h-7',
      brandText: 'text-sm',
      cardNumber: 'text-base',
      value: 'text-xl',
      label: 'text-xs',
      expiry: 'text-sm',
      badge: 'text-xs px-2.5 py-1'
    }
  }

  const config = sizeConfig[size]

  // Get gradient based on brand and type
  const getGradient = () => {
    if (type === 'instant') {
      // Instant cards - Modern emerald/teal design
      return 'bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-600'
    }

    if (brand === 'mastercard') {
      // Mastercard - Modern orange/red design
      if (isPremium) {
        return 'bg-gradient-to-br from-rose-500 via-red-600 to-orange-600'
      }
      return 'bg-gradient-to-br from-orange-500 via-red-500 to-rose-600'
    }

    // Visa - Modern blue/purple design
    if (isPremium) {
      return 'bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700'
    }
    return 'bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600'
  }

  // Get overlay pattern
  const getPattern = () => {
    if (type === 'instant') {
      return (
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-black/10 translate-y-1/3 -translate-x-1/4" />
        </div>
      )
    }

    if (brand === 'mastercard') {
      return (
        <div className="absolute inset-0 opacity-15">
          <div className="absolute top-1/2 left-1/4 w-32 h-32 rounded-full bg-yellow-300 -translate-y-1/2" />
          <div className="absolute top-1/2 left-[35%] w-32 h-32 rounded-full bg-red-300 -translate-y-1/2" />
        </div>
      )
    }

    return (
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-36 h-36 rounded-full bg-white/50 translate-y-1/2 -translate-x-1/4" />
      </div>
    )
  }

  // Get brand logo
  const getBrandLogo = () => {
    if (brand === 'mastercard') {
      return (
        <div className={`flex items-center ${config.logo}`}>
          <div className="w-5 h-5 rounded-full bg-red-500" />
          <div className="w-5 h-5 rounded-full bg-yellow-400 -ml-2" />
        </div>
      )
    }

    // Visa logo
    return (
      <span className={`font-bold italic text-white ${config.value}`}>
        VISA
      </span>
    )
  }

  // Get status badge color
  const getStatusBadge = () => {
    if (!status || status === 'active') return null

    const statusConfig = {
      frozen: { bg: 'bg-blue-500/20', text: 'text-blue-300', label: 'Frozen' },
      used: { bg: 'bg-slate-500/20', text: 'text-slate-300', label: 'Used' },
      expired: { bg: 'bg-red-500/20', text: 'text-red-300', label: 'Expired' },
      pending: { bg: 'bg-amber-500/20', text: 'text-amber-300', label: 'Pending' }
    }

    const cfg = statusConfig[status]
    if (!cfg) return null

    return (
      <span className={`${cfg.bg} ${cfg.text} ${config.badge} rounded-full font-medium`}>
        {cfg.label}
      </span>
    )
  }

  // Display value (denomination for instant, balance for virtual)
  const displayValue = type === 'instant' && denomination ? `$${denomination}` : balance !== undefined ? `$${balance.toFixed(2)}` : null

  return (
    <div
      className={`${config.container} ${getGradient()} rounded-xl relative overflow-hidden shadow-lg ${className}`}
      style={{ aspectRatio: '1.586' }}
    >
      {/* Background pattern */}
      {getPattern()}

      {/* Mesh overlay for texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.1)_0%,_transparent_50%)]" />

      {/* Card content */}
      <div className="relative z-10 h-full p-4 flex flex-col justify-between">
        {/* Top row */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            {/* Card type badge */}
            <div className="flex items-center gap-2">
              <span className={`text-white/70 ${config.brandText} uppercase tracking-wider font-medium`}>
                {type === 'instant' ? 'Instant Card' : isPremium ? 'Premium' : 'Virtual Card'}
              </span>
              {isPremium && type !== 'instant' && (
                <span className={`bg-amber-400/20 text-amber-300 ${config.badge} rounded-full`}>
                  3D Secure
                </span>
              )}
            </div>
            {getStatusBadge()}
          </div>

          {/* Chip */}
          {showDetails && (
            <div className={`${config.chip} bg-gradient-to-br from-amber-200 via-yellow-300 to-amber-400 rounded-md flex items-center justify-center shadow-inner`}>
              <div className="w-[60%] h-[70%] grid grid-cols-2 grid-rows-3 gap-px">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-amber-600/30 rounded-[1px]" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Middle - Card number */}
        {showDetails && (
          <div className="flex-1 flex items-center">
            <p className={`text-white font-mono tracking-widest ${config.cardNumber}`}>
              **** **** **** {lastFour || '****'}
            </p>
          </div>
        )}

        {/* Bottom row */}
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-0.5">
            {showDetails && expiry && (
              <>
                <span className={`text-white/50 ${config.label} uppercase tracking-wide`}>
                  Valid Thru
                </span>
                <span className={`text-white ${config.expiry} font-medium`}>
                  {expiry}
                </span>
              </>
            )}
            {showDetails && cardholderName && (
              <span className={`text-white/80 ${config.expiry} uppercase tracking-wide mt-1`}>
                {cardholderName}
              </span>
            )}
            {/* Show value for instant cards or balance for virtual */}
            {displayValue && (
              <span className={`text-white font-bold ${config.value}`}>
                {displayValue}
              </span>
            )}
          </div>

          {/* Brand logo */}
          {getBrandLogo()}
        </div>
      </div>

      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-[-100%] hover:translate-x-[200%] transition-transform duration-1000" />
    </div>
  )
}

// Compact version for lists/grids
export function CardVisualCompact({
  brand,
  type,
  isPremium = false,
  denomination,
  balance,
  lastFour,
  status,
  className = ''
}: Omit<CardVisualProps, 'size' | 'showDetails' | 'expiry' | 'cardholderName'>) {
  return (
    <CardVisual
      brand={brand}
      type={type}
      isPremium={isPremium}
      denomination={denomination}
      balance={balance}
      lastFour={lastFour}
      status={status}
      size="sm"
      showDetails={true}
      className={className}
    />
  )
}

// Preview version for product cards (no personal details)
export function CardVisualPreview({
  brand,
  type,
  isPremium = false,
  denomination,
  className = ''
}: Pick<CardVisualProps, 'brand' | 'type' | 'isPremium' | 'denomination' | 'className'>) {
  return (
    <CardVisual
      brand={brand}
      type={type}
      isPremium={isPremium}
      denomination={denomination}
      showDetails={true}
      size="md"
      className={className}
    />
  )
}
