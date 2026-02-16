'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { getAllWallets, getUserWallet, addCredit, deductCredit, adjustBalance } from '@/lib/api/wallet'
import { formatCurrency } from '@/lib/currency'

type ActionType = 'add' | 'deduct' | 'adjust'

export default function AdminWalletsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<ActionType>('add')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [showActionModal, setShowActionModal] = useState(false)
  const limit = 20

  // Fetch all wallets
  const { data: walletsData, isLoading: walletsLoading, refetch } = useQuery({
    queryKey: ['admin', 'wallets', page],
    queryFn: async () => {
      const result = await getAllWallets(page, limit)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load wallets')
      }
      return result.data
    }
  })

  // Fetch selected user's wallet details
  const { data: userWalletData, isLoading: userWalletLoading } = useQuery({
    queryKey: ['admin', 'wallet', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return null
      const result = await getUserWallet(selectedUserId)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load user wallet')
      }
      return result.data
    },
    enabled: !!selectedUserId
  })

  // Mutations for wallet actions
  const addCreditMutation = useMutation({
    mutationFn: async ({ userId, amount, description }: { userId: string; amount: number; description: string }) => {
      const result = await addCredit(userId, amount, description)
      if (!result.success) {
        throw new Error(result.error || 'Failed to add credit')
      }
      return result
    },
    onSuccess: () => {
      alert('Credit added successfully')
      queryClient.invalidateQueries({ queryKey: ['admin', 'wallets'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'wallet', selectedUserId] })
      resetActionModal()
    },
    onError: (error: Error) => {
      alert(error.message || 'Failed to add credit')
    }
  })

  const deductCreditMutation = useMutation({
    mutationFn: async ({ userId, amount, description }: { userId: string; amount: number; description: string }) => {
      const result = await deductCredit(userId, amount, description)
      if (!result.success) {
        throw new Error(result.error || 'Failed to deduct credit')
      }
      return result
    },
    onSuccess: () => {
      alert('Credit deducted successfully')
      queryClient.invalidateQueries({ queryKey: ['admin', 'wallets'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'wallet', selectedUserId] })
      resetActionModal()
    },
    onError: (error: Error) => {
      alert(error.message || 'Failed to deduct credit')
    }
  })

  const adjustBalanceMutation = useMutation({
    mutationFn: async ({ userId, amount, description }: { userId: string; amount: number; description: string }) => {
      const result = await adjustBalance(userId, amount, description)
      if (!result.success) {
        throw new Error(result.error || 'Failed to adjust balance')
      }
      return result
    },
    onSuccess: () => {
      alert('Balance adjusted successfully')
      queryClient.invalidateQueries({ queryKey: ['admin', 'wallets'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'wallet', selectedUserId] })
      resetActionModal()
    },
    onError: (error: Error) => {
      alert(error.message || 'Failed to adjust balance')
    }
  })

  const resetActionModal = () => {
    setShowActionModal(false)
    setAmount('')
    setDescription('')
    setSelectedUserId(null)
  }

  const handleAction = () => {
    if (!selectedUserId || !amount || !description) {
      alert('Please fill in all fields')
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid amount')
      return
    }

    const actionData = {
      userId: selectedUserId,
      amount: amountNum,
      description
    }

    switch (actionType) {
      case 'add':
        addCreditMutation.mutate(actionData)
        break
      case 'deduct':
        deductCreditMutation.mutate(actionData)
        break
      case 'adjust':
        adjustBalanceMutation.mutate(actionData)
        break
    }
  }

  const openActionModal = (userId: string, type: ActionType) => {
    setSelectedUserId(userId)
    setActionType(type)
    setShowActionModal(true)
  }

  // Filter wallets by search query
  const filteredWallets = walletsData?.wallets.filter((wallet: any) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      wallet.user.name.toLowerCase().includes(query) ||
      wallet.user.email.toLowerCase().includes(query)
    )
  }) || []

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-10 pb-6 border-b border-border-dark">
        <h1 className="text-3xl font-bold text-white mb-2">Wallet Management</h1>
        <p className="text-slate-400">
          View and manage user wallet balances, add or deduct credits.
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Icon name="search" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-dark border border-border-dark rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:border-primary/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Wallets Table */}
      {walletsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-surface-dark animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filteredWallets.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border-dark">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="text-xs uppercase bg-black text-slate-200">
                <tr>
                  <th className="px-6 py-4 font-bold">User</th>
                  <th className="px-6 py-4 font-bold text-right">Balance</th>
                  <th className="px-6 py-4 font-bold text-center">Last Updated</th>
                  <th className="px-6 py-4 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-dark bg-black/20">
                {filteredWallets.map((wallet: any) => (
                  <tr key={wallet.id} className="hover:bg-black/40 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-white font-medium">{wallet.user.name}</div>
                        <div className="text-xs text-slate-500">{wallet.user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-lg font-bold ${Number(wallet.balance) > 0 ? 'text-primary' : 'text-slate-500'}`}>
                        {formatCurrency(Number(wallet.balance))}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-xs">
                      {new Date(wallet.updatedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => openActionModal(wallet.userId, 'add')}
                          className="px-3 py-1 bg-primary/10 border border-primary/30 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors"
                        >
                          Add Credit
                        </button>
                        <button
                          onClick={() => openActionModal(wallet.userId, 'deduct')}
                          className="px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-500 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors"
                        >
                          Deduct
                        </button>
                        <button
                          onClick={() => openActionModal(wallet.userId, 'adjust')}
                          className="px-3 py-1 bg-surface-dark border border-border-dark text-slate-400 rounded-lg text-xs font-medium hover:bg-border-dark transition-colors"
                        >
                          Adjust
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {walletsData && walletsData.pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-slate-400 text-sm">
                Showing page {page} of {walletsData.pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-surface-dark border border-border-dark rounded-lg text-white font-medium hover:bg-border-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon name="arrow-left" size={16} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(walletsData.pagination.totalPages, p + 1))}
                  disabled={page === walletsData.pagination.totalPages}
                  className="px-4 py-2 bg-surface-dark border border-border-dark rounded-lg text-white font-medium hover:bg-border-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon name="arrow-right" size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-black border border-border-dark rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-dark flex items-center justify-center mx-auto mb-4">
            <Icon name="wallet" size={32} className="text-slate-600" />
          </div>
          <h4 className="text-lg font-bold text-white mb-2">No wallets found</h4>
          <p className="text-slate-500">
            {searchQuery ? 'Try adjusting your search query.' : 'User wallets will appear here.'}
          </p>
        </div>
      )}

      {/* Action Modal */}
      {showActionModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-charcoal border border-border-dark rounded-2xl p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {actionType === 'add' ? 'Add Credit' : actionType === 'deduct' ? 'Deduct Credit' : 'Adjust Balance'}
              </h3>
              <button
                onClick={resetActionModal}
                className="text-slate-400 hover:text-white"
              >
                <Icon name="close" size={24} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Amount (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-surface-dark border border-border-dark rounded-xl pl-8 pr-4 py-3 text-white placeholder-slate-500 focus:border-primary/50 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Description/Reason
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter a reason for this action..."
                  rows={3}
                  className="w-full bg-surface-dark border border-border-dark rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-primary/50 focus:outline-none resize-none"
                />
              </div>

              {actionType === 'adjust' && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                  <p className="text-yellow-400 text-xs">
                    <strong>Warning:</strong> Adjust will set the balance to the exact amount specified, not add or subtract from the current balance.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetActionModal}
                className="flex-1 bg-surface-dark border border-border-dark text-white font-bold py-3 rounded-xl hover:bg-border-dark transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={addCreditMutation.isPending || deductCreditMutation.isPending || adjustBalanceMutation.isPending}
                className={`flex-1 font-bold py-3 rounded-xl transition-colors disabled:opacity-50 ${
                  actionType === 'add'
                    ? 'bg-primary text-black hover:brightness-105'
                    : actionType === 'deduct'
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-yellow-500 text-black hover:bg-yellow-600'
                }`}
              >
                {addCreditMutation.isPending || deductCreditMutation.isPending || adjustBalanceMutation.isPending
                  ? 'Processing...'
                  : actionType === 'add'
                  ? 'Add Credit'
                  : actionType === 'deduct'
                  ? 'Deduct Credit'
                  : 'Adjust Balance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
