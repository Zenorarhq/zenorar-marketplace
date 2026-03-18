'use client'

import { useState, useEffect, Suspense } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import ProfileLayout from '@/components/profile/ProfileLayout'
import Icon from '@/components/ui/Icon'
import DepositModal from '@/components/wallet/DepositModal'
import { getBalance, getTransactionHistory } from '@/lib/api/wallet'
import { getMyDeposits, cancelDeposit, type Deposit, type DepositStatus } from '@/lib/api/deposits'
import { usePreferences } from '@/contexts/PreferencesContext'
import Link from 'next/link'

type TransactionFilter = 'all' | 'DEPOSIT' | 'DEBIT' | 'REFUND' | 'ADJUSTMENT'

const depositMethodLabels: Record<string, string> = {
  CARD: 'Card',
  STRIPE: 'Stripe',
  PAYSTACK: 'Paystack',
  PAYPAL: 'PayPal',
  BANK_TRANSFER: 'Bank Transfer',
  CRYPTO: 'Crypto',
  CRYPTO_BTC: 'Bitcoin',
  CRYPTO_ETH: 'Ethereum',
  CRYPTO_USDT: 'USDT',
}

const depositStatusConfig: Record<DepositStatus, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' },
  PROCESSING: { label: 'Processing', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  COMPLETED: { label: 'Completed', color: 'text-green-500 bg-green-500/10 border-green-500/20' },
  FAILED: { label: 'Failed', color: 'text-red-500 bg-red-500/10 border-red-500/20' },
  CANCELLED: { label: 'Cancelled', color: 'text-slate-500 bg-slate-500/10 border-slate-500/20' },
  EXPIRED: { label: 'Expired', color: 'text-slate-500 bg-slate-500/10 border-slate-500/20' },
}

function WalletPageContent() {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { formatPrice } = usePreferences()
  const [filter, setFilter] = useState<TransactionFilter>('all')
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'transactions' | 'deposits'>('transactions')
  const [depositMessage, setDepositMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [txPage, setTxPage] = useState(1)
  const [depositPage, setDepositPage] = useState(1)
  const [depositFilter, setDepositFilter] = useState<DepositStatus | 'all'>('all')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [resumeDeposit, setResumeDeposit] = useState<{
    depositId: string; network: string; amount: number; timeRemaining: number; cryptoAddress: string
  } | null>(null)

  // Handle PayPal and other payment gateway redirects
  useEffect(() => {
    const deposit = searchParams.get('deposit')
    const depositId = searchParams.get('depositId')

    const handlePayPalCapture = async () => {
      if (deposit === 'paypal_success' && depositId) {
        try {
          // Get PayPal order ID from URL (PayPal adds ?token=<orderId>)
          let orderId = searchParams.get('token')

          // Fallback: look up order ID from deposit record if token missing
          if (!orderId) {
            try {
              const authToken = localStorage.getItem('auth_token')
              const lookupRes = await fetch(`/api/deposits/paypal/lookup?depositId=${depositId}`, {
                headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
              })
              const lookupData = await lookupRes.json()
              if (lookupData.success && lookupData.data?.orderId) {
                orderId = lookupData.data.orderId
              }
            } catch {}
          }

          if (!orderId) {
            setDepositMessage({ type: 'error', text: 'Missing PayPal order ID. Please contact support.' })
            window.history.replaceState({}, '', '/profile/wallet')
            return
          }

          const response = await fetch('/api/deposits/paypal/capture', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(localStorage.getItem('auth_token') && {
                Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
              }),
            },
            body: JSON.stringify({ depositId, orderId }),
          })
          const result = await response.json()

          if (result.success) {
            setDepositMessage({ type: 'success', text: 'PayPal payment successful! Your wallet has been credited.' })
            // Refresh wallet balance
            queryClient.invalidateQueries({ queryKey: ['wallet'] })
            queryClient.invalidateQueries({ queryKey: ['deposits'] })
          } else {
            setDepositMessage({ type: 'error', text: result.error || 'Failed to complete PayPal payment' })
          }
        } catch (err) {
          console.error('PayPal capture error:', err)
          setDepositMessage({ type: 'error', text: 'Failed to complete PayPal payment. Please contact support.' })
        }

        // Clear URL params after handling
        window.history.replaceState({}, '', '/profile/wallet')
      } else if (deposit === 'cancelled') {
        setDepositMessage({ type: 'error', text: 'Payment was cancelled.' })
        window.history.replaceState({}, '', '/profile/wallet')
      } else if (deposit === 'success') {
        setDepositMessage({ type: 'success', text: 'Payment completed successfully!' })
        queryClient.invalidateQueries({ queryKey: ['wallet'] })
        queryClient.invalidateQueries({ queryKey: ['deposits'] })
        window.history.replaceState({}, '', '/profile/wallet')
      }
    }

    handlePayPalCapture()
  }, [searchParams, queryClient])

  // Fetch wallet balance
  const { data: walletData, isLoading: walletLoading, isError: walletError } = useQuery({
    queryKey: ['wallet', 'balance'],
    queryFn: async () => {
      const result = await getBalance()
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load wallet balance')
      }
      return result.data
    }
  })

  // Fetch transaction history
  const { data: transactionsData, isLoading: transactionsLoading, isError: transactionsError } = useQuery({
    queryKey: ['wallet', 'transactions', filter, txPage],
    queryFn: async () => {
      const type = filter === 'all' ? undefined : filter === 'DEPOSIT' ? 'CREDIT' : filter as any
      const result = await getTransactionHistory(txPage, 10, type)
      if (!result.success) {
        throw new Error(result.error || 'Failed to load transactions')
      }
      // Railway returns { data: [array], pagination: {...} } at top level
      const transactions = Array.isArray(result.data) ? result.data : (result.data?.transactions || [])
      const pagination = result.pagination || result.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }
      return { transactions, pagination }
    },
    staleTime: 2 * 60 * 1000,
  })

  // Fetch deposit history
  const { data: depositsData, isLoading: depositsLoading, isError: depositsError, refetch: refetchDeposits } = useQuery({
    queryKey: ['deposits', 'my', depositPage, depositFilter],
    queryFn: async () => {
      const result = await getMyDeposits(depositPage, 10, depositFilter === 'all' ? undefined : depositFilter)
      if (!result.success) {
        throw new Error(result.error || 'Failed to load deposits')
      }
      // Railway returns { data: [array], pagination: {...} } at top level
      const deposits = Array.isArray(result.data) ? result.data : (result.data?.deposits || [])
      const pagination = result.pagination || result.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }
      return { deposits, pagination }
    },
    enabled: activeTab === 'deposits',
    staleTime: 2 * 60 * 1000,
  })

  // Clean up transaction descriptions — Railway uses raw enum values as fallback
  const formatDescription = (desc: string) => {
    return desc
      .replace(/via CARD/i, 'via Stripe')
      .replace(/via CRYPTO_BTC/i, 'via Bitcoin')
      .replace(/via CRYPTO_ETH/i, 'via Ethereum')
      .replace(/via CRYPTO_USDT/i, 'via USDT')
      .replace(/via BANK_TRANSFER/i, 'via Bank Transfer')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'CREDIT': return { icon: 'money-receive', color: 'text-green-500' }
      case 'DEPOSIT': return { icon: 'money-receive', color: 'text-green-500' }
      case 'DEBIT': return { icon: 'money-send', color: 'text-red-500' }
      case 'REFUND': return { icon: 'refresh', color: 'text-blue-500' }
      case 'ADJUSTMENT': return { icon: 'adjustments', color: 'text-yellow-500' }
      default: return { icon: 'currency-dollar', color: 'text-slate-500' }
    }
  }

  const getTransactionBadge = (type: string) => {
    const configs: Record<string, { label: string; color: string }> = {
      CREDIT: { label: 'Credit', color: 'text-green-500 bg-green-500/10 border-green-500/20' },
      DEPOSIT: { label: 'Deposit', color: 'text-green-500 bg-green-500/10 border-green-500/20' },
      DEBIT: { label: 'Debit', color: 'text-red-500 bg-red-500/10 border-red-500/20' },
      REFUND: { label: 'Refund', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
      ADJUSTMENT: { label: 'Adjustment', color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' },
    }
    const config = configs[type]
    if (!config) return null
    return (
      <span className={`px-2 py-1 rounded text-xs font-bold border ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const handleDepositModalClose = () => {
    setShowDepositModal(false)
    setResumeDeposit(null)
    queryClient.invalidateQueries({ queryKey: ['wallet'] })
    queryClient.invalidateQueries({ queryKey: ['deposits'] })
  }

  const handleResumeDeposit = (deposit: Deposit) => {
    if (!deposit.cryptoNetwork || !deposit.cryptoAddress) return
    const expiresAt = new Date(deposit.createdAt).getTime() + 45 * 60 * 1000
    const timeRemaining = Math.max(0, expiresAt - Date.now())
    if (timeRemaining <= 0) return
    setResumeDeposit({
      depositId: deposit.id,
      network: deposit.cryptoNetwork,
      amount: Number(deposit.amount),
      timeRemaining,
      cryptoAddress: deposit.cryptoAddress,
    })
    setShowDepositModal(true)
  }

  const handleCancelDeposit = async (depositId: string) => {
    setCancellingId(depositId)
    try {
      const result = await cancelDeposit(depositId)
      if (result.success) {
        refetchDeposits()
      } else {
        setDepositMessage({ type: 'error', text: result.error || 'Failed to cancel deposit' })
      }
    } catch {
      setDepositMessage({ type: 'error', text: 'Failed to cancel deposit' })
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <ProfileLayout>
      {/* Deposit modal */}
      <DepositModal
        isOpen={showDepositModal}
        onClose={handleDepositModalClose}
        resumeDeposit={resumeDeposit ?? undefined}
        onBackToWallet={() => {
          setActiveTab('deposits')
          queryClient.invalidateQueries({ queryKey: ['wallet'] })
          queryClient.invalidateQueries({ queryKey: ['deposits'] })
        }}
      />

      {/* Header */}
      <div className="mb-10 pb-6 border-b border-border-dark">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Wallet & Credits</h1>
        <p className="text-slate-400">
          Manage your balance and track transactions.
        </p>
      </div>

      {/* Deposit Status Message */}
      {depositMessage && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
          depositMessage.type === 'success'
            ? 'bg-green-500/10 border border-green-500/20 text-green-500'
            : 'bg-red-500/10 border border-red-500/20 text-red-500'
        }`}>
          <Icon name={depositMessage.type === 'success' ? 'check-circle' : 'x-circle'} size={20} />
          <span className="text-sm font-medium">{depositMessage.text}</span>
          <button
            onClick={() => setDepositMessage(null)}
            className="ml-auto text-slate-500 hover:text-white"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {/* Balance Card */}
      <div className="mb-12">
        <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-2xl p-5 sm:p-8 relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-8 -top-8 w-64 h-64 bg-white rounded-full blur-3xl" />
            <div className="absolute -left-8 -bottom-8 w-64 h-64 bg-white rounded-full blur-3xl" />
          </div>

          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-black/20 flex items-center justify-center">
                  <Icon name="wallet" size={24} className="text-black" />
                </div>
                <div>
                  <p className="text-black/70 text-sm font-medium">Available Balance</p>
                  <p className="text-xs text-black/50">Use at checkout</p>
                </div>
              </div>
              <button
                onClick={() => setShowDepositModal(true)}
                className="w-full sm:w-auto justify-center px-4 py-2 sm:px-5 sm:py-2.5 bg-black text-primary font-bold rounded-xl hover:bg-black/90 transition-all flex items-center gap-2 text-sm"
              >
                <Icon name="plus" size={18} />
                Add Money
              </button>
            </div>

            {walletLoading ? (
              <div className="h-16 bg-black/10 animate-pulse rounded-lg mb-6" />
            ) : walletError ? (
              <p className="text-black/60 text-lg font-medium mb-6">Unable to load balance</p>
            ) : (
              <p className="text-3xl sm:text-5xl font-bold text-black mb-6">
                {formatPrice(walletData?.balance || 0)}
              </p>
            )}

            <div className="flex gap-3">
              <Link
                href="/profile/referrals"
                className="px-4 py-2.5 sm:px-6 sm:py-3 bg-black/20 text-black font-medium rounded-xl hover:bg-black/30 transition-all flex items-center gap-2"
              >
                <Icon name="gift" size={20} />
                Earn via Referrals
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-surface-dark rounded-xl p-1">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'transactions'
              ? 'bg-primary text-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Transaction History
        </button>
        <button
          onClick={() => setActiveTab('deposits')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'deposits'
              ? 'bg-primary text-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Deposit History
        </button>
      </div>

      {/* Transaction History */}
      {activeTab === 'transactions' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Icon name="clock" size={20} className="text-primary" />
              Transaction History
            </h3>

            {/* Filter */}
            <div className="flex gap-2 flex-wrap">
              {(['all', 'DEPOSIT', 'DEBIT', 'REFUND', 'ADJUSTMENT'] as TransactionFilter[]).map((type) => (
                <button
                  key={type}
                  onClick={() => { setFilter(type); setTxPage(1) }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filter === type
                      ? 'bg-primary text-black'
                      : 'bg-surface-dark text-slate-400 hover:bg-border-dark'
                  }`}
                >
                  {type === 'all' ? 'All' : type === 'DEPOSIT' ? 'Credits' : type.charAt(0) + type.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {transactionsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-surface-dark animate-pulse rounded-xl" />
              ))}
            </div>
          ) : transactionsError ? (
            <div className="bg-black border border-border-dark rounded-2xl p-12 text-center">
              <p className="text-slate-500">Unable to load transaction history. Please try again later.</p>
            </div>
          ) : transactionsData?.transactions && transactionsData.transactions.length > 0 ? (
            <div className="space-y-3">
              {transactionsData.transactions.map((transaction) => {
                const { icon, color } = getTransactionIcon(transaction.type)
                const isCredit = transaction.type === 'CREDIT' || transaction.type === 'DEPOSIT' || transaction.type === 'REFUND'
                  || (transaction.type === 'ADJUSTMENT' && Number(transaction.amount) > 0)

                return (
                  <div
                    key={transaction.id}
                    className="bg-black border border-border-dark rounded-xl p-4 sm:p-6 hover:border-border-dark/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-0">
                      <div className="flex items-start gap-3 sm:gap-4 flex-1">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-surface-dark flex items-center justify-center ${color}`}>
                          <Icon name={icon as any} size={24} />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="text-white font-medium">{formatDescription(transaction.description)}</p>
                            {getTransactionBadge(transaction.type)}
                          </div>

                          <p className="text-slate-500 text-sm mb-2">
                            {formatDate(transaction.createdAt)}
                          </p>

                          {transaction.order && (
                            <Link
                              href={`/profile/orders/${transaction.order.id}`}
                              className="text-primary text-sm hover:underline flex items-center gap-1"
                            >
                              Order #{transaction.order.orderNumber}
                              <Icon name="arrow-right" size={14} />
                            </Link>
                          )}

                          {transaction.referral && (
                            <p className="text-slate-500 text-sm">
                              {transaction.description.toLowerCase().includes('welcome bonus')
                                ? `Referred by: ${transaction.referral.referrer?.name || transaction.referral.referrer?.email || 'Unknown'}`
                                : `Referral: ${transaction.referral.referee?.name || transaction.referral.referee?.email || 'Unknown'}`
                              }
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={`text-lg sm:text-2xl font-bold ${isCredit ? 'text-green-500' : 'text-red-500'}`}>
                          {isCredit ? '+' : '-'}{formatPrice(Math.abs(Number(transaction.amount)))}
                        </p>
                        <p className="text-slate-500 text-sm mt-1">
                          Balance: {formatPrice(Number(transaction.balanceAfter))}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Pagination */}
              {transactionsData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6">
                  <button
                    onClick={() => setTxPage(p => Math.max(1, p - 1))}
                    disabled={txPage <= 1}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-surface-dark text-slate-400 hover:bg-border-dark disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-slate-400 text-sm">
                    Page {txPage} of {transactionsData.pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setTxPage(p => Math.min(transactionsData.pagination.totalPages, p + 1))}
                    disabled={txPage >= transactionsData.pagination.totalPages}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-surface-dark text-slate-400 hover:bg-border-dark disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-black border border-border-dark rounded-2xl p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-dark flex items-center justify-center mx-auto mb-4">
                <Icon name="clock" size={32} className="text-slate-600" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">No transactions yet</h4>
              <p className="text-slate-500 mb-6">
                Your wallet transactions will appear here.
              </p>
              <button
                onClick={() => setShowDepositModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black font-bold rounded-xl hover:brightness-105 transition-all"
              >
                <Icon name="plus" size={20} />
                Add Money
              </button>
            </div>
          )}
        </div>
      )}

      {/* Deposit History */}
      {activeTab === 'deposits' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Icon name="money-receive" size={20} className="text-primary" />
              Deposit History
            </h3>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => { setDepositFilter(s); setDepositPage(1) }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    depositFilter === s
                      ? 'bg-primary text-black'
                      : 'bg-surface-dark text-slate-400 hover:bg-border-dark'
                  }`}
                >
                  {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {depositsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-surface-dark animate-pulse rounded-xl" />
              ))}
            </div>
          ) : depositsError ? (
            <div className="bg-black border border-border-dark rounded-2xl p-12 text-center">
              <p className="text-slate-500">Unable to load deposit history. Please try again later.</p>
            </div>
          ) : depositsData?.deposits && depositsData.deposits.length > 0 ? (
            <div className="space-y-3">
              {depositsData.deposits.map((deposit: Deposit) => {
                const isCryptoWindowExpired = deposit.status === 'PENDING'
                  && deposit.paymentMethod.startsWith('CRYPTO')
                  && Date.now() > new Date(deposit.createdAt).getTime() + 45 * 60 * 1000
                const statusConfig = depositStatusConfig[isCryptoWindowExpired ? 'EXPIRED' : deposit.status] || depositStatusConfig.PENDING
                const methodLabel = depositMethodLabels[deposit.paymentMethod] || deposit.paymentMethod

                return (
                  <div
                    key={deposit.id}
                    className="bg-black border border-border-dark rounded-xl p-4 sm:p-5 hover:border-border-dark/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Icon name="money-receive" size={20} className="text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-white font-medium">{methodLabel} Deposit</p>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${statusConfig.color}`}>
                              {statusConfig.label}
                            </span>
                          </div>
                          <p className="text-slate-500 text-sm">{formatDate(deposit.createdAt)}</p>
                          {deposit.status === 'PENDING' && deposit.paymentMethod === 'BANK_TRANSFER' && (
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-yellow-500 text-xs">Awaiting admin verification</p>
                              <button
                                onClick={() => handleCancelDeposit(deposit.id)}
                                disabled={cancellingId === deposit.id}
                                className="text-xs text-red-400 hover:text-red-300 underline disabled:opacity-50"
                              >
                                {cancellingId === deposit.id ? 'Cancelling...' : 'Cancel'}
                              </button>
                            </div>
                          )}
                          {deposit.status === 'PENDING' && deposit.paymentMethod.startsWith('CRYPTO') && (() => {
                            const expiresAt = new Date(deposit.createdAt).getTime() + 45 * 60 * 1000
                            const remaining = Math.max(0, expiresAt - Date.now())
                            const mins = Math.floor(remaining / 60000)
                            const secs = Math.floor((remaining % 60000) / 1000)
                            const timeLabel = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                            return (
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                {remaining > 0 ? (
                                  <>
                                    <button
                                      onClick={() => handleResumeDeposit(deposit)}
                                      className="text-xs text-primary font-medium hover:brightness-110"
                                    >
                                      ▶ Resume Payment ({timeLabel})
                                    </button>
                                    <button
                                      onClick={() => handleCancelDeposit(deposit.id)}
                                      disabled={cancellingId === deposit.id}
                                      className="text-xs text-red-400 hover:text-red-300 underline disabled:opacity-50"
                                    >
                                      {cancellingId === deposit.id ? 'Cancelling...' : 'Cancel'}
                                    </button>
                                  </>
                                ) : (
                                  <p className="text-slate-500 text-xs">Payment window expired</p>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-lg sm:text-2xl font-bold text-green-500">
                          +{formatPrice(Number(deposit.amount))}
                        </p>
                        {deposit.completedAt && (
                          <p className="text-slate-500 text-xs mt-1">
                            Completed {formatDate(deposit.completedAt)}
                          </p>
                        )}
                        {deposit.failureReason && (
                          <p className="text-red-500 text-xs mt-1">{deposit.failureReason}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Pagination */}
              {depositsData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6">
                  <button
                    onClick={() => setDepositPage(p => Math.max(1, p - 1))}
                    disabled={depositPage <= 1}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-surface-dark text-slate-400 hover:bg-border-dark disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-slate-400 text-sm">
                    Page {depositPage} of {depositsData.pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setDepositPage(p => Math.min(depositsData.pagination.totalPages, p + 1))}
                    disabled={depositPage >= depositsData.pagination.totalPages}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-surface-dark text-slate-400 hover:bg-border-dark disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-black border border-border-dark rounded-2xl p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-dark flex items-center justify-center mx-auto mb-4">
                <Icon name="money-receive" size={32} className="text-slate-600" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">No deposits yet</h4>
              <p className="text-slate-500 mb-6">
                Add money to your wallet using your preferred payment method.
              </p>
              <button
                onClick={() => setShowDepositModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black font-bold rounded-xl hover:brightness-105 transition-all"
              >
                <Icon name="plus" size={20} />
                Add Money
              </button>
            </div>
          )}
        </div>
      )}
    </ProfileLayout>
  )
}

export default function WalletPage() {
  return (
    <Suspense fallback={
      <ProfileLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-surface-dark rounded-xl" />
          <div className="h-64 bg-surface-dark rounded-xl" />
        </div>
      </ProfileLayout>
    }>
      <WalletPageContent />
    </Suspense>
  )
}
