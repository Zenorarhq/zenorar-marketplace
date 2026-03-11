'use client'

import { useState } from 'react'
import Icon from '@/components/ui/Icon'
import type { UserCard } from '@/lib/cards/types'

interface CardItemProps {
  card: {
    id: string
    provider: string
    cardType: string
    cardBrand: string
    cardLastFour?: string
    cardExpiry?: string
    balance: number
    denomination?: number
    status: string
    nickname?: string
    isPremium: boolean
    createdAt: string
    expiresAt?: string
  }
  formatPrice: (price: number) => string
  onReveal: (cardId: string) => void
  onTopUp?: (cardId: string) => void
  onFreeze?: (cardId: string) => void
  onUnfreeze?: (cardId: string) => void
  onViewDetails: (cardId: string) => void
}

export default function CardItem({
  card,
  formatPrice,
  onReveal,
  onTopUp,
  onFreeze,
  onUnfreeze,
  onViewDetails
}: CardItemProps) {
  const [isRevealed, setIsRevealed] = useState(false)
  const [revealedData, setRevealedData] = useState<{
    cardNumber: string
    cvv: string
    expiry: string
  } | null>(null)
  const [revealing, setRevealing] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const isVirtual = card.cardType === 'virtual'
  const isFrozen = card.status === 'frozen'
  const brandName = card.cardBrand === 'mastercard' ? 'Mastercard' : 'Visa'
  const displayName = card.isPremium ? `Premium ${brandName}` : brandName

  // Get card gradient based on type and premium status
  const getCardGradient = () => {
    if (card.isPremium) {
      return 'from-amber-900/60 via-yellow-800/40 to-amber-900/60'
    }
    if (card.cardType === 'instant') {
      return 'from-emerald-900/60 via-teal-800/40 to-emerald-900/60'
    }
    return 'from-blue-900/60 via-indigo-800/40 to-blue-900/60'
  }

  const handleReveal = async () => {
    if (isRevealed) {
      setIsRevealed(false)
      setRevealedData(null)
      return
    }

    setRevealing(true)
    try {
      const response = await fetch(`/api/cards/${card.id}/reveal`, {
        method: 'POST'
      })
      const data = await response.json()

      if (data.success) {
        setRevealedData(data.data)
        setIsRevealed(true)
      }
    } catch (error) {
      console.error('Error revealing card:', error)
    } finally {
      setRevealing(false)
    }
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] overflow-hidden hover:border-[#2f2f2f] transition-colors">
      {/* Card Visual */}
      <div className={`relative h-44 p-4 bg-gradient-to-br ${getCardGradient()}`}>
        {/* Frozen Overlay */}
        {isFrozen && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="text-center">
              <Icon name="lock" size={32} className="text-blue-400 mx-auto mb-2" />
              <span className="text-blue-400 font-medium">Card Frozen</span>
            </div>
          </div>
        )}

        <div className="flex flex-col h-full justify-between">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-white/80 text-sm font-medium">{displayName}</span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              isVirtual
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {isVirtual ? 'Virtual Card' : 'Instant Card'}
            </span>
          </div>

          {/* Card Number */}
          <div>
            {isRevealed && revealedData ? (
              <div
                className="text-white font-mono text-lg cursor-pointer flex items-center gap-2 group"
                onClick={() => copyToClipboard(revealedData.cardNumber, 'number')}
              >
                <span>{revealedData.cardNumber.replace(/(.{4})/g, '$1 ').trim()}</span>
                <Icon
                  name={copied === 'number' ? 'check' : 'copy'}
                  size={16}
                  className="text-white/60 group-hover:text-white"
                />
              </div>
            ) : (
              <p className="text-white font-mono text-lg">
                **** **** **** {card.cardLastFour || '****'}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs">Expires</p>
              <p className="text-white text-sm">
                {isRevealed && revealedData ? revealedData.expiry : (card.cardExpiry || '--/--')}
              </p>
            </div>
            {isRevealed && revealedData && (
              <div
                className="cursor-pointer group"
                onClick={() => copyToClipboard(revealedData.cvv, 'cvv')}
              >
                <p className="text-white/60 text-xs">CVV</p>
                <div className="flex items-center gap-1">
                  <p className="text-white text-sm">{revealedData.cvv}</p>
                  <Icon
                    name={copied === 'cvv' ? 'check' : 'copy'}
                    size={12}
                    className="text-white/60 group-hover:text-white"
                  />
                </div>
              </div>
            )}
            {card.isPremium && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                3D Secure
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Info */}
      <div className="p-4">
        {/* Balance/Value */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-slate-400">
            {isVirtual ? 'Balance' : 'Value'}
          </span>
          <span className="text-xl font-bold text-white">
            {formatPrice(isVirtual ? card.balance : (card.denomination || 0))}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleReveal}
            disabled={revealing || isFrozen}
            className="flex-1 py-2 px-3 bg-[#1a1a1a] text-white rounded-lg font-medium hover:bg-[#252525] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            {revealing ? (
              <Icon name="loader" size={16} className="animate-spin" />
            ) : (
              <Icon name={isRevealed ? 'eye-off' : 'eye'} size={16} />
            )}
            {isRevealed ? 'Hide' : 'Reveal'}
          </button>

          {isVirtual && onTopUp && (
            <button
              onClick={() => onTopUp(card.id)}
              disabled={isFrozen}
              className="flex-1 py-2 px-3 bg-primary text-black rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              <Icon name="plus" size={16} />
              Top Up
            </button>
          )}

          {isVirtual && (
            <>
              {isFrozen ? (
                <button
                  onClick={() => onUnfreeze?.(card.id)}
                  className="py-2 px-3 bg-blue-500/20 text-blue-400 rounded-lg font-medium hover:bg-blue-500/30 transition-colors flex items-center gap-2 text-sm"
                >
                  <Icon name="unlock" size={16} />
                </button>
              ) : (
                <button
                  onClick={() => onFreeze?.(card.id)}
                  className="py-2 px-3 bg-[#1a1a1a] text-slate-400 rounded-lg font-medium hover:bg-[#252525] hover:text-white transition-colors flex items-center gap-2 text-sm"
                >
                  <Icon name="lock" size={16} />
                </button>
              )}
            </>
          )}

          <button
            onClick={() => onViewDetails(card.id)}
            className="py-2 px-3 bg-[#1a1a1a] text-slate-400 rounded-lg font-medium hover:bg-[#252525] hover:text-white transition-colors flex items-center gap-2 text-sm"
          >
            <Icon name="more-horizontal" size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
