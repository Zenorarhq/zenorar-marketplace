'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Icon from '@/components/ui/Icon'

interface LandingPageAnalyticsProps {
  pageId: string
  onClose: () => void
}

const DATE_RANGES = [
  { label: 'Today', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
]

export default function LandingPageAnalytics({ pageId, onClose }: LandingPageAnalyticsProps) {
  const [selectedRange, setSelectedRange] = useState(7)

  const { data, isLoading } = useQuery({
    queryKey: ['landing-page-analytics', pageId, selectedRange],
    queryFn: async () => {
      const token = localStorage.getItem('admin_auth_token')
      const res = await fetch(`/api/admin/analytics/landing-page/${pageId}?days=${selectedRange}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
  })

  const summary = data?.summary
  const timeline = data?.timeline || []
  const sources = data?.sources || []
  const devices = data?.devices || []
  const topButtons = data?.topButtons || []
  const utmBreakdown = data?.utmBreakdown || []

  // Find max views in timeline for bar chart scaling
  const maxTimelineViews = Math.max(...timeline.map((d: any) => parseInt(d.views) || 0), 1)

  // Total device views for percentage calculation
  const totalDeviceViews = devices.reduce((sum: number, d: any) => sum + (parseInt(d.views) || 0), 0) || 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#111111] border border-[#1f1f1f] rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f] flex-shrink-0">
          <div className="flex items-center gap-3">
            <Icon name="analytics" size={20} className="text-primary" />
            <h2 className="text-white font-semibold">Landing Page Analytics</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Date Range Selector */}
            <div className="flex bg-[#1a1a1a] rounded-lg p-1">
              {DATE_RANGES.map(r => (
                <button
                  key={r.days}
                  onClick={() => setSelectedRange(r.days)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    selectedRange === r.days ? 'bg-primary text-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg">
              <Icon name="close" size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4">
                  <p className="text-slate-400 text-xs mb-1">Page Views</p>
                  <p className="text-white text-2xl font-bold">{parseInt(summary?.views || '0').toLocaleString()}</p>
                  <p className="text-slate-500 text-xs mt-1">{parseInt(summary?.unique_visitors || '0').toLocaleString()} unique</p>
                </div>
                <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4">
                  <p className="text-slate-400 text-xs mb-1">Button Clicks</p>
                  <p className="text-blue-400 text-2xl font-bold">{parseInt(summary?.button_clicks || '0').toLocaleString()}</p>
                  {parseInt(summary?.views || '0') > 0 && (
                    <p className="text-slate-500 text-xs mt-1">
                      {((parseInt(summary?.button_clicks || '0') / parseInt(summary?.views || '1')) * 100).toFixed(1)}% CTR
                    </p>
                  )}
                </div>
                <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4">
                  <p className="text-slate-400 text-xs mb-1">Purchases</p>
                  <p className="text-green-400 text-2xl font-bold">{parseInt(summary?.purchases || '0').toLocaleString()}</p>
                  <p className="text-slate-500 text-xs mt-1">{summary?.conversion_rate || '0.00'}% conv.</p>
                </div>
                <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4">
                  <p className="text-slate-400 text-xs mb-1">Revenue</p>
                  <p className="text-primary text-2xl font-bold">${parseFloat(summary?.revenue || '0').toFixed(2)}</p>
                  <p className="text-slate-500 text-xs mt-1">{parseInt(summary?.signups || '0')} signups</p>
                </div>
              </div>

              {/* Timeline */}
              {timeline.length > 0 && (
                <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4">
                  <h3 className="text-white text-sm font-semibold mb-3">Views Over Time</h3>
                  <div className="flex items-end gap-1 h-32">
                    {timeline.map((day: any, i: number) => {
                      const views = parseInt(day.views) || 0
                      const height = (views / maxTimelineViews) * 100
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div
                            className="w-full bg-primary/20 hover:bg-primary/40 rounded-t transition-colors min-h-[2px]"
                            style={{ height: `${Math.max(height, 2)}%` }}
                          />
                          <span className="text-[9px] text-slate-600">
                            {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 hidden group-hover:block bg-[#222] border border-[#333] rounded px-2 py-1 text-xs text-white whitespace-nowrap z-10">
                            {views} views, {parseInt(day.purchases) || 0} purchases
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sources */}
                <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4">
                  <h3 className="text-white text-sm font-semibold mb-3">Traffic Sources</h3>
                  {sources.length === 0 ? (
                    <p className="text-slate-500 text-sm">No data yet</p>
                  ) : (
                    <div className="space-y-2">
                      {sources.map((s: any, i: number) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-slate-300 text-sm">{s.source}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400 text-xs">{s.views} views</span>
                            <span className="text-green-400 text-xs">{s.purchases} purchases</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Devices */}
                <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4">
                  <h3 className="text-white text-sm font-semibold mb-3">Devices</h3>
                  {devices.length === 0 ? (
                    <p className="text-slate-500 text-sm">No data yet</p>
                  ) : (
                    <div className="space-y-3">
                      {devices.map((d: any, i: number) => {
                        const views = parseInt(d.views) || 0
                        const pct = ((views / totalDeviceViews) * 100).toFixed(1)
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-slate-300 text-sm capitalize">{d.device}</span>
                              <span className="text-slate-400 text-xs">{pct}% ({views})</span>
                            </div>
                            <div className="w-full bg-[#1a1a1a] rounded-full h-1.5">
                              <div className="bg-primary rounded-full h-1.5" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Top Buttons */}
              {topButtons.length > 0 && (
                <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4">
                  <h3 className="text-white text-sm font-semibold mb-3">Top Button Clicks</h3>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#1f1f1f]">
                        <th className="text-left text-slate-500 text-xs py-2 pr-4">Button Text</th>
                        <th className="text-left text-slate-500 text-xs py-2 pr-4">URL</th>
                        <th className="text-right text-slate-500 text-xs py-2">Clicks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topButtons.map((b: any, i: number) => (
                        <tr key={i} className="border-b border-[#1f1f1f] last:border-0">
                          <td className="text-slate-300 text-sm py-2 pr-4">{b.text || '(no text)'}</td>
                          <td className="text-slate-500 text-xs py-2 pr-4 max-w-[200px] truncate">{b.url || '-'}</td>
                          <td className="text-white text-sm py-2 text-right font-medium">{b.clicks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* UTM Breakdown */}
              {utmBreakdown.length > 0 && (
                <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4">
                  <h3 className="text-white text-sm font-semibold mb-3">Campaign Performance (UTM)</h3>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#1f1f1f]">
                        <th className="text-left text-slate-500 text-xs py-2 pr-4">Campaign</th>
                        <th className="text-left text-slate-500 text-xs py-2 pr-4">Source / Medium</th>
                        <th className="text-right text-slate-500 text-xs py-2 pr-4">Views</th>
                        <th className="text-right text-slate-500 text-xs py-2 pr-4">Purchases</th>
                        <th className="text-right text-slate-500 text-xs py-2">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {utmBreakdown.map((u: any, i: number) => (
                        <tr key={i} className="border-b border-[#1f1f1f] last:border-0">
                          <td className="text-slate-300 text-sm py-2 pr-4">{u.campaign}</td>
                          <td className="text-slate-500 text-xs py-2 pr-4">{u.source} / {u.medium}</td>
                          <td className="text-slate-400 text-sm py-2 pr-4 text-right">{u.views}</td>
                          <td className="text-green-400 text-sm py-2 pr-4 text-right">{u.purchases}</td>
                          <td className="text-white text-sm py-2 text-right font-medium">${parseFloat(u.revenue || '0').toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}