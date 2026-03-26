'use client'

import { useState } from 'react'
import { getBrandColors, getBitrefillImageUrl } from '@/lib/gift-cards/brand-images'

interface GiftCardVisualProps {
  brand: string
  category: string
  height?: string
  extraClass?: string
  children?: React.ReactNode
}

export default function GiftCardVisual({
  brand,
  category,
  height = 'h-40',
  extraClass,
  children,
}: GiftCardVisualProps) {
  const [from, to] = getBrandColors(brand, category)
  const initial = brand.replace(/[^a-zA-Z]/g, '')[0]?.toUpperCase() || '?'
  const [bitrefillError, setBitrefillError] = useState(false)
  const compact = height === 'h-24'

  const bitrefillUrl = !bitrefillError ? getBitrefillImageUrl(brand) : null

  return (
    <div
      className={`relative ${height} overflow-hidden ${extraClass || ''}`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {bitrefillUrl ? (
        <img
          src={bitrefillUrl}
          alt={brand}
          className="absolute inset-0 w-full h-full object-cover z-0"
          onError={() => setBitrefillError(true)}
        />
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/30 pointer-events-none z-10" />
          <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-10" />
          <div className="absolute pointer-events-none z-[1]" style={{ top: '-40%', right: '-25%', width: '65%', height: '130%', borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          <div className="absolute pointer-events-none z-[1]" style={{ bottom: '-40%', left: '-20%', width: '55%', height: '110%', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div className="absolute inset-0 flex items-center justify-center z-[2]">
            <span
              className="text-white/25 font-black select-none"
              style={{ fontSize: compact ? '3rem' : '5rem', lineHeight: 1 }}
            >
              {initial}
            </span>
          </div>
        </>
      )}
      <div className="relative z-20">{children}</div>
    </div>
  )
}
