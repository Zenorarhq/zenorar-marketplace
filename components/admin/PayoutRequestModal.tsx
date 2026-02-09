'use client'

import { useState } from 'react'
import Icon from '@/components/ui/Icon'
import { formatCurrency } from '@/lib/formatNumber'

interface PayoutRequestModalProps {
  isOpen: boolean
  onClose: () => void
  availableBalance: number
}

export default function PayoutRequestModal({ isOpen, onClose, availableBalance }: PayoutRequestModalProps) {
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'paypal' | 'stripe'>('bank')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    // Simulate API call
    setTimeout(() => {
      alert('Payout request submitted successfully! This would normally integrate with Stripe Connect, PayPal, or bank transfers.')
      setLoading(false)
      handleClose()
    }, 1500)
  }

  function handleClose() {
    if (!loading) {
      setAmount('')
      setPaymentMethod('bank')
      onClose()
    }
  }

  function handleMaxAmount() {
    setAmount(availableBalance.toFixed(2))
  }

  const requestAmount = parseFloat(amount) || 0
  const isValidAmount = requestAmount > 0 && requestAmount <= availableBalance

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background-dark border border-border-dark rounded-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-dark">
          <h2 className="text-xl font-bold text-white">Request Payout</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <Icon name="x" size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Available Balance */}
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-4">
              <p className="text-xs text-slate-400 mb-1">Available Balance</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(availableBalance)}</p>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Payout Amount <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={availableBalance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-charcoal border border-border-dark rounded-lg pl-8 pr-20 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={handleMaxAmount}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 px-2 py-1 bg-primary/10 rounded"
                  disabled={loading}
                >
                  MAX
                </button>
              </div>
              {requestAmount > availableBalance && (
                <p className="text-xs text-red-400 mt-1">
                  Amount exceeds available balance
                </p>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Payment Method
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 bg-charcoal border border-border-dark rounded-lg p-3 cursor-pointer hover:border-primary/30 transition-colors">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bank"
                    checked={paymentMethod === 'bank'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'bank')}
                    className="text-primary focus:ring-primary"
                    disabled={loading}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Bank Transfer</p>
                    <p className="text-xs text-slate-500">3-5 business days</p>
                  </div>
                  <Icon name="wallet" size={20} className="text-slate-400" />
                </label>

                <label className="flex items-center gap-3 bg-charcoal border border-border-dark rounded-lg p-3 cursor-pointer hover:border-primary/30 transition-colors">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="paypal"
                    checked={paymentMethod === 'paypal'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'paypal')}
                    className="text-primary focus:ring-primary"
                    disabled={loading}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">PayPal</p>
                    <p className="text-xs text-slate-500">Instant transfer</p>
                  </div>
                  <Icon name="wallet" size={20} className="text-slate-400" />
                </label>

                <label className="flex items-center gap-3 bg-charcoal border border-border-dark rounded-lg p-3 cursor-pointer hover:border-primary/30 transition-colors">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="stripe"
                    checked={paymentMethod === 'stripe'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'stripe')}
                    className="text-primary focus:ring-primary"
                    disabled={loading}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Stripe Connect</p>
                    <p className="text-xs text-slate-500">1-2 business days</p>
                  </div>
                  <Icon name="wallet" size={20} className="text-slate-400" />
                </label>
              </div>
            </div>

            {/* Info */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Icon name="info" size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-blue-400 font-semibold mb-1">Payment Processing</p>
                  <p className="text-xs text-slate-400">
                    Payouts are processed securely through our payment partners. You'll receive a confirmation email once processed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border-dark">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !isValidAmount}
            className="bg-primary hover:bg-primary/90 text-black font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Icon name="spinner" size={16} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Icon name="dollar" size={16} />
                Request Payout
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
