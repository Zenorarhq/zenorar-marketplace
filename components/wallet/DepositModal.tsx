'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import Icon from '@/components/ui/Icon'
import {
  initiateCardDeposit,
  initiatePaystackDeposit,
  initiatePayPalDeposit,
  initiateCryptoDeposit,
  initiateBankTransfer,
  submitCryptoTxHash,
  uploadBankProof,
} from '@/lib/api/deposits'
import { useQueryClient } from '@tanstack/react-query'

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

type PaymentMethod = 'card' | 'paystack' | 'paypal' | 'crypto' | 'bank'
type CryptoType = 'CRYPTO_BTC' | 'CRYPTO_ETH' | 'CRYPTO_USDT'

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
}

// ---- Stripe card payment form ----
function StripeCardForm({ amount, depositId, onSuccess, onError }: {
  amount: number
  depositId: string
  onSuccess: () => void
  onError: (msg: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/profile/wallet?deposit=success&depositId=${depositId}`,
      },
    })

    if (error) {
      onError(error.message || 'Payment failed')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full py-3 bg-primary text-black font-bold rounded-xl hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Icon name="loading" size={20} className="animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Icon name="credit-card" size={20} />
            Pay ${amount.toFixed(2)}
          </>
        )}
      </button>
    </form>
  )
}

// ---- Main modal ----
export default function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const queryClient = useQueryClient()
  const [method, setMethod] = useState<PaymentMethod>('card')
  const [amount, setAmount] = useState<number>(50)
  const [customAmount, setCustomAmount] = useState('')
  const [step, setStep] = useState<'amount' | 'payment' | 'success'>('amount')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Card (Stripe)
  const [clientSecret, setClientSecret] = useState('')
  const [stripeDepositId, setStripeDepositId] = useState('')

  // Paystack
  const [paystackUrl, setPaystackUrl] = useState('')

  // PayPal
  const [paypalUrl, setPaypalUrl] = useState('')

  // Crypto
  const [cryptoType, setCryptoType] = useState<CryptoType>('CRYPTO_BTC')
  const [cryptoDepositId, setCryptoDepositId] = useState('')
  const [cryptoAddress, setCryptoAddress] = useState('')
  const [cryptoNetwork, setCryptoNetwork] = useState('')
  const [txHash, setTxHash] = useState('')
  const [txHashSubmitted, setTxHashSubmitted] = useState(false)

  // Bank Transfer
  const [bankDepositId, setBankDepositId] = useState('')
  const [bankDetails, setBankDetails] = useState<any>(null)
  const [proofUrl, setProofUrl] = useState('')
  const [proofSubmitted, setProofSubmitted] = useState(false)

  const presets = [10, 25, 50, 100, 500]

  useEffect(() => {
    if (!isOpen) {
      // Reset state on close
      setStep('amount')
      setMethod('card')
      setAmount(50)
      setCustomAmount('')
      setError('')
      setClientSecret('')
      setStripeDepositId('')
      setPaystackUrl('')
      setPaypalUrl('')
      setCryptoAddress('')
      setCryptoDepositId('')
      setTxHash('')
      setTxHashSubmitted(false)
      setBankDetails(null)
      setBankDepositId('')
      setProofUrl('')
      setProofSubmitted(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const finalAmount = customAmount ? parseFloat(customAmount) : amount
  const isValidAmount = finalAmount >= 5 && finalAmount <= 10000

  const handleProceed = async () => {
    if (!isValidAmount) {
      setError('Amount must be between $5 and $10,000')
      return
    }
    setError('')
    setLoading(true)

    try {
      if (method === 'card') {
        const result = await initiateCardDeposit(finalAmount)
        if (!result.success || !result.data) throw new Error(result.error || 'Failed to initiate deposit')
        setClientSecret(result.data.clientSecret)
        setStripeDepositId(result.data.depositId)
        setStep('payment')
      } else if (method === 'paystack') {
        const result = await initiatePaystackDeposit(finalAmount)
        if (!result.success || !result.data) throw new Error(result.error || 'Failed to initiate Paystack deposit')
        // Redirect to Paystack hosted page
        window.location.href = result.data.authorizationUrl
      } else if (method === 'paypal') {
        const result = await initiatePayPalDeposit(finalAmount)
        if (!result.success || !result.data) throw new Error(result.error || 'Failed to initiate PayPal deposit')
        window.location.href = result.data.approvalUrl
      } else if (method === 'crypto') {
        const result = await initiateCryptoDeposit(finalAmount, cryptoType)
        if (!result.success || !result.data) throw new Error(result.error || 'Failed to get crypto address')
        setCryptoAddress(result.data.address)
        setCryptoNetwork(result.data.network)
        setCryptoDepositId(result.data.depositId)
        setStep('payment')
      } else if (method === 'bank') {
        const result = await initiateBankTransfer(finalAmount)
        if (!result.success || !result.data) throw new Error(result.error || 'Failed to initiate bank transfer')
        setBankDetails(result.data.bankDetails)
        setBankDepositId(result.data.depositId)
        setStep('payment')
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleCryptoSubmitHash = async () => {
    if (!txHash.trim()) return
    setLoading(true)
    try {
      const result = await submitCryptoTxHash(cryptoDepositId, txHash)
      if (!result.success) throw new Error(result.error || 'Failed to submit transaction hash')
      setTxHashSubmitted(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBankProofSubmit = async () => {
    if (!proofUrl.trim()) return
    setLoading(true)
    try {
      const result = await uploadBankProof(bankDepositId, proofUrl)
      if (!result.success) throw new Error(result.error || 'Failed to submit proof')
      setProofSubmitted(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStripeSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['wallet'] })
    setStep('success')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const methodTabs: { id: PaymentMethod; label: string; icon: string }[] = [
    { id: 'card', label: 'Card', icon: 'credit-card' },
    { id: 'paystack', label: 'Paystack', icon: 'phone-payment' },
    { id: 'paypal', label: 'PayPal', icon: 'paypal' },
    { id: 'crypto', label: 'Crypto', icon: 'bitcoin' },
    { id: 'bank', label: 'Bank', icon: 'bank' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[#0a0a0a] border border-border-dark rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-dark">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Icon name="wallet" size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Add Money</h2>
              <p className="text-slate-500 text-sm">Deposit funds to your wallet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-dark flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="p-6">
          {/* Success state */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                <Icon name="check-circle" size={40} className="text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Deposit Successful!</h3>
              <p className="text-slate-400 mb-6">Your wallet has been credited with ${finalAmount.toFixed(2)}</p>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-primary text-black font-bold rounded-xl hover:brightness-105 transition-all"
              >
                Done
              </button>
            </div>
          )}

          {/* Amount selection step */}
          {step === 'amount' && (
            <div className="space-y-6">
              {/* Preset amounts */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-3">Select amount</label>
                <div className="grid grid-cols-5 gap-2">
                  {presets.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => { setAmount(preset); setCustomAmount('') }}
                      className={`py-2 rounded-lg text-sm font-bold transition-all ${
                        amount === preset && !customAmount
                          ? 'bg-primary text-black'
                          : 'bg-surface-dark text-slate-400 hover:bg-border-dark'
                      }`}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom amount */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Custom amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    min="5"
                    max="10000"
                    step="0.01"
                    placeholder="0.00"
                    value={customAmount}
                    onChange={(e) => { setCustomAmount(e.target.value); setAmount(0) }}
                    className="w-full bg-surface-dark border border-border-dark rounded-xl pl-8 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <p className="text-slate-600 text-xs mt-1">Min: $5 | Max: $10,000</p>
              </div>

              {/* Payment method tabs */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-3">Payment method</label>
                <div className="grid grid-cols-5 gap-2">
                  {methodTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setMethod(tab.id)}
                      className={`py-3 rounded-xl flex flex-col items-center gap-1 text-xs font-medium transition-all ${
                        method === tab.id
                          ? 'bg-primary/20 text-primary border border-primary/50'
                          : 'bg-surface-dark text-slate-400 hover:bg-border-dark border border-transparent'
                      }`}
                    >
                      <Icon name={tab.icon as any} size={20} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Crypto type selector */}
              {method === 'crypto' && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Select cryptocurrency</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['CRYPTO_BTC', 'CRYPTO_ETH', 'CRYPTO_USDT'] as CryptoType[]).map((ct) => (
                      <button
                        key={ct}
                        onClick={() => setCryptoType(ct)}
                        className={`py-2 rounded-lg text-sm font-bold transition-all ${
                          cryptoType === ct
                            ? 'bg-primary text-black'
                            : 'bg-surface-dark text-slate-400 hover:bg-border-dark'
                        }`}
                      >
                        {ct.replace('CRYPTO_', '')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <p className="text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                  {error}
                </p>
              )}

              <button
                onClick={handleProceed}
                disabled={!isValidAmount || loading}
                className="w-full py-4 bg-primary text-black font-bold rounded-xl hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
              >
                {loading ? (
                  <>
                    <Icon name="loading" size={20} className="animate-spin" />
                    Please wait...
                  </>
                ) : (
                  <>
                    Continue — ${(finalAmount || 0).toFixed(2)}
                    <Icon name="arrow-right" size={20} />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Payment step */}
          {step === 'payment' && (
            <div className="space-y-6">
              <button
                onClick={() => setStep('amount')}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
              >
                <Icon name="arrow-left" size={16} />
                Back
              </button>

              {/* Stripe card payment */}
              {method === 'card' && clientSecret && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Icon name="credit-card" size={20} className="text-primary" />
                    <h3 className="font-bold text-white">Card Payment — ${finalAmount.toFixed(2)}</h3>
                  </div>
                  {stripePromise ? (
                    <Elements
                      stripe={stripePromise}
                      options={{
                        clientSecret,
                        appearance: {
                          theme: 'night',
                          variables: {
                            colorPrimary: '#a3ff40',
                            colorBackground: '#0a0a0a',
                            colorText: '#ffffff',
                          },
                        },
                      }}
                    >
                      <StripeCardForm
                        amount={finalAmount}
                        depositId={stripeDepositId}
                        onSuccess={handleStripeSuccess}
                        onError={(msg) => setError(msg)}
                      />
                    </Elements>
                  ) : (
                    <p className="text-slate-400 text-sm">Card payments are not configured. Please use another method.</p>
                  )}
                </div>
              )}

              {/* Crypto payment */}
              {method === 'crypto' && cryptoAddress && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Icon name="bitcoin" size={20} className="text-primary" />
                    <h3 className="font-bold text-white">{cryptoType.replace('CRYPTO_', '')} Deposit — ${finalAmount.toFixed(2)}</h3>
                  </div>

                  <div className="bg-surface-dark border border-border-dark rounded-xl p-4 space-y-4">
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Network</p>
                      <p className="text-white font-medium">{cryptoNetwork}</p>
                    </div>

                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Send to this address</p>
                      <div className="flex items-center gap-2">
                        <code className="text-primary text-sm flex-1 break-all">{cryptoAddress}</code>
                        <button
                          onClick={() => copyToClipboard(cryptoAddress)}
                          className="flex-shrink-0 p-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                        >
                          <Icon name="copy" size={16} className="text-primary" />
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-border-dark pt-4">
                      <p className="text-slate-400 text-sm mb-3">
                        After sending, paste your transaction hash below for faster verification:
                      </p>
                      {!txHashSubmitted ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Transaction hash (optional)"
                            value={txHash}
                            onChange={(e) => setTxHash(e.target.value)}
                            className="flex-1 bg-black border border-border-dark rounded-xl px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-primary"
                          />
                          <button
                            onClick={handleCryptoSubmitHash}
                            disabled={!txHash.trim() || loading}
                            className="px-4 py-2.5 bg-primary text-black font-bold rounded-xl hover:brightness-105 transition-all disabled:opacity-50 text-sm"
                          >
                            Submit
                          </button>
                        </div>
                      ) : (
                        <p className="text-green-500 text-sm flex items-center gap-2">
                          <Icon name="check-circle" size={16} />
                          Transaction hash submitted. Admin will verify and credit your wallet.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Bank transfer */}
              {method === 'bank' && bankDetails && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Icon name="bank" size={20} className="text-primary" />
                    <h3 className="font-bold text-white">Bank Transfer — ${finalAmount.toFixed(2)}</h3>
                  </div>

                  <div className="bg-surface-dark border border-border-dark rounded-xl p-4 space-y-3">
                    {[
                      { label: 'Account Name', value: bankDetails.accountName },
                      { label: 'Account Number', value: bankDetails.accountNumber },
                      { label: 'Routing / Sort Code', value: bankDetails.routingNumber },
                      { label: 'Bank', value: bankDetails.bankName },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">{label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium text-sm">{value}</span>
                          <button
                            onClick={() => copyToClipboard(value)}
                            className="p-1 hover:text-primary transition-colors"
                          >
                            <Icon name="copy" size={14} className="text-slate-500" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="border-t border-border-dark pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">Reference (required)</span>
                        <div className="flex items-center gap-2">
                          <span className="text-primary font-bold text-sm">{bankDetails.reference}</span>
                          <button onClick={() => copyToClipboard(bankDetails.reference)}>
                            <Icon name="copy" size={14} className="text-slate-500" />
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-500 text-xs mt-2">Include this reference in your transfer description.</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-slate-400 text-sm mb-3">
                      After payment, provide a link to your proof (screenshot URL):
                    </p>
                    {!proofSubmitted ? (
                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="https://..."
                          value={proofUrl}
                          onChange={(e) => setProofUrl(e.target.value)}
                          className="flex-1 bg-black border border-border-dark rounded-xl px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-primary"
                        />
                        <button
                          onClick={handleBankProofSubmit}
                          disabled={!proofUrl.trim() || loading}
                          className="px-4 py-2.5 bg-primary text-black font-bold rounded-xl hover:brightness-105 transition-all disabled:opacity-50 text-sm"
                        >
                          Submit
                        </button>
                      </div>
                    ) : (
                      <p className="text-green-500 text-sm flex items-center gap-2">
                        <Icon name="check-circle" size={16} />
                        Proof submitted. Admin will verify and credit your wallet.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <p className="text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
