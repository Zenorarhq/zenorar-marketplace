'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { apiFetch } from '@/lib/api/client'

type Tab = 'overview' | 'applications' | 'scripts' | 'payouts'

// ── API helpers ────────────────────────────────────────────────────────────────

async function cFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await apiFetch<T>(`/contributor${path}`, opts)
  if (!res.success) throw new Error((res as any).error || 'Request failed')
  return (res as any).data ?? (res as any)
}

// ── Shared Components ─────────────────────────────────────────────────────────

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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING:         'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    APPROVED:        'bg-green-500/20 text-green-400 border border-green-500/30',
    REJECTED:        'bg-red-500/20 text-red-400 border border-red-500/30',
    PAID:            'bg-green-500/20 text-green-400 border border-green-500/30',
    ACTIVE:          'bg-green-500/20 text-green-400 border border-green-500/30',
    SUSPENDED:       'bg-red-500/20 text-red-400 border border-red-500/30',
    AVAILABLE:       'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    SUBMITTED:       'bg-slate-500/20 text-slate-400 border border-slate-500/30',
    UNDER_REVIEW:    'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    DEMO_APPROVED:   'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
    AWAITING_UPLOAD: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    LIVE:            'bg-green-500/20 text-green-400 border border-green-500/30',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-slate-500/20 text-slate-400 border border-slate-500/30'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function fmt(n: number) { return `$${Number(n).toFixed(2)}` }
function fmtDate(s: string) { return s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' }

// ── Adjust Balance Modal ───────────────────────────────────────────────────────

function AdjustBalanceModal({ contributor, onClose, onDone }: { contributor: any; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const amt = Number(amount)
    if (!amt) { setError('Enter a non-zero amount'); return }
    setSubmitting(true); setError(null)
    try {
      await cFetch(`/admin/contributors/${contributor.id}/adjust-balance`, {
        method: 'POST', body: JSON.stringify({ amount: amt, note }),
      })
      onDone()
    } catch (e: any) { setError(e.message) } finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-white">Adjust Balance — {contributor.email}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><Icon name="x" size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Amount (positive = credit, negative = deduct)</label>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 10.00 or -5.00"
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Note (reason)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for adjustment"
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-slate-300 rounded-xl py-2.5 text-sm font-medium hover:border-primary hover:text-primary transition-all">Cancel</button>
            <button onClick={submit} disabled={submitting}
              className="flex-1 bg-primary text-black rounded-xl py-2.5 text-sm font-bold hover:brightness-110 disabled:opacity-50">
              {submitting ? 'Saving...' : 'Apply Adjustment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminContributorsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('overview')

  // Overview state
  const [overviewSearch, setOverviewSearch] = useState('')
  const [overviewStatus, setOverviewStatus] = useState('ALL')
  const [overviewPage, setOverviewPage] = useState(1)
  const [adjustTarget, setAdjustTarget] = useState<any>(null)
  const [noteTarget, setNoteTarget] = useState<{ id: string; email: string } | null>(null)
  const [noteValue, setNoteValue] = useState('')

  // Applications state
  const [appStatusFilter, setAppStatusFilter] = useState('PENDING')
  const [appPage, setAppPage] = useState(1)
  const [rejectNoteTarget, setRejectNoteTarget] = useState<{ id: string; email: string } | null>(null)
  const [rejectNoteValue, setRejectNoteValue] = useState('')

  // Scripts state
  const [scriptStatusFilter, setScriptStatusFilter] = useState('ALL')
  const [scriptPage, setScriptPage] = useState(1)
  const [scriptNoteTarget, setScriptNoteTarget] = useState<{ id: string; title: string } | null>(null)
  const [scriptNoteValue, setScriptNoteValue] = useState('')
  const [linkProductTarget, setLinkProductTarget] = useState<{ id: string; title: string } | null>(null)
  const [linkProductId, setLinkProductId] = useState('')

  // Payouts state
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('PENDING')
  const [payoutPage, setPayoutPage] = useState(1)
  const [rejectPayoutTarget, setRejectPayoutTarget] = useState<{ id: string } | null>(null)
  const [rejectPayoutNote, setRejectPayoutNote] = useState('')

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: stats } = useQuery({
    queryKey: ['c-admin-stats'],
    queryFn: () => cFetch<any>('/admin/stats'),
  })

  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['c-admin-contributors', overviewSearch, overviewStatus, overviewPage],
    queryFn: () => cFetch<any>(
      `/admin/contributors?search=${overviewSearch}&status=${overviewStatus === 'ALL' ? '' : overviewStatus}&page=${overviewPage}&limit=20`
    ),
    enabled: tab === 'overview',
  })

  const { data: appsData, isLoading: appsLoading } = useQuery({
    queryKey: ['c-admin-apps', appStatusFilter, appPage],
    queryFn: () => cFetch<any>(`/admin/applications?status=${appStatusFilter === 'ALL' ? '' : appStatusFilter}&page=${appPage}&limit=20`),
    enabled: tab === 'applications',
  })

  const { data: scriptsData, isLoading: scriptsLoading } = useQuery({
    queryKey: ['c-admin-scripts', scriptStatusFilter, scriptPage],
    queryFn: () => cFetch<any>(`/admin/scripts?status=${scriptStatusFilter === 'ALL' ? '' : scriptStatusFilter}&page=${scriptPage}&limit=20`),
    enabled: tab === 'scripts',
  })

  const { data: payoutsData, isLoading: payoutsLoading } = useQuery({
    queryKey: ['c-admin-payouts', payoutStatusFilter, payoutPage],
    queryFn: () => cFetch<any>(`/admin/payouts?status=${payoutStatusFilter === 'ALL' ? '' : payoutStatusFilter}&page=${payoutPage}&limit=20`),
    enabled: tab === 'payouts',
  })

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const approveApp = useMutation({
    mutationFn: (id: string) => cFetch(`/admin/applications/${id}/approve`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['c-admin-apps'] }),
  })

  const rejectApp = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      cFetch(`/admin/applications/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) }),
    onSuccess: () => { setRejectNoteTarget(null); setRejectNoteValue(''); qc.invalidateQueries({ queryKey: ['c-admin-apps'] }) },
  })

  const suspendContributor = useMutation({
    mutationFn: (id: string) => cFetch(`/admin/contributors/${id}/suspend`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['c-admin-contributors'] }),
  })

  const reinstateContributor = useMutation({
    mutationFn: (id: string) => cFetch(`/admin/contributors/${id}/reinstate`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['c-admin-contributors'] }),
  })

  const advanceScript = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      cFetch(`/admin/scripts/${id}/advance`, { method: 'POST', body: JSON.stringify({ note: note || undefined }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['c-admin-scripts'] }),
  })

  const rejectScript = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      cFetch(`/admin/scripts/${id}/reject`, { method: 'POST', body: JSON.stringify({ note: note || undefined }) }),
    onSuccess: () => { setScriptNoteTarget(null); setScriptNoteValue(''); qc.invalidateQueries({ queryKey: ['c-admin-scripts'] }) },
  })

  const addScriptNote = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      cFetch(`/admin/scripts/${id}/note`, { method: 'POST', body: JSON.stringify({ note }) }),
    onSuccess: () => { setScriptNoteTarget(null); setScriptNoteValue(''); qc.invalidateQueries({ queryKey: ['c-admin-scripts'] }) },
  })

  const linkProduct = useMutation({
    mutationFn: ({ id, productId }: { id: string; productId: string }) =>
      cFetch(`/admin/scripts/${id}/link-product`, { method: 'POST', body: JSON.stringify({ productId }) }),
    onSuccess: () => { setLinkProductTarget(null); setLinkProductId(''); qc.invalidateQueries({ queryKey: ['c-admin-scripts'] }) },
  })

  const markPayoutPaid = useMutation({
    mutationFn: (id: string) => cFetch(`/admin/payouts/${id}/mark-paid`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['c-admin-payouts'] }),
  })

  const rejectPayout = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      cFetch(`/admin/payouts/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) }),
    onSuccess: () => { setRejectPayoutTarget(null); setRejectPayoutNote(''); qc.invalidateQueries({ queryKey: ['c-admin-payouts'] }) },
  })

  // ── Render ────────────────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview',     label: 'Overview',      icon: 'chart' },
    { key: 'applications', label: 'Applications',  icon: 'file' },
    { key: 'scripts',      label: 'Scripts',       icon: 'code' },
    { key: 'payouts',      label: 'Payouts',       icon: 'wallet' },
  ]

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Contributors</h1>
            <p className="text-slate-400 text-sm mt-1">Manage external script contributors and their earnings</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Total Contributors" value={stats.totalContributors} icon="users" />
            <StatCard label="Pending Applications" value={stats.pendingApplications} icon="clock" color="yellow" />
            <StatCard label="Scripts Under Review" value={stats.pendingScriptReviews} icon="file" color="blue" />
            <StatCard label="Commission Paid" value={fmt(stats.totalCommissionPaid)} icon="dollar" color="green" />
            <StatCard label="Pending Payouts" value={stats.pendingPayouts} icon="send" color="yellow" />
            <StatCard label="Pending Amount" value={fmt(stats.pendingPayoutAmount)} icon="wallet" color="red" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto max-w-full">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                tab === t.key ? 'bg-primary text-black' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-slate-400 hover:text-white'
              }`}>
              <Icon name={t.icon} size={14} />
              {t.label}
              {t.key === 'applications' && stats?.pendingApplications > 0 && (
                <span className="bg-yellow-500 text-black text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {stats.pendingApplications}
                </span>
              )}
              {t.key === 'scripts' && stats?.pendingScriptReviews > 0 && (
                <span className="bg-yellow-500 text-black text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {stats.pendingScriptReviews}
                </span>
              )}
              {t.key === 'payouts' && stats?.pendingPayouts > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {stats.pendingPayouts}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ─────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" placeholder="Search by name or email..." value={overviewSearch}
                  onChange={(e) => { setOverviewSearch(e.target.value); setOverviewPage(1) }}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg pl-9 pr-4 py-2 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="flex gap-2 flex-wrap">
                {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((s) => (
                  <button key={s} onClick={() => { setOverviewStatus(s); setOverviewPage(1) }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${overviewStatus === s ? 'bg-primary text-black' : 'bg-[#1a1a1a] text-slate-400 hover:text-white border border-[#2a2a2a]'}`}>
                    {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {overviewLoading ? (
              <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#0a0a0a] border-b border-[#1f1f1f]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Contributor</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Scripts</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Available</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Lifetime</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Rate</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f1f1f]">
                    {overviewData?.contributors?.map((c: any) => (
                      <tr key={c.id} className="hover:bg-[#1a1a1a] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300 shrink-0">
                              {c.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="font-medium text-white text-sm">{c.name}</div>
                              <div className="text-slate-500 text-xs">{c.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300">{c.scripts_live} live / {c.scripts_count} total</td>
                        <td className="py-3 px-4 text-right text-primary font-semibold">{fmt(c.available_balance)}</td>
                        <td className="py-3 px-4 text-right text-slate-300">{fmt(c.lifetime_earned)}</td>
                        <td className="py-3 px-4 text-right text-slate-300">{c.contributor_commission_rate}%</td>
                        <td className="py-3 px-4 text-center">
                          <StatusBadge status={c.contributor_suspended_at ? 'SUSPENDED' : 'ACTIVE'} />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            {c.contributor_suspended_at ? (
                              <button onClick={() => reinstateContributor.mutate(c.id)} title="Reinstate"
                                className="p-1.5 rounded hover:bg-green-500/10 transition-colors text-green-400">
                                <Icon name="check" size={14} />
                              </button>
                            ) : (
                              <button onClick={() => { if (confirm(`Suspend ${c.email}?`)) suspendContributor.mutate(c.id) }} title="Suspend"
                                className="p-1.5 rounded hover:bg-orange-500/10 transition-colors text-orange-400">
                                <Icon name="x-circle" size={14} />
                              </button>
                            )}
                            <button onClick={() => setAdjustTarget(c)} title="Adjust Balance"
                              className="p-1.5 rounded hover:bg-blue-500/10 transition-colors text-slate-400">
                              <Icon name="edit" size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!overviewData?.contributors?.length && (
                      <tr><td colSpan={7} className="py-12 text-center text-slate-500">No contributors found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {overviewData?.pagination?.total > 20 && (
              <div className="flex justify-center gap-2">
                <button disabled={overviewPage === 1} onClick={() => setOverviewPage(overviewPage - 1)}
                  className="px-3 py-1.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-white hover:bg-[#2a2a2a] disabled:opacity-40 text-sm transition-colors">← Prev</button>
                <button disabled={overviewPage * 20 >= overviewData.pagination.total} onClick={() => setOverviewPage(overviewPage + 1)}
                  className="px-3 py-1.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-white hover:bg-[#2a2a2a] disabled:opacity-40 text-sm transition-colors">Next →</button>
              </div>
            )}
          </div>
        )}

        {/* ── Applications Tab ─────────────────────────────────────── */}
        {tab === 'applications' && (
          <div className="space-y-4">
            <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-4 flex gap-2 flex-wrap">
              {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((s) => (
                <button key={s} onClick={() => { setAppStatusFilter(s); setAppPage(1) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${appStatusFilter === s ? 'bg-primary text-black' : 'bg-[#1a1a1a] text-slate-400 hover:text-white border border-[#2a2a2a]'}`}>
                  {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {appsLoading ? (
              <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#0a0a0a] border-b border-[#1f1f1f]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Applicant</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase hidden md:table-cell">Country</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase hidden lg:table-cell">Script Types</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Applied</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f1f1f]">
                    {appsData?.applications?.map((a: any) => (
                      <tr key={a.id} className="hover:bg-[#1a1a1a] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300 shrink-0">
                              {a.full_name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="font-medium text-white text-sm">{a.full_name}</div>
                              <div className="text-slate-500 text-xs">{a.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell text-slate-400">{a.country}</td>
                        <td className="py-3 px-4 hidden lg:table-cell text-slate-400 max-w-[200px] truncate">{a.script_types}</td>
                        <td className="py-3 px-4 text-right text-slate-400 whitespace-nowrap">{fmtDate(a.created_at)}</td>
                        <td className="py-3 px-4 text-center"><StatusBadge status={a.status} /></td>
                        <td className="py-3 px-4">
                          {a.status === 'PENDING' && (
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => approveApp.mutate(a.id)}
                                className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors">Approve</button>
                              <button onClick={() => setRejectNoteTarget({ id: a.id, email: a.email })}
                                className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors">Reject</button>
                            </div>
                          )}
                          {a.admin_note && <p className="text-slate-500 text-xs mt-1 text-right">{a.admin_note}</p>}
                        </td>
                      </tr>
                    ))}
                    {!appsData?.applications?.length && (
                      <tr><td colSpan={6} className="py-12 text-center text-slate-500">No applications found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Scripts Tab ──────────────────────────────────────────── */}
        {tab === 'scripts' && (
          <div className="space-y-4">
            <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-4 flex gap-2 flex-wrap">
              {(['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'DEMO_APPROVED', 'AWAITING_UPLOAD', 'LIVE', 'REJECTED'] as const).map((s) => (
                <button key={s} onClick={() => { setScriptStatusFilter(s); setScriptPage(1) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${scriptStatusFilter === s ? 'bg-primary text-black' : 'bg-[#1a1a1a] text-slate-400 hover:text-white border border-[#2a2a2a]'}`}>
                  {s === 'ALL' ? 'All' : s.replace('_', ' ').charAt(0) + s.replace('_', ' ').slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {scriptsLoading ? (
              <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#0a0a0a] border-b border-[#1f1f1f]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Script</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase hidden md:table-cell">Contributor</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Asking</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Submitted</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f1f1f]">
                    {scriptsData?.scripts?.map((s: any) => (
                      <tr key={s.id} className="hover:bg-[#1a1a1a] transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-white text-xs max-w-[200px] truncate">{s.title}</div>
                          {s.admin_note && <div className="text-slate-500 text-xs mt-0.5 max-w-[200px] truncate">Note: {s.admin_note}</div>}
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell text-slate-400 text-xs">{s.contributor_email}</td>
                        <td className="py-3 px-4 text-right">{fmt(s.asking_price)}</td>
                        <td className="py-3 px-4 text-right text-slate-400 whitespace-nowrap">{fmtDate(s.created_at)}</td>
                        <td className="py-3 px-4 text-center"><StatusBadge status={s.status} /></td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            {!['LIVE', 'REJECTED'].includes(s.status) && (
                              <button onClick={() => advanceScript.mutate({ id: s.id })}
                                className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">Advance</button>
                            )}
                            <button onClick={() => { setScriptNoteTarget({ id: s.id, title: s.title }); setScriptNoteValue(s.admin_note || '') }}
                              className="px-3 py-1.5 rounded-lg bg-slate-500/10 border border-slate-500/30 text-slate-400 text-xs font-medium hover:bg-slate-500/20 transition-colors">Note</button>
                            {s.status === 'LIVE' && !s.product_id && (
                              <button onClick={() => setLinkProductTarget({ id: s.id, title: s.title })}
                                className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-colors">Link Product</button>
                            )}
                            {!['LIVE', 'REJECTED'].includes(s.status) && (
                              <button onClick={() => { if (confirm(`Reject "${s.title}"?`)) rejectScript.mutate({ id: s.id }) }}
                                className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors">Reject</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!scriptsData?.scripts?.length && (
                      <tr><td colSpan={6} className="py-12 text-center text-slate-500">No scripts found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {scriptsData?.pagination?.total > 20 && (
              <div className="flex justify-center gap-2">
                <button disabled={scriptPage === 1} onClick={() => setScriptPage(scriptPage - 1)}
                  className="px-3 py-1.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-white hover:bg-[#2a2a2a] disabled:opacity-40 text-sm transition-colors">← Prev</button>
                <button disabled={scriptPage * 20 >= scriptsData.pagination.total} onClick={() => setScriptPage(scriptPage + 1)}
                  className="px-3 py-1.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-white hover:bg-[#2a2a2a] disabled:opacity-40 text-sm transition-colors">Next →</button>
              </div>
            )}
          </div>
        )}

        {/* ── Payouts Tab ──────────────────────────────────────────── */}
        {tab === 'payouts' && (
          <div className="space-y-4">
            <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-4 flex gap-2 flex-wrap">
              {(['PENDING', 'PAID', 'REJECTED', 'ALL'] as const).map((s) => (
                <button key={s} onClick={() => { setPayoutStatusFilter(s); setPayoutPage(1) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${payoutStatusFilter === s ? 'bg-primary text-black' : 'bg-[#1a1a1a] text-slate-400 hover:text-white border border-[#2a2a2a]'}`}>
                  {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {payoutsLoading ? (
              <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#0a0a0a] border-b border-[#1f1f1f]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Contributor</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase hidden md:table-cell">Wallet</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Requested</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f1f1f]">
                    {payoutsData?.payouts?.map((p: any) => (
                      <tr key={p.id} className="hover:bg-[#1a1a1a] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300 shrink-0">
                              {p.contributor_name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="font-medium text-white text-sm">{p.contributor_name}</div>
                              <div className="text-slate-500 text-xs">{p.contributor_email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-primary">{fmt(p.amount)}</td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          <div className="text-slate-400 text-xs">{p.method_network?.replace(/_/g, ' ') || '—'}</div>
                          <div className="text-slate-600 text-xs font-mono">{p.wallet_address?.slice(0, 14)}…</div>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400 whitespace-nowrap">{fmtDate(p.created_at)}</td>
                        <td className="py-3 px-4 text-center"><StatusBadge status={p.status} /></td>
                        <td className="py-3 px-4">
                          {p.status === 'PENDING' && (
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => { if (confirm(`Mark payout of ${fmt(p.amount)} as paid?`)) markPayoutPaid.mutate(p.id) }}
                                className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors">Mark Paid</button>
                              <button onClick={() => setRejectPayoutTarget({ id: p.id })}
                                className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors">Reject</button>
                            </div>
                          )}
                          {p.admin_note && <p className="text-slate-500 text-xs mt-1 text-right">{p.admin_note}</p>}
                        </td>
                      </tr>
                    ))}
                    {!payoutsData?.payouts?.length && (
                      <tr><td colSpan={6} className="py-12 text-center text-slate-500">No payouts found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {payoutsData?.pagination?.total > 20 && (
              <div className="flex justify-center gap-2">
                <button disabled={payoutPage === 1} onClick={() => setPayoutPage(payoutPage - 1)}
                  className="px-3 py-1.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-white hover:bg-[#2a2a2a] disabled:opacity-40 text-sm transition-colors">← Prev</button>
                <button disabled={payoutPage * 20 >= payoutsData.pagination.total} onClick={() => setPayoutPage(payoutPage + 1)}
                  className="px-3 py-1.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-white hover:bg-[#2a2a2a] disabled:opacity-40 text-sm transition-colors">Next →</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}

      {adjustTarget && (
        <AdjustBalanceModal
          contributor={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onDone={() => { setAdjustTarget(null); qc.invalidateQueries({ queryKey: ['c-admin-contributors'] }) }}
        />
      )}

      {rejectNoteTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-white mb-4">Reject Application — {rejectNoteTarget.email}</h3>
            <textarea value={rejectNoteValue} onChange={(e) => setRejectNoteValue(e.target.value)}
              placeholder="Rejection reason (optional)..." rows={3}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-primary resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setRejectNoteTarget(null)} className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-slate-300 rounded-xl py-2.5 text-sm font-medium hover:border-primary transition-all">Cancel</button>
              <button onClick={() => rejectApp.mutate({ id: rejectNoteTarget.id, note: rejectNoteValue })} disabled={rejectApp.isPending}
                className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-red-500 disabled:opacity-50">
                {rejectApp.isPending ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {scriptNoteTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-white mb-4">Add Note — {scriptNoteTarget.title}</h3>
            <textarea value={scriptNoteValue} onChange={(e) => setScriptNoteValue(e.target.value)}
              placeholder="Note for the contributor..." rows={3}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-primary resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setScriptNoteTarget(null)} className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-slate-300 rounded-xl py-2.5 text-sm font-medium hover:border-primary transition-all">Cancel</button>
              <button onClick={() => addScriptNote.mutate({ id: scriptNoteTarget.id, note: scriptNoteValue })} disabled={addScriptNote.isPending}
                className="flex-1 bg-primary text-black rounded-xl py-2.5 text-sm font-bold hover:brightness-110 disabled:opacity-50">
                {addScriptNote.isPending ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {linkProductTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-white mb-4">Link to Product — {linkProductTarget.title}</h3>
            <p className="text-slate-400 text-sm mb-3">Enter the product ID to link this script to a live product.</p>
            <input type="text" value={linkProductId} onChange={(e) => setLinkProductId(e.target.value)}
              placeholder="Product ID"
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-primary mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setLinkProductTarget(null)} className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-slate-300 rounded-xl py-2.5 text-sm font-medium hover:border-primary transition-all">Cancel</button>
              <button onClick={() => linkProduct.mutate({ id: linkProductTarget.id, productId: linkProductId })} disabled={linkProduct.isPending || !linkProductId}
                className="flex-1 bg-primary text-black rounded-xl py-2.5 text-sm font-bold hover:brightness-110 disabled:opacity-50">
                {linkProduct.isPending ? 'Linking...' : 'Link Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectPayoutTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-white mb-4">Reject Payout</h3>
            <textarea value={rejectPayoutNote} onChange={(e) => setRejectPayoutNote(e.target.value)}
              placeholder="Reason for rejection (optional)..." rows={3}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-primary resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setRejectPayoutTarget(null)} className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-slate-300 rounded-xl py-2.5 text-sm font-medium hover:border-primary transition-all">Cancel</button>
              <button onClick={() => rejectPayout.mutate({ id: rejectPayoutTarget.id, note: rejectPayoutNote })} disabled={rejectPayout.isPending}
                className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-red-500 disabled:opacity-50">
                {rejectPayout.isPending ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
