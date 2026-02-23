'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { formatCurrency } from '@/lib/formatNumber'
import { financeApi, AdminExpense } from '@/lib/api/finance'
import { useTimezone } from '@/hooks/use-timezone'
import { formatDate } from '@/lib/date-utils'

export default function FinancePage() {
  const tz = useTimezone()
  const queryClient = useQueryClient()
  const [expenseForm, setExpenseForm] = useState({ amount: '', description: '', category: '' })
  const [expenseError, setExpenseError] = useState('')

  // Fetch finance overview
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

  // Fetch transactions
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

  // Fetch expenses
  const { data: expenses = [] } = useQuery({
    queryKey: ['admin-expenses'],
    queryFn: async () => {
      const result = await financeApi.getExpenses(20)
      if (result.success && result.data) {
        return result.data
      }
      return []
    },
  })

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (data: { amount: number; description: string; category?: string }) => {
      const result = await financeApi.createExpense(data)
      if (!result.success) throw new Error(result.error || 'Failed to record expense')
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-expenses'] })
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] })
      setExpenseForm({ amount: '', description: '', category: '' })
      setExpenseError('')
    },
    onError: (error: Error) => {
      setExpenseError(error.message)
    },
  })

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1">Finance</h1>
        <p className="text-slate-500 text-xs sm:text-sm">Revenue tracking and expense management</p>
      </div>

      {/* Stats Cards */}
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
            <p className="text-slate-400 text-xs lg:text-sm">Total Expenses</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
              <Icon name="minus" size={16} />
            </div>
          </div>
          <p className="text-white text-lg lg:text-2xl font-bold mb-1">
            {formatCurrency(overview?.totalExpenses || 0)}
          </p>
          <p className="text-xs">
            <span className="text-slate-500">recorded costs</span>
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
            {formatCurrency(overview?.netRevenue || 0)}
          </p>
          <p className="text-xs">
            <span className="text-slate-500">after costs</span>
          </p>
        </div>
      </div>

      {/* Revenue Breakdown + Deposit Inflow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 mb-6">
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Revenue by Payment Channel</h3>
          {overview?.revenueByPaymentMethod?.length ? (
            <div className="space-y-3">
              {overview.revenueByPaymentMethod.map((item) => (
                <div key={item.method} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 text-sm capitalize">{item.method.replace(/_/g, ' ')}</span>
                    <span className="text-slate-500 text-xs">({item.count} orders)</span>
                  </div>
                  <span className="text-white font-medium text-sm">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No revenue data</p>
          )}
        </div>

        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Wallet Deposit Inflow</h3>
          {overview?.depositsByMethod?.length ? (
            <div className="space-y-3">
              {overview.depositsByMethod.map((item) => (
                <div key={item.method} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 text-sm capitalize">{item.method.replace(/_/g, ' ')}</span>
                    <span className="text-slate-500 text-xs">({item.count} deposits)</span>
                  </div>
                  <span className="text-white font-medium text-sm">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No deposit data</p>
          )}
        </div>
      </div>

      {/* Record Expense Section */}
      <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-5 mb-6">
        <h3 className="text-white font-semibold mb-4">Record Expense</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const amount = parseFloat(expenseForm.amount)
            if (!amount || amount <= 0) { setExpenseError('Enter a valid amount'); return }
            if (!expenseForm.description.trim()) { setExpenseError('Enter a description'); return }
            createExpenseMutation.mutate({
              amount,
              description: expenseForm.description.trim(),
              category: expenseForm.category.trim() || undefined,
            })
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Amount"
            value={expenseForm.amount}
            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
            className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-white text-sm w-full sm:w-32 focus:outline-none focus:border-primary"
          />
          <input
            type="text"
            placeholder="Description (e.g. Server hosting)"
            value={expenseForm.description}
            onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
            className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-white text-sm flex-1 focus:outline-none focus:border-primary"
          />
          <input
            type="text"
            placeholder="Category (optional)"
            value={expenseForm.category}
            onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
            className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-white text-sm w-full sm:w-40 focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={createExpenseMutation.isPending}
            className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {createExpenseMutation.isPending ? 'Saving...' : 'Add'}
          </button>
        </form>
        {expenseError && <p className="text-red-400 text-xs mt-2">{expenseError}</p>}

        {/* Recent expenses list */}
        {expenses.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Recent Expenses</p>
            {expenses.map((exp: AdminExpense) => (
              <div key={exp.id} className="flex items-center justify-between text-sm py-1">
                <div>
                  <span className="text-slate-300">{exp.description}</span>
                  {exp.category && <span className="text-slate-500 text-xs ml-2">({exp.category})</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-red-400 font-medium">-{formatCurrency(Number(exp.amount))}</span>
                  <span className="text-slate-500 text-xs">{formatDate(exp.createdAt, tz)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
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
                      {formatDate(transaction.createdAt, tz)}
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
    </AdminLayout>
  )
}
