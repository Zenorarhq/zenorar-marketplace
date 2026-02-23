'use client'

import { useState, Fragment } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { getAllWallets, addCredit, deductCredit, adjustBalance, freezeWallet, unfreezeWallet, getWalletStats, getAllTransactions, getUserWallet } from '@/lib/api/wallet'
import { getAllDeposits, getDepositStats, approveDeposit, rejectDeposit, resetDepositToPending } from '@/lib/api/deposits'
import { formatCurrency } from '@/lib/currency'
import type { DepositStatus, DepositMethod } from '@/lib/api/deposits'

type WalletActionType = 'add' | 'deduct' | 'adjust'

const depositStatusConfig: Record<DepositStatus, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' },
  PROCESSING: { label: 'Processing', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  COMPLETED: { label: 'Completed', color: 'text-green-500 bg-green-500/10 border-green-500/20' },
  FAILED: { label: 'Failed', color: 'text-red-500 bg-red-500/10 border-red-500/20' },
  CANCELLED: { label: 'Cancelled', color: 'text-slate-500 bg-slate-500/10 border-slate-500/20' },
  EXPIRED: { label: 'Expired', color: 'text-slate-500 bg-slate-500/10 border-slate-500/20' },
}

const methodLabels: Record<DepositMethod, string> = {
  STRIPE: 'Stripe',
  PAYSTACK: 'Paystack',
  PAYPAL: 'PayPal',
  BANK_TRANSFER: 'Bank Transfer',
  CRYPTO: 'Crypto',
}

export default function AdminWalletsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'wallets' | 'deposits' | 'transactions'>('wallets')

  // Wallets state
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [walletPage, setWalletPage] = useState(1)
  const [walletSearch, setWalletSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<WalletActionType>('add')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [showActionModal, setShowActionModal] = useState(false)
  const [freezeReason, setFreezeReason] = useState('')
  const [freezeUserId, setFreezeUserId] = useState<string | null>(null)
  const [showFreezeModal, setShowFreezeModal] = useState(false)

  // Deposits state
  const [depositPage, setDepositPage] = useState(1)
  const [depositStatus, setDepositStatus] = useState<DepositStatus | 'all'>('all')
  const [rejectReason, setRejectReason] = useState('')
  const [rejectDepositId, setRejectDepositId] = useState<string | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null)
  const [depositSort, setDepositSort] = useState<{ field: 'createdAt' | 'amount' | 'status'; order: 'asc' | 'desc' }>({ field: 'createdAt', order: 'desc' })

  // Transactions state
  const [txPage, setTxPage] = useState(1)
  const [txFilter, setTxFilter] = useState<'all' | 'CREDIT' | 'DEBIT'>('all')

  const limit = 20

  // ---- QUERIES ----
  const { data: walletsData, isLoading: walletsLoading } = useQuery({
    queryKey: ['admin', 'wallets', walletPage, walletSearch],
    queryFn: async () => {
      const result = await getAllWallets(walletPage, limit, walletSearch || undefined)
      if (!result.success || !result.data) throw new Error(result.error || 'Failed to load wallets')
      const data = result.data as any
      return { wallets: data?.wallets || data || [], pagination: result.pagination || data?.pagination }
    },
    enabled: activeTab === 'wallets',
  })

  const { data: depositsData, isLoading: depositsLoading } = useQuery({
    queryKey: ['admin', 'deposits', depositPage, depositStatus],
    queryFn: async () => {
      const result = await getAllDeposits(
        depositPage,
        limit,
        depositStatus === 'all' ? undefined : depositStatus
      )
      if (!result.success || !result.data) throw new Error(result.error || 'Failed to load deposits')
      const data = result.data as any
      return { deposits: data?.deposits || data || [], pagination: result.pagination || data?.pagination }
    },
    enabled: activeTab === 'deposits',
  })

  const { data: depositStats } = useQuery({
    queryKey: ['admin', 'deposit-stats'],
    queryFn: async () => {
      const result = await getDepositStats()
      return result.success ? result.data : null
    },
    enabled: activeTab === 'deposits',
  })

  const { data: walletStats } = useQuery({
    queryKey: ['admin', 'wallet-stats'],
    queryFn: async () => {
      const result = await getWalletStats()
      return result.success ? result.data : null
    },
    enabled: activeTab === 'wallets',
  })

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['admin', 'transactions', txPage, txFilter],
    queryFn: async () => {
      const result = await getAllTransactions(
        txPage,
        limit,
        txFilter === 'all' ? undefined : txFilter
      )
      if (!result.success || !result.data) throw new Error(result.error || 'Failed to load transactions')
      return { transactions: result.data as any[], pagination: result.pagination! }
    },
    enabled: activeTab === 'transactions',
  })

  const { data: userDetail, isLoading: userDetailLoading } = useQuery({
    queryKey: ['admin', 'user-wallet', expandedUserId],
    queryFn: async () => {
      if (!expandedUserId) return null
      const result = await getUserWallet(expandedUserId)
      return result.success ? result.data : null
    },
    enabled: !!expandedUserId,
  })

  // ---- MUTATIONS ----
  const addCreditMutation = useMutation({
    mutationFn: async (data: { userId: string; amount: number; description: string }) => {
      const result = await addCredit(data.userId, data.amount, data.description)
      if (!result.success) throw new Error(result.error || 'Failed to add credit')
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'wallets'] }); resetActionModal() },
  })

  const deductCreditMutation = useMutation({
    mutationFn: async (data: { userId: string; amount: number; description: string }) => {
      const result = await deductCredit(data.userId, data.amount, data.description)
      if (!result.success) throw new Error(result.error || 'Failed to deduct credit')
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'wallets'] }); resetActionModal() },
  })

  const adjustBalanceMutation = useMutation({
    mutationFn: async (data: { userId: string; amount: number; description: string }) => {
      const result = await adjustBalance(data.userId, data.amount, data.description)
      if (!result.success) throw new Error(result.error || 'Failed to adjust balance')
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'wallets'] }); resetActionModal() },
  })

  const freezeMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const result = await freezeWallet(userId, reason)
      if (!result.success) throw new Error(result.error || 'Failed to freeze wallet')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'wallets'] })
      setShowFreezeModal(false)
      setFreezeReason('')
      setFreezeUserId(null)
    },
  })

  const unfreezeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const result = await unfreezeWallet(userId)
      if (!result.success) throw new Error(result.error || 'Failed to unfreeze wallet')
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'wallets'] }) },
  })

  const approveMutation = useMutation({
    mutationFn: async (depositId: string) => {
      const result = await approveDeposit(depositId)
      if (!result.success) throw new Error(result.error || 'Failed to approve deposit')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'deposits'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'deposit-stats'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ depositId, reason }: { depositId: string; reason: string }) => {
      const result = await rejectDeposit(depositId, reason)
      if (!result.success) throw new Error(result.error || 'Failed to reject deposit')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'deposits'] })
      setShowRejectModal(false)
      setRejectReason('')
      setRejectDepositId(null)
    },
  })

  const resetMutation = useMutation({
    mutationFn: async (depositId: string) => {
      const result = await resetDepositToPending(depositId)
      if (!result.success) throw new Error(result.error || 'Failed to reset deposit')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'deposits'] })
    },
  })

  // ---- HELPERS ----
  const resetActionModal = () => {
    setShowActionModal(false)
    setAmount('')
    setDescription('')
    setSelectedUserId(null)
  }

  const handleWalletAction = () => {
    if (!selectedUserId || !amount || !description) return
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) return
    const data = { userId: selectedUserId, amount: amountNum, description }
    if (actionType === 'add') addCreditMutation.mutate(data)
    else if (actionType === 'deduct') deductCreditMutation.mutate(data)
    else adjustBalanceMutation.mutate(data)
  }

  const openActionModal = (userId: string, type: WalletActionType) => {
    setSelectedUserId(userId)
    setActionType(type)
    setShowActionModal(true)
  }

  const isPending = addCreditMutation.isPending || deductCreditMutation.isPending || adjustBalanceMutation.isPending

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })

  const toggleDepositSort = (field: 'createdAt' | 'amount' | 'status') => {
    setDepositSort(prev => prev.field === field ? { field, order: prev.order === 'asc' ? 'desc' : 'asc' } : { field, order: 'asc' })
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-border-dark">
        <h1 className="text-3xl font-bold text-white mb-2">Wallet Management</h1>
        <p className="text-slate-400">Manage user wallets, approve deposits, and adjust balances.</p>
      </div>

      {/* Wallet Stats (shown when wallets tab is active) */}
      {activeTab === 'wallets' && walletStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Balance', value: formatCurrency(walletStats.totalBalance || 0), icon: 'wallet', color: 'text-primary' },
            { label: 'Total Wallets', value: walletStats.totalWallets || 0, icon: 'user-group', color: 'text-blue-500' },
            { label: 'Active', value: walletStats.activeCount || 0, icon: 'check-circle', color: 'text-green-500' },
            { label: 'Frozen', value: walletStats.frozenCount || 0, icon: 'lock', color: 'text-red-500' },
          ].map((stat) => (
            <div key={stat.label} className="bg-black border border-border-dark rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <Icon name={stat.icon as any} size={20} className={stat.color} />
                <p className="text-slate-400 text-sm">{stat.label}</p>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Deposit Stats (shown when deposits tab is active) */}
      {activeTab === 'deposits' && depositStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Deposited', value: formatCurrency(depositStats.totalAmount || 0), icon: 'arrow-down-circle', color: 'text-primary' },
            { label: 'Completed', value: depositStats.completedCount || 0, icon: 'check-circle', color: 'text-green-500' },
            { label: 'Pending Approval', value: depositStats.pendingCount || 0, icon: 'clock', color: 'text-yellow-500' },
            { label: 'Failed', value: depositStats.failedCount || 0, icon: 'close-circle', color: 'text-red-500' },
          ].map((stat) => (
            <div key={stat.label} className="bg-black border border-border-dark rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <Icon name={stat.icon as any} size={20} className={stat.color} />
                <p className="text-slate-400 text-sm">{stat.label}</p>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface-dark rounded-xl p-1 max-w-md">
        <button
          onClick={() => setActiveTab('wallets')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'wallets' ? 'bg-primary text-black' : 'text-slate-400 hover:text-white'}`}
        >
          User Wallets
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'transactions' ? 'bg-primary text-black' : 'text-slate-400 hover:text-white'}`}
        >
          Transactions
        </button>
        <button
          onClick={() => setActiveTab('deposits')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'deposits' ? 'bg-primary text-black' : 'text-slate-400 hover:text-white'}`}
        >
          Deposits
        </button>
      </div>

      {/* ---- WALLETS TAB ---- */}
      {activeTab === 'wallets' && (
        <div>
          <div className="mb-6">
            <div className="relative">
              <Icon name="search" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={walletSearch}
                onChange={(e) => { setWalletSearch(e.target.value); setWalletPage(1) }}
                className="w-full bg-surface-dark border border-border-dark rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:border-primary/50 focus:outline-none"
              />
            </div>
          </div>

          {walletsLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 bg-surface-dark animate-pulse rounded-xl" />)}</div>
          ) : walletsData?.wallets && walletsData.wallets.length > 0 ? (
            <>
              <div className="overflow-x-auto rounded-2xl border border-border-dark">
                <table className="w-full text-left text-sm text-slate-400">
                  <thead className="text-xs uppercase bg-black text-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-bold">User</th>
                      <th className="px-6 py-4 font-bold text-right">Balance</th>
                      <th className="px-6 py-4 font-bold text-center">Status</th>
                      <th className="px-6 py-4 font-bold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dark bg-black/20">
                    {walletsData.wallets.map((wallet: any) => (
                      <Fragment key={wallet.id}>
                        <tr
                          className={`hover:bg-black/40 transition-colors cursor-pointer ${expandedUserId === wallet.userId ? 'bg-black/40' : ''}`}
                          onClick={() => setExpandedUserId(expandedUserId === wallet.userId ? null : wallet.userId)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Icon name={expandedUserId === wallet.userId ? 'chevron-down' : 'chevron-right'} size={14} className="text-slate-500" />
                              <div>
                                <div className="text-white font-medium">{wallet.user.name}</div>
                                <div className="text-xs text-slate-500">{wallet.user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`text-lg font-bold ${Number(wallet.balance) > 0 ? 'text-primary' : 'text-slate-500'}`}>
                              {formatCurrency(Number(wallet.balance))}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {wallet.isFrozen ? (
                              <span className="px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-xs font-bold">Frozen</span>
                            ) : (
                              <span className="px-2 py-1 bg-green-500/10 border border-green-500/20 text-green-500 rounded text-xs font-bold">Active</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2 justify-center flex-wrap" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => openActionModal(wallet.userId, 'add')}
                                className="px-3 py-1 bg-primary/10 border border-primary/30 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors"
                              >
                                Add
                              </button>
                              <button
                                onClick={() => openActionModal(wallet.userId, 'deduct')}
                                className="px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-500 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors"
                              >
                                Deduct
                              </button>
                              {wallet.isFrozen ? (
                                <button
                                  onClick={() => unfreezeMutation.mutate(wallet.userId)}
                                  disabled={unfreezeMutation.isPending}
                                  className="px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-500 rounded-lg text-xs font-medium hover:bg-green-500/20 transition-colors disabled:opacity-50"
                                >
                                  Unfreeze
                                </button>
                              ) : (
                                <button
                                  onClick={() => { setFreezeUserId(wallet.userId); setShowFreezeModal(true) }}
                                  className="px-3 py-1 bg-slate-500/10 border border-slate-500/30 text-slate-400 rounded-lg text-xs font-medium hover:bg-slate-500/20 transition-colors"
                                >
                                  Freeze
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedUserId === wallet.userId && (
                          <tr>
                            <td colSpan={4} className="px-6 py-4 bg-black/60">
                              {userDetailLoading ? (
                                <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
                                  <Icon name="loading" size={16} className="animate-spin" />
                                  Loading wallet details...
                                </div>
                              ) : userDetail ? (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="bg-surface-dark rounded-lg p-3">
                                      <p className="text-xs text-slate-500 mb-1">Balance</p>
                                      <p className="text-primary font-bold">{formatCurrency(Number(userDetail.balance || 0))}</p>
                                    </div>
                                    <div className="bg-surface-dark rounded-lg p-3">
                                      <p className="text-xs text-slate-500 mb-1">Total Credits</p>
                                      <p className="text-green-500 font-bold">{formatCurrency(Number(userDetail.totalCredits || 0))}</p>
                                    </div>
                                    <div className="bg-surface-dark rounded-lg p-3">
                                      <p className="text-xs text-slate-500 mb-1">Total Debits</p>
                                      <p className="text-red-500 font-bold">{formatCurrency(Number(userDetail.totalDebits || 0))}</p>
                                    </div>
                                    <div className="bg-surface-dark rounded-lg p-3">
                                      <p className="text-xs text-slate-500 mb-1">Total Refunds</p>
                                      <p className="text-yellow-500 font-bold">{formatCurrency(Number(userDetail.totalRefunds || 0))}</p>
                                    </div>
                                  </div>
                                  {userDetail.transactions && userDetail.transactions.length > 0 && (
                                    <div>
                                      <p className="text-sm font-semibold text-slate-300 mb-2">Recent Transactions</p>
                                      <div className="space-y-1">
                                        {userDetail.transactions.map((tx: any) => (
                                          <div key={tx.id} className="flex items-center justify-between bg-surface-dark rounded-lg px-3 py-2 text-sm">
                                            <div className="flex items-center gap-3">
                                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                                tx.type === 'CREDIT' ? 'text-green-500 bg-green-500/10' :
                                                tx.type === 'DEBIT' ? 'text-red-500 bg-red-500/10' :
                                                tx.type === 'REFUND' ? 'text-yellow-500 bg-yellow-500/10' :
                                                'text-blue-500 bg-blue-500/10'
                                              }`}>{tx.type}</span>
                                              <span className="text-slate-400 truncate max-w-[200px]">{tx.description}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                              <span className={`font-bold ${tx.type === 'DEBIT' ? 'text-red-500' : 'text-green-500'}`}>
                                                {tx.type === 'DEBIT' ? '-' : '+'}{formatCurrency(Number(tx.amount))}
                                              </span>
                                              <span className="text-xs text-slate-500">{formatDate(tx.createdAt)}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-slate-500 text-sm py-4">No wallet data found for this user.</p>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {walletsData.pagination.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-slate-400 text-sm">Page {walletPage} of {walletsData.pagination.totalPages} ({walletsData.pagination.total} wallets)</p>
                  <div className="flex gap-2">
                    <button onClick={() => setWalletPage(p => Math.max(1, p - 1))} disabled={walletPage === 1} className="px-4 py-2 bg-surface-dark border border-border-dark rounded-lg text-white hover:bg-border-dark transition-colors disabled:opacity-50">
                      <Icon name="arrow-left" size={16} />
                    </button>
                    <button onClick={() => setWalletPage(p => Math.min(walletsData.pagination.totalPages, p + 1))} disabled={walletPage === walletsData.pagination.totalPages} className="px-4 py-2 bg-surface-dark border border-border-dark rounded-lg text-white hover:bg-border-dark transition-colors disabled:opacity-50">
                      <Icon name="arrow-right" size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-black border border-border-dark rounded-2xl p-12 text-center">
              <Icon name="wallet" size={32} className="text-slate-600 mx-auto mb-4" />
              <h4 className="text-lg font-bold text-white mb-2">No wallets found</h4>
              <p className="text-slate-500">{walletSearch ? 'Try adjusting your search.' : 'User wallets will appear here.'}</p>
            </div>
          )}
        </div>
      )}

      {/* ---- DEPOSITS TAB ---- */}
      {activeTab === 'deposits' && (
        <div>
          <div className="flex gap-2 mb-6 flex-wrap">
            {(['all', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setDepositStatus(s); setDepositPage(1) }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${depositStatus === s ? 'bg-primary text-black' : 'bg-surface-dark text-slate-400 hover:bg-border-dark'}`}
              >
                {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {depositsLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-surface-dark animate-pulse rounded-xl" />)}</div>
          ) : depositsData?.deposits && depositsData.deposits.length > 0 ? (
            <>
              {(() => {
                const sortedDeposits = [...depositsData.deposits].sort((a: any, b: any) => {
                  const dir = depositSort.order === 'asc' ? 1 : -1
                  if (depositSort.field === 'amount') return (Number(a.amount) - Number(b.amount)) * dir
                  if (depositSort.field === 'status') return a.status.localeCompare(b.status) * dir
                  return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir
                })
                const sortIcon = (field: 'createdAt' | 'amount' | 'status') =>
                  depositSort.field === field ? (depositSort.order === 'asc' ? ' ↑' : ' ↓') : ' ↕'
                return (
              <div className="overflow-x-auto rounded-2xl border border-border-dark">
                <table className="w-full text-left text-sm text-slate-400">
                  <thead className="text-xs uppercase bg-black text-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-bold">User</th>
                      <th className="px-6 py-4 font-bold">Method</th>
                      <th className="px-6 py-4 font-bold text-right cursor-pointer select-none hover:text-white" onClick={() => toggleDepositSort('amount')}>Amount{sortIcon('amount')}</th>
                      <th className="px-6 py-4 font-bold text-center cursor-pointer select-none hover:text-white" onClick={() => toggleDepositSort('status')}>Status{sortIcon('status')}</th>
                      <th className="px-6 py-4 font-bold cursor-pointer select-none hover:text-white" onClick={() => toggleDepositSort('createdAt')}>Date{sortIcon('createdAt')}</th>
                      <th className="px-6 py-4 font-bold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dark bg-black/20">
                    {sortedDeposits.map((deposit: any) => {
                      const statusConfig = depositStatusConfig[deposit.status as DepositStatus] || depositStatusConfig.PENDING
                      const method = methodLabels[deposit.paymentMethod as DepositMethod] || deposit.paymentMethod
                      const needsApproval = (deposit.status === 'PENDING' || deposit.status === 'PROCESSING') &&
                        (deposit.paymentMethod === 'BANK_TRANSFER' || deposit.paymentMethod.startsWith('CRYPTO'))

                      return (
                        <tr key={deposit.id} className="hover:bg-black/40 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-white font-medium">{deposit.user?.name || 'Unknown'}</div>
                            <div className="text-xs text-slate-500">{deposit.user?.email || ''}</div>
                          </td>
                          <td className="px-6 py-4 text-white font-medium">{method}</td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-primary font-bold">{formatCurrency(Number(deposit.amount))}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-bold border ${statusConfig.color}`}>{statusConfig.label}</span>
                          </td>
                          <td className="px-6 py-4 text-xs">{formatDate(deposit.createdAt)}</td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2 justify-center">
                              {needsApproval && (
                                <>
                                  <button
                                    onClick={() => approveMutation.mutate(deposit.id)}
                                    disabled={approveMutation.isPending}
                                    className="px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-500 rounded-lg text-xs font-medium hover:bg-green-500/20 transition-colors disabled:opacity-50"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => { setRejectDepositId(deposit.id); setShowRejectModal(true) }}
                                    className="px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-500 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {deposit.status === 'PROCESSING' && deposit.paymentMethod === 'BANK_TRANSFER' && (
                                <button
                                  onClick={() => resetMutation.mutate(deposit.id)}
                                  disabled={resetMutation.isPending}
                                  className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 rounded-lg text-xs font-medium hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
                                >
                                  Reset to Pending
                                </button>
                              )}
                              {deposit.bankProof && (
                                <button
                                  onClick={() => setProofPreviewUrl(deposit.bankProof)}
                                  className="px-3 py-1 bg-surface-dark border border-border-dark text-slate-400 rounded-lg text-xs font-medium hover:bg-border-dark transition-colors flex items-center gap-1"
                                  title="View proof"
                                >
                                  <Icon name="eye" size={14} />
                                  View Proof
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
                )
              })()}

              {depositsData.pagination.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-slate-400 text-sm">Page {depositPage} of {depositsData.pagination.totalPages} ({depositsData.pagination.total} deposits)</p>
                  <div className="flex gap-2">
                    <button onClick={() => setDepositPage(p => Math.max(1, p - 1))} disabled={depositPage === 1} className="px-4 py-2 bg-surface-dark border border-border-dark rounded-lg text-white hover:bg-border-dark transition-colors disabled:opacity-50">
                      <Icon name="arrow-left" size={16} />
                    </button>
                    <button onClick={() => setDepositPage(p => Math.min(depositsData.pagination.totalPages, p + 1))} disabled={depositPage === depositsData.pagination.totalPages} className="px-4 py-2 bg-surface-dark border border-border-dark rounded-lg text-white hover:bg-border-dark transition-colors disabled:opacity-50">
                      <Icon name="arrow-right" size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-black border border-border-dark rounded-2xl p-12 text-center">
              <Icon name="arrow-down-circle" size={32} className="text-slate-600 mx-auto mb-4" />
              <h4 className="text-lg font-bold text-white mb-2">No deposits found</h4>
              <p className="text-slate-500">Deposits will appear here when users add money.</p>
            </div>
          )}
        </div>
      )}

      {/* ---- TRANSACTIONS TAB ---- */}
      {activeTab === 'transactions' && (
        <div>
          <div className="flex gap-2 mb-6 flex-wrap">
            {(['all', 'CREDIT', 'DEBIT'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTxFilter(t); setTxPage(1) }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${txFilter === t ? 'bg-primary text-black' : 'bg-surface-dark text-slate-400 hover:bg-border-dark'}`}
              >
                {t === 'all' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {txLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 bg-surface-dark animate-pulse rounded-xl" />)}</div>
          ) : txData?.transactions && txData.transactions.length > 0 ? (
            <>
              <div className="overflow-x-auto rounded-2xl border border-border-dark">
                <table className="w-full text-left text-sm text-slate-400">
                  <thead className="text-xs uppercase bg-black text-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-bold">User</th>
                      <th className="px-6 py-4 font-bold">Type</th>
                      <th className="px-6 py-4 font-bold text-right">Amount</th>
                      <th className="px-6 py-4 font-bold text-right">Balance After</th>
                      <th className="px-6 py-4 font-bold">Description</th>
                      <th className="px-6 py-4 font-bold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dark bg-black/20">
                    {txData.transactions.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-black/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-white font-medium">{tx.user?.name || 'Unknown'}</div>
                          <div className="text-xs text-slate-500">{tx.user?.email || ''}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            tx.type === 'CREDIT' ? 'text-green-500 bg-green-500/10 border border-green-500/20' :
                            tx.type === 'DEBIT' ? 'text-red-500 bg-red-500/10 border border-red-500/20' :
                            tx.type === 'REFUND' ? 'text-yellow-500 bg-yellow-500/10 border border-yellow-500/20' :
                            'text-blue-500 bg-blue-500/10 border border-blue-500/20'
                          }`}>{tx.type}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-bold ${tx.type === 'DEBIT' ? 'text-red-500' : 'text-green-500'}`}>
                            {tx.type === 'DEBIT' ? '-' : '+'}{formatCurrency(Number(tx.amount))}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-white font-medium">
                          {formatCurrency(Number(tx.balanceAfter))}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-300 truncate max-w-[200px] block">{tx.description}</span>
                          {tx.order?.orderNumber && (
                            <span className="text-xs text-slate-500">Order: {tx.order.orderNumber}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs">{formatDate(tx.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {txData.pagination.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-slate-400 text-sm">Page {txPage} of {txData.pagination.totalPages} ({txData.pagination.total} transactions)</p>
                  <div className="flex gap-2">
                    <button onClick={() => setTxPage(p => Math.max(1, p - 1))} disabled={txPage === 1} className="px-4 py-2 bg-surface-dark border border-border-dark rounded-lg text-white hover:bg-border-dark transition-colors disabled:opacity-50">
                      <Icon name="arrow-left" size={16} />
                    </button>
                    <button onClick={() => setTxPage(p => Math.min(txData.pagination.totalPages, p + 1))} disabled={txPage === txData.pagination.totalPages} className="px-4 py-2 bg-surface-dark border border-border-dark rounded-lg text-white hover:bg-border-dark transition-colors disabled:opacity-50">
                      <Icon name="arrow-right" size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-black border border-border-dark rounded-2xl p-12 text-center">
              <Icon name="list" size={32} className="text-slate-600 mx-auto mb-4" />
              <h4 className="text-lg font-bold text-white mb-2">No transactions found</h4>
              <p className="text-slate-500">Wallet transactions will appear here.</p>
            </div>
          )}
        </div>
      )}

      {/* ---- WALLET ACTION MODAL ---- */}
      {showActionModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-charcoal border border-border-dark rounded-2xl p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {actionType === 'add' ? 'Add Credit' : actionType === 'deduct' ? 'Deduct Credit' : 'Adjust Balance'}
              </h3>
              <button onClick={resetActionModal} className="text-slate-400 hover:text-white"><Icon name="close" size={24} /></button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Amount (USD)</label>
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
                <label className="block text-sm font-semibold text-slate-300 mb-2">Reason</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter a reason..."
                  rows={3}
                  className="w-full bg-surface-dark border border-border-dark rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-primary/50 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={resetActionModal} className="flex-1 bg-surface-dark border border-border-dark text-white font-bold py-3 rounded-xl hover:bg-border-dark transition-colors">Cancel</button>
              <button
                onClick={handleWalletAction}
                disabled={isPending || !amount || !description}
                className={`flex-1 font-bold py-3 rounded-xl transition-colors disabled:opacity-50 ${
                  actionType === 'add' ? 'bg-primary text-black hover:brightness-105'
                  : actionType === 'deduct' ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-yellow-500 text-black hover:bg-yellow-600'
                }`}
              >
                {isPending ? 'Processing...' : actionType === 'add' ? 'Add Credit' : actionType === 'deduct' ? 'Deduct' : 'Adjust'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- FREEZE WALLET MODAL ---- */}
      {showFreezeModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-charcoal border border-border-dark rounded-2xl p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Freeze Wallet</h3>
              <button onClick={() => { setShowFreezeModal(false); setFreezeReason(''); setFreezeUserId(null) }} className="text-slate-400 hover:text-white"><Icon name="close" size={24} /></button>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
              <p className="text-red-400 text-sm">Freezing this wallet will prevent the user from making purchases or receiving credits.</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Reason for freezing</label>
              <textarea
                value={freezeReason}
                onChange={(e) => setFreezeReason(e.target.value)}
                placeholder="Enter the reason..."
                rows={3}
                className="w-full bg-surface-dark border border-border-dark rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-red-500/50 focus:outline-none resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowFreezeModal(false); setFreezeReason(''); setFreezeUserId(null) }} className="flex-1 bg-surface-dark border border-border-dark text-white font-bold py-3 rounded-xl hover:bg-border-dark transition-colors">Cancel</button>
              <button
                onClick={() => { if (freezeUserId && freezeReason.trim()) freezeMutation.mutate({ userId: freezeUserId, reason: freezeReason }) }}
                disabled={freezeMutation.isPending || !freezeReason.trim()}
                className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {freezeMutation.isPending ? 'Freezing...' : 'Freeze Wallet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- REJECT DEPOSIT MODAL ---- */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-charcoal border border-border-dark rounded-2xl p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Reject Deposit</h3>
              <button onClick={() => { setShowRejectModal(false); setRejectReason(''); setRejectDepositId(null) }} className="text-slate-400 hover:text-white"><Icon name="close" size={24} /></button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Reason for rejection</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter a reason (shown to the user)..."
                rows={3}
                className="w-full bg-surface-dark border border-border-dark rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-red-500/50 focus:outline-none resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowRejectModal(false); setRejectReason(''); setRejectDepositId(null) }} className="flex-1 bg-surface-dark border border-border-dark text-white font-bold py-3 rounded-xl hover:bg-border-dark transition-colors">Cancel</button>
              <button
                onClick={() => { if (rejectDepositId && rejectReason.trim()) rejectMutation.mutate({ depositId: rejectDepositId, reason: rejectReason }) }}
                disabled={rejectMutation.isPending || !rejectReason.trim()}
                className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject Deposit'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ---- PROOF PREVIEW MODAL ---- */}
      {proofPreviewUrl && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setProofPreviewUrl(null)}>
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setProofPreviewUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300"
            >
              <Icon name="close" size={24} />
            </button>
            <img src={proofPreviewUrl} alt="Payment proof" className="w-full rounded-xl border border-border-dark" />
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
