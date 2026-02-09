'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { formatCurrency } from '@/lib/formatNumber'
import { financeApi } from '@/lib/api/finance'
import PayoutRequestModal from '@/components/admin/PayoutRequestModal'

export default function FinancePage() {
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false)
  // Fetch finance overview with React Query
  const { data: overview = null } = useQuery({
    queryKey: ['finance-overview'],
    queryFn: async () => {
      const result = await financeApi.getOverview()
      if (result.success && result.data) {
        return result.data
      }
      return null
    },
  })

  // Fetch transactions with React Query
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['finance-transactions'],
    queryFn: async () => {
      const result = await financeApi.getTransactions({ limit: 10 })
      if (result.success && result.data) {
        return result.data
      }
      return []
    },
  })
  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1">Finance</h1>
        <p className="text-slate-500 text-xs sm:text-sm">Financial overview and transactions</p>
      </div>

      {/* Primary Stats - Dashboard Style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Available Balance</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Icon name="wallet" size={16} />
            </div>
          </div>
          <p className="text-white text-lg lg:text-2xl font-bold mb-1">
            {formatCurrency(overview?.availableBalance || 0)}
          </p>
          <p className="text-xs">
            <button
              onClick={() => setIsPayoutModalOpen(true)}
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Request Payout →
            </button>
          </p>
        </div>

        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Pending</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
              <Icon name="clock" size={16} />
            </div>
          </div>
          <p className="text-white text-lg lg:text-2xl font-bold mb-1">
            {formatCurrency(overview?.pendingBalance || 0)}
          </p>
          <p className="text-xs">
            <span className="text-slate-500">pending balance</span>
          </p>
        </div>

        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Total Fees</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
              <Icon name="chart" size={16} />
            </div>
          </div>
          <p className="text-white text-lg lg:text-2xl font-bold mb-1">
            {formatCurrency(overview?.totalFees || 0)}
          </p>
          <p className="text-xs">
            <span className="text-slate-500">all time</span>
          </p>
        </div>

        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Refunds</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Icon name="alert" size={16} />
            </div>
          </div>
          <p className="text-white text-lg lg:text-2xl font-bold mb-1">
            {formatCurrency(overview?.totalRefunds || 0)}
          </p>
          <p className="text-xs">
            <span className="text-slate-500">total refunded</span>
          </p>
        </div>
      </div>

      {/* Revenue Stats - Dashboard Style */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 mb-6">
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Total Revenue</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Icon name="wallet" size={16} />
            </div>
          </div>
          <p className="text-white text-lg lg:text-2xl font-bold mb-1">
            {formatCurrency(overview?.totalRevenue || 0)}
          </p>
          <p className="text-xs">
            <span className="text-slate-500">gross revenue</span>
          </p>
        </div>

        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Total Sales</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Icon name="shopping-cart" size={16} />
            </div>
          </div>
          <p className="text-white text-lg lg:text-2xl font-bold mb-1">
            {formatCurrency(overview?.totalSales || 0)}
          </p>
          <p className="text-xs">
            <span className="text-slate-500">completed sales</span>
          </p>
        </div>

        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Net Revenue</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center">
              <Icon name="check" size={16} />
            </div>
          </div>
          <p className="text-white text-lg lg:text-2xl font-bold mb-1">
            {formatCurrency((overview?.totalRevenue || 0) - (overview?.totalFees || 0))}
          </p>
          <p className="text-xs">
            <span className="text-slate-500">after fees</span>
          </p>
        </div>
      </div>

      <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#1f1f1f]">
          <h3 className="text-white font-semibold">Recent Transactions</h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-slate-400">Loading transactions...</p>
            </div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <Icon name="wallet" size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No transactions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1f1f1f]">
                  <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Type</th>
                  <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Order ID</th>
                  <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Amount</th>
                  <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Currency</th>
                  <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Date</th>
                  <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-[#1f1f1f] last:border-0 hover:bg-white/5">
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                        transaction.type === 'PAYMENT' ? 'bg-primary/10 text-primary' :
                        transaction.type === 'REFUND' ? 'bg-red-500/10 text-red-400' :
                        'bg-blue-500/10 text-blue-400'
                      }`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-white text-sm font-mono">{transaction.orderId}</td>
                    <td className="px-5 py-3 text-white font-medium">
                      ${transaction.amount.toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-sm uppercase">
                      {transaction.currency}
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-sm">
                      {new Date(transaction.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        transaction.status === 'COMPLETED' ? 'bg-primary/10 text-primary' :
                        transaction.status === 'PENDING' ? 'bg-orange-500/10 text-orange-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {transaction.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout Modal */}
      <PayoutRequestModal
        isOpen={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
        availableBalance={overview?.availableBalance || 0}
      />
    </AdminLayout>
  )
}
