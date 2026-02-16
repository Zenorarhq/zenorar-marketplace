'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { getAllReferrals, getReferralAnalytics, cancelReferral } from '@/lib/api/referrals'
import { formatCurrency } from '@/lib/currency'

type StatusFilter = 'all' | 'PENDING' | 'COMPLETED' | 'REWARDED' | 'CANCELLED'

export default function AdminReferralsPage() {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const limit = 20

  // Fetch analytics
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['admin', 'referrals', 'analytics'],
    queryFn: async () => {
      const result = await getReferralAnalytics()
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load analytics')
      }
      return result.data
    }
  })

  // Fetch referrals
  const { data: referralsData, isLoading: referralsLoading, refetch } = useQuery({
    queryKey: ['admin', 'referrals', page, filter],
    queryFn: async () => {
      const status = filter === 'all' ? undefined : filter
      const result = await getAllReferrals(page, limit, status)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load referrals')
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'REWARDED':
        return (
          <span className="text-primary bg-primary/10 px-2 py-1 rounded text-xs font-bold border border-primary/20">
            {status === 'REWARDED' ? 'Rewarded' : 'Completed'}
          </span>
        )
      case 'PENDING':
        return (
          <span className="text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded text-xs font-bold border border-yellow-500/20">
            Pending
          </span>
        )
      case 'CANCELLED':
        return (
          <span className="text-red-500 bg-red-500/10 px-2 py-1 rounded text-xs font-bold border border-red-500/20">
            Cancelled
          </span>
        )
      default:
        return (
          <span className="text-slate-500 bg-slate-500/10 px-2 py-1 rounded text-xs font-bold border border-slate-500/20">
            {status}
          </span>
        )
    }
  }

  const handleCancelReferral = async (referralId: string) => {
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation')
      return
    }

    if (!confirm('Are you sure you want to cancel this referral? This action cannot be undone.')) {
      return
    }

    try {
      const result = await cancelReferral(referralId, cancelReason)
      if (result.success) {
        alert('Referral cancelled successfully')
        setCancellingId(null)
        setCancelReason('')
        refetch()
      } else {
        alert(result.error || 'Failed to cancel referral')
      }
    } catch (error) {
      alert('Failed to cancel referral')
    }
  }

  // Filter referrals by search query
  const filteredReferrals = referralsData?.referrals.filter((referral) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      referral.referrer.name.toLowerCase().includes(query) ||
      referral.referrer.email.toLowerCase().includes(query) ||
      referral.referee.name.toLowerCase().includes(query) ||
      referral.referee.email.toLowerCase().includes(query)
    )
  }) || []

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-10 pb-6 border-b border-border-dark">
        <h1 className="text-3xl font-bold text-white mb-2">Referral Management</h1>
        <p className="text-slate-400">
          View and manage all referrals, track analytics, and handle fraud cases.
        </p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-black border border-border-dark rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Icon name="user-group" size={20} />
            </div>
            <span className="text-slate-400 text-sm">Total Referrals</span>
          </div>
          {analyticsLoading ? (
            <div className="h-9 bg-surface-dark animate-pulse rounded" />
          ) : (
            <p className="text-3xl font-bold text-white">{analyticsData?.totalReferrals || 0}</p>
          )}
        </div>

        <div className="bg-black border border-border-dark rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500">
              <Icon name="clock" size={20} />
            </div>
            <span className="text-slate-400 text-sm">Pending</span>
          </div>
          {analyticsLoading ? (
            <div className="h-9 bg-surface-dark animate-pulse rounded" />
          ) : (
            <p className="text-3xl font-bold text-white">{analyticsData?.pendingReferrals || 0}</p>
          )}
        </div>

        <div className="bg-black border border-border-dark rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Icon name="check-circle" size={20} />
            </div>
            <span className="text-slate-400 text-sm">Completed</span>
          </div>
          {analyticsLoading ? (
            <div className="h-9 bg-surface-dark animate-pulse rounded" />
          ) : (
            <p className="text-3xl font-bold text-white">
              {(analyticsData?.completedReferrals || 0) + (analyticsData?.rewardedReferrals || 0)}
            </p>
          )}
        </div>

        <div className="bg-black border border-border-dark rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Icon name="wallet" size={20} />
            </div>
            <span className="text-slate-400 text-sm">Rewards Paid</span>
          </div>
          {analyticsLoading ? (
            <div className="h-9 bg-surface-dark animate-pulse rounded" />
          ) : (
            <p className="text-3xl font-bold text-primary">
              {formatCurrency(analyticsData?.totalRewardsPaid || 0)}
            </p>
          )}
        </div>
      </div>

      {/* Conversion Rate */}
      {analyticsData && analyticsData.totalReferrals > 0 && (
        <div className="bg-black border border-border-dark rounded-2xl p-6 mb-12">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <Icon name="chart" size={20} className="text-primary" />
              Conversion Rate
            </h3>
            <span className="text-3xl font-bold text-primary">
              {analyticsData.conversionRate.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-surface-dark rounded-full h-3 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{ width: `${analyticsData.conversionRate}%` }}
            />
          </div>
          <p className="text-slate-500 text-sm mt-2">
            {analyticsData.completedReferrals + analyticsData.rewardedReferrals} of {analyticsData.totalReferrals} referrals have made their first purchase
          </p>
        </div>
      )}

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
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
        <div className="flex gap-2">
          {(['all', 'PENDING', 'COMPLETED', 'REWARDED', 'CANCELLED'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-primary text-black'
                  : 'bg-surface-dark text-slate-400 hover:bg-border-dark'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Referrals Table */}
      {referralsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-surface-dark animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filteredReferrals.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border-dark">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="text-xs uppercase bg-black text-slate-200">
                <tr>
                  <th className="px-6 py-4 font-bold">Referrer</th>
                  <th className="px-6 py-4 font-bold">Referee</th>
                  <th className="px-6 py-4 font-bold">Signup Date</th>
                  <th className="px-6 py-4 font-bold text-center">Status</th>
                  <th className="px-6 py-4 font-bold text-right">First Order</th>
                  <th className="px-6 py-4 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-dark bg-black/20">
                {filteredReferrals.map((referral) => (
                  <tr key={referral.id} className="hover:bg-black/40 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-white font-medium">{referral.referrer.name}</div>
                        <div className="text-xs text-slate-500">{referral.referrer.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-white font-medium">{referral.referee.name}</div>
                        <div className="text-xs text-slate-500">{referral.referee.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{formatDate(referral.createdAt)}</td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(referral.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {referral.firstOrder ? (
                        <div>
                          <div className="text-white font-mono">{formatCurrency(Number(referral.firstOrder.total))}</div>
                          <div className="text-xs text-slate-500">#{referral.firstOrder.orderNumber}</div>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {referral.status === 'PENDING' || referral.status === 'COMPLETED' ? (
                        cancellingId === referral.id ? (
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              placeholder="Reason..."
                              value={cancelReason}
                              onChange={(e) => setCancelReason(e.target.value)}
                              className="bg-surface-dark border border-border-dark rounded px-2 py-1 text-white text-xs"
                            />
                            <button
                              onClick={() => handleCancelReferral(referral.id)}
                              className="text-red-500 hover:text-red-400"
                            >
                              <Icon name="check" size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setCancellingId(null)
                                setCancelReason('')
                              }}
                              className="text-slate-500 hover:text-slate-400"
                            >
                              <Icon name="close" size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setCancellingId(referral.id)}
                            className="text-red-500 hover:text-red-400 text-xs font-medium"
                          >
                            Cancel
                          </button>
                        )
                      ) : (
                        <span className="text-slate-600 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {referralsData && referralsData.pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-slate-400 text-sm">
                Showing page {page} of {referralsData.pagination.totalPages}
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
                  onClick={() => setPage(p => Math.min(referralsData.pagination.totalPages, p + 1))}
                  disabled={page === referralsData.pagination.totalPages}
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
            <Icon name="user-group" size={32} className="text-slate-600" />
          </div>
          <h4 className="text-lg font-bold text-white mb-2">No referrals found</h4>
          <p className="text-slate-500">
            {searchQuery ? 'Try adjusting your search query.' : 'Referrals will appear here when users sign up using referral codes.'}
          </p>
        </div>
      )}
    </AdminLayout>
  )
}
