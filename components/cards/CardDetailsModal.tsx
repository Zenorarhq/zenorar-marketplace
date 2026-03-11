'use client'

import { useState, useEffect } from 'react'
import Icon from '@/components/ui/Icon'
import { localApiFetch } from '@/lib/api/client'
import CardVisual from '@/components/cards/CardVisual'

interface CardTransaction {
  id: string
  type: string
  amount: number
  fee: number
  merchantName?: string
  status: string
  description?: string
  createdAt: string
}

interface CardDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  cardId: string
  formatPrice: (price: number) => string
}

export default function CardDetailsModal({
  isOpen,
  onClose,
  cardId,
  formatPrice
}: CardDetailsModalProps) {
  const [loading, setLoading] = useState(true)
  const [card, setCard] = useState<any>(null)
  const [transactions, setTransactions] = useState<CardTransaction[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !cardId) return

    async function fetchCardDetails() {
      try {
        setLoading(true)
        const data = await localApiFetch<any>(`/cards/${cardId}`)

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch card details')
        }

        setCard(data.data)
        setTransactions(data.data.transactions || [])
        setError(null)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchCardDetails()
  }, [isOpen, cardId])

  if (!isOpen) return null

  const isVirtual = card?.cardType === 'virtual'
  const brandName = card?.cardBrand === 'mastercard' ? 'Mastercard' : 'Visa'
  const displayName = card?.isPremium ? `Premium ${brandName}` : brandName

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'creation':
        return 'plus-circle'
      case 'top_up':
        return 'arrow-up'
      case 'spend':
        return 'shopping-bag'
      case 'refund':
        return 'arrow-down'
      default:
        return 'circle'
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'creation':
        return 'text-blue-400'
      case 'top_up':
        return 'text-green-400'
      case 'spend':
        return 'text-red-400'
      case 'refund':
        return 'text-green-400'
      default:
        return 'text-slate-400'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[#0f0f0f] rounded-2xl border border-[#1f1f1f] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
          <h2 className="text-lg font-semibold text-white">Card Details</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Icon name="loader" size={32} className="text-primary animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <Icon name="alert-circle" size={48} className="text-red-400 mx-auto mb-4" />
              <p className="text-red-400">{error}</p>
            </div>
          ) : card ? (
            <div className="space-y-6">
              {/* Card Visual */}
              <div className="flex justify-center">
                <CardVisual
                  brand={card.cardBrand === 'mastercard' ? 'mastercard' : 'visa'}
                  type={card.cardType === 'instant' ? 'instant' : 'virtual'}
                  isPremium={card.isPremium}
                  denomination={card.denomination}
                  balance={card.balance}
                  lastFour={card.cardLastFour}
                  expiry={card.cardExpiry}
                  status={card.status}
                  size="lg"
                  showDetails={true}
                />
              </div>

              {/* Card Details */}
              <div className="bg-[#1a1a1a] rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-medium">{displayName}</h3>
                  <div className={`px-3 py-1 rounded-full text-sm ${
                    card.status === 'active'
                      ? 'bg-green-500/20 text-green-400'
                      : card.status === 'frozen'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-slate-500/20 text-slate-400'
                  }`}>
                    {card.status.charAt(0).toUpperCase() + card.status.slice(1)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400">Type</p>
                    <p className="text-white capitalize">{card.cardType} Card</p>
                  </div>
                  <div>
                    <p className="text-slate-400">
                      {isVirtual ? 'Balance' : 'Value'}
                    </p>
                    <p className="text-white font-semibold">
                      {formatPrice(isVirtual ? card.balance : (card.denomination || 0))}
                    </p>
                  </div>
                </div>

                {card.isPremium && (
                  <div className="mt-4 flex items-center gap-2 text-amber-400">
                    <Icon name="shield" size={16} />
                    <span className="text-sm">3D Secure Enabled</span>
                  </div>
                )}
              </div>

              {/* Transactions */}
              <div>
                <h3 className="text-white font-medium mb-3">Transaction History</h3>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 bg-[#1a1a1a] rounded-xl">
                    <Icon name="receipt" size={32} className="text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">No transactions yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-[#252525] ${getTransactionColor(tx.type)}`}>
                            <Icon name={getTransactionIcon(tx.type)} size={16} />
                          </div>
                          <div>
                            <p className="text-white text-sm">
                              {tx.merchantName || tx.description || tx.type.replace('_', ' ')}
                            </p>
                            <p className="text-slate-400 text-xs">
                              {new Date(tx.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${
                            tx.type === 'top_up' || tx.type === 'refund'
                              ? 'text-green-400'
                              : 'text-white'
                          }`}>
                            {tx.type === 'top_up' || tx.type === 'refund' ? '+' : '-'}
                            {formatPrice(tx.amount)}
                          </p>
                          {tx.fee > 0 && (
                            <p className="text-slate-500 text-xs">
                              Fee: {formatPrice(tx.fee)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Info */}
              <div className="text-xs text-slate-500">
                <p>Created: {new Date(card.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
                {card.expiresAt && (
                  <p>Expires: {new Date(card.expiresAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
