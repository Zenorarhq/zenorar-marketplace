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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ amount: '', description: '', category: '' })
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  // Update expense mutation
  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { amount: number; description: string; category?: string } }) => {
      const result = await financeApi.updateExpense(id, data)
      if (!result.success) throw new Error(result.error || 'Failed to update expense')
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-expenses'] })
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] })
      setEditingId(null)
    },
  })

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await financeApi.deleteExpense(id)
      if (!result.success) throw new Error(result.error || 'Failed to delete expense')
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-expenses'] })
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] })
      setDeletingId(null)
    },
    onError: () => {
      setDeletingId(null)
    },
  })

  const startEditing = (exp: AdminExpense) => {
    setEditingId(exp.id)
    setEditForm({
      amount: String(exp.amount),
      description: exp.description,
      category: exp.category || '',
    })
  }

  const saveEdit = () => {
    if (!editingId) return
    const amount = parseFloat(editForm.amount)
    if (!amount || amount <= 0) { setExpenseError('Enter a valid amount'); return }
    if (!editForm.description.trim()) { setExpenseError('Enter a description'); return }
    setExpenseError('')
    updateExpenseMutation.mutate({
      id: editingId,
      data: {
        amount,
        description: editForm.description.trim(),
        category: editForm.category.trim() || undefined,
      },
    })
  }

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

      {/* Revenue by Payment Channel */}
      <div className="mb-6">
        <h3 className="text-white font-semibold mb-3">Revenue by Payment Channel</h3>
        {overview?.revenueByPaymentMethod?.length ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            {overview.revenueByPaymentMethod.map((item) => (
              <div key={item.method} className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                <p className="text-slate-400 text-xs lg:text-sm capitalize mb-2">{item.method.replace(/_/g, ' ')}</p>
                <p className="text-white text-lg lg:text-xl font-bold mb-1">{formatCurrency(item.amount)}</p>
                <p className="text-slate-500 text-xs">{item.count} order{item.count !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-5">
            <p className="text-slate-500 text-sm">No revenue data</p>
          </div>
        )}
      </div>

      {/* Record Expense Section */}
      <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">Record Expense</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setExpenseError('')
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

      </div>

      {/* Expenses Table */}
      <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden mt-6">
        <div className="p-5 border-b border-[#1f1f1f]">
          <h3 className="text-white font-semibold">Expenses</h3>
        </div>
        {expenses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 text-sm">No expenses recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1f1f1f]">
                  <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Description</th>
                  <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Category</th>
                  <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Amount</th>
                  <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Date</th>
                  <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp: AdminExpense) => (
                  <tr key={exp.id} className="border-b border-[#1f1f1f] last:border-0 hover:bg-white/5">
                    {editingId === exp.id ? (
                      <>
                        <td className="px-5 py-3">
                          <input
                            type="text"
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            className="bg-[#0a0a0a] border border-[#1f1f1f] rounded px-2 py-1 text-white text-sm w-full focus:outline-none focus:border-primary"
                          />
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="text"
                            value={editForm.category}
                            placeholder="Category"
                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                            className="bg-[#0a0a0a] border border-[#1f1f1f] rounded px-2 py-1 text-white text-sm w-28 focus:outline-none focus:border-primary"
                          />
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.amount}
                            onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                            className="bg-[#0a0a0a] border border-[#1f1f1f] rounded px-2 py-1 text-white text-sm w-24 focus:outline-none focus:border-primary"
                          />
                        </td>
                        <td className="px-5 py-3 text-slate-500 text-sm">{formatDate(exp.createdAt, tz)}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={saveEdit}
                              disabled={updateExpenseMutation.isPending}
                              className="text-primary hover:text-primary/80 text-xs font-medium disabled:opacity-50"
                            >
                              {updateExpenseMutation.isPending ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-slate-500 hover:text-slate-300 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-3 text-white text-sm">{exp.description}</td>
                        <td className="px-5 py-3">
                          {exp.category ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                              {exp.category}
                            </span>
                          ) : (
                            <span className="text-slate-600 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-red-400 font-medium text-sm">-{formatCurrency(Number(exp.amount))}</td>
                        <td className="px-5 py-3 text-slate-500 text-sm">{formatDate(exp.createdAt, tz)}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEditing(exp)}
                              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-500 hover:text-slate-300"
                              title="Edit"
                            >
                              <Icon name="edit" size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this expense?')) {
                                  setDeletingId(exp.id)
                                  deleteExpenseMutation.mutate(exp.id)
                                }
                              }}
                              disabled={deletingId === exp.id}
                              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-500 hover:text-red-400 disabled:opacity-50"
                              title="Delete"
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
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
