'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ProfileLayout from '@/components/profile/ProfileLayout'
import Icon from '@/components/ui/Icon'
import { getMyReferrals, getReferralHistory } from '@/lib/api/referrals'
import { formatCurrency } from '@/lib/currency'
import { apiFetch } from '@/lib/api/client'

export default function ReferralsPage() {
  const [copied, setCopied] = useState(false)
  const [filter, setFilter] = useState<string>('all')

  // Fetch public settings for reward amounts
  const { data: publicSettings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => {
      const res = await apiFetch<any>('/settings/public')
      return res.success ? res.data : null
    },
    staleTime: 5 * 60 * 1000
  })

  const referrerRewardAmount = publicSettings?.referrerRewardAmount ? Number(publicSettings.referrerRewardAmount) : 10
  const refereeRewardAmount = publicSettings?.refereeRewardAmount ? Number(publicSettings.refereeRewardAmount) : 10

  // Fetch referral stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['referrals', 'stats'],
    queryFn: async () => {
      const result = await getMyReferrals()
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load referral stats')
      }
      return result.data
    }
  })

  // Fetch referral history
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['referrals', 'history', filter],
    queryFn: async () => {
      const status = filter === 'all' ? undefined : filter.toUpperCase()
      const result = await getReferralHistory(1, 50, status)
      if (!result.success || !result.data || !Array.isArray(result.data.referrals)) {
        throw new Error(result.error || 'Failed to load referral history')
      }
      return result.data
    }
  })

  const referralCode = statsData?.referralCode || ''
  const referralLink = typeof window !== 'undefined'
    ? `${window.location.origin}/ref/${referralCode}`
    : ''

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'REWARDED':
        return (
          <span className="text-primary bg-primary/10 px-2 py-1 rounded text-xs font-bold border border-primary/20">
            Completed
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

  return (
    <ProfileLayout>
      {/* Header */}
      <div className="mb-10 pb-6 border-b border-border-dark">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Referral Program</h1>
        <p className="text-slate-400">
          Invite friends and earn rewards. Get {formatCurrency(referrerRewardAmount)} for each successful referral.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-black border border-border-dark rounded-2xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Icon name="user-group" size={20} />
            </div>
            <span className="text-slate-400 text-sm">Total Referrals</span>
          </div>
          {statsLoading ? (
            <div className="h-9 bg-surface-dark animate-pulse rounded" />
          ) : (
            <p className="text-2xl sm:text-3xl font-bold text-white">{statsData?.totalReferrals || 0}</p>
          )}
        </div>

        <div className="bg-black border border-border-dark rounded-2xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Icon name="check-circle" size={20} />
            </div>
            <span className="text-slate-400 text-sm">Successful</span>
          </div>
          {statsLoading ? (
            <div className="h-9 bg-surface-dark animate-pulse rounded" />
          ) : (
            <p className="text-2xl sm:text-3xl font-bold text-white">
              {(statsData?.completedReferrals || 0) + (statsData?.rewardedReferrals || 0)}
            </p>
          )}
        </div>

        <div className="bg-black border border-border-dark rounded-2xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Icon name="wallet" size={20} />
            </div>
            <span className="text-slate-400 text-sm">Total Earned</span>
          </div>
          {statsLoading ? (
            <div className="h-9 bg-surface-dark animate-pulse rounded" />
          ) : (
            <p className="text-2xl sm:text-3xl font-bold text-primary">
              {formatCurrency(statsData?.totalEarned || 0)}
            </p>
          )}
        </div>
      </div>

      {/* Referral Link Section */}
      <div className="mb-12">
        <h3 className="text-lg sm:text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Icon name="link" size={20} className="text-primary" />
          Your Referral Link
        </h3>

        <div className="bg-black border border-border-dark rounded-2xl p-4 sm:p-6 space-y-6">
          <div>
            <label className="text-sm font-semibold text-slate-300 mb-2 block">Referral Code</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={referralCode}
                readOnly
                className="flex-1 bg-surface-dark border border-border-dark rounded-xl px-4 py-3 text-white font-mono text-base sm:text-lg"
              />
              <button
                onClick={() => copyToClipboard(referralCode)}
                className="px-4 py-3 sm:px-6 bg-surface-dark border border-border-dark rounded-xl text-white font-medium hover:bg-border-dark transition-colors flex items-center gap-2"
                disabled={!referralCode}
              >
                <Icon name={copied ? 'check' : 'copy'} size={20} />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-300 mb-2 block">Referral Link</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 bg-surface-dark border border-border-dark rounded-xl px-4 py-3 text-slate-400 text-sm"
              />
              <button
                onClick={() => copyToClipboard(referralLink)}
                className="px-4 py-3 sm:px-6 bg-primary text-black font-bold rounded-xl hover:brightness-105 transition-all flex items-center gap-2"
                disabled={!referralLink}
              >
                <Icon name={copied ? 'check' : 'copy'} size={20} />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="mb-12">
        <h3 className="text-lg sm:text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Icon name="info" size={20} className="text-primary" />
          How It Works
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-black border border-border-dark rounded-2xl p-4 sm:p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary mx-auto mb-4">
              <span className="text-xl font-bold">1</span>
            </div>
            <h4 className="font-bold text-white mb-2">Share Your Link</h4>
            <p className="text-slate-500 text-sm">
              Send your referral link to friends and family who might be interested.
            </p>
          </div>

          <div className="bg-black border border-border-dark rounded-2xl p-4 sm:p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary mx-auto mb-4">
              <span className="text-xl font-bold">2</span>
            </div>
            <h4 className="font-bold text-white mb-2">Friend Signs Up</h4>
            <p className="text-slate-500 text-sm">
              When they sign up using your link and make their first purchase.
            </p>
          </div>

          <div className="bg-black border border-border-dark rounded-2xl p-4 sm:p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary mx-auto mb-4">
              <span className="text-xl font-bold">3</span>
            </div>
            <h4 className="font-bold text-white mb-2">Earn Rewards</h4>
            <p className="text-slate-500 text-sm">
              You get {formatCurrency(referrerRewardAmount)} and they get {formatCurrency(refereeRewardAmount)} credit to spend.
            </p>
          </div>
        </div>
      </div>

      {/* Referral History */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Icon name="history" size={20} className="text-primary" />
            Referral History
          </h3>

          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'pending', 'completed', 'rewarded'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-primary text-black'
                    : 'bg-surface-dark text-slate-400 hover:bg-border-dark'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {historyLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-surface-dark animate-pulse rounded-xl" />
            ))}
          </div>
        ) : historyData?.referrals && historyData.referrals.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-border-dark">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="text-xs uppercase bg-black text-slate-200">
                <tr>
                  <th className="px-3 py-3 sm:px-6 sm:py-4 font-bold">Referred User</th>
                  <th className="px-3 py-3 sm:px-6 sm:py-4 font-bold">Date</th>
                  <th className="px-3 py-3 sm:px-6 sm:py-4 font-bold text-center">Status</th>
                  <th className="px-3 py-3 sm:px-6 sm:py-4 font-bold text-right">Purchase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-dark bg-black/20">
                {historyData.referrals.map((referral) => (
                  <tr key={referral.id} className="hover:bg-black/40 transition-colors">
                    <td className="px-3 py-3 sm:px-6 sm:py-4">
                      <div>
                        <div className="text-white font-medium">{referral.referee.name}</div>
                        <div className="text-xs text-slate-500">{referral.referee.email}</div>
                      </div>
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4">{formatDate(referral.createdAt)}</td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 text-center">
                      {getStatusBadge(referral.status)}
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 text-right">
                      {referral.firstOrder ? (
                        <div>
                          <div className="text-white font-mono">{formatCurrency(Number(referral.firstOrder.total))}</div>
                          <div className="text-xs text-slate-500">#{referral.firstOrder.orderNumber}</div>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-black border border-border-dark rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-dark flex items-center justify-center mx-auto mb-4">
              <Icon name="user-group" size={32} className="text-slate-600" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">No referrals yet</h4>
            <p className="text-slate-500">
              Share your referral link to start earning rewards!
            </p>
          </div>
        )}
      </div>
    </ProfileLayout>
  )
}
