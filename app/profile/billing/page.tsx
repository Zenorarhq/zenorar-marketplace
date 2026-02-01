'use client'

import { useState } from 'react'
import ProfileLayout from '@/components/profile/ProfileLayout'
import Icon from '@/components/ui/Icon'

const paymentMethods = [
  {
    id: '1',
    type: 'visa',
    last4: '4242',
    expires: '12/25',
    isDefault: true,
  },
  {
    id: '2',
    type: 'mastercard',
    last4: '8899',
    expires: '08/24',
    isDefault: false,
  },
]

const transactions = [
  {
    date: 'Oct 24, 2023',
    description: 'Premium Scripts Bundle',
    icon: 'inventory_2',
    amount: '$149.00',
    status: 'successful',
  },
  {
    date: 'Oct 12, 2023',
    description: 'Global eSIM Data Plan',
    icon: 'sim_card',
    amount: '$29.99',
    status: 'successful',
  },
  {
    date: 'Sep 28, 2023',
    description: 'API Monthly Access',
    icon: 'api',
    amount: '$59.00',
    status: 'successful',
  },
]

export default function BillingPage() {
  const [methods, setMethods] = useState(paymentMethods)
  const [showAddCard, setShowAddCard] = useState(false)

  const setAsDefault = (id: string) => {
    setMethods((prev) =>
      prev.map((m) => ({
        ...m,
        isDefault: m.id === id,
      }))
    )
  }

  const removeCard = (id: string) => {
    setMethods((prev) => prev.filter((m) => m.id !== id))
  }

  return (
    <ProfileLayout>
      {/* Header */}
      <div className="mb-10 pb-6 border-b border-border-dark">
        <h1 className="text-3xl font-bold text-white mb-2">Billing & Payments</h1>
        <p className="text-slate-400">
          Manage your payment methods, billing address, and view your transaction history.
        </p>
      </div>

      {/* Payment Methods */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Icon name="credit-card" size={20} className="text-primary" />
            Saved Payment Methods
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {methods.map((method) => (
            <div
              key={method.id}
              className="bg-black border border-border-dark rounded-2xl p-6 relative group hover:border-primary/50 transition-colors"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="bg-white/10 rounded px-2 py-1">
                  <span className="text-white font-bold text-sm uppercase">{method.type}</span>
                </div>
                {method.isDefault && (
                  <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded border border-primary/20">
                    DEFAULT
                  </span>
                )}
              </div>

              <div className="mb-4">
                <p className="text-slate-500 text-xs mb-1">Card Number</p>
                <p className="text-white font-mono text-lg tracking-widest">
                  .... .... .... {method.last4}
                </p>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-slate-500 text-xs mb-1">Expires</p>
                  <p className="text-white font-medium">{method.expires}</p>
                </div>
                {method.isDefault ? (
                  <button
                    onClick={() => removeCard(method.id)}
                    className="text-slate-500 hover:text-red-500 text-sm transition-colors flex items-center gap-1"
                  >
                    <Icon name="delete" size={18} /> Remove
                  </button>
                ) : (
                  <button
                    onClick={() => setAsDefault(method.id)}
                    className="text-slate-400 hover:text-primary text-sm transition-colors font-medium"
                  >
                    Set as Default
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add New Card */}
          <button
            onClick={() => setShowAddCard(true)}
            className="bg-black border border-dashed border-border-dark rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-black/40 transition-all group h-full min-h-[180px]"
          >
            <div className="w-12 h-12 rounded-full bg-surface-dark flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <Icon name="add" size={24} />
            </div>
            <span className="text-primary font-bold">Add New Payment Method</span>
          </button>
        </div>
      </div>

      {/* Billing Address */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Icon name="location" size={20} className="text-primary" />
            Billing Address
          </h3>
        </div>

        <div className="bg-black border border-border-dark rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-primary/30 transition-colors">
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
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Icon name="receipt" size={20} className="text-primary" />
            Transaction History
          </h3>
          <button className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
            View All <Icon name="arrow-right" size={16} />
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border-dark">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="text-xs uppercase bg-black text-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold">Date</th>
                <th className="px-6 py-4 font-bold">Description</th>
                <th className="px-6 py-4 font-bold">Amount</th>
                <th className="px-6 py-4 font-bold text-center">Status</th>
                <th className="px-6 py-4 font-bold text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark/50 bg-black/20">
              {transactions.map((transaction, index) => (
                <tr key={index} className="hover:bg-black/40 transition-colors">
                  <td className="px-6 py-4 text-white">{transaction.date}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded bg-surface-dark flex items-center justify-center text-slate-500">
                        <Icon name={transaction.icon === 'inventory_2' ? 'box' : transaction.icon === 'sim_card' ? 'sim-card' : 'api'} size={14} />
                      </span>
                      {transaction.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-white">{transaction.amount}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-primary bg-primary/10 px-2 py-1 rounded text-xs font-bold border border-primary/20">
                      Successful
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-slate-400 hover:text-white transition-colors">
                      <Icon name="download" size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Card Modal */}
      {showAddCard && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-dark rounded-2xl p-8 max-w-md w-full border border-border-dark">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Add Payment Method</h3>
              <button
                onClick={() => setShowAddCard(false)}
                className="text-slate-400 hover:text-white"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <form className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">
                  Card Number
                </label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  className="w-full bg-black border border-border-dark rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-300 mb-2 block">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    className="w-full bg-black border border-border-dark rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-300 mb-2 block">CVC</label>
                  <input
                    type="text"
                    placeholder="123"
                    className="w-full bg-black border border-border-dark rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className="w-full bg-black border border-border-dark rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddCard(false)}
                  className="flex-1 py-3 rounded-xl border border-border-dark text-slate-300 font-medium hover:bg-surface-dark hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary text-black font-bold py-3 rounded-xl hover:brightness-105 transition-all"
                >
                  Add Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProfileLayout>
  )
}
