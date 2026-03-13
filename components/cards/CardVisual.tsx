'use client'

import { useState } from 'react'

interface CardVisualProps {
  brand: 'visa' | 'mastercard'
  type: 'virtual' | 'instant'
  isPremium?: boolean
  denomination?: number | null
  balance?: number
  lastFour?: string
  expiry?: string
  cardNumber?: string
  cvv?: string
  cardholderName?: string
  status?: 'active' | 'frozen' | 'used' | 'expired' | 'pending'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showDetails?: boolean
  flippable?: boolean
  isFlipped?: boolean // External control for flip state
  isLoading?: boolean // Show redacted state while loading
  className?: string
  onFlip?: (isFlipped: boolean) => void
}

export default function CardVisual({
  brand,
  type,
  isPremium = false,
  denomination,
  balance,
  lastFour,
  expiry,
  cardNumber,
  cvv,
  cardholderName,
  status = 'active',
  size = 'md',
  showDetails = true,
  flippable = false,
  isFlipped: controlledIsFlipped,
  isLoading = false,
  className = '',
  onFlip
}: CardVisualProps) {
  const [internalIsFlipped, setInternalIsFlipped] = useState(false)

  // Use controlled state if provided, otherwise use internal state
  const isFlipped = controlledIsFlipped !== undefined ? controlledIsFlipped : internalIsFlipped

  const handleFlip = () => {
    if (flippable) {
      const newState = !isFlipped
      if (controlledIsFlipped === undefined) {
        setInternalIsFlipped(newState)
      }
      onFlip?.(newState)
    }
  }

  // Size configurations
  const sizeConfig = {
    xs: {
      container: 'w-[120px] h-[76px]',
      padding: 'p-2',
      chip: 'w-5 h-4',
      brandText: 'text-[6px]',
      cardNumber: 'text-[7px]',
      value: 'text-[10px]',
      label: 'text-[5px]',
      expiry: 'text-[6px]',
      badge: 'text-[5px] px-1 py-0.5',
      logoSize: 'text-[8px]',
      mcCircle: 'w-3 h-3',
      meshSize: 60,
      contactless: 'w-3 h-3'
    },
    sm: {
      container: 'w-[180px] h-[114px]',
      padding: 'p-3',
      chip: 'w-7 h-5',
      brandText: 'text-[8px]',
      cardNumber: 'text-[9px]',
      value: 'text-xs',
      label: 'text-[6px]',
      expiry: 'text-[8px]',
      badge: 'text-[6px] px-1.5 py-0.5',
      logoSize: 'text-xs',
      mcCircle: 'w-4 h-4',
      meshSize: 80,
      contactless: 'w-4 h-4'
    },
    md: {
      container: 'w-[280px] h-[176px]',
      padding: 'p-4',
      chip: 'w-10 h-7',
      brandText: 'text-[10px]',
      cardNumber: 'text-sm',
      value: 'text-lg',
      label: 'text-[8px]',
      expiry: 'text-[10px]',
      badge: 'text-[8px] px-2 py-0.5',
      logoSize: 'text-sm',
      mcCircle: 'w-5 h-5',
      meshSize: 100,
      contactless: 'w-5 h-5'
    },
    lg: {
      container: 'w-[340px] h-[214px]',
      padding: 'p-5',
      chip: 'w-12 h-8',
      brandText: 'text-xs',
      cardNumber: 'text-base',
      value: 'text-xl',
      label: 'text-[10px]',
      expiry: 'text-xs',
      badge: 'text-[10px] px-2.5 py-1',
      logoSize: 'text-base',
      mcCircle: 'w-6 h-6',
      meshSize: 120,
      contactless: 'w-6 h-6'
    }
  }

  const config = sizeConfig[size]

  // Get card style based on type
  const getCardStyle = () => {
    if (type === 'instant') {
      // Instant cards - Dark gradient with purple/pink/blue mesh
      if (brand === 'mastercard') {
        return {
          bg: 'bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f23]',
          accent: 'from-rose-500 via-fuchsia-500 to-purple-600',
          glow: 'shadow-[0_8px_32px_rgba(236,72,153,0.25)]',
          meshColors: ['#ec4899', '#d946ef', '#a855f7', '#8b5cf6']
        }
      }
      return {
        bg: 'bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0c0a1d]',
        accent: 'from-violet-500 via-purple-500 to-fuchsia-500',
        glow: 'shadow-[0_8px_32px_rgba(139,92,246,0.25)]',
        meshColors: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#7c3aed']
      }
    }

    // Virtual cards - Dark minimal with wireframe mesh
    if (isPremium) {
      // Premium - Dark with gold/amber accents
      return {
        bg: 'bg-gradient-to-br from-[#0a0a0a] via-[#171717] to-[#0a0a0a]',
        accent: 'from-amber-400 via-yellow-500 to-amber-600',
        glow: 'shadow-[0_8px_32px_rgba(251,191,36,0.15)]',
        meshColors: ['#fbbf24', '#f59e0b', '#d97706', '#b45309']
      }
    }

    if (brand === 'mastercard') {
      return {
        bg: 'bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#0a0a0a]',
        accent: 'from-orange-500 via-red-500 to-rose-500',
        glow: 'shadow-[0_8px_32px_rgba(249,115,22,0.15)]',
        meshColors: ['#f97316', '#ef4444', '#ec4899', '#f43f5e']
      }
    }

    // Visa - Deep blue/navy with cyan mesh
    return {
      bg: 'bg-gradient-to-br from-[#0c1929] via-[#0f2847] to-[#0a1628]',
      accent: 'from-cyan-400 via-blue-500 to-indigo-600',
      glow: 'shadow-[0_8px_32px_rgba(6,182,212,0.2)]',
      meshColors: ['#06b6d4', '#3b82f6', '#6366f1', '#22d3ee']
    }
  }

  const cardStyle = getCardStyle()

  // Render wireframe mesh pattern
  const renderMeshPattern = () => {
    const meshSize = config.meshSize
    const colors = cardStyle.meshColors

    return (
      <svg
        className="absolute inset-0 w-full h-full opacity-40"
        viewBox={`0 0 ${meshSize * 4} ${meshSize * 2.5}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id={`meshGrad-${type}-${brand}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors[0]} stopOpacity="0.6" />
            <stop offset="33%" stopColor={colors[1]} stopOpacity="0.4" />
            <stop offset="66%" stopColor={colors[2]} stopOpacity="0.5" />
            <stop offset="100%" stopColor={colors[3]} stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Geometric wireframe shapes */}
        <g stroke={`url(#meshGrad-${type}-${brand})`} fill="none" strokeWidth="0.5">
          {/* Large polygon - top right */}
          <polygon
            points={`${meshSize * 2.5},${meshSize * 0.2} ${meshSize * 3.8},${meshSize * 0.8} ${meshSize * 3.5},${meshSize * 1.8} ${meshSize * 2.2},${meshSize * 1.5} ${meshSize * 2},${meshSize * 0.6}`}
            className="animate-pulse"
            style={{ animationDuration: '4s' }}
          />

          {/* Medium polygon - center */}
          <polygon
            points={`${meshSize * 1.2},${meshSize * 0.8} ${meshSize * 2.2},${meshSize * 0.4} ${meshSize * 2.5},${meshSize * 1.2} ${meshSize * 1.8},${meshSize * 1.8} ${meshSize * 0.8},${meshSize * 1.4}`}
          />

          {/* Small polygon - bottom left */}
          <polygon
            points={`${meshSize * 0.3},${meshSize * 1.5} ${meshSize * 1.2},${meshSize * 1.2} ${meshSize * 1.5},${meshSize * 2} ${meshSize * 0.8},${meshSize * 2.3} ${meshSize * 0.1},${meshSize * 2}`}
          />

          {/* Connection lines */}
          <line x1={meshSize * 1.2} y1={meshSize * 0.8} x2={meshSize * 2.5} y2={meshSize * 0.2} />
          <line x1={meshSize * 2.2} y1={meshSize * 0.4} x2={meshSize * 3.8} y2={meshSize * 0.8} />
          <line x1={meshSize * 1.8} y1={meshSize * 1.8} x2={meshSize * 2.2} y2={meshSize * 1.5} />
          <line x1={meshSize * 0.8} y1={meshSize * 1.4} x2={meshSize * 2} y2={meshSize * 0.6} />

          {/* Accent dots at vertices */}
          <circle cx={meshSize * 2.5} cy={meshSize * 0.2} r="2" fill={colors[0]} />
          <circle cx={meshSize * 3.8} cy={meshSize * 0.8} r="1.5" fill={colors[1]} />
          <circle cx={meshSize * 1.2} cy={meshSize * 0.8} r="2" fill={colors[2]} />
          <circle cx={meshSize * 0.8} cy={meshSize * 1.4} r="1.5" fill={colors[3]} />
          <circle cx={meshSize * 1.8} cy={meshSize * 1.8} r="2" fill={colors[0]} />
        </g>

        {/* Additional decorative lines for instant cards */}
        {type === 'instant' && (
          <g stroke={colors[0]} strokeWidth="0.3" opacity="0.3">
            {[...Array(6)].map((_, i) => (
              <line
                key={i}
                x1={meshSize * (0.5 + i * 0.6)}
                y1="0"
                x2={meshSize * (0.8 + i * 0.6)}
                y2={meshSize * 2.5}
              />
            ))}
          </g>
        )}
      </svg>
    )
  }

  // Render EMV chip with semi-transparent effect for instant cards
  const renderChip = () => {
    const isTransparent = type === 'instant'

    return (
      <div
        className={`${config.chip} rounded-md relative overflow-hidden ${
          isTransparent
            ? 'bg-white/10 backdrop-blur-sm border border-white/20'
            : 'bg-gradient-to-br from-amber-200 via-yellow-300 to-amber-400'
        }`}
      >
        {/* Chip contacts */}
        <div className="absolute inset-[15%] grid grid-cols-2 grid-rows-2 gap-[2px]">
          <div className={`rounded-sm ${isTransparent ? 'bg-white/30' : 'bg-amber-600/40'}`} />
          <div className={`rounded-sm ${isTransparent ? 'bg-white/20' : 'bg-amber-600/30'}`} />
          <div className={`rounded-sm ${isTransparent ? 'bg-white/20' : 'bg-amber-600/30'}`} />
          <div className={`rounded-sm ${isTransparent ? 'bg-white/30' : 'bg-amber-600/40'}`} />
        </div>
        {/* Chip highlight */}
        <div className={`absolute inset-0 bg-gradient-to-br ${
          isTransparent ? 'from-white/20 to-transparent' : 'from-white/50 to-transparent'
        }`} />
      </div>
    )
  }

  // Render contactless icon
  const renderContactless = () => (
    <svg
      className={`${config.contactless} text-white/60`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M8.5 14.5c1.5-1.5 4-1.5 5.5 0" strokeLinecap="round" />
      <path d="M6.5 12.5c2.5-2.5 6.5-2.5 9 0" strokeLinecap="round" />
      <path d="M4.5 10.5c3.5-3.5 9.5-3.5 13 0" strokeLinecap="round" />
    </svg>
  )

  // Get status badge
  const getStatusBadge = () => {
    if (!status || status === 'active') return null

    const statusStyles = {
      frozen: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
      used: 'bg-slate-500/20 text-slate-400 border-slate-400/30',
      expired: 'bg-red-500/20 text-red-300 border-red-400/30',
      pending: 'bg-amber-500/20 text-amber-300 border-amber-400/30'
    }

    return (
      <span className={`${statusStyles[status]} ${config.badge} rounded font-semibold border backdrop-blur-sm`}>
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

  // Format card number for display
  const formatCardNumber = (num?: string) => {
    if (!num) return size === 'xs' ? `••${lastFour || '••••'}` : `•••• •••• •••• ${lastFour || '••••'}`
    return num.replace(/(.{4})/g, '$1 ').trim()
  }

  // Front of card
  const CardFront = () => (
    <div
      className={`${config.container} ${cardStyle.bg} rounded-xl relative overflow-hidden ${cardStyle.glow} backface-hidden`}
      style={{ aspectRatio: '1.586' }}
    >
      {/* Mesh pattern overlay */}
      {renderMeshPattern()}

      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20" />

      {/* Premium gold edge for premium cards */}
      {isPremium && type === 'virtual' && (
        <div className="absolute inset-0 rounded-xl border border-amber-500/30" />
      )}

      {/* Card content */}
      <div className={`relative z-10 h-full ${config.padding} flex flex-col justify-between`}>
        {/* Top row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {/* Chip */}
            {showDetails && renderChip()}
            {/* Contactless */}
            {showDetails && size !== 'xs' && renderContactless()}
          </div>

          <div className="flex flex-col items-end gap-1">
            {/* Card type label */}
            <span className={`text-white/70 ${config.brandText} uppercase tracking-[0.15em] font-medium`}>
              {type === 'instant' ? 'Instant Card' : isPremium ? 'Premium' : 'Virtual Card'}
            </span>
            {getStatusBadge()}
          </div>
        </div>

        {/* Card number */}
        {showDetails && (
          <div className="flex-1 flex items-center">
            <p className={`text-white/90 font-mono tracking-[0.15em] ${config.cardNumber}`}>
              {formatCardNumber()}
            </p>
          </div>
        )}

        {/* Bottom row */}
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-0.5">
            {showDetails && size !== 'xs' && (
              <>
                <span className={`text-white/40 ${config.label} uppercase tracking-wider`}>
                  {cardholderName ? 'Card Holder' : 'Valid Thru'}
                </span>
                <span className={`text-white/80 ${config.expiry} font-medium`}>
                  {cardholderName || expiry || '••/••'}
                </span>
              </>
            )}
            {displayValue && (
              <span className={`text-white font-bold ${config.value} mt-1`}>
                {displayValue}
              </span>
            )}
          </div>

          {/* Brand logo */}
          <div className="flex items-center">
            {brand === 'mastercard' ? (
              <div className="flex items-center -space-x-1.5">
                <div className={`${config.mcCircle} rounded-full bg-[#eb001b] opacity-90`} />
                <div className={`${config.mcCircle} rounded-full bg-[#f79e1b] opacity-90`} />
              </div>
            ) : (
              <span className={`font-bold italic text-white/90 ${config.logoSize} tracking-wider`}>
                VISA
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Subtle inner border */}
      <div className="absolute inset-0 rounded-xl border border-white/10 pointer-events-none" />

      {/* Tap to flip indicator */}
      {flippable && size !== 'xs' && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/30 text-[8px] uppercase tracking-wider">
          Tap to reveal
        </div>
      )}
    </div>
  )

  // Back of card
  const CardBack = () => (
    <div
      className={`${config.container} ${cardStyle.bg} rounded-xl relative overflow-hidden ${cardStyle.glow}`}
      style={{ aspectRatio: '1.586' }}
    >
      {/* Mesh pattern overlay */}
      {renderMeshPattern()}

      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20" />

      {/* Magnetic stripe */}
      <div className="absolute top-[15%] left-0 right-0 h-[12%] bg-black/80" />

      {/* Card content */}
      <div className={`relative z-10 h-full ${config.padding} flex flex-col pt-[28%]`}>
        {/* CVV section */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-6 bg-white/90 rounded flex items-center justify-end pr-3 relative overflow-hidden">
            {(isLoading || !cvv) ? (
              <div className="absolute inset-0 bg-gradient-to-r from-slate-300 via-slate-400 to-slate-300 animate-pulse" />
            ) : (
              <span className={`font-mono text-slate-800 ${config.cardNumber} tracking-wider`}>
                {cvv}
              </span>
            )}
          </div>
          <span className={`text-white/60 ${config.label} uppercase`}>CVV</span>
        </div>

        {/* Card number (full) */}
        <div className="mt-2">
          <span className={`text-white/40 ${config.label} uppercase tracking-wider block mb-0.5`}>
            Card Number
          </span>
          <div className="relative">
            {(isLoading || !cardNumber) ? (
              <div className="h-4 bg-gradient-to-r from-slate-600 via-slate-500 to-slate-600 rounded animate-pulse" />
            ) : (
              <p className={`text-white/90 font-mono tracking-[0.12em] ${config.cardNumber}`}>
                {formatCardNumber(cardNumber)}
              </p>
            )}
          </div>
        </div>

        {/* Expiry */}
        <div className="flex items-end justify-between mt-auto">
          <div>
            <span className={`text-white/40 ${config.label} uppercase tracking-wider block`}>
              Expires
            </span>
            {(isLoading || !expiry) ? (
              <div className="h-4 w-12 bg-gradient-to-r from-slate-600 via-slate-500 to-slate-600 rounded animate-pulse mt-0.5" />
            ) : (
              <span className={`text-white/80 ${config.expiry} font-medium`}>
                {expiry}
              </span>
            )}
          </div>

          {/* Brand logo */}
          <div className="flex items-center">
            {brand === 'mastercard' ? (
              <div className="flex items-center -space-x-1.5">
                <div className={`${config.mcCircle} rounded-full bg-[#eb001b] opacity-90`} />
                <div className={`${config.mcCircle} rounded-full bg-[#f79e1b] opacity-90`} />
              </div>
            ) : (
              <span className={`font-bold italic text-white/90 ${config.logoSize} tracking-wider`}>
                VISA
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Subtle inner border */}
      <div className="absolute inset-0 rounded-xl border border-white/10 pointer-events-none" />
    </div>
  )

  if (flippable) {
    return (
      <div
        className={className}
        onClick={handleFlip}
        style={{ perspective: '1000px', cursor: 'pointer' }}
      >
        <div
          className="relative"
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 0.5s',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          <div style={{ backfaceVisibility: 'hidden' }}>
            <CardFront />
          </div>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            <CardBack />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <CardFront />
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
}: Omit<CardVisualProps, 'size' | 'showDetails' | 'expiry' | 'cardholderName' | 'flippable'>) {
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

// Flippable version for library with full details
export function CardVisualFlippable({
  brand,
  type,
  isPremium = false,
  denomination,
  balance,
  lastFour,
  expiry,
  cardNumber,
  cvv,
  cardholderName,
  status,
  size = 'lg',
  className = '',
  isFlipped,
  isLoading,
  onFlip
}: Omit<CardVisualProps, 'showDetails' | 'flippable'>) {
  return (
    <CardVisual
      brand={brand}
      type={type}
      isPremium={isPremium}
      denomination={denomination}
      balance={balance}
      lastFour={lastFour}
      expiry={expiry}
      cardNumber={cardNumber}
      cvv={cvv}
      cardholderName={cardholderName}
      status={status}
      size={size}
      showDetails={true}
      flippable={true}
      isFlipped={isFlipped}
      isLoading={isLoading}
      className={className}
      onFlip={onFlip}
    />
  )
}
