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
  const filteredReferrals = (referralsData?.referrals || []).filter((referral) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      referral.referrer.name.toLowerCase().includes(query) ||
      referral.referrer.email.toLowerCase().includes(query) ||
      referral.referee.name.toLowerCase().includes(query) ||
      referral.referee.email.toLowerCase().includes(query)
    )
  })

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1">Referral Management</h1>
        <p className="text-slate-500 text-xs sm:text-sm">View and manage all referrals, track analytics, and handle fraud cases</p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Total Referrals</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Icon name="user-group" size={16} />
            </div>
          </div>
          {analyticsLoading ? (
            <div className="h-7 bg-[#1a1a1a] animate-pulse rounded" />
          ) : (
            <p className="text-white text-lg lg:text-2xl font-bold">{analyticsData?.totalReferrals || 0}</p>
          )}
        </div>

        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Pending</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-yellow-500/10 text-yellow-500 flex items-center justify-center">
              <Icon name="clock" size={16} />
            </div>
          </div>
          {analyticsLoading ? (
            <div className="h-7 bg-[#1a1a1a] animate-pulse rounded" />
          ) : (
            <p className="text-white text-lg lg:text-2xl font-bold">{analyticsData?.pendingReferrals || 0}</p>
          )}
        </div>

        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Completed</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center">
              <Icon name="check-circle" size={16} />
            </div>
          </div>
          {analyticsLoading ? (
            <div className="h-7 bg-[#1a1a1a] animate-pulse rounded" />
          ) : (
            <p className="text-white text-lg lg:text-2xl font-bold">
              {(analyticsData?.completedReferrals || 0) + (analyticsData?.rewardedReferrals || 0)}
            </p>
          )}
        </div>

        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Rewards Paid</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Icon name="wallet" size={16} />
            </div>
          </div>
          {analyticsLoading ? (
            <div className="h-7 bg-[#1a1a1a] animate-pulse rounded" />
          ) : (
            <p className="text-primary text-lg lg:text-2xl font-bold">
              {formatCurrency(analyticsData?.totalRewardsPaid || 0)}
            </p>
          )}
        </div>
      </div>

      {/* Conversion Rate */}
      {analyticsData && analyticsData.totalReferrals > 0 && (
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm flex items-center gap-2">
              <Icon name="chart" size={14} className="text-primary" />
              Conversion Rate
            </p>
            <span className="text-lg lg:text-2xl font-bold text-primary">
              {analyticsData.conversionRate.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-[#1a1a1a] rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{ width: `${analyticsData.conversionRate}%` }}
            />
          </div>
          <p className="text-slate-500 text-xs mt-2">
            {analyticsData.completedReferrals + analyticsData.rewardedReferrals} of {analyticsData.totalReferrals} referrals have made their first purchase
          </p>
        </div>
      )}

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <div className="relative">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:border-primary/50 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {(['all', 'PENDING', 'COMPLETED', 'REWARDED', 'CANCELLED'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                filter === status
                  ? 'bg-primary text-black'
                  : 'bg-[#1a1a1a] text-slate-400 hover:text-white border border-[#2a2a2a]'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Referrals Table */}
      {referralsLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-[#1a1a1a] animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredReferrals.length > 0 ? (
        <>
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase bg-[#0a0a0a] text-slate-400 border-b border-[#1f1f1f]">
                  <tr>
                    <th className="px-3 sm:px-4 py-3 font-medium">Referrer</th>
                    <th className="px-3 sm:px-4 py-3 font-medium">Referee</th>
                    <th className="px-3 sm:px-4 py-3 font-medium hidden md:table-cell">Signup Date</th>
                    <th className="px-3 sm:px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-3 sm:px-4 py-3 font-medium text-right hidden sm:table-cell">First Order</th>
                    <th className="px-3 sm:px-4 py-3 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f1f]">
                  {filteredReferrals.map((referral) => (
                    <tr key={referral.id} className="hover:bg-[#1a1a1a] transition-colors">
                      <td className="px-3 sm:px-4 py-3">
                        <div>
                          <div className="text-white text-sm font-medium">{referral.referrer.name}</div>
                          <div className="text-xs text-slate-500 truncate max-w-[120px] sm:max-w-none">{referral.referrer.email}</div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        <div>
                          <div className="text-white text-sm font-medium">{referral.referee.name}</div>
                          <div className="text-xs text-slate-500 truncate max-w-[120px] sm:max-w-none">{referral.referee.email}</div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-slate-400 text-xs hidden md:table-cell">{formatDate(referral.createdAt)}</td>
                      <td className="px-3 sm:px-4 py-3 text-center">
                        {getStatusBadge(referral.status)}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-right hidden sm:table-cell">
                        {referral.firstOrder ? (
                          <div>
                            <div className="text-white text-sm font-mono">{formatCurrency(Number(referral.firstOrder.total))}</div>
                            <div className="text-xs text-slate-500">#{referral.firstOrder.orderNumber}</div>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-center">
                        {referral.status === 'PENDING' || referral.status === 'COMPLETED' ? (
                          cancellingId === referral.id ? (
                            <div className="flex gap-2 items-center justify-center">
                              <input
                                type="text"
                                placeholder="Reason..."
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-white text-xs w-20 sm:w-24"
                              />
                              <button
                                onClick={() => handleCancelReferral(referral.id)}
                                className="text-red-500 hover:text-red-400"
                              >
                                <Icon name="check" size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  setCancellingId(null)
                                  setCancelReason('')
                                }}
                                className="text-slate-500 hover:text-slate-400"
                              >
                                <Icon name="close" size={14} />
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
          </div>

          {/* Pagination */}
          {referralsData && referralsData.pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-slate-500 text-xs sm:text-sm">
                Page {page} of {referralsData.pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon name="arrow-left" size={14} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(referralsData.pagination.totalPages, p + 1))}
                  disabled={page === referralsData.pagination.totalPages}
                  className="px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon name="arrow-right" size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-8 sm:p-12 text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-4">
            <Icon name="user-group" size={24} className="text-slate-600" />
          </div>
          <h4 className="text-sm sm:text-base font-bold text-white mb-2">No referrals found</h4>
          <p className="text-slate-500 text-xs sm:text-sm">
            {searchQuery ? 'Try adjusting your search query.' : 'Referrals will appear here when users sign up using referral codes.'}
          </p>
        </div>
      )}
    </AdminLayout>
  )
}
