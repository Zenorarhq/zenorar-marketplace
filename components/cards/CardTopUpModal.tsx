'use client'

import { useState, useEffect } from 'react'
import Icon from '@/components/ui/Icon'

interface CardTopUpModalProps {
  isOpen: boolean
  onClose: () => void
  cardId: string
  cardProvider: string
  currentBalance: number
  formatPrice: (price: number) => string
  walletBalance: number
  onSuccess: (newBalance: number) => void
}

interface PricingInfo {
  minTopUp: number
  maxTopUp: number
  topUpFeePercent: number
}

export default function CardTopUpModal({
  isOpen,
  onClose,
  cardId,
  cardProvider,
  currentBalance,
  formatPrice,
  walletBalance,
  onSuccess
}: CardTopUpModalProps) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pricing, setPricing] = useState<PricingInfo | null>(null)
  const [loadingPricing, setLoadingPricing] = useState(true)

  // Fetch pricing info
  useEffect(() => {
    if (!isOpen) return

    async function fetchPricing() {
      try {
        setLoadingPricing(true)
        const response = await fetch('/api/cards/providers')
        const data = await response.json()

        if (data.success) {
          const provider = data.data.virtual.find((p: any) => p.provider === cardProvider)
          if (provider) {
            setPricing({
              minTopUp: provider.minTopUp,
              maxTopUp: provider.maxTopUp,
              topUpFeePercent: provider.topUpFeePercent
            })
          }
        }
      } catch (err) {
        console.error('Error fetching pricing:', err)
      } finally {
        setLoadingPricing(false)
      }
    }

    fetchPricing()
  }, [isOpen, cardProvider])

  if (!isOpen) return null

  const amountNum = parseFloat(amount) || 0
  const fee = pricing ? amountNum * (pricing.topUpFeePercent / 100) : 0
  const totalCost = amountNum + fee
  const newBalance = currentBalance + amountNum

  const isValidAmount = pricing
    ? amountNum >= pricing.minTopUp && amountNum <= pricing.maxTopUp
    : amountNum > 0

  const canAfford = totalCost <= walletBalance

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidAmount || !canAfford || loading) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/cards/${cardId}/top-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountNum })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Top up failed')
      }

      onSuccess(data.data.newBalance)
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const quickAmounts = [10, 25, 50, 100, 250, 500]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#0f0f0f] rounded-2xl border border-[#1f1f1f] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
          <h2 className="text-lg font-semibold text-white">Top Up Card</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Current Balance */}
          <div className="bg-[#1a1a1a] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Current Balance</span>
              <span className="text-white font-medium">{formatPrice(currentBalance)}</span>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Amount to Add</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min={pricing?.minTopUp || 5}
                max={pricing?.maxTopUp || 10000}
                step="0.01"
                className="w-full pl-8 pr-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white text-lg focus:outline-none focus:border-primary"
              />
            </div>
            {pricing && (
              <p className="mt-1 text-xs text-slate-500">
                Min: {formatPrice(pricing.minTopUp)} | Max: {formatPrice(pricing.maxTopUp)}
              </p>
            )}
          </div>

          {/* Quick Amounts */}
          <div className="grid grid-cols-3 gap-2">
            {quickAmounts.map((quickAmount) => (
              <button
                key={quickAmount}
                type="button"
                onClick={() => setAmount(quickAmount.toString())}
                className={`py-2 rounded-lg font-medium transition-colors ${
                  parseFloat(amount) === quickAmount
                    ? 'bg-primary text-black'
                    : 'bg-[#1a1a1a] text-slate-400 hover:bg-[#252525] hover:text-white'
                }`}
              >
                ${quickAmount}
              </button>
            ))}
          </div>

          {/* Summary */}
          {amountNum > 0 && (
            <div className="bg-[#1a1a1a] rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Amount</span>
                <span className="text-white">{formatPrice(amountNum)}</span>
              </div>
              {fee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">
                    Fee ({pricing?.topUpFeePercent}%)
                  </span>
                  <span className="text-white">{formatPrice(fee)}</span>
                </div>
              )}
              <div className="border-t border-[#2a2a2a] pt-2 flex justify-between">
                <span className="text-slate-400">Total</span>
                <span className="text-white font-semibold">{formatPrice(totalCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">New Balance</span>
                <span className="text-green-400 font-medium">{formatPrice(newBalance)}</span>
              </div>
            </div>
          )}

          {/* Wallet Balance Warning */}
          {!canAfford && amountNum > 0 && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm">
                Insufficient wallet balance. You have {formatPrice(walletBalance)}.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isValidAmount || !canAfford || loading}
            className="w-full py-3 bg-primary text-black rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Icon name="loader" size={18} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Icon name="plus" size={18} />
                Add {amountNum > 0 ? formatPrice(amountNum) : 'Funds'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
