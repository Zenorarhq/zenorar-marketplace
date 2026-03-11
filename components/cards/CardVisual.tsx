'use client'

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
  size?: 'xs' | 'sm' | 'md' | 'lg'
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
    xs: {
      container: 'w-[120px] h-[76px]',
      padding: 'p-2',
      chip: 'w-4 h-3',
      brandText: 'text-[6px]',
      cardNumber: 'text-[7px]',
      value: 'text-[10px]',
      label: 'text-[5px]',
      expiry: 'text-[6px]',
      badge: 'text-[5px] px-1 py-0.5',
      logoSize: 'text-[8px]',
      mcCircle: 'w-3 h-3'
    },
    sm: {
      container: 'w-[180px] h-[114px]',
      padding: 'p-3',
      chip: 'w-5 h-4',
      brandText: 'text-[8px]',
      cardNumber: 'text-[9px]',
      value: 'text-xs',
      label: 'text-[6px]',
      expiry: 'text-[8px]',
      badge: 'text-[6px] px-1.5 py-0.5',
      logoSize: 'text-xs',
      mcCircle: 'w-4 h-4'
    },
    md: {
      container: 'w-[260px] h-[164px]',
      padding: 'p-4',
      chip: 'w-7 h-5',
      brandText: 'text-[10px]',
      cardNumber: 'text-xs',
      value: 'text-base',
      label: 'text-[8px]',
      expiry: 'text-[10px]',
      badge: 'text-[8px] px-2 py-0.5',
      logoSize: 'text-sm',
      mcCircle: 'w-5 h-5'
    },
    lg: {
      container: 'w-[320px] h-[202px]',
      padding: 'p-5',
      chip: 'w-9 h-6',
      brandText: 'text-xs',
      cardNumber: 'text-sm',
      value: 'text-lg',
      label: 'text-[10px]',
      expiry: 'text-xs',
      badge: 'text-[10px] px-2.5 py-1',
      logoSize: 'text-base',
      mcCircle: 'w-6 h-6'
    }
  }

  const config = sizeConfig[size]

  // Get card style based on brand and type
  const getCardStyle = () => {
    if (type === 'instant') {
      // Instant cards - Vibrant teal/cyan with glass effect
      return {
        bg: 'bg-gradient-to-br from-emerald-500 via-teal-400 to-cyan-500',
        pattern: 'instant',
        glow: 'shadow-[0_0_40px_rgba(20,184,166,0.4)]'
      }
    }

    if (brand === 'mastercard') {
      // Mastercard - Bold orange/red with interlocking circles
      if (isPremium) {
        return {
          bg: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900',
          pattern: 'mastercard-premium',
          glow: 'shadow-[0_0_40px_rgba(251,146,60,0.3)]'
        }
      }
      return {
        bg: 'bg-gradient-to-br from-orange-500 via-red-500 to-rose-600',
        pattern: 'mastercard',
        glow: 'shadow-[0_0_40px_rgba(249,115,22,0.4)]'
      }
    }

    // Visa
    if (isPremium) {
      // Premium Visa - Dark with gold accents
      return {
        bg: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900',
        pattern: 'visa-premium',
        glow: 'shadow-[0_0_40px_rgba(139,92,246,0.3)]'
      }
    }
    // Standard Visa - Deep blue with modern feel
    return {
      bg: 'bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700',
      pattern: 'visa',
      glow: 'shadow-[0_0_40px_rgba(99,102,241,0.4)]'
    }
  }

  const cardStyle = getCardStyle()

  // Render pattern overlays
  const renderPattern = () => {
    switch (cardStyle.pattern) {
      case 'instant':
        return (
          <>
            {/* Floating orbs */}
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/20 blur-xl" />
            <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-cyan-300/30 blur-xl" />
            <div className="absolute top-1/2 right-1/4 w-16 h-16 rounded-full bg-emerald-300/20 blur-lg" />
            {/* Wave pattern */}
            <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 400 250" preserveAspectRatio="none">
              <path d="M0,100 Q100,150 200,100 T400,100 L400,250 L0,250 Z" fill="white" />
              <path d="M0,150 Q100,200 200,150 T400,150 L400,250 L0,250 Z" fill="white" opacity="0.5" />
            </svg>
          </>
        )

      case 'mastercard':
        return (
          <>
            {/* Iconic overlapping circles */}
            <div className="absolute top-1/2 left-[20%] -translate-y-1/2 w-24 h-24 rounded-full bg-red-400/40 blur-sm" />
            <div className="absolute top-1/2 left-[32%] -translate-y-1/2 w-24 h-24 rounded-full bg-yellow-400/40 blur-sm" />
            {/* Texture lines */}
            <div className="absolute inset-0 opacity-5">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="absolute h-px bg-white" style={{ top: `${(i + 1) * 12}%`, left: 0, right: 0 }} />
              ))}
            </div>
          </>
        )

      case 'mastercard-premium':
        return (
          <>
            {/* Gold accent circles */}
            <div className="absolute top-1/2 left-[18%] -translate-y-1/2 w-20 h-20 rounded-full border-2 border-amber-500/50" />
            <div className="absolute top-1/2 left-[30%] -translate-y-1/2 w-20 h-20 rounded-full border-2 border-orange-500/50" />
            <div className="absolute top-1/2 left-[24%] -translate-y-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 opacity-60" />
            {/* Metallic sheen */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent" />
            {/* Corner accent */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-amber-500/20 to-transparent rounded-full blur-xl" />
          </>
        )

      case 'visa-premium':
        return (
          <>
            {/* Purple/gold gradient accent */}
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-gradient-to-br from-violet-500/30 to-amber-500/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-xl" />
            {/* Metallic line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
            {/* Grid pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: 'linear-gradient(90deg, white 1px, transparent 1px), linear-gradient(white 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }} />
          </>
        )

      case 'visa':
      default:
        return (
          <>
            {/* Flowing gradient orbs */}
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-indigo-400/20 blur-xl" />
            <div className="absolute top-1/3 right-1/3 w-20 h-20 rounded-full bg-violet-400/10 blur-lg" />
            {/* Diagonal lines */}
            <svg className="absolute inset-0 w-full h-full opacity-5" viewBox="0 0 100 100" preserveAspectRatio="none">
              {[...Array(5)].map((_, i) => (
                <line key={i} x1={i * 25} y1="0" x2={i * 25 + 50} y2="100" stroke="white" strokeWidth="0.5" />
              ))}
            </svg>
          </>
        )
    }
  }

  // Get status badge
  const getStatusBadge = () => {
    if (!status || status === 'active') return null

    const statusStyles = {
      frozen: 'bg-blue-500/30 text-blue-200 border-blue-400/30',
      used: 'bg-slate-500/30 text-slate-300 border-slate-400/30',
      expired: 'bg-red-500/30 text-red-200 border-red-400/30',
      pending: 'bg-amber-500/30 text-amber-200 border-amber-400/30'
    }

    return (
      <span className={`${statusStyles[status]} ${config.badge} rounded-full font-semibold border backdrop-blur-sm`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  // Display value
  const displayValue = type === 'instant' && denomination
    ? `$${denomination}`
    : balance !== undefined
      ? `$${balance.toFixed(2)}`
      : null

  return (
    <div
      className={`${config.container} ${cardStyle.bg} rounded-2xl relative overflow-hidden ${cardStyle.glow} ${className}`}
      style={{ aspectRatio: '1.586' }}
    >
      {/* Pattern overlay */}
      {renderPattern()}

      {/* Glass reflection effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-60" />

      {/* Holographic shimmer */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.3) 45%, rgba(255,255,255,0.1) 50%, transparent 55%)',
        }}
      />

      {/* Card content */}
      <div className={`relative z-10 h-full ${config.padding} flex flex-col justify-between`}>
        {/* Top row */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            {/* Card type */}
            <span className={`text-white/80 ${config.brandText} uppercase tracking-widest font-bold`}>
              {type === 'instant' ? 'Instant' : isPremium ? 'Premium' : 'Virtual'}
            </span>
            {getStatusBadge()}
          </div>

          {/* EMV Chip */}
          {showDetails && (
            <div className={`${config.chip} rounded bg-gradient-to-br from-amber-200 via-yellow-300 to-amber-400 relative overflow-hidden`}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[70%] h-[80%] grid grid-cols-2 gap-px">
                  <div className="bg-amber-600/40 rounded-sm" />
                  <div className="bg-amber-600/30 rounded-sm" />
                  <div className="bg-amber-600/30 rounded-sm" />
                  <div className="bg-amber-600/40 rounded-sm" />
                </div>
              </div>
              {/* Chip shine */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent" />
            </div>
          )}
        </div>

        {/* Middle - Card number */}
        {showDetails && (
          <div className="flex-1 flex items-center">
            <p className={`text-white font-mono tracking-[0.2em] ${config.cardNumber} drop-shadow-sm`}>
              {size === 'xs' ? `••${lastFour || '••••'}` : `•••• •••• •••• ${lastFour || '••••'}`}
            </p>
          </div>
        )}

        {/* Bottom row */}
        <div className="flex items-end justify-between">
          <div className="flex flex-col">
            {showDetails && expiry && size !== 'xs' && (
              <div className="flex flex-col">
                <span className={`text-white/50 ${config.label} uppercase tracking-wider`}>
                  Expires
                </span>
                <span className={`text-white ${config.expiry} font-medium`}>
                  {expiry}
                </span>
              </div>
            )}
            {displayValue && (
              <span className={`text-white font-bold ${config.value} drop-shadow-md mt-0.5`}>
                {displayValue}
              </span>
            )}
          </div>

          {/* Brand logo */}
          <div className="flex items-center">
            {brand === 'mastercard' ? (
              <div className="flex items-center -space-x-2">
                <div className={`${config.mcCircle} rounded-full bg-red-500 shadow-lg`} />
                <div className={`${config.mcCircle} rounded-full bg-amber-400 shadow-lg`} />
              </div>
            ) : (
              <span className={`font-bold italic text-white ${config.logoSize} drop-shadow-md tracking-wide`}>
                VISA
              </span>
            )}
          </div>
        </div>

        {/* Premium badge */}
        {isPremium && type !== 'instant' && size !== 'xs' && (
          <div className="absolute top-3 right-12">
            <span className={`bg-gradient-to-r from-amber-400/20 to-amber-600/20 text-amber-300 ${config.badge} rounded-full font-semibold border border-amber-400/30 backdrop-blur-sm`}>
              3D Secure
            </span>
          </div>
        )}
      </div>

      {/* Edge highlight */}
      <div className="absolute inset-0 rounded-2xl border border-white/20 pointer-events-none" />
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

// Mini version for cart items
export function CardVisualMini({
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
      showDetails={false}
      size="xs"
      className={className}
    />
  )
}

// Preview version for product cards
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
