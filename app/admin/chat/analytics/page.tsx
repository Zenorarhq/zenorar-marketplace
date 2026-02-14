'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { chatApi, ChatAnalytics } from '@/lib/api/chat'
import Link from 'next/link'

export default function ChatAnalyticsPage() {
  const [data, setData] = useState<ChatAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    chatApi.getAnalytics().then(res => {
      if (res.success && res.data) setData(res.data)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-slate-400">Loading analytics...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (!data) {
    return (
      <AdminLayout>
        <div className="text-center text-slate-500 py-16">Failed to load analytics data</div>
      </AdminLayout>
    )
  }

  const { overview, statusBreakdown, dailyVolume, agentPerformance, tagDistribution, ratingDistribution } = data

  const maxDaily = Math.max(...dailyVolume.map(d => d.count), 1)
  const totalStatus = Object.values(statusBreakdown).reduce((a, b) => a + b, 0) || 1
  const maxTagCount = Math.max(...tagDistribution.map(t => t.count), 1)
  const maxRatingCount = Math.max(...ratingDistribution.map(r => r.count), 1)

  const statusColors: Record<string, string> = {
    OPEN: 'bg-blue-500',
    ASSIGNED: 'bg-yellow-500',
    RESOLVED: 'bg-green-500',
    CLOSED: 'bg-slate-500',
  }

  const statusTextColors: Record<string, string> = {
    OPEN: 'text-blue-400',
    ASSIGNED: 'text-yellow-400',
    RESOLVED: 'text-green-400',
    CLOSED: 'text-slate-400',
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1">Chat Analytics</h1>
            <p className="text-slate-500 text-xs sm:text-sm">Last 30 days performance overview</p>
          </div>
          <Link
            href="/admin/chat"
            className="px-4 py-2 bg-[#1a1a1a] text-slate-400 hover:text-white text-xs font-medium rounded-lg transition-colors"
          >
            Back to Chat
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Conversations</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Icon name="chat" size={16} />
            </div>
          </div>
          <p className="text-white text-lg lg:text-2xl font-bold mb-1">{overview.totalConversations}</p>
          <p className="text-xs"><span className="text-slate-500">last 30 days</span></p>
        </div>

        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Messages</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Icon name="send" size={16} />
            </div>
          </div>
          <p className="text-white text-lg lg:text-2xl font-bold mb-1">{overview.totalMessages}</p>
          <p className="text-xs"><span className="text-slate-500">last 30 days</span></p>
        </div>

        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Avg Rating</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-yellow-500/10 text-yellow-400 flex items-center justify-center">
              <span className="text-sm">★</span>
            </div>
          </div>
          <p className="text-white text-lg lg:text-2xl font-bold mb-1">
            {overview.avgRating > 0 ? overview.avgRating.toFixed(1) : 'N/A'}
          </p>
          <p className="text-xs"><span className="text-slate-500">{overview.ratedCount} rated</span></p>
        </div>

        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Avg Response</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center">
              <Icon name="clock" size={16} />
            </div>
          </div>
          <p className="text-white text-lg lg:text-2xl font-bold mb-1">
            {overview.avgResponseMinutes > 0 ? `${overview.avgResponseMinutes}m` : 'N/A'}
          </p>
          <p className="text-xs"><span className="text-slate-500">first reply</span></p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Daily Volume */}
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Daily Conversations</h3>
          <div className="h-48 flex items-end justify-between gap-1">
            {dailyVolume.map((d, i) => {
              const height = maxDaily > 0 ? (d.count / maxDaily) * 100 : 0
              const dayLabel = new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { day: 'numeric' })
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${d.count} conversations`}>
                  <span className="text-[9px] text-slate-500">{d.count > 0 ? d.count : ''}</span>
                  <div
                    className="w-full bg-gradient-to-t from-primary/30 to-primary/10 rounded-t relative"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  >
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-primary rounded-t" />
                  </div>
                  <span className="text-[9px] text-slate-600">{i % 2 === 0 ? dayLabel : ''}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Status Breakdown</h3>
          <div className="space-y-3">
            {(['OPEN', 'ASSIGNED', 'RESOLVED', 'CLOSED'] as const).map(status => {
              const count = statusBreakdown[status] || 0
              const pct = totalStatus > 0 ? (count / totalStatus) * 100 : 0
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className={`text-xs font-medium ${statusTextColors[status]}`}>{status}</span>
                    <span className="text-slate-400 text-xs">{count} ({Math.round(pct)}%)</span>
                  </div>
                  <div className="h-2 bg-[#0a0a0a] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${statusColors[status]}`}
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Agent Performance */}
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Agent Performance</h3>
          {agentPerformance.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No agent data yet</p>
          ) : (
            <div className="space-y-3">
              {agentPerformance.map(agent => (
                <div key={agent.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                      {agent.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{agent.name}</p>
                      <p className="text-slate-500 text-[10px]">{agent.conversationCount} conversations</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {agent.avgRating > 0 ? (
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400 text-xs">★</span>
                        <span className="text-white text-sm font-medium">{agent.avgRating}</span>
                      </div>
                    ) : (
                      <span className="text-slate-600 text-xs">No ratings</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tag Distribution */}
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Tag Distribution</h3>
          {tagDistribution.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No tags used yet</p>
          ) : (
            <div className="space-y-3">
              {tagDistribution.map(t => {
                const pct = maxTagCount > 0 ? (t.count / maxTagCount) * 100 : 0
                return (
                  <div key={t.tag}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-300 text-xs">{t.tag}</span>
                      <span className="text-slate-500 text-xs">{t.count}</span>
                    </div>
                    <div className="h-2 bg-[#0a0a0a] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/60"
                        style={{ width: `${Math.max(pct, 3)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">Rating Distribution</h3>
        {overview.ratedCount === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">No ratings yet</p>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {ratingDistribution.map(r => {
              const pct = maxRatingCount > 0 ? (r.count / maxRatingCount) * 100 : 0
              return (
                <div key={r.rating} className="flex flex-col items-center gap-2">
                  <div className="h-32 w-full flex items-end justify-center">
                    <div
                      className="w-full max-w-[40px] bg-gradient-to-t from-yellow-500/30 to-yellow-500/10 rounded-t relative"
                      style={{ height: `${Math.max(pct, 5)}%` }}
                    >
                      <div className="absolute inset-x-0 top-0 h-0.5 bg-yellow-400 rounded-t" />
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-yellow-400 text-sm">{'★'.repeat(r.rating)}</span>
                    <p className="text-slate-400 text-xs mt-0.5">{r.count}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
