'use client'

import { useState, Fragment } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { apiFetch } from '@/lib/api/client'

type Tab = 'overview' | 'applications' | 'payouts'

// ─── API helpers ──────────────────────────────────────────────────────────────

async function vendorFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await apiFetch<T>(`/vendor${path}`, opts)
  if (!res.success) throw new Error((res as any).error || 'Request failed')
  return (res as any).data ?? (res as any)
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, color = 'primary' }: {
  label: string; value: string | number; sub?: string; icon: string; color?: string
}) {
  const colorMap: Record<string, string> = {
    primary: 'text-primary bg-primary/10',
    green: 'text-green-400 bg-green-400/10',
    yellow: 'text-yellow-400 bg-yellow-400/10',
    red: 'text-red-400 bg-red-400/10',
    blue: 'text-blue-400 bg-blue-400/10',
  }
  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-sm">{label}</span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.primary}`}>
          <Icon name={icon} size={16} />
        </span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING:   'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    APPROVED:  'bg-green-500/20 text-green-400 border border-green-500/30',
    REJECTED:  'bg-red-500/20 text-red-400 border border-red-500/30',
    PAID:      'bg-green-500/20 text-green-400 border border-green-500/30',
    CANCELLED: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
    AVAILABLE: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    LOCKED:    'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-slate-500/20 text-slate-400 border border-slate-500/30'}`}>
      {status}
    </span>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminVendorsPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('overview')

  // Overview tab state
  const [overviewSearch, setOverviewSearch] = useState('')
  const [overviewStatus, setOverviewStatus] = useState('ALL')
  const [overviewPage, setOverviewPage] = useState(1)
  const [overviewDetail, setOverviewDetail] = useState<any>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Application tab state
  const [appStatusFilter, setAppStatusFilter] = useState('PENDING')
  const [appPage, setAppPage] = useState(1)
  const [viewIdApp, setViewIdApp] = useState<any>(null)

  // Modal adjust state
  const [modalAdjustAmount, setModalAdjustAmount] = useState('')
  const [modalAdjustNote, setModalAdjustNote] = useState('')
  const [modalAdjusting, setModalAdjusting] = useState(false)
  const [modalAdjustDone, setModalAdjustDone] = useState(false)
  const [modalAdjustError, setModalAdjustError] = useState('')

  // Payouts tab state
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('PENDING')
  const [payoutPage, setPayoutPage] = useState(1)
  const [expandedPayoutId, setExpandedPayoutId] = useState<string | null>(null)
  const [txHashInput, setTxHashInput] = useState<Record<string, string>>({})
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({})

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: stats } = useQuery({
    queryKey: ['vendor-admin-stats'],
    queryFn: () => vendorFetch<any>('/admin/stats'),
    refetchInterval: 30000,
  })

  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['vendor-overview', overviewSearch, overviewStatus, overviewPage],
    queryFn: async () => {
      const statusParam = overviewStatus !== 'ALL' ? '&status=' + overviewStatus : ''
      const url = '/vendor/admin/vendors?search=' + encodeURIComponent(overviewSearch) + '&page=' + overviewPage + '&limit=20' + statusParam
      const res = await apiFetch<any>(url)
      if (!res.success) throw new Error((res as any).error || 'Failed')
      return { items: (res as any).data || [], total: (res as any).pagination?.total ?? 0 }
    },
    enabled: tab === 'overview',
  })

  const { data: overviewDetailData, isLoading: overviewDetailLoading } = useQuery({
    queryKey: ['vendor-overview-detail', overviewDetail?.id],
    queryFn: () => vendorFetch<any>(`/admin/vendors/${overviewDetail.id}`),
    enabled: !!overviewDetail?.id,
  })

  const { data: applicationsData, isLoading: appsLoading } = useQuery({
    queryKey: ['vendor-applications', appStatusFilter, appPage],
    queryFn: async () => {
      const url = '/vendor/admin/applications?status=' + appStatusFilter + '&page=' + appPage + '&limit=20'
      const res = await apiFetch<any>(url)
      if (!res.success) throw new Error((res as any).error || 'Failed')
      return { items: (res as any).data || [], total: (res as any).pagination?.total ?? 0 }
    },
    enabled: tab === 'applications',
  })

  const { data: payoutsData, isLoading: payoutsLoading } = useQuery({
    queryKey: ['vendor-payouts-admin', payoutStatusFilter, payoutPage],
    queryFn: async () => {
      const url = '/vendor/admin/payouts?status=' + payoutStatusFilter + '&page=' + payoutPage + '&limit=20'
      const res = await apiFetch<any>(url)
      if (!res.success) throw new Error((res as any).error || 'Failed')
      return { items: (res as any).data || [], total: (res as any).pagination?.total ?? 0 }
    },
    enabled: tab === 'payouts',
  })


  // ── Mutations ────────────────────────────────────────────────────────────

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/vendor/admin/applications/${id}/approve`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-applications'] })
      queryClient.invalidateQueries({ queryKey: ['vendor-admin-stats'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/vendor/admin/applications/${id}/reject`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-applications'] })
      queryClient.invalidateQueries({ queryKey: ['vendor-admin-stats'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/vendor/admin/vendors/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-overview'] })
      queryClient.invalidateQueries({ queryKey: ['vendor-list'] })
      queryClient.invalidateQueries({ queryKey: ['vendor-admin-stats'] })
      setConfirmDeleteId(null)
      setOverviewDetail(null)
    },
  })

  const overviewSuspendMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/vendor/admin/vendors/${id}/suspend`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-overview'] })
      queryClient.invalidateQueries({ queryKey: ['vendor-overview-detail'] })
    },
  })

  const overviewReinstateMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/vendor/admin/vendors/${id}/reinstate`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-overview'] })
      queryClient.invalidateQueries({ queryKey: ['vendor-overview-detail'] })
    },
  })

  const markPaidMutation = useMutation({
    mutationFn: ({ id, txHash }: { id: string; txHash: string }) =>
      apiFetch(`/vendor/admin/payouts/${id}/mark-paid`, { method: 'POST', body: JSON.stringify({ txHash }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-payouts-admin'] })
      queryClient.invalidateQueries({ queryKey: ['vendor-admin-stats'] })
    },
  })

  const rejectPayoutMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      apiFetch(`/vendor/admin/payouts/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendor-payouts-admin'] }),
  })

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleModalAdjust() {
    if (!overviewDetail || !modalAdjustAmount) return
    setModalAdjusting(true)
    setModalAdjustError('')
    try {
      const res = await apiFetch<any>(`/vendor/admin/vendors/${overviewDetail.id}/adjust-balance`, {
        method: 'POST',
        body: JSON.stringify({ amount: Number(modalAdjustAmount), note: modalAdjustNote }),
      })
      if (!res.success) throw new Error((res as any).error || 'Adjustment failed')
      setModalAdjustAmount('')
      setModalAdjustNote('')
      setModalAdjustDone(true)
      setTimeout(() => setModalAdjustDone(false), 2500)
      queryClient.invalidateQueries({ queryKey: ['vendor-overview-detail', overviewDetail.id] })
      queryClient.invalidateQueries({ queryKey: ['vendor-overview'] })
    } catch (err: any) {
      setModalAdjustError(err.message || 'Something went wrong')
    } finally {
      setModalAdjusting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'chart' },
    { id: 'applications', label: 'Applications', icon: 'file' },
    { id: 'payouts', label: 'Payouts', icon: 'wallet' },
  ]

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Vendor Management</h1>
          <p className="text-slate-400 text-sm">Manage vendor applications, commissions, and payouts.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto max-w-full">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                tab === t.id ? 'bg-primary text-black' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-slate-400 hover:text-white'
              }`}
            >
              <Icon name={t.icon} size={14} />
              {t.label}
              {t.id === 'applications' && (stats?.pendingApplications > 0) && (
                <span className="bg-yellow-500 text-black text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {stats.pendingApplications}
                </span>
              )}
              {t.id === 'payouts' && (stats?.pendingPayouts > 0) && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {stats.pendingPayouts}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard label="Total Vendors" value={stats?.totalVendors ?? '—'} icon="users" color="primary" />
              <StatCard label="Pending Applications" value={stats?.pendingApplications ?? '—'} icon="document" color="yellow" />
              <StatCard label="Commission Paid" value={stats ? `$${Number(stats.totalCommissionPaid).toFixed(2)}` : '—'} icon="check" color="green" />
              <StatCard label="Pending Payouts" value={stats?.pendingPayouts ?? '—'} icon="wallet" color="red" />
              <StatCard label="Pending Amount" value={stats ? `$${Number(stats.pendingPayoutAmount).toFixed(2)}` : '—'} icon="dollar" color="blue" />
            </div>

            {/* Search + filter bar */}
            <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search vendors by name or email..."
                    value={overviewSearch}
                    onChange={e => { setOverviewSearch(e.target.value); setOverviewPage(1) }}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div className="flex gap-2">
                  {['ALL', 'ACTIVE', 'SUSPENDED'].map(s => (
                    <button
                      key={s}
                      onClick={() => { setOverviewStatus(s); setOverviewPage(1) }}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${overviewStatus === s ? 'bg-primary text-black' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-slate-400 hover:text-white'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Vendor table */}
            <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl overflow-hidden">
              {overviewLoading ? (
                <div className="text-center py-12 text-slate-400">Loading...</div>
              ) : !overviewData?.items?.length ? (
                <div className="text-center py-12 text-slate-500">No vendors found</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-[#0a0a0a] border-b border-[#1f1f1f]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Vendor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase hidden md:table-cell">Business</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase hidden lg:table-cell">Joined</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Earned</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase hidden sm:table-cell">Available</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f1f1f]">
                    {overviewData.items.map((v: any) => (
                      <tr key={v.id} className={`hover:bg-[#1a1a1a] transition-colors ${overviewDetail?.id === v.id ? 'bg-primary/5' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300 shrink-0">
                              {v.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="text-white font-medium text-sm">{v.name}</div>
                              <div className="text-slate-500 text-xs">{v.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-sm hidden md:table-cell">{v.business_name || '—'}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">
                          {v.vendor_approved_at ? new Date(v.vendor_approved_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-white font-medium">${Number(v.total_earned).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-green-400 hidden sm:table-cell">${Number(v.available_balance).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          {v.vendor_suspended_at
                            ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">Suspended</span>
                            : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">Active</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {/* View detail */}
                            <button
                              onClick={() => setOverviewDetail(v)}
                              title="View details"
                              className={`p-1.5 rounded hover:bg-blue-500/10 transition-colors ${overviewDetail?.id === v.id ? 'text-blue-400' : 'text-slate-400 hover:text-blue-400'}`}
                            >
                              <Icon name="eye" size={15} />
                            </button>
                            {/* Suspend / Reinstate */}
                            {v.vendor_suspended_at ? (
                              <button
                                onClick={() => overviewReinstateMutation.mutate(v.id)}
                                disabled={overviewReinstateMutation.isPending}
                                title="Reinstate vendor"
                                className="p-1.5 rounded text-slate-400 hover:text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-40"
                              >
                                <Icon name="check" size={15} />
                              </button>
                            ) : (
                              <button
                                onClick={() => overviewSuspendMutation.mutate(v.id)}
                                disabled={overviewSuspendMutation.isPending}
                                title="Suspend vendor"
                                className="p-1.5 rounded text-slate-400 hover:text-orange-400 hover:bg-orange-500/10 transition-colors disabled:opacity-40"
                              >
                                <Icon name="ban" size={15} />
                              </button>
                            )}
                            {/* Delete */}
                            <button
                              onClick={() => setConfirmDeleteId(v.id)}
                              title="Remove vendor status"
                              className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Icon name="trash" size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Pagination */}
              {(overviewData?.total ?? 0) > 20 && (
                <div className="px-4 py-3 border-t border-[#1f1f1f] flex items-center justify-between text-sm text-slate-400">
                  <span>Page {overviewPage} of {Math.ceil(overviewData!.total / 20)}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setOverviewPage(p => Math.max(1, p - 1))} disabled={overviewPage === 1} className="px-3 py-1.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-white hover:bg-[#2a2a2a] disabled:opacity-40">Previous</button>
                    <button onClick={() => setOverviewPage(p => p + 1)} disabled={overviewPage >= Math.ceil(overviewData!.total / 20)} className="px-3 py-1.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-white hover:bg-[#2a2a2a] disabled:opacity-40">Next</button>
                  </div>
                </div>
              )}
            </div>

            {/* Vendor detail modal */}
            {overviewDetail && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setOverviewDetail(null)}>
                <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  {overviewDetailLoading ? (
                    <div className="text-center py-16 text-slate-400">Loading...</div>
                  ) : overviewDetailData ? (
                    <>
                      {/* Modal header */}
                      <div className="flex items-center gap-4 p-6 border-b border-[#1f1f1f]">
                        <div className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center text-xl font-bold text-slate-300 shrink-0">
                          {overviewDetailData.user?.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-white font-semibold text-lg">{overviewDetailData.user?.name}</h3>
                            {overviewDetail.vendor_suspended_at
                              ? <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400 border border-red-500/30">Suspended</span>
                              : <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30">Active</span>
                            }
                          </div>
                          <p className="text-slate-500 text-sm">{overviewDetailData.user?.email}</p>
                          {overviewDetailData.application && (
                            <p className="text-slate-400 text-xs mt-0.5">{overviewDetailData.application.business_name} · {overviewDetailData.application.country}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {overviewDetail.vendor_suspended_at ? (
                            <button
                              onClick={() => overviewReinstateMutation.mutate(overviewDetail.id)}
                              disabled={overviewReinstateMutation.isPending}
                              className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors disabled:opacity-40"
                            >
                              Reinstate
                            </button>
                          ) : (
                            <button
                              onClick={() => overviewSuspendMutation.mutate(overviewDetail.id)}
                              disabled={overviewSuspendMutation.isPending}
                              className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-medium hover:bg-orange-500/20 transition-colors disabled:opacity-40"
                            >
                              Suspend
                            </button>
                          )}
                          <button onClick={() => setOverviewDetail(null)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
                            <Icon name="x" size={18} />
                          </button>
                        </div>
                      </div>

                      {/* Balance cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 border-b border-[#1f1f1f]">
                        {[
                          { label: 'Available', value: `$${overviewDetailData.balance?.available?.toFixed(2) ?? '0.00'}`, color: 'text-green-400' },
                          { label: 'Locked', value: `$${overviewDetailData.balance?.locked?.toFixed(2) ?? '0.00'}`, color: 'text-yellow-400' },
                          { label: 'Lifetime Earned', value: `$${overviewDetailData.balance?.lifetimeEarned?.toFixed(2) ?? '0.00'}`, color: 'text-white' },
                          { label: 'Total Paid', value: `$${overviewDetailData.balance?.totalPaid?.toFixed(2) ?? '0.00'}`, color: 'text-slate-300' },
                        ].map(item => (
                          <div key={item.label} className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg p-3">
                            <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                            <p className={`font-semibold text-sm ${item.color}`}>{item.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Recent commissions */}
                      {overviewDetailData.recentCommissions?.length > 0 && (
                        <div className="p-6 border-b border-[#1f1f1f]">
                          <p className="text-xs text-slate-400 font-medium uppercase mb-3">Recent Commissions</p>
                          <div className="space-y-1">
                            {overviewDetailData.recentCommissions.slice(0, 5).map((c: any) => (
                              <div key={c.id} className="flex items-center justify-between text-xs py-1.5 border-b border-[#1f1f1f] last:border-0">
                                <span className="text-slate-500 font-mono truncate max-w-[160px]">{c.order_id}</span>
                                <span className="text-white font-medium">${Number(c.commission_amount).toFixed(2)}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                  c.status === 'AVAILABLE' ? 'bg-green-500/15 text-green-400' :
                                  c.status === 'PAID' ? 'bg-primary/15 text-primary' :
                                  'bg-yellow-500/15 text-yellow-400'
                                }`}>{c.status}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Manual balance adjustment */}
                      <div className="p-6 border-b border-[#1f1f1f]">
                        <p className="text-xs text-slate-400 font-medium uppercase mb-3">Manual Balance Adjustment</p>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={modalAdjustAmount}
                            onChange={e => setModalAdjustAmount(e.target.value)}
                            placeholder="Amount (use - to deduct)"
                            className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
                          />
                          <input
                            type="text"
                            value={modalAdjustNote}
                            onChange={e => setModalAdjustNote(e.target.value)}
                            placeholder="Note (reason)"
                            className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
                          />
                          <button
                            onClick={handleModalAdjust}
                            disabled={!modalAdjustAmount || modalAdjusting || modalAdjustDone}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap ${
                              modalAdjustDone
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-primary/10 hover:bg-primary/20 text-primary'
                            }`}
                          >
                            {modalAdjusting ? 'Saving...' : modalAdjustDone ? 'Applied ✓' : 'Apply'}
                          </button>
                        </div>
                        {modalAdjustError && (
                          <p className="mt-2 text-xs text-red-400">{modalAdjustError}</p>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between p-6">
                        <button
                          onClick={() => { setConfirmDeleteId(overviewDetail.id); setOverviewDetail(null) }}
                          className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-colors"
                        >
                          Remove Vendor
                        </button>
                        <button
                          onClick={() => setOverviewDetail(null)}
                          className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-slate-300 rounded-lg text-sm hover:text-white transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            )}

            {/* Delete confirmation modal */}
            {confirmDeleteId && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-6 max-w-sm w-full">
                  <h3 className="text-white font-semibold text-lg mb-2">Remove Vendor Status?</h3>
                  <p className="text-slate-400 text-sm mb-6">
                    This will revoke vendor access for this user. Their commission history is preserved but they will no longer earn commissions.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="flex-1 px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] text-slate-300 rounded-lg text-sm hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(confirmDeleteId)}
                      disabled={deleteMutation.isPending}
                      className="flex-1 px-4 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-colors disabled:opacity-40"
                    >
                      {deleteMutation.isPending ? 'Removing...' : 'Remove Vendor'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── APPLICATIONS ─────────────────────────────────────────────── */}
        {tab === 'applications' && (
          <div className="space-y-4">
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4 flex items-center gap-3">
              {['PENDING', 'APPROVED', 'REJECTED'].map(s => (
                <button
                  key={s}
                  onClick={() => { setAppStatusFilter(s); setAppPage(1) }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${appStatusFilter === s ? 'bg-primary text-black' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-slate-400 hover:text-white'}`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden">
              {appsLoading ? (
                <div className="text-center py-12 text-slate-400">Loading...</div>
              ) : !applicationsData?.items?.length ? (
                <div className="text-center py-12 text-slate-500">No {appStatusFilter.toLowerCase()} applications</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1f1f1f] text-left">
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Applicant</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Business</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Country</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Avg Volume</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Applied</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1a1a]">
                    {applicationsData.items.map((app: any) => (
                      <Fragment key={app.id}>
                        <tr className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <div>
                              <div className="text-white font-medium">{app.full_name}</div>
                              <div className="text-slate-500 text-xs">{app.email}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-300">{app.business_name}</td>
                          <td className="px-4 py-3 text-slate-400">{app.country}</td>
                          <td className="px-4 py-3 text-slate-400">{app.avg_order_volume}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{new Date(app.applied_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setViewIdApp(app)}
                                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
                              >
                                <Icon name="eye" size={12} />
                                View ID
                              </button>
                              {app.status === 'PENDING' && (
                                <>
                                  <button
                                    onClick={() => approveMutation.mutate(app.id)}
                                    disabled={approveMutation.isPending}
                                    className="text-xs text-green-400 hover:text-green-300 disabled:opacity-40"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => rejectMutation.mutate(app.id)}
                                    disabled={rejectMutation.isPending}
                                    className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* ID Document modal */}
            {viewIdApp && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setViewIdApp(null)}>
                <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-5 border-b border-[#1f1f1f]">
                    <div>
                      <h3 className="text-white font-semibold">{viewIdApp.full_name}</h3>
                      <p className="text-slate-500 text-xs">{viewIdApp.business_name} · {viewIdApp.country}</p>
                    </div>
                    <button onClick={() => setViewIdApp(null)} className="p-1.5 rounded text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
                      <Icon name="x" size={18} />
                    </button>
                  </div>
                  <div className="p-5">
                    <p className="text-xs text-slate-400 font-medium uppercase mb-3">ID Document</p>
                    {/\.(jpg|jpeg|png|gif|webp|heic)$/i.test(viewIdApp.id_document_url) ? (
                      <img
                        src={viewIdApp.id_document_url}
                        alt="ID Document"
                        className="w-full rounded-lg border border-[#2a2a2a] max-h-80 object-contain bg-black"
                      />
                    ) : (
                      <a
                        href={viewIdApp.id_document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-primary hover:underline text-sm"
                      >
                        <Icon name="file" size={16} />
                        Open Document (new tab)
                      </a>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-5 border-t border-[#1f1f1f]">
                    <button
                      onClick={() => { rejectMutation.mutate(viewIdApp.id); setViewIdApp(null) }}
                      disabled={rejectMutation.isPending || viewIdApp.status !== 'PENDING'}
                      className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-colors disabled:opacity-40"
                    >
                      Reject & Request Re-upload
                    </button>
                    <button
                      onClick={() => setViewIdApp(null)}
                      className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-slate-300 rounded-lg text-sm hover:text-white transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {(applicationsData?.total ?? 0) > 20 && (
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>Page {appPage} of {Math.ceil(applicationsData!.total / 20)}</span>
                <div className="flex gap-2">
                  <button onClick={() => setAppPage(p => Math.max(1, p - 1))} disabled={appPage === 1} className="px-3 py-1 bg-[#111] border border-[#1f1f1f] rounded-lg disabled:opacity-40 hover:text-white">Previous</button>
                  <button onClick={() => setAppPage(p => p + 1)} disabled={appPage >= Math.ceil(applicationsData!.total / 20)} className="px-3 py-1 bg-[#111] border border-[#1f1f1f] rounded-lg disabled:opacity-40 hover:text-white">Next</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PAYOUTS ───────────────────────────────────────────────────── */}
        {tab === 'payouts' && (
          <div className="space-y-4">
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4 flex items-center gap-3">
              {['PENDING', 'PAID', 'REJECTED'].map(s => (
                <button
                  key={s}
                  onClick={() => { setPayoutStatusFilter(s); setPayoutPage(1) }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${payoutStatusFilter === s ? 'bg-primary text-black' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-slate-400 hover:text-white'}`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden">
              {payoutsLoading ? (
                <div className="text-center py-12 text-slate-400">Loading...</div>
              ) : !payoutsData?.items?.length ? (
                <div className="text-center py-12 text-slate-500">No {payoutStatusFilter.toLowerCase()} payouts</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1f1f1f] text-left">
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Vendor</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Amount</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Method</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Requested</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1a1a]">
                    {payoutsData.items.map((p: any) => (
                      <Fragment key={p.id}>
                        <tr className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <div className="text-white">{p.vendor_name}</div>
                            <div className="text-slate-500 text-xs">{p.vendor_email}</div>
                          </td>
                          <td className="px-4 py-3 text-white font-medium">${Number(p.amount).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <div className="text-slate-300 text-xs">{p.method_type?.replace(/_/g, ' ')}</div>
                            <div className="text-slate-500 text-xs font-mono truncate max-w-[120px]" title={p.wallet_address}>{p.wallet_address}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{new Date(p.requested_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                          <td className="px-4 py-3">
                            {p.status === 'PAID' && p.tx_hash && (
                              <span className="text-xs text-slate-500 font-mono truncate block max-w-[100px]" title={p.tx_hash}>{p.tx_hash.slice(0, 12)}…</span>
                            )}
                            {p.status === 'PENDING' && (
                              <button
                                onClick={() => setExpandedPayoutId(expandedPayoutId === p.id ? null : p.id)}
                                className="text-xs text-primary hover:underline"
                              >
                                {expandedPayoutId === p.id ? 'Close' : 'Process'}
                              </button>
                            )}
                          </td>
                        </tr>
                        {expandedPayoutId === p.id && p.status === 'PENDING' && (
                          <tr key={`${p.id}-process`}>
                            <td colSpan={6} className="px-4 py-4 bg-[#0a0a0a]">
                              <div className="flex flex-col sm:flex-row gap-3 items-start">
                                <div className="flex-1">
                                  <label className="text-xs text-slate-400 mb-1 block">Transaction Hash</label>
                                  <input
                                    type="text"
                                    value={txHashInput[p.id] || ''}
                                    onChange={e => setTxHashInput(prev => ({ ...prev, [p.id]: e.target.value }))}
                                    placeholder="Enter tx hash after sending..."
                                    className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-primary/50"
                                  />
                                </div>
                                <div className="flex gap-2 pt-5">
                                  <button
                                    onClick={() => markPaidMutation.mutate({ id: p.id, txHash: txHashInput[p.id] || '' })}
                                    disabled={!txHashInput[p.id] || markPaidMutation.isPending}
                                    className="px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
                                  >
                                    Mark Paid
                                  </button>
                                  <button
                                    onClick={() => rejectPayoutMutation.mutate({ id: p.id, note: rejectNote[p.id] })}
                                    disabled={rejectPayoutMutation.isPending}
                                    className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                              <input
                                type="text"
                                value={rejectNote[p.id] || ''}
                                onChange={e => setRejectNote(prev => ({ ...prev, [p.id]: e.target.value }))}
                                placeholder="Rejection note (optional)"
                                className="w-full mt-2 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-primary/50"
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {(payoutsData?.total ?? 0) > 20 && (
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>Page {payoutPage} of {Math.ceil(payoutsData!.total / 20)}</span>
                <div className="flex gap-2">
                  <button onClick={() => setPayoutPage(p => Math.max(1, p - 1))} disabled={payoutPage === 1} className="px-3 py-1 bg-[#111] border border-[#1f1f1f] rounded-lg disabled:opacity-40 hover:text-white">Previous</button>
                  <button onClick={() => setPayoutPage(p => p + 1)} disabled={payoutPage >= Math.ceil(payoutsData!.total / 20)} className="px-3 py-1 bg-[#111] border border-[#1f1f1f] rounded-lg disabled:opacity-40 hover:text-white">Next</button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </AdminLayout>
  )
}