'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ProfileLayout from '@/components/profile/ProfileLayout'
import Icon from '@/components/ui/Icon'
import { getBalance, getTransactionHistory } from '@/lib/api/wallet'
import { formatCurrency } from '@/lib/currency'
import Link from 'next/link'

type TransactionFilter = 'all' | 'CREDIT' | 'DEBIT' | 'REFUND' | 'ADJUSTMENT'

export default function WalletPage() {
  const [filter, setFilter] = useState<TransactionFilter>('all')

  // Fetch wallet balance
  const { data: walletData, isLoading: walletLoading } = useQuery({
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
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['wallet', 'transactions', filter],
    queryFn: async () => {
      const type = filter === 'all' ? undefined : filter
      const result = await getTransactionHistory(1, 50, type)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load transactions')
      }
      return result.data
    }
  })

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
      case 'CREDIT':
        return { icon: 'arrow-down-circle', color: 'text-green-500' }
      case 'DEBIT':
        return { icon: 'arrow-up-circle', color: 'text-red-500' }
      case 'REFUND':
        return { icon: 'refresh', color: 'text-blue-500' }
      case 'ADJUSTMENT':
        return { icon: 'adjustments', color: 'text-yellow-500' }
      default:
        return { icon: 'currency-dollar', color: 'text-slate-500' }
    }
  }

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'CREDIT':
        return (
          <span className="text-green-500 bg-green-500/10 px-2 py-1 rounded text-xs font-bold border border-green-500/20">
            Credit
          </span>
        )
      case 'DEBIT':
        return (
          <span className="text-red-500 bg-red-500/10 px-2 py-1 rounded text-xs font-bold border border-red-500/20">
            Debit
          </span>
        )
      case 'REFUND':
        return (
          <span className="text-blue-500 bg-blue-500/10 px-2 py-1 rounded text-xs font-bold border border-blue-500/20">
            Refund
          </span>
        )
      case 'ADJUSTMENT':
        return (
          <span className="text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded text-xs font-bold border border-yellow-500/20">
            Adjustment
          </span>
        )
      default:
        return null
    }
  }

  return (
    <ProfileLayout>
      {/* Header */}
      <div className="mb-10 pb-6 border-b border-border-dark">
        <h1 className="text-3xl font-bold text-white mb-2">Wallet</h1>
        <p className="text-slate-400">
          Manage your account balance and view transaction history.
        </p>
      </div>

      {/* Balance Card */}
      <div className="mb-12">
        <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-2xl p-8 relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-8 -top-8 w-64 h-64 bg-white rounded-full blur-3xl" />
            <div className="absolute -left-8 -bottom-8 w-64 h-64 bg-white rounded-full blur-3xl" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-black/20 flex items-center justify-center">
                <Icon name="wallet" size={24} className="text-black" />
              </div>
              <div>
                <p className="text-black/70 text-sm font-medium">Available Balance</p>
                <p className="text-xs text-black/50">Use at checkout or withdraw</p>
              </div>
            </div>

            {walletLoading ? (
              <div className="h-16 bg-black/10 animate-pulse rounded-lg mb-6" />
            ) : (
              <p className="text-5xl font-bold text-black mb-6">
                {formatCurrency(walletData?.balance || 0)}
              </p>
            )}

            <div className="flex gap-3">
              <Link
                href="/profile/referrals"
                className="px-6 py-3 bg-black text-primary font-bold rounded-xl hover:bg-black/90 transition-all flex items-center gap-2"
              >
                <Icon name="gift" size={20} />
                Earn More
              </Link>
              <button
                className="px-6 py-3 bg-black/20 text-black font-medium rounded-xl hover:bg-black/30 transition-all flex items-center gap-2"
                disabled
              >
                <Icon name="arrow-up-tray" size={20} />
                Withdraw
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* How to Earn */}
      <div className="mb-12">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Icon name="light-bulb" size={20} className="text-primary" />
          Ways to Earn Credit
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/profile/referrals"
            className="bg-black border border-border-dark rounded-2xl p-6 hover:border-primary/50 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
              <Icon name="user-group" size={24} />
            </div>
            <h4 className="font-bold text-white mb-2">Refer Friends</h4>
            <p className="text-slate-500 text-sm mb-3">
              Earn $10 for each friend who makes a purchase.
            </p>
            <span className="text-primary text-sm font-medium flex items-center gap-1">
              Start referring
              <Icon name="arrow-right" size={16} />
            </span>
          </Link>

          <div className="bg-black border border-border-dark rounded-2xl p-6 opacity-50">
            <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-slate-500 mb-4">
              <Icon name="star" size={24} />
            </div>
            <h4 className="font-bold text-slate-400 mb-2">Write Reviews</h4>
            <p className="text-slate-600 text-sm mb-3">
              Earn credits by writing helpful product reviews.
            </p>
            <span className="text-slate-600 text-sm font-medium">Coming soon</span>
          </div>

          <div className="bg-black border border-border-dark rounded-2xl p-6 opacity-50">
            <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-slate-500 mb-4">
              <Icon name="trophy" size={24} />
            </div>
            <h4 className="font-bold text-slate-400 mb-2">Contests & Events</h4>
            <p className="text-slate-600 text-sm mb-3">
              Participate in special events to win credits.
            </p>
            <span className="text-slate-600 text-sm font-medium">Coming soon</span>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Icon name="clock" size={20} className="text-primary" />
            Transaction History
          </h3>

          {/* Filter */}
          <div className="flex gap-2">
            {(['all', 'CREDIT', 'DEBIT', 'REFUND', 'ADJUSTMENT'] as TransactionFilter[]).map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === type
                    ? 'bg-primary text-black'
                    : 'bg-surface-dark text-slate-400 hover:bg-border-dark'
                }`}
              >
                {type === 'all' ? 'All' : type.charAt(0) + type.slice(1).toLowerCase()}
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
        ) : transactionsData && transactionsData.transactions.length > 0 ? (
          <div className="space-y-3">
            {transactionsData.transactions.map((transaction) => {
              const { icon, color } = getTransactionIcon(transaction.type)
              const isCredit = transaction.type === 'CREDIT' || transaction.type === 'REFUND'

              return (
                <div
                  key={transaction.id}
                  className="bg-black border border-border-dark rounded-xl p-6 hover:border-border-dark/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-full bg-surface-dark flex items-center justify-center ${color}`}>
                        <Icon name={icon as any} size={24} />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="text-white font-medium">{transaction.description}</p>
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
                            Referral: {transaction.referral.referee.name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`text-2xl font-bold ${isCredit ? 'text-green-500' : 'text-red-500'}`}>
                        {isCredit ? '+' : '-'}{formatCurrency(Math.abs(Number(transaction.amount)))}
                      </p>
                      <p className="text-slate-500 text-sm mt-1">
                        Balance: {formatCurrency(Number(transaction.balanceAfter))}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
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
            <Link
              href="/profile/referrals"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black font-bold rounded-xl hover:brightness-105 transition-all"
            >
              <Icon name="gift" size={20} />
              Start Earning
            </Link>
          </div>
        )}
      </div>
    </ProfileLayout>
  )
}
