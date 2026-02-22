'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import ProfileLayout from '@/components/profile/ProfileLayout'
import Icon from '@/components/ui/Icon'
import { ordersApi, Order } from '@/lib/api/orders'
import { paymentMethodsApi, SavedPaymentMethod } from '@/lib/api/payment-methods'
import { loadStripe, Stripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

// Inner form component that uses Stripe hooks (must be inside <Elements>)
function AddCardForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setSaving(true)
    setError(null)

    try {
      const { error: stripeError, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
      })

      if (stripeError) {
        setError(stripeError.message || 'Failed to save card')
        setSaving(false)
        return
      }

      if (setupIntent?.payment_method) {
        const pmId = typeof setupIntent.payment_method === 'string'
          ? setupIntent.payment_method
          : setupIntent.payment_method.id
        await paymentMethodsApi.saveStripeCard(pmId)
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-black border border-border-dark rounded-xl p-4">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 py-3 rounded-xl border border-border-dark text-slate-300 font-medium hover:bg-surface-dark hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !stripe || !elements}
          className="flex-1 bg-primary text-black font-bold py-3 rounded-xl hover:brightness-105 transition-all disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Add Card'}
        </button>
      </div>
    </form>
  )
}

export default function BillingPage() {
  const [methods, setMethods] = useState<SavedPaymentMethod[]>([])
  const [loadingMethods, setLoadingMethods] = useState(true)
  const [showAddCard, setShowAddCard] = useState(false)
  const [transactions, setTransactions] = useState<Order[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(true)
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null)
  const [modalLoading, setModalLoading] = useState(false)

  // Load Stripe publishable key on mount
  useEffect(() => {
    paymentMethodsApi.getStripeConfig().then((result) => {
      if (result.success && result.data?.publishableKey) {
        setStripePromise(loadStripe(result.data.publishableKey))
      }
    }).catch(() => {})
  }, [])

  // Load saved payment methods
  const fetchMethods = useCallback(() => {
    setLoadingMethods(true)
    paymentMethodsApi.list().then((result) => {
      if (result.success && result.data) {
        const data = Array.isArray(result.data) ? result.data : []
        setMethods(data)
      }
    }).catch(() => {}).finally(() => setLoadingMethods(false))
  }, [])

  useEffect(() => {
    fetchMethods()
  }, [fetchMethods])

  // Load transactions
  useEffect(() => {
    ordersApi.getMyOrders({ limit: 5 }).then((result) => {
      if (result.success && result.data) {
        const orders = Array.isArray(result.data) ? result.data : (result.data as { orders?: Order[] }).orders || []
        setTransactions(orders)
      }
    }).catch(() => {}).finally(() => setLoadingTransactions(false))
  }, [])

  // Open modal: create a fresh SetupIntent
  const openAddCard = async () => {
    setShowAddCard(true)
    setModalLoading(true)
    setSetupClientSecret(null)
    try {
      const result = await paymentMethodsApi.createSetupIntent()
      if (result.success && result.data?.clientSecret) {
        setSetupClientSecret(result.data.clientSecret)
      }
    } catch {
      // Will show as unable to load
    } finally {
      setModalLoading(false)
    }
  }

  const handleCardAdded = () => {
    setShowAddCard(false)
    setSetupClientSecret(null)
    fetchMethods()
  }

  const setAsDefault = async (id: string) => {
    await paymentMethodsApi.setDefault(id)
    fetchMethods()
  }

  const removeCard = async (id: string) => {
    await paymentMethodsApi.remove(id)
    fetchMethods()
  }

  // Format expiry from month/year numbers to MM/YY
  const formatExpiry = (month: number | null, year: number | null) => {
    if (!month || !year) return '--/--'
    return `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`
  }

  return (
    <ProfileLayout>
      {/* Header */}
      <div className="mb-10 pb-6 border-b border-border-dark">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Billing & Payments</h1>
        <p className="text-slate-400">
          Manage your payment methods, billing address, and view your transaction history.
        </p>
      </div>

      {/* Payment Methods */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Icon name="credit-card" size={20} className="text-primary" />
            Saved Payment Methods
          </h3>
        </div>

        {loadingMethods ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-black border border-border-dark rounded-2xl p-4 sm:p-6 animate-pulse">
                <div className="h-6 w-16 bg-surface-dark rounded mb-6" />
                <div className="h-5 w-48 bg-surface-dark rounded mb-4" />
                <div className="h-4 w-20 bg-surface-dark rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {methods.map((method) => (
              <div
                key={method.id}
                className="bg-black border border-border-dark rounded-2xl p-4 sm:p-6 relative group hover:border-primary/50 transition-colors"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-white/10 rounded px-2 py-1">
                    <span className="text-white font-bold text-sm uppercase">
                      {method.brand || method.type}
                    </span>
                  </div>
                  {method.isDefault && (
                    <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded border border-primary/20">
                      DEFAULT
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <p className="text-slate-500 text-xs mb-1">Card Number</p>
                  <p className="text-white font-mono text-base sm:text-lg tracking-widest">
                    .... .... .... {method.last4 || '****'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3">
                  <div>
                    <p className="text-slate-500 text-xs mb-1">Expires</p>
                    <p className="text-white font-medium">
                      {formatExpiry(method.expiryMonth, method.expiryYear)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {!method.isDefault && (
                      <button
                        onClick={() => setAsDefault(method.id)}
                        className="text-slate-400 hover:text-primary text-sm transition-colors font-medium"
                      >
                        Set as Default
                      </button>
                    )}
                    <button
                      onClick={() => removeCard(method.id)}
                      className="text-slate-500 hover:text-red-500 text-sm transition-colors flex items-center gap-1"
                    >
                      <Icon name="delete" size={18} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add New Card */}
            <button
              onClick={openAddCard}
              className="bg-black border border-dashed border-border-dark rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-black/40 transition-all group h-full min-h-[180px]"
            >
              <div className="w-12 h-12 rounded-full bg-surface-dark flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Icon name="add" size={24} />
              </div>
              <span className="text-primary font-bold">Add New Payment Method</span>
            </button>
          </div>
        )}
      </div>

      {/* Billing Address */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Icon name="location" size={20} className="text-primary" />
            Billing Address
          </h3>
        </div>

        <div className="bg-black border border-border-dark rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 hover:border-primary/30 transition-colors">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-surface-dark flex items-center justify-center text-slate-400 flex-shrink-0">
              <Icon name="home" size={20} />
            </div>
            <div>
              <h4 className="text-white font-bold mb-1">Headquarters</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                123 Tech Boulevard, Suite 400
                <br />
                San Francisco, CA 94107, United States
              </p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-dark text-slate-300 hover:text-white hover:bg-surface-dark hover:border-slate-600 transition-colors text-sm font-medium whitespace-nowrap">
            <Icon name="edit" size={18} />
            Edit Address
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Icon name="receipt" size={20} className="text-primary" />
            Transaction History
          </h3>
          <Link href="/profile/orders" className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
            View All <Icon name="arrow-right" size={16} />
          </Link>
        </div>

        {loadingTransactions ? (
          <div className="rounded-2xl border border-border-dark bg-black/20 p-8">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-4 w-24 bg-surface-dark rounded" />
                  <div className="h-4 w-48 bg-surface-dark rounded" />
                  <div className="h-4 w-20 bg-surface-dark rounded ml-auto" />
                </div>
              ))}
            </div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-2xl border border-border-dark bg-black/20 p-12 text-center">
            <Icon name="receipt" size={40} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No transactions yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border-dark">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="text-xs uppercase bg-black text-slate-200">
                <tr>
                  <th className="px-3 py-3 sm:px-6 sm:py-4 font-bold">Date</th>
                  <th className="px-3 py-3 sm:px-6 sm:py-4 font-bold">Description</th>
                  <th className="px-3 py-3 sm:px-6 sm:py-4 font-bold">Amount</th>
                  <th className="px-6 py-4 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-dark bg-black/20">
                {transactions.map((order) => {
                  const itemName = order.items?.[0]?.name || 'Order'
                  const extraItems = (order.items?.length || 1) - 1
                  const description = extraItems > 0 ? `${itemName} +${extraItems} more` : itemName

                  const statusMap: Record<string, { label: string; color: string }> = {
                    PAID: { label: 'Successful', color: 'text-green-500 bg-green-900/30 border-green-500/20' },
                    PENDING: { label: 'Pending', color: 'text-yellow-500 bg-yellow-900/30 border-yellow-500/20' },
                    FAILED: { label: 'Failed', color: 'text-red-500 bg-red-900/30 border-red-500/20' },
                    REFUNDED: { label: 'Refunded', color: 'text-blue-500 bg-blue-900/30 border-blue-500/20' },
                  }
                  const status = statusMap[order.paymentStatus] || statusMap.PENDING

                  return (
                    <tr key={order.id} className="hover:bg-black/40 transition-colors">
                      <td className="px-3 py-3 sm:px-6 sm:py-4 text-white whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded bg-surface-dark flex items-center justify-center text-slate-500">
                            <Icon name="shopping-bag" size={14} />
                          </span>
                          <span className="truncate max-w-[200px]">{description}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4 font-mono text-white">${Number(order.total).toFixed(2)}</td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold border ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Card Modal */}
      {showAddCard && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-dark rounded-2xl p-5 sm:p-8 max-w-md w-full border border-border-dark">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Add Payment Method</h3>
              <button
                onClick={() => { setShowAddCard(false); setSetupClientSecret(null) }}
                className="text-slate-400 hover:text-white"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            {modalLoading ? (
              <div className="py-12 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-slate-400 text-sm">Setting up secure payment form...</p>
              </div>
            ) : setupClientSecret && stripePromise ? (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: setupClientSecret,
                  appearance: {
                    theme: 'night',
                    variables: {
                      colorPrimary: '#22c55e',
                      colorBackground: '#000000',
                      colorText: '#ffffff',
                      colorDanger: '#ef4444',
                      borderRadius: '12px',
                      fontFamily: 'inherit',
                    },
                  },
                }}
              >
                <AddCardForm
                  onSuccess={handleCardAdded}
                  onCancel={() => { setShowAddCard(false); setSetupClientSecret(null) }}
                />
              </Elements>
            ) : (
              <div className="py-12 text-center">
                <Icon name="warning" size={40} className="text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Unable to load payment form. Please check that Stripe is configured in admin settings.</p>
                <button
                  onClick={() => { setShowAddCard(false); setSetupClientSecret(null) }}
                  className="mt-4 px-4 py-2 rounded-lg border border-border-dark text-slate-300 hover:text-white transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </ProfileLayout>
  )
}
