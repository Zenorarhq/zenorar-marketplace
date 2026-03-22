'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Icon from '@/components/ui/Icon'
import { libraryApi, GiftCardDetails } from '@/lib/api/library'

interface GiftCardDetailModalProps {
  giftCardId: string
  isOpen: boolean
  onClose: () => void
}

export default function GiftCardDetailModal({
  giftCardId,
  isOpen,
  onClose,
}: GiftCardDetailModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [giftCard, setGiftCard] = useState<GiftCardDetails | null>(null)
  const [copiedField, setCopiedField] = useState<'code' | 'pin' | null>(null)
  const [codeRevealed, setCodeRevealed] = useState(false)
  const [markingRedeemed, setMarkingRedeemed] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && giftCardId) {
      setLoading(true)
      setError(null)
      setCodeRevealed(false)

      libraryApi.getGiftCard(giftCardId)
        .then((res) => {
          if (res.success && res.data) {
            setGiftCard(res.data)
          } else {
            setError(res.error || 'Failed to load gift card')
          }
        })
        .catch((err) => {
          setError(err.message || 'Failed to load gift card')
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [isOpen, giftCardId])

  const copyToClipboard = async (text: string, field: 'code' | 'pin') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const maskCode = (code: string) => {
    if (code.length <= 4) return '••••'
    return code.slice(0, 2) + '•'.repeat(code.length - 4) + code.slice(-2)
  }

  const handleMarkRedeemed = async () => {
    if (!giftCard) return
    setMarkingRedeemed(true)
    setRedeemError(null)
    const res = await libraryApi.updateGiftCardStatus(giftCard.id, 'redeemed')
    if (res.success) {
      setGiftCard({ ...giftCard, status: 'redeemed', redeemedAt: new Date().toISOString() })
    } else {
      setRedeemError(res.error || 'Failed to mark as redeemed')
    }
    setMarkingRedeemed(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-dark rounded-2xl max-w-md w-full border border-border-dark max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-dark">
          <h3 className="text-xl font-bold text-white">Gift Card Details</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
              <p className="text-slate-400 text-sm">Loading gift card...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Icon name="alert-circle" size={48} className="text-red-500 mb-4" />
              <p className="text-slate-400 text-sm">{error}</p>
            </div>
          ) : giftCard ? (
            <div className="space-y-5">
              {/* Card Preview */}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-[#1a1a1a] border border-border-dark flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {giftCard.imageUrl ? (
                    <Image
                      src={giftCard.imageUrl}
                      alt={giftCard.brand}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <Icon name="gift" size={28} className="text-primary" />
                  )}
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg">{giftCard.brand}</h4>
                  <p className="text-primary font-bold text-xl">${giftCard.denomination}</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {giftCard.status === 'delivered' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-900/30 text-green-500 border border-green-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Ready to Use
                  </span>
                )}
                {giftCard.status === 'redeemed' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-900/30 text-blue-400 border border-blue-500/20">
                    <Icon name="check" size={12} />
                    Redeemed
                  </span>
                )}
                {giftCard.status === 'expired' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-900/30 text-red-500 border border-red-500/20">
                    <Icon name="alert" size={12} />
                    Expired
                  </span>
                )}
              </div>

              {/* Code Section */}
              <div className="bg-black border border-border-dark rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Gift Card Code
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCodeRevealed(!codeRevealed)}
                      className="text-xs text-primary hover:text-green-400 transition-colors"
                    >
                      {codeRevealed ? 'Hide' : 'Reveal'}
                    </button>
                    <button
                      onClick={() => copyToClipboard(giftCard.code, 'code')}
                      className="p-1.5 rounded-lg bg-surface-dark border border-border-dark text-slate-400 hover:text-white hover:bg-[#262626] transition-colors"
                      title="Copy code"
                    >
                      <Icon name={copiedField === 'code' ? 'check' : 'copy'} size={14} />
                    </button>
                  </div>
                </div>
                <code className="block font-mono text-base text-white tracking-wide select-all break-all leading-relaxed">
                  {codeRevealed ? giftCard.code : maskCode(giftCard.code)}
                </code>
              </div>

              {/* PIN Section (if exists) */}
              {giftCard.pin && (
                <div className="bg-black border border-border-dark rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      PIN
                    </label>
                    <button
                      onClick={() => copyToClipboard(giftCard.pin!, 'pin')}
                      className="p-1.5 rounded-lg bg-surface-dark border border-border-dark text-slate-400 hover:text-white hover:bg-[#262626] transition-colors"
                      title="Copy PIN"
                    >
                      <Icon name={copiedField === 'pin' ? 'check' : 'copy'} size={14} />
                    </button>
                  </div>
                  <code className="block font-mono text-base text-white tracking-wide select-all break-all leading-relaxed">
                    {codeRevealed ? giftCard.pin : '••••'}
                  </code>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {giftCard.deliveredAt && (
                  <div>
                    <p className="text-slate-500 text-xs mb-1">Purchased</p>
                    <p className="text-slate-300">
                      {new Date(giftCard.deliveredAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
                {giftCard.expiresAt && (
                  <div>
                    <p className="text-slate-500 text-xs mb-1">Expires</p>
                    <p className={giftCard.status === 'expired' ? 'text-red-400' : 'text-slate-300'}>
                      {new Date(giftCard.expiresAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-2">
                {giftCard.status === 'delivered' && (
                  <button
                    onClick={handleMarkRedeemed}
                    disabled={markingRedeemed}
                    className="w-full py-3 rounded-xl bg-primary text-black font-bold hover:bg-green-400 transition-colors disabled:opacity-50"
                  >
                    {markingRedeemed ? 'Marking...' : 'Mark as Redeemed'}
                  </button>
                )}
                {redeemError && (
                  <p className="text-red-400 text-xs text-center">{redeemError}</p>
                )}
                <button
                  onClick={() => {
                    const text = giftCard.pin
                      ? `${giftCard.brand} Gift Card\nCode: ${giftCard.code}\nPIN: ${giftCard.pin}\nValue: $${giftCard.denomination}`
                      : `${giftCard.brand} Gift Card\nCode: ${giftCard.code}\nValue: $${giftCard.denomination}`
                    copyToClipboard(text, 'code')
                  }}
                  className="w-full py-3 rounded-xl bg-surface-dark border border-border-dark text-slate-300 font-medium hover:text-white hover:bg-[#262626] transition-colors"
                >
                  <Icon name="copy" size={16} className="inline mr-2" />
                  Copy All Details
                </button>
              </div>

              {/* Help text */}
              <p className="text-slate-500 text-xs text-center">
                Visit the {giftCard.brand} website or app to redeem this gift card.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
